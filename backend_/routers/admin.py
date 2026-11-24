"""
동북미식 (DONGBUK TABLE) 관리자 API 라우터 (routers/admin.py)
- 모든 관리자 엔드포인트는 서버 측 Depends(require_admin) 인증을 강제합니다.
- 로그인 실패 Rate Limiting, PBKDF2-SHA256 비밀번호 검증, HttpOnly 세션 쿠키/Bearer 지원
- 맛집 CRUD (중복 검사 409 Conflict), 실시간 카카오 실존 재검증, 이미지 업로드(Pillow/MIME/확장자/용량 검증 + 출처 필수),
  지역/테마 관리, 사용자 제보 처리, 검증·감사 로그, 외부 API 설정 관리(/api/admin/settings/*)
"""

from __future__ import annotations

import io
import json
import math
import re
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    UploadFile,
    status,
)
from PIL import Image
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from db.auth import (
    check_login_rate_limit,
    clear_login_failures,
    create_admin_session,
    record_login_failure,
    require_admin,
    revoke_admin_session,
    verify_password,
    write_audit_log,
)
from db.database import check_db_health, get_db
from db.models import (
    Admin,
    AuditLog,
    Category,
    Collection,
    CollectionRestaurant,
    Feature,
    FeedbackReport,
    Menu,
    Region,
    Restaurant,
    RestaurantCategory,
    RestaurantFeature,
    RestaurantImage,
    VerificationLog,
)
from gourmet_catalog import serialize_restaurant
from settings_manager import settings_mgr

router = APIRouter(prefix="/api/admin", tags=["Admin Management API"])

UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads" / "restaurants"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_PIL_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5MB


# ==========================================
# Pydantic Schemas
# ==========================================

class AdminLoginRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=150)
    password: str = Field(..., min_length=4, max_length=128)


class RestaurantCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    region_slug: str = Field(..., pattern="^(nowon|dobong|gangbuk|jungnang|seongbuk)$")
    neighborhood: str = Field(default="", max_length=100)
    category_slug: str = Field(default="korean", max_length=40)
    road_address: str = Field(..., min_length=4, max_length=300)
    jibun_address: Optional[str] = Field(default=None, max_length=300)
    lat: float = Field(..., ge=37.4, le=37.8)
    lng: float = Field(..., ge=126.8, le=127.3)
    phone: Optional[str] = Field(default=None, max_length=50)
    one_line_intro: str = Field(..., min_length=4, max_length=300)
    description: Optional[str] = Field(default=None, max_length=2000)
    editor_note: Optional[str] = Field(default=None, max_length=1000)
    price_min: Optional[int] = Field(default=None, ge=0)
    price_max: Optional[int] = Field(default=None, ge=0)
    price_range_label: Optional[str] = Field(default=None, max_length=80)
    parking_info: Optional[str] = Field(default=None, max_length=200)
    signature_menus: List[str] = Field(default=[])
    highlights: List[str] = Field(default=[])
    features: List[str] = Field(default=[])
    is_editor_pick: bool = False
    publish_status: str = Field(default="published", pattern="^(published|draft|hidden)$")
    business_status: str = Field(default="open", pattern="^(open|temporarily_closed|closed|needs_check)$")
    verification_status: str = Field(default="needs_verification", pattern="^(verified|needs_verification|reference)$")
    kakao_place_id: Optional[str] = Field(default=None, max_length=80)
    kakao_url: Optional[str] = Field(default=None, max_length=500)


class RestaurantUpdateRequest(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    region_slug: Optional[str] = Field(default=None, pattern="^(nowon|dobong|gangbuk|jungnang|seongbuk)$")
    neighborhood: Optional[str] = Field(default=None, max_length=100)
    category_slug: Optional[str] = Field(default=None, max_length=40)
    road_address: Optional[str] = Field(default=None, min_length=4, max_length=300)
    jibun_address: Optional[str] = Field(default=None, max_length=300)
    lat: Optional[float] = Field(default=None, ge=37.4, le=37.8)
    lng: Optional[float] = Field(default=None, ge=126.8, le=127.3)
    phone: Optional[str] = Field(default=None, max_length=50)
    one_line_intro: Optional[str] = Field(default=None, min_length=4, max_length=300)
    description: Optional[str] = Field(default=None, max_length=2000)
    editor_note: Optional[str] = Field(default=None, max_length=1000)
    price_min: Optional[int] = Field(default=None, ge=0)
    price_max: Optional[int] = Field(default=None, ge=0)
    price_range_label: Optional[str] = Field(default=None, max_length=80)
    parking_info: Optional[str] = Field(default=None, max_length=200)
    signature_menus: Optional[List[str]] = None
    highlights: Optional[List[str]] = None
    features: Optional[List[str]] = None
    is_editor_pick: Optional[bool] = None
    publish_status: Optional[str] = Field(default=None, pattern="^(published|draft|hidden)$")
    business_status: Optional[str] = Field(default=None, pattern="^(open|temporarily_closed|closed|needs_check)$")
    verification_status: Optional[str] = Field(default=None, pattern="^(verified|needs_verification|reference)$")
    verification_note: Optional[str] = Field(default=None, max_length=500)


class RegionUpdateRequest(BaseModel):
    tagline: Optional[str] = Field(default=None, max_length=200)
    summary: Optional[str] = Field(default=None, max_length=500)
    description: Optional[str] = Field(default=None, max_length=2000)
    editorial_story: Optional[str] = Field(default=None, max_length=2000)


class CollectionUpdateRequest(BaseModel):
    title: Optional[str] = Field(default=None, max_length=150)
    subtitle: Optional[str] = Field(default=None, max_length=250)
    description: Optional[str] = Field(default=None, max_length=2000)
    is_featured: Optional[bool] = None
    restaurant_ids: Optional[List[str]] = None


class FeedbackUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(pending|resolved|rejected)$")
    admin_note: Optional[str] = Field(default=None, max_length=1000)


class AdminCredentialSetRequest(BaseModel):
    provider: str = Field(..., pattern="^(groq|kakao_rest|kakao_js)$")
    key: str = Field(..., min_length=1, max_length=500)
    model: Optional[str] = Field(default=None, max_length=120)


class AdminTestConnectionRequest(BaseModel):
    provider: str = Field(..., pattern="^(groq|kakao_rest|kakao_js)$")
    key: Optional[str] = Field(default=None, max_length=500)
    model: Optional[str] = Field(default=None, max_length=120)


def _generate_slug(name: str, region_slug: str) -> str:
    ascii_part = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    suffix = uuid.uuid4().hex[:6]
    if ascii_part:
        return f"{region_slug}-{ascii_part[:40]}-{suffix}"
    return f"{region_slug}-place-{suffix}"


# ==========================================
# 1. Auth Endpoints
# ==========================================

@router.post("/auth/login")
def admin_login(
    payload: AdminLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    client_ip = request.client.host if request.client else "127.0.0.1"
    check_login_rate_limit(client_ip)

    email = payload.email.strip().lower()
    admin = db.execute(select(Admin).where(Admin.email == email)).scalar_one_or_none()
    if not admin or not admin.is_active or not verify_password(payload.password, admin.password_hash):
        record_login_failure(client_ip)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 올바르지 않습니다.",
        )

    clear_login_failures(client_ip)
    token = create_admin_session(db, admin, request, response)
    write_audit_log(db, admin, "admin_login", "admin", admin.id, {"email": admin.email}, request)
    db.commit()

    return {
        "authenticated": True,
        "token": token,
        "admin": {
            "id": admin.id,
            "email": admin.email,
            "name": admin.name,
            "role": admin.role,
        },
    }


@router.post("/auth/logout")
def admin_logout(
    request: Request,
    response: Response,
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    write_audit_log(db, admin, "admin_logout", "admin", admin.id, None, request)
    db.commit()
    revoke_admin_session(db, request, response)
    return {"success": True, "message": "로그아웃되었습니다."}


@router.get("/auth/me")
def admin_me(admin: Admin = Depends(require_admin)):
    return {
        "authenticated": True,
        "admin": {
            "id": admin.id,
            "email": admin.email,
            "name": admin.name,
            "role": admin.role,
            "last_login_at": admin.last_login_at.isoformat() if admin.last_login_at else None,
        },
    }


# ==========================================
# 2. Dashboard
# ==========================================

@router.get("/dashboard")
def admin_dashboard(
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    all_rest = list(db.execute(select(Restaurant)).scalars().all())
    regions = list(db.execute(select(Region).order_by(Region.display_order)).scalars().all())

    region_stats = []
    for reg in regions:
        reg_items = [r for r in all_rest if r.region_id == reg.id]
        region_stats.append({
            "slug": reg.slug,
            "name": reg.name,
            "total": len(reg_items),
            "published": sum(1 for r in reg_items if r.publish_status == "published" and r.business_status != "closed"),
            "verified": sum(1 for r in reg_items if r.verification_status == "verified"),
            "needs_verification": sum(1 for r in reg_items if r.verification_status != "verified"),
        })

    pending_feedback = db.execute(
        select(func.count(FeedbackReport.id)).where(FeedbackReport.status == "pending")
    ).scalar_one()
    total_feedback = db.execute(select(func.count(FeedbackReport.id))).scalar_one()
    total_images = db.execute(select(func.count(RestaurantImage.id))).scalar_one()

    recent_audits = list(
        db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(10)).scalars().all()
    )

    return {
        "summary": {
            "total_restaurants": len(all_rest),
            "published_restaurants": sum(1 for r in all_rest if r.publish_status == "published" and r.business_status != "closed"),
            "draft_or_hidden": sum(1 for r in all_rest if r.publish_status != "published"),
            "closed_restaurants": sum(1 for r in all_rest if r.business_status == "closed"),
            "verified_restaurants": sum(1 for r in all_rest if r.verification_status == "verified"),
            "needs_verification": sum(1 for r in all_rest if r.verification_status != "verified"),
            "pending_feedback": pending_feedback,
            "total_feedback": total_feedback,
            "uploaded_images": total_images,
        },
        "regions": region_stats,
        "database": check_db_health(),
        "api_status": settings_mgr.get_status(),
        "recent_audits": [
            {
                "id": a.id,
                "admin_email": a.admin_email,
                "action": a.action,
                "target_type": a.target_type,
                "target_id": a.target_id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in recent_audits
        ],
    }


# ==========================================
# 3. Restaurants CRUD + Kakao Re-verify
# ==========================================

@router.get("/restaurants")
def admin_list_restaurants(
    q: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    publish_status: Optional[str] = Query(default=None),
    verification_status: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    stmt = (
        select(Restaurant)
        .options(
            selectinload(Restaurant.region),
            selectinload(Restaurant.category_links).selectinload(RestaurantCategory.category),
            selectinload(Restaurant.menus),
            selectinload(Restaurant.images),
            selectinload(Restaurant.opening_hours),
            selectinload(Restaurant.feature_links).selectinload(RestaurantFeature.feature),
        )
        .order_by(Restaurant.updated_at.desc(), Restaurant.id.asc())
    )
    rows = list(db.execute(stmt).scalars().all())
    if region and region != "all":
        rows = [r for r in rows if r.region_id == region]
    if publish_status and publish_status != "all":
        rows = [r for r in rows if r.publish_status == publish_status]
    if verification_status and verification_status != "all":
        rows = [r for r in rows if r.verification_status == verification_status]
    if q and q.strip():
        ql = q.strip().lower()
        rows = [
            r for r in rows
            if ql in r.name.lower()
            or ql in r.road_address.lower()
            or ql in (r.neighborhood_label or "").lower()
            or ql in r.id.lower()
        ]

    total = len(rows)
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size
    sliced = rows[start : start + page_size]
    return {
        "items": [serialize_restaurant(r, include_detail=True) for r in sliced],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": total_pages,
        },
    }


@router.post("/restaurants", status_code=status.HTTP_201_CREATED)
def admin_create_restaurant(
    payload: RestaurantCreateRequest,
    request: Request,
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    # Duplicate detection: UNIQUE(name, road_address)
    dup = db.execute(
        select(Restaurant).where(
            Restaurant.name == payload.name.strip(),
            Restaurant.road_address == payload.road_address.strip(),
        )
    ).scalar_one_or_none()
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"동일한 매장명과 도로명주소가 이미 등록되어 있습니다 (기존 ID: {dup.id}).",
        )

    rid = f"{payload.region_slug[:2]}-{uuid.uuid4().hex[:6]}"
    slug = _generate_slug(payload.name, payload.region_slug)
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    row = Restaurant(
        id=rid,
        slug=slug,
        name=payload.name.strip(),
        region_id=payload.region_slug,
        neighborhood_label=payload.neighborhood.strip(),
        road_address=payload.road_address.strip(),
        jibun_address=(payload.jibun_address or "").strip() or None,
        lat=payload.lat,
        lng=payload.lng,
        phone=(payload.phone or "").strip() or None,
        one_line_intro=payload.one_line_intro.strip(),
        description=(payload.description or payload.one_line_intro).strip(),
        editor_note=(payload.editor_note or "").strip() or None,
        highlights_json=payload.highlights[:2],
        price_min=payload.price_min,
        price_max=payload.price_max,
        price_range_label=(payload.price_range_label or "").strip() or None,
        parking_info=(payload.parking_info or "").strip() or "방문 전 주차 가능 여부 확인 필요",
        business_status=payload.business_status,
        verification_status=payload.verification_status,
        publish_status=payload.publish_status,
        is_editor_pick=payload.is_editor_pick,
        verified_at=today_str if payload.verification_status == "verified" else None,
        source_id="src-admin-manual",
        data_source_label="동북미식 관리자 검수 등록",
        kakao_place_id=(payload.kakao_place_id or "").strip() or None,
        kakao_url=(payload.kakao_url or "").strip() or None,
    )
    db.add(row)
    db.flush()

    cat_id = payload.category_slug if db.get(Category, payload.category_slug) else "etc"
    db.add(RestaurantCategory(restaurant_id=rid, category_id=cat_id, is_primary=True))

    for idx, mname in enumerate(payload.signature_menus, 1):
        if mname.strip():
            db.add(
                Menu(
                    id=f"menu-{rid}-{idx}",
                    restaurant_id=rid,
                    name=mname.strip(),
                    is_signature=True,
                    display_order=idx,
                )
            )

    for fslug in payload.features:
        if db.get(Feature, fslug):
            db.add(RestaurantFeature(restaurant_id=rid, feature_id=fslug, status="confirmed"))

    db.add(
        VerificationLog(
            id=f"vlog-{uuid.uuid4().hex[:12]}",
            restaurant_id=rid,
            admin_id=admin.id,
            method="manual_review",
            previous_status=None,
            new_status=row.verification_status,
            notes="관리자 신규 매장 등록",
        )
    )
    write_audit_log(
        db,
        admin,
        "restaurant_create",
        "restaurant",
        rid,
        {"name": row.name, "road_address": row.road_address},
        request,
    )
    db.commit()

    created = db.execute(
        select(Restaurant)
        .where(Restaurant.id == rid)
        .options(
            selectinload(Restaurant.region),
            selectinload(Restaurant.category_links).selectinload(RestaurantCategory.category),
            selectinload(Restaurant.menus),
            selectinload(Restaurant.images),
            selectinload(Restaurant.opening_hours),
            selectinload(Restaurant.feature_links).selectinload(RestaurantFeature.feature),
        )
    ).scalar_one()
    return serialize_restaurant(created, include_detail=True)


@router.patch("/restaurants/{restaurant_id}")
def admin_update_restaurant(
    restaurant_id: str,
    payload: RestaurantUpdateRequest,
    request: Request,
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.execute(
        select(Restaurant)
        .where(Restaurant.id == restaurant_id)
        .options(
            selectinload(Restaurant.region),
            selectinload(Restaurant.category_links).selectinload(RestaurantCategory.category),
            selectinload(Restaurant.menus),
            selectinload(Restaurant.images),
            selectinload(Restaurant.opening_hours),
            selectinload(Restaurant.feature_links).selectinload(RestaurantFeature.feature),
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="매장을 찾을 수 없습니다.")

    prev_ver = row.verification_status
    updates = payload.model_dump(exclude_unset=True)

    # Check duplicate if name or road_address changed
    new_name = (updates.get("name") or row.name).strip()
    new_road = (updates.get("road_address") or row.road_address).strip()
    if new_name != row.name or new_road != row.road_address:
        dup = db.execute(
            select(Restaurant).where(
                Restaurant.name == new_name,
                Restaurant.road_address == new_road,
                Restaurant.id != row.id,
            )
        ).scalar_one_or_none()
        if dup:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"동일한 매장명·도로명주소가 이미 존재합니다 ({dup.id}).",
            )

    scalar_map = {
        "name": "name",
        "region_slug": "region_id",
        "neighborhood": "neighborhood_label",
        "road_address": "road_address",
        "jibun_address": "jibun_address",
        "lat": "lat",
        "lng": "lng",
        "phone": "phone",
        "one_line_intro": "one_line_intro",
        "description": "description",
        "editor_note": "editor_note",
        "price_min": "price_min",
        "price_max": "price_max",
        "price_range_label": "price_range_label",
        "parking_info": "parking_info",
        "is_editor_pick": "is_editor_pick",
        "publish_status": "publish_status",
        "business_status": "business_status",
        "verification_status": "verification_status",
    }
    for req_key, attr in scalar_map.items():
        if req_key in updates:
            val = updates[req_key]
            setattr(row, attr, val.strip() if isinstance(val, str) else val)

    if "highlights" in updates and updates["highlights"] is not None:
        row.highlights_json = updates["highlights"][:2]

    if "category_slug" in updates and updates["category_slug"]:
        cat_id = updates["category_slug"]
        if db.get(Category, cat_id):
            row.category_links.clear()
            db.flush()
            row.category_links.append(
                RestaurantCategory(restaurant_id=row.id, category_id=cat_id, is_primary=True)
            )

    if "signature_menus" in updates and updates["signature_menus"] is not None:
        row.menus.clear()
        db.flush()
        for idx, mname in enumerate(updates["signature_menus"], 1):
            if mname.strip():
                row.menus.append(
                    Menu(
                        id=f"menu-{row.id}-{uuid.uuid4().hex[:6]}",
                        restaurant_id=row.id,
                        name=mname.strip(),
                        is_signature=True,
                        display_order=idx,
                    )
                )

    if "features" in updates and updates["features"] is not None:
        row.feature_links.clear()
        db.flush()
        for fslug in updates["features"]:
            if db.get(Feature, fslug):
                row.feature_links.append(
                    RestaurantFeature(restaurant_id=row.id, feature_id=fslug, status="confirmed")
                )

    if row.verification_status == "verified":
        row.verified_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if "verification_status" in updates or payload.verification_note:
        db.add(
            VerificationLog(
                id=f"vlog-{uuid.uuid4().hex[:12]}",
                restaurant_id=row.id,
                admin_id=admin.id,
                method="manual_review",
                previous_status=prev_ver,
                new_status=row.verification_status,
                notes=payload.verification_note or "관리자 매장 정보/검증 상태 수정",
            )
        )

    write_audit_log(
        db,
        admin,
        "restaurant_update",
        "restaurant",
        row.id,
        {"updated_fields": list(updates.keys())},
        request,
    )
    db.commit()
    db.refresh(row)
    return serialize_restaurant(row, include_detail=True)


@router.delete("/restaurants/{restaurant_id}")
def admin_delete_restaurant(
    restaurant_id: str,
    permanent: bool = Query(default=False),
    request: Request = None,
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.get(Restaurant, restaurant_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="매장을 찾을 수 없습니다.")

    if permanent:
        name = row.name
        db.delete(row)
        write_audit_log(db, admin, "restaurant_delete_permanent", "restaurant", restaurant_id, {"name": name}, request)
        db.commit()
        return {"success": True, "mode": "permanent", "id": restaurant_id}

    # Default soft delete: mark closed + hidden so historical logs remain intact
    row.business_status = "closed"
    row.publish_status = "hidden"
    write_audit_log(db, admin, "restaurant_soft_delete", "restaurant", restaurant_id, {"name": row.name}, request)
    db.commit()
    return {"success": True, "mode": "soft_closed", "id": restaurant_id}


@router.post("/restaurants/{restaurant_id}/verify-kakao")
def admin_verify_restaurant_kakao(
    restaurant_id: str,
    request: Request,
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.get(Restaurant, restaurant_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="매장을 찾을 수 없습니다.")

    rest_key = settings_mgr.get_kakao_rest_key()
    if not rest_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="카카오 REST API 키가 설정되지 않았습니다. API 설정 탭에서 키를 먼저 등록해 주세요.",
        )

    region = db.get(Region, row.region_id)
    query = f"{region.name if region else ''} {row.name}".strip()
    params = urllib.parse.urlencode({"query": query, "size": 5})
    url = f"https://dapi.kakao.com/v2/local/search/keyword.json?{params}"
    req_obj = urllib.request.Request(url, headers={"Authorization": f"KakaoAK {rest_key}"})
    try:
        with urllib.request.urlopen(req_obj, timeout=8) as resp:
            docs = json.loads(resp.read().decode("utf-8")).get("documents", [])
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"카카오 로컬 API 호출에 실패했습니다: {type(exc).__name__}",
        )

    match = None
    for d in docs:
        if row.kakao_place_id and str(d.get("id")) == str(row.kakao_place_id):
            match = d
            break
    if not match and docs:
        match = next(
            (d for d in docs if (region.name if region else "") in (d.get("road_address_name") or d.get("address_name") or "")),
            None,
        )

    prev_status = row.verification_status
    if match:
        row.verification_status = "verified"
        row.verified_at = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if match.get("id"):
            row.kakao_place_id = str(match["id"])
        if match.get("place_url"):
            row.kakao_url = match["place_url"]
        if match.get("phone"):
            row.phone = match["phone"]
        note = f"카카오 로컬 실시간 재검증 일치: {match.get('place_name')} ({match.get('road_address_name')})"
        matched_flag = True
    else:
        row.verification_status = "needs_verification"
        note = "카카오 로컬 검색에서 일치하는 매장을 찾지 못함 (폐업·상호변경 수동 확인 필요)"
        matched_flag = False

    db.add(
        VerificationLog(
            id=f"vlog-{uuid.uuid4().hex[:12]}",
            restaurant_id=row.id,
            admin_id=admin.id,
            method="kakao_local_api",
            previous_status=prev_status,
            new_status=row.verification_status,
            notes=note,
            evidence_json={"matched": matched_flag, "kakao_place_name": match.get("place_name") if match else None},
        )
    )
    write_audit_log(db, admin, "restaurant_verify_kakao", "restaurant", row.id, {"matched": matched_flag}, request)
    db.commit()

    return {
        "matched": matched_flag,
        "verification_status": row.verification_status,
        "verified_at": row.verified_at,
        "note": note,
    }


# ==========================================
# 4. Image Management (Upload + Source/License Metadata)
# ==========================================

@router.post("/images", status_code=status.HTTP_201_CREATED)
async def admin_upload_image(
    request: Request,
    restaurant_id: str = Form(...),
    image_type: str = Form(default="food"),
    alt_text: str = Form(...),
    source_name: str = Form(...),
    author: str = Form(default=""),
    license_type: str = Form(default="직접 촬영 / 허가 사용"),
    is_primary: bool = Form(default=True),
    is_ai_generated: bool = Form(default=False),
    file: UploadFile = File(...),
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    restaurant = db.get(Restaurant, restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="대상 매장을 찾을 수 없습니다.")
    if image_type not in ("food", "interior", "exterior", "menu", "placeholder"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="지원하지 않는 이미지 유형입니다.")

    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="허용된 이미지 형식(.jpg, .jpeg, .png, .webp)만 업로드할 수 있습니다.",
        )

    raw_bytes = await file.read()
    if len(raw_bytes) == 0 or len(raw_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미지 파일 크기는 5MB 이하여야 합니다.",
        )

    # Validate actual image bytes & HD resolution via Pillow (blocks fake/script & blurry low-res uploads)
    try:
        with Image.open(io.BytesIO(raw_bytes)) as img:
            img.verify()
        with Image.open(io.BytesIO(raw_bytes)) as img2:
            if img2.format not in ALLOWED_PIL_FORMATS:
                raise ValueError("Unsupported image format")
            w, h = img2.size
            if w < 600 or h < 400:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"화질 기준 미달입니다 ({w}x{h}px). 깨짐 방지를 위해 최소 600×400px 이상의 선명한 사진을 업로드해 주세요.",
                )
            save_ext = ".jpg" if img2.format == "JPEG" else ".png" if img2.format == "PNG" else ".webp"
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="손상되었거나 유효한 이미지 파일이 아닙니다.",
        )

    img_id = f"img-{uuid.uuid4().hex[:12]}"
    safe_filename = f"{restaurant_id}_{img_id}{save_ext}"
    dest = UPLOAD_DIR / safe_filename
    dest.write_bytes(raw_bytes)

    if is_primary:
        existing_imgs = db.execute(
            select(RestaurantImage).where(RestaurantImage.restaurant_id == restaurant_id)
        ).scalars().all()
        for existing in existing_imgs:
            existing.is_primary = False

    url_path = f"/api/uploads/restaurants/{safe_filename}"
    row = RestaurantImage(
        id=img_id,
        restaurant_id=restaurant_id,
        url=url_path,
        image_type=image_type,
        alt_text=alt_text.strip(),
        is_primary=is_primary,
        source_name=source_name.strip(),
        author=author.strip() or None,
        license_type=license_type.strip(),
        verified_at=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        is_ai_generated=is_ai_generated,
    )
    db.add(row)
    write_audit_log(
        db,
        admin,
        "image_upload",
        "restaurant_image",
        img_id,
        {"restaurant_id": restaurant_id, "url": url_path, "source_name": row.source_name},
        request,
    )
    db.commit()

    return {
        "id": row.id,
        "restaurant_id": row.restaurant_id,
        "url": row.url,
        "image_type": row.image_type,
        "alt_text": row.alt_text,
        "is_primary": row.is_primary,
        "source_name": row.source_name,
        "license_type": row.license_type,
        "is_ai_generated": row.is_ai_generated,
    }


@router.delete("/images/{image_id}")
def admin_delete_image(
    image_id: str,
    request: Request,
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.get(RestaurantImage, image_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="이미지를 찾을 수 없습니다.")
    filename = Path(row.url).name
    local_file = UPLOAD_DIR / filename
    if local_file.exists():
        try:
            local_file.unlink()
        except Exception:
            pass
    db.delete(row)
    write_audit_log(db, admin, "image_delete", "restaurant_image", image_id, {"url": row.url}, request)
    db.commit()
    return {"success": True, "id": image_id}


# ==========================================
# 5. Regions, Collections, Feedback & Logs
# ==========================================

@router.get("/regions")
def admin_list_regions(admin: Admin = Depends(require_admin), db: Session = Depends(get_db)):
    rows = list(db.execute(select(Region).order_by(Region.display_order)).scalars().all())
    return [
        {
            "slug": r.slug,
            "name": r.name,
            "tagline": r.tagline,
            "summary": r.summary,
            "description": r.description,
            "editorial_story": r.editorial_story,
        }
        for r in rows
    ]


@router.patch("/regions/{slug}")
def admin_update_region(
    slug: str,
    payload: RegionUpdateRequest,
    request: Request,
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    reg = db.get(Region, slug)
    if not reg:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="자치구를 찾을 수 없습니다.")
    for k, v in payload.model_dump(exclude_unset=True).items():
        if v is not None:
            setattr(reg, k, v.strip())
    write_audit_log(db, admin, "region_update", "region", slug, None, request)
    db.commit()
    return {"success": True, "slug": reg.slug, "tagline": reg.tagline}


@router.get("/collections")
def admin_list_collections(admin: Admin = Depends(require_admin), db: Session = Depends(get_db)):
    cols = list(
        db.execute(
            select(Collection).options(selectinload(Collection.items)).order_by(Collection.display_order)
        )
        .scalars()
        .all()
    )
    return [
        {
            "slug": c.slug,
            "title": c.title,
            "subtitle": c.subtitle,
            "description": c.description,
            "is_featured": c.is_featured,
            "restaurant_ids": [i.restaurant_id for i in sorted(c.items, key=lambda x: x.display_order)],
        }
        for c in cols
    ]


@router.patch("/collections/{slug}")
def admin_update_collection(
    slug: str,
    payload: CollectionUpdateRequest,
    request: Request,
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    col = db.execute(
        select(Collection).where(Collection.slug == slug).options(selectinload(Collection.items))
    ).scalar_one_or_none()
    if not col:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="테마를 찾을 수 없습니다.")
    updates = payload.model_dump(exclude_unset=True)
    for k in ("title", "subtitle", "description", "is_featured"):
        if k in updates and updates[k] is not None:
            setattr(col, k, updates[k].strip() if isinstance(updates[k], str) else updates[k])
    if "restaurant_ids" in updates and updates["restaurant_ids"] is not None:
        col.items.clear()
        db.flush()
        for idx, rid in enumerate(updates["restaurant_ids"], 1):
            if db.get(Restaurant, rid):
                col.items.append(
                    CollectionRestaurant(collection_id=col.id, restaurant_id=rid, display_order=idx)
                )
    write_audit_log(db, admin, "collection_update", "collection", slug, None, request)
    db.commit()
    return {"success": True, "slug": col.slug}


@router.get("/feedback")
def admin_list_feedback(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    stmt = select(FeedbackReport).order_by(FeedbackReport.created_at.desc())
    rows = list(db.execute(stmt).scalars().all())
    if status_filter and status_filter != "all":
        rows = [r for r in rows if r.status == status_filter]
    return [
        {
            "id": r.id,
            "restaurant_id": r.restaurant_id,
            "restaurant_name": r.restaurant_name,
            "report_type": r.report_type,
            "content": r.content,
            "reporter_contact": r.reporter_contact,
            "status": r.status,
            "admin_note": r.admin_note,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.patch("/feedback/{feedback_id}")
def admin_update_feedback(
    feedback_id: str,
    payload: FeedbackUpdateRequest,
    request: Request,
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.get(FeedbackReport, feedback_id)
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="제보를 찾을 수 없습니다.")
    row.status = payload.status
    row.admin_note = (payload.admin_note or "").strip() or None
    row.handled_by_admin_id = admin.id
    write_audit_log(db, admin, "feedback_update", "feedback_report", feedback_id, {"status": payload.status}, request)
    db.commit()
    return {"success": True, "id": row.id, "status": row.status}


@router.get("/verification-logs")
def admin_verification_logs(
    limit: int = Query(default=50, ge=1, le=200),
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    rows = list(
        db.execute(
            select(VerificationLog).order_by(VerificationLog.verified_at.desc()).limit(limit)
        )
        .scalars()
        .all()
    )
    return [
        {
            "id": v.id,
            "restaurant_id": v.restaurant_id,
            "method": v.method,
            "previous_status": v.previous_status,
            "new_status": v.new_status,
            "notes": v.notes,
            "verified_at": v.verified_at.isoformat() if v.verified_at else None,
        }
        for v in rows
    ]


# ==========================================
# 6. Admin-Only External API Settings (Migrated from public /api/settings/*)
# ==========================================

@router.get("/settings/status")
def admin_settings_status(admin: Admin = Depends(require_admin)):
    return settings_mgr.get_status()


@router.post("/settings/credentials")
async def admin_set_credentials(
    payload: AdminCredentialSetRequest,
    request: Request,
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    try:
        settings_mgr.set_credential(provider=payload.provider, key=payload.key, model=payload.model)
    except ValueError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(ve))

    test_result = None
    if payload.provider == "groq" and payload.key.strip():
        test_result = await settings_mgr.test_groq_connection(key_to_test=payload.key, model=payload.model)
    elif payload.provider == "kakao_rest" and payload.key.strip():
        test_result = await settings_mgr.test_kakao_rest_connection(key_to_test=payload.key)

    write_audit_log(db, admin, "settings_update", "api_provider", payload.provider, {"model": payload.model}, request)
    db.commit()
    return {
        "success": True,
        "message": f"{payload.provider} API 설정이 암호화되어 저장되었습니다.",
        "test_result": test_result,
        "updated_status": settings_mgr.get_status(),
    }


@router.delete("/settings/credentials/{provider}")
def admin_delete_credential(
    provider: str,
    request: Request,
    admin: Admin = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if provider not in ("groq", "kakao_rest", "kakao_js"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"지원하지 않는 제공자: {provider}")
    settings_mgr.delete_credential(provider)
    write_audit_log(db, admin, "settings_delete", "api_provider", provider, None, request)
    db.commit()
    return {
        "success": True,
        "message": f"{provider} 설정이 삭제되었습니다.",
        "updated_status": settings_mgr.get_status(),
    }


@router.post("/settings/test-connection")
async def admin_test_connection(
    payload: AdminTestConnectionRequest,
    admin: Admin = Depends(require_admin),
):
    if payload.provider == "groq":
        return await settings_mgr.test_groq_connection(key_to_test=payload.key, model=payload.model)
    if payload.provider == "kakao_rest":
        return await settings_mgr.test_kakao_rest_connection(key_to_test=payload.key)
    key = (payload.key or settings_mgr.get_kakao_js_key()).strip()
    if not key:
        return {"success": False, "status": "unconfigured", "message": "카카오 JavaScript 키가 입력되지 않았습니다."}
    if len(key) < 16 or " " in key:
        return {"success": False, "status": "invalid_format", "message": "유효한 카카오 JavaScript 키 형식이 아닙니다."}
    return {"success": True, "status": "format_valid", "message": "카카오 JavaScript 키 형식이 유효합니다."}


"""
동북미식 (DONGBUK TABLE) 백엔드 서버 (FastAPI v3.1)
- Public Gourmet API (/api/regions, /api/restaurants, /api/categories, /api/collections, /api/feedback)
- AI Gourmet Concierge API (/api/concierge/recommend)
- Admin Management & Auth API (/api/admin/* — 서버 측 인증 강제)
- 공개 지도 SDK 설정 (/api/settings/public-map-config) — 관리자 키 변경 API는 인증 강제
- 업로드 이미지 정적 서빙 (/api/uploads/*)
- 구 버전 하위 호환 어댑터 (/api/places, /api/chat)
"""

import hashlib
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from groq import Groq
from pydantic import BaseModel, Field

from db.auth import require_admin
from db.database import check_db_health
from db.models import Admin
from db.seed import ensure_schema_and_seed
from gourmet_catalog import load_verified_restaurants
from places_database import (
    DISTRICT_METADATA,
    search_kakao_local_api,
    search_verified_places,
)
from routers.admin import router as admin_router
from routers.concierge import router as concierge_router
from routers.public import router as public_gourmet_router
from settings_manager import settings_mgr

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
    if o.strip()
]

# Ensure normalized DB schema & idempotent seed on startup
ensure_schema_and_seed()

app = FastAPI(
    title="동북미식 (DONGBUK TABLE API)",
    description="서울 동북권 5대 자치구 맛집 소개·큐레이션, AI 미식 추천 및 관리자 백엔드",
    version="3.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploaded restaurant media (served via Next.js /api/:path* proxy)
UPLOADS_ROOT = Path(__file__).resolve().parent / "uploads"
UPLOADS_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(UPLOADS_ROOT)), name="uploads")

app.include_router(public_gourmet_router)
app.include_router(concierge_router)
app.include_router(admin_router)

_cached_groq_key: Optional[str] = None
_cached_groq_client: Optional[Groq] = None


def get_active_groq_client() -> Optional[Groq]:
    global _cached_groq_key, _cached_groq_client
    current_key = settings_mgr.get_groq_key()
    if not current_key:
        _cached_groq_client = None
        _cached_groq_key = None
        return None
    if current_key != _cached_groq_key or _cached_groq_client is None:
        try:
            _cached_groq_client = Groq(api_key=current_key)
            _cached_groq_key = current_key
            key_fp = hashlib.sha256(current_key.encode("utf-8")).hexdigest()[:8]
            print(f"[Groq Runtime] 클라이언트 갱신 완료 (KeyFingerprint: {key_fp})")
        except Exception as e:
            print(f"[Groq Runtime Warning] 클라이언트 생성 실패: {e}")
            _cached_groq_client = None
            _cached_groq_key = None
    return _cached_groq_client


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    district: Optional[str] = "노원구"
    history: Optional[List[ChatMessage]] = Field(default=[])
    category: Optional[str] = None


class PlaceInfo(BaseModel):
    id: str
    name: str
    district: str
    category: str
    sub_category: Optional[str] = ""
    address: str
    road_address: Optional[str] = None
    lat: float
    lng: float
    phone: Optional[str] = ""
    is_registered: bool = True
    description: str
    tags: List[str] = []
    rating: Optional[float] = None
    review_count: Optional[int] = None
    signature_menu: Optional[List[str]] = []
    price_range: Optional[str] = None
    opening_hours: Optional[str] = None
    parking: Optional[str] = None
    atmosphere: Optional[str] = None
    badge: Optional[str] = None
    data_source: str = "카카오 로컬 공식 정보 교차 검증"
    verification_status: str = "verified"
    verified_at: Optional[str] = None
    kakao_url: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    show_map: bool = False
    places: List[PlaceInfo] = []
    district: str
    is_demo: bool = False
    status_message: str = "정상 처리"


class SetCredentialRequest(BaseModel):
    provider: str
    key: str
    model: Optional[str] = None


class TestConnectionRequest(BaseModel):
    provider: str
    key: Optional[str] = None
    model: Optional[str] = None


# ==========================================
# Settings Endpoints (Locked behind Admin Auth except public-map-config)
# ==========================================

@app.get("/api/settings/public-map-config")
def get_public_map_config(request: Request):
    client_origin = request.headers.get("origin") or "http://localhost:3000"
    return {
        "kakao_js_key": settings_mgr.get_kakao_js_key(),
        "is_configured": bool(settings_mgr.get_kakao_js_key()),
        "current_origin": client_origin,
    }


@app.get("/api/settings/status")
def legacy_get_settings_status(_admin: Admin = Depends(require_admin)):
    return settings_mgr.get_status()


@app.post("/api/settings/credentials")
async def legacy_set_credentials(
    req: SetCredentialRequest,
    _admin: Admin = Depends(require_admin),
):
    if req.provider not in ("groq", "kakao_rest", "kakao_js"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="지원하지 않는 제공자입니다.")
    settings_mgr.set_credential(provider=req.provider, key=req.key, model=req.model)
    return {"success": True, "updated_status": settings_mgr.get_status()}


@app.delete("/api/settings/credentials/{provider}")
def legacy_delete_credential(
    provider: str,
    _admin: Admin = Depends(require_admin),
):
    if provider not in ("groq", "kakao_rest", "kakao_js"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="지원하지 않는 제공자입니다.")
    settings_mgr.delete_credential(provider)
    return {"success": True, "updated_status": settings_mgr.get_status()}


@app.post("/api/settings/test-connection")
async def legacy_test_connection(
    req: TestConnectionRequest,
    _admin: Admin = Depends(require_admin),
):
    if req.provider == "groq":
        return await settings_mgr.test_groq_connection(key_to_test=req.key, model=req.model)
    if req.provider == "kakao_rest":
        return await settings_mgr.test_kakao_rest_connection(key_to_test=req.key)
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="지원하지 않는 제공자입니다.")


# ==========================================
# Health & Legacy Compatibility Adapters
# ==========================================

@app.get("/api/health")
def health_check():
    db_health = check_db_health()
    published_count = len(load_verified_restaurants())
    return {
        "status": "healthy" if db_health["connected"] else "degraded",
        "service": "동북미식 (DONGBUK TABLE) API v3.1",
        "database": db_health,
        "supported_districts": ["노원구", "도봉구", "강북구", "중랑구", "성북구"],
        "total_published_restaurants": published_count,
    }


@app.get("/api/places", response_model=List[PlaceInfo])
def get_places(district: str = "노원구", category: Optional[str] = None, q: Optional[str] = ""):
    rows = load_verified_restaurants()
    if district and district != "전체":
        rows = [r for r in rows if r["region_name"] == district or r["region_slug"] == district]
    if category:
        rows = [r for r in rows if category in r["primary_category"] or category == r["primary_category_slug"]]
    if q:
        ql = q.lower()
        rows = [r for r in rows if ql in r["name"].lower() or ql in r["one_line_intro"].lower()]
    return [
        PlaceInfo(
            id=r["id"],
            name=r["name"],
            district=r["region_name"],
            category=r["primary_category"],
            sub_category=r["neighborhood"],
            address=r["road_address"],
            road_address=r["road_address"],
            lat=r["lat"],
            lng=r["lng"],
            phone=r.get("phone") or "",
            description=r["one_line_intro"],
            tags=r.get("highlights") or [],
            signature_menu=r.get("signature_menus") or [],
            price_range=r.get("price_range_label"),
            parking=r.get("parking_info"),
            data_source=r.get("data_source") or "카카오 로컬 공식 정보 교차 검증",
            verification_status=r.get("verification_status") or "verified",
            verified_at=r.get("verified_at"),
            kakao_url=r.get("kakao_url"),
        )
        for r in rows[:25]
    ]


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    selected_district = request.district if request.district in DISTRICT_METADATA else "노원구"
    places = get_places(district=selected_district, category=request.category, q=request.message)[:6]
    if not places:
        places = get_places(district=selected_district)[:4]
    reply = (
        f"동북미식에서 검증된 {selected_district} 등록 매장 {len(places)}곳입니다. "
        "더 정확한 맞춤 추천은 /concierge 페이지를 이용해 주세요."
    )
    return ChatResponse(
        reply=reply,
        show_map=bool(places),
        places=places,
        district=selected_district,
        is_demo=False,
        status_message="통합 DB 호환 응답",
    )

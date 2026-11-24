"""
동북미식 (DONGBUK TABLE) 단일 진실 공급원 (Single Source of Truth) 데이터 계층
- P5: SQLAlchemy 2.0 정규화 DB(PostgreSQL / SQLite 호환)에서 실시간 조회
- 공개 API는 publish_status == 'published' AND business_status != 'closed' 매장만 노출
- 미검증 평점·리뷰 수·임의 영업 상태는 절대 생성하지 않음
"""

from __future__ import annotations

import json
import math
import re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

REGION_IMG_MANIFEST = Path(__file__).resolve().parent / "seed_data" / "region_images_manifest.json"

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from db.database import SessionLocal
from db.models import (
    Category,
    Collection,
    CollectionRestaurant,
    OpeningHour,
    Region,
    Restaurant,
    RestaurantCategory,
    RestaurantFeature,
)

KST = timezone(timedelta(hours=9))


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", "", (text or "").lower())


def _compute_kst_open_status(hours: List[OpeningHour]) -> str:
    if not hours:
        return "needs_check"
    now_kst = datetime.now(KST)
    dow = now_kst.weekday()  # 0=Mon..6=Sun
    today = next((h for h in hours if h.day_of_week == dow), None)
    if not today:
        return "needs_check"
    if today.is_closed:
        return "closed"
    if not today.open_time or not today.close_time:
        return "needs_check"
    cur_hm = now_kst.strftime("%H:%M")
    if today.break_start and today.break_end and today.break_start <= cur_hm < today.break_end:
        return "break_time"
    if today.open_time <= cur_hm <= today.close_time:
        return "open"
    return "closed"


def serialize_restaurant(r: Restaurant, include_detail: bool = False) -> Dict[str, Any]:
    primary_cat_link = next((c for c in r.category_links if c.is_primary), None) or (
        r.category_links[0] if r.category_links else None
    )
    primary_cat_slug = primary_cat_link.category.slug if primary_cat_link and primary_cat_link.category else "etc"
    primary_cat_name = primary_cat_link.category.name if primary_cat_link and primary_cat_link.category else "기타"

    confirmed_features = [
        fl.feature.slug
        for fl in r.feature_links
        if fl.status == "confirmed" and fl.feature
    ]

    sorted_images = sorted(r.images, key=lambda img: (not img.is_primary, img.display_order, img.id))
    primary_img_obj = sorted_images[0] if sorted_images else None
    primary_image = (
        {
            "url": primary_img_obj.url,
            "alt": primary_img_obj.alt_text,
            "image_type": primary_img_obj.image_type,
            "source_name": primary_img_obj.source_name,
            "license_type": primary_img_obj.license_type,
            "is_ai_generated": primary_img_obj.is_ai_generated,
        }
        if primary_img_obj
        else None
    )

    sig_menus = [m.name for m in r.menus if m.is_signature] or [m.name for m in r.menus[:3]]
    top_menus = [
        {
            "name": m.name,
            "price": m.price,
            "price_label": m.price_label,
            "is_signature": m.is_signature,
        }
        for m in sorted(r.menus, key=lambda x: (not x.is_signature, x.price is None, x.display_order))[:3]
    ]

    base: Dict[str, Any] = {
        "id": r.id,
        "slug": r.slug,
        "name": r.name,
        "region_slug": r.region.slug if r.region else r.region_id,
        "region_name": r.region.name if r.region else r.region_id,
        "neighborhood": r.neighborhood_label or "",
        "primary_category_slug": primary_cat_slug,
        "primary_category": primary_cat_name,
        "one_line_intro": r.one_line_intro,
        "description": r.description or r.one_line_intro,
        "editor_note": r.editor_note
        or f"{r.region.name if r.region else ''} {r.neighborhood_label} 일대에서 실존 여부와 주소가 확인된 로컬 매장입니다.",
        "price_range_label": r.price_range_label,
        "price_min": r.price_min,
        "price_max": r.price_max,
        "road_address": r.road_address,
        "jibun_address": r.jibun_address,
        "lat": r.lat,
        "lng": r.lng,
        "phone": r.phone,
        "kakao_place_id": r.kakao_place_id,
        "kakao_url": r.kakao_url,
        "is_editor_pick": bool(r.is_editor_pick),
        "highlights": (r.highlights_json or [])[:2],
        "features": confirmed_features,
        "signature_menus": sig_menus,
        "top_menus": top_menus,
        "primary_image": primary_image,
        "images": [
            {
                "id": img.id,
                "url": img.url,
                "alt": img.alt_text,
                "image_type": img.image_type,
                "is_primary": img.is_primary,
                "source_name": img.source_name,
                "author": img.author,
                "license_type": img.license_type,
                "verified_at": img.verified_at,
                "is_ai_generated": img.is_ai_generated,
            }
            for img in sorted_images
        ],
        "open_status": _compute_kst_open_status(r.opening_hours),
        "opening_hours_note": r.opening_hours_note
        or "매장 사정에 따라 변동될 수 있으므로 방문 전 전화 또는 카카오맵에서 최신 영업시간을 확인해 주세요.",
        "parking_info": r.parking_info or "방문 전 주차 가능 여부 확인 필요",
        "business_status": r.business_status,
        "publish_status": r.publish_status,
        "verification_status": r.verification_status,
        "verified_at": r.verified_at,
        "data_source": r.data_source_label,
    }

    if include_detail:
        base["menus"] = [
            {
                "id": m.id,
                "name": m.name,
                "price": m.price,
                "price_label": m.price_label,
                "is_signature": m.is_signature,
                "description": m.description,
            }
            for m in r.menus
        ]
        base["images"] = [
            {
                "id": img.id,
                "url": img.url,
                "alt": img.alt_text,
                "image_type": img.image_type,
                "is_primary": img.is_primary,
                "source_name": img.source_name,
                "author": img.author,
                "license_type": img.license_type,
                "verified_at": img.verified_at,
                "is_ai_generated": img.is_ai_generated,
            }
            for img in sorted_images
        ]
        base["opening_hours"] = [
            {
                "day_of_week": h.day_of_week,
                "open_time": h.open_time,
                "close_time": h.close_time,
                "break_start": h.break_start,
                "break_end": h.break_end,
                "last_order": h.last_order,
                "is_closed": h.is_closed,
                "raw_note": h.raw_note,
            }
            for h in sorted(r.opening_hours, key=lambda x: x.day_of_week)
        ]

    return base


def _fetch_published_restaurants(db) -> List[Restaurant]:
    stmt = (
        select(Restaurant)
        .where(Restaurant.publish_status == "published", Restaurant.business_status != "closed")
        .options(
            selectinload(Restaurant.region),
            selectinload(Restaurant.category_links).selectinload(RestaurantCategory.category),
            selectinload(Restaurant.menus),
            selectinload(Restaurant.images),
            selectinload(Restaurant.opening_hours),
            selectinload(Restaurant.feature_links).selectinload(RestaurantFeature.feature),
        )
    )
    return list(db.execute(stmt).scalars().all())


def load_verified_restaurants() -> List[Dict[str, Any]]:
    db = SessionLocal()
    try:
        rows = _fetch_published_restaurants(db)
        return [serialize_restaurant(r, include_detail=False) for r in rows]
    finally:
        db.close()


def get_all_regions() -> List[Dict[str, Any]]:
    db = SessionLocal()
    try:
        regions = list(
            db.execute(
                select(Region)
                .options(selectinload(Region.neighborhoods))
                .order_by(Region.display_order)
            )
            .scalars()
            .all()
        )
        pub_rows = _fetch_published_restaurants(db)
        counts: Dict[str, int] = {}
        for r in pub_rows:
            counts[r.region_id] = counts.get(r.region_id, 0) + 1

        region_galleries: Dict[str, List[Dict[str, Any]]] = {}
        if REGION_IMG_MANIFEST.exists():
            try:
                raw_m = json.loads(REGION_IMG_MANIFEST.read_text(encoding="utf-8"))
                for slug_k, info in raw_m.items():
                    if isinstance(info, dict) and info.get("gallery"):
                        region_galleries[slug_k] = info["gallery"]
            except Exception:
                pass

        result = []
        for reg in regions:
            gallery = region_galleries.get(reg.slug) or [
                {
                    "url": reg.hero_image_url,
                    "alt": f"{reg.name} 실제 동네 풍경",
                    "credit": reg.hero_image_credit,
                }
            ]
            result.append({
                "slug": reg.slug,
                "name": reg.name,
                "english_name": reg.english_name,
                "tagline": reg.tagline,
                "summary": reg.summary,
                "description": reg.description,
                "editorial_story": reg.editorial_story,
                "hero_image_url": reg.hero_image_url,
                "hero_image_credit": reg.hero_image_credit,
                "gallery_images": gallery,
                "center_lat": reg.center_lat,
                "center_lng": reg.center_lng,
                "restaurant_count": counts.get(reg.id, 0),
                "neighborhoods": [
                    {
                        "slug": h.slug,
                        "name": h.name,
                        "summary": h.summary,
                        "keywords": h.keywords_json or [],
                    }
                    for h in sorted(reg.neighborhoods, key=lambda x: x.display_order)
                ],
            })
        return result
    finally:
        db.close()


def get_region_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    regions = get_all_regions()
    target = next((reg for reg in regions if reg["slug"] == slug), None)
    if not target:
        return None

    all_rest = load_verified_restaurants()
    reg_rest = [r for r in all_rest if r["region_slug"] == slug]
    # Editor picks first
    reg_rest.sort(key=lambda r: (not r["is_editor_pick"], r["id"]))
    editor_picks = [r for r in reg_rest if r["is_editor_pick"]][:4]
    if len(editor_picks) < 3:
        editor_picks = reg_rest[:3]

    db = SessionLocal()
    try:
        cats = list(db.execute(select(Category).order_by(Category.display_order)).scalars().all())
        cols = list(
            db.execute(
                select(Collection)
                .options(selectinload(Collection.items))
                .order_by(Collection.display_order)
            )
            .scalars()
            .all()
        )
    finally:
        db.close()

    cat_counts: Dict[str, int] = {}
    for r in reg_rest:
        cat_counts[r["primary_category_slug"]] = cat_counts.get(r["primary_category_slug"], 0) + 1
    categories = [
        {"slug": c.slug, "name": c.name, "count": cat_counts.get(c.slug, 0)}
        for c in cats
        if cat_counts.get(c.slug, 0) > 0
    ]

    reg_ids = {r["id"] for r in reg_rest}
    rec_collections = []
    for col in cols:
        overlap = [item.restaurant_id for item in col.items if item.restaurant_id in reg_ids]
        if overlap:
            rec_collections.append({
                "slug": col.slug,
                "title": col.title,
                "subtitle": col.subtitle,
                "description": col.description,
                "hero_image_url": col.hero_image_url,
                "is_featured": col.is_featured,
                "restaurant_count": len(overlap),
                "region_focus": target["name"],
            })

    return {
        "region": target,
        "editor_picks": editor_picks,
        "categories": categories,
        "recommended_collections": rec_collections[:4],
        "restaurants": reg_rest,
        "other_regions": [reg for reg in regions if reg["slug"] != slug],
    }


def query_restaurants(
    q: Optional[str] = None,
    region: Optional[str] = None,
    neighborhood: Optional[str] = None,
    category: Optional[str] = None,
    price: Optional[str] = None,
    features: Optional[List[str]] = None,
    open_now: Optional[bool] = None,
    editor_pick: Optional[bool] = None,
    bounds: Optional[str] = None,
    sort: str = "recommended",
    page: int = 1,
    page_size: int = 12,
) -> Dict[str, Any]:
    items = load_verified_restaurants()

    if region and region != "all":
        items = [r for r in items if r["region_slug"] == region or r["region_name"] == region]

    if neighborhood:
        n_norm = _normalize_text(neighborhood)
        items = [
            r for r in items
            if n_norm in _normalize_text(r["neighborhood"])
            or n_norm in _normalize_text(r["road_address"])
            or n_norm in _normalize_text(r.get("jibun_address") or "")
        ]

    if category and category != "all":
        items = [
            r for r in items
            if r["primary_category_slug"] == category or r["primary_category"] == category
        ]

    if editor_pick:
        items = [r for r in items if r["is_editor_pick"]]

    if price:
        def match_price(r: Dict[str, Any]) -> bool:
            pmin = r.get("price_min")
            pmax = r.get("price_max")
            if pmin is None:
                return False
            if price == "under_10000":
                return pmin <= 10000
            if price == "10000_20000":
                return pmin <= 20000 and (pmax or pmin) >= 10000
            if price == "20000_40000":
                return (pmax or pmin) >= 20000 and pmin <= 40000
            if price == "over_40000":
                return (pmax or pmin) >= 40000
            return True
        items = [r for r in items if match_price(r)]

    if features:
        req_feats = [f.strip() for f in features if f.strip()]
        if req_feats:
            items = [r for r in items if all(f in r["features"] for f in req_feats)]

    if open_now:
        items = [r for r in items if r["open_status"] == "open"]

    if bounds:
        try:
            sw_lat, sw_lng, ne_lat, ne_lng = [float(x) for x in bounds.split(",")]
            items = [
                r for r in items
                if sw_lat <= r["lat"] <= ne_lat and sw_lng <= r["lng"] <= ne_lng
            ]
        except Exception:
            pass

    if q and q.strip():
        q_norm = _normalize_text(q)
        tokens = [t for t in re.split(r"\s+", q.strip().lower()) if t]

        def matches_query(r: Dict[str, Any]) -> bool:
            haystack = _normalize_text(" ".join([
                r["name"],
                r["region_name"],
                r["neighborhood"],
                r["primary_category"],
                r["one_line_intro"],
                r["road_address"],
                r.get("jibun_address") or "",
                " ".join(r.get("signature_menus") or []),
                " ".join(r.get("highlights") or []),
            ]))
            if q_norm in haystack:
                return True
            return all(_normalize_text(tok) in haystack for tok in tokens)

        items = [r for r in items if matches_query(r)]

    if sort == "verified_recent":
        items.sort(key=lambda r: (r.get("verified_at") or "", r["name"]), reverse=True)
    elif sort == "name_asc":
        items.sort(key=lambda r: r["name"])
    elif sort == "price_asc":
        items.sort(key=lambda r: (r.get("price_min") is None, r.get("price_min") or 999999))
    elif sort == "price_desc":
        items.sort(key=lambda r: (r.get("price_max") is None, -(r.get("price_max") or 0)))
    else:
        region_order = {"nowon": 0, "dobong": 1, "gangbuk": 2, "jungnang": 3, "seongbuk": 4}
        per_region_idx: Dict[str, int] = {}
        items.sort(key=lambda r: (not r["is_editor_pick"], region_order.get(r["region_slug"], 9), r["id"]))
        balanced = []
        for r in items:
            rs = r["region_slug"]
            rank_in_region = per_region_idx.get(rs, 0)
            per_region_idx[rs] = rank_in_region + 1
            balanced.append((not r["is_editor_pick"], rank_in_region, region_order.get(rs, 9), r))
        balanced.sort(key=lambda x: (x[0], x[1], x[2]))
        items = [x[3] for x in balanced]

    total = len(items)
    safe_page = max(1, page)
    safe_size = max(1, min(50, page_size))
    total_pages = max(1, math.ceil(total / safe_size))
    start = (safe_page - 1) * safe_size
    sliced = items[start : start + safe_size]

    return {
        "items": sliced,
        "pagination": {
            "page": safe_page,
            "page_size": safe_size,
            "total": total,
            "total_pages": total_pages,
        },
    }


def get_restaurant_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    db = SessionLocal()
    try:
        stmt = (
            select(Restaurant)
            .where(
                (Restaurant.slug == slug) | (Restaurant.id == slug),
                Restaurant.publish_status == "published",
                Restaurant.business_status != "closed",
            )
            .options(
                selectinload(Restaurant.region),
                selectinload(Restaurant.category_links).selectinload(RestaurantCategory.category),
                selectinload(Restaurant.menus),
                selectinload(Restaurant.images),
                selectinload(Restaurant.opening_hours),
                selectinload(Restaurant.feature_links).selectinload(RestaurantFeature.feature),
            )
        )
        row = db.execute(stmt).scalar_one_or_none()
        if not row:
            return None
        target = serialize_restaurant(row, include_detail=True)
        all_rest = [serialize_restaurant(r, include_detail=False) for r in _fetch_published_restaurants(db)]
        related = [
            r for r in all_rest
            if r["id"] != target["id"]
            and (r["region_slug"] == target["region_slug"] or r["primary_category_slug"] == target["primary_category_slug"])
        ][:4]
        target["related_restaurants"] = related
        return target
    finally:
        db.close()


def get_all_categories() -> List[Dict[str, Any]]:
    db = SessionLocal()
    try:
        cats = list(db.execute(select(Category).order_by(Category.display_order)).scalars().all())
        all_rest = [serialize_restaurant(r, include_detail=False) for r in _fetch_published_restaurants(db)]
    finally:
        db.close()

    counts: Dict[str, int] = {}
    for r in all_rest:
        counts[r["primary_category_slug"]] = counts.get(r["primary_category_slug"], 0) + 1
    return [
        {"slug": c.slug, "name": c.name, "count": counts.get(c.slug, 0)}
        for c in cats
    ]


def get_all_collections() -> List[Dict[str, Any]]:
    db = SessionLocal()
    try:
        cols = list(
            db.execute(
                select(Collection)
                .options(selectinload(Collection.items))
                .order_by(Collection.display_order)
            )
            .scalars()
            .all()
        )
        pub_ids = {r.id for r in _fetch_published_restaurants(db)}
        return [
            {
                "slug": c.slug,
                "title": c.title,
                "subtitle": c.subtitle,
                "description": c.description,
                "hero_image_url": c.hero_image_url,
                "is_featured": c.is_featured,
                "restaurant_count": sum(1 for item in c.items if item.restaurant_id in pub_ids),
                "region_focus": None,
            }
            for c in cols
        ]
    finally:
        db.close()


def get_collection_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    db = SessionLocal()
    try:
        col = db.execute(
            select(Collection)
            .where(Collection.slug == slug)
            .options(selectinload(Collection.items))
        ).scalar_one_or_none()
        if not col:
            return None
        all_map = {
            r.id: serialize_restaurant(r, include_detail=False)
            for r in _fetch_published_restaurants(db)
        }
        restaurants = [
            all_map[item.restaurant_id]
            for item in sorted(col.items, key=lambda x: x.display_order)
            if item.restaurant_id in all_map
        ]
        return {
            "slug": col.slug,
            "title": col.title,
            "subtitle": col.subtitle,
            "description": col.description,
            "hero_image_url": col.hero_image_url,
            "is_featured": col.is_featured,
            "restaurant_count": len(restaurants),
            "region_focus": None,
            "restaurants": restaurants,
        }
    finally:
        db.close()

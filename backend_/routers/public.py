"""
동북미식 (DONGBUK TABLE) Public API Router
- GET /api/regions
- GET /api/regions/{slug}
- GET /api/restaurants
- GET /api/restaurants/{slug}
- GET /api/categories
- GET /api/collections
- GET /api/collections/{slug}
"""

import json
import time
import uuid
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from gourmet_catalog import (
    get_all_categories,
    get_all_collections,
    get_all_regions,
    get_collection_by_slug,
    get_region_by_slug,
    get_restaurant_by_slug,
    query_restaurants,
)

router = APIRouter(prefix="/api", tags=["Public Gourmet API"])

FEEDBACK_FILE = Path(__file__).resolve().parent.parent / "data" / "feedback_reports.json"


class FeedbackCreateRequest(BaseModel):
    restaurant_id: Optional[str] = Field(default=None, max_length=80)
    restaurant_name: Optional[str] = Field(default=None, max_length=120)
    report_type: str = Field(..., pattern="^(hours|closed|address|menu|new_place|other)$")
    content: str = Field(..., min_length=5, max_length=1000)
    reporter_contact: Optional[str] = Field(default=None, max_length=120)


@router.get("/regions")
def list_regions():
    return get_all_regions()


@router.get("/regions/{slug}")
def region_detail(slug: str):
    data = get_region_by_slug(slug)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"지원하지 않는 지역입니다: {slug}",
        )
    return data


@router.get("/restaurants")
def list_restaurants(
    q: Optional[str] = Query(default=None),
    region: Optional[str] = Query(default=None),
    neighborhood: Optional[str] = Query(default=None),
    category: Optional[str] = Query(default=None),
    price: Optional[str] = Query(default=None),
    features: Optional[str] = Query(default=None),
    open_now: Optional[bool] = Query(default=None),
    editor_pick: Optional[bool] = Query(default=None),
    bounds: Optional[str] = Query(default=None),
    sort: str = Query(default="recommended"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
):
    feat_list = [f.strip() for f in features.split(",") if f.strip()] if features else None
    return query_restaurants(
        q=q,
        region=region,
        neighborhood=neighborhood,
        category=category,
        price=price,
        features=feat_list,
        open_now=open_now,
        editor_pick=editor_pick,
        bounds=bounds,
        sort=sort,
        page=page,
        page_size=page_size,
    )


@router.get("/restaurants/{slug}")
def restaurant_detail(slug: str):
    data = get_restaurant_by_slug(slug)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"해당 맛집을 찾을 수 없습니다: {slug}",
        )
    return data


@router.get("/categories")
def list_categories():
    return get_all_categories()


@router.get("/collections")
def list_collections():
    return get_all_collections()


@router.get("/collections/{slug}")
def collection_detail(slug: str):
    data = get_collection_by_slug(slug)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"해당 미식 테마를 찾을 수 없습니다: {slug}",
        )
    return data


@router.post("/feedback", status_code=status.HTTP_201_CREATED)
def submit_feedback(payload: FeedbackCreateRequest):
    FEEDBACK_FILE.parent.mkdir(parents=True, exist_ok=True)
    existing = []
    if FEEDBACK_FILE.exists():
        try:
            existing = json.loads(FEEDBACK_FILE.read_text(encoding="utf-8"))
        except Exception:
            existing = []

    record = {
        "id": f"fb-{uuid.uuid4().hex[:10]}",
        "restaurant_id": payload.restaurant_id,
        "restaurant_name": payload.restaurant_name,
        "report_type": payload.report_type,
        "content": payload.content.strip(),
        "reporter_contact": payload.reporter_contact.strip() if payload.reporter_contact else None,
        "status": "pending",
        "created_at": int(time.time() * 1000),
    }
    existing.append(record)
    FEEDBACK_FILE.write_text(
        json.dumps(existing, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    return {
        "success": True,
        "id": record["id"],
        "message": "소중한 제보가 접수되었습니다. 검수 후 반영하겠습니다.",
    }


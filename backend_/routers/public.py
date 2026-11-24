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

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

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


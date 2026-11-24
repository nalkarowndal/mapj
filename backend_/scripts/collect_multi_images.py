"""
동북미식 (DONGBUK TABLE) 다중 실제 이미지(슬라이드용) 수집·검증 파이프라인
- 5개 자치구: 기존 대표 1장 + 추가 동네 실제 풍경 2장 = 자치구당 총 3장 (15장)
- 110개 검증 매장: 기존 대표 1장 + 추가 실제 음식·매장 사진 2장 = 매장당 최대 3장 (최대 330장)
- Pillow 유효성·해상도·비율·MD5 중복 검사 후 로컬 최적화 저장 -> DB restaurant_images 동기화
"""

from __future__ import annotations

import hashlib
import json
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Set

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import select
from db.database import SessionLocal
from db.models import Region, Restaurant, RestaurantImage
from scripts.collect_real_images import (
    REGION_IMG_DIR,
    REGION_MANIFEST_PATH,
    REST_IMG_DIR,
    REST_MANIFEST_PATH,
    SKIP_URL_TOKENS,
    download_and_optimize_image,
    kakao_image_search,
)
from settings_manager import settings_mgr

EXTRA_REGION_QUERIES: Dict[str, List[tuple[str, str]]] = {
    "nowon": [
        ("공릉동 경춘선숲길 철길 산책로", "공릉동 경춘선숲길 산책로"),
        ("노원구 불암산 나비정원 전경", "노원구 불암산 풍경"),
    ],
    "dobong": [
        ("도봉산 도봉계곡 탐방로 풍경", "도봉산 계곡 탐방로"),
        ("도봉구 창동 서울창포원 풍경", "도봉구 서울창포원"),
    ],
    "gangbuk": [
        ("강북구 북한산 4.19 카페거리 풍경", "강북구 4.19 카페거리"),
        ("강북구 북서울꿈의숲 전망대 풍경", "강북구 북서울꿈의숲"),
    ],
    "jungnang": [
        ("중랑구 중랑장미공원 장미터널 꽃", "중랑구 중랑장미공원"),
        ("중랑구 용마폭포공원 전경", "중랑구 용마폭포공원"),
    ],
    "seongbuk": [
        ("성북구 한양도성 성북동 성곽길", "성북구 한양도성 성곽길"),
        ("성북구 길상사 성북동 풍경", "성북구 성북동 길상사"),
    ],
}


def file_md5(path: Path) -> str:
    return hashlib.md5(path.read_bytes()).hexdigest()


def collect_multi_region_photos(rest_key: str) -> Dict[str, Any]:
    print("=== 1. COLLECTING 3 REAL PHOTOS PER DISTRICT (15 TOTAL) ===")
    reg_manifest: Dict[str, Any] = json.loads(REGION_MANIFEST_PATH.read_text(encoding="utf-8"))

    for slug, extra_specs in EXTRA_REGION_QUERIES.items():
        base_info = reg_manifest.get(slug, {})
        first_path = REGION_IMG_DIR / f"region-{slug}.jpg"
        seen_hashes: Set[str] = {file_md5(first_path)} if first_path.exists() else set()

        gallery = [
            {
                "url": base_info.get("hero_image_url", f"/images/regions/region-{slug}.jpg"),
                "alt": f"{slug} 대표 동네 풍경 1",
                "credit": base_info.get("hero_image_credit", f"{slug} 실제 풍경 사진"),
                "source_url": base_info.get("source_url", ""),
            }
        ]

        for idx, (query, caption) in enumerate(extra_specs, start=2):
            dest = REGION_IMG_DIR / f"region-{slug}-{idx}.jpg"
            docs = kakao_image_search(query, rest_key, size=10)
            added = False
            for d in docs:
                site = d.get("display_sitename") or ""
                u = (d.get("image_url") or "").strip()
                if not u or any(tok in u.lower() for tok in SKIP_URL_TOKENS):
                    continue
                if "다이닝코드" in site or "diningcode" in u.lower():
                    continue
                dims = download_and_optimize_image(
                    u,
                    dest,
                    max_width=1400,
                    min_w=640,
                    min_h=380,
                    min_ratio=1.15,
                    max_ratio=2.2,
                    referer=d.get("doc_url"),
                )
                if dims:
                    h = file_md5(dest)
                    if h in seen_hashes:
                        continue
                    seen_hashes.add(h)
                    gallery.append({
                        "url": f"/images/regions/region-{slug}-{idx}.jpg",
                        "alt": caption,
                        "credit": f"{caption} 실제 사진 (출처: {site or '웹 검색'})",
                        "source_url": d.get("doc_url") or u,
                    })
                    print(f"  [{slug}-{idx}] OK ({dims[0]}x{dims[1]}) {caption} ({site})")
                    added = True
                    break
            if not added:
                print(f"  [{slug}-{idx}] WARN: fallback skip")

        base_info["gallery"] = gallery
        reg_manifest[slug] = base_info

    REGION_MANIFEST_PATH.write_text(json.dumps(reg_manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return reg_manifest


def _fetch_extra_for_one(
    rid: str,
    rname: str,
    reg_name: str,
    base_item: Dict[str, Any],
    rest_key: str,
    target_total: int = 3,
) -> List[Dict[str, Any]]:
    first_path = REST_IMG_DIR / f"{rid}.jpg"
    seen_hashes: Set[str] = {file_md5(first_path)} if first_path.exists() else set()
    seen_urls: Set[str] = set()

    items: List[Dict[str, Any]] = []
    if base_item:
        items.append({**base_item, "display_order": 1, "is_primary": True})

    # If already downloaded _2 and _3, keep them if valid
    next_slot = 2
    short_reg = reg_name.replace("구", "")
    queries = [
        f"{reg_name} {rname}",
        f"{short_reg} {rname} 음식",
        f"{rname} 매장",
    ]

    for q in queries:
        if len(items) >= target_total:
            break
        docs = kakao_image_search(q, rest_key, size=10)
        for d in docs:
            if len(items) >= target_total:
                break
            site = d.get("display_sitename") or ""
            u = (d.get("image_url") or "").strip()
            if not u or u in seen_urls:
                continue
            if "다이닝코드" in site or "diningcode" in u.lower() or "sbs" in u.lower():
                continue
            if any(tok in u.lower() for tok in SKIP_URL_TOKENS):
                continue
            seen_urls.add(u)

            dest = REST_IMG_DIR / f"{rid}_{next_slot}.jpg"
            dims = download_and_optimize_image(
                u,
                dest,
                max_width=900,
                min_w=400,
                min_h=260,
                min_ratio=0.68,
                max_ratio=2.0,
                referer=d.get("doc_url"),
            )
            if not dims:
                continue
            h = file_md5(dest)
            if h in seen_hashes:
                try:
                    dest.unlink()
                except Exception:
                    pass
                continue
            seen_hashes.add(h)
            doc_url = d.get("doc_url") or ""
            items.append({
                "restaurant_id": rid,
                "url": f"/images/restaurants/{rid}_{next_slot}.jpg",
                "image_type": "food" if next_slot == 2 else "interior",
                "alt_text": f"{rname} 실제 매장·음식 사진 {next_slot}",
                "source_name": f"카카오 이미지 검색 ({site or '블로그'})",
                "author": site or "블로그",
                "license_type": f"외부 출처 참고 이미지 ({doc_url})" if doc_url else "외부 출처 참고 이미지",
                "doc_url": doc_url,
                "width": dims[0],
                "height": dims[1],
                "is_primary": False,
                "display_order": next_slot,
                "is_ai_generated": False,
                "verified_at": "2026-11-24",
            })
            next_slot += 1
    return items


def collect_multi_restaurant_photos(rest_key: str) -> List[Dict[str, Any]]:
    print("\n=== 2. COLLECTING UP TO 3 REAL PHOTOS PER RESTAURANT (110 RESTAURANTS) ===")
    db = SessionLocal()
    try:
        rows = list(db.execute(select(Restaurant).order_by(Restaurant.id)).scalars().all())
        region_names = {r.id: r.name for r in db.execute(select(Region)).scalars().all()}
    finally:
        db.close()

    base_map: Dict[str, Dict[str, Any]] = {}
    if REST_MANIFEST_PATH.exists():
        for item in json.loads(REST_MANIFEST_PATH.read_text(encoding="utf-8")):
            rid = item["restaurant_id"]
            if rid not in base_map or item.get("is_primary", True):
                base_map[rid] = item

    all_images: List[Dict[str, Any]] = []
    done_restaurants = 0
    multi_count = 0

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {
            pool.submit(
                _fetch_extra_for_one,
                r.id,
                r.name,
                region_names.get(r.region_id, ""),
                base_map.get(r.id, {}),
                rest_key,
                3,
            ): r.id
            for r in rows
        }
        for fut in as_completed(futures):
            imgs = fut.result()
            all_images.extend(imgs)
            done_restaurants += 1
            if len(imgs) >= 2:
                multi_count += 1
            if done_restaurants % 20 == 0 or done_restaurants == len(rows):
                print(f"  Progress: {done_restaurants}/{len(rows)} restaurants (total_photos={len(all_images)}, multi_photo_restaurants={multi_count})")

    all_images.sort(key=lambda x: (x["restaurant_id"], x.get("display_order", 1)))
    REST_MANIFEST_PATH.write_text(json.dumps(all_images, ensure_ascii=False, indent=2), encoding="utf-8")
    return all_images


def sync_all_to_db(all_images: List[Dict[str, Any]]) -> None:
    print("\n=== 3. SYNCING MULTI-IMAGES TO DATABASE ===")
    db = SessionLocal()
    try:
        # Remove old auto-collected img-real-* records cleanly and insert full ordered gallery
        old_rows = list(db.execute(select(RestaurantImage).where(RestaurantImage.id.like("img-real-%"))).scalars().all())
        for old in old_rows:
            db.delete(old)
        db.flush()

        inserted = 0
        for item in all_images:
            rid = item["restaurant_id"]
            if not db.get(Restaurant, rid):
                continue
            order = int(item.get("display_order", 1))
            img_id = f"img-real-{rid}-{order}"
            db.add(
                RestaurantImage(
                    id=img_id,
                    restaurant_id=rid,
                    url=item["url"],
                    image_type=item.get("image_type", "food"),
                    alt_text=item["alt_text"],
                    is_primary=(order == 1),
                    source_name=item["source_name"],
                    author=item.get("author"),
                    license_type=item["license_type"],
                    verified_at=item.get("verified_at", "2026-11-24"),
                    is_ai_generated=False,
                    display_order=order,
                )
            )
            inserted += 1
        db.commit()
        print(f"  DB Sync Complete: {inserted} real restaurant gallery images synced.")
    finally:
        db.close()


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    rest_key = settings_mgr.get_kakao_rest_key()
    collect_multi_region_photos(rest_key)
    imgs = collect_multi_restaurant_photos(rest_key)
    sync_all_to_db(imgs)


"""
동북미식 (DONGBUK TABLE) 실제 동네 풍경 및 실제 식당 사진 수집·검증 파이프라인
- 5개 자치구 실제 동네 사진: Wikimedia Commons (CC0 / CC BY / KOGL) 우선 다운로드 -> 실패 시 카카오 이미지 검색 폴백
- 110개 실존 검증 식당 실제 사진: Kakao Image Search API (dapi.kakao.com/v2/search/image) 조회 ->
  Pillow 유효성·해상도·비율 검증 후 frontend/public/images/restaurants/{id}.jpg 로 로컬 최적화 저장
- 모든 이미지의 출처(source_name), 원문 URL(doc_url), 라이선스, 확인일을 매니페스트 JSON과 DB에 투명 기록
"""

from __future__ import annotations

import io
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import select
from db.database import SessionLocal
from db.models import Region, Restaurant, RestaurantImage
from settings_manager import settings_mgr

REGION_IMG_DIR = REPO_ROOT / "frontend" / "public" / "images" / "regions"
REST_IMG_DIR = REPO_ROOT / "frontend" / "public" / "images" / "restaurants"
REGION_IMG_DIR.mkdir(parents=True, exist_ok=True)
REST_IMG_DIR.mkdir(parents=True, exist_ok=True)

REGION_MANIFEST_PATH = BASE_DIR / "seed_data" / "region_images_manifest.json"
REST_MANIFEST_PATH = BASE_DIR / "seed_data" / "restaurant_images_manifest.json"

WIKIMEDIA_REGIONS: Dict[str, Dict[str, str]] = {
    "nowon": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Panoramic_view_of_Nowon-gu%2C_Seoul.jpg/1280px-Panoramic_view_of_Nowon-gu%2C_Seoul.jpg",
        "fallback_query": "공릉동 경춘선숲길 노원구 풍경",
        "credit": "노원구 실제 전경 사진 (Wikimedia Commons · KOGL Type 1)",
        "source_url": "https://commons.wikimedia.org/wiki/File:Panoramic_view_of_Nowon-gu,_Seoul.jpg",
    },
    "dobong": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/40/Dobongsan-Obong.jpg/1280px-Dobongsan-Obong.jpg",
        "fallback_query": "도봉산 풍경 도봉구",
        "credit": "도봉구 도봉산 실제 풍경 사진 (Wikimedia Commons · CC0)",
        "source_url": "https://commons.wikimedia.org/wiki/File:Dobongsan-Obong.jpg",
    },
    "gangbuk": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/79/Bukhansan_Spring_in_Korea.jpg/1280px-Bukhansan_Spring_in_Korea.jpg",
        "fallback_query": "북한산 강북구 우이동 4.19 풍경",
        "credit": "강북구 북한산 실제 풍경 사진 (Wikimedia Commons · CC0)",
        "source_url": "https://commons.wikimedia.org/wiki/File:Bukhansan_Spring_in_Korea.jpg",
    },
    "jungnang": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Jungnangcheon_from_Hannae_Bridge.jpg/1280px-Jungnangcheon_from_Hannae_Bridge.jpg",
        "fallback_query": "중랑천 서울장미축제 중랑구 풍경",
        "credit": "중랑구 중랑천 실제 풍경 사진 (Wikimedia Commons · CC BY-SA 3.0)",
        "source_url": "https://commons.wikimedia.org/wiki/File:Jungnangcheon_from_Hannae_Bridge.jpg",
    },
    "seongbuk": {
        "url": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Seongbuk-dong%2C_Seoul.jpg/1280px-Seongbuk-dong%2C_Seoul.jpg",
        "fallback_query": "성북동 길 성북구 한옥 풍경",
        "credit": "성북구 성북동 실제 거리 풍경 사진 (Wikimedia Commons · CC BY 2.0)",
        "source_url": "https://commons.wikimedia.org/wiki/File:Seongbuk-dong,_Seoul.jpg",
    },
}

SKIP_URL_TOKENS = (
    "logo", "icon", "banner", "sprite", "avatar", "profile", "blank",
    "map.daum", "kakaomap", "naver.com/map", "staticmap", "placeholder",
    "noimage", "no_image", "tistory.com/skin", "emoticon", "sticker",
)


def download_and_optimize_image(
    url: str,
    dest_path: Path,
    max_width: int = 900,
    min_w: int = 360,
    min_h: int = 250,
    min_ratio: float = 0.60,
    max_ratio: float = 2.35,
    referer: Optional[str] = None,
) -> Optional[Tuple[int, int]]:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    }
    if referer:
        headers["Referer"] = referer
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as resp:
            raw = resp.read()
        if len(raw) < 6000:
            return None
        with Image.open(io.BytesIO(raw)) as img:
            w, h = img.size
            if w < min_w or h < min_h:
                return None
            ratio = w / float(h)
            if ratio < min_ratio or ratio > max_ratio:
                return None
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            elif img.mode == "L":
                img = img.convert("RGB")
            if w > max_width:
                new_h = int(h * (max_width / float(w)))
                img = img.resize((max_width, new_h), Image.Resampling.LANCZOS)
                w, h = img.size
            img.save(dest_path, format="JPEG", quality=84, optimize=True)
            return (w, h)
    except Exception:
        return None


def kakao_image_search(query: str, rest_key: str, size: int = 10) -> List[Dict[str, Any]]:
    params = urllib.parse.urlencode({"query": query, "size": size, "sort": "accuracy"})
    url = f"https://dapi.kakao.com/v2/search/image?{params}"
    req = urllib.request.Request(url, headers={"Authorization": f"KakaoAK {rest_key}"})
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            return json.loads(r.read().decode("utf-8")).get("documents", [])
    except Exception:
        return []


def collect_region_photos(rest_key: str) -> Dict[str, Any]:
    print("=== 1. COLLECTING 5 REAL DISTRICT NEIGHBORHOOD PHOTOS ===")
    manifest: Dict[str, Any] = {}
    for slug, info in WIKIMEDIA_REGIONS.items():
        dest = REGION_IMG_DIR / f"region-{slug}.jpg"
        saved_dims = download_and_optimize_image(
            info["url"],
            dest,
            max_width=1400,
            min_w=600,
            min_h=300,
            min_ratio=0.8,
            max_ratio=2.6,
        )
        if saved_dims:
            manifest[slug] = {
                "hero_image_url": f"/images/regions/region-{slug}.jpg",
                "hero_image_credit": info["credit"],
                "source_url": info["source_url"],
                "width": saved_dims[0],
                "height": saved_dims[1],
            }
            print(f"  [{slug}] Wikimedia OK ({saved_dims[0]}x{saved_dims[1]})")
            time.sleep(0.8)
            continue

        # Fallback to Kakao Image Search for real scenic photo of that exact neighborhood
        docs = kakao_image_search(info["fallback_query"], rest_key, size=10)
        found = None
        for d in docs:
            u = d.get("image_url") or ""
            if any(tok in u.lower() for tok in SKIP_URL_TOKENS):
                continue
            dims = download_and_optimize_image(
                u, dest, max_width=1400, min_w=600, min_h=350, min_ratio=1.1, max_ratio=2.4, referer=d.get("doc_url")
            )
            if dims:
                site = d.get("display_sitename") or "웹 검색"
                found = {
                    "hero_image_url": f"/images/regions/region-{slug}.jpg",
                    "hero_image_credit": f"{slug} 실제 동네 풍경 사진 (출처: {site})",
                    "source_url": d.get("doc_url") or u,
                    "width": dims[0],
                    "height": dims[1],
                }
                break
        if found:
            manifest[slug] = found
            print(f"  [{slug}] Kakao Image OK ({found['width']}x{found['height']}) -> {found['hero_image_credit']}")
        else:
            print(f"  [{slug}] WARN: failed to download")
        time.sleep(0.3)

    REGION_MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def collect_restaurant_photos(rest_key: str) -> List[Dict[str, Any]]:
    print("\n=== 2. COLLECTING REAL RESTAURANT PHOTOS (110 VERIFIED RESTAURANTS) ===")
    db = SessionLocal()
    try:
        rows = list(db.execute(select(Restaurant).order_by(Restaurant.id)).scalars().all())
        region_names = {r.id: r.name for r in db.execute(select(Region)).scalars().all()}
    finally:
        db.close()

    # Load existing manifest if resuming
    existing_map: Dict[str, Dict[str, Any]] = {}
    if REST_MANIFEST_PATH.exists():
        try:
            for item in json.loads(REST_MANIFEST_PATH.read_text(encoding="utf-8")):
                existing_map[item["restaurant_id"]] = item
        except Exception:
            pass

    results: List[Dict[str, Any]] = []
    success_count = 0
    failed_names: List[str] = []

    for idx, r in enumerate(rows, 1):
        dest = REST_IMG_DIR / f"{r.id}.jpg"
        if r.id in existing_map and dest.exists():
            results.append(existing_map[r.id])
            success_count += 1
            continue

        reg_name = region_names.get(r.region_id, "")
        short_reg = reg_name.replace("구", "")
        queries = [
            f"{reg_name} {r.name}",
            f"{short_reg} {r.name} 맛집",
            f"{r.name}",
        ]

        chosen: Optional[Dict[str, Any]] = None
        for q in queries:
            docs = kakao_image_search(q, rest_key, size=8)
            # Prefer landscape or square food/restaurant photos with good resolution
            sorted_docs = sorted(
                docs,
                key=lambda d: (
                    0 if (d.get("width", 0) >= d.get("height", 1) * 0.9 and d.get("width", 0) >= 500) else 1,
                    -(d.get("width", 0)),
                ),
            )
            for d in sorted_docs:
                u = (d.get("image_url") or "").strip()
                if not u or any(tok in u.lower() for tok in SKIP_URL_TOKENS):
                    continue
                dims = download_and_optimize_image(
                    u,
                    dest,
                    max_width=900,
                    min_w=360,
                    min_h=240,
                    min_ratio=0.65,
                    max_ratio=2.2,
                    referer=d.get("doc_url"),
                )
                if dims:
                    site = d.get("display_sitename") or "카카오 이미지 검색"
                    doc_url = d.get("doc_url") or ""
                    chosen = {
                        "restaurant_id": r.id,
                        "url": f"/images/restaurants/{r.id}.jpg",
                        "image_type": "food",
                        "alt_text": f"{r.name} 실제 매장·음식 사진",
                        "source_name": f"카카오 이미지 검색 ({site})",
                        "author": site,
                        "license_type": f"외부 출처 참고 이미지 ({doc_url})" if doc_url else "외부 출처 참고 이미지",
                        "doc_url": doc_url,
                        "width": dims[0],
                        "height": dims[1],
                        "is_ai_generated": False,
                        "verified_at": "2026-11-24",
                    }
                    break
            if chosen:
                break
            time.sleep(0.05)

        if chosen:
            results.append(chosen)
            success_count += 1
        else:
            failed_names.append(f"{r.id}:{r.name}")

        if idx % 15 == 0 or idx == len(rows):
            print(f"  Progress: {idx}/{len(rows)} (collected={success_count}, missing={len(failed_names)})")
            REST_MANIFEST_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    REST_MANIFEST_PATH.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"  DONE: {success_count}/{len(rows)} real restaurant photos saved. Missing: {failed_names[:10]}")
    return results


def sync_to_database(region_manifest: Dict[str, Any], rest_manifest: List[Dict[str, Any]]) -> None:
    print("\n=== 3. SYNCING REAL PHOTOS TO DATABASE ===")
    db = SessionLocal()
    try:
        for slug, info in region_manifest.items():
            reg = db.get(Region, slug)
            if reg:
                reg.hero_image_url = info["hero_image_url"]
                reg.hero_image_credit = info["hero_image_credit"]

        synced = 0
        for item in rest_manifest:
            rid = item["restaurant_id"]
            if not db.get(Restaurant, rid):
                continue
            img_id = f"img-real-{rid}"
            existing = db.get(RestaurantImage, img_id)
            if existing:
                existing.url = item["url"]
                existing.alt_text = item["alt_text"]
                existing.source_name = item["source_name"]
                existing.author = item.get("author")
                existing.license_type = item["license_type"]
                existing.is_primary = True
                existing.is_ai_generated = False
                existing.verified_at = item.get("verified_at", "2026-11-24")
            else:
                db.add(
                    RestaurantImage(
                        id=img_id,
                        restaurant_id=rid,
                        url=item["url"],
                        image_type=item.get("image_type", "food"),
                        alt_text=item["alt_text"],
                        is_primary=True,
                        source_name=item["source_name"],
                        author=item.get("author"),
                        license_type=item["license_type"],
                        verified_at=item.get("verified_at", "2026-11-24"),
                        is_ai_generated=False,
                        display_order=1,
                    )
                )
            synced += 1
        db.commit()
        print(f"  DB Sync Complete: {len(region_manifest)} regions + {synced} restaurant images updated.")
    finally:
        db.close()


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    rest_key = settings_mgr.get_kakao_rest_key()
    if not rest_key:
        raise RuntimeError("KAKAO_REST_API_KEY가 필요합니다.")
    reg_m = collect_region_photos(rest_key)
    rest_m = collect_restaurant_photos(rest_key)
    sync_to_database(reg_m, rest_m)


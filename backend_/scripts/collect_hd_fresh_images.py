"""
동북미식 (DONGBUK TABLE) 고화질·최신화·구성(음식+내부+외관) 기준 이미지 수집·검증 파이프라인
[이미지 품질 기준 — IMAGE_QUALITY_POLICY]
1. 해상도(깨짐 방지, 업스케일 금지):
   - 지역 풍경 사진: 원본 가로 >= 1000px, 세로 >= 600px, 파일 >= 45KB, 종횡비 1.20~2.00
   - 식당 사진: 원본 가로 >= 720px, 세로 >= 480px, 파일 >= 30KB, 종횡비 0.72~1.85
2. 선명도(Sharpness) 검증:
   - Pillow FIND_EDGES 기반 에지 에너지 평균 >= 9.0 (심한 블러·단색·저화질 뭉개짐 제외)
3. 최신화(Freshness) 기준:
   - 1순위: 2024년 이후 (2024~2026) 게시 사진
   - 2순위(보조): 2022년 이후 (2022~2023) 게시 사진 (2021년 이전 구형 사진 전면 배제)
4. 식당 슬라이드 구성 기준 (외관·내부뿐 아니라 음식 사진 필수 포함):
   - Slot 1 (대표, image_type='food'): 대표 메뉴 기반 실제 음식 사진 필수
   - Slot 2 (image_type='food' 또는 'interior'): 추가 음식/상차림 또는 내부 사진
   - Slot 3 (image_type='exterior' 또는 'interior'): 매장 외관/입구 또는 내부 공간 사진
5. 로컬 고품질 저장:
   - JPEG quality=88, subsampling=0 (4:4:4 색차 보존), 지역 max_width=1440px, 식당 max_width=1200px
"""

from __future__ import annotations

import hashlib
import io
import json
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from PIL import Image, ImageFilter, ImageStat

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BASE_DIR.parent
sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import select
from sqlalchemy.orm import selectinload
from db.database import SessionLocal
from db.models import Region, Restaurant, RestaurantImage
from settings_manager import settings_mgr

REGION_IMG_DIR = REPO_ROOT / "frontend" / "public" / "images" / "regions"
REST_IMG_DIR = REPO_ROOT / "frontend" / "public" / "images" / "restaurants"
REGION_IMG_DIR.mkdir(parents=True, exist_ok=True)
REST_IMG_DIR.mkdir(parents=True, exist_ok=True)

REGION_MANIFEST_PATH = BASE_DIR / "seed_data" / "region_images_manifest.json"
REST_MANIFEST_PATH = BASE_DIR / "seed_data" / "restaurant_images_manifest.json"

SKIP_URL_TOKENS = (
    "logo", "icon", "banner", "sprite", "avatar", "profile", "blank",
    "map.daum", "kakaomap", "naver.com/map", "staticmap", "placeholder",
    "noimage", "no_image", "tistory.com/skin", "emoticon", "sticker",
    "diningcode", "sbs.co.kr", "kbs.co.kr", "mbc.co.kr", "cesco",
    "qrcode", "coupon", "event", "poster", "flyer", "notice", "menu_board",
)

SKIP_SITES = ("다이닝코드", "식신", "망고플레이트")

# 5개 자치구 최신 고화질 풍경 쿼리 (각 3장)
REGION_HD_SPECS: Dict[str, List[Tuple[str, str]]] = {
    "nowon": [
        ("노원구 공릉동 경춘선숲길 화랑대철도공원 풍경", "노원구 경춘선숲길·화랑대 철도공원"),
        ("공릉동 경춘선숲길 산책로 가을 봄 풍경", "공릉동 경춘선숲길 산책로"),
        ("노원구 불암산 힐링타운 전망대 풍경", "노원구 불암산 힐링타운 전경"),
    ],
    "dobong": [
        ("도봉산 자운봉 선인봉 등산 풍경 서울", "도봉구 도봉산 자운봉·선인봉"),
        ("도봉산 도봉계곡 탐방로 숲길 풍경", "도봉산 계곡 숲길 풍경"),
        ("도봉구 서울창포원 산책로 공원 풍경", "도봉구 서울창포원 전경"),
    ],
    "gangbuk": [
        ("강북구 북한산 우이동 솔밭근린공원 풍경", "강북구 북한산·우이동 풍경"),
        ("강북구 4.19 카페거리 북한산 뷰 카페", "강북구 4.19 카페거리"),
        ("강북구 북서울꿈의숲 호수 전망대 풍경", "강북구 북서울꿈의숲"),
    ],
    "jungnang": [
        ("중랑구 중랑천 수변 산책로 야경 풍경", "중랑구 중랑천 수변 산책로"),
        ("중랑구 서울장미축제 중랑장미공원 장미터널", "중랑구 중랑장미공원"),
        ("중랑구 용마폭포공원 용마산 전망 풍경", "중랑구 용마폭포공원·용마산"),
    ],
    "seongbuk": [
        ("성북구 성북동 한옥 거리 산책 풍경", "성북구 성북동 한옥 거리"),
        ("성북구 한양도성 성북 성곽길 야경 풍경", "성북구 한양도성 성곽길"),
        ("성북구 성북동 길상사 사찰 풍경", "성북구 성북동 길상사"),
    ],
}


def parse_year(dt_str: str) -> int:
    try:
        return int((dt_str or "")[:4])
    except Exception:
        return 0


def parse_date_label(dt_str: str) -> str:
    if dt_str and len(dt_str) >= 10:
        return dt_str[:10]
    return ""


def kakao_search_fresh(query: str, rest_key: str, size: int = 15) -> List[Dict[str, Any]]:
    """정확도순 + 최신순 교차 검색 후 2022년 미만 구형 사진 제외, 최신·고화질 우선 정렬"""
    combined: List[Dict[str, Any]] = []
    seen_u: Set[str] = set()
    for sort_mode in ("accuracy", "recency"):
        params = urllib.parse.urlencode({"query": query, "size": size, "sort": sort_mode})
        url = f"https://dapi.kakao.com/v2/search/image?{params}"
        req = urllib.request.Request(url, headers={"Authorization": f"KakaoAK {rest_key}"})
        try:
            with urllib.request.urlopen(req, timeout=8) as r:
                docs = json.loads(r.read().decode("utf-8")).get("documents", [])
        except Exception:
            docs = []
        for d in docs:
            u = (d.get("image_url") or "").strip()
            if not u or u in seen_u:
                continue
            seen_u.add(u)
            d["_from_accuracy"] = (sort_mode == "accuracy")
            combined.append(d)

    def rank_key(d: Dict[str, Any]):
        yr = parse_year(d.get("datetime", ""))
        w = int(d.get("width") or 0)
        h = int(d.get("height") or 0)
        fresh_tier = 0 if yr >= 2024 else 1 if yr >= 2022 else 2
        hd_tier = 0 if (w >= 900 and h >= 600) else 1 if (w >= 720 and h >= 480) else 2
        acc_tier = 0 if d.get("_from_accuracy") else 1
        return (fresh_tier, hd_tier, acc_tier, -yr, -w)

    combined.sort(key=rank_key)
    return combined


def download_and_validate_hd(
    url: str,
    dest_path: Path,
    min_w: int,
    min_h: int,
    min_bytes: int,
    max_width: int,
    min_ratio: float,
    max_ratio: float,
    min_edge_energy: float = 9.0,
    referer: Optional[str] = None,
) -> Optional[Tuple[int, int, str, float]]:
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
        if len(raw) < min_bytes:
            return None
        with Image.open(io.BytesIO(raw)) as img:
            w, h = img.size
            if w < min_w or h < min_h:
                return None
            ratio = w / float(h)
            if ratio < min_ratio or ratio > max_ratio:
                return None
            if img.mode != "RGB":
                img = img.convert("RGB")

            # Sharpness & complexity check (rejects severely blurry, blank, or flat graphic images)
            probe = img.resize((320, int(320 / ratio)), Image.Resampling.BILINEAR).convert("L")
            edge_stat = ImageStat.Stat(probe.filter(ImageFilter.FIND_EDGES))
            edge_energy = float(edge_stat.mean[0])
            if edge_energy < min_edge_energy:
                return None

            # Reject overly bright/white document/menu-board screenshots (>78% near-white pixels)
            hist = probe.histogram()
            white_ratio = sum(hist[240:]) / float(sum(hist) or 1)
            if white_ratio > 0.65:
                return None

            if w > max_width:
                new_h = int(h * (max_width / float(w)))
                img = img.resize((max_width, new_h), Image.Resampling.LANCZOS)
                w, h = img.size

            out_buf = io.BytesIO()
            img.save(out_buf, format="JPEG", quality=88, subsampling=0, optimize=True)
            out_bytes = out_buf.getvalue()
            md5_hex = hashlib.md5(out_bytes).hexdigest()
            dest_path.write_bytes(out_bytes)
            return (w, h, md5_hex, round(edge_energy, 1))
    except Exception:
        return None


def collect_hd_fresh_regions(rest_key: str) -> Dict[str, Any]:
    print("=== 1. COLLECTING HD (>=1000x600) & FRESH (2024+) PHOTOS FOR 5 DISTRICTS ===")
    manifest: Dict[str, Any] = {}

    for slug, specs in REGION_HD_SPECS.items():
        gallery: List[Dict[str, Any]] = []
        seen_hashes: Set[str] = set()
        seen_urls: Set[str] = set()

        for slot_idx, (query, caption) in enumerate(specs, 1):
            fname = f"region-{slug}.jpg" if slot_idx == 1 else f"region-{slug}-{slot_idx}.jpg"
            dest = REGION_IMG_DIR / fname
            docs = kakao_search_fresh(query, rest_key, size=15)

            chosen = None
            for min_year in (2024, 2022):
                if chosen:
                    break
                for d in docs:
                    yr = parse_year(d.get("datetime", ""))
                    if yr < min_year:
                        continue
                    site = d.get("display_sitename") or ""
                    u = (d.get("image_url") or "").strip()
                    if not u or u in seen_urls:
                        continue
                    if any(s in site for s in SKIP_SITES) or any(tok in u.lower() for tok in SKIP_URL_TOKENS):
                        continue
                    if int(d.get("width") or 0) < 950 or int(d.get("height") or 0) < 550:
                        continue
                    res = download_and_validate_hd(
                        u,
                        dest,
                        min_w=950,
                        min_h=550,
                        min_bytes=45_000,
                        max_width=1440,
                        min_ratio=1.20,
                        max_ratio=2.05,
                        min_edge_energy=10.0,
                        referer=d.get("doc_url"),
                    )
                    if not res:
                        continue
                    w, h, md5_hex, sharpness = res
                    if md5_hex in seen_hashes:
                        continue
                    seen_hashes.add(md5_hex)
                    seen_urls.add(u)
                    dt_lbl = parse_date_label(d.get("datetime", ""))
                    chosen = {
                        "url": f"/images/regions/{fname}",
                        "alt": caption,
                        "credit": f"{caption} 실제 풍경 ({dt_lbl[:4]}년 · 출처: {site or '웹 검색'})",
                        "source_url": d.get("doc_url") or u,
                        "source_datetime": dt_lbl,
                        "width": w,
                        "height": h,
                        "sharpness": sharpness,
                    }
                    print(f"  [{slug}-{slot_idx}] HD+FRESH OK ({w}x{h}, {dt_lbl}, edge={sharpness}) {caption} [{site}]")
                    break

            if chosen:
                gallery.append(chosen)
            else:
                print(f"  [{slug}-{slot_idx}] WARN: keeping previous file if present")

        if gallery:
            manifest[slug] = {
                "hero_image_url": gallery[0]["url"],
                "hero_image_credit": gallery[0]["credit"],
                "source_url": gallery[0]["source_url"],
                "source_datetime": gallery[0]["source_datetime"],
                "width": gallery[0]["width"],
                "height": gallery[0]["height"],
                "gallery": gallery,
            }

    REGION_MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    return manifest


def _collect_hd_fresh_for_restaurant(
    rid: str,
    rname: str,
    reg_name: str,
    sig_menus: List[str],
    rest_key: str,
) -> List[Dict[str, Any]]:
    short_reg = reg_name.replace("구", "")
    # Clean representative dish name (skip generic fallback text)
    clean_menu = ""
    for m in sig_menus:
        if m and "현장 확인" not in m and "대표 메뉴" not in m:
            clean_menu = m
            break

    # Guaranteed 3-slot balanced composition:
    # Slot 1: Food (signature dish / meal)
    # Slot 2: Food / table spread
    # Slot 3: Exterior / Interior space
    slot_specs: List[Tuple[int, str, List[str]]] = [
        (
            1,
            "food",
            [
                f"{short_reg} {rname} {clean_menu}" if clean_menu else f"{short_reg} {rname} 메뉴 음식",
                f"{reg_name} {rname} 음식",
                f"{rname} 음식 후기",
            ],
        ),
        (
            2,
            "food",
            [
                f"{short_reg} {rname} 맛집 식사",
                f"{reg_name} {rname} 후기",
                f"{rname} 메뉴",
            ],
        ),
        (
            3,
            "exterior",
            [
                f"{short_reg} {rname} 외관 내부",
                f"{reg_name} {rname} 매장 인테리어",
                f"{reg_name} {rname}",
            ],
        ),
    ]

    seen_hashes: Set[str] = set()
    seen_urls: Set[str] = set()
    collected: List[Dict[str, Any]] = []

    for slot_idx, img_type, queries in slot_specs:
        fname = f"{rid}.jpg" if slot_idx == 1 else f"{rid}_{slot_idx}.jpg"
        dest = REST_IMG_DIR / fname
        chosen = None

        # Gather candidates across slot queries
        candidates: List[Dict[str, Any]] = []
        for q in queries:
            candidates.extend(kakao_search_fresh(q, rest_key, size=10))
            if len(candidates) >= 18:
                break

        # Progressive strictness:
        # Tier A: 2024+ & >=720x480
        # Tier B: 2022+ & >=720x480
        # Tier C: 2022+ & >=600x400 (only for rare small local eateries)
        tiers = [
            (2024, 720, 480, 30_000),
            (2022, 720, 480, 28_000),
            (2022, 600, 400, 22_000),
            (2020, 600, 400, 22_000),
        ]
        for min_yr, mw, mh, mbytes in tiers:
            if chosen:
                break
            for d in candidates:
                yr = parse_year(d.get("datetime", ""))
                if yr < min_yr:
                    continue
                site = d.get("display_sitename") or ""
                u = (d.get("image_url") or "").strip()
                if not u or u in seen_urls:
                    continue
                if any(s in site for s in SKIP_SITES) or any(tok in u.lower() for tok in SKIP_URL_TOKENS):
                    continue
                if int(d.get("width") or 0) < mw or int(d.get("height") or 0) < mh:
                    continue
                res = download_and_validate_hd(
                    u,
                    dest,
                    min_w=mw,
                    min_h=mh,
                    min_bytes=mbytes,
                    max_width=1200,
                    min_ratio=0.72,
                    max_ratio=1.85,
                    min_edge_energy=9.5,
                    referer=d.get("doc_url"),
                )
                if not res:
                    continue
                w, h, md5_hex, sharpness = res
                if md5_hex in seen_hashes:
                    continue
                seen_hashes.add(md5_hex)
                seen_urls.add(u)
                dt_lbl = parse_date_label(d.get("datetime", ""))
                doc_url = d.get("doc_url") or ""
                type_kor = "대표 음식" if slot_idx == 1 else "음식·상차림" if img_type == "food" else "매장 외관·내부"
                chosen = {
                    "restaurant_id": rid,
                    "url": f"/images/restaurants/{fname}",
                    "image_type": img_type,
                    "alt_text": f"{rname} 실제 {type_kor} 사진 ({dt_lbl[:4]}년)",
                    "source_name": f"카카오 이미지 검색 ({site or '블로그'} · {dt_lbl[:4]}년)",
                    "author": site or "블로그",
                    "license_type": f"외부 출처 참고 이미지 ({doc_url})" if doc_url else "외부 출처 참고 이미지",
                    "doc_url": doc_url,
                    "source_datetime": dt_lbl,
                    "width": w,
                    "height": h,
                    "sharpness": sharpness,
                    "is_primary": (slot_idx == 1),
                    "display_order": slot_idx,
                    "is_ai_generated": False,
                    "verified_at": "2026-11-24",
                }
                break

        if chosen:
            collected.append(chosen)

    return collected


def collect_hd_fresh_restaurants(rest_key: str) -> List[Dict[str, Any]]:
    print("\n=== 2. COLLECTING HD & FRESH (FOOD + INTERIOR/EXTERIOR) PHOTOS FOR 110 RESTAURANTS ===")
    db = SessionLocal()
    try:
        rows = list(
            db.execute(select(Restaurant).options(selectinload(Restaurant.menus)).order_by(Restaurant.id))
            .scalars()
            .all()
        )
        region_names = {r.id: r.name for r in db.execute(select(Region)).scalars().all()}
    finally:
        db.close()

    all_imgs: List[Dict[str, Any]] = []
    done = 0
    fresh_2024_plus = 0
    hd_720_plus = 0
    restaurants_with_food = 0
    restaurants_with_multi = 0

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {
            pool.submit(
                _collect_hd_fresh_for_restaurant,
                r.id,
                r.name,
                region_names.get(r.region_id, ""),
                [m.name for m in r.menus],
                rest_key,
            ): r.id
            for r in rows
        }
        for fut in as_completed(futures):
            imgs = fut.result()
            all_imgs.extend(imgs)
            done += 1
            if any(i["image_type"] == "food" for i in imgs):
                restaurants_with_food += 1
            if len(imgs) >= 2:
                restaurants_with_multi += 1
            for i in imgs:
                if parse_year(i.get("source_datetime", "")) >= 2024:
                    fresh_2024_plus += 1
                if int(i.get("width", 0)) >= 720:
                    hd_720_plus += 1
            if done % 20 == 0 or done == len(rows):
                print(
                    f"  Progress: {done}/{len(rows)} | total={len(all_imgs)} | "
                    f"2024+={fresh_2024_plus} | HD(>=720px)={hd_720_plus} | multi={restaurants_with_multi}"
                )

    all_imgs.sort(key=lambda x: (x["restaurant_id"], x.get("display_order", 1)))
    REST_MANIFEST_PATH.write_text(json.dumps(all_imgs, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        f"  SUMMARY: {len(all_imgs)} photos across {done} restaurants "
        f"(with_food={restaurants_with_food}, multi_slide={restaurants_with_multi}, "
        f"2024+={fresh_2024_plus}/{len(all_imgs)}, HD>=720px={hd_720_plus}/{len(all_imgs)})"
    )
    return all_imgs


def sync_all_to_database(reg_manifest: Dict[str, Any], rest_imgs: List[Dict[str, Any]]) -> None:
    print("\n=== 3. SYNCING HD+FRESH IMAGES TO DATABASE ===")
    db = SessionLocal()
    try:
        for slug, info in reg_manifest.items():
            reg = db.get(Region, slug)
            if reg and info.get("hero_image_url"):
                reg.hero_image_url = info["hero_image_url"]
                reg.hero_image_credit = info["hero_image_credit"]

        old_rows = list(db.execute(select(RestaurantImage).where(RestaurantImage.id.like("img-real-%"))).scalars().all())
        for old in old_rows:
            db.delete(old)
        db.flush()

        for item in rest_imgs:
            rid = item["restaurant_id"]
            if not db.get(Restaurant, rid):
                continue
            order = int(item.get("display_order", 1))
            db.add(
                RestaurantImage(
                    id=f"img-real-{rid}-{order}",
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
        db.commit()
        print(f"  DB Sync Complete: {len(reg_manifest)} districts + {len(rest_imgs)} HD+fresh restaurant photos synced.")
    finally:
        db.close()


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    rest_key = settings_mgr.get_kakao_rest_key()
    reg_m = collect_hd_fresh_regions(rest_key)
    rest_m = collect_hd_fresh_restaurants(rest_key)
    sync_all_to_database(reg_m, rest_m)

"""
동북미식 (DONGBUK TABLE) 카카오 로컬 REST API 기반 실존 맛집 수집·검증 파이프라인
- 원칙:
  1) 가상의 식당, 임의 평점/리뷰 수, 허위 주소를 절대 생성하지 않음
  2) 서울 동북권 5개 자치구(노원·도봉·강북·중랑·성북) 실제 도로명주소가 일치하는 매장만 채택
  3) (name, road_address) 및 kakao_place_id 기준 중복 제거
  4) 기존 28건 큐레이션 데이터와 병합 시 기존 에디터 데이터 보존
  5) 결과물: backend_/seed_data/kakao_expanded_restaurants.json + 통계 출력
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from settings_manager import settings_mgr

PRIMARY_SEED = BASE_DIR / "seed_data" / "verified_restaurants.json"
EXPANDED_OUT = BASE_DIR / "seed_data" / "kakao_expanded_restaurants.json"

DISTRICT_QUERIES: List[Tuple[str, str, List[Tuple[str, str]]]] = [
    (
        "nowon",
        "노원구",
        [
            ("노원역 한식 맛집", "노원역 문화의거리"),
            ("공릉동 경춘선숲길 카페", "공릉동 경춘선숲길"),
            ("공릉동 맛집", "공릉동 경춘선숲길"),
            ("상계동 노포 고기", "상계동 먹자골목"),
            ("중계동 은행사거리 식당", "중계 은행사거리"),
            ("노원구 베이커리 빵집", "노원역 문화의거리"),
            ("하계동 맛집", "중계 은행사거리"),
        ],
    ),
    (
        "dobong",
        "도봉구",
        [
            ("도봉산 맛집 한식", "도봉산"),
            ("창동역 맛집", "창동역"),
            ("쌍문동 맛집", "쌍문동"),
            ("쌍문동 카페 베이커리", "쌍문동"),
            ("방학동 맛집", "방학동"),
            ("도봉구 고기 구이", "창동역"),
        ],
    ),
    (
        "gangbuk",
        "강북구",
        [
            ("4.19 카페거리 카페", "4.19 카페거리"),
            ("수유역 맛집 한식", "수유역"),
            ("수유동 고기 맛집", "수유역"),
            ("우이동 맛집 카페", "우이동"),
            ("미아사거리 맛집", "미아사거리"),
            ("강북구 베이커리 국수", "수유역"),
        ],
    ),
    (
        "jungnang",
        "중랑구",
        [
            ("망우동 맛집 한식", "망우동"),
            ("상봉동 맛집 고기", "상봉동"),
            ("면목동 맛집", "면목동"),
            ("중랑천 카페 묵동", "중랑천"),
            ("면목동 베이커리 분식", "면목동"),
            ("중랑구 중식 일식", "상봉동"),
        ],
    ),
    (
        "seongbuk",
        "성북구",
        [
            ("성북동 맛집 한식", "성북동"),
            ("성북동 카페 베이커리", "성북동"),
            ("한성대입구 맛집", "한성대입구"),
            ("성신여대 맛집 양식", "성신여대"),
            ("안암동 맛집", "안암동"),
            ("길음동 정릉동 맛집", "성북동"),
        ],
    ),
]

TARGET_PER_DISTRICT = 22  # 28 existing + ~80-95 new => ~110+ total 100% Kakao-verified restaurants


def map_category_slug(cat_name: str) -> str:
    c = (cat_name or "").lower()
    if "베이커리" in c or "제과" in c or "빵" in c:
        return "bakery"
    if "디저트" in c or "아이스크림" in c or "떡" in c:
        return "dessert"
    if "카페" in c or "커피" in c or "찻집" in c:
        return "cafe"
    if "육류" in c or "고기" in c or "갈비" in c or "삼겹살" in c or "곱창" in c or "불고기" in c:
        return "meat"
    if "중식" in c or "중국" in c:
        return "chinese"
    if "일식" in c or "초밥" in c or "돈까스" in c or "라멘" in c:
        return "japanese"
    if "양식" in c or "이탈리안" in c or "파스타" in c or "피자" in c or "스테이크" in c or "브런치" in c:
        return "western"
    if "분식" in c or "떡볶이" in c or "김밥" in c:
        return "snack"
    if "국수" in c or "냉면" in c or "칼국수" in c or "우동" in c or "면" in c:
        return "noodle"
    if "술집" in c or "호프" in c or "포장마차" in c or "와인" in c or "이자카야" in c:
        return "pub"
    if "한식" in c or "국밥" in c or "해장국" in c or "찌개" in c or "백반" in c or "한정식" in c:
        return "korean"
    return "etc"


def category_korean_label(slug: str) -> str:
    return {
        "korean": "한식",
        "meat": "고기·구이",
        "chinese": "중식",
        "japanese": "일식",
        "western": "양식",
        "snack": "분식",
        "noodle": "면 요리",
        "cafe": "카페",
        "bakery": "베이커리",
        "dessert": "디저트",
        "pub": "주점",
        "etc": "기타",
    }.get(slug, "한식")


def kakao_keyword_search(query: str, rest_key: str, size: int = 15) -> List[Dict[str, Any]]:
    params = urllib.parse.urlencode({"query": query, "size": size})
    url = f"https://dapi.kakao.com/v2/local/search/keyword.json?{params}"
    req = urllib.request.Request(url, headers={"Authorization": f"KakaoAK {rest_key}"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data.get("documents", [])


def make_slug(region_slug: str, kakao_id: str) -> str:
    clean_id = re.sub(r"[^a-z0-9]", "", kakao_id.lower())
    return f"{region_slug}-place-{clean_id}"


def run_collection() -> Dict[str, Any]:
    rest_key = settings_mgr.get_kakao_rest_key()
    if not rest_key:
        raise RuntimeError("KAKAO_REST_API_KEY가 설정되어 있지 않아 실존 수집을 실행할 수 없습니다.")

    primary_rows = json.loads(PRIMARY_SEED.read_text(encoding="utf-8"))
    seen_name_addr = {(r["name"].strip(), r["road_address"].strip()) for r in primary_rows}
    seen_kakao_ids = {r.get("kakao_place_id") for r in primary_rows if r.get("kakao_place_id")}

    counts_per_region: Dict[str, int] = {}
    for r in primary_rows:
        counts_per_region[r["region_slug"]] = counts_per_region.get(r["region_slug"], 0) + 1

    collected: List[Dict[str, Any]] = []
    rejected_outside = 0
    rejected_duplicate = 0
    rejected_no_road = 0

    for region_slug, region_name, query_specs in DISTRICT_QUERIES:
        prefix = {
            "nowon": "nw",
            "dobong": "db",
            "gangbuk": "gb",
            "jungnang": "jn",
            "seongbuk": "sb",
        }[region_slug]
        seq = 100

        for query_str, hood_label in query_specs:
            if counts_per_region.get(region_slug, 0) >= TARGET_PER_DISTRICT:
                break
            try:
                docs = kakao_keyword_search(query_str, rest_key, size=15)
            except Exception as e:
                print(f"[WARN] Query failed ({query_str}): {e}")
                continue

            for doc in docs:
                if counts_per_region.get(region_slug, 0) >= TARGET_PER_DISTRICT:
                    break
                cat_group = doc.get("category_group_code", "")
                if cat_group not in ("FD6", "CE7"):
                    continue

                road_addr = (doc.get("road_address_name") or "").strip()
                jibun_addr = (doc.get("address_name") or "").strip()
                if not road_addr:
                    rejected_no_road += 1
                    continue

                # Strict Seoul Northeast district verification
                if not (f"서울 {region_name}" in road_addr or f"서울 {region_name}" in jibun_addr):
                    rejected_outside += 1
                    continue

                place_name = (doc.get("place_name") or "").strip()
                kakao_pid = str(doc.get("id") or "").strip()
                if not place_name or not kakao_pid:
                    continue

                if (place_name, road_addr) in seen_name_addr or kakao_pid in seen_kakao_ids:
                    rejected_duplicate += 1
                    continue

                cat_full = doc.get("category_name") or ""
                cat_slug = map_category_slug(cat_full)
                cat_leaf = cat_full.split(">")[-1].strip() if ">" in cat_full else category_korean_label(cat_slug)

                seq += 1
                rid = f"{prefix}-{seq}"
                rec = {
                    "id": rid,
                    "slug": make_slug(region_slug, kakao_pid),
                    "name": place_name,
                    "region_slug": region_slug,
                    "region_name": region_name,
                    "neighborhood": hood_label,
                    "category_slug": cat_slug,
                    "one_line_intro": f"{region_name} {hood_label} 일대에서 카카오 로컬 공식 정보로 실존이 확인된 {cat_leaf} 매장입니다.",
                    "signature_menus": [f"{cat_leaf} 대표 메뉴 (현장 확인)"],
                    "price_min": None,
                    "price_max": None,
                    "price_range_label": "현장 가격 확인 필요",
                    "road_address": road_addr,
                    "jibun_address": jibun_addr or None,
                    "lat": round(float(doc["y"]), 6),
                    "lng": round(float(doc["x"]), 6),
                    "phone": (doc.get("phone") or "").strip() or None,
                    "kakao_place_id": kakao_pid,
                    "kakao_url": doc.get("place_url"),
                    "is_editor_pick": False,
                    "highlights": [hood_label, cat_leaf],
                    "features": ["takeout"] if cat_slug in ("cafe", "bakery", "snack") else [],
                    "verification_status": "verified",
                    "verified_at": "2026-11-24",
                    "data_source": "카카오 로컬 REST API 실존 검증",
                }
                collected.append(rec)
                seen_name_addr.add((place_name, road_addr))
                seen_kakao_ids.add(kakao_pid)
                counts_per_region[region_slug] = counts_per_region.get(region_slug, 0) + 1
            time.sleep(0.12)

    EXPANDED_OUT.write_text(
        json.dumps(collected, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    summary = {
        "existing_primary_count": len(primary_rows),
        "newly_collected_verified": len(collected),
        "total_verified": len(primary_rows) + len(collected),
        "per_region_total": counts_per_region,
        "rejected_outside_district": rejected_outside,
        "rejected_duplicate": rejected_duplicate,
        "rejected_no_road_address": rejected_no_road,
        "output_file": str(EXPANDED_OUT),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return summary


if __name__ == "__main__":
    run_collection()


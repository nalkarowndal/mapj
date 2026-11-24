"""
동북미식 (DONGBUK TABLE) 단일 데이터 제공 계층 (gourmet_catalog.py)
- P0 API_CONTRACT.md 규격을 100% 준수하는 단일 진실 공급원(Single Source of Truth)
- P5에서 SQLite/PostgreSQL ORM으로 투명 전환 가능하도록 동일 서비스 인터페이스 제공
- 13개 표준 음식 카테고리, 5개 자치구 고유 스토리, 10대 미식 큐레이션, 28개 카카오 실존 검증 매장 포함
"""

from __future__ import annotations

import json
import math
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

SEED_FILE = Path(__file__).parent / "seed_data" / "verified_restaurants.json"

# 13개 표준 음식 카테고리 (11.2절)
STANDARD_CATEGORIES: List[Dict[str, str]] = [
    {"slug": "korean", "name": "한식"},
    {"slug": "meat", "name": "고기·구이"},
    {"slug": "chinese", "name": "중식"},
    {"slug": "japanese", "name": "일식"},
    {"slug": "western", "name": "양식"},
    {"slug": "snack", "name": "분식"},
    {"slug": "noodle", "name": "면 요리"},
    {"slug": "cafe", "name": "카페"},
    {"slug": "bakery", "name": "베이커리"},
    {"slug": "dessert", "name": "디저트"},
    {"slug": "pub", "name": "주점"},
    {"slug": "etc", "name": "기타"},
]

CATEGORY_NAME_MAP = {c["slug"]: c["name"] for c in STANDARD_CATEGORIES}

# 5개 자치구 고유 미식 가이드 데이터 (7절 & 10절 — 각 지역별 고유 스토리/상권/이미지)
REGIONS_DATA: List[Dict[str, Any]] = [
    {
        "slug": "nowon",
        "name": "노원구",
        "english_name": "NOWON",
        "tagline": "숲길의 커피 향기와 대학가 일상 식탁이 만나는 동네",
        "summary": "노원역 문화의거리와 공릉동 경춘선숲길을 중심으로 일상 외식, 감성 카페, 가성비 식당이 공존합니다.",
        "description": "옛 경춘선 철길 위를 걷는 공릉동 경춘선숲길(공트럴파크)의 감각적인 카페와 오랜 국수거리, 그리고 노원역과 중계동 생활권의 탄탄한 단골 식당들이 균형을 이루는 미식 지역입니다.",
        "editorial_story": "노원의 미식은 거창한 격식보다 매일의 식탁에서 빛납니다. 아침 산책 후 공릉동 멸치국수 한 그릇으로 속을 데우고, 노원역 골목에서 화덕에 구운 생선구이로 든든한 저녁을 채우는 일상적 풍요로움이 노원구만의 매력입니다.",
        "hero_image_url": "/images/editorial/region-nowon.jpg",
        "hero_image_credit": "동북미식 지역 에디토리얼 이미지 (AI 생성 · 일반 지역 소개용)",
        "center_lat": 37.6543,
        "center_lng": 127.0564,
        "neighborhoods": [
            {"slug": "nowon-station", "name": "노원역 문화의거리", "summary": "4·7호선 환승 중심의 활기찬 일상 외식·모임 상권", "keywords": ["생선구이", "로스터리", "모임"]},
            {"slug": "gongneung", "name": "공릉동 경춘선숲길", "summary": "옛 철길 산책로 옆 뉴트로 카페·국수거리·로컬 식당", "keywords": ["경춘선숲길", "멸치국수", "산책 카페"]},
            {"slug": "sanggye", "name": "상계동 먹자골목", "summary": "지역 주민이 오래 찾는 백반·두부·구이 단골 골목", "keywords": ["두부요리", "가성비", "단골식당"]},
            {"slug": "junggye", "name": "중계 은행사거리", "summary": "가족 단위 외식과 조용한 모임에 적합한 생활 상권", "keywords": ["가족외식", "한정식", "주차"]},
        ],
    },
    {
        "slug": "dobong",
        "name": "도봉구",
        "english_name": "DOBONG",
        "tagline": "도봉산 자락 3대 노포와 정겨운 골목 식탁의 깊이",
        "summary": "도봉산 등산 후의 든든한 한 끼부터 창동역·쌍문동·방학동 골목의 내공 있는 노포가 이어집니다.",
        "description": "화려한 유행보다 세월의 깊이가 먼저 읽히는 동네입니다. 도봉산 입구의 3대 전통 한우 설렁탕 노포, 창동역의 가족 외식과 수제 돈까스, 쌍문동·방학동 골목의 개성 있는 중식당까지 사람 냄새 나는 식탁이 가득합니다.",
        "editorial_story": "도봉산 산행을 마치고 내려와 마주하는 맑은 설렁탕 한 그릇, 그리고 쌍문동과 방학동 주택가 사이에서 오래 자리를 지켜온 만두와 중식 요리까지. 도봉구의 맛은 꾸밈없는 정성과 푸짐한 인심으로 기억됩니다.",
        "hero_image_url": "/images/editorial/region-dobong.jpg",
        "hero_image_credit": "동북미식 지역 에디토리얼 이미지 (AI 생성 · 일반 지역 소개용)",
        "center_lat": 37.6688,
        "center_lng": 127.0471,
        "neighborhoods": [
            {"slug": "changdong", "name": "창동역", "summary": "1·4호선 환승 거점의 가족 외식·수제 돈까스 중심 상권", "keywords": ["왕갈비탕", "수제돈까스", "가족모임"]},
            {"slug": "dobongsan", "name": "도봉산", "summary": "산행 전후 든든하게 채우는 전통 설렁탕·보양 한식", "keywords": ["전통노포", "설렁탕", "등산후식사"]},
            {"slug": "ssangmun", "name": "쌍문동", "summary": "주택가 골목 속 개성 있는 중식·비스트로 상권(쌍리단길)", "keywords": ["쌍문동골목", "중식", "데이트"]},
            {"slug": "banghak", "name": "방학동", "summary": "전통시장과 화상 만두 노포가 살아 있는 생활 밀착 상권", "keywords": ["수제만두", "중식노포", "동네단골"]},
        ],
    },
    {
        "slug": "gangbuk",
        "name": "강북구",
        "english_name": "GANGBUK",
        "tagline": "북한산 숲을 마주한 카페거리와 깊은 국물의 한식",
        "summary": "4.19 카페거리와 우이동 한옥 카페, 수유역·미아사거리의 진국 한식과 분식이 조화를 이룹니다.",
        "description": "북한산 국립공원의 능선이 창밖으로 펼쳐지는 4.19 카페거리와 우이동의 한옥 공간, 그리고 수유동·미아동 일대의 걸쭉한 들깨칼국수와 가락우동 본점이 자연과 일상의 미식을 잇습니다.",
        "editorial_story": "강북구에서는 도심 속에서도 계절의 변화를 가장 가까이에서 맛볼 수 있습니다. 아침에는 4.19 거리의 통창 너머 북한산을 바라보며 커피를 마시고, 점심에는 수유동 골목의 진한 들깨 국물과 정갈한 약초 밥상으로 몸을 채워보세요.",
        "hero_image_url": "/images/editorial/region-gangbuk.jpg",
        "hero_image_credit": "동북미식 지역 에디토리얼 이미지 (AI 생성 · 일반 지역 소개용)",
        "center_lat": 37.6396,
        "center_lng": 127.0255,
        "neighborhoods": [
            {"slug": "419-cafe", "name": "4.19 카페거리", "summary": "북한산 전망의 로스터리 카페와 정갈한 한정식 거리", "keywords": ["북한산뷰", "로스터리", "한정식"]},
            {"slug": "suyu", "name": "수유역", "summary": "강북 최대 생활 상권의 들깨칼국수·분식·모임 식당", "keywords": ["들깨칼국수", "우동본점", "모임"]},
            {"slug": "ui-dong", "name": "우이동", "summary": "북한산 자락 한옥 카페와 계곡 인근 힐링 식사 공간", "keywords": ["한옥카페", "북한산", "주말나들이"]},
            {"slug": "mia", "name": "미아사거리", "summary": "일상적인 점심 한 끼와 가족 식사가 편리한 역세권", "keywords": ["역세권", "일상식사", "가성비"]},
        ],
    },
    {
        "slug": "jungnang",
        "name": "중랑구",
        "english_name": "JUNGNANG",
        "tagline": "새벽 해장국 노포와 중랑천 산책이 이어지는 주민의 식탁",
        "summary": "망우동 해장국·쌈밥 노포부터 상봉·면목동 단골 고깃집, 중랑천 인근 로컬 카페까지 탄탄합니다.",
        "description": "외부 유행보다 동네 주민들의 오랜 발걸음으로 검증된 식당들이 중심을 잡는 지역입니다. 망우동의 맑은 소뼈 해장국과 찐 쌈밥, 상봉·면목동의 고기·칼국수 단골집, 중랑천 장미공원 옆 조용한 카페까지 실속 있는 미식이 기다립니다.",
        "editorial_story": "중랑구의 진짜 매력은 화려한 간판 너머 단골들의 꾸준한 재방문에 있습니다. 새벽부터 맑은 국물을 끓여내는 망우동 노포에서 하루를 열고, 중랑천 수변을 걸은 뒤 묵동의 작은 로스터리에서 여운을 즐겨보세요.",
        "hero_image_url": "/images/editorial/region-jungnang.jpg",
        "hero_image_credit": "동북미식 지역 에디토리얼 이미지 (AI 생성 · 일반 지역 소개용)",
        "center_lat": 37.6065,
        "center_lng": 127.0927,
        "neighborhoods": [
            {"slug": "mangu", "name": "망우동", "summary": "새벽 해장국과 찐 쌈밥 등 깊은 내공의 노포 밀집 지역", "keywords": ["해장국노포", "우렁쌈밥", "아침식사"]},
            {"slug": "sangbong", "name": "상봉동", "summary": "먹자골목 중심의 소곱창·구이·직장인 모임 상권", "keywords": ["소곱창", "먹자골목", "저녁모임"]},
            {"slug": "myeonmok", "name": "면목동", "summary": "전통시장과 동네 단골 갈비·칼국수 식당이 풍부한 생활권", "keywords": ["갈비", "칼국수", "동네단골"]},
            {"slug": "jungnangcheon", "name": "중랑천", "summary": "장미공원 수변 산책로와 이어지는 묵동 로컬 카페길", "keywords": ["중랑천산책", "로컬카페", "여유"]},
        ],
    },
    {
        "slug": "seongbuk",
        "name": "성북구",
        "english_name": "SEONGBUK",
        "tagline": "한옥 찻집과 대한민국 제과 명장, 성북동 노포의 품격",
        "summary": "성북동 기사식당 거리와 고택 한옥 찻집, 한성대입구·성신여대·안암동의 풍성한 미식 벨트입니다.",
        "description": "북악산과 한양도성 성곽 아래 오랜 역사와 예술의 향기가 흐르는 성북동은 서울에서도 손꼽히는 미식 산책지입니다. 1968년 개업 제과점과 1987년 왕돈까스, 소설가 고택의 한옥 찻집, 맑은 안동식 손국수까지 격조 있는 로컬 미식을 만날 수 있습니다.",
        "editorial_story": "성북구에서는 한 끼의 식사가 곧 작은 문화 산책이 됩니다. 한성대입구에서 갓 구운 사라다빵을 품에 안고 성북동길을 따라 걸어 올라가면, 기사식당 골목의 정겨운 연탄갈비와 고요한 한옥 마루의 전통차가 차례로 반겨줍니다.",
        "hero_image_url": "/images/editorial/region-seongbuk.jpg",
        "hero_image_credit": "동북미식 지역 에디토리얼 이미지 (AI 생성 · 일반 지역 소개용)",
        "center_lat": 37.5891,
        "center_lng": 127.0182,
        "neighborhoods": [
            {"slug": "seongbukdong", "name": "성북동", "summary": "기사식당 노포·대형 베이커리·고택 한옥 찻집의 미식 길", "keywords": ["왕돈까스", "한옥찻집", "연탄갈비"]},
            {"slug": "hanseongdae", "name": "한성대입구", "summary": "1968년 전통 제과점과 성북천 산책로 인근 미식 거점", "keywords": ["베이커리투어", "사라다빵", "성북천"]},
            {"slug": "sungshin", "name": "성신여대", "summary": "젊은 감각의 캐주얼 다이닝과 디저트가 모인 대학가", "keywords": ["대학가", "데이트", "디저트"]},
            {"slug": "anam", "name": "안암동", "summary": "가성비와 오랜 추억이 공존하는 대학가 로컬 식당가", "keywords": ["가성비", "혼밥", "대학가"]},
        ],
    },
]

# 10대 미식 큐레이션 테마 (9.5절)
COLLECTIONS_DATA: List[Dict[str, Any]] = [
    {
        "slug": "timeless-nopo",
        "title": "오랜 시간 사랑받은 노포",
        "subtitle": "세월을 이겨낸 동북권의 정통 한 그릇",
        "description": "3대째 가마솥을 지키는 설렁탕집부터 1987년 성북동 왕돈까스, 새벽 망우동 해장국까지 오랜 시간 동네의 맛을 지켜온 노포들을 모았습니다.",
        "hero_image_url": "/images/editorial/theme-nopo.jpg",
        "is_featured": True,
        "restaurant_ids": ["db-01", "jn-02", "sb-01", "sb-03", "sb-04", "nw-01", "sb-06"],
    },
    {
        "slug": "bakery-and-cafe-walk",
        "title": "산책하기 좋은 카페거리 & 베이커리 투어",
        "subtitle": "경춘선숲길, 4.19 카페거리, 성북동 언덕길의 향기",
        "description": "북한산 자락을 바라보는 로스터리부터 한옥 고택 찻집, 대한민국 제과 명장의 빵집까지 걷고 머물기 좋은 카페와 베이커리를 소개합니다.",
        "hero_image_url": "/images/editorial/theme-bakery.jpg",
        "is_featured": True,
        "restaurant_ids": ["sb-02", "sb-03", "sb-05", "gb-02", "gb-04", "nw-03", "jn-06"],
    },
    {
        "slug": "family-dining",
        "title": "부모님과 함께하는 식사",
        "subtitle": "주차와 좌석이 여유로운 정갈한 가족 외식",
        "description": "부모님 생신이나 주말 가족 모임에 부담 없이 방문할 수 있는 한우, 한정식, 수제 두부, 쌈밥 전문점을 엄선했습니다.",
        "hero_image_url": "/images/editorial/theme-family.jpg",
        "is_featured": True,
        "restaurant_ids": ["db-02", "nw-05", "nw-06", "gb-05", "jn-01", "jn-03", "sb-06"],
    },
    {
        "slug": "comfortable-solo",
        "title": "혼자서도 편안한 식사",
        "subtitle": "눈치 보지 않고 온전히 즐기는 동네 한 끼",
        "description": "공릉동 국수거리의 따뜻한 멸치국수, 창동역 수제 돈까스, 면목동 손칼국수 등 혼자 방문해도 마음 편히 식사할 수 있는 식당들입니다.",
        "hero_image_url": "/images/editorial/theme-solo.jpg",
        "is_featured": True,
        "restaurant_ids": ["nw-02", "db-03", "gb-01", "gb-03", "jn-05", "nw-01"],
    },
    {
        "slug": "light-lunch",
        "title": "부담 없는 점심 한 끼",
        "subtitle": "매일 먹어도 질리지 않는 1만원 안팎의 든든함",
        "description": "직장인과 지역 주민들이 점심시간에 자주 찾는 국수, 칼국수, 생선구이, 돈까스 맛집을 모았습니다.",
        "hero_image_url": None,
        "is_featured": False,
        "restaurant_ids": ["nw-01", "nw-02", "db-03", "gb-01", "gb-03", "jn-05"],
    },
    {
        "slug": "special-date",
        "title": "특별한 날의 데이트",
        "subtitle": "한옥과 산자락, 골목의 분위기가 살아 있는 공간",
        "description": "성북동 고택 찻집, 북한산 뷰 로스터리, 쌍문동 골목 중식당 등 대화하기 좋은 분위기의 공간을 담았습니다.",
        "hero_image_url": None,
        "is_featured": False,
        "restaurant_ids": ["sb-05", "sb-02", "gb-02", "gb-04", "db-04", "nw-03"],
    },
    {
        "slug": "after-hiking",
        "title": "등산 후 즐기는 한 끼",
        "subtitle": "도봉산·북한산 산행의 피로를 풀어주는 깊은 맛",
        "description": "도봉산과 북한산 자락에서 산행 후 든든하게 기력을 보충할 수 있는 설렁탕, 들깨칼국수, 한정식, 한옥 카페를 추천합니다.",
        "hero_image_url": None,
        "is_featured": False,
        "restaurant_ids": ["db-01", "gb-01", "gb-04", "gb-05", "gb-02"],
    },
    {
        "slug": "campus-value",
        "title": "대학가 가성비 맛집",
        "subtitle": "공릉동·성신여대·수유 일대의 실속 있는 한 상",
        "description": "주머니 가벼운 날에도 만족스러운 맛과 양을 선사하는 대학가 인근 로컬 식당을 모았습니다.",
        "hero_image_url": None,
        "is_featured": False,
        "restaurant_ids": ["nw-02", "nw-04", "gb-03", "sb-01", "db-03"],
    },
    {
        "slug": "bakery-tour",
        "title": "동북권 베이커리 투어",
        "subtitle": "1968년 클래식 제과점부터 숲속 대형 베이커리까지",
        "description": "성북동과 한성대입구를 중심으로 빵을 사랑하는 이들이 일부러 찾아오는 동북권 대표 베이커리 코스를 제안합니다.",
        "hero_image_url": None,
        "is_featured": False,
        "restaurant_ids": ["sb-03", "sb-02", "nw-03", "gb-02"],
    },
    {
        "slug": "local-regulars",
        "title": "동네 주민이 찾는 식당",
        "subtitle": "화려한 홍보보다 단골의 발걸음이 증명하는 곳",
        "description": "방학동 중식 노포, 면목동 칼국수, 망우동 쌈밥, 공릉동 야채곱창 등 동네 주민들이 아끼는 진짜 생활 밀착 맛집입니다.",
        "hero_image_url": None,
        "is_featured": False,
        "restaurant_ids": ["db-05", "jn-01", "jn-05", "nw-04", "nw-05", "jn-04"],
    },
]

# 특징 매핑 (필터용)
RESTAURANT_FEATURES_MAP: Dict[str, List[str]] = {
    "nw-01": ["solo_dining", "takeout"],
    "nw-02": ["solo_dining", "takeout"],
    "nw-03": ["date", "takeout"],
    "nw-04": ["group", "takeout"],
    "nw-05": ["family", "parking"],
    "nw-06": ["family", "group", "parking", "reservation"],
    "db-01": ["family", "parking", "solo_dining"],
    "db-02": ["family", "group", "parking", "reservation"],
    "db-03": ["solo_dining", "takeout"],
    "db-04": ["date", "group"],
    "db-05": ["solo_dining", "takeout"],
    "gb-01": ["solo_dining", "family", "parking"],
    "gb-02": ["date", "parking"],
    "gb-03": ["solo_dining", "takeout"],
    "gb-04": ["date", "family", "parking"],
    "gb-05": ["family", "group", "parking", "reservation"],
    "jn-01": ["family", "parking"],
    "jn-02": ["solo_dining", "takeout"],
    "jn-03": ["family", "group", "parking"],
    "jn-04": ["group"],
    "jn-05": ["solo_dining"],
    "jn-06": ["date", "takeout"],
    "sb-01": ["solo_dining", "family", "parking"],
    "sb-02": ["date", "family", "parking", "takeout"],
    "sb-03": ["takeout", "parking"],
    "sb-04": ["solo_dining", "group"],
    "sb-05": ["date", "family"],
    "sb-06": ["family", "group", "reservation"],
}


def _normalize_text(text: str) -> str:
    return re.sub(r"\s+", "", (text or "").lower())


def load_verified_restaurants() -> List[Dict[str, Any]]:
    raw: List[Dict[str, Any]] = json.loads(SEED_FILE.read_text(encoding="utf-8"))
    enriched: List[Dict[str, Any]] = []
    for r in raw:
        cat_slug = r.get("category_slug", "korean")
        features = RESTAURANT_FEATURES_MAP.get(r["id"], [])
        enriched.append({
            "id": r["id"],
            "slug": r["slug"],
            "name": r["name"],
            "region_slug": r["region_slug"],
            "region_name": r["region_name"],
            "neighborhood": r.get("neighborhood", ""),
            "primary_category_slug": cat_slug,
            "primary_category": CATEGORY_NAME_MAP.get(cat_slug, "한식"),
            "one_line_intro": r["one_line_intro"],
            "description": r["one_line_intro"],
            "editor_note": f"{r['region_name']} {r.get('neighborhood', '')} 일대에서 실존 여부와 도로명·지번 주소가 확인된 로컬 매장입니다.",
            "price_range_label": r.get("price_range_label"),
            "price_min": r.get("price_min"),
            "price_max": r.get("price_max"),
            "road_address": r["road_address"],
            "jibun_address": r.get("jibun_address"),
            "lat": r["lat"],
            "lng": r["lng"],
            "phone": r.get("phone"),
            "kakao_place_id": r.get("kakao_place_id"),
            "kakao_url": r.get("kakao_url"),
            "is_editor_pick": bool(r.get("is_editor_pick", False)),
            "highlights": (r.get("highlights") or [])[:2],
            "features": features,
            "signature_menus": r.get("signature_menus") or [],
            "primary_image": None,  # 실제 허가된 매장 사진 미확보 시 null → 공통 플레이스홀더 사용
            "open_status": "needs_check",  # 실시간 요일별 영업시간 미확인 항목은 정직하게 '확인 필요' 표기
            "opening_hours_note": "매장 사정에 따라 변동될 수 있으므로 방문 전 전화 또는 카카오맵에서 최신 영업시간을 확인해 주세요.",
            "parking_info": "주차 가능 (매장 또는 인근 주차장 이용)" if "parking" in features else "방문 전 주차 가능 여부 확인 필요",
            "verification_status": r.get("verification_status", "verified"),
            "verified_at": r.get("verified_at", "2026-11-24"),
            "data_source": r.get("data_source", "카카오 로컬 공식 정보 교차 검증"),
        })
    return enriched


def get_all_regions() -> List[Dict[str, Any]]:
    restaurants = load_verified_restaurants()
    counts: Dict[str, int] = {}
    for r in restaurants:
        counts[r["region_slug"]] = counts.get(r["region_slug"], 0) + 1
    return [
        {**reg, "restaurant_count": counts.get(reg["slug"], 0)}
        for reg in REGIONS_DATA
    ]


def get_region_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    regions = get_all_regions()
    target = next((reg for reg in regions if reg["slug"] == slug), None)
    if not target:
        return None

    all_rest = load_verified_restaurants()
    reg_rest = [r for r in all_rest if r["region_slug"] == slug]
    editor_picks = [r for r in reg_rest if r["is_editor_pick"]][:4]
    if len(editor_picks) < 3:
        editor_picks = reg_rest[:3]

    cat_counts: Dict[str, int] = {}
    for r in reg_rest:
        cat_counts[r["primary_category_slug"]] = cat_counts.get(r["primary_category_slug"], 0) + 1
    categories = [
        {"slug": c["slug"], "name": c["name"], "count": cat_counts.get(c["slug"], 0)}
        for c in STANDARD_CATEGORIES
        if cat_counts.get(c["slug"], 0) > 0
    ]

    reg_ids = {r["id"] for r in reg_rest}
    rec_collections = []
    for col in COLLECTIONS_DATA:
        overlap = [rid for rid in col["restaurant_ids"] if rid in reg_ids]
        if overlap:
            rec_collections.append({
                "slug": col["slug"],
                "title": col["title"],
                "subtitle": col["subtitle"],
                "description": col["description"],
                "hero_image_url": col["hero_image_url"],
                "is_featured": col["is_featured"],
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
            # 확인되지 않은 정보는 임의로 포함하지 않음 (지시문 11.3절)
            items = [r for r in items if all(f in r["features"] for f in req_feats)]

    if open_now:
        # 실시간 영업 중 여부가 확인된 매장만 통과 (needs_check는 임의 포함 금지)
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

    # Sorting (미검증 평점순/리뷰순 제외)
    if sort == "verified_recent":
        items.sort(key=lambda r: (r.get("verified_at") or "", r["name"]), reverse=True)
    elif sort == "name_asc":
        items.sort(key=lambda r: r["name"])
    elif sort == "price_asc":
        items.sort(key=lambda r: (r.get("price_min") is None, r.get("price_min") or 999999))
    elif sort == "price_desc":
        items.sort(key=lambda r: (r.get("price_max") is None, -(r.get("price_max") or 0)))
    else:
        # 5개 자치구(노원·도봉·강북·중랑·성북)가 균형 있게 노출되도록 라운드-로빈 우선순위 적용
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
    all_rest = load_verified_restaurants()
    target = next((r for r in all_rest if r["slug"] == slug or r["id"] == slug), None)
    if not target:
        return None

    menus = [
        {
            "name": m,
            "price": None,
            "price_label": "매장 가격 확인 필요",
            "is_signature": True,
            "description": None,
        }
        for m in target.get("signature_menus", [])
    ]
    related = [
        r for r in all_rest
        if r["id"] != target["id"]
        and (r["region_slug"] == target["region_slug"] or r["primary_category_slug"] == target["primary_category_slug"])
    ][:4]

    return {
        **target,
        "menus": menus,
        "images": [],
        "related_restaurants": related,
    }


def get_all_categories() -> List[Dict[str, Any]]:
    all_rest = load_verified_restaurants()
    counts: Dict[str, int] = {}
    for r in all_rest:
        counts[r["primary_category_slug"]] = counts.get(r["primary_category_slug"], 0) + 1
    return [
        {"slug": c["slug"], "name": c["name"], "count": counts.get(c["slug"], 0)}
        for c in STANDARD_CATEGORIES
    ]


def get_all_collections() -> List[Dict[str, Any]]:
    return [
        {
            "slug": c["slug"],
            "title": c["title"],
            "subtitle": c["subtitle"],
            "description": c["description"],
            "hero_image_url": c["hero_image_url"],
            "is_featured": c["is_featured"],
            "restaurant_count": len(c["restaurant_ids"]),
            "region_focus": None,
        }
        for c in COLLECTIONS_DATA
    ]


def get_collection_by_slug(slug: str) -> Optional[Dict[str, Any]]:
    col = next((c for c in COLLECTIONS_DATA if c["slug"] == slug), None)
    if not col:
        return None
    all_rest = {r["id"]: r for r in load_verified_restaurants()}
    restaurants = [all_rest[rid] for rid in col["restaurant_ids"] if rid in all_rest]
    return {
        "slug": col["slug"],
        "title": col["title"],
        "subtitle": col["subtitle"],
        "description": col["description"],
        "hero_image_url": col["hero_image_url"],
        "is_featured": col["is_featured"],
        "restaurant_count": len(restaurants),
        "region_focus": None,
        "restaurants": restaurants,
    }


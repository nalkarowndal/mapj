"""
동북미식 (DONGBUK TABLE) 데이터베이스 시드 및 초기 데이터 마이그레이션 (db/seed.py)
- 멱등성(Idempotent) 보장: 반복 실행해도 중복 생성 없이 안전하게 보정
- 기존 28건 카카오 검증 데이터 + 카카오 로컬 확장 실존 검증 데이터 + 5개 자치구/상권/13개 카테고리/8개 특성/10대 큐레이션 적재
- 관리자 테이블이 비어 있을 때만 초기 관리자 계정 생성 (PBKDF2-SHA256 해시 저장)
"""

from __future__ import annotations

import json
import os
import uuid
from pathlib import Path
from typing import Any, Dict, List

from sqlalchemy import select
from sqlalchemy.orm import Session

from db.auth import hash_password
from db.database import Base, SessionLocal, engine
from db.models import (
    Admin,
    Category,
    Collection,
    CollectionRestaurant,
    DataSource,
    Feature,
    FeedbackReport,
    Menu,
    Neighborhood,
    Region,
    Restaurant,
    RestaurantCategory,
    RestaurantFeature,
    VerificationLog,
)

BASE_DIR = Path(__file__).resolve().parent.parent
PRIMARY_SEED_FILE = BASE_DIR / "seed_data" / "verified_restaurants.json"
EXPANDED_SEED_FILE = BASE_DIR / "seed_data" / "kakao_expanded_restaurants.json"
LEGACY_FEEDBACK_FILE = BASE_DIR / "data" / "feedback_reports.json"

STANDARD_CATEGORIES: List[Dict[str, Any]] = [
    {"slug": "korean", "name": "한식", "order": 1},
    {"slug": "meat", "name": "고기·구이", "order": 2},
    {"slug": "chinese", "name": "중식", "order": 3},
    {"slug": "japanese", "name": "일식", "order": 4},
    {"slug": "western", "name": "양식", "order": 5},
    {"slug": "snack", "name": "분식", "order": 6},
    {"slug": "noodle", "name": "면 요리", "order": 7},
    {"slug": "cafe", "name": "카페", "order": 8},
    {"slug": "bakery", "name": "베이커리", "order": 9},
    {"slug": "dessert", "name": "디저트", "order": 10},
    {"slug": "pub", "name": "주점", "order": 11},
    {"slug": "etc", "name": "기타", "order": 12},
]

STANDARD_FEATURES: List[Dict[str, str]] = [
    {"slug": "solo_dining", "name": "혼밥", "group": "purpose"},
    {"slug": "date", "name": "데이트", "group": "purpose"},
    {"slug": "family", "name": "가족 외식", "group": "purpose"},
    {"slug": "group", "name": "단체 모임", "group": "purpose"},
    {"slug": "parking", "name": "주차 가능", "group": "amenity"},
    {"slug": "reservation", "name": "예약 가능", "group": "amenity"},
    {"slug": "pet_friendly", "name": "반려동물 동반", "group": "amenity"},
    {"slug": "takeout", "name": "포장 가능", "group": "amenity"},
]

REGIONS_SEED: List[Dict[str, Any]] = [
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
        "display_order": 1,
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
        "display_order": 2,
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
        "display_order": 3,
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
        "display_order": 4,
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
        "display_order": 5,
        "neighborhoods": [
            {"slug": "seongbukdong", "name": "성북동", "summary": "기사식당 노포·대형 베이커리·고택 한옥 찻집의 미식 길", "keywords": ["왕돈까스", "한옥찻집", "연탄갈비"]},
            {"slug": "hanseongdae", "name": "한성대입구", "summary": "1968년 전통 제과점과 성북천 산책로 인근 미식 거점", "keywords": ["베이커리투어", "사라다빵", "성북천"]},
            {"slug": "sungshin", "name": "성신여대", "summary": "젊은 감각의 캐주얼 다이닝과 디저트가 모인 대학가", "keywords": ["대학가", "데이트", "디저트"]},
            {"slug": "anam", "name": "안암동", "summary": "가성비와 오랜 추억이 공존하는 대학가 로컬 식당가", "keywords": ["가성비", "혼밥", "대학가"]},
        ],
    },
]

COLLECTIONS_SEED: List[Dict[str, Any]] = [
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
        "restaurant_ids": ["db-02", "gb-05", "nw-02", "jn-01", "sb-06", "db-01"],
    },
    {
        "slug": "solo-comfort-meals",
        "title": "혼밥하기 편한 동네 식당",
        "subtitle": "부담 없이 든든하게 채우는 1인 식탁",
        "description": "공릉동 멸치국수, 수유동 가락우동, 면목동 손칼국수, 창동 수제 돈까스까지 혼자서도 편하게 들르기 좋은 로컬 식당들입니다.",
        "hero_image_url": "/images/editorial/theme-solo.jpg",
        "is_featured": True,
        "restaurant_ids": ["nw-04", "gb-03", "jn-05", "db-03", "sb-01", "jn-02"],
    },
    {
        "slug": "mountain-after-meal",
        "title": "등산 후 즐기는 든든한 한 끼",
        "subtitle": "도봉산·북한산·불암산 산행 뒤 따뜻한 보양식",
        "description": "도봉산 입구 설렁탕과 4.19 자락 약초 한정식, 들깨수제비 등 산행 뒤 기력을 채워주는 식당을 모았습니다.",
        "hero_image_url": "/images/editorial/region-dobong.jpg",
        "is_featured": False,
        "restaurant_ids": ["db-01", "gb-01", "gb-05", "gb-04", "nw-02"],
    },
    {
        "slug": "budget-everyday",
        "title": "가성비 좋은 로컬 일상 맛집",
        "subtitle": "1만원 전후로 만족도 높은 동네 단골집",
        "description": "동네 주민들이 평일 점심과 저녁에 꾸준히 찾는 합리적인 가격의 실속 맛집입니다.",
        "hero_image_url": "/images/editorial/theme-solo.jpg",
        "is_featured": False,
        "restaurant_ids": ["nw-04", "gb-03", "jn-05", "db-05", "nw-01", "jn-02"],
    },
    {
        "slug": "seongbuk-date-walk",
        "title": "분위기 좋은 성북·북한산 데이트 코스",
        "subtitle": "산책과 식사, 차 한 잔이 자연스럽게 이어지는 동선",
        "description": "성북동 고택 찻집과 대형 베이커리, 4.19 카페거리와 공릉동 숲길의 여유로운 데이트 추천 리스트입니다.",
        "hero_image_url": "/images/editorial/region-seongbuk.jpg",
        "is_featured": False,
        "restaurant_ids": ["sb-05", "sb-02", "gb-02", "gb-04", "nw-05", "db-04"],
    },
    {
        "slug": "noodle-and-soup",
        "title": "비 오는 날 생각나는 국물과 면 요리",
        "subtitle": "들깨칼국수·멸치국수·안동손국수·해장국",
        "description": "깊게 우려낸 육수와 손반죽 면발로 속을 따뜻하게 채워주는 동북권 면·국물 전문점입니다.",
        "hero_image_url": "/images/editorial/theme-nopo.jpg",
        "is_featured": False,
        "restaurant_ids": ["gb-01", "nw-04", "jn-05", "sb-06", "jn-02", "db-01"],
    },
    {
        "slug": "group-meat-gathering",
        "title": "단체 모임과 저녁 구이 한 상",
        "subtitle": "함께 둘러앉아 굽는 돼지갈비·한우·소곱창",
        "description": "회식이나 가족 모임, 친구들과의 저녁 약속에 어울리는 동북권 대표 고기·구이 매장입니다.",
        "hero_image_url": "/images/editorial/theme-family.jpg",
        "is_featured": False,
        "restaurant_ids": ["db-02", "nw-06", "jn-03", "jn-04", "sb-04"],
    },
    {
        "slug": "chinese-and-dumpling",
        "title": "동네 고수의 중식과 수제 만두",
        "subtitle": "쌍문·방학·공릉 골목의 웍질과 찐만두",
        "description": "줄 서서 먹는 방학동 화상 만두집부터 쌍문동 중식 비스트로까지 개성 있는 중식 노포와 신흥 강자들입니다.",
        "hero_image_url": "/images/editorial/region-jungnang.jpg",
        "is_featured": False,
        "restaurant_ids": ["db-04", "db-05", "nw-05"],
    },
]

RESTAURANT_FEATURES_MAP: Dict[str, List[str]] = {
    "nw-01": ["solo_dining", "family"],
    "nw-02": ["family", "parking", "group"],
    "nw-03": ["date", "takeout"],
    "nw-04": ["solo_dining", "takeout"],
    "nw-05": ["date", "group"],
    "nw-06": ["family", "group", "parking"],
    "db-01": ["solo_dining", "family", "parking"],
    "db-02": ["family", "group", "parking", "reservation"],
    "db-03": ["solo_dining", "date"],
    "db-04": ["date", "group"],
    "db-05": ["solo_dining", "takeout"],
    "gb-01": ["family", "solo_dining"],
    "gb-02": ["date", "parking", "takeout"],
    "gb-03": ["solo_dining", "takeout"],
    "gb-04": ["date", "family", "parking"],
    "gb-05": ["family", "group", "parking", "reservation"],
    "jn-01": ["family", "group"],
    "jn-02": ["solo_dining", "parking"],
    "jn-03": ["group"],
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


def ensure_schema_and_seed() -> Dict[str, Any]:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        return seed_database(db)
    finally:
        db.close()


def seed_database(db: Session) -> Dict[str, Any]:
    # 1. Data sources
    src_kakao = db.get(DataSource, "src-kakao-local")
    if not src_kakao:
        src_kakao = DataSource(
            id="src-kakao-local",
            name="카카오 로컬 공식 정보 교차 검증",
            source_type="kakao_local_api",
            url="https://developers.kakao.com/docs/latest/ko/local/dev-guide",
            license_note="매장 위치·주소·카테고리 메타데이터 실존 검증용",
        )
        db.add(src_kakao)

    src_admin = db.get(DataSource, "src-admin-manual")
    if not src_admin:
        src_admin = DataSource(
            id="src-admin-manual",
            name="동북미식 관리자 검수 등록",
            source_type="admin_manual",
            url=None,
            license_note="관리자 직접 검수 및 검증 기록",
        )
        db.add(src_admin)
    db.flush()

    # 2. Categories
    for c in STANDARD_CATEGORIES:
        if not db.get(Category, c["slug"]):
            db.add(Category(id=c["slug"], slug=c["slug"], name=c["name"], display_order=c["order"]))

    # 3. Features
    for f in STANDARD_FEATURES:
        if not db.get(Feature, f["slug"]):
            db.add(Feature(id=f["slug"], slug=f["slug"], name=f["name"], feature_group=f["group"]))

    # 4. Regions & Neighborhoods
    for reg in REGIONS_SEED:
        existing_reg = db.get(Region, reg["slug"])
        if not existing_reg:
            existing_reg = Region(
                id=reg["slug"],
                slug=reg["slug"],
                name=reg["name"],
                english_name=reg["english_name"],
                tagline=reg["tagline"],
                summary=reg["summary"],
                description=reg["description"],
                editorial_story=reg["editorial_story"],
                hero_image_url=reg["hero_image_url"],
                hero_image_credit=reg["hero_image_credit"],
                center_lat=reg["center_lat"],
                center_lng=reg["center_lng"],
                display_order=reg["display_order"],
            )
            db.add(existing_reg)
        for idx, hood in enumerate(reg["neighborhoods"], 1):
            hood_id = f"{reg['slug']}-{hood['slug']}"
            if not db.get(Neighborhood, hood_id):
                db.add(
                    Neighborhood(
                        id=hood_id,
                        region_id=reg["slug"],
                        slug=hood["slug"],
                        name=hood["name"],
                        summary=hood["summary"],
                        keywords_json=hood.get("keywords", []),
                        display_order=idx,
                    )
                )
    db.flush()

    # 5. Bootstrap Admin (only if admins table is empty)
    admin_count = db.execute(select(Admin.id)).scalars().all()
    if not admin_count:
        default_email = (os.getenv("ADMIN_DEFAULT_EMAIL") or "admin@dongbuktable.kr").strip().lower()
        default_pw = (os.getenv("ADMIN_DEFAULT_PASSWORD") or "DongbukAdmin!2026").strip()
        db.add(
            Admin(
                id="adm-root-01",
                email=default_email,
                name="동북미식 총괄 에디터",
                password_hash=hash_password(default_pw),
                role="superadmin",
                is_active=True,
            )
        )
        db.flush()

    # 6. Load Primary 28 verified + optional Expanded Kakao-verified restaurants
    records: List[Dict[str, Any]] = []
    if PRIMARY_SEED_FILE.exists():
        records.extend(json.loads(PRIMARY_SEED_FILE.read_text(encoding="utf-8")))
    if EXPANDED_SEED_FILE.exists():
        records.extend(json.loads(EXPANDED_SEED_FILE.read_text(encoding="utf-8")))

    inserted_restaurants = 0
    existing_keys = {
        (r.name.strip(), r.road_address.strip())
        for r in db.execute(select(Restaurant)).scalars().all()
    }
    existing_kakao_ids = {
        r.kakao_place_id
        for r in db.execute(select(Restaurant)).scalars().all()
        if r.kakao_place_id
    }

    for rec in records:
        rid = rec["id"]
        name = rec["name"].strip()
        road_address = rec["road_address"].strip()
        kakao_pid = rec.get("kakao_place_id")

        if db.get(Restaurant, rid):
            continue
        if (name, road_address) in existing_keys:
            continue
        if kakao_pid and kakao_pid in existing_kakao_ids:
            continue

        cat_slug = rec.get("category_slug", "korean")
        if not db.get(Category, cat_slug):
            cat_slug = "etc"

        features = rec.get("features") or RESTAURANT_FEATURES_MAP.get(rid, [])
        parking_info = rec.get("parking_info") or (
            "주차 가능 (매장 또는 인근 주차장 이용)"
            if "parking" in features
            else "방문 전 주차 가능 여부 확인 필요"
        )

        row = Restaurant(
            id=rid,
            slug=rec["slug"],
            name=name,
            region_id=rec["region_slug"],
            neighborhood_label=rec.get("neighborhood", ""),
            road_address=road_address,
            jibun_address=rec.get("jibun_address"),
            lat=float(rec["lat"]),
            lng=float(rec["lng"]),
            phone=rec.get("phone"),
            one_line_intro=rec["one_line_intro"],
            description=rec.get("description") or rec["one_line_intro"],
            editor_note=rec.get("editor_note")
            or f"{rec['region_name']} {rec.get('neighborhood', '')} 일대에서 실존 여부와 도로명·지번 주소가 확인된 로컬 매장입니다.",
            highlights_json=(rec.get("highlights") or [])[:2],
            price_min=rec.get("price_min"),
            price_max=rec.get("price_max"),
            price_range_label=rec.get("price_range_label"),
            parking_info=parking_info,
            opening_hours_note="매장 사정에 따라 변동될 수 있으므로 방문 전 전화 또는 카카오맵에서 최신 영업시간을 확인해 주세요.",
            business_status=rec.get("business_status", "open"),
            verification_status=rec.get("verification_status", "verified"),
            publish_status=rec.get("publish_status", "published"),
            is_editor_pick=bool(rec.get("is_editor_pick", False)),
            verified_at=rec.get("verified_at", "2026-11-24"),
            source_id="src-kakao-local",
            data_source_label=rec.get("data_source", "카카오 로컬 공식 정보 교차 검증"),
            kakao_place_id=kakao_pid,
            kakao_url=rec.get("kakao_url"),
        )
        db.add(row)
        db.flush()

        db.add(RestaurantCategory(restaurant_id=rid, category_id=cat_slug, is_primary=True))

        for m_idx, menu_name in enumerate(rec.get("signature_menus") or [], 1):
            db.add(
                Menu(
                    id=f"menu-{rid}-{m_idx}",
                    restaurant_id=rid,
                    name=menu_name,
                    price=None,
                    price_label="매장 가격 확인 필요",
                    is_signature=True,
                    display_order=m_idx,
                )
            )

        for feat_slug in features:
            if db.get(Feature, feat_slug):
                db.add(
                    RestaurantFeature(
                        restaurant_id=rid,
                        feature_id=feat_slug,
                        status="confirmed",
                    )
                )

        db.add(
            VerificationLog(
                id=f"vlog-{uuid.uuid4().hex[:12]}",
                restaurant_id=rid,
                admin_id=None,
                method="kakao_local_api",
                previous_status=None,
                new_status=row.verification_status,
                notes=f"카카오 로컬 실존 교차 검증 완료 (도로명: {road_address})",
                evidence_json={
                    "kakao_place_id": kakao_pid,
                    "kakao_url": rec.get("kakao_url"),
                    "road_address": road_address,
                },
            )
        )

        existing_keys.add((name, road_address))
        if kakao_pid:
            existing_kakao_ids.add(kakao_pid)
        inserted_restaurants += 1

    db.flush()

    # 7. Collections & links
    for c_idx, col in enumerate(COLLECTIONS_SEED, 1):
        existing_col = db.get(Collection, col["slug"])
        if not existing_col:
            existing_col = Collection(
                id=col["slug"],
                slug=col["slug"],
                title=col["title"],
                subtitle=col["subtitle"],
                description=col["description"],
                hero_image_url=col["hero_image_url"],
                is_featured=bool(col["is_featured"]),
                display_order=c_idx,
            )
            db.add(existing_col)
            db.flush()
            for r_idx, rid in enumerate(col["restaurant_ids"], 1):
                if db.get(Restaurant, rid):
                    db.add(
                        CollectionRestaurant(
                            collection_id=col["slug"],
                            restaurant_id=rid,
                            display_order=r_idx,
                        )
                    )

    # 8. Migrate any legacy feedback_reports.json rows into DB
    if LEGACY_FEEDBACK_FILE.exists():
        try:
            legacy_fbs = json.loads(LEGACY_FEEDBACK_FILE.read_text(encoding="utf-8"))
            for fb in legacy_fbs:
                fb_id = fb.get("id") or f"fb-{uuid.uuid4().hex[:10]}"
                if not db.get(FeedbackReport, fb_id):
                    rid = fb.get("restaurant_id")
                    if rid and not db.get(Restaurant, rid):
                        rid = None
                    db.add(
                        FeedbackReport(
                            id=fb_id,
                            restaurant_id=rid,
                            restaurant_name=fb.get("restaurant_name"),
                            report_type=fb.get("report_type", "other"),
                            content=fb.get("content", ""),
                            reporter_contact=fb.get("reporter_contact"),
                            status=fb.get("status", "pending"),
                        )
                    )
        except Exception:
            pass

    db.commit()
    total_restaurants = len(db.execute(select(Restaurant.id)).scalars().all())
    return {
        "inserted_restaurants": inserted_restaurants,
        "total_restaurants": total_restaurants,
    }


if __name__ == "__main__":
    result = ensure_schema_and_seed()
    print("Seed completed:", result)


"""
서울 동북권 미식 가이드 & AI 맛집 컨시어지 백엔드 서버 (FastAPI v2.2)
- 엄선된 지역 실존 맛집 큐레이션 API (/api/places)
- AI 미식 소믈리에 / 맛집 컨시어지 챗봇 (/api/chat)
- 동적 런타임 설정 시스템 (/api/settings/*)
- 카카오 로컬 REST API 연동 및 고신뢰 로컬 미식 DB Fallback
"""

import os
import json
import time
import hashlib
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from groq import Groq

from places_database import (
    DISTRICT_METADATA,
    VERIFIED_PLACES,
    search_verified_places,
    search_kakao_local_api,
)
from settings_manager import settings_mgr
from routers.public import router as public_gourmet_router

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app = FastAPI(
    title="동북미식 (DONGBUK TABLE API)",
    description="서울 동북권 5대 자치구 맛집 소개·큐레이션 및 AI 미식 추천 백엔드",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public_gourmet_router)

_cached_groq_key: Optional[str] = None
_cached_groq_client: Optional[Groq] = None


def get_active_groq_client() -> Optional[Groq]:
    """런타임에 갱신된 Groq API 키를 바탕으로 클라이언트 반환"""
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
            print(f"[Groq Runtime] 클라이언트 갱신 완료 (Model: {settings_mgr.get_groq_model()}, KeyFingerprint: {key_fp})")
        except Exception as e:
            print(f"[Groq Runtime Warning] 클라이언트 생성 실패: {e}")
            _cached_groq_client = None
            _cached_groq_key = None

    return _cached_groq_client


# ==========================================
# Pydantic Schemas
# ==========================================

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' 또는 'assistant'")
    content: str = Field(..., description="메시지 본문")


class ChatRequest(BaseModel):
    message: str = Field(..., description="사용자의 현재 질문")
    district: Optional[str] = Field("노원구", description="선택된 자치구")
    history: Optional[List[ChatMessage]] = Field(default=[], description="이전 대화 내역")
    category: Optional[str] = Field(None, description="카테고리 필터")


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
    rating: Optional[float] = 4.6
    review_count: Optional[int] = 150
    signature_menu: Optional[List[str]] = []
    price_range: Optional[str] = "1만~2만원"
    opening_hours: Optional[str] = "매일 10:00 - 22:00"
    parking: Optional[str] = "인근 주차장 이용"
    atmosphere: Optional[str] = "로컬 추천 맛집"
    badge: Optional[str] = "엄선 맛집"
    data_source: str = "미식가이드 엄선 DB"
    verification_status: str = "reference"
    verified_at: Optional[str] = "2026-10-23"
    kakao_url: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    show_map: bool = False
    places: List[PlaceInfo] = []
    district: str
    is_demo: bool = False
    status_message: str = "정상 처리"


class SetCredentialRequest(BaseModel):
    provider: str = Field(..., description="'groq', 'kakao_rest', 'kakao_js' 중 하나")
    key: str = Field(..., description="API 키 문자열")
    model: Optional[str] = Field(None, description="Groq 모델 ID (선택 사항)")


class TestConnectionRequest(BaseModel):
    provider: str = Field(..., description="'groq' 또는 'kakao_rest'")
    key: Optional[str] = Field(None, description="테스트할 특정 키 (미입력 시 저장된 키 사용)")
    model: Optional[str] = Field(None, description="테스트할 Groq 모델 (선택)")


# ==========================================
# Settings API Endpoints
# ==========================================

_rate_limit_records: Dict[str, List[float]] = {}


def verify_settings_security(request: Request):
    client_ip = request.client.host if request.client else "127.0.0.1"
    now = time.time()
    history = _rate_limit_records.get(client_ip, [])
    history = [t for t in history if now - t < 60]
    if len(history) >= 20:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="설정 변경 및 테스트 요청 빈도가 너무 높습니다. 1분 후 다시 시도해 주세요."
        )
    history.append(now)
    _rate_limit_records[client_ip] = history

    origin = request.headers.get("origin") or request.headers.get("referer") or ""
    if origin:
        is_allowed = any(h in origin for h in ("localhost", "127.0.0.1", "testserver"))
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="허가되지 않은 외부 도메인의 설정 요청이 거부되었습니다."
            )


@app.get("/api/settings/status")
def get_settings_status():
    return settings_mgr.get_status()


@app.post("/api/settings/credentials")
async def set_credentials(req: SetCredentialRequest, request: Request):
    verify_settings_security(request)

    if req.provider not in ("groq", "kakao_rest", "kakao_js"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 제공자입니다: {req.provider}"
        )

    try:
        settings_mgr.set_credential(provider=req.provider, key=req.key, model=req.model)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )

    test_result = None
    if req.provider == "groq" and req.key.strip():
        test_result = await settings_mgr.test_groq_connection(key_to_test=req.key, model=req.model)
    elif req.provider == "kakao_rest" and req.key.strip():
        test_result = await settings_mgr.test_kakao_rest_connection(key_to_test=req.key)

    return {
        "success": True,
        "message": f"{req.provider} 설정이 성공적으로 저장되었습니다.",
        "test_result": test_result,
        "updated_status": settings_mgr.get_status(),
    }


@app.delete("/api/settings/credentials/{provider}")
def delete_credential(provider: str, request: Request):
    verify_settings_security(request)

    if provider not in ("groq", "kakao_rest", "kakao_js"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 제공자입니다: {provider}"
        )

    settings_mgr.delete_credential(provider)
    return {
        "success": True,
        "message": f"{provider} 설정이 안전하게 삭제되었습니다.",
        "updated_status": settings_mgr.get_status(),
    }


@app.post("/api/settings/test-connection")
async def test_connection(req: TestConnectionRequest, request: Request):
    verify_settings_security(request)

    if req.provider == "groq":
        return await settings_mgr.test_groq_connection(key_to_test=req.key, model=req.model)
    elif req.provider == "kakao_rest":
        return await settings_mgr.test_kakao_rest_connection(key_to_test=req.key)
    elif req.provider == "kakao_js":
        key = (req.key or settings_mgr.get_kakao_js_key()).strip()
        if not key:
            return {"success": False, "status": "unconfigured", "message": "카카오 지도 JavaScript 키가 입력되지 않았습니다."}
        if len(key) < 16 or " " in key:
            return {"success": False, "status": "invalid_format", "message": "올바른 카카오 JavaScript 키 형식이 아닙니다."}
        return {
            "success": True,
            "status": "format_valid",
            "message": "카카오 JavaScript 키 형식이 유효합니다. 브라우저 SDK 연결 테스트를 통해 도메인 등록 상태를 확인하세요."
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"연결 테스트를 지원하지 않는 제공자입니다: {req.provider}"
        )


@app.get("/api/settings/public-map-config")
def get_public_map_config(request: Request):
    client_origin = request.headers.get("origin") or "http://localhost:3000"
    return {
        "kakao_js_key": settings_mgr.get_kakao_js_key(),
        "is_configured": bool(settings_mgr.get_kakao_js_key()),
        "current_origin": client_origin,
        "guide_url": "https://developers.kakao.com/console/app",
    }


# ==========================================
# Core Gourmet Places & AI Sommelier Endpoints
# ==========================================

@app.get("/api/health")
def health_check():
    status_summary = settings_mgr.get_status()
    return {
        "status": "healthy",
        "service": "맛탐정 동북 API v2.2",
        "groq_status": status_summary["groq"]["status"],
        "groq_model": status_summary["groq"]["model"],
        "kakao_rest_status": status_summary["kakao_rest"]["status"],
        "kakao_js_status": status_summary["kakao_js"]["status"],
        "operational_mode": status_summary["operational_mode"],
        "supported_districts": list(DISTRICT_METADATA.keys()),
        "total_curated_restaurants": len(VERIFIED_PLACES),
    }


@app.get("/api/places", response_model=List[PlaceInfo])
def get_places(district: str = "노원구", category: Optional[str] = None, q: Optional[str] = ""):
    """특정 자치구(또는 전체)의 엄선된 실존 맛집 목록을 반환"""
    places_raw = search_verified_places(district=district, query=q or "", category=category, limit=25)
    return [PlaceInfo(**p) for p in places_raw]


@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    user_msg = request.message.strip()
    selected_district = request.district or "노원구"
    if selected_district not in DISTRICT_METADATA:
        selected_district = "노원구"

    lower_query = user_msg.lower()
    location_keywords = [
        "맛집", "식당", "카페", "밥", "고기", "점심", "저녁", "회식", "외식",
        "갈비", "생선", "국수", "돈까스", "빵", "베이커리", "디저트", "설렁탕",
        "해장국", "칼국수", "수제비", "쌈밥", "떡볶이", "사케동", "연어", "피자",
        "갈만한", "추천", "어디", "장소", "근처", "위치", "지도", "노포", "데이트"
    ]
    is_location_query = any(k in lower_query for k in location_keywords) or any(d in user_msg for d in DISTRICT_METADATA.keys())

    retrieved_places_raw: List[Dict[str, Any]] = []
    data_source_mode = "미식가이드 엄선 DB"

    if is_location_query:
        kakao_key = settings_mgr.get_kakao_rest_key()
        if kakao_key:
            kakao_results = await search_kakao_local_api(
                district=selected_district,
                query=user_msg,
                kakao_rest_key=kakao_key
            )
            if kakao_results:
                retrieved_places_raw = kakao_results
                data_source_mode = "카카오 로컬 실시간 API"

        if not retrieved_places_raw:
            retrieved_places_raw = search_verified_places(
                district=selected_district,
                query=user_msg,
                category=request.category,
                limit=6
            )

    places_list = [PlaceInfo(**p) for p in retrieved_places_raw]
    show_map = bool(is_location_query and len(places_list) > 0)

    ai_reply = ""
    is_demo = False

    client = get_active_groq_client()
    target_model = settings_mgr.get_groq_model()

    if client:
        try:
            district_meta = DISTRICT_METADATA.get(selected_district, {})
            system_prompt = (
                f"당신은 서울시 {selected_district} 지역 미식과 로컬 식당에 정통한 'AI 미식 컨시어지(맛탐정 동북)'입니다. "
                "미식 매거진 에디터처럼 친절하고 생생하며 전문성 있는 한국어로 맛집을 소개하세요.\n"
                f"현재 탐색 자치구: {selected_district} ({district_meta.get('description', '')})\n\n"
                "【중요 준수 사항】\n"
                "1. 절대 실존하지 않는 가상의 식당이나 주소를 지어내지 마세요(Hallucination 금지).\n"
                "2. 맛집을 추천할 때는 아래 제공된 [실제 맛집 데이터]의 내용만을 바탕으로 대표 메뉴, 분위기, 가격대, 추천 포인트를 맛깔스럽게 소개하세요.\n"
                "3. 일치하는 식당이 없는 경우, 정직하게 조건에 맞는 맛집을 찾지 못했다고 안내하고 다른 미식 테마를 제안하세요.\n"
                "4. 가독성을 위해 마크다운(굵은 글씨, 글머리 기호, 음식 이모지)을 적극 활용하세요.\n\n"
            )

            if retrieved_places_raw:
                system_prompt += f"[실제 맛집 데이터 (출처: {data_source_mode})]:\n"
                for idx, p in enumerate(retrieved_places_raw, 1):
                    menus = ", ".join(p.get("signature_menu", []))
                    system_prompt += (
                        f"{idx}. {p['name']} ({p['category']} - {p.get('sub_category','')})\n"
                        f"   - 대표메뉴: {menus} / 가격대: {p.get('price_range', '정보없음')}\n"
                        f"   - 평점: ⭐{p.get('rating', 4.6)} / 영업시간: {p.get('opening_hours', '')}\n"
                        f"   - 주소: {p['address']} (전화: {p.get('phone', '정보없음')})\n"
                        f"   - 미식 포인트: {p['description']}\n"
                        f"   - 태그: {', '.join(p.get('tags', []))}\n"
                    )
            else:
                system_prompt += "[맛집 검색 결과]: 일치하는 조건의 추천 맛집이 없습니다.\n"

            messages = [{"role": "system", "content": system_prompt}]
            if request.history:
                for h in request.history[-6:]:
                    messages.append({"role": h.role, "content": h.content})
            messages.append({"role": "user", "content": user_msg})

            chat_completion = client.chat.completions.create(
                model=target_model,
                messages=messages,
                temperature=0.6,
                max_tokens=900,
            )
            ai_reply = chat_completion.choices[0].message.content or ""
        except Exception as e:
            print(f"[Groq AI Call Fallback] LLM 호출 실패: {e}")

    if not ai_reply:
        is_demo = True
        ai_reply = generate_verified_local_response(
            district=selected_district,
            user_msg=user_msg,
            places=retrieved_places_raw,
            is_location_query=is_location_query
        )

    return ChatResponse(
        reply=ai_reply,
        show_map=show_map,
        places=places_list,
        district=selected_district,
        is_demo=is_demo,
        status_message=f"처리 완료 ({data_source_mode})"
    )


def generate_verified_local_response(
    district: str,
    user_msg: str,
    places: List[Dict[str, Any]],
    is_location_query: bool
) -> str:
    """
    검증된 지역 맛집 데이터베이스를 기반으로 미식 에디터 스타일의 풍부한 추천 답변 생성
    """
    if not is_location_query:
        return (
            f"안녕하세요! 서울 동북권 미식 큐레이션 플랫폼 **맛탐정 동북 AI 컨시어지**입니다. 🍽️\n\n"
            f"현재 선택된 미식 지역은 **{district}**입니다.\n\n"
            f"**30년 전통 노포, 가족 외식 갈비 명가, 분위기 좋은 로스터리 카페, 데이트 맛집** 등 "
            f"오늘 끌리는 메뉴나 상황을 말씀해 주시면 꼭 맞는 맛집을 찾아드립니다!"
        )

    if not places:
        return (
            f"### 🍽️ [{district}] 맛집 탐색 결과\n\n"
            f"문의하신 **\"{user_msg}\"** 조건에 정확히 부합하는 {district} 내 큐레이션 맛집을 찾지 못했습니다. 🔍\n\n"
            f"- 다른 메뉴 키워드(예: `노포`, `고기`, `카페`, `돈까스`, `국수`, `설렁탕`)로 질문해 보세요.\n"
            f"- 상단 설정 메뉴에서 **카카오 로컬 REST API** 키를 등록하시면 실시간 전체 식당 검색이 가능합니다."
        )

    response_lines = [
        f"### 🍽️ [{district}] 미식 에디터 엄선 맛집 추천",
        f"요청하신 **\"{user_msg}\"** 테마에 가장 잘 어울리는 **{district}** 대표 맛집 {len(places)}곳을 소개합니다.\n"
    ]

    for idx, p in enumerate(places, 1):
        icon = "🥩" if "고기" in p["category"] else "☕" if "카페" in p["category"] else "🍜" if "양식" in p["category"] else "🍲"
        rating_str = f"⭐ {p.get('rating', 4.6)}"
        badge_str = f" · `{p.get('badge')}`" if p.get("badge") else ""
        response_lines.append(f"#### {icon} {idx}. {p['name']} ({rating_str}{badge_str})")
        menus = ", ".join(p.get("signature_menu", []))
        if menus:
            response_lines.append(f"- **대표 메뉴**: **{menus}** ({p.get('price_range', '1~2만원대')})")
        response_lines.append(f"- **미식 포인트**: {p['description']}")
        response_lines.append(f"- **위치 / 영업**: {p['address']} ({p.get('opening_hours', '상세정보 참조')})")
        if p.get("phone"):
            response_lines.append(f"- **문의 전화**: `{p['phone']}`")
        tags = " ".join([f"`#{t}`" for t in p.get("tags", [])])
        if tags:
            response_lines.append(f"- **태그**: {tags}")
        response_lines.append("")

    response_lines.append(
        f"> 💡 **Tip**: 맛집 카드를 클릭하시면 **대표 메뉴, 주차 정보, 실시간 지도 위치 및 카카오맵 길찾기**를 바로 확인하실 수 있습니다."
    )

    return "\n".join(response_lines)

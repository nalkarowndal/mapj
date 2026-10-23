"""
AI 로컬 어시스턴트 고도화 백엔드 서버 (FastAPI v2.1)
- 동적 런타임 설정 시스템 (/api/settings/*)
- Groq AI (Llama 3.3 / Llama 3.1) 다중 턴 컨텍스트 및 모델 스위칭
- 정밀 실존 장소 RAG 파이프라인 (환각 및 무관 장소 추천 원천 차단)
- 카카오 로컬 REST API 연동 및 고신뢰 로컬 복구 Fallback
- 보안 자격증명 관리 및 공개 설정 분리
"""

import os
import json
import time
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from groq import Groq

from places_database import (
    DISTRICT_METADATA,
    search_verified_places,
    search_kakao_local_api,
)
from settings_manager import settings_mgr

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

app = FastAPI(
    title="AI 로컬 어시스턴트 API",
    description="서울 동북권 5대 자치구 AI 맞춤 추천 및 런타임 설정 관리 백엔드",
    version="2.1.0",
)

# CORS 미들웨어 등록
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 런타임 Groq 클라이언트 캐시
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
            print(f"[Groq Runtime] 클라이언트 갱신 완료 (Key: {current_key[:4]}...{current_key[-4:]})")
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
    history: Optional[List[ChatMessage]] = Field(default=[], description="이전 대화 내역 (다중 턴 컨텍스트)")
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
    data_source: str = "로컬 참고 데이터 (데모)"
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
# Settings API Endpoints (PHASE 4)
# ==========================================

@app.get("/api/settings/status")
def get_settings_status():
    """모든 API 연결 상태 및 마스킹된 설정 요약 조회 (비밀키 원문 절대 미노출)"""
    return settings_mgr.get_status()


@app.post("/api/settings/credentials")
async def set_credentials(req: SetCredentialRequest):
    """API 키 및 모델을 서버에 안전하게 등록/갱신"""
    if req.provider not in ("groq", "kakao_rest", "kakao_js"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"지원하지 않는 제공자입니다: {req.provider}"
        )

    settings_mgr.set_credential(provider=req.provider, key=req.key, model=req.model)

    # Groq인 경우 즉시 연결 테스트 수행
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
def delete_credential(provider: str):
    """지정된 API 키 삭제 및 연결 상태 초기화"""
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
async def test_connection(req: TestConnectionRequest):
    """API 키 유효성 및 네트워크 연결 상태 실시간 진단"""
    if req.provider == "groq":
        return await settings_mgr.test_groq_connection(key_to_test=req.key, model=req.model)
    elif req.provider == "kakao_rest":
        return await settings_mgr.test_kakao_rest_connection(key_to_test=req.key)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"연결 테스트를 지원하지 않는 제공자입니다: {req.provider}"
        )


@app.get("/api/settings/public-map-config")
def get_public_map_config(request: Request):
    """
    브라우저 카카오맵 SDK 로딩에 필요한 공개 설정만 반환
    (서버 전용 비밀키는 절대 반환하지 않음)
    """
    client_origin = request.headers.get("origin") or "http://localhost:3000"
    return {
        "kakao_js_key": settings_mgr.get_kakao_js_key(),
        "is_configured": bool(settings_mgr.get_kakao_js_key()),
        "current_origin": client_origin,
        "guide_url": "https://developers.kakao.com/console/app",
    }


# ==========================================
# Core Chat & Places Endpoints
# ==========================================

@app.get("/api/health")
def health_check():
    """서버 상태 및 외부 연동 가용성 점검"""
    status_summary = settings_mgr.get_status()
    return {
        "status": "healthy",
        "service": "AI 로컬 어시스턴트 API v2.1",
        "groq_status": status_summary["groq"]["status"],
        "groq_model": status_summary["groq"]["model"],
        "kakao_rest_status": status_summary["kakao_rest"]["status"],
        "kakao_js_status": status_summary["kakao_js"]["status"],
        "operational_mode": status_summary["operational_mode"],
        "supported_districts": list(DISTRICT_METADATA.keys()),
    }


@app.get("/api/places", response_model=List[PlaceInfo])
def get_places(district: str = "노원구", category: Optional[str] = None, q: Optional[str] = ""):
    """특정 자치구의 검증된 실존 장소 목록을 반환"""
    places_raw = search_verified_places(district=district, query=q or "", category=category, limit=10)
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
        "학원", "공부", "스터디", "과외", "수학", "영어", "문화", "도서관",
        "공원", "산책", "갈만한", "추천", "어디", "장소", "근처", "위치", "지도"
    ]
    is_location_query = any(k in lower_query for k in location_keywords) or any(d in user_msg for d in DISTRICT_METADATA.keys())

    # 1. 실존 장소 검색 수행
    retrieved_places_raw: List[Dict[str, Any]] = []
    data_source_mode = "로컬 참고 데이터 (데모)"

    if is_location_query:
        # 1-A. 카카오 REST API 키가 등록된 경우 실시간 공인 검색 우선 시도
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

        # 1-B. 카카오 결과가 없거나 키가 없으면 정밀 로컬 데이터베이스 검색
        if not retrieved_places_raw:
            retrieved_places_raw = search_verified_places(
                district=selected_district,
                query=user_msg,
                category=request.category,
                limit=5
            )

    places_list = [PlaceInfo(**p) for p in retrieved_places_raw]
    show_map = bool(is_location_query and len(places_list) > 0)

    # 2. AI 응답 생성
    ai_reply = ""
    is_demo = False

    client = get_active_groq_client()
    target_model = settings_mgr.get_groq_model()

    if client:
        try:
            district_meta = DISTRICT_METADATA.get(selected_district, {})
            system_prompt = (
                f"당신은 서울시 {selected_district} 지역 생활 및 상권에 정통한 'AI 로컬 어시스턴트'입니다. "
                "사용자에게 정중하고 친절하며 전문성 있는 한국어로 답변하세요.\n"
                f"현재 대화 자치구: {selected_district} ({district_meta.get('description', '')})\n\n"
                "【중요 준수 사항】\n"
                "1. 절대 실존하지 않는 가상의 식당, 학원, 주소를 지어내지 마세요(Hallucination 금지).\n"
                "2. 장소를 추천할 때는 아래 제공된 [실제 장소 데이터]의 내용만을 토대로 추천 이유와 특징을 설명하세요.\n"
                "3. 일치하는 장소가 없는 경우, 정직하게 조건에 맞는 장소를 찾지 못했다고 설명하고 다른 조건을 제안하세요.\n"
                "4. 가독성을 위해 마크다운(굵은 글씨, 글머리 기호, 이모지)을 적극 활용하세요.\n\n"
            )

            if retrieved_places_raw:
                system_prompt += f"[실제 장소 데이터 (출처: {data_source_mode})]:\n"
                for idx, p in enumerate(retrieved_places_raw, 1):
                    system_prompt += (
                        f"{idx}. {p['name']} ({p['category']} - {p.get('sub_category','')})\n"
                        f"   - 주소: {p['address']}\n"
                        f"   - 전화: {p.get('phone', '정보없음')}\n"
                        f"   - 특징: {p['description']}\n"
                        f"   - 태그: {', '.join(p.get('tags', []))}\n"
                    )
            else:
                system_prompt += "[장소 검색 결과]: 일치하는 조건의 추천 장소가 없습니다.\n"

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
            # Groq 실패 시 로컬 지능형 엔진으로 즉각 fallback

    # 로컬 지능형 엔진 (Groq 키 미설정 또는 호출 실패 시 가동)
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
    외부 AI API 장애 또는 키 미등록 상태에서도 사용자가 온전한 서비스를 경험할 수 있도록
    검증된 지역 데이터베이스를 기반으로 자연스러운 추천 답변 생성
    """
    if not is_location_query:
        return (
            f"안녕하세요! 서울 동북권 맞춤형 **AI 로컬 어시스턴트**입니다. 🤖\n\n"
            f"현재 선택된 탐색 지역은 **{district}**입니다.\n\n"
            f"궁금하신 **맛집, 카페, 학원가, 문화 명소**를 편하게 물어보세요! "
            f"우측 지도 및 추천 카드를 통해 실시간 위치와 상세 정보를 즉시 확인하실 수 있습니다."
        )

    if not places:
        return (
            f"### 📍 [{district}] 장소 탐색 결과\n\n"
            f"질문하신 **\"{user_msg}\"** 조건에 맞는 {district} 내 장소를 찾지 못했습니다. 🔍\n\n"
            f"- 검색 조건을 완화하시거나 다른 카테고리(예: `카페`, `맛집`, `학원`, `문화시설`)로 질문해 보세요.\n"
            f"- 상단 설정 메뉴에서 **카카오 로컬 REST API** 키를 등록하시면 실시간 전체 매장 검색이 가능합니다."
        )

    response_lines = [
        f"### 📍 [{district}] 추천 장소 안내",
        f"질문하신 **\"{user_msg}\"** 조건에 부합하는 {district}의 추천 장소들을 정리해 드립니다.\n"
    ]

    for idx, p in enumerate(places, 1):
        icon = "🍲" if "맛집" in p["category"] else "☕" if "카페" in p["category"] else "📚" if "학원" in p["category"] else "🏛️"
        response_lines.append(f"#### {icon} {idx}. {p['name']} (`{p['category']}`)")
        response_lines.append(f"- **위치**: {p['address']}")
        if p.get("phone"):
            response_lines.append(f"- **문의**: {p['phone']}")
        response_lines.append(f"- **추천 이유**: {p['description']}")
        tags = " ".join([f"`#{t}`" for t in p.get("tags", [])])
        if tags:
            response_lines.append(f"- **키워드**: {tags}")
        response_lines.append("")

    response_lines.append(
        f"> 💡 **안내**: 우측 **지도 패널**에서 각 장소의 정확한 위치 마커와 길찾기 링크를 확인하실 수 있습니다."
    )

    return "\n".join(response_lines)
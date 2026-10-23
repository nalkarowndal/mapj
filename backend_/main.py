"""
AI 로컬 어시스턴트 고도화 백엔드 서버 (FastAPI)
- Groq AI (Llama 3.3 / Llama 3.1) 기반 한국어 지능형 대화 엔진
- 다중 턴 대화 문맥(Context History) 유지
- 실존 장소 데이터베이스(Ground Truth) RAG 파이프라인으로 AI 환각 방지
- 카카오 로컬 REST API 연동 및 오프라인 검증 데이터셋 폴백
- 보안 마스킹 및 견고한 예외 처리
"""

import os
import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from groq import Groq

from places_database import (
    DISTRICT_METADATA,
    search_verified_places,
    search_kakao_local_api,
)

# .env 로드
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY", "").strip()
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")

# Groq 클라이언트 안전 초기화
groq_client: Optional[Groq] = None
is_groq_available = False

if GROQ_API_KEY and not GROQ_API_KEY.startswith("your_"):
    try:
        groq_client = Groq(api_key=GROQ_API_KEY)
        is_groq_available = True
        masked_key = f"{GROQ_API_KEY[:4]}...{GROQ_API_KEY[-4:]}" if len(GROQ_API_KEY) > 8 else "***"
        print(f"[Init] Groq API 클라이언트 구성 완료 (Key: {masked_key})")
    except Exception as e:
        print(f"[Init Warning] Groq 클라이언트 생성 실패: {e}")
        is_groq_available = False
else:
    print("[Init Notice] 유효한 GROQ_API_KEY가 설정되지 않아 '검증된 로컬 데이터 어시스턴트 모드'로 안전하게 작동합니다.")

app = FastAPI(
    title="AI 로컬 어시스턴트 API",
    description="서울 동북권 5대 자치구 맞춤형 AI 추천 및 실시간 지도 연동 백엔드",
    version="2.0.0",
)

# CORS 미들웨어 등록
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# Pydantic Schemas
# ==========================================

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' 또는 'assistant'")
    content: str = Field(..., description="메시지 본문")


class ChatRequest(BaseModel):
    message: str = Field(..., description="사용자의 현재 질문")
    district: Optional[str] = Field("노원구", description="선택된 자치구 (노원구, 도봉구, 강북구, 중랑구, 성북구)")
    history: Optional[List[ChatMessage]] = Field(default=[], description="이전 대화 내역 (다중 턴 컨텍스트)")
    category: Optional[str] = Field(None, description="특정 카테고리 필터 (맛집, 학원, 카페, 문화시설 등)")


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
    source: str = "검증된 지역 데이터베이스"
    kakao_url: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str
    show_map: bool = False
    places: List[PlaceInfo] = []
    district: str
    is_demo: bool = False
    status_message: str = "정상 처리"


# ==========================================
# Endpoints
# ==========================================

@app.get("/api/health")
def health_check():
    """서버 상태 및 외부 연동 가용성 점검"""
    return {
        "status": "healthy",
        "service": "AI 로컬 어시스턴트 API v2.0",
        "groq_available": is_groq_available,
        "kakao_rest_configured": bool(KAKAO_REST_API_KEY and not KAKAO_REST_API_KEY.startswith("your_")),
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

    # 1. 지역 탐색 쿼리일 경우 실존 장소 검색 수행
    retrieved_places_raw: List[Dict[str, Any]] = []
    data_source_mode = "검증된 지역 데이터베이스"

    if is_location_query:
        # 카카오 로컬 검색 시도
        kakao_results = await search_kakao_local_api(
            district=selected_district,
            query=user_msg,
            kakao_rest_key=KAKAO_REST_API_KEY
        )
        if kakao_results:
            retrieved_places_raw = kakao_results
            data_source_mode = "카카오 로컬 API 실시간 검색"
        else:
            # 실존 검증 데이터셋에서 조회 (환각 없음)
            retrieved_places_raw = search_verified_places(
                district=selected_district,
                query=user_msg,
                category=request.category,
                limit=5
            )

    # PlaceInfo 객체화
    places_list = [PlaceInfo(**p) for p in retrieved_places_raw]
    show_map = bool(is_location_query and len(places_list) > 0)

    # 2. AI 응답 생성
    ai_reply = ""
    is_demo = False

    # Groq API 호출 시도
    if is_groq_available and groq_client:
        try:
            district_meta = DISTRICT_METADATA.get(selected_district, {})
            system_prompt = (
                f"당신은 서울시 {selected_district} 지역 생활 및 상권에 정통한 'AI 로컬 어시스턴트'입니다. "
                "사용자에게 정중하고 친절하며 전문성 있는 한국어로 답변하세요.\n"
                f"현재 대화 자치구: {selected_district} ({district_meta.get('description', '')})\n\n"
                "【중요 준수 사항】\n"
                "1. 절대 실존하지 않는 가상의 식당, 학원, 주소를 지어내지 마세요(Hallucination 금지).\n"
                "2. 장소를 추천할 때는 아래 제공된 [실제 검증 장소 데이터]의 내용만을 토대로 추천 이유와 특징을 설명하세요.\n"
                "3. 가독성을 위해 마크다운(굵은 글씨, 글머리 기호, 이모지)을 적극 활용하세요.\n\n"
                f"[실제 검증 장소 데이터 (데이터 출처: {data_source_mode})]:\n"
            )
            for idx, p in enumerate(retrieved_places_raw, 1):
                system_prompt += (
                    f"{idx}. {p['name']} ({p['category']} - {p.get('sub_category','')})\n"
                    f"   - 주소: {p['address']}\n"
                    f"   - 전화: {p.get('phone', '정보없음')}\n"
                    f"   - 특징: {p['description']}\n"
                    f"   - 태그: {', '.join(p.get('tags', []))}\n"
                )

            # 대화 내역(History) 구성
            messages = [{"role": "system", "content": system_prompt}]
            # 최근 4개 이전 대화 턴 유지 (토큰 관리 및 문맥 유지 최적화)
            if request.history:
                for h in request.history[-4:]:
                    messages.append({"role": h.role, "content": h.content})
            messages.append({"role": "user", "content": user_msg})

            chat_completion = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.6,
                max_tokens=900,
            )
            ai_reply = chat_completion.choices[0].message.content or ""
        except Exception as e:
            print(f"[Groq AI Call Fallback] LLM 호출 실패: {e}")
            # Groq 실패 시 아래 로컬 지능형 엔진으로 자동 fallback

    # 로컬 지능형 응답 엔진 (Groq 키 미설정 또는 네트워크 오류 시 가동)
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
    검증된 지역 데이터베이스를 기반으로 자연스러운 전문 추천 답변을 생성합니다.
    """
    if not is_location_query or not places:
        return (
            f"안녕하세요! 서울 동북권 맞춤형 **AI 로컬 어시스턴트**입니다. 🤖\n\n"
            f"현재 선택된 탐색 지역은 **{district}**입니다.\n\n"
            f"궁금하신 **맛집, 카페, 학원가, 문화 명소**를 편하게 물어보세요! "
            f"우측 지도 및 추천 카드를 통해 실시간 위치와 상세 정보를 즉시 확인하실 수 있습니다."
        )

    response_lines = [
        f"### 📍 [{district}] 추천 장소 안내",
        f"질문하신 **\"{user_msg}\"** 조건에 맞는 {district}의 검증된 추천 장소들을 정리해 드립니다.\n"
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
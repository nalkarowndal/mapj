"""
동북미식 (DONGBUK TABLE) AI 맛집 추천 컨시어지 API (routers/concierge.py)
- POST /api/concierge/recommend
- 원칙:
  1) 자연어 질의에서 지역/상권/음식종류/예산/방문목적/편의시설 구조화
  2) 통합 맛집 데이터(gourmet_catalog)에서 실존 공개 매장을 먼저 검색
  3) 조회된 실존 매장 ID만 Groq LLM에 전달하여 추천 이유 생성 (환각/허위 메뉴/영업 단정 차단)
  4) 외부 AI 장애 또는 키 미설정 시 DB 기반 안전 Fallback 추천 제공
  5) 비밀키 및 내부 설정 정보 절대 미노출
"""

from __future__ import annotations

import json
import re
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from groq import Groq
from pydantic import BaseModel, Field

from gourmet_catalog import query_restaurants
from settings_manager import settings_mgr

router = APIRouter(prefix="/api/concierge", tags=["AI Gourmet Concierge"])


class ConciergeHistoryItem(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str = Field(..., max_length=1000)


class ConciergeRecommendRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=400)
    region: Optional[str] = Field(default=None)
    budget: Optional[str] = Field(default=None)
    purpose: Optional[str] = Field(default=None)
    history: List[ConciergeHistoryItem] = Field(default=[])


REGION_KEYWORDS = {
    "nowon": ["노원", "공릉", "상계", "중계", "하계", "경춘선", "공트럴"],
    "dobong": ["도봉", "창동", "쌍문", "방학", "도봉산"],
    "gangbuk": ["강북", "수유", "미아", "우이", "4.19", "사일구", "북한산"],
    "jungnang": ["중랑", "망우", "상봉", "면목", "묵동", "중랑천"],
    "seongbuk": ["성북", "한성대", "성신여대", "안암", "길음", "보문"],
}

CATEGORY_KEYWORDS = {
    "korean": ["한식", "설렁탕", "해장국", "쌈밥", "생선구이", "두부", "한정식", "노포", "국밥", "백반"],
    "meat": ["고기", "갈비", "곱창", "삼겹살", "구이", "한우", "돼지갈비"],
    "chinese": ["중식", "중국집", "만두", "짜장", "짬뽕", "멘보샤", "어향가지"],
    "japanese": ["일식", "돈까스", "돈가스", "카츠"],
    "western": ["양식", "경양식", "파스타", "피자"],
    "snack": ["분식", "우동", "김밥", "떡볶이"],
    "noodle": ["면", "국수", "칼국수", "수제비", "냉면", "국시"],
    "cafe": ["카페", "커피", "찻집", "한옥카페", "로스터리", "빙수", "드립"],
    "bakery": ["빵", "베이커리", "팡도르", "사라다빵", "제과", "디저트"],
}

PURPOSE_KEYWORDS = {
    "solo_dining": ["혼밥", "혼자", "간단히", "가볍게"],
    "date": ["데이트", "분위기", "연인", "소개팅", "산책"],
    "family": ["부모님", "가족", "어른", "모임", "아이"],
    "group": ["단체", "회식", "친구들"],
    "parking": ["주차", "차 타고", "드라이브"],
    "takeout": ["포장", "테이크아웃"],
}


def _parse_intent(req: ConciergeRecommendRequest) -> Dict[str, Any]:
    q = req.query.strip()
    q_lower = q.lower()

    region = req.region or None
    if not region:
        for slug, kws in REGION_KEYWORDS.items():
            if any(k in q_lower for k in kws):
                region = slug
                break

    category = None
    for slug, kws in CATEGORY_KEYWORDS.items():
        if any(k in q_lower for k in kws):
            category = slug
            break

    budget = req.budget or None
    if not budget:
        if any(k in q_lower for k in ["만원 이하", "1만원 이하", "만 원 이하", "가성비", "저렴"]):
            budget = "under_10000"
        elif any(k in q_lower for k in ["1만원대", "1만 원대", "만원대", "점심"]):
            budget = "10000_20000"
        elif any(k in q_lower for k in ["2만원", "3만원"]):
            budget = "20000_40000"
        elif any(k in q_lower for k in ["4만원", "고급", "한정식"]):
            budget = "over_40000"

    features: List[str] = []
    if req.purpose and req.purpose in PURPOSE_KEYWORDS:
        features.append(req.purpose)
    for feat, kws in PURPOSE_KEYWORDS.items():
        if feat not in features and any(k in q_lower for k in kws):
            features.append(feat)

    # Extract specific neighborhood hint if present
    neighborhood = None
    for hood in [
        "공릉동", "노원역", "상계동", "중계", "창동", "도봉산", "쌍문동", "방학동",
        "4.19", "수유", "우이동", "미아", "망우동", "상봉동", "면목동", "중랑천",
        "성북동", "한성대", "성신여대", "안암동",
    ]:
        if hood in q:
            neighborhood = hood
            break

    return {
        "region": region,
        "neighborhood": neighborhood,
        "category": category,
        "budget": budget,
        "features": features,
    }


GENERIC_STOPWORDS = {
    "맛집", "식당", "음식점", "가게", "곳", "집", "추천", "추천해", "추천해줘", "찾아줘",
    "알려줘", "보여줘", "골라줘", "어디", "어디가", "있을까", "있나요", "있어", "좋을까",
    "좋은", "좋아", "편한", "맛있는", "유명한", "괜찮은", "만한", "먹을", "먹고", "먹기",
    "가기", "갈", "모시고", "함께", "같이", "후에", "다음에", "근처", "주변", "일대",
    "점심", "저녁", "아침", "브런치", "식사", "한끼", "한", "끼", "수", "있는", "할", "하기",
    "해", "줘", "주세요", "부탁해", "부탁", "등산", "산책", "나들이", "여행", "방문",
    "가성비", "저렴", "저렴한", "부담", "없는", "조용한", "깔끔한", "넓은", "예쁜",
    "서울", "동북권", "동네", "우리", "여기", "거기", "좀", "잘", "제일", "가장",
    "만원", "만원대", "1만원대", "2만원대", "3만원대", "이하", "이상", "안", "정도",
    "식당이", "맛집을", "식당을", "맛집이", "카페를", "한식집", "중식집", "일식집", "고기집",
    "메뉴", "요리", "음식", "종류", "분위기", "좋은곳",
}

PARTICLE_SUFFIXES = (
    "에서는", "에서도", "에서", "으로는", "으로", "이나", "하고", "부터", "까지",
    "이랑", "랑", "에게", "한테", "보다", "처럼", "은", "는", "이", "가", "을", "를",
    "의", "도", "만", "로", "에", "와", "과", "나",
)

FALLBACK_GROQ_MODELS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
]


def _extract_unmatched_tokens(raw_query: str) -> List[str]:
    known_terms = set(GENERIC_STOPWORDS)
    for kws in REGION_KEYWORDS.values():
        known_terms.update(kws)
    for kws in CATEGORY_KEYWORDS.values():
        known_terms.update(kws)
    for kws in PURPOSE_KEYWORDS.values():
        known_terms.update(kws)
    known_terms.update([
        "노원구", "도봉구", "강북구", "중랑구", "성북구",
        "공릉동", "노원역", "상계동", "중계동", "하계동", "창동역", "도봉산", "쌍문동", "방학동",
        "수유동", "수유역", "우이동", "미아동", "미아사거리", "망우동", "상봉동", "면목동", "묵동",
        "성북동", "한성대입구", "성신여대", "안암동", "길음동", "보문동", "4.19",
    ])

    cleaned = re.sub(r"[?.!,~'\"()\[\]]+", " ", raw_query)
    raw_tokens = [t.strip().lower() for t in cleaned.split() if t.strip()]
    residual: List[str] = []

    for tok in raw_tokens:
        if len(tok) <= 1:
            continue
        if re.fullmatch(r"\d+(?:만원|원|천원|명|인|시|분)?", tok):
            continue
        stem = tok
        for suf in PARTICLE_SUFFIXES:
            if len(stem) > len(suf) + 1 and stem.endswith(suf):
                stem = stem[: -len(suf)]
                break
        if (
            tok in known_terms
            or stem in known_terms
            or any(k in tok for k in known_terms if len(k) >= 2)
        ):
            continue
        residual.append(stem)
    return residual


def _has_impossible_budget(raw_query: str) -> bool:
    for m in re.finditer(r"(\d+)\s*만\s*원", raw_query):
        val = int(m.group(1))
        if val >= 20:
            return True
    return False


def _search_candidates(intent: Dict[str, Any], raw_query: str) -> List[Dict[str, Any]]:
    # Guard 1: Unrealistic budget (e.g., 999만원) -> never return unrelated matches
    if _has_impossible_budget(raw_query):
        return []

    # Guard 2: Unrecognized specific place/dish/theme tokens (e.g., 우주정거장, 오마카세, 스시)
    residual_tokens = _extract_unmatched_tokens(raw_query)
    if residual_tokens:
        matched_by_residual: List[Dict[str, Any]] = []
        seen_ids = set()
        for tok in residual_tokens:
            res_tok = query_restaurants(
                q=tok,
                region=intent["region"],
                category=intent["category"],
                price=intent["budget"],
                page=1,
                page_size=4,
            )
            for item in res_tok["items"]:
                if item["id"] not in seen_ids:
                    seen_ids.add(item["id"])
                    matched_by_residual.append(item)
        # If the user asked for specific unknown foods/places not present in our DB, return []!
        return matched_by_residual[:4]

    # Step 1: Strict structured query against single-source catalog
    res = query_restaurants(
        region=intent["region"],
        neighborhood=intent["neighborhood"],
        category=intent["category"],
        price=intent["budget"],
        features=intent["features"] or None,
        page=1,
        page_size=4,
    )
    if res["items"]:
        return res["items"]

    # Step 2: Relax neighborhood while keeping region, category, budget, features
    if intent["neighborhood"]:
        res_no_hood = query_restaurants(
            region=intent["region"],
            category=intent["category"],
            price=intent["budget"],
            features=intent["features"] or None,
            page=1,
            page_size=4,
        )
        if res_no_hood["items"]:
            return res_no_hood["items"]

    # Step 3: Relax features while keeping region, category, budget
    if intent["category"] or intent["budget"] or intent["features"]:
        res2 = query_restaurants(
            region=intent["region"],
            category=intent["category"],
            price=intent["budget"],
            page=1,
            page_size=4,
        )
        if res2["items"]:
            return res2["items"]

        # Step 3b: If budget + category/features combination was empty, relax budget while keeping region + category/features
        if intent["budget"] and (intent["category"] or intent["features"]):
            res2b = query_restaurants(
                region=intent["region"],
                category=intent["category"],
                features=intent["features"] or None,
                page=1,
                page_size=4,
            )
            if res2b["items"]:
                return res2b["items"]

    # Step 4: Keyword search directly on verified catalog
    res3 = query_restaurants(
        q=raw_query,
        region=intent["region"],
        page=1,
        page_size=4,
    )
    if res3["items"]:
        return res3["items"]

    # Step 5: General regional dining intent without specific unmatched category
    general_dining = any(
        k in raw_query
        for k in ["맛집", "식당", "점심", "저녁", "식사", "추천", "등산", "데이트", "부모님", "카페"]
    )
    if intent["region"] and general_dining and not intent["category"]:
        res4 = query_restaurants(
            region=intent["region"],
            editor_pick=True,
            page=1,
            page_size=4,
        )
        return res4["items"]

    return []


def _generate_fallback_reasons(
    query: str,
    intent: Dict[str, Any],
    candidates: List[Dict[str, Any]],
) -> Dict[str, Any]:
    if not candidates:
        return {
            "summary": "입력하신 모든 조건에 정확히 일치하는 등록 매장을 찾지 못했습니다. 자치구 범위를 넓히거나 음식 종류·예산 조건을 완화해 다시 질문해 보세요.",
            "reasons": {},
        }

    region_label = candidates[0]["region_name"] if intent["region"] else "서울 동북권"
    summary = (
        f"요청하신 조건에 맞춰 {region_label}의 검증된 등록 매장 {len(candidates)}곳을 골라드렸습니다. "
        "실제 영업시간과 현장 가격은 방문 전 상세 정보나 전화로 확인해 주세요."
    )
    reasons: Dict[str, str] = {}
    for c in candidates:
        menus = ", ".join(c.get("signature_menus", [])[:2])
        price = c.get("price_range_label") or "가격 확인 필요"
        reasons[c["id"]] = (
            f"{c['region_name']} {c['neighborhood']}에 위치한 {c['primary_category']} 매장으로, "
            f"{menus} 등 대표 메뉴({price})를 즐기기에 적합합니다."
        )
    return {"summary": summary, "reasons": reasons}


def _call_groq_for_reasons(
    query: str,
    candidates: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    api_key = settings_mgr.get_groq_key()
    if not api_key or not candidates:
        return None

    preferred = settings_mgr.get_groq_model()
    candidate_models = [preferred] + [m for m in FALLBACK_GROQ_MODELS if m != preferred]

    context_rows = [
        {
            "id": c["id"],
            "name": c["name"],
            "region": c["region_name"],
            "neighborhood": c["neighborhood"],
            "category": c["primary_category"],
            "price_range": c.get("price_range_label"),
            "signature_menus": c.get("signature_menus", []),
            "one_line_intro": c["one_line_intro"],
            "features": c.get("features", []),
        }
        for c in candidates
    ]

    system_prompt = (
        "당신은 서울 동북권 로컬 미식 큐레이션 서비스 '동북미식(DONGBUK TABLE)'의 AI 추천 도우미입니다.\n"
        "반드시 아래 규칙을 지키며 JSON만 출력하세요:\n"
        "1. 제공된 candidates 목록에 없는 매장, 메뉴, 가격, 영업시간을 절대 지어내지 마세요.\n"
        "2. 현재 영업 중인지 단정하지 마세요.\n"
        "3. 서버 설정, API 키 등 내부 정보를 언급하지 마세요.\n"
        "4. 응답 형식은 반드시 다음 JSON 객체여야 합니다:\n"
        '{"summary": "2문장 이내의 따뜻하고 간결한 한국어 요약", "reasons": {"매장id": "해당 매장을 추천하는 1~2문장 이유"}}\n'
    )
    user_prompt = (
        f"사용자 요청: {query}\n\n"
        f"검증된 후보 매장(JSON):\n{json.dumps(context_rows, ensure_ascii=False)}"
    )

    client = Groq(api_key=api_key)
    valid_ids = {c["id"] for c in candidates}

    for model in candidate_models:
        try:
            completion = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.35,
                max_tokens=700,
                response_format={"type": "json_object"},
            )
            raw_content = (completion.choices[0].message.content or "").strip()
            raw_content = re.sub(r"<think>.*?</think>", "", raw_content, flags=re.DOTALL).strip()
            parsed = json.loads(raw_content)
            clean_reasons = {
                k: str(v).strip()
                for k, v in (parsed.get("reasons") or {}).items()
                if k in valid_ids and str(v).strip()
            }
            summary = str(parsed.get("summary") or "").strip()
            if summary:
                return {"summary": summary, "reasons": clean_reasons, "model_used": model}
        except Exception:
            continue
    return None


@router.post("/recommend")
def recommend_restaurants(req: ConciergeRecommendRequest):
    intent = _parse_intent(req)
    candidates = _search_candidates(intent, req.query)

    if not candidates:
        fb = _generate_fallback_reasons(req.query, intent, [])
        return {
            "summary": fb["summary"],
            "parsed_intent": intent,
            "recommendations": [],
            "is_fallback": False,
            "disclaimer": "동북미식 AI 추천은 등록·검증된 실존 매장 데이터만 사용하며, 없는 매장을 임의로 생성하지 않습니다.",
        }

    ai_result = _call_groq_for_reasons(req.query, candidates)
    is_fallback = ai_result is None
    final_data = ai_result or _generate_fallback_reasons(req.query, intent, candidates)
    fallback_reasons = _generate_fallback_reasons(req.query, intent, candidates)["reasons"]

    recommendations = []
    for c in candidates:
        reason = final_data["reasons"].get(c["id"]) or fallback_reasons[c["id"]]
        recommendations.append({
            "restaurant": c,
            "ai_reason": reason,
        })

    return {
        "summary": final_data["summary"],
        "parsed_intent": intent,
        "recommendations": recommendations,
        "is_fallback": is_fallback,
        "disclaimer": "매장 기본 정보는 등록된 검증 데이터이며, 추천 이유는 AI가 조건에 맞춰 정리한 참고 안내입니다. 영업 여부는 방문 전 확인해 주세요.",
    }

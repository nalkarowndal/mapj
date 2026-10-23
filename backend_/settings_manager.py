"""
보안 API 설정 및 런타임 자격증명 관리 모듈 (settings_manager.py)
- 단일 사용자 로컬 환경의 안전한 서버 파일 저장소 (backend_/data/settings.json)
- 비밀키 브라우저 노출 금지 (마스킹 처리 및 공개 지도 설정 분리)
- Groq / Kakao REST 연결 상태 실시간 테스트 및 런타임 갱신
"""

import os
import json
import time
from pathlib import Path
from typing import Dict, Any, Optional, List
import httpx
from dotenv import load_dotenv

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

DATA_DIR = Path(__file__).parent / "data"
SETTINGS_FILE = DATA_DIR / "settings.json"

SUPPORTED_GROQ_MODELS = [
    {
        "id": "llama-3.3-70b-versatile",
        "name": "Llama 3.3 70B Versatile (추천)",
        "description": "가장 뛰어난 한국어 이해도 및 장소 추천 성능 제공",
        "is_default": True,
    },
    {
        "id": "llama-3.1-8b-instant",
        "name": "Llama 3.1 8B Instant (초고속)",
        "description": "가장 빠른 응답 속도와 가벼운 토큰 소비",
        "is_default": False,
    },
    {
        "id": "mixtral-8x7b-32768",
        "name": "Mixtral 8x7B (긴 컨텍스트)",
        "description": "32k 긴 대화 컨텍스트 처리 지원",
        "is_default": False,
    },
]


def _mask_key(key: Optional[str]) -> str:
    """비밀키를 안전하게 마스킹 (전체 키 노출 방지)"""
    if not key or key.strip() == "" or key.startswith("your_"):
        return ""
    k = key.strip()
    if len(k) <= 8:
        return "****"
    prefix = k[:4]
    suffix = k[-4:]
    return f"{prefix}...{suffix}"


class SettingsManager:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.settings: Dict[str, Any] = self._load()

    def _load(self) -> Dict[str, Any]:
        """저장된 설정 파일 로드 및 .env 환경변수와 병합"""
        data = {
            "groq_api_key": os.getenv("GROQ_API_KEY", "").strip(),
            "groq_model": "llama-3.3-70b-versatile",
            "kakao_rest_api_key": os.getenv("KAKAO_REST_API_KEY", "").strip(),
            "kakao_js_key": os.getenv("NEXT_PUBLIC_KAKAO_MAP_KEY", "").strip(),
            "groq_status": "unconfigured",
            "kakao_rest_status": "unconfigured",
            "kakao_js_status": "unconfigured",
            "last_validated": {},
            "status_messages": {},
        }

        if SETTINGS_FILE.exists():
            try:
                file_content = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))
                for k, v in file_content.items():
                    if v is not None:
                        data[k] = v
            except Exception as e:
                print(f"[SettingsManager Warning] settings.json 로드 실패: {e}")

        # 기본 상태 초기 평가
        if data["groq_api_key"] and not data["groq_api_key"].startswith("your_"):
            if data["groq_status"] == "unconfigured":
                data["groq_status"] = "configured_untested"
        else:
            data["groq_status"] = "unconfigured"

        if data["kakao_rest_api_key"] and not data["kakao_rest_api_key"].startswith("your_"):
            if data["kakao_rest_status"] == "unconfigured":
                data["kakao_rest_status"] = "configured_untested"
        else:
            data["kakao_rest_status"] = "unconfigured"

        if data["kakao_js_key"] and not data["kakao_js_key"].startswith("your_"):
            if data["kakao_js_status"] == "unconfigured":
                data["kakao_js_status"] = "configured"
        else:
            data["kakao_js_status"] = "unconfigured"

        return data

    def save(self):
        """서버 저장소에 안전하게 기록"""
        try:
            SETTINGS_FILE.write_text(
                json.dumps(self.settings, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )
        except Exception as e:
            print(f"[SettingsManager Error] 저장 실패: {e}")

    def get_groq_key(self) -> str:
        k = self.settings.get("groq_api_key", "").strip()
        return "" if k.startswith("your_") else k

    def get_groq_model(self) -> str:
        return self.settings.get("groq_model") or "llama-3.3-70b-versatile"

    def get_kakao_rest_key(self) -> str:
        k = self.settings.get("kakao_rest_api_key", "").strip()
        return "" if k.startswith("your_") else k

    def get_kakao_js_key(self) -> str:
        k = self.settings.get("kakao_js_key", "").strip()
        return "" if k.startswith("your_") else k

    def get_status(self) -> Dict[str, Any]:
        """클라이언트에 전달할 안전한 설정 요약 정보 (비밀키 원문 미포함)"""
        groq_key = self.get_groq_key()
        kakao_rest_key = self.get_kakao_rest_key()
        kakao_js_key = self.get_kakao_js_key()

        return {
            "groq": {
                "is_configured": bool(groq_key),
                "masked_key": _mask_key(groq_key),
                "model": self.get_groq_model(),
                "status": self.settings.get("groq_status", "unconfigured"),
                "status_message": self.settings.get("status_messages", {}).get("groq", ""),
                "last_validated": self.settings.get("last_validated", {}).get("groq"),
                "supported_models": SUPPORTED_GROQ_MODELS,
            },
            "kakao_rest": {
                "is_configured": bool(kakao_rest_key),
                "masked_key": _mask_key(kakao_rest_key),
                "status": self.settings.get("kakao_rest_status", "unconfigured"),
                "status_message": self.settings.get("status_messages", {}).get("kakao_rest", ""),
                "last_validated": self.settings.get("last_validated", {}).get("kakao_rest"),
            },
            "kakao_js": {
                "is_configured": bool(kakao_js_key),
                "masked_key": _mask_key(kakao_js_key),
                "status": self.settings.get("kakao_js_status", "unconfigured"),
                "status_message": self.settings.get("status_messages", {}).get("kakao_js", ""),
                "domain_guide": {
                    "registered_domains": ["http://localhost:3000", "http://127.0.0.1:3000"],
                    "developers_url": "https://developers.kakao.com/console/app",
                },
            },
            "operational_mode": "live_api" if self.settings.get("groq_status") == "connected" else "local_verified",
            "server_time": int(time.time() * 1000),
        }

    async def test_groq_connection(self, key_to_test: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
        """Groq API 실제 인증 및 모델 유효성 테스트"""
        api_key = (key_to_test or self.get_groq_key()).strip()
        target_model = model or self.get_groq_model()

        if not api_key:
            return {
                "success": False,
                "status": "unconfigured",
                "message": "Groq API 키가 입력되지 않았습니다.",
            }

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        try:
            # lightweight models.list 엔드포인트 호출
            async with httpx.AsyncClient(timeout=6.0) as client:
                resp = await client.get("https://api.groq.com/openai/v1/models", headers=headers)

                now_ts = int(time.time() * 1000)
                if "last_validated" not in self.settings:
                    self.settings["last_validated"] = {}
                if "status_messages" not in self.settings:
                    self.settings["status_messages"] = {}

                if resp.status_code == 200:
                    data = resp.json()
                    available_models = [m.get("id") for m in data.get("data", [])]

                    self.settings["groq_status"] = "connected"
                    self.settings["last_validated"]["groq"] = now_ts
                    msg = f"인증 성공: 정상 연결되었습니다. (확인 모델: {target_model})"
                    self.settings["status_messages"]["groq"] = msg
                    self.save()

                    return {
                        "success": True,
                        "status": "connected",
                        "message": msg,
                        "available_models": available_models[:10],
                    }
                elif resp.status_code == 401:
                    self.settings["groq_status"] = "invalid_key"
                    self.settings["last_validated"]["groq"] = now_ts
                    msg = "인증 실패 (401): API 키가 올바르지 않습니다. 키를 다시 확인해 주세요."
                    self.settings["status_messages"]["groq"] = msg
                    self.save()
                    return {"success": False, "status": "invalid_key", "message": msg}
                elif resp.status_code == 429:
                    self.settings["groq_status"] = "rate_limited"
                    self.settings["last_validated"]["groq"] = now_ts
                    msg = "이용량 한도 도달 (429): 일시적으로 요청 한도를 초과했습니다."
                    self.settings["status_messages"]["groq"] = msg
                    self.save()
                    return {"success": False, "status": "rate_limited", "message": msg}
                else:
                    self.settings["groq_status"] = "error"
                    self.settings["last_validated"]["groq"] = now_ts
                    msg = f"서버 응답 오류 (상태코드: {resp.status_code})"
                    self.settings["status_messages"]["groq"] = msg
                    self.save()
                    return {"success": False, "status": "error", "message": msg}
        except httpx.TimeoutException:
            return {"success": False, "status": "timeout", "message": "연결 시간 초과: Groq 서버 응답이 지연되고 있습니다."}
        except Exception as e:
            return {"success": False, "status": "network_error", "message": f"네트워크 연결 오류: {str(e)}"}

    async def test_kakao_rest_connection(self, key_to_test: Optional[str] = None) -> Dict[str, Any]:
        """카카오 로컬 REST API 실제 인증 테스트"""
        api_key = (key_to_test or self.get_kakao_rest_key()).strip()

        if not api_key:
            return {
                "success": False,
                "status": "unconfigured",
                "message": "카카오 REST API 키가 입력되지 않았습니다.",
            }

        headers = {"Authorization": f"KakaoAK {api_key}"}
        params = {"query": "서울 노원역", "size": 1}

        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(
                    "https://dapi.kakao.com/v2/local/search/keyword.json",
                    headers=headers,
                    params=params
                )

                now_ts = int(time.time() * 1000)
                if "last_validated" not in self.settings:
                    self.settings["last_validated"] = {}
                if "status_messages" not in self.settings:
                    self.settings["status_messages"] = {}

                if resp.status_code == 200:
                    self.settings["kakao_rest_status"] = "connected"
                    self.settings["last_validated"]["kakao_rest"] = now_ts
                    msg = "카카오 로컬 API 인증 성공: 실시간 장소 검색이 활성화되었습니다."
                    self.settings["status_messages"]["kakao_rest"] = msg
                    self.save()
                    return {"success": True, "status": "connected", "message": msg}
                elif resp.status_code in (401, 403):
                    self.settings["kakao_rest_status"] = "invalid_key"
                    self.settings["last_validated"]["kakao_rest"] = now_ts
                    msg = "카카오 인증 실패: REST API 키가 유효하지 않거나 플랫폼 설정이 필요합니다."
                    self.settings["status_messages"]["kakao_rest"] = msg
                    self.save()
                    return {"success": False, "status": "invalid_key", "message": msg}
                else:
                    self.settings["kakao_rest_status"] = "error"
                    msg = f"카카오 API 응답 실패 (상태코드: {resp.status_code})"
                    self.settings["status_messages"]["kakao_rest"] = msg
                    self.save()
                    return {"success": False, "status": "error", "message": msg}
        except Exception as e:
            return {"success": False, "status": "network_error", "message": f"네트워크 통신 오류: {str(e)}"}

    def set_credential(self, provider: str, key: str, model: Optional[str] = None):
        """API 키 및 모델 런타임 저장"""
        clean_key = key.strip()
        if provider == "groq":
            self.settings["groq_api_key"] = clean_key
            if model:
                self.settings["groq_model"] = model
            self.settings["groq_status"] = "configured_untested" if clean_key else "unconfigured"
        elif provider == "kakao_rest":
            self.settings["kakao_rest_api_key"] = clean_key
            self.settings["kakao_rest_status"] = "configured_untested" if clean_key else "unconfigured"
        elif provider == "kakao_js":
            self.settings["kakao_js_key"] = clean_key
            self.settings["kakao_js_status"] = "configured" if clean_key else "unconfigured"

        self.save()

    def delete_credential(self, provider: str):
        """지정된 제공자 키 삭제 및 상태 초기화"""
        if provider == "groq":
            self.settings["groq_api_key"] = ""
            self.settings["groq_status"] = "unconfigured"
        elif provider == "kakao_rest":
            self.settings["kakao_rest_api_key"] = ""
            self.settings["kakao_rest_status"] = "unconfigured"
        elif provider == "kakao_js":
            self.settings["kakao_js_key"] = ""
            self.settings["kakao_js_status"] = "unconfigured"

        if "status_messages" in self.settings and provider in self.settings["status_messages"]:
            del self.settings["status_messages"][provider]

        self.save()


# 싱글톤 인스턴스
settings_mgr = SettingsManager()

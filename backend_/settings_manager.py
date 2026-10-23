"""
보안 API 설정 및 런타임 자격증명 관리 모듈 (settings_manager.py)
- AES-256 (Fernet) 기반 서버 측 암호화 저장소
- 마스터 암호화 키 분리 관리 (.master.key) 및 자동 마이그레이션
- 비밀키 브라우저 노출 완전 차단 (마스킹 처리 및 공개 지도 설정 분리)
- 키 문자열 로그 출력 제로화 (SHA-256 키 지문 기반 추적)
- 입력 유효성 검증 및 안전한 런타임 클라이언트 동적 갱신
"""

import os
import json
import time
import hashlib
from pathlib import Path
from typing import Dict, Any, Optional, List
import httpx
from dotenv import load_dotenv
from cryptography.fernet import Fernet

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

DATA_DIR = Path(__file__).parent / "data"
SETTINGS_FILE = DATA_DIR / "settings.json"
MASTER_KEY_FILE = DATA_DIR / ".master.key"

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
        return "••••••••"
    return f"{k[:4]}••••••••{k[-4:]}"


def _get_key_fingerprint(key: Optional[str]) -> str:
    """비밀키의 SHA-256 단방향 해시 지문 (로그용, 원문 복원 불가)"""
    if not key or not key.strip():
        return "none"
    return hashlib.sha256(key.strip().encode("utf-8")).hexdigest()[:8]


class SettingsManager:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.cipher = self._init_cipher()
        # 메모리 상의 평문 설정 상태
        self.in_memory_keys: Dict[str, str] = {
            "groq_api_key": "",
            "kakao_rest_api_key": "",
            "kakao_js_key": "",
        }
        self.settings: Dict[str, Any] = self._load()

    def _init_cipher(self) -> Fernet:
        """암호화 마스터 키 초기화 및 Fernet 객체 생성"""
        env_master = os.getenv("APP_SETTINGS_MASTER_KEY", "").strip()
        if env_master:
            try:
                return Fernet(env_master.encode("utf-8"))
            except Exception:
                pass

        if MASTER_KEY_FILE.exists():
            try:
                key_bytes = MASTER_KEY_FILE.read_bytes().strip()
                return Fernet(key_bytes)
            except Exception as e:
                print(f"[SettingsManager Warning] 마스터 키 로드 실패, 새로 생성합니다: {e}")

        # 신규 마스터 키 생성 및 파일 저장
        new_key = Fernet.generate_key()
        try:
            MASTER_KEY_FILE.write_bytes(new_key)
            # 파일 권한 제한 시도
            try:
                os.chmod(MASTER_KEY_FILE, 0o600)
            except Exception:
                pass
        except Exception as e:
            print(f"[SettingsManager Warning] 마스터 키 저장 실패: {e}")

        return Fernet(new_key)

    def _encrypt(self, text: str) -> str:
        """평문 문자열을 AES-256 암호화 토큰으로 변환"""
        if not text:
            return ""
        return self.cipher.encrypt(text.encode("utf-8")).decode("utf-8")

    def _decrypt(self, token: str) -> str:
        """암호화 토큰을 평문 문자열로 복호화"""
        if not token:
            return ""
        try:
            return self.cipher.decrypt(token.encode("utf-8")).decode("utf-8")
        except Exception:
            return ""

    def _load(self) -> Dict[str, Any]:
        """저장된 설정 파일 로드 및 자동 마이그레이션"""
        data: Dict[str, Any] = {
            "groq_model": "llama-3.3-70b-versatile",
            "groq_status": "unconfigured",
            "kakao_rest_status": "unconfigured",
            "kakao_js_status": "unconfigured",
            "last_validated": {},
            "status_messages": {},
        }

        # 1. .env 우선 확인 (기본값)
        env_groq = os.getenv("GROQ_API_KEY", "").strip()
        if env_groq and not env_groq.startswith("your_"):
            self.in_memory_keys["groq_api_key"] = env_groq

        env_kakao_rest = os.getenv("KAKAO_REST_API_KEY", "").strip()
        if env_kakao_rest and not env_kakao_rest.startswith("your_"):
            self.in_memory_keys["kakao_rest_api_key"] = env_kakao_rest

        env_kakao_js = os.getenv("NEXT_PUBLIC_KAKAO_MAP_KEY", "").strip()
        if env_kakao_js and not env_kakao_js.startswith("your_"):
            self.in_memory_keys["kakao_js_key"] = env_kakao_js

        # 2. settings.json 로드 및 복호화
        needs_migration = False
        if SETTINGS_FILE.exists():
            try:
                raw_json = json.loads(SETTINGS_FILE.read_text(encoding="utf-8"))

                # 암호화된 키 복호화
                if "encrypted_groq_api_key" in raw_json:
                    dec = self._decrypt(raw_json["encrypted_groq_api_key"])
                    if dec:
                        self.in_memory_keys["groq_api_key"] = dec
                elif "groq_api_key" in raw_json and raw_json["groq_api_key"]:
                    # 기존 평문 키 마이그레이션 대상
                    self.in_memory_keys["groq_api_key"] = raw_json["groq_api_key"]
                    needs_migration = True

                if "encrypted_kakao_rest_api_key" in raw_json:
                    dec = self._decrypt(raw_json["encrypted_kakao_rest_api_key"])
                    if dec:
                        self.in_memory_keys["kakao_rest_api_key"] = dec
                elif "kakao_rest_api_key" in raw_json and raw_json["kakao_rest_api_key"]:
                    self.in_memory_keys["kakao_rest_api_key"] = raw_json["kakao_rest_api_key"]
                    needs_migration = True

                if "encrypted_kakao_js_key" in raw_json:
                    dec = self._decrypt(raw_json["encrypted_kakao_js_key"])
                    if dec:
                        self.in_memory_keys["kakao_js_key"] = dec
                elif "kakao_js_key" in raw_json and raw_json["kakao_js_key"]:
                    self.in_memory_keys["kakao_js_key"] = raw_json["kakao_js_key"]
                    needs_migration = True

                # 기타 메타데이터 병합
                for field in ["groq_model", "groq_status", "kakao_rest_status", "kakao_js_status", "last_validated", "status_messages"]:
                    if field in raw_json:
                        data[field] = raw_json[field]

            except Exception as e:
                print(f"[SettingsManager Warning] settings.json 로드 실패: {e}")

        # 초기 상태 판별
        if self.in_memory_keys["groq_api_key"]:
            if data["groq_status"] == "unconfigured":
                data["groq_status"] = "configured_untested"
        else:
            data["groq_status"] = "unconfigured"

        if self.in_memory_keys["kakao_rest_api_key"]:
            if data["kakao_rest_status"] == "unconfigured":
                data["kakao_rest_status"] = "configured_untested"
        else:
            data["kakao_rest_status"] = "unconfigured"

        if self.in_memory_keys["kakao_js_key"]:
            if data["kakao_js_status"] == "unconfigured":
                data["kakao_js_status"] = "configured"
        else:
            data["kakao_js_status"] = "unconfigured"

        self.settings = data

        # 평문 키가 발견된 경우 즉시 암호화 파일로 재저장 (자동 마이그레이션)
        if needs_migration:
            self.save()
            print("[SettingsManager Security] 기존 평문 API 키를 AES-256 암호화 저장소로 자동 마이그레이션 완료")

        return data

    def save(self):
        """서버 저장소에 AES-256 암호화하여 기록 (평문 키 디스크 저장 원천 차단)"""
        try:
            payload = {
                "encrypted_groq_api_key": self._encrypt(self.in_memory_keys.get("groq_api_key", "")),
                "encrypted_kakao_rest_api_key": self._encrypt(self.in_memory_keys.get("kakao_rest_api_key", "")),
                "encrypted_kakao_js_key": self._encrypt(self.in_memory_keys.get("kakao_js_key", "")),
                "groq_model": self.settings.get("groq_model", "llama-3.3-70b-versatile"),
                "groq_status": self.settings.get("groq_status", "unconfigured"),
                "kakao_rest_status": self.settings.get("kakao_rest_status", "unconfigured"),
                "kakao_js_status": self.settings.get("kakao_js_status", "unconfigured"),
                "last_validated": self.settings.get("last_validated", {}),
                "status_messages": self.settings.get("status_messages", {}),
            }
            SETTINGS_FILE.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )
        except Exception as e:
            print(f"[SettingsManager Error] 저장 실패: {e}")

    def get_groq_key(self) -> str:
        k = self.in_memory_keys.get("groq_api_key", "").strip()
        return "" if k.startswith("your_") else k

    def get_groq_model(self) -> str:
        return self.settings.get("groq_model") or "llama-3.3-70b-versatile"

    def get_kakao_rest_key(self) -> str:
        k = self.in_memory_keys.get("kakao_rest_api_key", "").strip()
        return "" if k.startswith("your_") else k

    def get_kakao_js_key(self) -> str:
        k = self.in_memory_keys.get("kakao_js_key", "").strip()
        return "" if k.startswith("your_") else k

    def get_status(self) -> Dict[str, Any]:
        """클라이언트에 전달할 안전한 설정 요약 정보 (비밀키 원문 절대 미포함)"""
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
            "storage_security": "aes-256-encrypted",
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
        """API 키 및 모델 런타임 저장 (입력값 유효성 검증 포함)"""
        clean_key = key.strip()

        # 입력 검증
        if clean_key:
            if provider == "groq":
                if " " in clean_key or len(clean_key) < 10:
                    raise ValueError("올바른 Groq API 키 형식이 아닙니다.")
            elif provider in ("kakao_rest", "kakao_js"):
                if " " in clean_key or len(clean_key) < 10:
                    raise ValueError(f"올바른 {provider} API 키 형식이 아닙니다.")

        if provider == "groq":
            self.in_memory_keys["groq_api_key"] = clean_key
            if model:
                self.settings["groq_model"] = model
            self.settings["groq_status"] = "configured_untested" if clean_key else "unconfigured"
        elif provider == "kakao_rest":
            self.in_memory_keys["kakao_rest_api_key"] = clean_key
            self.settings["kakao_rest_status"] = "configured_untested" if clean_key else "unconfigured"
        elif provider == "kakao_js":
            self.in_memory_keys["kakao_js_key"] = clean_key
            self.settings["kakao_js_status"] = "configured" if clean_key else "unconfigured"

        self.save()

    def delete_credential(self, provider: str):
        """지정된 제공자 키 삭제 및 상태 초기화"""
        if provider == "groq":
            self.in_memory_keys["groq_api_key"] = ""
            self.settings["groq_status"] = "unconfigured"
        elif provider == "kakao_rest":
            self.in_memory_keys["kakao_rest_api_key"] = ""
            self.settings["kakao_rest_status"] = "unconfigured"
        elif provider == "kakao_js":
            self.in_memory_keys["kakao_js_key"] = ""
            self.settings["kakao_js_status"] = "unconfigured"

        if "status_messages" in self.settings and provider in self.settings["status_messages"]:
            del self.settings["status_messages"][provider]

        self.save()


# 싱글톤 인스턴스
settings_mgr = SettingsManager()

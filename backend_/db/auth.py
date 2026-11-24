"""
동북미식 (DONGBUK TABLE) 관리자 인증 및 보안 계층
- PBKDF2-HMAC-SHA256 (310,000 iterations, 개별 16바이트 랜덤 솔트) 비밀번호 해싱
- 로그인 시도 횟수 제한 (IP당 1분 최대 5회 실패 시 429)
- 서버 DB 기반 세션 토큰(SHA-256 해시 저장) + HttpOnly Cookie / Bearer Token 지원
- 모든 관리자 API에 FastAPI Depends(require_admin)로 서버 측 권한 강제
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import os
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from db.database import get_db
from db.models import Admin, AdminSession, AuditLog

ADMIN_SESSION_COOKIE = "dongbuk_admin_session"
PBKDF2_ITERATIONS = 310_000
SESSION_TTL_HOURS = int(os.getenv("ADMIN_SESSION_TTL_HOURS", "12"))
COOKIE_SECURE = os.getenv("ADMIN_COOKIE_SECURE", "false").lower() == "true"

# In-memory login failure rate limiter (IP -> list of failure timestamps within 60s)
_login_failures: Dict[str, List[float]] = {}
MAX_LOGIN_FAILURES_PER_MIN = 5


def hash_password(plain_password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac(
        "sha256",
        plain_password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )
    salt_b64 = base64.b64encode(salt).decode("ascii")
    dk_b64 = base64.b64encode(dk).decode("ascii")
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt_b64}${dk_b64}"


def verify_password(plain_password: str, stored_hash: str) -> bool:
    try:
        algo, iter_str, salt_b64, dk_b64 = stored_hash.split("$", 3)
        if algo != "pbkdf2_sha256":
            return False
        iterations = int(iter_str)
        salt = base64.b64decode(salt_b64.encode("ascii"))
        expected = base64.b64decode(dk_b64.encode("ascii"))
        actual = hashlib.pbkdf2_hmac(
            "sha256",
            plain_password.encode("utf-8"),
            salt,
            iterations,
        )
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False


def _hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def check_login_rate_limit(client_ip: str) -> None:
    now = time.time()
    recent = [t for t in _login_failures.get(client_ip, []) if now - t < 60.0]
    _login_failures[client_ip] = recent
    if len(recent) >= MAX_LOGIN_FAILURES_PER_MIN:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="로그인 시도가 너무 많습니다. 1분 후 다시 시도해 주세요.",
        )


def record_login_failure(client_ip: str) -> None:
    now = time.time()
    recent = [t for t in _login_failures.get(client_ip, []) if now - t < 60.0]
    recent.append(now)
    _login_failures[client_ip] = recent


def clear_login_failures(client_ip: str) -> None:
    _login_failures.pop(client_ip, None)


def create_admin_session(
    db: Session,
    admin: Admin,
    request: Request,
    response: Response,
) -> str:
    raw_token = secrets.token_urlsafe(48)
    token_hash = _hash_token(raw_token)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(hours=SESSION_TTL_HOURS)

    session_row = AdminSession(
        token_hash=token_hash,
        admin_id=admin.id,
        ip_address=request.client.host if request.client else None,
        user_agent=(request.headers.get("user-agent") or "")[:280],
        expires_at=expires_at,
    )
    admin.last_login_at = now
    db.add(session_row)
    db.commit()

    response.set_cookie(
        key=ADMIN_SESSION_COOKIE,
        value=raw_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        max_age=SESSION_TTL_HOURS * 3600,
        path="/",
    )
    return raw_token


def _extract_raw_token(request: Request) -> Optional[str]:
    cookie_token = request.cookies.get(ADMIN_SESSION_COOKIE)
    if cookie_token:
        return cookie_token.strip()
    auth_header = request.headers.get("authorization") or ""
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    return None


def revoke_admin_session(db: Session, request: Request, response: Response) -> None:
    raw_token = _extract_raw_token(request)
    if raw_token:
        th = _hash_token(raw_token)
        row = db.get(AdminSession, th)
        if row and row.revoked_at is None:
            row.revoked_at = datetime.now(timezone.utc)
            db.commit()
    response.delete_cookie(key=ADMIN_SESSION_COOKIE, path="/")


def require_admin(
    request: Request,
    db: Session = Depends(get_db),
) -> Admin:
    raw_token = _extract_raw_token(request)
    if not raw_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 인증이 필요합니다.",
        )

    th = _hash_token(raw_token)
    session_row = db.get(AdminSession, th)
    if not session_row or session_row.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="유효하지 않거나 만료된 관리자 세션입니다.",
        )

    exp = session_row.expires_at
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자 세션이 만료되었습니다. 다시 로그인해 주세요.",
        )

    admin = db.get(Admin, session_row.admin_id)
    if not admin or not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 관리자 계정입니다.",
        )
    return admin


def write_audit_log(
    db: Session,
    admin: Optional[Admin],
    action: str,
    target_type: str,
    target_id: Optional[str] = None,
    detail: Optional[dict] = None,
    request: Optional[Request] = None,
) -> None:
    log = AuditLog(
        id=f"aud-{uuid.uuid4().hex[:12]}",
        admin_id=admin.id if admin else None,
        admin_email=admin.email if admin else None,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail_json=detail,
        ip_address=request.client.host if request and request.client else None,
    )
    db.add(log)


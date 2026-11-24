"""
동북미식 (DONGBUK TABLE) SQLAlchemy 2.0 데이터베이스 연결 관리
- 운영: PostgreSQL (DATABASE_URL=postgresql+psycopg://...)
- 로컬 개발 Fallback: SQLite (backend_/data/dongbuk_table.db)
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_SQLITE_PATH = DATA_DIR / "dongbuk_table.db"


def get_database_url() -> str:
    raw = (os.getenv("DATABASE_URL") or "").strip()
    if raw:
        # Normalize legacy postgres:// URLs for SQLAlchemy 2.0 + psycopg v3
        if raw.startswith("postgres://"):
            return raw.replace("postgres://", "postgresql+psycopg://", 1)
        if raw.startswith("postgresql://") and "+psycopg" not in raw:
            return raw.replace("postgresql://", "postgresql+psycopg://", 1)
        return raw
    return f"sqlite:///{DEFAULT_SQLITE_PATH.as_posix()}"


DATABASE_URL = get_database_url()
IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine_kwargs = {
    "echo": False,
    "future": True,
    "pool_pre_ping": True,
}
if IS_SQLITE:
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, **engine_kwargs)

if IS_SQLITE:
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON;")
        cursor.execute("PRAGMA journal_mode=WAL;")
        cursor.close()

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    class_=Session,
)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def check_db_health() -> dict:
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {
            "connected": True,
            "dialect": engine.dialect.name,
            "is_postgresql": engine.dialect.name == "postgresql",
        }
    except Exception as exc:
        return {
            "connected": False,
            "dialect": engine.dialect.name,
            "is_postgresql": engine.dialect.name == "postgresql",
            "error": type(exc).__name__,
        }


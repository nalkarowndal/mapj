"""
PostgreSQL 호환 DDL 자동 생성 스크립트
- SQLAlchemy 2.0 Base.metadata를 PostgreSQL Dialect로 컴파일하여
  docs/redesign/db/postgresql_schema.sql 파일로 출력합니다.
"""

from __future__ import annotations

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from sqlalchemy.dialects import postgresql
from sqlalchemy.schema import CreateIndex, CreateTable

from db.database import Base
import db.models  # noqa: F401

OUT_FILE = BASE_DIR.parent / "docs" / "redesign" / "db" / "postgresql_schema.sql"


def export_ddl() -> Path:
    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    pg_dialect = postgresql.dialect()
    lines = [
        "-- ============================================================================",
        "-- 동북미식 (DONGBUK TABLE) PostgreSQL 16 정규화 스키마 DDL",
        "-- SQLAlchemy 2.0 Base.metadata -> postgresql.dialect() 자동 컴파일 산출물",
        f"-- 총 테이블 수: {len(Base.metadata.sorted_tables)}개",
        "-- ============================================================================",
        "",
    ]
    for table in Base.metadata.sorted_tables:
        ddl = str(CreateTable(table).compile(dialect=pg_dialect)).strip()
        lines.append(f"{ddl};")
        for idx in sorted(table.indexes, key=lambda i: i.name or ""):
            idx_ddl = str(CreateIndex(idx).compile(dialect=pg_dialect)).strip()
            lines.append(f"{idx_ddl};")
        lines.append("")

    OUT_FILE.write_text("\n".join(lines), encoding="utf-8")
    return OUT_FILE


if __name__ == "__main__":
    path = export_ddl()
    print(f"Exported PostgreSQL DDL ({len(Base.metadata.sorted_tables)} tables) -> {path}")


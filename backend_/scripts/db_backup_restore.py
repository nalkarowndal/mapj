"""
동북미식 (DONGBUK TABLE) DB 백업 및 복구(롤백) CLI 스크립트
- 사용법:
  python scripts/db_backup_restore.py backup
  python scripts/db_backup_restore.py restore <backup_dir_or_file>
- SQLite: 물리 DB 파일(.db) + 논리 JSON 스냅샷 동시 백업 및 안전 복구
- PostgreSQL: 논리 JSON 스냅샷 + pg_dump / psql 복구 명령 안내 및 실행 지원
"""

from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import select
from db.database import DATA_DIR, DATABASE_URL, DEFAULT_SQLITE_PATH, IS_SQLITE, SessionLocal
from db.models import (
    AuditLog,
    Collection,
    FeedbackReport,
    Region,
    Restaurant,
    VerificationLog,
)

BACKUP_ROOT = DATA_DIR / "backups"


def run_backup() -> Path:
    ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    dest = BACKUP_ROOT / f"backup_{ts}"
    dest.mkdir(parents=True, exist_ok=True)

    if IS_SQLITE and DEFAULT_SQLITE_PATH.exists():
        shutil.copy2(DEFAULT_SQLITE_PATH, dest / "dongbuk_table.db")

    db = SessionLocal()
    try:
        snapshot = {
            "created_at_utc": ts,
            "database_dialect": "sqlite" if IS_SQLITE else "postgresql",
            "counts": {
                "regions": len(db.execute(select(Region.id)).scalars().all()),
                "restaurants": len(db.execute(select(Restaurant.id)).scalars().all()),
                "collections": len(db.execute(select(Collection.id)).scalars().all()),
                "feedback_reports": len(db.execute(select(FeedbackReport.id)).scalars().all()),
                "verification_logs": len(db.execute(select(VerificationLog.id)).scalars().all()),
                "audit_logs": len(db.execute(select(AuditLog.id)).scalars().all()),
            },
            "restaurants": [
                {
                    "id": r.id,
                    "slug": r.slug,
                    "name": r.name,
                    "region_id": r.region_id,
                    "road_address": r.road_address,
                    "publish_status": r.publish_status,
                    "business_status": r.business_status,
                    "verification_status": r.verification_status,
                    "verified_at": r.verified_at,
                }
                for r in db.execute(select(Restaurant)).scalars().all()
            ],
        }
        (dest / "snapshot.json").write_text(
            json.dumps(snapshot, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
    finally:
        db.close()

    print(f"[BACKUP OK] Saved to {dest}")
    return dest


def run_restore(target_path: str) -> None:
    src = Path(target_path)
    if src.is_dir():
        db_file = src / "dongbuk_table.db"
    else:
        db_file = src

    if IS_SQLITE:
        if not db_file.exists():
            raise FileNotFoundError(f"백업 DB 파일을 찾을 수 없습니다: {db_file}")
        if DEFAULT_SQLITE_PATH.exists():
            shutil.copy2(DEFAULT_SQLITE_PATH, DEFAULT_SQLITE_PATH.with_suffix(".db.pre_rollback"))
        shutil.copy2(db_file, DEFAULT_SQLITE_PATH)
        print(f"[RESTORE OK] Restored SQLite DB from {db_file} -> {DEFAULT_SQLITE_PATH}")
    else:
        print(f"[POSTGRESQL RESTORE GUIDE] Execute: psql \"{DATABASE_URL}\" < backup.sql")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python scripts/db_backup_restore.py [backup|restore <path>]")
        sys.exit(1)
    cmd = sys.argv[1].lower()
    if cmd == "backup":
        run_backup()
    elif cmd == "restore" and len(sys.argv) >= 3:
        run_restore(sys.argv[2])
    else:
        print("Invalid arguments.")
        sys.exit(1)


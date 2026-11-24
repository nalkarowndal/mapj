# P5 — 데이터베이스 ERD 및 마이그레이션 명세서 (DB_ERD)

- **ORM / 마이그레이션**: SQLAlchemy 2.1.9 + Alembic 1.20.1 (`psycopg[binary]` v3 PostgreSQL 드라이버 포함)
- **운영 DB 목표**: PostgreSQL 16 (`DATABASE_URL=postgresql+psycopg://...`, `docker-compose.postgres.yml` 제공)
- **로컬 개발 Fallback**: SQLite (`backend_/data/dongbuk_table.db`, `PRAGMA foreign_keys=ON; WAL` 활성화)
- **PostgreSQL 컴파일 검증 DDL**: [postgresql_schema.sql](file:///d:/JSW_React/8_portfolio_123/ai/docs/redesign/db/postgresql_schema.sql) (`SQLAlchemy postgresql.dialect()` 자동 컴파일, 총 20개 테이블)

---

## 1. 전체 ERD (20개 테이블: 핵심 19개 + 서버 세션 1개)

```mermaid
erDiagram
    regions ||--o{ neighborhoods : contains
    regions ||--o{ restaurants : has
    neighborhoods ||--o{ restaurants : locates
    data_sources ||--o{ restaurants : sourced_from
    restaurants ||--o{ restaurant_categories : tagged
    categories ||--o{ restaurant_categories : classifies
    restaurants ||--o{ menus : offers
    restaurants ||--o{ restaurant_images : displays
    restaurants ||--o{ opening_hours : operates
    restaurants ||--o{ restaurant_features : provides
    features ||--o{ restaurant_features : defines
    collections ||--o{ collection_restaurants : curates
    restaurants ||--o{ collection_restaurants : included_in
    restaurants ||--o{ verification_logs : audited_by
    admins ||--o{ verification_logs : performs
    restaurants ||--o{ feedback_reports : receives
    admins ||--o{ feedback_reports : handles
    users ||--o{ bookmarks : saves
    restaurants ||--o{ bookmarks : saved_by
    admins ||--o{ admin_sessions : holds
    admins ||--o{ audit_logs : records
```

---

## 2. 테이블 요약 및 핵심 무결성 제약

| # | 테이블명 | 주요 역할 | 핵심 제약 / 인덱스 |
|---|---|---|---|
| 1 | `regions` | 서울 동북권 5개 자치구 마스터 | `UNIQUE(slug)` |
| 2 | `neighborhoods` | 자치구별 주요 상권 20곳 | `FK(region_id)`, `UNIQUE(slug)` |
| 3 | `data_sources` | 데이터 출처 및 라이선스 관리 | `UNIQUE(name)` |
| 4 | `restaurants` | 통합 맛집 마스터 (단일 진실 공급원) | `UNIQUE(slug)`, `UNIQUE(name, road_address)`, `INDEX(region_id, publish_status, business_status)`, `INDEX(kakao_place_id)` |
| 5 | `categories` | 12개 표준 음식 분류 (+ UI 전체) | `UNIQUE(slug)` |
| 6 | `restaurant_categories` | 매장-카테고리 M:N 매핑 | 복합 PK `(restaurant_id, category_id)` |
| 7 | `menus` | 대표/일반 메뉴 및 가격 | `FK(restaurant_id)` |
| 8 | `restaurant_images` | 매장 사진 및 출처/저작자/라이선스/AI여부 | `FK(restaurant_id)` |
| 9 | `opening_hours` | 요일별(0~6) 영업/브레이크/휴무 구조화 | `FK(restaurant_id)` |
| 10 | `features` | 방문목적·편의시설 8종 마스터 | `UNIQUE(slug)` |
| 11 | `restaurant_features` | 매장별 확인 상태(`confirmed`/`unavailable`/`unknown`) | 복합 PK `(restaurant_id, feature_id)` |
| 12 | `collections` | 10대 미식 큐레이션 테마 | `UNIQUE(slug)` |
| 13 | `collection_restaurants` | 테마-매장 매핑 및 노출 순서 | 복합 PK `(collection_id, restaurant_id)` |
| 14 | `admins` | 관리자 계정 (PBKDF2-SHA256 해시) | `UNIQUE(email)` |
| 15 | `admin_sessions` | 서버 측 세션 토큰 해시(로그아웃 즉시 무효화) | `PK(token_hash)`, `FK(admin_id)` |
| 16 | `verification_logs` | 카카오 API/수동 검증 이력 | `FK(restaurant_id)`, `FK(admin_id)` |
| 17 | `feedback_reports` | 사용자 정보 수정/폐업 제보 | `FK(restaurant_id)`, `FK(handled_by_admin_id)` |
| 18 | `users` | 향후 회원 기능 확장 대비 | `UNIQUE(email)` |
| 19 | `bookmarks` | 회원 북마크 확장 테이블 | `UNIQUE(user_id, restaurant_id)` |
| 20 | `audit_logs` | 관리자 로그인/등록/수정/삭제/API 설정 감사 로그 | `INDEX(admin_id)`, `INDEX(action)` |

---

## 3. 마이그레이션·PostgreSQL 전환 및 백업/롤백 명령

```bash
# 1) PostgreSQL 컨테이너 기동 (운영/스테이징 전환 시)
docker compose -f docker-compose.postgres.yml up -d
# backend_/.env 에 DATABASE_URL=postgresql+psycopg://dongbuk:dongbuk_dev_pw@localhost:5432/dongbuk_table 설정

# 2) Alembic 스키마 마이그레이션 적용 / 롤백
cd backend_
alembic upgrade head
alembic downgrade -1

# 3) 멱등 시드 적재 (28건 에디터 검증 + 82건 카카오 확장 실존 매장 = 110건)
python -m db.seed

# 4) PostgreSQL DDL 재생성
python scripts/export_postgres_ddl.py

# 5) DB 백업 및 복구
python scripts/db_backup_restore.py backup
python scripts/db_backup_restore.py restore backend_/data/backups/backup_YYYYMMDD_HHMMSS
```


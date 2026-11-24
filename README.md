# 동북미식 (DONGBUK TABLE)

> **다섯 개의 동네, 수많은 맛의 이야기.**  
> **우리 동네의 맛있는 발견, 동북미식.**

서울 동북권 5개 자치구(**노원구 · 도봉구 · 강북구 · 중랑구 · 성북구**)의 실존 로컬 식당과 상권의 미식 문화를 정직한 기준으로 소개하는 **지역 특화 맛집 큐레이션 플랫폼**입니다.

기존 AI 채팅·지도 대시보드 프로토타입(`맛탐정 동북`)에서 벗어나, 따뜻한 로컬 매거진 감성의 상용 서비스 아키텍처(Next.js 16 + FastAPI + SQLAlchemy 2.0 PostgreSQL 호환 DB + Kakao Maps SDK + Groq AI 컨시어지 + 서버 인증 관리자 콘솔)로 전면 재구축했습니다.

---

## 주요 기능

- **홈 & 5개 자치구 미식 가이드 (`/`, `/regions`, `/regions/[slug]`)**: 각 자치구의 고유한 미식 스토리, 핵심 상권 20곳, 에디터 추천 맛집, 지역별 지도 토글 제공
- **통합 맛집 탐색 & 상세 (`/restaurants`, `/restaurants/[slug]`)**: URL 쿼리 동기화 검색, 12개 표준 카테고리·가격대·방문목적·편의시설 상세 필터, Schema.org `Restaurant` JSON-LD(미검증 평점 배제), 미니 카카오맵, 도로명주소 복사, 정보 수정·폐업 제보(`/feedback`)
- **10대 미식 테마 큐레이션 & 저장 (`/collections`, `/collections/[slug]`, `/saved`)**: 노포·카페거리·가족 외식·혼밥·등산 후 한 끼 등 10개 큐레이션 테마와 LocalStorage 기반 찜 목록
- **독립 지도 탐색 (`/map`)**: Kakao Maps Web SDK 7단계 라이프사이클, `ResizeObserver + relayout`, 단일 지도 인스턴스 `panTo` 전환, `CustomOverlay` 마커 라벨, 현 지도 영역 재검색, 모바일 바텀시트 및 장애 시 안전한 대체 안내
- **실존 DB 기반 AI 맛집 추천 (`/concierge`)**: 자연어 의도 분석 → 검증된 통합 DB 선조회 → 실존 매장 ID만 Groq LLM에 전달하여 추천 이유 작성 (`확인된 매장 정보`와 `AI 추천 이유` 명확 분리, 미등록/불가능 질의 환각 0건 차단, 외부 장애 시 DB Fallback)
- **정규화 데이터베이스 & 실존 검증 파이프라인**: SQLAlchemy 2.0 20개 테이블(PostgreSQL 16 DDL + Alembic 마이그레이션 + 백업/복구 CLI), 카카오 로컬 REST API 교차 검증을 거친 **110개 실존 매장(5개 자치구 각 22곳)**, 가상 데이터·미검증 평점 0건
- **서버 인증 관리자 콘솔 (`/admin`, `/admin/login`)**: 공개 UI와 완전히 분리된 레이아웃(`noindex, nofollow`), PBKDF2-SHA256 비밀번호 해싱, 로그인 Rate Limiting, 서버 세션(`HttpOnly` 쿠키/Bearer), 맛집 CRUD(`409` 중복 차단)·실시간 카카오 재검증·Pillow 시그니처 검증 이미지 업로드·제보 처리·외부 API 키 설정

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| **Frontend** | Next.js 16.2.12 (App Router, Turbopack), React 19.2.4, TypeScript, Tailwind CSS 4, Redux Toolkit, Lucide React |
| **Backend** | Python 3.14, FastAPI, Pydantic v2, SQLAlchemy 2.1, Alembic, `psycopg[binary]` v3, Pillow, Cryptography |
| **Database** | PostgreSQL 16 (`docker-compose.postgres.yml`, `postgresql_schema.sql`) / 로컬 개발 SQLite 자동 Fallback |
| **External APIs** | Kakao Maps Web SDK, Kakao Local REST API, Groq LLM API |
| **QA & Automation** | Playwright (Python), 6개 도메인·9대 해상도 통합 QA 스위트 (`qa/run_dongbuk_qa_suite.py`) |

---

## 빠른 실행 가이드

### 1. 환경 변수 준비

```bash
# Backend
cp backend_/.env.example backend_/.env

# Frontend
cp frontend/.env.example frontend/.env.local
```

> **주의**: `.env`, `.env.local`, `backend_/data/`, `backend_/uploads/`, `settings.json`, `*.key`는 Git에 커밋하지 마세요.

### 2. 백엔드 실행 (FastAPI + DB 마이그레이션 & 시드)

```bash
cd backend_
pip install -r requirements.txt

# (선택) PostgreSQL 운영/스테이징 전환 시:
# docker compose -f ../docker-compose.postgres.yml up -d
# backend_/.env 에 DATABASE_URL=postgresql+psycopg://dongbuk:dongbuk_dev_pw@localhost:5432/dongbuk_table 설정

alembic upgrade head
python -m db.seed
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

### 3. 프론트엔드 실행 (Next.js)

```bash
cd frontend
npm install
npm run dev        # 개발 서버 (http://localhost:3000)
# 또는 프로덕션 빌드 & 실행:
npm run build && npm run start
```

### 4. 관리자 콘솔 및 데이터 백업·검증 CLI

- 관리자 로그인: `http://localhost:3000/admin/login` (초기 계정은 `backend_/.env`의 `ADMIN_DEFAULT_EMAIL` / `ADMIN_DEFAULT_PASSWORD`로 최초 1회 해시 생성)
- 카카오 로컬 실존 매장 수집/교차 검증: `python backend_/scripts/collect_and_verify_kakao.py`
- DB 백업 및 롤백:
  ```bash
  cd backend_
  python scripts/db_backup_restore.py backup
  python scripts/db_backup_restore.py restore data/backups/backup_YYYYMMDD_HHMMSS
  ```

### 5. 통합 자동 QA 실행

```bash
python qa/run_dongbuk_qa_suite.py --base-url http://localhost:3000 --api-url http://127.0.0.1:8000
```

---

## 주요 설계·감사 문서 (`docs/redesign/`)

- [PROJECT_AUDIT.md](docs/redesign/PROJECT_AUDIT.md) — 기존 프로젝트 감사
- [SITE_ARCHITECTURE.md](docs/redesign/SITE_ARCHITECTURE.md) & [UX_FLOW.md](docs/redesign/UX_FLOW.md) — 정보 구조 및 사용자 동선
- [DESIGN_SYSTEM.md](docs/redesign/DESIGN_SYSTEM.md) & [VISUAL_DIRECTION.md](docs/redesign/VISUAL_DIRECTION.md) — 브랜드·디자인 토큰·타이포그래피
- [DB_ERD.md](docs/redesign/DB_ERD.md) & [db/postgresql_schema.sql](docs/redesign/db/postgresql_schema.sql) — 20개 테이블 ERD 및 PostgreSQL DDL
- [ADMIN_API_SPEC.md](docs/redesign/ADMIN_API_SPEC.md) & [ADMIN_MANUAL.md](docs/redesign/ADMIN_MANUAL.md) — 관리자 API 및 운영 매뉴얼
- [DATA_COLLECTION_REPORT.md](docs/redesign/DATA_COLLECTION_REPORT.md) — 카카오 실존 검증 데이터 리포트 (110건 실측)
- [QA_FINAL_REPORT.md](docs/redesign/QA_FINAL_REPORT.md) — 9대 해상도·접근성·보안·SEO·Core Web Vitals 최종 검수 리포트
- [PROGRESS.md](docs/redesign/PROGRESS.md) — P0~P6 단계별 진행 이력

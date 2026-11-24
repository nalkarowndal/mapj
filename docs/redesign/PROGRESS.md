# 동북미식 (DONGBUK TABLE) 리디자인 진행 현황 (PROGRESS)

- **활성 브랜치**: `feature/dongbuk-table-redesign`
- **기준 브랜치**: `main` (보존, 승인 전 병합 금지)
- **최종 업데이트**: 2026-11-24

---

## 전체 단계 진행표

| 단계 | 단계명 | 상태 | 완료일 | 주요 산출물 / 비고 |
|---|---|---|---|---|
| **P0** | 기존 분석 및 신규 서비스 설계 | **PASS** | 2026-11-24 | 감사·설계 문서 6종, `PROGRESS.md`, Baseline 스크린샷 4종 확보 |
| **P1** | 브랜드 및 디자인 시스템 구축 | **PASS** | 2026-11-24 | `DESIGN_SYSTEM.md`, `VISUAL_DIRECTION.md`, `COMPONENT_GUIDE.md`, `ASSET_MANIFEST.md`, 에디토리얼 이미지 10종 + 플레이스홀더 SVG, 공통 UI 12종, 4개 해상도 시각 QA PASS |
| **P2** | 홈페이지 및 지역별 페이지 구현 | **PASS** | 2026-11-24 | 백엔드 단일 Public API(28건 100% 카카오 실존 검증), 신규 홈페이지(`/`), `/regions`, 5개 자치구(`/regions/[slug]`) 구현 및 4개 해상도+전 페이지 시각 QA PASS |
| **P3** | 맛집 탐색 및 상세 페이지 구현 | **PASS** | 2026-11-24 | `/restaurants`(URL searchParams·상세필터·정렬·페이지네이션), `/restaurants/[slug]`(JSON-LD·미니맵·방문정보), `/collections/*`, `/saved`(LocalStorage), `/about`, `/feedback`, `sitemap.xml`, `robots.txt` 및 전체 E2E PASS |
| **P4** | 지도 및 AI 추천 기능 고도화 | **PASS** | 2026-11-24 | `/map`(Kakao Maps SDK 7단계 라이프사이클·`CustomOverlay`·데스크톱 38:62·모바일 바텀시트·장애 fallback), `/concierge`(DB 선조회·실존 ID 제한 Groq AI·환각 차단·기록 아코디언) 및 지도 회귀+AI 신뢰성 QA PASS |
| **P5** | 데이터베이스 및 관리자 시스템 | **PASS** | 2026-11-24 | SQLAlchemy 2.0 20개 테이블(PostgreSQL DDL·Alembic·백업/복구), 110건 카카오 실존 통합 DB, 서버 인증 `/admin` CRUD·이미지·API 설정 이전 및 보안/QA PASS |
| **P6** | 자동 QA 및 최종 품질 고도화 | 대기 (사용자 승인 후 착수) | - | 9대 해상도 Playwright QA, 보안/SEO/성능 검수, README |

---

## P0 완료 기록 (2026-11-24)

- `feature/dongbuk-table-redesign` 브랜치 생성 및 최신 저장소 상태 확인 완료.
- 프론트엔드(`Next.js 16.2.12`, `React 19.2.4`, `Tailwind CSS 4.3.3`) 및 백엔드(`FastAPI`, `Groq`, `Kakao Maps SDK`) 라이브 동작 확인 (`HTTP 200`, `live_api`).
- 데이터 감사에서 치명 결함 확인: 24/24건 `address`/`road_address` 필드 뒤바뀜, 24/24건 미검증 정적 평점·리뷰 수, 24/24건 이미지 0건, 프론트-백엔드 100% 중복, 초기 샘플 찜 목록 하드코딩.
- 카카오 로컬 REST API 24건 전수 실존 교차 검증 완료: 14건 실존 확인(단, 이 중 4건 도로명주소 오류·4건 전화번호 불일치 식별), 1건 오매칭, 9건 미확인(`needs_verification` 격리 예정).
- 기존 테스트(`test_mock_kakao_map_live.py`) 실측 실행: Mock Kakao 지도 캔버스 렌더링 PASS, `SettingsModal` 키 기등록 상태 placeholder 불일치로 Timeout FAIL 확인(기존 `v2_3` 아카이브 스크린샷 원복 보존).
- 리디자인 전 기준(Baseline) 스크린샷 4종(`1440×900`, `768×1024`, `390×844`, `320×700`) 캡처 및 육안 시각 결함 진단 완료.
- P0 필수 산출물 6종 작성 완료 → 사용자 승인 후 P1 착수 예정.

## P4 완료 기록 (2026-11-24)

- **지도 탐색 (`/map`)**:
  - `frontend/components/map/MapExplorer.tsx` 및 `frontend/app/map/page.tsx` 구현.
  - 기존 7단계 Kakao Maps SDK 라이프사이클(`config_loading` → `key_missing` → `sdk_loading` → `sdk_ready` → `map_initializing` → `map_ready` → `error`), `ResizeObserver + relayout()`, 단일 지도 인스턴스 재사용 및 `panTo()` 전환을 그대로 보존하고 신규 warm editorial 디자인으로 통합.
  - 데스크톱(좌측 38% 목록 + 우측 62% 지도), 모바일(전체 화면 지도 + 접기/펼치기 바텀시트), "현 지도 영역에서 재검색", `CustomOverlay` 기반 깔끔한 마커 라벨, 키 미설정/SDK 장애 시 가짜 벡터 지도 및 관리자 API 설정을 노출하지 않는 안전한 대체 안내 UI 구현.
- **AI 맛집 추천 (`/concierge`)**:
  - `backend_/routers/concierge.py` (`POST /api/concierge/recommend`), `frontend/store/conciergeSlice.ts`, `frontend/components/concierge/ConciergeClient.tsx`, `frontend/app/concierge/page.tsx` 구현.
  - 자연어 질의 구조화 → 단일 검증 카탈로그(`gourmet_catalog`) 선조회 → 실존 매장 ID만 Groq LLM에 전달하여 추천 이유 생성(`qwen/qwen3.8-27b` 자동 폴백 포함) → 외부 AI 장애 시 DB 기반 안전 Fallback 전환.
  - 지시문 §15.2 예시 질문 5종 전부 실존 DB ID 반환(`is_fallback=False`) 및 미등록/불가능한 질의 2종 0건 반환(환각 차단) 실측 검증 PASS.
  - UI에서 `확인된 매장 정보`와 `AI 추천 이유` 시각적 명확 분리 및 접이식 `이전 추천 기록` 구현.
- **빌드 및 시각/회귀 QA**:
  - `next build` 16개 라우트 TypeScript/프로덕션 빌드 PASS.
  - Playwright 지도 회귀(실제 타일·지역 전환·미설정 fallback·모바일 바텀시트) + AI 컨시어지 데스크톱/모바일 검수 `failures=0`, 콘솔 오류 `0`건, 스크린샷 6종 육안 확인 PASS (`docs/redesign/screenshots/p4_map_concierge/`).

## P5 완료 기록 (2026-11-24)

- **정규화 데이터베이스 & PostgreSQL 호환 마이그레이션**:
  - `backend_/db/database.py`, `backend_/db/models.py`, `backend_/db/auth.py`, `backend_/db/seed.py` 구현 (핵심 19개 테이블 + 서버 세션 `admin_sessions` = 총 20개 테이블, `UNIQUE(name, road_address)` 중복 차단 제약).
  - Alembic 초기 마이그레이션(`backend_/alembic/versions/0001_initial_schema.py`) 적용, `postgresql.dialect()` 기반 `docs/redesign/db/postgresql_schema.sql` 컴파일 생성, `docker-compose.postgres.yml` 및 백업/복구 CLI(`backend_/scripts/db_backup_restore.py`) 구축·실측 검증.
- **단일 DB 통합 & 카카오 실존 수집/검증 파이프라인**:
  - `backend_/scripts/collect_and_verify_kakao.py` 실측 실행으로 5개 자치구 각 22건, 총 **110건** 100% 카카오 로컬 실존 검증 매장 확보(타 자치구 14건·중복 6건·도로명 미기재 1건 자동 거부, 가상 매장 0건).
  - `backend_/gourmet_catalog.py` 및 `POST /api/feedback`을 SQLAlchemy DB 실시간 조회/저장으로 전환.
- **서버 인증 관리자 API & 독립 `/admin` 콘솔**:
  - PBKDF2-SHA256(310,000회) 비밀번호 해싱, 로그인 실패 분당 5회 Rate Limiting, 서버 DB 세션(`HttpOnly` 쿠키/Bearer), 로그아웃 즉시 무효화 구현.
  - 미인증 상태에서 `/api/admin/*` 및 레거시 `/api/settings/*` 변경·상태 조회 7종 모두 `401 Unauthorized` 반환 확인.
  - 독립 레이아웃 `/admin`, `/admin/login` 구축(대시보드, 맛집 CRUD + `409 Conflict` 중복 차단 + 실시간 카카오 재검증, Pillow 시그니처/5MB 검증 이미지 업로드, 지역/테마, 제보/검증 로그, 외부 API 설정 이전).
- **문서 산출물 및 QA**:
  - `DB_ERD.md`, `db/postgresql_schema.sql`, `ADMIN_API_SPEC.md`, `ADMIN_MANUAL.md`, `DATA_COLLECTION_REPORT.md` 작성, `next build`(18개 라우트) 및 보안/CRUD/Playwright `/admin` 시각 QA 스크린샷 4종 육안 확인 PASS.


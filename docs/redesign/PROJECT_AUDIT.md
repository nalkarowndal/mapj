# P0 — 기존 프로젝트 전수 감사 보고서 (PROJECT_AUDIT)

- **작성일**: 2026-11-24
- **기준 브랜치**: `feature/dongbuk-table-redesign` (기준 커밋: `main@b5d09a7`)
- **기존 서비스명**: 맛탐정 동북 (v2.2) → **신규 서비스명**: 동북미식 (`DONGBUK TABLE`)
- **감사 대상**: `frontend/`, `backend_/`, `docs/`, Playwright QA 스크립트

---

## 1. 실제 저장소 기술 스택 및 실행 환경 확인

| 영역 | 기술 / 패키지 | 실제 확인 버전 | 비고 |
|---|---|---|---|
| Frontend Framework | Next.js (App Router, Turbopack) | `16.2.12` | `params`/`searchParams` Promise 비동기 규격 적용 대상 |
| UI Runtime | React / React DOM | `19.2.4` | Server Component 기본 + 최소 Client Component 전환 |
| Language | TypeScript | `5.x` | Strict 타입 관리 |
| Styling | Tailwind CSS / `@tailwindcss/postcss` | `4.3.3` | CSS-first `@theme inline` 토큰 체계 도입 |
| State | Redux Toolkit / react-redux | `2.13.0` / `9.3.0` | 단일 `chatSlice` 과밀화 해소 필요 |
| Icons | `react-icons` (현재) → `lucide-react` (도입 예정) | `5.7.0` | 선형 아이콘 통일을 위해 `lucide-react` 추가 |
| Backend | Python FastAPI + Uvicorn + Pydantic | FastAPI `>=0.115.0` | `http://127.0.0.1:8000` 정상 가동 확인 |
| AI / Map | Groq API (`llama-3.3-70b-versatile`), Kakao REST & Maps Web SDK v2 | 연결 정상 (`live_api`) | 로컬 `.env` / AES-256 `settings.json`에 키 등록 확인 |
| QA / Test | Python Playwright (Chromium) | 정상 동작 | 4개 기준 해상도 캡처 완료 |

### 라이브 실행 및 기존 테스트 점검 결과 (2026-11-24 실측)
- `GET http://127.0.0.1:8000/api/health`: **HTTP 200 OK** (`groq_status: connected`, `kakao_rest_status: connected`, `kakao_js_status: configured`, `total_curated_restaurants: 24`)
- `GET http://127.0.0.1:3000/api/health`: **HTTP 200 OK** (`next.config.ts` rewrite 정상 동작)
- `GET http://127.0.0.1:3000`: **HTTP 200 OK** (콘솔 에러 0건, Hydration 에러 0건, 실제 Kakao Maps 도로·마커 타일 정상 렌더링 확인)
- **기존 QA 테스트 실행 결과 (`test_mock_kakao_map_live.py`)**:
  - 1단계(Mock Kakao SDK 주입 및 `desktop_1440x900` 라이브 캔버스 렌더링): **PASS**
  - 2단계(`SettingsModal` 카카오 JS 탭 입력창 `input[placeholder*='JavaScript Key']`): **FAIL (Timeout 30s)** — 실제 카카오 JS 키가 이미 등록된 환경에서는 placeholder가 `"새로운 JavaScript 키를 입력하여 변경..."`으로 바뀌어 테스트 셀렉터가 실패함.
  - 기타 구 스크립트(`run_visual_qa_suite.py`, `run_kakao_map_qa_suite.py`): v2.2/v2.3 시절 셀렉터(`노원구에서 조용한 스터디 카페 추천해 줘` 등)에 종속되어 P6에서 신규 Playwright E2E/시각/지도 회귀 스위트로 재구축 필요.
- **기존 UI 공통 컴포넌트 자산 확인**: `Modal.tsx`(포커스 트랩·Esc 닫기·복원 우수 → 라이트 테마 리디자인 후 보존), `providers.tsx`(SSR-safe `useRef` Redux 스토어 패턴 → 유지), `Button.tsx`·`Badge.tsx`·`Card.tsx`(다크 테마 하드코딩 → P1에서 전면 교체).

---

## 2. 실제 화면(Baseline) 기반 UI/UX 문제점 진단

리디자인 전 기준 스크린샷(`docs/redesign/screenshots/p0_baseline/*.png`) 육안 검수 및 소스 코드 분석에서 확인된 핵심 결함:

1. **복합 대시보드 과밀 구조 (1440×900)**
   - 좌측 사이드바 + 중앙 맛집 목록 + 우측 상단 지도 + 우측 하단 AI 채팅까지 **4개 독립 스크롤 영역**이 한 화면에 동시에 배치되어 상용 맛집 소개 사이트가 아닌 사내 관리자 프로그램처럼 보임.
2. **네이비·골드 다크 테마 및 과도한 시각 노이즈**
   - `#0B1120` 네이비 배경, `#FDE047` 골드 강조, 반복적인 그라데이션·글래스모피즘(`backdrop-blur`)·테두리가 음식 콘텐츠 자체의 매력을 저해함.
3. **음식 사진 완전 부재 (0/24건)**
   - 모든 맛집 카드가 이모지 아이콘과 색상 그라데이션 박스로만 표현되어 맛집 소개 플랫폼의 핵심 가치인 시각적 식욕과 매장 분위기가 전혀 전달되지 않음.
4. **중복 내비게이션 및 레이아웃 깨짐**
   - 자치구 선택기가 헤더·사이드바·중앙 패널에 3중 중복 배치됨.
   - 1440px 헤더의 자치구 버튼(`노원/구`, `도봉/구`)과 우측 모드 탭이 2줄로 줄바꿈됨.
   - 320px 모바일에서 로고(`맛탐ㅈ`), 테마 카드 제목(`세월이 검증...`), 맛집명(`털보고...`)이 심각하게 잘림.
5. **모달 의존형 상세 정보 & 단일 URL 구조**
   - 모든 콘텐츠가 `/` 단일 페이지와 `PlaceDetailModal`에 갇혀 있어 지역별·매장별 URL 공유, 뒤로 가기, SEO 색인이 불가능함.
6. **일반 사용자 UI에 API 설정 노출**
   - 헤더와 사이드바에 `설정` / `API 및 지도 설정` 버튼이 상시 노출되어 일반 사용자가 `SettingsModal`에 직접 접근 가능.
7. **하드코딩 API 주소 및 데이터 중복**
   - `ChatPanel.tsx`의 `http://localhost:8000` 하드코딩, `next.config.ts`의 `http://127.0.0.1:8000` 고정.
   - `frontend/lib/districtData.ts`와 `backend_/places_database.py`에 24개 맛집이 중복 정의됨.
8. **레거시 프로토타입 잔존**
   - `backend_/app.py`, `backend_/app2.py`는 과거 Streamlit 프로토타입으로 현재 서비스에서 미사용.

---

## 3. 기존 기능 및 파일 마이그레이션 분류표 (유지 · 수정 · 이전 · 제거)

| 분류 | 대상 파일 / 기능 | 처리 방침 및 사유 |
|---|---|---|
| **유지 (Preserve)** | `backend_/settings_manager.py` (AES-256 Fernet 암호화 저장소, 키 지문 로깅, 연결 테스트) | 검증된 A+ 보안 자산. 관리자 인증 뒤로 보호하여 그대로 활용. |
| **유지 (Preserve)** | `KakaoMapView.tsx` 핵심 엔진 (7단계 상태 머신, `autoload=false`, `ResizeObserver`+`relayout`, `panTo`, 중복 스크립트 방지) | P4 `/map` 전용 페이지 및 `/restaurants/[slug]` 미니맵으로 핵심 로직 100% 보존. |
| **유지 (Preserve)** | `backend_/main.py` Groq AI 추론 및 로컬 Fallback 패턴 | `/api/concierge/recommend`로 고도화하며 `/api/chat`, `/api/places` 호환성 유지. |
| **수정 (Refactor)** | `frontend/app/layout.tsx`, `globals.css`, `next.config.ts` | 동북미식 라이트 에디토리얼 디자인 토큰(`#F8F5EF`, `#283A30`, `#B65C37`), `Noto Serif KR`+`Pretendard`, 환경변수 기반 `BACKEND_INTERNAL_URL` 프록시, `next/image` 설정. |
| **수정 (Refactor)** | `frontend/store/chatSlice.ts` → 도메인별 Slice 분리 | 단일 `chatSlice`에서 `bookmarksSlice`(LocalStorage, 빈 초기값), `mapSlice`, `conciergeSlice`로 분리. |
| **수정 (Refactor)** | `backend_/places_database.py` → SQLite/PostgreSQL ORM DB | 24건 주소 필드 뒤바뀜 수정, 미검증 평점/리뷰 수 제거, 정규화 테이블 및 마이그레이션 구축. |
| **수정 (Refactor)** | `PlaceDetailModal.tsx` | 상세 페이지(`/restaurants/[slug]`)를 기본으로 두고, 지도 탐색 빠른 미리보기용으로만 축소 유지. |
| **이전 (Migrate)** | `SettingsModal.tsx` 및 `/api/settings/*` | 일반 사용자 헤더에서 완전 제거 → `/admin` 관리자 인증 보호 영역(`/api/admin/settings/*`)으로 이전. |
| **이전 (Migrate)** | `ChatPanel.tsx` / AI 추천 기능 | 메인 페이지 상시 노출 제거 → `/concierge` 전용 AI 맛집 추천 페이지로 독립. |
| **이전 (Migrate)** | `MapContainer.tsx` / 지도 탐색 | 메인 페이지 상시 분할 제거 → `/map` 전용 지도 탐색 페이지 및 지역 페이지 선택적 지도 펼치기로 이전. |
| **제거 (Remove/Retire)** | `Sidebar.tsx`, `AppLayout.tsx` (4패널 대시보드 구조) | 상용 맛집 매거진 상단 헤더 + 멀티페이지 App Router 레이아웃으로 대체. |
| **제거 (Remove/Retire)** | `InteractiveMapFallback.tsx` (가짜 좌표계 벡터 맵) | 지시문 14절 원칙에 따라 가짜 지도 제거 → 간결한 안내 + 맛집 목록 + 외부 카카오맵/네이버지도 링크 제공. |
| **제거 (Remove/Retire)** | `frontend/lib/districtData.ts` 내 중복 `INITIAL_CURATED_PLACES` 24건 및 `chatSlice.ts` 샘플 `bookmarkedIds` | 백엔드 단일 데이터 원본(Single Source of Truth)으로 통합. |
| **보존(아카이브)** | `backend_/app.py`, `backend_/app2.py`, `docs/qa/*`, 기존 QA 스크립트 | 무분별한 삭제 금지 원칙에 따라 유지하되 신규 Playwright 스위트를 별도 구성. |

---

## 4. 레퍼런스 벤치마킹 핵심 시사점

| 레퍼런스 | 동북미식(`DONGBUK TABLE`) 채택 요소 | 배제 요소 |
|---|---|---|
| **Eater (Seoul 38)** | 대형 음식 사진, 지역 스토리텔링, 세리프 헤딩 + 넉넉한 여백의 에디토리얼 리듬 | 영문 위주 긴 단일 리스트 |
| **미쉐린 가이드** | 절제된 컬러, 깔끔한 4:3/3:2 음식 사진 카드, 신뢰 기반 에디터 노트(미검증 별점 배제) | 파인다이닝 위주의 거리감 |
| **다이닝코드** | 지역·카테고리·방문목적(혼밥/가족/주차) 직관적 탐색, 명확한 방문 핵심 정보 | 높은 정보 밀도·광고성 배너·과도한 그래프 |
| **캐치테이블 / 식신** | 모바일 바텀시트 필터, 명확한 영업 상태 표시, 직관적인 지도-목록 연동 | 예약 슬롯/대기열(미제공 기능) 모방 금지 |
| **카카오맵 / 네이버 지도** | 데스크톱 좌측 목록(35~40%) + 우측 지도(60~65%), 모바일 전체 지도 + 확장형 바텀시트 | 메인 홈에 지도를 강제 고정하는 구조 |


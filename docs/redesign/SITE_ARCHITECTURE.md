# P0 — 신규 사이트 정보 구조 및 아키텍처 (SITE_ARCHITECTURE)

- **서비스명**: 동북미식 (`DONGBUK TABLE`)
- **핵심 슬로건**: *다섯 개의 동네, 수많은 맛의 이야기. 우리 동네의 맛있는 발견, 동북미식.*

---

## 1. 사이트맵 (Next.js App Router)

| URL | 페이지명 | 디자인 콘셉트 | 렌더링 전략 | SEO 색인 |
|---|---|---|---|---|
| `/` | 메인 홈페이지 | **A. 로컬 미식 매거진형** | Server Component (SSR/ISR) | 허용 |
| `/regions` | 지역별 맛집 인덱스 | **A. 로컬 미식 매거진형** | Server Component | 허용 |
| `/regions/[slug]` | 자치구별 미식 가이드 (`nowon`, `dobong`, `gangbuk`, `jungnang`, `seongbuk`) | **A. 로컬 미식 매거진형** | Server Component + `generateMetadata` | 허용 |
| `/restaurants` | 전체 맛집 탐색·검색 | **B. 맛집 검색 플랫폼형** | Server Component (`searchParams`) + Client Filter | 허용 |
| `/restaurants/[slug]` | 맛집 상세 페이지 | **A + B 결합** (사진 중심 + 방문 정보) | Server Component + JSON-LD + `generateMetadata` | 허용 |
| `/collections` | 테마별 미식 큐레이션 목록 | **A. 로컬 미식 매거진형** | Server Component | 허용 |
| `/collections/[slug]` | 테마 큐레이션 상세 | **A. 로컬 미식 매거진형** | Server Component + `generateMetadata` | 허용 |
| `/map` | 지도 기반 맛집 탐색 | **C. 지도 기반 탐색형** | Server Shell + Client KakaoMap | 허용 |
| `/concierge` | AI 맛집 추천 컨시어지 | **미니멀 컨시어지형** | Server Shell + Client Concierge | 허용 |
| `/saved` | 저장한 맛집 | **B. 맛집 검색 플랫폼형** | Client (LocalStorage Hydration-Safe) | `noindex` |
| `/about` | 서비스 소개 | 에디토리얼 정보 페이지 | Static Server Component | 허용 |
| `/feedback` | 정보 수정 제보 | 클린 폼 페이지 | Server Shell + Client Form | 허용 |
| `/admin` | 관리자 대시보드 (인증·CRUD·검수·제보·API 설정) | 업무 효율형 관리 UI | Client + FastAPI Auth Guard | `noindex, nofollow` |
| `/sitemap.xml` | 동적 사이트맵 | Next.js Metadata Route | Server | 허용 |
| `/robots.txt` | 크롤러 제어 (`/admin`, `/saved` 제외) | Next.js Metadata Route | Server | 허용 |
| `/not-found` | 커스텀 404 페이지 | 브랜드 통일 오류 페이지 | Static | - |

---

## 2. URL 쿼리 파라미터 규격 (`searchParams`)

`/restaurants` 및 `/map` 페이지는 동일한 검색 파라미터 계약을 공유하여 새로고침, 뒤로 가기, 링크 공유 시 완전히 동일한 결과를 복원합니다.

| 파라미터 | 타입 | 예시 | 설명 |
|---|---|---|---|
| `q` | `string` | `생선구이` | 매장명, 대표메뉴, 자치구, 동네, 상권, 특징 통합 검색 |
| `region` | `string` | `nowon` | 자치구 슬러그 (`nowon`, `dobong`, `gangbuk`, `jungnang`, `seongbuk`) |
| `neighborhood` | `string` | `공릉동` | 상세 동네 / 상권 필터 |
| `category` | `string` | `korean` | 세분화 음식 카테고리 슬러그 (13종) |
| `price` | `string` | `under_15000` | 가격대 (`under_10000`, `10000_20000`, `20000_40000`, `over_40000`) |
| `features` | `string` (comma) | `solo_dining,parking` | 방문목적·편의시설 다중 선택 |
| `open_now` | `boolean` | `true` | 현재 한국시간 기준 영업 중 필터 (불충분 데이터는 제외) |
| `sort` | `string` | `recommended` | `recommended`, `verified_recent`, `name_asc`, `price_asc`, `price_desc` |
| `page` | `number` | `1` | 페이지 번호 (기본 12개/페이지) |

---

## 3. 프론트엔드 디렉터리 아키텍처

```text
frontend/
├── app/
│   ├── layout.tsx                  # Noto Serif KR + Pretendard, Metadata, Global Header/Footer
│   ├── globals.css                 # Tailwind v4 @theme inline + 동북미식 컬러 토큰
│   ├── page.tsx                    # 홈페이지 (Hero, 5개 지역, 에디터 추천, 테마, AI 소개)
│   ├── not-found.tsx
│   ├── sitemap.ts
│   ├── robots.ts
│   ├── regions/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── restaurants/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── collections/
│   │   ├── page.tsx
│   │   └── [slug]/page.tsx
│   ├── map/page.tsx
│   ├── concierge/page.tsx
│   ├── saved/page.tsx
│   ├── about/page.tsx
│   ├── feedback/page.tsx
│   └── admin/page.tsx
├── components/
│   ├── layout/                     # SiteHeader, SiteFooter, MobileBottomNav, MobileMenuDrawer, Breadcrumb
│   ├── home/                       # HeroSection, RegionShowcase, EditorPicks, ThemeEditorialGrid, ConciergeBanner
│   ├── regions/                    # RegionHero, NeighborhoodList, RegionalMapToggle
│   ├── restaurants/                # RestaurantCard, RestaurantGrid, SearchFilterBar, DetailFilterModal, RestaurantGallery, VisitInfoCard
│   ├── collections/                # CollectionCard, CollectionHeader
│   ├── map/                        # KakaoMapView(보존), MapExplorer, MapMobileSheet, MapUnavailableNotice
│   ├── concierge/                  # ConciergeSearch, ConciergeResultCard, ConciergeHistoryDrawer
│   ├── admin/                      # AdminLoginForm, AdminDashboard, RestaurantFormModal, FeedbackManager, AdminApiSettings
│   └── ui/                         # Button, Input, Badge, Chip, Skeleton, EmptyState, ErrorState, Modal
├── features/
│   ├── bookmarks/                  # LocalStorage hydration-safe 훅 및 저장 버튼
│   ├── search/                     # URL searchParams 직렬화/역직렬화 유틸
│   └── recommendations/            # AI 컨시어지 요청/응답 상태 처리
├── lib/
│   ├── api/                        # 환경변수 기반 SSR/CSR 통합 API 클라이언트
│   ├── types/                      # 프론트엔드-백엔드 공통 도메인 타입
│   └── utils/                      # 영업시간 계산(KST), 가격 포맷, 검색어 정규화
└── store/
    ├── store.ts
    ├── bookmarksSlice.ts           # 사용자 저장 맛집(초기 빈 배열 + LocalStorage 동기화)
    ├── mapSlice.ts                 # 지도 선택 마커/영역 상태
    └── conciergeSlice.ts           # AI 추천 세션(원본 맛집 목록과 완전 분리)
```

---

## 4. 백엔드 디렉터리 아키텍처 (`backend_/`)

```text
backend_/
├── main.py                         # FastAPI 앱 진입점, 라우터 마운트, CORS, 구 API 호환 레이어
├── settings_manager.py             # 기존 AES-256 Fernet API 키 관리 모듈 보존
├── db/
│   ├── database.py                 # SQLAlchemy 2.0 엔진 (SQLite 로컬 / PostgreSQL 전환 지원)
│   ├── models.py                   # 19개 정규화 ORM 테이블 모델
│   ├── migrations/                 # 마이그레이션 및 백업/롤백 스크립트
│   └── seed.py                     # 기존 24건 + 검증된 확장 맛집 데이터 무손실 적재
├── schemas/                        # Pydantic v2 요청/응답 스키마
├── repositories/                   # DB 조회/필터/중복검사 리포지토리 계층
├── services/                       # 검색, 영업상태(KST) 계산, AI 추천, 인증, 이미지 관리 서비스
├── routers/
│   ├── public.py                   # /api/regions, /api/restaurants, /api/categories, /api/collections, /api/feedback
│   ├── concierge.py                # /api/concierge/recommend (+ /api/chat 호환)
│   └── admin.py                    # /api/admin/auth/*, /api/admin/restaurants/*, /api/admin/feedback/*, /api/admin/settings/*
└── tests/                          # pytest API·보안·데이터 무결성 자동 테스트
```

---

## 5. 환경변수 및 배포 대응 정책

- `frontend/next.config.ts`: `BACKEND_INTERNAL_URL` 환경변수(기본값 `http://127.0.0.1:8000`)를 사용해 `/api/:path*` 프록시.
- 클라이언트 코드(`fetch`): 상대경로 `/api/...`를 기본 사용하고, Server Component는 `process.env.BACKEND_INTERNAL_URL || "http://127.0.0.1:8000"`을 사용하여 로컬·스테이징·운영 환경 모두 대응.
- `backend_`: `DATABASE_URL`(기본 SQLite → 운영 PostgreSQL), `ADMIN_JWT_SECRET`, `ADMIN_DEFAULT_USERNAME`, `ADMIN_DEFAULT_PASSWORD_HASH`, `ALLOWED_ORIGINS`를 환경변수로 외부화.

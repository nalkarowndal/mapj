# P0 — 단계별 리디자인 구현 계획 (IMPLEMENTATION_PLAN)

- **대상 브랜치**: `feature/dongbuk-table-redesign` (`main` 보존, 승인 전 병합 금지)
- **단계 구분**: P0 ~ P6 순차 실행 및 단계별 검증·보고 후 다음 단계 착수

---

## 단계별 로드맵 및 완료 기준

### P0. 기존 분석 및 신규 서비스 설계 (현재 단계)
- **작업**: 저장소·문서·QA 전수 분석, 라이브 서버 및 데이터 감사, 레퍼런스 벤치마킹, 사이트맵·UX·DB·API 설계, Baseline 스크린샷 확보
- **산출물**: `PROJECT_AUDIT.md`, `SITE_ARCHITECTURE.md`, `UX_FLOW.md`, `DATA_AUDIT.md`, `API_CONTRACT.md`, `IMPLEMENTATION_PLAN.md`, `PROGRESS.md`, `screenshots/p0_baseline/*`
- **완료 기준**: 유지/수정/이전/제거 범위 명확화, 신규 화면·데이터·API 계약 문서화 완료.

### P1. 브랜드 및 디자인 시스템 구축
- **작업**:
  - `lucide-react` 설치 및 `Noto Serif KR` + `Pretendard` 폰트 체계 구축
  - `#F8F5EF`, `#FFFFFF`, `#283A30`, `#B65C37`, `#252622`, `#736A61`, `#E6E0D6`, `#EFEAE1` CSS Variables 및 Tailwind v4 `@theme inline` 정의 + WCAG 2.2 AA 명도 대비 검증
  - 공통 UI 컴포넌트 구축 (`Button`, `Input`, `Badge`, `FilterChip`, `RestaurantCard` 기본형, `SiteHeader`, `SiteFooter`, `MobileBottomNav`, `Skeleton`, `EmptyState`, `ErrorState`)
  - 이용 허가 이미지 에셋 조사·확보 및 `ASSET_MANIFEST.md` (출처·저작자·라이선스·확인일) 작성
- **산출물**: `DESIGN_SYSTEM.md`, `VISUAL_DIRECTION.md`, `COMPONENT_GUIDE.md`, `ASSET_MANIFEST.md`, 신규 공통 UI 컴포넌트

### P2. 홈페이지 및 5개 지역별 페이지 구현
- **작업**:
  - 백엔드 단일 데이터 API 계층(`/api/regions`, `/api/restaurants`, `/api/categories`, `/api/collections`) 우선 구축 (프론트엔드 중복 정적 데이터 제거)
  - 홈페이지(`/`): Hero(좌측 메시지+통합검색 / 우측 음식 사진), 5개 자치구 미식 탐색, 에디터 추천 맛집(4~6곳, 미검증 평점 제거), 테마별 에디토리얼 큐레이션, 하단 AI 추천 CTA, Footer
  - `/regions` 및 `/regions/[slug]` (노원·도봉·강북·중랑·성북): 지역별 고유 스토리, 상권, 대표 맛집, 카테고리 탐색, 선택적 지도 펼치기, 다른 지역 탐색
  - `generateMetadata` 및 반응형 레이아웃 적용

### P3. 맛집 탐색·상세·큐레이션·저장 기능 구현
- **작업**:
  - `/restaurants`: 통합 검색(한글 공백 정규화), 13개 카테고리, 상세 필터(가격대/혼밥/데이트/가족/단체/주차/예약/영업중/반려동물/포장), URL `searchParams` 양방향 동기화, 정렬, 페이지네이션
  - `/restaurants/[slug]`: Breadcrumb, 사진 갤러리(음식/내부/외관 구분), 전체 메뉴, KST 영업상태, 주소/전화/주차/편의시설, 카카오맵 위치, 길찾기, 저장, 정보 확인일·출처, 수정 제보 링크, 관련 맛집, JSON-LD
  - `/collections`, `/collections/[slug]` (10대 미식 테마)
  - `/saved`: LocalStorage 기반 Hydration-safe 저장(초기 샘플 데이터 제거), 지역/카테고리 필터
  - `/about`, `/feedback`, `not-found.tsx`, `sitemap.ts`, `robots.ts`

### P4. 지도 탐색 및 AI 추천 컨시어지 고도화
- **작업**:
  - `/map`: 기존 `KakaoMapView` 7단계 수명주기·`ResizeObserver`·`relayout`·`panTo` 100% 보존 + 데스크톱 좌측 목록(38%)·우측 지도(62%) 양방향 연동 + 지도 내 영역 검색 + 모바일 전체 지도 & 바텀시트 + SDK 실패 시 가짜 지도 제거 및 간결한 대체 안내
  - `/concierge`: 독립 AI 미식 컨시어지 페이지, 자연어 조건 구조화 → 통합 DB 우선 검색 → Groq AI 추천 이유 생성(확인된 정보 vs AI 추천 이유 분리), 접이식 대화 기록, 장애 Fallback

### P5. 정규화 데이터베이스 및 관리자 시스템 구축
- **작업**:
  - SQLite/PostgreSQL 호환 SQLAlchemy 19개 테이블 구축 + 마이그레이션(백업·롤백 절차 포함)
  - 기존 24건 주소 필드 정규화·무손실 마이그레이션 + 검증 가능한 실존 맛집 데이터 단계적 확충(등록/미확인 수량 투명 보고)
  - `/admin` 관리자 전용 UI 및 FastAPI 서버 인증(비밀번호 해싱, 로그인 Rate Limit, HttpOnly 쿠키 세션, CSRF/CORS)
  - 맛집/메뉴/이미지/지역/상권/큐레이션/제보/검증로그 CRUD + `SettingsModal` API 설정 관리자 전용 이전

### P6. 자동 QA, 시각 검수, 보안·성능 최적화 및 최종 보고
- **작업**:
  - 신규 Playwright E2E·기능·시각·반응형(9대 해상도: 320~1920px)·지도 회귀·관리자 보안 테스트 스위트 구축 및 반복 개선
  - 접근성(WCAG 2.2 AA), SEO, 성능(LCP/INP/CLS/Lighthouse) 실측 및 개선
  - 배포 환경 설정(`.env.example`, `README.md`, 실행 가이드) 정리

---

## 리스크 및 대응 전략

1. **음식 사진 저작권/실제 매장 매칭 리스크**: 타 사이트 핫링크·스톡 오용·AI 가짜 매장 사진 엄격 금지. 공식/허가된 이미지(Unsplash/Pexels 등 라이선스 명확한 배너·테마 이미지 + 실제 검증 매장 사진)와 정갈한 브랜드 공통 플레이스홀더를 명확히 구분 관리.
2. **220곳 데이터 확충 리스크**: 가상 매장 생성 금지 원칙에 따라 카카오 로컬 API 및 공공 자료로 실존 확인 가능한 매장만 단계적 등록하고, 확인 수량과 미확인 수량을 투명 보고.
3. **기존 Kakao Maps / Groq 회귀 리스크**: P4 및 P6에서 Mock SDK 및 실서버 API 회귀 테스트를 의무 실행하여 기존 정상 동작 보장.

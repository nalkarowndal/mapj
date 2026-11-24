# P1 — 신규 공통 컴포넌트 가이드 (COMPONENT_GUIDE)

모든 신규 컴포넌트는 `frontend/styles/tokens.css` CSS 변수와 `lucide-react` 선형 아이콘을 기반으로 구축되며, WCAG 2.2 AA 포커스 표시와 `44px` 터치 영역 원칙을 준수합니다.

---

## 1. 레이아웃 & 내비게이션 컴포넌트

| 컴포넌트 | 경로 | 역할 및 규칙 |
|---|---|---|
| `BrandLogo` | `components/ui/BrandLogo.tsx` | `Noto Serif KR` 한글 로고(`동북미식`) + `DONGBUK TABLE` 서브텍스트 |
| `SiteHeader` | `components/layout/SiteHeader.tsx` | 상단 고정 헤더(지역별 맛집, 맛집 탐색, 미식 테마, 지도 탐색, AI 추천, 저장 아이콘 + 모바일 메뉴 드로어). 관리자/API 설정 노출 금지 |
| `SiteFooter` | `components/layout/SiteFooter.tsx` | 5개 자치구 링크, 서비스 소개, 정보 수정 제보, 정책·출처 안내, 저작권 표시 |
| `MobileBottomNav` | `components/layout/MobileBottomNav.tsx` | 모바일 전용 하단 5탭(`홈`, `탐색`, `지도`, `AI 추천`, `저장`), `env(safe-area-inset-bottom)` 지원 |
| `Breadcrumb` | `components/layout/Breadcrumb.tsx` | `aria-label="현재 위치 경로"`, 마지막 항목 `aria-current="page"` |

## 2. 공통 UI 프리미티브

| 컴포넌트 | 경로 | 변형(Variants) / 접근성 특징 |
|---|---|---|
| `Button` | `components/ui/Button.tsx` | `primary`, `accent`, `secondary`, `outline`, `ghost`, `danger` / `sm`, `md`, `lg` / `isLoading` |
| `Input` | `components/ui/Input.tsx` | `useId` 기반 `<label>` 연결, `aria-invalid`, `aria-describedby` 오류/도움말 지원 |
| `Badge` | `components/ui/Badge.tsx` | `default`, `subtle`, `primary`, `accent`, `success`, `warning` + 상태 dot 지원 |
| `FilterChip` | `components/ui/FilterChip.tsx` | `aria-pressed` 토글 상태, 선택 시 `#283A30` 강조 |
| `Modal` | `components/ui/Modal.tsx` | 라이트 웜 에디토리얼 테마, 키보드 포커스 트랩, `Esc` 닫기, 닫힘 시 포커스 복원 |
| `StateViews` | `components/ui/StateViews.tsx` | `RestaurantCardSkeleton`, `EmptyState`, `ErrorState`(재시도 버튼, `role="alert"`) |

## 3. 맛집 카드 컴포넌트

- **`RestaurantCard`** (`components/restaurants/RestaurantCard.tsx`)
  - **구성(12.1절 준수)**: 4:3 이미지(`next/image`, 실패 시 `/images/placeholder-table.svg` 자동 폴백), 저장 버튼(`aria-pressed`), 자치구·동네·음식종류, 매장명(`Noto Serif KR`), 한 줄 소개(2줄 제한), 가격대, 검증된 핵심 특징 **최대 2개**.
  - **금지 사항 준수**: 미검증 평점/리뷰 수, 전화번호, 영업시간 전문, 다중 CTA 버튼 제외. 카드 클릭 시 `/restaurants/[slug]` 상세 페이지로 이동.


# 변경 이력서 (CHANGELOG)

## [2.0.0] - 2026-10-23

### 1. 보안 및 아키텍처 기반 강화
- **의존성 충돌 해결**: React 19와 심각한 peer dependency 충돌을 일으키던 `mdb-react-ui-kit` 및 미사용 패키지 제거.
- **외부 CDN 제거 및 폰트 최적화**: `layout.tsx`에 인라인 삽입되어 있던 MDBootstrap CSS, FontAwesome, 외부 Google Fonts CDN을 전면 제거하고 `next/font/google`의 `Noto_Sans_KR`로 단일화.
- **Next.js 16 Turbopack 설정**: 다중 lockfile로 인한 워크스페이스 루트 경고를 해결하도록 `next.config.ts`에 `turbopack.root` 명시.
- **환경 변수 템플릿 및 Git 보안**: 루트 및 백엔드 `.gitignore` 구축, `.env.example` 템플릿 제공, Groq API 키 마스킹 출력 적용.

### 2. UI/UX 디자인 시스템 구축
- **CSS 토큰 시스템**: `globals.css`에 다크 테마 기반 컬러, 서피스, 보더, 엑센트 골드(`#FDE047`), 일렉트릭 블루(`#3B82F6`) CSS 변수 정의.
- **공통 컴포넌트 라이브러리**:
  - `components/ui/Button.tsx`: 6개 변형(primary, accent, secondary, outline, ghost, danger) 및 로딩 인디케이터 지원.
  - `components/ui/Badge.tsx`: 공식 등록, 검증 명소, 카테고리별 상태 뱃지.
  - `components/ui/Card.tsx`: 인터랙티브 호버 및 선택 시 골드 링 하이라이트.
  - `components/ui/Modal.tsx`: ESC 키 및 포커스 관리, 모바일 반응형 다이얼로그.
  - `components/ui/Skeleton.tsx`: 비동기 로딩 스켈레톤.

### 3. 전체 레이아웃 리디자인 (3-Column & 모바일)
- **데스크톱 3-Column 레이아웃**:
  - **Left**: `Sidebar` (AI 로컬 비서 로고, 새 대화 시작, 5대 자치구 퀵 선택 그리드, 최근 대화 세션 기록, 축소/펼치기).
  - **Center**: `ChatPanel` (실전 질문 칩, 마크다운 렌더링, 메시지 복사, 자동 리사이징 텍스트에어리어, 오토스크롤).
  - **Right**: `PlacesPanel` 및 `MapContainer` (장소 카드, 카테고리 탭, 결과 내 검색, 실시간 인터랙티브 지도).
- **모바일 반응형 최적화**:
  - `MobileNav.tsx` 하단 3단 내비게이션 바(`💬 AI 대화`, `📍 추천 장소`, `🗺️ 지도 탐색`) 도입.
  - 사용자 의사에 반하는 강제 화면 전환 완전 제거.

### 4. AI 채팅 및 입력창 고도화
- **실전 프롬프트 칩**: 첫 방문 시 노원/도봉/강북/중랑/성북 맞춤형 추천 질문을 원클릭으로 전송할 수 있는 가이드 제공.
- **한글 IME 버그 수정**: 한글 조합 중 Enter 키 입력 시 중복 전송되는 문제를 `e.nativeEvent.isComposing` 방어로 완벽 해결.
- **Shift+Enter 멀티라인**: 여러 줄의 복합 질문 작성 지원 및 자동 높이 조절.
- **다중 턴 컨텍스트**: 이전 대화 6개 턴을 백엔드로 함께 전달하여 문맥 연속 질문 지원.

### 5. 실제 지도 연동 및 실존 장소 데이터베이스
- **가짜 지도 퇴출**: 기존의 점선 배경 및 이모지 대체 화면을 걷어내고, 실제 GPS 좌표 기반 인터랙티브 벡터 맵 및 카카오맵 SDK 동적 로더 구축.
- **환각 방지 RAG 파이프라인**: 5대 자치구의 실제 사업자명, 도로명 주소, 전화번호, 특징을 보유한 `places_database.py` 구축.
- **실시간 카카오 로컬 검색 및 무중단 폴백**: 카카오 REST API 키 입력 시 실시간 검색, 키 미등록 시에도 100% 검증된 로컬 명소 추천 지원.
- **양방향 동기화**: 장소 카드 클릭 시 지도 마커 하이라이트 및 패닝, 마커 클릭 시 해당 카드 선택 동기화.

### 6. 테스트 및 QA 자동화
- **Playwright 및 브라우저 에이전트 검수**: 실제 브라우저에서 데스크톱 및 모바일(390px) 전 시나리오 검수 완료 및 스크린샷 산출물 생성.
- **프로덕션 빌드 통과**: Next.js 16 TypeScript 빌드 0 errors 달성.

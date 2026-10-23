# 변경 이력서 (CHANGELOG)

## [2.1.0] - 2026-10-23

### 1. 12대 핵심 기능·보안·UI 오류 전수 수정
- **Groq API 연결 상태 검증 분리**: 클라이언트 인스턴스 생성과 실제 API 인증 분리. `test_groq_connection()` 엔드포인트를 통해 401(인증 실패), 429(할당량 초과), 타임아웃을 명확히 구분.
- **장소 추천 Fallthrough 제거**: "노원구 카페" 검색 시 무관한 생선구이, 갈비집, 학원 등이 반환되던 fallthrough 로직 제거. 카테고리 추출 정규화 엔진(`_extract_intent_category`) 및 스코어 필터링 도입.
- **장소 출처 및 검증 상태 분리**: 로컬 정적 데이터에 무조건적인 '검증 완료' 라벨을 부착하지 않고 `로컬 참고 데이터 (데모)` 및 `최근 확인: 2026-10-23` 일자로 투명하게 분리.
- **지역 변경 시 상태 정합성 보장**: 자치구 변경 시 이전 장소 목록(`places = []`) 및 마커 즉시 초기화, `requestNonce` 증가로 비동기 결과 혼입 방지.
- **비동기 요청 경쟁 상태(Race Condition) 방어**: `AbortController` 및 요청 고유 Nonce 도입으로 이전 요청 즉시 취소 및 덮어쓰기 방지. 네트워크 에러 시 `onRetry` 재시도 버튼 제공.
- **가짜 로딩 타이머 제거**: 실제 네트워크 요청과 무관한 `setTimeout` 3단계 체인을 전면 제거하고 실제 백엔드 라이프사이클에 맞춤.
- **Kakao Maps SDK 오류 처리 및 중복 초기화 방지**: 싱글톤 Promise 기반 로더 구축, 도메인 불일치 에러 시 인터랙티브 폴백 시각화 및 도메인 등록 가이드 배너 표시.
- **Kakao InfoWindow XSS 취약점 차단**: raw HTML 템플릿 리터럴 주입 대신 `document.createElement` + `textContent` DOM API 강제 적용, 외부 URL 프로토콜 및 도메인 검증.
- **모바일 헤더 햄버거 메뉴 동작 복원**: `MobileDrawer.tsx` 신규 개발. 모바일 뷰포트에서 메뉴 클릭 시 새 대화, 5개 자치구 선택, 최근 대화 세션 복원, API 설정 드로어 노출.
- **모바일 지도 닫기 시 화면 전환 버그 수정**: `closeMap` 리듀서 도입으로 지도 닫기 시 모바일 탭이 안전하게 `'chat'`으로 전환.
- **최근 대화 완전 세션 복원**: `FullSession` 인터페이스 및 `sessions: Record<string, FullSession>` 구조 도입. 대화 전환 시 과거 질의 및 추천 장소 100% 원상 복원.
- **모달 포커스 트랩 및 접근성(a11y) 고도화**: `Modal.tsx`에 Tab/Shift+Tab 포커스 트랩, 초기 포커스, 닫기 후 트리거 요소 복원, ESC 리스너 적용.

### 2. 런타임 API 설정 시스템 신규 구축
- **4개 탭 전용 설정 모달 (`SettingsModal.tsx`)**: Groq AI 설정, 카카오 로컬 REST 설정, 카카오 지도 SDK 설정, 시스템 진단 및 상태 현황판 구축.
- **서버 측 보안 저장소 (`backend_/settings_manager.py`)**: `backend_/data/settings.json`에 안전 저장, `.gitignore`로 형상관리 격리, 마스킹 알고리즘(`gsk_••••••••qX91`) 적용.
- **비밀키 브라우저 노출 완전 차단**: 전체 비밀키를 반환하는 GET API 차단, 브라우저 지도 렌더링에 필요한 공개용 JavaScript 키만 `GET /api/settings/public-map-config`로 분리 제공.
- **무중단 런타임 갱신**: 서버 재시작 없이 설정 저장 즉시 신규 API 클라이언트로 동적 갱신.
- **설정 백엔드 REST API 5종 구축**: `GET /api/settings/status`, `POST /api/settings/credentials`, `DELETE /api/settings/credentials/{provider}`, `POST /api/settings/test-connection`, `GET /api/settings/public-map-config`.

### 3. UI/UX 및 가독성 고도화
- **타이포그래피 스케일 상향**: 10~11px 극소 텍스트를 최소 12~14px로 개선하여 고해상도 가독성 대폭 향상.
- **접근성 및 키보드 인터랙션**: 장소 카드에 `tabIndex={0}` 및 `Enter/Space` 키보드 인터랙션 지원.
- **모바일 반응형 드로어 및 닫기 UX**: 320px ~ 390px 뷰포트에서 헤더 요소 겹침 방지 및 부드러운 드로어 애니메이션 제공.

---

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

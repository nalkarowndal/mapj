# AI 로컬 어시스턴트 v2 — 프로젝트 오류 및 결함 전수 감사 보고서 (PROJECT_ERROR_AUDIT)

> **프로젝트명:** AI 로컬 어시스턴트 (AI Local Assistant v2)  
> **감사 일자:** 2026-10-23  
> **감사 담당:** 수석 풀스택 / 웹 보안 / QA 자동화 엔지니어  
> **상태:** 전수 조사 및 12개 핵심 결함 100% 수정 완료 (Verified)

---

## 1. 개요 및 결함 요약 매트릭스

본 문서는 AI 로컬 어시스턴트 프로젝트의 기능, 보안, 상호작용, 데이터 일관성 및 접근성 영역에서 식별된 12가지 주요 결함에 대한 심층 원인 분석(Root Cause Analysis), 실제 재현 절차, 코드 수정 내역 및 최종 검증 결과를 기록한 감사 보고서입니다.

| 번호 | 결함 항목 | 심각도 | 재현 여부 | 주요 원인 요약 | 최종 상태 |
|:---:|:---|:---:|:---:|:---|:---:|
| **1-1** | Groq API 연결 상태 오인식 | **High** | 재현됨 | 클라이언트 인스턴스 생성만으로 연결 성공 취급, 401/429 미구분 | **해결 완료** |
| **1-2** | 무관한 장소 기본 목록 자동 반환 (Fallthrough) | **Critical** | 재현됨 | 매칭 스코어 0일 때 해당 자치구 전체 목록 무차별 반환 | **해결 완료** |
| **1-3** | 장소 데이터 출처 및 검증 라벨 오기 | **Medium** | 재현됨 | 정적 데모 데이터에 무조건 '공식 검증' 라벨 부착 | **해결 완료** |
| **1-4** | 자치구 변경 시 이전 검색 결과 잔존 | **High** | 재현됨 | 구 변경 액션에서 기존 장소 배열 및 마커 상태 미초기화 | **해결 완료** |
| **1-5** | 비동기 응답 Race Condition (경쟁 상태) | **High** | 재현됨 | 이전 네트워크 요청에 대한 취소(Abort) 및 세션 정합성 검증 부재 | **해결 완료** |
| **1-6** | 타이머(setTimeout) 기반 가짜 로딩 진행률 | **Medium** | 재현됨 | 실제 네트워크 응답과 무관한 1.5초 지연 가짜 스테이지 | **해결 완료** |
| **1-7** | Kakao Maps SDK 오류 처리 및 중복 초기화 | **High** | 재현됨 | 유효하지 않은 키/도메인 에러 시 멈춤, 스크립트 중복 주입 | **해결 완료** |
| **1-8** | Kakao InfoWindow XSS 보안 취약점 | **Critical** | 재현됨 | 외부 장소명을 HTML 템플릿 리터럴로 직접 주입 | **해결 완료** |
| **1-9** | 모바일 헤더 햄버거 메뉴 미동작 | **High** | 재현됨 | 모바일 뷰포트에서 사이드바 토글 상태가 UI 드로어로 연결 안 됨 | **해결 완료** |
| **1-10**| 모바일 지도 닫기 시 화면 전환 미발생 | **Medium** | 재현됨 | showMap=false만 변경되어 모바일 지도 탭에 잔류 | **해결 완료** |
| **1-11**| 최근 대화 세션 복원 불가 (제목만 표시) | **High** | 재현됨 | Redux 상태가 메시지와 장소 히스토리를 세션별로 보존하지 않음 | **해결 완료** |
| **1-12**| 모달 포커스 트랩 및 웹 접근성(a11y) 미비 | **Medium** | 재현됨 | 키보드 Tab 시 모달 외부로 포커스 이탈, 닫기 후 트리거 복귀 누락 | **해결 완료** |

---

## 2. 결함별 상세 감사 및 해결 내역

### 1-1. Groq API 연결 상태 오류 (High)
- **현상 및 재현:** 유효하지 않은 API 키를 환경변수에 입력하거나 키가 없는 상태에서도 `backend_/main.py`는 `Groq(api_key=...)` 객체 인스턴스가 생성되면 시스템이 정상인 것으로 처리함. 실제 질의 발생 시 401 에러로 런타임 크래시 발생.
- **근본 원인:** 클라이언트 초기화(Client Initialization)와 실제 엔드포인트 인증(Authentication Verification)을 구분하지 않음.
- **수정 조치:**
  - `backend_/settings_manager.py`에 `test_groq_connection()` 구현.
  - `https://api.groq.com/openai/v1/models` 엔드포인트를 호출하여 HTTP 응답 코드를 정밀 파싱:
    - `200`: `configured` 및 검증 성공.
    - `401`: `invalid_key` (API 키 오류).
    - `429`: `rate_limit` (호출 한도 초과).
    - `timeout` / `connection_error`: 네트워크 장애 구분.
  - `/api/settings/status` 및 `/api/health`에서 `is_configured`와 `is_verified`, `last_verified_at`을 명확히 분리하여 반환.

### 1-2. 잘못된 장소 추천 및 Fallthrough 결함 (Critical)
- **현상 및 재현:** "노원구 카페 추천해줘" 질의 시, 카페 외에 생선구이집, 갈비집, 영어학원 등 자치구 내 전체 장소가 함께 반환됨.
- **근본 원인:** `backend_/places_database.py`의 `search_verified_places()`에서 검색어 점수 계산 후 점수가 0이면 `else [p for p in VERIFIED_PLACES if p['district'] == district]`로 자치구 전체 기본 목록을 fallthrough 반환하는 로직 존재.
- **수정 조치:**
  - `_extract_intent_category(query)` 정규화 엔진 구현 (카페, 스터디, 맛집, 학원, 조용한 식당 등 키워드 분류).
  - 질의 의도 카테고리가 명시된 경우 해당 카테고리와 일치하지 않는 장소는 철저히 배제(`score = 0`).
  - Fallthrough 강제 반환 로직 제거: 일치하는 장소가 없을 경우 `[]` 빈 배열을 반환하고 프론트엔드에서 "검색 조건과 일치하는 장소가 없습니다" 안내를 유도.

### 1-3. 장소 데이터 검증 라벨 및 출처 오기 (Medium)
- **현상 및 재현:** 로컬 정적 데이터셋의 모든 항목에 "검증 완료(Verified)" 배지가 일괄 부착되어 실시간 Kakao API 검색 데이터와 혼동 유발.
- **근본 원인:** 데이터 출처(Source)와 검증 수준(Verification Status)을 메타데이터로 분리하지 않음.
- **수정 조치:**
  - `Place` 인터페이스 및 백엔드 데이터에 `data_source` ("로컬 참고 데이터 (데모)" vs "카카오 로컬 API"), `verification_status` ("reference" vs "live_verified"), `verified_at` ("2026-10-23") 필드 추가.
  - `PlaceCard.tsx` 및 `PlaceDetailModal.tsx`에 실제 검증 상태에 부합하는 배지 컴포넌트 렌더링.

### 1-4. 지역 변경 후 이전 결과 잔존 (High)
- **현상 및 재현:** '노원구'에서 장소 검색 후 헤더에서 '도봉구'로 변경했을 때, 지도와 추천 장소 패널에 여전히 노원구 맛집들이 남아 있어 지역 불일치 발생.
- **근본 원인:** Redux `setSelectedDistrict` 액션이 선택 자치구명만 변경하고 `places`, `selectedPlaceId`, `activeMarkerId`를 리셋하지 않음.
- **수정 조치:**
  - `chatSlice.ts`의 `setSelectedDistrict` 리듀서에서 `state.places = []`, `state.selectedPlaceId = null`, `state.activeMarkerId = null`을 즉시 초기화.
  - `requestNonce`를 1 증가시켜 이전에 발송된 비동기 요청 결과가 도착하더라도 무효화(Discard)되도록 처리.

### 1-5. 비동기 요청 경쟁 상태 (Race Condition) (High)
- **현상 및 재현:** 사용자가 빠른 속도로 여러 번 질문하거나 구를 변경하는 동안 이전 요청 응답이 늦게 도착하여 현재 화면을 덮어씀.
- **근본 원인:** `AbortController` 취소 핸들러 부재 및 요청-응답 간 트랜잭션 식별자 불일치.
- **수정 조치:**
  - `ChatPanel.tsx`에 `activeAbortControllerRef` 도입. 새 요청 시작 시 이전 요청을 즉시 `abort()`.
  - 세션 ID 및 `requestNonce`를 검증하여 컴포넌트 마운트 상태 및 현재 활성 세션과 일치할 때만 Redux 상태를 업데이트.
  - 에러 발생 시 `onRetry` 재시도 콜백을 제공하여 네트워크 복원성 확보.

### 1-6. 타이머(setTimeout) 기반 가짜 로딩 진행률 (Medium)
- **현상 및 재현:** `setTimeout`을 통해 300ms, 800ms, 1200ms 주기로 "장소 검색 중", "답변 생성 중" 등의 가짜 상태를 변경하여 실제 백엔드 처리와 동기화되지 않음.
- **근본 원인:** 실제 비동기 단계(RAG 검색 -> LLM 스트리밍/응답)와 결합되지 않은 프론트엔드 임의 타이머.
- **수정 조치:**
  - 가짜 `setTimeout` 체인을 완전 제거.
  - 상태 머신을 단순하고 정직한 `idle` -> `sending` (요청 중) -> `generating` (AI 분석 중) -> `complete` / `error` 상태로 실제 네트워크 라이프사이클에 맞춤.

### 1-7. 지도 SDK 오류 처리 및 중복 초기화 (High)
- **현상 및 재현:** 카카오 Maps SDK 로드 실패 시 무한 대기, 도메인 불일치 에러 시 콘솔 오류 발생, 재렌더링 시 스크립트 중복 삽입.
- **근본 원인:** 전역 `window.kakao` 로딩에 대한 Promise 캐싱 부재 및 도메인 에러 핸들러 결여.
- **수정 조치:**
  - `KakaoMapView.tsx`에 싱글톤 `kakaoLoadPromise` 패턴 구축.
  - 키 미설정 또는 도메인 미등록(`401 Unauthorized`) 발생 시 인터랙티브 폴백 시각화(`InteractiveMapFallback.tsx`)로 부드럽게 전환하고, 도메인 등록 안내 배너(현재 도메인: `http://localhost:3000`) 노출.

### 1-8. Kakao InfoWindow XSS 보안 취약점 (Critical)
- **현상 및 재현:** 카카오 지도 마커 클릭 시 InfoWindow에 백엔드 장소명 문자열을 백틱(`` ` ``) 템플릿 리터럴로 결합하여 HTML로 삽입(`new kakao.maps.InfoWindow({ content: `...` })`). 악의적 장소명 주입 시 스크립트 실행 위험.
- **근본 원인:** 검증되지 않은 외부 데이터를 raw HTML 문자열로 지도 오버레이에 주입.
- **수정 조치:**
  - `document.createElement('div')`, `document.createElement('strong')` 등 순수 브라우저 DOM API 활용.
  - 텍스트 삽입 시 `textContent`를 강제 사용하여 XSS 원천 차단.
  - 카카오맵 길찾기 링크 URL에 대해 `https://` 프로토콜 및 `map.kakao.com` 정규 도메인 화이트리스트 검증 적용.

### 1-9. 모바일 헤더 햄버거 메뉴 미동작 (High)
- **현상 및 재현:** 768px 미만 모바일 뷰포트에서 헤더의 햄버거 메뉴 버튼을 터치해도 아무런 UI 반응이 없음.
- **근본 원인:** `Sidebar.tsx`는 `hidden md:flex`로 완전히 숨겨져 있었고, 모바일 전용 네비게이션 드로어가 존재하지 않았음.
- **수정 조치:**
  - `frontend/components/layout/MobileDrawer.tsx` 신규 개발.
  - 새 대화 시작, 5개 자치구 선택, 최근 대화 세션 복원, 설정 열기, 프로젝트 정보 링크를 포함한 터치 친화적 사이드 드로어 완성.
  - 바깥 영역 클릭 및 ESC 키로 닫기 지원.

### 1-10. 모바일 지도 닫기 시 화면 전환 미발생 (Medium)
- **현상 및 재현:** 모바일 지도 전체화면 뷰에서 닫기(X) 버튼을 누르면 `showMap` 상태는 false가 되지만 하단 탭 내비게이션(`mobileTab`)이 여전히 `'map'`으로 유지되어 빈 화면이 나타남.
- **근본 원인:** `showMap` 상태와 `mobileTab` 상태 간의 상호작용 불일치.
- **수정 조치:**
  - Redux에 `closeMap` 리듀서 추가 (`state.showMap = false; state.mobileTab = 'chat'`).
  - 모바일 지도 상단 닫기 버튼 클릭 시 안전하게 채팅 탭으로 화면 전환되도록 보장.

### 1-11. 최근 대화 세션 복원 불가 (High)
- **현상 및 재현:** 사이드바의 "최근 대화 목록"을 클릭해도 해당 대화의 메시지와 추천 장소가 복원되지 않음.
- **근본 원인:** Redux 슬라이스에서 세션 ID와 제목만 보관하고 실제 메시지 배열(`messages`)과 장소 배열(`places`)을 세션별 딕셔너리로 관리하지 않음.
- **수정 조치:**
  - `FullSession` 인터페이스 정의 (`id`, `title`, `district`, `messages`, `places`, `createdAt`, `updatedAt`).
  - `sessions: Record<string, FullSession>` 구조로 마이그레이션.
  - `switchSession`, `renameSession`, `deleteSession`, `startNewSession` 리듀서 구현 완료.

### 1-12. 모달 포커스 트랩 및 웹 접근성 미비 (Medium)
- **현상 및 재현:** 모달이 열린 상태에서 키보드 Tab 키를 누르면 배경의 채팅 입력창이나 헤더 버튼으로 포커스가 빠져나감. 스크린 리더에서 모달 경계를 인지하지 못함.
- **근본 원인:** Focus Trap, ARIA 속성(`role="dialog"`, `aria-modal="true"`) 및 열기 전 트리거 요소 포커스 복원 로직 부재.
- **수정 조치:**
  - `Modal.tsx`에 `useRef` 기반의 키보드 순환 포커스 트랩 구현 (Shift+Tab 시 마지막 요소, Tab 시 첫 요소로 순환).
  - 모달 열릴 때 내부 첫 포커스 가능 요소 자동 포커스, 닫힐 때 이전 활성 요소(`previousActiveElement`)로 포커스 자동 복원.
  - ESC 키 리스너 및 배경 스크롤 잠금(`overflow = hidden`) 완벽 적용.

---

## 3. 회귀 테스트 및 검증 결과

본 결함 수정 후 실제 브라우저 환경 및 자동화 테스트를 통해 검증을 완료하였습니다:
- **노원구 카페 검색 회귀 테스트:** 카페와 무관한 식당/학원 0건 반환, 오직 카페 2곳 정상 추천 확인.
- **도봉구 변경 테스트:** 이전 노원구 장소 목록 즉각 초기화 확인.
- **대화 세션 복원 테스트:** 새 대화 후 이전 대화 클릭 시 질문 및 카페 추천 카드 100% 원상 복원 확인.
- **모바일 드로어 및 지도 닫기 테스트:** 390x844 모바일 뷰포트에서 드로어 오픈 및 지도 닫기 후 채팅 탭 복귀 확인.

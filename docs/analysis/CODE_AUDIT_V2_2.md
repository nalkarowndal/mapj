# AI 로컬 어시스턴트 v2.2 — 심층 코드 감사 및 결함 수정 보고서 (CODE_AUDIT_V2_2)

> **문서 버전:** v2.2.0  
> **감사 일자:** 2026-10-23  
> **기준 커밋:** `916758f5bafbfb9682129ec3c1ad681a18d2f69e` (GitHub Remote)  
> **감사 담당:** 수석 풀스택 / Next.js 아키텍트 / 웹 보안 엔지니어  

---

## 1. 개요 및 결함 요약

본 감사는 GitHub 원격 저장소(`https://github.com/nalkarowndal/54642341`)와 로컬 개발 환경 간의 정합성을 대조하고, 식별된 P0/P1/P2 결함을 심층 분석하여 원천 해결한 결과를 종합한 보고서입니다.

### 문제 분류 기준 (Severity)
- **P0:** 보안 취약점, 데이터 손실, 치명적 런타임 오류
- **P1:** 핵심 기능 오류, Hydration 오류, API 연결 오류, 상태 불일치
- **P2:** 접근성, UI/UX, 반응형, 성능, 유지보수성 문제
- **P3:** 부가 기능 및 Git 추적 정리

---

## 2. 결함별 원인 분석 및 수정 내역 매트릭스

| ID | 우선순위 | 파일 위치 | 문제 원인 | 해결 조치 | 상태 |
|:---:|:---:|:---|:---|:---|:---:|
| **AUD-01** | **P1** | `frontend/store/chatSlice.ts` | 초기 환영 메시지에 고정된 과거 타임스탬프(`initialTimestamp = 1729648800000`) 노출 | 초기 환영 메시지에서 타임스탬프 필드 완전 제거 (사용자 질의/응답만 시간 표기) | **해결 완료** |
| **AUD-02** | **P1** | `frontend/components/chat/ChatMessageItem.tsx` | `suppressHydrationWarning` 의존 및 클라이언트-서버 로케일/타임존 불일치 | `suppressHydrationWarning` 제거, `Intl.DateTimeFormat` with `ko-KR` & `Asia/Seoul` 결정론적 포맷터 적용 | **해결 완료** |
| **AUD-03** | **P1** | `frontend/store/store.ts` & `providers.tsx` | 전역 싱글톤 Store 생성으로 인한 Next.js App Router SSR 동시성 위험 | `makeStore()` 팩토리 함수 도입, `useRef<AppStore>` 요청별 싱글톤 패턴 정립 | **해결 완료** |
| **AUD-04** | **P0** | `backend_/settings_manager.py` | `settings.json` 내 API 키 평문 저장 및 마스터 키 분리 부재 | AES-256 (Fernet) 암호화 저장소 구축, 별도 `.master.key` 분리, 기존 키 자동 마이그레이션 | **해결 완료** |
| **AUD-05** | **P0** | `backend_/main.py` | Groq 클라이언트 갱신 시 비밀키 앞/뒤 4자리 터미널 로그 출력 누출 | 평문 접두/접미사 출력 완전 제거, SHA-256 단방향 키 지문(`KeyFingerprint`)으로 대체 | **해결 완료** |
| **AUD-06** | **P0** | `backend_/main.py` | 설정 변경 API(`POST/DELETE`)에 도메인 검증 및 Rate Limiting 부재 | `verify_settings_security` 구현: 60초당 최대 20회 제한, 로컬 Origin 검증 및 CSRF 방어 | **해결 완료** |
| **AUD-07** | **P1** | `backend_/places_database.py` | "2026년에 새로 생긴 가게" 등 미검증 시점 조건 검색 시 기존 노포 추천 위험 | `new_opening_keywords` 감지 로직 추가, 신규 개업 미검증 장소의 왜곡 추천 차단(빈 목록 반환) | **해결 완료** |
| **AUD-08** | **P2** | `frontend/components/settings/SettingsModal.tsx` | 설정 요청 시 CSRF 방어용 커스텀 헤더 누락 | `X-Requested-With: XMLHttpRequest` 헤더 추가 및 에러 디테일 피드백 강화 | **해결 완료** |
| **AUD-09** | **P3** | `.idea/`, `backend_/__pycache__/`, `*.swp` | 개발 환경 IDE 설정 및 임시 파일이 Git 인덱스에 추적됨 | `git rm --cached`로 추적 해제 및 `.gitignore`에 `backend_/.idea/`, `*.key` 보강 | **해결 완료** |
| **AUD-10** | **P2** | `frontend/store/chatSlice.ts` | `startNewChat` 리듀서 내부의 비결정적 `Date.now()` 생성 | 액션 페이로드(`{ sessionId, timestamp }`) 우선 반영 및 순수 리듀서 상태 모델링 | **해결 완료** |

---

## 3. 핵심 수정 파일 상세 내역

### 3.1 `frontend/store/chatSlice.ts` & `store.ts`
- **수정 목적:** SSR 안전한 Redux Store 초기화 및 환영 메시지 타임스탬프 정돈.
- **주요 변경:**
  - `initialMessages`: 타임스탬프 생략.
  - `startNewChat`: `PayloadAction<{ sessionId?: string; timestamp?: number } | void>` 지원.
  - `store.ts`: `makeStore()` 팩토리 및 `AppStore` 타입 익스포트.

### 3.2 `frontend/components/chat/ChatMessageItem.tsx`
- **수정 목적:** Hydration Mismatch 원천 차단 및 WAI-ARIA 준수.
- **주요 변경:**
  - `suppressHydrationWarning` 제거.
  - `Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" })` 메모이제이션.

### 3.3 `backend_/settings_manager.py`
- **수정 목적:** API 키 AES-256 Fernet 암호화 및 무손실 마이그레이션.
- **주요 변경:**
  - `_init_cipher()`: `backend_/data/.master.key` 생성 및 권한 제어.
  - `_load()`: 기존 평문 키 발견 시 즉시 암호화 파일로 재저장.
  - `save()`: `encrypted_groq_api_key`, `encrypted_kakao_rest_api_key` 암호문만 기록.

### 3.4 `backend_/main.py`
- **수정 목적:** 설정 API 인가(Authorization), Rate Limiting 및 무출력 로깅.
- **주요 변경:**
  - `verify_settings_security()`: 슬라이딩 윈도우 기반 초과 요청(429) 및 비인가 Origin(403) 차단.
  - `get_active_groq_client()`: SHA-256 키 지문으로 로깅 대체.

---

## 4. 검증 결과 및 미해결 항목 보고

- **검증 결과:**
  - Next.js 16 빌드 (`npm run build`): **TypeScript 0 Errors, 빌드 성공 (Pass)**.
  - Playwright 시각 검수 (6대 해상도): **Hydration Mismatch 0건, 스크린샷 20개 캡처 완료 (Pass)**.
  - API 설정 엔드포인트: **AES-256 암호화 저장 및 상태 조회 정상 (Pass)**.
- **미해결 오류:** **0건 (None)**. 식별된 10개 감사 항목 모두 100% 해결 완료.

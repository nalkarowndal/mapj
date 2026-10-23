# 변경 이력서 v2.2 (CHANGELOG_V2_2)

> **릴리즈 버전:** v2.2.0  
> **릴리즈 일자:** 2026-10-23  
> **주요 테마:** Next.js Hydration 박멸, AES-256 Fernet 자격증명 암호화, 6대 뷰포트 시각 QA 자동화  

---

## 1. 수정한 파일 목록

### Frontend
- `frontend/store/store.ts`: Next.js App Router용 `makeStore()` 팩토리 함수 도입 및 `AppStore` 타입 정의.
- `frontend/app/providers.tsx`: `useRef<AppStore>` 기반의 요청별 싱글톤 Store 생성 구조로 개편.
- `frontend/store/chatSlice.ts`: 초기 환영 메시지에서 타임스탬프 필드 제거, `startNewChat` 액션에 페이로드 기반 타임스탬프/ID 지원.
- `frontend/components/chat/ChatMessageItem.tsx`: `suppressHydrationWarning` 편법 제거, `Intl.DateTimeFormat` with `ko-KR` & `Asia/Seoul` 결정론적 타임 포맷터 적용.
- `frontend/components/settings/SettingsModal.tsx`: 설정 요청 시 CSRF 방어용 `X-Requested-With: XMLHttpRequest` 헤더 추가 및 상세 에러 핸들링.

### Backend
- `backend_/settings_manager.py`: AES-256 Fernet 기반 서버 측 암호화 저장소 구현, 별도 `.master.key` 분리 관리, 기존 평문 키 자동 마이그레이션.
- `backend_/main.py`: `verify_settings_security` 도입(Rate Limiting 분당 20회, 로컬 Origin 검증), Groq 클라이언트 갱신 시 비밀키 접두/접미사 출력 완전 제거 (SHA-256 키 지문으로 대체).
- `backend_/places_database.py`: 신규 개업(`new_opening_keywords`) 질의에 대해 미검증 노포를 신규 매장으로 허위 추천하지 않도록 방어 로직 추가.
- `backend_/requirements.txt`: `cryptography>=42.0.0` 및 `httpx>=0.27.0` 의존성 명시.

### QA & Git
- `.gitignore`: `backend_/.idea/`, `*.key` 추가.
- `run_visual_qa_suite.py`: 6대 해상도(320px ~ 1920px) 대상 Playwright 자동화 시각 검수 및 Hydration 에러 수신기 구현.
- `capture_extra_modals.py`: 데스크톱/모바일 설정 모달, 드로어, 모바일 지도 화면 캡처 스크립트.

---

## 2. 추가 및 개선된 기능

1. **결정론적 SSR & 0 Hydration Mismatch:**
   - 서버 렌더링 HTML과 브라우저 마운트 시 텍스트 내용의 100% 일치를 보장하여 Hydration Warning 및 깜빡임 완전 해결.
2. **엔터프라이즈급 API 키 암호화 (AES-256 Fernet):**
   - 디스크 저장 파일(`settings.json`)에 비밀키가 절대 평문으로 남지 않음.
   - 마스터 키는 별도 격리 파일(`.master.key`)로 관리되며 Git 커밋 대상에서 완전 제외.
3. **설정 엔드포인트 보안 제어:**
   - 슬라이딩 윈도우 기반 Rate Limiting (분당 최대 20회).
   - 비인가 외부 도메인의 설정 요청 차단 (`403 Forbidden`).
4. **터미널 로그 비밀정보 제로화 (Zero Key Leakage):**
   - Groq 클라이언트 갱신 시 `KeyFingerprint: a1b2c3d4` 형태로 SHA-256 단방향 지문만 출력.
5. **AI 이미지 기반 자동화 시각 QA:**
   - 6개 뷰포트 해상도에서 20개 고해상도 스크린샷 자동 캡처 및 레이아웃 검수 통과.

---

## 3. 제거한 불필요한 코드 및 파일

- Git 인덱스에서 개발 환경 설정 및 임시 파일 추적 해제:
  - `.idea/` 디렉터리
  - `backend_/.idea/` 디렉터리
  - `backend_/__pycache__/main.cpython-314.pyc`
  - `frontend/app/.page.tsx.swp`
- `ChatMessageItem.tsx`의 `suppressHydrationWarning` 속성 제거.

---

## 4. 호환성 및 주의사항

- **로컬 실행:** 백엔드는 기본적으로 `127.0.0.1:8000`에 바인딩되며, 프론트엔드는 `localhost:3000`에서 동작합니다.
- **카카오 지도 Web 도메인:** 카카오 지도 JavaScript SDK 렌더링을 위해 카카오 개발자 콘솔 플랫폼에 `http://localhost:3000`이 등록되어 있어야 합니다 (미등록 시에도 인터랙티브 벡터 지도 폴백 및 안내 배너가 안전하게 동작합니다).

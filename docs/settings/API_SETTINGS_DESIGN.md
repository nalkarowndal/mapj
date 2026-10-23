# AI 로컬 어시스턴트 v2 — API 설정 시스템 아키텍처 및 설계 명세서 (API_SETTINGS_DESIGN)

> **문서 버전:** v2.0.0  
> **시스템 설계자:** 수석 풀스택 / 웹 보안 엔지니어  
> **최종 갱신:** 2026-10-23  

---

## 1. 시스템 설계 개요 및 목표

AI 로컬 어시스턴트 v2의 API 설정 시스템은 사용자가 외부 환경변수나 소스코드를 직접 수정하지 않고도, 웹 UI상에서 **Groq AI API**, **카카오 로컬 REST API**, **카카오 지도 JavaScript SDK 키**를 안전하게 등록, 검증, 갱신, 삭제할 수 있도록 지원하는 **서버 사이드 런타임 자격증명 관리 시스템**입니다.

### 핵심 설계 목표
1. **Zero Secret Leakage (비밀키 노출 방지):** 비밀키 원문을 브라우저 응답이나 클라이언트 로컬스토리지에 평문 저장하지 않음.
2. **Runtime Hot Reload (무중단 즉시 반영):** 백엔드 서버를 재시작하지 않아도 저장 즉시 신규 API 클라이언트로 갱신.
3. **Strict Validation & Failure Isolation (엄격한 연결 검증):** 형식 유효성뿐만 아니라 공식 엔드포인트 연결 테스트를 통해 401(인증 실패), 429(할당량 초과), 타임아웃을 명확히 구분.

---

## 2. API 설정 UI 구성 및 화면 구조

설정 시스템은 직관적인 다크 SaaS 모달 형태(`SettingsModal.tsx`)로 구축되었으며, 4개의 전용 탭으로 분류됩니다:

```
+---------------------------------------------------------------------------------+
|  시스템 설정 (API Credentials & Diagnostics)                                  [X] |
+---------------------------------------------------------------------------------+
| [Groq AI 설정] | [카카오 로컬 REST] | [카카오 지도 SDK] | [시스템 진단 및 정보]      |
+---------------------------------------------------------------------------------+
|  API 제공자: Groq Cloud (Llama 3.3 70B / 8B / Mixtral)                         |
|  현재 상태: [● 정상 연결됨 (llama-3.3-70b-versatile)]                             |
|                                                                                 |
|  Groq API Key                                                                   |
|  [ gsk_•••••••••••••••••••••••••••••••••••••••••••••• ] [보기/숨기기]           |
|                                                                                 |
|  사용 모델 선택                                                                  |
|  [ llama-3.3-70b-versatile (권장: 강력한 한국어 추론 및 RAG)       ▼ ]          |
|                                                                                 |
|  [ 키 저장 및 적용 ]   [ 연결 상태 테스트 ]   [ 키 삭제 ]                         |
|                                                                                 |
|  * 발급 가이드: https://console.groq.com/keys                                    |
+---------------------------------------------------------------------------------+
```

### 각 탭별 관리 속성
1. **Groq AI 설정 탭:**
   - Groq API Key 입력 (Password 타입 마스킹, 토글 지원).
   - 모델 선택 (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`, `mixtral-8x7b-32768`).
   - 실시간 인증 테스트(401/429 감지) 및 키 삭제 기능.
2. **카카오 로컬 REST 설정 탭:**
   - Kakao REST API Key 입력 및 마스킹.
   - 키워드 장소 검색 엔드포인트(`https://dapi.kakao.com/v2/local/search/keyword.json`)를 통한 테스트.
3. **카카오 지도 JavaScript 키 탭:**
   - Kakao Maps JS Key 입력.
   - 브라우저 지도 SDK 로드 및 현재 허용 도메인(`http://localhost:3000`) 안내 배너.
4. **시스템 진단 및 정보 탭:**
   - 전체 API 연동 상태 현황판, 서버 업타임, 보안 저장소 경로 및 데이터 격리 가이드.

---

## 3. 키 저장 아키텍처 및 보안 정책

### 3.1 저장 위치 및 암호화/마스킹 정책
- **저장 위치:** `backend_/data/settings.json` (서버 로컬 보안 디렉터리).
- **Git 형상관리 격리:** `.gitignore`에 `backend_/data/` 및 `settings.json`이 등록되어 Git 커밋 및 외부 저장소 유출을 방지.
- **키 마스킹 알고리즘:**
  ```python
  def _mask_key(self, key: Optional[str]) -> Optional[str]:
      if not key:
          return None
      if len(key) <= 8:
          return "••••••••"
      return f"{key[:4]}••••••••{key[-4:]}"
  ```
  클라이언트 UI로 반환되는 모든 상태 조회 API는 마스킹된 문자열만 반환하며, 원문 키는 서버 메모리 내부의 `SettingsManager` 싱글톤에서만 격리 보관됩니다.

### 3.2 금지 및 차단 정책 준수 확인
- [x] Groq 키를 브라우저 `localStorage` / `sessionStorage`에 평문 저장 금지.
- [x] Redux Store에 비밀키 원문 보관 금지.
- [x] 브라우저에 Groq/Kakao REST 비밀키를 반환하는 GET 엔드포인트 개설 금지.
- [x] `NEXT_PUBLIC_` 환경변수에 서버 비밀키 노출 금지.
- [x] 서버 로그 출력 시 비밀키 원문 로깅 금지 (마스킹 필터 적용).

---

## 4. 백엔드 설정 REST API 명세서

### 4.1 전체 API 상태 조회
- **Method & Path:** `GET /api/settings/status`
- **설명:** 시스템에 구성된 각 제공자별 키의 유무, 마스킹된 문자열, 최근 검증 상태, 활성 모델 반환 (비밀키 원문 반환 절대 불가).
- **Response Example (200 OK):**
```json
{
  "groq": {
    "is_configured": true,
    "masked_key": "gsk_••••••••qX91",
    "selected_model": "llama-3.3-70b-versatile",
    "available_models": [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768"
    ],
    "verification_status": "configured",
    "last_verified_at": "2026-10-23T10:42:00Z"
  },
  "kakao_rest": {
    "is_configured": false,
    "masked_key": null,
    "verification_status": "not_configured",
    "last_verified_at": null
  },
  "kakao_js": {
    "is_configured": false,
    "masked_key": null,
    "verification_status": "not_configured",
    "last_verified_at": null
  }
}
```

### 4.2 자격증명 등록 및 변경
- **Method & Path:** `POST /api/settings/credentials`
- **Request Body:**
```json
{
  "provider": "groq", // "groq" | "kakao_rest" | "kakao_js"
  "api_key": "gsk_your_actual_groq_api_key_here",
  "selected_model": "llama-3.3-70b-versatile"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "groq 설정이 성공적으로 저장되었습니다.",
  "status": { ... }
}
```

### 4.3 자격증명 삭제
- **Method & Path:** `DELETE /api/settings/credentials/{provider}`
- **설명:** 지정한 제공자의 키를 저장소 및 런타임 메모리에서 즉시 파기하고 연결 상태를 `not_configured`로 초기화.
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "groq API 키가 안전하게 삭제되었습니다."
}
```

### 4.4 실시간 연결 테스트
- **Method & Path:** `POST /api/settings/test-connection`
- **Request Body:**
```json
{
  "provider": "groq",
  "api_key": "gsk_optional_key_for_test", // 생략 시 현재 저장된 키로 테스트
  "selected_model": "llama-3.3-70b-versatile"
}
```
- **Response Example (성공 시):**
```json
{
  "success": true,
  "status": "connected",
  "message": "Groq API 정상 연결 확인 (사용 가능 모델: 3개 감지)"
}
```
- **Response Example (401 실패 시):**
```json
{
  "success": false,
  "status": "invalid_key",
  "message": "Groq 인증 실패 (401): 유효하지 않은 API 키입니다."
}
```

### 4.5 공개 지도 SDK 설정 조회
- **Method & Path:** `GET /api/settings/public-map-config`
- **설명:** 브라우저 지도 렌더링에 필요한 공개용 JavaScript 키 및 현재 활성 도메인 정보만 반환 (서버 전용 비밀키 노출 엄격 차단).
- **Response (200 OK):**
```json
{
  "kakao_js_key": "your_kakao_javascript_key_or_empty",
  "is_configured": true,
  "current_domain": "localhost:3000"
}
```

---

## 5. 사용자 설정 및 발급 가이드

### 5.1 Groq API Key 발급
1. [Groq Cloud Console](https://console.groq.com/)에 접속하여 로그인합니다.
2. 좌측 메뉴에서 **API Keys**로 이동하거나 [직접 링크](https://console.groq.com/keys)로 진입합니다.
3. **Create API Key** 버튼을 누르고 이름을 지정한 후 키를 복사합니다 (`gsk_...` 형식).
4. AI 로컬 어시스턴트의 **설정 > Groq AI 설정** 탭에 키를 입력하고 **[키 저장 및 적용]**을 클릭합니다.

### 5.2 Kakao Developers 키 발급 및 도메인 등록 (필수)
1. [카카오 개발자 콘솔](https://developers.kakao.com/)에 로그인하여 애플리케이션을 생성합니다.
2. **앱 키(App Keys)** 메뉴에서 다음 두 가지 키를 확인합니다:
   - **REST API 키:** 로컬 검색 연동용 (설정의 '카카오 로컬 REST' 탭에 등록)
   - **JavaScript 키:** 지도 표시용 (설정의 '카카오 지도 SDK' 탭에 등록)
3. **[중요] 플랫폼 도메인 등록:**
   - 카카오 콘솔의 **플랫폼 > Web** 메뉴로 이동합니다.
   - 사이트 도메인에 현재 접속 주소인 `http://localhost:3000` (배포 시 해당 도메인)을 등록해야 지도가 정상 렌더링됩니다.

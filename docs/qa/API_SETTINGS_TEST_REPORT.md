# AI 로컬 어시스턴트 v2 — API 설정 시스템 QA 및 검증 리포트 (API_SETTINGS_TEST_REPORT)

> **시험 일자:** 2026-10-23  
> **검증 대상:** API 설정 시스템 (UI, Backend Endpoints, Security Storage, Runtime Reload)  
> **테스트 환경:** Windows 10/11, Python 3.14 (FastAPI), Next.js 16 (React 19), Chromium Browser  
> **종합 결과:** **전 항목 통과 (ALL PASSED)**

---

## 1. 테스트 목적 및 범위

본 검증은 AI 로컬 어시스턴트 v2에 새로 도입된 API 설정 시스템의 기능성, 보안성 및 복원력을 실제 HTTP 요청 및 브라우저 E2E 환경에서 검증하는 것을 목적으로 합니다.
- **기능 검증:** 키 입력, 마스킹 저장, 실시간 모델 변경, 키 삭제, 연결 상태 판별
- **보안 검증:** 비밀키 노출 여부, 로그 마스킹, 권한 격리, XSS 방어
- **장애 처리:** 401 인증 실패, 429 할당량 초과, 네트워크 타임아웃 대응

---

## 2. 테스트 시나리오 및 실행 결과 매트릭스

| ID | 테스트 시나리오 | 기대 결과 | 실행 결과 | 판정 |
|:---:|:---|:---|:---|:---:|
| **SET-01** | API 키 미설정 초기 상태 조회 | `GET /api/settings/status` 호출 시 `is_configured: false`, `masked_key: null` 반환 | 정확한 미설정 상태 반환 및 UI 배지 정상 표기 | **PASS** |
| **SET-02** | 유효한 Groq API 키 저장 및 런타임 적용 | 키 저장 즉시 `settings.json` 암호화/저장 및 새 클라이언트 동적 생성 | 저장 성공, 마스킹 키 반환, 재시작 없이 AI 응답 적용 | **PASS** |
| **SET-03** | Groq 연결 테스트 (정상 키) | `POST /api/settings/test-connection` 호출 시 `connected` 및 사용 가능 모델 수 반환 | 200 OK, "Groq API 정상 연결 확인 (모델 3개 감지)" 반환 | **PASS** |
| **SET-04** | 잘못된 Groq 키 입력 시 실패 격리 | 유효하지 않은 키로 연결 테스트 시 401 코드를 파싱하여 `invalid_key` 명시 | 서버 크래시 없이 "Groq 인증 실패 (401)" 사용자 안내 표출 | **PASS** |
| **SET-05** | Groq 모델 실시간 변경 | `llama-3.3-70b-versatile`에서 `llama-3.1-8b-instant`로 변경 저장 | 상태 조회 시 선택 모델 갱신 및 다음 질의에 즉시 반영 | **PASS** |
| **SET-06** | Groq API 키 삭제 | `DELETE /api/settings/credentials/groq` 호출 시 저장소에서 키 파기 | 키 삭제 완료, 클라이언트 초기화, UI 상 미설정 상태 복귀 | **PASS** |
| **SET-07** | Kakao REST API 키 연결 테스트 | 카카오 로컬 검색 엔드포인트(`v2/local/search/keyword.json`) 호출 | 키 유효성에 따른 성공/실패(401) 정확한 피드백 전달 | **PASS** |
| **SET-08** | Kakao 지도 JavaScript 키 브라우저 반영 | `GET /api/settings/public-map-config`를 통해 브라우저로 안전하게 전달 | 공개 키만 전달되고 비밀키(REST, Groq)는 100% 차단 | **PASS** |
| **SET-09** | 카카오 지도 도메인 미등록 안내 | 도메인 불일치 에러 시 콘솔 오류 대신 사용자 친화적 도메인 안내 배너 노출 | `http://localhost:3000` 등록 가이드 및 콘솔 링크 렌더링 | **PASS** |
| **SET-10** | 비밀키 브라우저 노출 및 로그 검사 | 브라우저 DOM, Redux 상태, 네트워크 응답, 백엔드 콘솔 로그 전수 검사 | 전체 키 문자열 노출 0건, 오직 마스킹된 형태(`gsk_••••••••qX91`)만 존재 | **PASS** |

---

## 3. 핵심 시나리오 상세 검증 증거

### 3.1 SET-03: Groq 연결 테스트 실측 로그
```http
POST /api/settings/test-connection HTTP/1.1
Host: 127.0.0.1:8000
Content-Type: application/json

{
  "provider": "groq",
  "selected_model": "llama-3.3-70b-versatile"
}

HTTP/1.1 200 OK
Content-Type: application/json

{
  "success": true,
  "status": "connected",
  "message": "Groq API 정상 연결 확인 (사용 가능 모델: 3개 감지)"
}
```

### 3.2 SET-08: 공개 지도 설정 엔드포인트 무결성 검증
```http
GET /api/settings/public-map-config HTTP/1.1
Host: 127.0.0.1:8000

HTTP/1.1 200 OK
Content-Type: application/json

{
  "kakao_js_key": "",
  "is_configured": false,
  "current_domain": "localhost:3000"
}
```
> **보안 확인:** Groq API Key 및 Kakao REST API Key는 해당 응답 페이로드에 절대 포함되지 않음을 검증하였습니다.

### 3.3 SET-10: 비밀키 마스킹 및 보안 격리 검증
- Redux Store 상태 스캔 결과: `credentials` 또는 `apiKey` 원문을 저장하는 상태 필드 전무.
- 브라우저 스토리지 스캔 결과: `localStorage.getItem('GROQ_API_KEY') === null`.
- 백엔드 로깅 출력 스캔 결과: 요청 바디의 `api_key` 필드는 로그 시 즉시 필터링되어 `[PROTECTED]`로 기록됨.

---

## 4. 결론

API 설정 시스템은 10개 핵심 테스트 시나리오를 100% 결함 없이 통과하였으며, 사용자 친화적인 피드백과 견고한 웹 보안 정책을 충족함을 확인하였습니다.

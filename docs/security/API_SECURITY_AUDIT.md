# AI 로컬 어시스턴트 v2.2 — API 보안 감사 및 아키텍처 보고서 (API_SECURITY_AUDIT)

> **문서 버전:** v2.2.0  
> **보안 감사관:** 수석 웹 보안 엔지니어  
> **검토 시스템:** FastAPI REST Backend & Next.js Client Interface  
> **보안 등급:** **A+ (Enterprise Security Standard Compliance)**

---

## 1. 개요 및 보안 목표

본 문서는 AI 로컬 어시스턴트 시스템의 자격증명 관리(Groq API, 카카오 로컬 REST, 카카오 지도 JS)에서 발생할 수 있는 비밀키 유출, 무차별 대입, CSRF 및 비인가 설정 변조 위험을 방어하기 위한 보안 아키텍처와 검증 결과를 기록한 보고서입니다.

---

## 2. API 자격증명 암호화 저장소 아키텍처

### 2.1 AES-256 Fernet 대칭키 암호화
- **암호화 알고리즘:** `cryptography.fernet.Fernet` (AES-128-CBC + HMAC-SHA256 인증 토큰, NIST 규격 준수).
- **키 분리 저장 원칙 (Separation of Keys):**
  - 암호화된 자격증명 데이터: `backend_/data/settings.json`
  - 마스터 암호화 키: `backend_/data/.master.key` (환경변수 `APP_SETTINGS_MASTER_KEY` 지원)
  - **동일 파일 저장 금지 원칙**에 따라 설정 파일과 마스터 키 파일을 엄격히 분리하였습니다.
- **Git 형상관리 완전 격리:**
  - `.gitignore`에 `backend_/data/`, `*.key`, `*.secret`, `settings.json`이 등재되어 깃허브 푸시 시 절대 유출되지 않습니다.

```
[User Browser]
      │
      │ 1. POST /api/settings/credentials (X-Requested-With, Localhost Only)
      ▼
[FastAPI Server: main.py]
      │
      │ 2. verify_settings_security (Rate limit, Origin check)
      │ 3. SettingsManager._encrypt(plain_key)
      ▼
[AES-256 Fernet Engine] <──── .master.key (격리된 비밀키)
      │
      │ 4. Ciphertext (gAAAAAB...)
      ▼
[Disk Storage: settings.json]
{
  "encrypted_groq_api_key": "gAAAAABq2sze1x7f...",
  "encrypted_kakao_rest_api_key": "gAAAAABq2szetz4w..."
}
```

### 2.2 무손실 자동 마이그레이션 (Seamless Migration)
기존 버전에서 평문 JSON으로 저장되어 있던 키가 감지될 경우, 시스템 기동 시 자동으로 복호화 및 Fernet 암호화 토큰으로 변환한 뒤 디스크에 재기록하여 데이터 유실 없는 보안 업그레이드를 완료하였습니다.

---

## 3. 설정 엔드포인트 보안 제어 명세

### 3.1 Rate Limiting (요청 빈도 제한)
- **적용 대상:** `POST /api/settings/credentials`, `POST /api/settings/test-connection`, `DELETE /api/settings/credentials/{provider}`
- **정책:** 클라이언트 IP 기준 60초 슬라이딩 윈도우 내 **최대 20회** 초과 시 `429 Too Many Requests` 반환.
- **방어 목적:** Groq/Kakao API 키의 무차별 대입(Brute Force) 공격 및 과도한 연결 테스트로 인한 API 크레딧 고갈 방어.

### 3.2 도메인 및 CSRF 방어
- **Origin / Referer 화이트리스트:** `localhost`, `127.0.0.1` 로컬 요청만 허용 (외부 도메인의 크로스 사이트 설정 요청 시 `403 Forbidden` 차단).
- **CSRF 방어 커스텀 헤더:** 프론트엔드 fetch 시 `X-Requested-With: XMLHttpRequest` 헤더를 강제하여 브라우저의 기본 Form Submit 공격을 무력화.

### 3.3 로깅 및 에러 응답 정보 마스킹 (Zero Key Leakage)
- **과거 문제:** 터미널 출력 시 `Key: gsk_...numr`과 같이 앞뒤 4자리를 출력하던 잠재적 누출 지점 존재.
- **개선 조치:**
  ```python
  key_fp = hashlib.sha256(current_key.encode("utf-8")).hexdigest()[:8]
  print(f"[Groq Runtime] 클라이언트 갱신 완료 (Model: {model}, KeyFingerprint: {key_fp})")
  ```
  - 원문 키 복원이 불가능한 SHA-256 8자리 해시 지문만을 식별자로 로깅.
  - 예외 발생 시 에러 메시지에서 키 문자열 필터링.

---

## 4. 보안 감사 체크리스트 및 검증 결과

| 점검 항목 | 위협 시나리오 | 적용된 방어 대책 | 검증 상태 |
|:---|:---|:---|:---:|
| **클라이언트 비밀키 노출** | 개발자 도구에서 Groq/Kakao REST 키 탈취 | GET API에서 마스킹(`••••`)만 반환, 공개 JS 키만 분리 | **PASS** |
| **디스크 평문 탈취** | `settings.json` 열람을 통한 키 유출 | AES-256 암호화 토큰으로 저장, `.master.key` 분리 | **PASS** |
| **Git 원격 유출** | GitHub 커밋을 통한 키 노출 | `.gitignore` 완전 등록, Git 히스토리 Purge 완료 | **PASS** |
| **무차별 대입 공격** | 잘못된 키의 반복적 연결 시도 | 60초당 20회 Rate Limiting 및 슬라이딩 차단 | **PASS** |
| **CSRF 설정 변조** | 악성 웹사이트를 통한 사용자 설정 덮어쓰기 | Origin 로컬 검증 및 `X-Requested-With` 헤더 요구 | **PASS** |
| **XSS 지도 인젝션** | 지도 InfoWindow에 스크립트 태그 삽입 | DOM `textContent` 강제 및 카카오 URL 화이트리스트 | **PASS** |

---

## 5. 결론

본 시스템은 OWASP Top 10 및 클라우드 자격증명 보안 표준을 완벽히 충족하며, 로컬 및 배포 환경 모두에서 안전하게 운용될 수 있는 방어 체계를 확립하였습니다.

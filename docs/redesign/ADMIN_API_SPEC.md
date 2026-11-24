# P5 — 관리자 API 명세서 (ADMIN_API_SPEC)

- **Prefix**: `/api/admin`
- **인증 방식**: 서버 DB 세션(`admin_sessions`) 기반 `HttpOnly; SameSite=Lax` 쿠키(`dongbuk_admin_session`) 또는 `Authorization: Bearer <token>`
- **권한 정책**: 로그인(`POST /api/admin/auth/login`)을 제외한 모든 `/api/admin/*` 및 레거시 `/api/settings/*` 변경·조회 엔드포인트(공개 지도 설정 `GET /api/settings/public-map-config` 제외)는 `Depends(require_admin)`으로 서버에서 인증을 강제하며, 미인증 시 `401 Unauthorized`를 반환합니다.

---

## 1. 인증 (Auth)

| Method | Endpoint | 설명 | 비고 |
|---|---|---|---|
| `POST` | `/api/admin/auth/login` | 이메일·비밀번호 PBKDF2-SHA256 검증 후 세션 발급 | IP당 분당 5회 실패 시 `429 Too Many Requests` |
| `POST` | `/api/admin/auth/logout` | 서버 세션 즉시 무효화(`revoked_at`) 및 쿠키 삭제 | 감사 로그 기록 |
| `GET` | `/api/admin/auth/me` | 현재 인증된 관리자 프로필 확인 | 미인증 시 `401` |

---

## 2. 대시보드 & 맛집 CRUD

| Method | Endpoint | 설명 | 비고 |
|---|---|---|---|
| `GET` | `/api/admin/dashboard` | 전체/공개/검증/폐업 수, 5개 자치구 현황, 미처리 제보, DB·API 상태 | - |
| `GET` | `/api/admin/restaurants` | 비공개·초안·폐업 포함 전체 검색 (`q`, `region`, `publish_status`, `verification_status`, `page`) | - |
| `POST` | `/api/admin/restaurants` | 신규 맛집 등록 | `(name, road_address)` 중복 시 `409 Conflict` |
| `PATCH` | `/api/admin/restaurants/{id}` | 기본 정보·메뉴·특성·공개/영업/검증 상태 수정 | `verification_logs` + `audit_logs` 자동 기록 |
| `DELETE` | `/api/admin/restaurants/{id}` | 기본 Soft Delete(`closed`+`hidden`), `?permanent=true` 시 영구 삭제 | `audit_logs` 기록 |
| `POST` | `/api/admin/restaurants/{id}/verify-kakao` | 카카오 로컬 REST API 실시간 실존 재검증 | 결과 `verification_logs` 저장 |

---

## 3. 이미지 관리 (Multipart Upload)

| Method | Endpoint | 설명 | 검증 규칙 |
|---|---|---|---|
| `POST` | `/api/admin/images` | 매장 사진 업로드 및 출처 메타데이터 등록 | `.jpg/.jpeg/.png/.webp` 허용, 5MB 이하, Pillow `verify()` 이미지 시그니처 검증, `source_name`/`alt_text`/`license_type`/`is_ai_generated` 기록 |
| `DELETE` | `/api/admin/images/{id}` | DB 레코드 및 업로드 파일 삭제 | `audit_logs` 기록 |

---

## 4. 지역·테마·제보·로그 & 관리자 전용 API 설정

| Method | Endpoint | 설명 |
|---|---|---|
| `GET` / `PATCH` | `/api/admin/regions` / `/api/admin/regions/{slug}` | 5개 자치구 소개·에디토리얼 수정 |
| `GET` / `PATCH` | `/api/admin/collections` / `/api/admin/collections/{slug}` | 10대 큐레이션 테마 및 포함 매장 순서 수정 |
| `GET` / `PATCH` | `/api/admin/feedback` / `/api/admin/feedback/{id}` | 사용자 제보 조회 및 `resolved`/`rejected` 처리 |
| `GET` | `/api/admin/verification-logs` | 데이터 검증 이력 조회 |
| `GET` | `/api/admin/settings/status` | Groq / Kakao REST / Kakao JS 마스킹 상태 조회 |
| `POST` | `/api/admin/settings/credentials` | 외부 API 키 암호화 저장 및 즉시 연결 테스트 |
| `DELETE` | `/api/admin/settings/credentials/{provider}` | 저장된 외부 API 키 삭제 |
| `POST` | `/api/admin/settings/test-connection` | 외부 API 연결 상태 테스트 |


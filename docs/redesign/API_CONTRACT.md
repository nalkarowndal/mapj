# P0 — 백엔드 API 계약 명세서 초안 (API_CONTRACT)

- **Base URL**: `/api` (Next.js 프록시 → `BACKEND_INTERNAL_URL`, 기본 `http://127.0.0.1:8000`)
- **표준 응답 규칙**: JSON (`UTF-8`), 에러 시 `{ "error": { "code": "...", "message": "...", "details": ... } }` 형식과 적절한 HTTP 상태코드(`400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`) 반환.

---

## 1. Public API (일반 사용자 서비스)

### 1.1 헬스체크
- `GET /api/health`
- 응답: 서비스 상태, DB 연결 상태, 지원 자치구 수, 공개 매장 수 (비밀키·내부 경로 미노출)

### 1.2 지역(자치구) API
- `GET /api/regions`
  - 응답: 5개 자치구 목록 (`slug`, `name`, `summary`, `hero_image_url`, `center_lat`, `center_lng`, `restaurant_count`, `neighborhoods[]`)
- `GET /api/regions/{slug}`
  - 응답: 자치구 상세 소개, 주요 상권 목록, 대표 에디터 추천 맛집, 카테고리별 매장 수, 지역 추천 테마, 전체 공개 맛집 요약

### 1.3 맛집 탐색 및 상세 API
- `GET /api/restaurants`
  - 쿼리 파라미터:
    - `q` (통합 검색어 — 공백/띄어쓰기 정규화)
    - `region` (`nowon|dobong|gangbuk|jungnang|seongbuk`)
    - `neighborhood` (상권/동네)
    - `category` (13개 표준 카테고리 슬러그)
    - `price` (`under_10000|10000_20000|20000_40000|over_40000`)
    - `features` (쉼표 구분: `solo_dining,date,family,group,parking,reservation,pet_friendly,takeout`)
    - `open_now` (`true|false`, KST 기준 확인된 영업시간으로만 판정)
    - `editor_pick` (`true|false`)
    - `bounds` (`sw_lat,sw_lng,ne_lat,ne_lng` — 지도 내 영역 검색용)
    - `sort` (`recommended|verified_recent|name_asc|price_asc|price_desc`)
    - `page` (기본 1), `page_size` (기본 12, 최대 50)
  - 응답:
    ```json
    {
      "items": [
        {
          "id": "nw-01",
          "slug": "teolbo-godeuni-nowon",
          "name": "털보고된이 생선구이 본점",
          "region_slug": "nowon",
          "region_name": "노원구",
          "neighborhood": "노원역 문화의거리",
          "primary_category": "한식",
          "categories": ["한식"],
          "one_line_intro": "겉바속촉 화덕 고등어구이와 시골 청국장의 로컬 백반 명가",
          "price_range_label": "1만~1.5만원",
          "primary_image": { "url": "...", "alt": "...", "is_placeholder": false },
          "highlights": ["노원역 인근", "로컬 노포"],
          "lat": 37.6568,
          "lng": 127.0628,
          "open_status": "unknown",
          "verification_status": "reference",
          "verified_at": "2026-10-23"
        }
      ],
      "pagination": { "page": 1, "page_size": 12, "total": 24, "total_pages": 2 },
      "applied_filters": {}
    }
    ```
- `GET /api/restaurants/{slug}`
  - 응답: 매장 전체 상세 (Breadcrumb용 지역/상권, 사진 갤러리, 대표/전체 메뉴, 요일별 영업시간 + KST 실시간 `open_status`, 도로명/지번 주소, 전화, 주차, 확인된 편의시설, `verification_status`, `verified_at`, `data_source`, `kakao_url`, 관련 맛집 4건)

### 1.4 카테고리 & 테마 큐레이션 API
- `GET /api/categories` — 13개 표준 카테고리 및 등록 매장 수
- `GET /api/collections` — 테마 큐레이션 목록 (10대 주제)
- `GET /api/collections/{slug}` — 테마 에디토리얼 설명 + 포함 맛집 목록

### 1.5 AI 맛집 추천 컨시어지 API
- `POST /api/concierge/recommend`
  - 요청:
    ```json
    {
      "query": "노원구에서 1만원대로 혼밥하기 좋은 점심 맛집 추천해 줘",
      "region": "nowon",
      "budget": "10000_20000",
      "purpose": "solo_dining",
      "history": []
    }
    ```
  - 처리 원칙:
    1. 질의를 `region`, `neighborhood`, `category`, `budget`, `purpose`, `features`로 구조화
    2. 통합 DB에서 실존 공개 매장만 조회 (매칭 0건 시 조건 완화 안내, 임의 생성 절대 금지)
    3. 조회된 매장 ID 목록만 LLM(Groq)에 전달하여 추천 이유 작성 (장애 시 로컬 템플릿 Fallback)
  - 응답: `summary`, `parsed_intent`, `recommendations[]` (각 항목에 실제 DB `restaurant` 객체 + `ai_reason` 분리 표기), `is_fallback`, `disclaimer`

### 1.6 정보 수정 제보 & 공개 지도 설정
- `POST /api/feedback` — 일반 사용자 제보 접수 (`restaurant_id`, `report_type`, `content`, `reporter_contact` 선택, 입력 길이/Rate Limit 검증)
- `GET /api/settings/public-map-config` — 브라우저 Kakao Maps Web SDK용 공개 JS Key 여부 및 Origin만 반환 (서버 비밀키 절대 미노출)

---

## 2. Admin API (서버 인증 필수 — HttpOnly Cookie 세션 / Bearer 토큰)

- `POST /api/admin/auth/login` — 비밀번호 해시 검증(PBKDF2/Argon2), 로그인 Rate Limiting (분당 5회)
- `POST /api/admin/auth/logout` — 세션 무효화 및 쿠키 만료
- `GET /api/admin/auth/me` — 현재 인증된 관리자 정보 확인 (`401` 반환 시 비인가)
- `GET /api/admin/dashboard` — 지역별 등록 현황, 검수 대기 건수, 미처리 제보 건수, API 연결 상태 요약
- `GET /api/admin/restaurants` — 비공개/폐업/검토 대기 포함 전체 검색
- `POST /api/admin/restaurants` — 신규 등록 (매장명+도로명주소 중복 검사 `409 Conflict`, Audit Log 기록)
- `PATCH /api/admin/restaurants/{id}` — 정보·메뉴·영업시간·검증상태·공개상태 수정 (Audit/Verification Log 기록)
- `DELETE /api/admin/restaurants/{id}` — 소프트 삭제/폐업 처리 또는 완전 삭제
- `POST /api/admin/images` — 이미지 업로드/등록 (확장자·MIME·용량·출처 메타데이터 검증)
- `GET /api/admin/feedback` & `PATCH /api/admin/feedback/{id}` — 제보 조회 및 처리(`resolved`, `rejected`)
- `GET /api/admin/verification-logs` — 정보 검증 이력 조회
- `GET /api/admin/settings/status`, `POST /api/admin/settings/credentials`, `DELETE /api/admin/settings/credentials/{provider}`, `POST /api/admin/settings/test-connection` — 기존 `/api/settings/*` 기능을 관리자 인증 뒤로 이전

---

## 3. 기존 API 하위 호환 정책

- `GET /api/places`, `POST /api/chat`: P2~P5 전환 기간 동안 신규 통합 DB/컨시어지 서비스를 호출하는 어댑터로 호환성을 유지하여 기존 테스트·클라이언트 손상을 방지합니다.
- 구 `POST/DELETE /api/settings/*` 변경 엔드포인트는 P5에서 관리자 인증을 강제하도록 승격하며, 공개 엔드포인트는 `GET /api/settings/public-map-config`만 유지합니다.


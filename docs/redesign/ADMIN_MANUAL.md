# P5 — 동북미식 관리자 운영 매뉴얼 (ADMIN_MANUAL)

## 1. 관리자 접근 및 초기 계정 설정
- 관리자 콘솔은 일반 사용자 네비게이션 및 푸터에 링크되지 않는 독립 경로(`/admin`, `/admin/login`)로 운영되며 `robots.txt` 및 `noindex, nofollow`가 적용되어 있습니다.
- 최초 기동 시 `admins` 테이블이 비어 있는 경우에만 `backend_/.env`의 `ADMIN_DEFAULT_EMAIL`, `ADMIN_DEFAULT_PASSWORD`로 초기 계정이 PBKDF2-SHA256(310,000회) 해시 저장됩니다.
- **운영 배포 전 필수 조치**: `ADMIN_DEFAULT_PASSWORD`를 강력한 비밀번호로 변경하고 `ADMIN_COOKIE_SECURE=true` 및 `DATABASE_URL=postgresql+psycopg://...`를 설정하십시오.

## 2. 주요 운영 업무 절차
1. **대시보드 점검**: 5개 자치구별 공개·검증 수와 `미처리 제보` 건수, 외부 API 상태를 매일 확인합니다.
2. **신규 맛집 등록 및 중복 차단**: `맛집 관리 > 신규 맛집 등록`에서 도로명주소와 좌표를 입력합니다. 동일한 `(매장명, 도로명주소)` 조합이 이미 존재하면 서버가 `409 Conflict`로 자동 차단합니다.
3. **카카오 실존 재검증**: 개별 매장 행의 `재검증` 버튼을 누르면 카카오 로컬 REST API로 실시간 조회하여 `verified` / `needs_verification` 상태와 `verification_logs`를 갱신합니다.
4. **이미지 업로드 및 저작권 준수**:
   - 실제 매장 사진은 반드시 `출처(source_name)`와 `라이선스(license_type)`를 기재해야 합니다.
   - AI 생성 이미지나 스톡 이미지를 매장 실사진으로 위장 등록하는 것은 금지됩니다.
5. **사용자 제보 처리**: `/feedback`에서 접수된 제보는 `제보 & 검증 이력` 탭에서 사실 확인 후 매장 정보를 수정하고 `해결 완료` 또는 `반려` 처리합니다.
6. **외부 API 키 관리**: `외부 API 설정` 탭에서 Groq, Kakao REST, Kakao JS 키를 암호화 저장하고 연결 테스트를 수행합니다. 일반 사용자 UI에는 키 설정 기능이 노출되지 않습니다.

## 3. 정기 백업 및 장애 롤백
```bash
cd backend_
# 정기 백업 (DB 파일 + JSON 논리 스냅샷)
python scripts/db_backup_restore.py backup

# 장애 시 지정 시점으로 롤백
python scripts/db_backup_restore.py restore backend_/data/backups/backup_YYYYMMDD_HHMMSS
```


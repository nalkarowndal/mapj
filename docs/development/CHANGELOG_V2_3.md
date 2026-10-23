# 변경 이력서 v2.3 (CHANGELOG_V2_3)

> **릴리즈 버전:** v2.3.0  
> **릴리즈 일자:** 2026-10-23  
> **주요 테마:** 실제 Kakao Maps Web SDK 미표시 오류 근본 해결, 지도 수명주기 상태 머신 구축, 키 미설정 가이드 혁신, 브라우저 SDK 유효성 검증

---

## 1. 수정한 파일 목록

### Frontend
- `frontend/next.config.ts`: `/api/:path*` -> `http://127.0.0.1:8000/api/:path*` 프록시 리라이트 구축.
- `frontend/store/chatSlice.ts`: `settingsTab` 상태 및 `setSettingsTab`, `openSettingsWithTab`, `triggerMapReload` 액션 추가.
- `frontend/components/map/KakaoMapView.tsx`:
  - 7단계 지도 SDK 수명주기 상태 머신 (`MapSdkLifecycle`) 전면 적용.
  - 안전한 비동기 스크립트 로더 (중복 방지, 8초 타임아웃, Promise 초기화).
  - `ResizeObserver` 기반 컨테이너 크기 변경 감지 및 자동 `map.relayout()`.
  - 자치구 변경 시 Map 재생성 없는 부드러운 `panTo()` 이동.
  - 키 미설정 시 친절한 가이드 화면 (도메인 원클릭 복사, 설정 직행 CTA).
- `frontend/components/map/InteractiveMapFallback.tsx`:
  - 상단 안내 배너 (`[보조 벡터 시각화 모드]`) 및 `[실제 지도 전환 (키 설정)]` 버튼 상시 배치.
  - 단독 '노원구 중심' 문구를 `[대체 좌표계] 노원구 기준 좌표점`으로 명확히 구분.
- `frontend/components/map/MapContainer.tsx`:
  - 맵 컨테이너 flexbox 영역에 `min-h-0` 적용하여 레이아웃 축소 시 오버플로우 방어.
- `frontend/components/settings/SettingsModal.tsx`:
  - `kakao_js` 탭에 `[SDK 브라우저 연결 테스트]` 실시간 검증 버튼 추가.
  - 최신 카카오 개발자 콘솔 경로 안내 (`내 애플리케이션 > 앱 설정 > 플랫폼 > Web 플랫폼 등록`).
  - 현재 브라우저 Origin 원클릭 복사 기능 구현.
  - 키 저장/삭제 시 지도 실시간 재로딩 이벤트(`kakao-map-config-changed`) 발송.

### Backend
- `backend_/main.py`:
  - `POST /api/settings/test-connection`에 `kakao_js` 지원 추가 (키 형식 유효성 진단 및 브라우저 SDK 검증 연계).

### Documentation & QA
- `docs/analysis/KAKAO_MAP_ROOT_CAUSE.md`: 지도 미표시 실제 원인 4대 요소 정밀 분석서.
- `docs/development/KAKAO_MAP_IMPLEMENTATION.md`: 지도 SDK 로딩 아키텍처 및 구현 명세서.
- `docs/qa/KAKAO_MAP_VISUAL_QA.md`: 5대 해상도 스크린샷 23종 기반 시각 품질 및 회귀 테스트 보고서.
- `docs/qa/screenshots/v2_3/`: 5개 뷰포트별 23개 검수 스크린샷 캡처본.
- `run_kakao_map_qa_suite.py`: 5대 해상도 Playwright 자동화 검수 스크립트.
- `test_mock_kakao_map_live.py`: 공식 Kakao Maps 캔버스 렌더링 및 브라우저 SDK 검증 테스트 스크립트.

---

## 2. 해결된 핵심 결함
1. **가짜 지도('노원구 중심' 원형 배경만 단독 표시) 문제 근본 해결**:
   - 키가 없을 때 원인과 해결 방법을 설명하는 가이드 카드를 제공하고 원클릭 복사 및 설정 직행 지원.
2. **REST API Key와 JavaScript Key의 혼동 방지**:
   - SDK 탭 내에 명확한 안내문구 및 브라우저 SDK 테스트 제공.
3. **모바일 탭 전환 시 회색 타일 붕괴 해결**:
   - `ResizeObserver`로 컨테이너 가시성 및 크기를 감지하여 즉각 `relayout()` 실행.
4. **자치구 변경 시 Map 인스턴스 재생성 낭비 제거**:
   - `panTo()`를 활용한 부드러운 중심점 이동.

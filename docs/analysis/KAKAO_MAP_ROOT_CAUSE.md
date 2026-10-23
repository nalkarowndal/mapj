# Kakao Maps 미표시 원인 정밀 분석 보고서 (KAKAO_MAP_ROOT_CAUSE)

## 1. 개요 및 분석 배경
- **현상**: AI 로컬 어시스턴트 실행 후 우측 지도 패널에 실제 도로망, 건물, 지명 타일이 나타나지 않고, 원형 애니메이션 배경과 `'[노원구] 중심'` 문구만 단독 표시됨.
- **분석 대상 코드**:
  - `frontend/components/map/KakaoMapView.tsx`
  - `frontend/components/map/InteractiveMapFallback.tsx`
  - `frontend/components/settings/SettingsModal.tsx`
  - `backend_/settings_manager.py`
  - `backend_/main.py`
  - `backend_/data/settings.json`

---

## 2. 근본 원인(Root Cause) 4대 요소 정밀 진단

### 원인 1: Kakao Maps JavaScript Key 미설정 및 암묵적 Fallback 반환
- **위치**: `backend_/data/settings.json` 및 `KakaoMapView.tsx`
- **세부 내용**:
  - `settings.json` 내 `encrypted_kakao_rest_api_key`는 등록되어 있었으나, 브라우저 Web 지도 렌더링용 키인 `encrypted_kakao_js_key`는 빈 문자열(`""`) 상태였음.
  - `frontend/components/map/KakaoMapView.tsx`의 기존 조건문:
    ```tsx
    if (!activeJsKey) {
      return <InteractiveMapFallback onOpenDetail={onOpenDetail} />;
    }
    ```
  - `activeJsKey`가 비어 있으므로 지도 SDK를 다운로드조차 시도하지 않고 즉시 `InteractiveMapFallback` 컴포넌트로 분기함.
  - `InteractiveMapFallback` 내부에는 카카오 지도가 미설정되었다는 안내 배너나 키 설정 CTA 버튼이 전혀 없었으며, 방사형 레이더 애니메이션과 `<div style={{ left: "50%", top: "50%" }}>{selectedDistrict} 중심</div>` 배지만 중앙에 고정되어 있어 사용자가 실제 지도가 로딩 중이거나 오류인 것으로 오인하게 됨.

### 원인 2: REST API Key와 JavaScript Key의 오인 가능성
- **위치**: 카카오 개발자 콘솔 및 키 등록 구조
- **세부 내용**:
  - 카카오 개발자 센터에서는 하나의 앱에 대해 **REST API 키**, **JavaScript 키**, **Native 앱 키**를 각각 별도로 발급함.
  - `REST API 키`는 백엔드 서버에서 장소 검색(`dapi.kakao.com/v2/local/search/keyword.json`)에만 사용 가능하며, 브라우저 `<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=...">`에 주입하면 카카오 인증 서버가 **401 Unauthorized** 또는 **403 Forbidden**으로 스크립트 다운로드를 즉시 차단함.

### 원인 3: Next.js 프론트엔드 - FastAPI 백엔드 간 API Proxy 부재 및 환경변수 불일치
- **위치**: `frontend/next.config.ts`, `frontend/components/map/KakaoMapView.tsx`
- **세부 내용**:
  - 프론트엔드가 백엔드(`http://localhost:8000`)로부터 공개 지도 설정을 조회할 때 `process.env.NEXT_PUBLIC_API_URL`에 의존하고 있었음.
  - 다른 포트나 호스트명(`127.0.0.1` vs `localhost`), 도커/원격 환경 접속 시 브라우저의 CORS 정책 또는 포트 불일치로 인해 `/api/settings/public-map-config` 호출이 실패하면 키가 존재하더라도 `activeJsKey`가 비어 있는 상태로 머무름.
  - `next.config.ts`에 Next.js 서버 측 리라이트(Proxy) 설정이 누락되어 있었음.

### 원인 4: 모바일 탭 및 숨김 컨테이너의 레이아웃 미측정 (Kakao Maps SDK relayout 누락)
- **위치**: `frontend/components/layout/AppLayout.tsx`, `frontend/components/map/MapContainer.tsx`
- **세부 내용**:
  - 모바일에서는 지도 화면이 기본적으로 `hidden` 상태(`mobileTab !== "map"`)로 마운트됨.
  - 카카오맵 SDK는 컨테이너의 너비와 높이가 `0px`인 상태에서 초기화되면 내부 캔버스 크기를 `0x0`으로 산출하며, 이후 탭이 보여져도 자동으로 타일을 재계산하지 않아 회색/검은색 타일 빈 공간이 나타남.
  - 지도 탭이 표시되는 시점을 감지하여 `map.relayout()` 및 `map.setCenter()`를 호출하는 로직이 없었음.

---

## 3. 해결 조치 요약

1. **API 프록시 및 설정 조회 안정화**:
   - `frontend/next.config.ts`에 `/api/:path*` -> `http://127.0.0.1:8000/api/:path*` Next.js 프록시 리라이트 구축.
   - 브라우저 환경에서 동일 Origin(`/api/settings/public-map-config`)을 통해 CORS 없이 즉시 공개 키 동기화.
2. **7단계 지도 SDK 수명주기 상태 머신 도입**:
   - `config_loading` -> `key_missing` -> `sdk_loading` -> `sdk_ready` -> `map_initializing` -> `map_ready` -> `error` 명확히 분리.
3. **키 미설정 화면 혁신**:
   - 가짜 원형 배경 단독 출력을 완전 제거하고, `카카오 개발자 등록 도메인 (http://localhost:3000)`, `[주소 복사]`, `[카카오 JavaScript 키 설정하기]` 버튼을 명확히 제공.
4. **대체 벡터 지도 고도화 (`InteractiveMapFallback`)**:
   - 상단에 `[보조 벡터 시각화 모드]` 배너와 `[실제 지도 전환 (키 설정)]` 버튼 상시 노출.
   - 단독 '노원구 중심' 배지를 `[대체 좌표계] 노원구 기준 좌표점`으로 명시.
5. **설정 모달 내 브라우저 SDK 유효성 실시간 검증 (`SettingsModal`)**:
   - 카카오 JS 탭에 `[SDK 브라우저 연결 테스트]` 기능 구축.
   - 최신 공식 메뉴 경로 안내(`내 애플리케이션 > 앱 설정 > 플랫폼 > Web 플랫폼 등록`) 및 도메인 원클릭 복사 제공.
6. **ResizeObserver 기반 자동 `map.relayout()` 구축**:
   - 컨테이너 크기 변경(모바일 탭 전환, 데스크톱 우측 패널 토글, 창 리사이징) 시 즉시 `map.relayout()`과 중심점 좌표 복원 실행.

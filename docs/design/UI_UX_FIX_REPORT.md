# AI 로컬 어시스턴트 v2 — UI/UX 정밀 개선 및 디자인 리포트 (UI_UX_FIX_REPORT)

> **문서 버전:** v2.1.0  
> **작성 일자:** 2026-10-23  
> **타겟 디자인 테마:** Dark SaaS Minimalist with Electric Blue & Gold Accent

---

## 1. 개요 및 디자인 원칙

AI 로컬 어시스턴트 v2는 기존의 세련된 다크 테마 정체성(Dark Navy, Slate Surface, Electric Blue 포인트, Warm Gold 강조)을 엄격히 계승하면서, 가독성 저하, 텍스트 잘림, 모바일 내비게이션 결함, 모달 웹 접근성(a11y) 미비 문제를 정밀 수정한 버전입니다.

---

## 2. 기존 UI/UX 결함 및 수정 컴포넌트 목록

### 2.1 수정한 핵심 컴포넌트 매트릭스

| 컴포넌트 경로 | 기존 문제점 | 적용된 개선 사항 |
|:---|:---|:---|
| `components/layout/Header.tsx` | 작은 모바일 화면(320~360px)에서 브랜드 타이틀과 구 선택 드롭다운 겹침 현상, 햄버거 토글 미작동 | 플렉스 랩 방지, 최소 너비 지정, 설정 모달 직행 버튼 추가, 햄버거 메뉴와 MobileDrawer 연동 |
| `components/layout/Sidebar.tsx` | 최근 대화 클릭 시 데이터 미복원, 하단에 설정 진입 버튼 부재 | 최근 대화 완전 세션 복원 액션 연결, 하단 고정 API 설정 버튼 및 서비스 상태 배지 배치 |
| `components/layout/MobileDrawer.tsx` | 컴포넌트 부재 (모바일 메뉴 동작 불가) | **신규 컴포넌트 구축**: 새 대화, 자치구 변경, 대화 히스토리, 설정 모달, 정보 링크를 포괄하는 슬라이드인 드로어 |
| `components/chat/ChatPanel.tsx` | 가짜 타이머 로딩, 긴 마크다운 줄바꿈 미비, 에러 시 재시도 수단 부재 | 실제 네트워크 라이프사이클 동기화, `break-words` 코드블록 가로스크롤 대응, `onRetry` 재시도 버튼 탑재 |
| `components/places/PlaceCard.tsx` | 10~11px 극소 폰트로 가독성 저하, 카드 클릭 시 키보드 접근성 누락 | 본문 14px/보조 12px 상향, 태그 가독성 강화, 출처 배지(데모 vs 라이브) 추가, `Enter/Space` 키보드 인터랙션 지원 |
| `components/places/PlaceDetailModal.tsx` | 긴 업체 소개글 줄바꿈 누락, 출처 메타데이터 미비 | 데이터 출처 및 최근 검증 일자 명시, 카카오맵 길찾기 안전 링크, 스크롤 가능 영역 확보 |
| `components/map/KakaoMapView.tsx` | InfoWindow XSS 취약점, 도메인 불일치 시 백지화 | 안전한 DOM API(`textContent`) 사용, 인터랙티브 폴백 연동, 도메인 등록 가이드 배너 노출 |
| `components/ui/Modal.tsx` | 포커스 트랩 부재로 Tab 키 입력 시 배경 포커스 유출 | 포커스 트랩(Tab/Shift+Tab 루프), 초기 포커스, 닫기 후 트리거 요소 복원, ESC 리스너 |
| `components/settings/SettingsModal.tsx` | 설정 기능 자체 부재 | **신규 개발**: 4개 탭(Groq AI, 카카오 REST, 카카오 JS, 진단)을 지원하는 프리미엄 SaaS 설정 모달 |

---

## 3. 세부 개선 영역별 전후 비교

### 3.1 모바일 반응형 내비게이션 (Mobile Drawer)
- **Before:** 모바일 헤더의 햄버거 버튼을 눌러도 `Sidebar`가 데스크톱 전용(`hidden md:flex`)이어서 아무런 변화가 없었음.
- **After:** 
  - `MobileDrawer`가 오버레이와 함께 부드럽게 좌측에서 슬라이드 인(`translate-x-0`).
  - 현재 선택된 자치구 강조 표시, 최근 대화 목록에서 과거 세션 즉시 복원 가능.
  - 드로어 하단에 [API 설정] 버튼을 배치하여 모바일에서도 Groq 및 카카오 키를 손쉽게 관리.

### 3.2 타이포그래피 및 가독성 (Typography Scale)
- **Before:** 장소 카드의 태그, 주소, 시간 정보가 `text-[10px]`, `text-[11px]`로 지나치게 작아 고해상도 모바일에서 판독이 어려움.
- **After:**
  - 본문 텍스트: `text-sm` (14px) 기준 정립.
  - 메타데이터 및 태그: 최소 `text-xs` (12px)로 상향 조정.
  - 명도 대비: 어두운 배경(`#0B0F19`) 대비 텍스트 컬러를 `text-slate-200` 및 `text-slate-300`으로 매핑하여 WCAG AA 기준(4.5:1 이상)을 충족.

### 3.3 장소 카드 및 상세 모달 인터랙션
- **Before:**
  - 모든 장소에 "검증 완료" 라벨이 붙어 있어 사용자에게 혼동을 줌.
  - 마우스 클릭 외에 키보드(Tab + Enter)로 카드를 열 수 없음.
- **After:**
  - 데이터 출처를 `로컬 참고 데이터 (데모)`와 `카카오 로컬 API`로 투명하게 구분 표기.
  - 카드가 `tabIndex={0}`을 보유하며 키보드 접근성 완비.
  - 선택 시 Electric Blue 링 테두리(`ring-2 ring-blue-500/50`)로 시각적 포커스 명확화.

### 3.4 모달 다이얼로그 접근성 (Focus Trap & A11y)
- **Before:**
  - 모달이 열려도 배경 요소(채팅창, 인풋)로 탭 포커스가 이동하여 스크린 리더 및 키보드 사용자의 조작이 꼬임.
- **After:**
  - WAI-ARIA Dialog 패턴 준수 (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`).
  - 모달 내부 포커스 가능 요소(`button, [href], input, select, textarea`)를 수집하여 Tab 키 입력 시 모달 내부에서만 포커스가 순환.
  - 모달 종료 시 모달을 열었던 트리거 버튼으로 포커스 복원.

---

## 4. 반응형 뷰포트 시각 검수 결과 요약

| 뷰포트 해상도 | 디바이스 구분 | 주요 레이아웃 상태 | 검증 결과 |
|:---:|:---:|:---|:---:|
| **320 × 700** | Ultra-compact Mobile | 헤더 텍스트 줄바꿈 방지, 단일 컬럼 채팅 뷰 | **정상 (No Overflow)** |
| **360 × 800** | Standard Android | 하단 탭바 터치 타겟 48px 이상 확보 | **정상 (Pass)** |
| **390 × 844** | iPhone 14 / 15 | 모바일 드로어 및 지도 전체화면 닫기 동작 | **정상 (Pass)** |
| **768 × 1024** | Tablet (iPad) | 2열 반응형 그리드, 장소 카드 가로 정렬 | **정상 (Pass)** |
| **1024 × 768** | Small Laptop / iPad L | 사이드바 고정, 채팅 및 추천 장소 나란히 배치 | **정상 (Pass)** |
| **1440 × 900** | Standard Desktop | 3단 레이아웃 (사이드바 - 채팅 - 추천장소/지도) | **정상 (Pass)** |

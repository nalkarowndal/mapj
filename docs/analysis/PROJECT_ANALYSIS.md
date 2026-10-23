# 프로젝트 정밀 분석 보고서 (PROJECT_ANALYSIS)

## 1. 프로젝트 개요
- **프로젝트 명**: AI 로컬 어시스턴트 (노원구 맛집 및 지역 생활 AI 비서)
- **목적**: 서울 동북권(노원구, 도봉구, 강북구, 중랑구, 성북구)을 중심으로 지역 맞춤형 맛집, 학원, 카페, 문화공간을 추천하고 인터랙티브 지도와 연계하는 AI 지역 탐색 플랫폼
- **기존 개발 히스토리**: 초기 파이썬 Streamlit 프로토타입(`app.py`, `app2.py`)을 거쳐 Next.js 16 + FastAPI(`main.py`) 기반의 풀스택 아키텍처로 전환 진행 중인 프로젝트

---

## 2. 실제 사용 기술 스택

### 2.1 프론트엔드 (Frontend)
- **프레임워크**: Next.js 16.2.12 (Turbopack, App Router)
- **라이브러리**: React 19.2.4, React-DOM 19.2.4
- **언어**: TypeScript 5.x
- **스타일링**: Tailwind CSS 4.3.3 (`@tailwindcss/postcss`)
- **전역 상태 관리**: Redux Toolkit 2.13.0, React-Redux 9.3.0
- **아이콘 및 마크다운**: React Icons 5.7.0, React Markdown 10.1.0
- **시간/ID 처리**: `@js-temporal/polyfill` 0.5.1
- **문제성 및 미사용 패키지**:
  - `mdb-react-ui-kit` (10.0.0): React 19와 심각한 peer dependency 충돌 발생(`@types/react@^18.0.9`, `framer-motion@10.18.0`). 실제 컴포넌트에서는 사용되지 않고 `layout.tsx`에 CDN 링크만 존재.
  - `@fortawesome/fontawesome-free` (7.3.1): `package.json`에 선언되어 있으나 `react-icons`와 중복이며 `layout.tsx`에 외부 CDN으로도 중복 호출됨.

### 2.2 백엔드 (Backend)
- **런타임**: Python 3.14.5
- **프레임워크**: FastAPI 0.141.1, Uvicorn 0.52.0
- **데이터 검증**: Pydantic 2.13.4
- **AI 클라이언트**: Groq SDK 1.7.0
- **환경 변수**: python-dotenv 1.2.2
- **네트워크 클라이언트**: Requests 2.34.2, Httpx 0.28.1

---

## 3. 폴더 구조 및 파일 구성

```
d:/JSW_React/8_portfolio_123/ai/
├── backend_/
│   ├── .env               # 환경 변수 (GROQ_API_KEY)
│   ├── app.py             # 초기 Streamlit 프로토타입 (하드코딩 가상 장소 템플릿 포함)
│   ├── app2.py            # Streamlit-FastAPI 연동 테스트 프로토타입
│   └── main.py            # FastAPI 백엔드 메인 엔드포인트 (/api/chat)
├── frontend/
│   ├── app/
│   │   ├── globals.css    # Tailwind CSS 4 import
│   │   ├── layout.tsx     # 루트 레이아웃 (외부 CDN 불필요 호출, 메타데이터 오타 존재)
│   │   ├── page.tsx       # 단일 모놀리식 페이지 (335 라인, 모든 UI/상태/이벤트 집중)
│   │   └── providers.tsx  # Redux Provider 래퍼
│   ├── public/            # Next.js 기본 에셋
│   ├── store/
│   │   ├── chatSlice.ts   # Redux 챗봇 상태 및 액션 슬라이스
│   │   └── store.ts       # Redux 스토어 구성
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── next.config.ts
└── docs/                  # (신규 생성) 아키텍처, 분석, QA 산출물
```

---

## 4. 프론트엔드 및 백엔드 아키텍처 분석

### 4.1 프론트엔드 아키텍처
- **컴포넌트 구조**: 모놀리식 구조. `frontend/app/page.tsx` 1개 파일에 헤더, 대화창, 메시지 렌더링, 전송 이벤트, 가짜 지도 배경, 장소 카드 리스트, 모바일 플로팅 토글이 모두 하드코딩되어 결합도(Coupling)가 극히 높음.
- **상태 흐름**: Redux `chatSlice.ts`에 `messages`, `inputText`, `isLoading`, `showMap`, `places`, `mobileView`, `selectedDistrict`를 보관.
  - 단순 텍스트 입력값(`inputText`)까지 키 입력마다 Redux store를 dispatch하여 불필요한 렌더링 비용 발생.
  - `useEffect`에서 `showMap`이 `true`가 되면 모바일 뷰를 강제로 `dispatch(setMobileView("map"))`하여 사용자가 읽고 있던 채팅 화면이 강제 전환되는 심각한 UX 결함 발생.
- **스타일링 시스템**: 다크 글래스모피즘 계열의 인라인 Tailwind 클래스가 산재되어 있으며 통일된 CSS 토큰(디자인 시스템) 부재.

### 4.2 백엔드 아키텍처
- `backend_/main.py`에 단일 `@app.post("/api/chat")` 엔드포인트 존재.
- Groq SDK를 사용하여 시스템 프롬프트로 강제 JSON 응답을 유도(`openai/gpt-oss-120b` 모델 지정).
- 사용자의 이전 대화 내역(Context)을 전달받지 않고 단일 메시지만 Groq에 전달하는 stateless 구조로 후속 질문("그중 주차 가능한 곳 알려줘" 등) 처리 불가.
- 실제 지도 API(카카오 로컬 검색 등)나 공공데이터 연동 없이, LLM이 임의의 위도/경도(lat, lng)와 장소명을 생성하도록 프롬프트가 작성되어 있어 **가상 장소 생성 및 환각(Hallucination)**이 직접 유발됨.

---

## 5. 확인된 UI/UX 및 기능 문제점 (직접 검증 완료)

| 구분 | 위치 | 확인된 문제 내용 | 영향도 |
| :--- | :--- | :--- | :--- |
| **지도** | `frontend/app/page.tsx:215-221` | 실제 지도 SDK가 전혀 없으며 점선 배경과 이모지 레이어만 표시됨 | 높음 (Critical) |
| **환각** | `backend_/main.py:120-127` | LLM에게 임의의 위경도와 업체명을 만들어내도록 지시하여 실존하지 않는 장소 추천 | 높음 (Critical) |
| **API** | `backend_/.env`, `main.py:142` | .env의 Groq API 키가 유효하지 않아 401 인증 실패 발생, 모델명 오지정 | 높음 (Critical) |
| **레이아웃** | `frontend/app/page.tsx` | 데스크톱 사이드바가 없고 화면 가로 전체에 채팅과 가짜 지도가 5:5로 쪼개져 가독성 저하 | 높음 |
| **모바일 UX** | `frontend/app/page.tsx:22-26` | 추천 발생 시 사용자 의사와 무관하게 지도 화면으로 강제 이동됨 | 높음 |
| **입력창** | `frontend/app/page.tsx:189-196` | 1줄 `input` 태그로 줄바꿈 불가, 한글 IME 조합 중 Enter 시 중복 전송 위험 | 보통 |
| **초기 화면** | `frontend/app/page.tsx:143-186` | 첫 진입 시 활용 가이드 및 클릭 가능한 추천 질문(프롬프트) 칩 부재 | 보통 |
| **디자인 위계** | `frontend/app/layout.tsx` | MDBootstrap CSS 및 불필요 외부 CDN 폰트 난립으로 CSS 우선순위 혼선 및 오타("완벽한 시사") | 보통 |

---

## 6. 코드 품질, 보안 및 성능 분석

### 6.1 보안 (Security)
- `backend_/.env`에 실제 키가 노출될 수 있는 위험 존재 (`.gitignore` 설정 점검 필요).
- API 키 인증 오류(401)나 네트워크 실패 시 백엔드가 명확한 에러 코드와 복구 대안을 제공하지 않고 빈 장소 배열을 반환.
- 카카오맵 API 키 및 카카오 로컬 검색 API 키를 클라이언트/서버에서 안전하게 관리하는 가이드 및 데모 모드 필요.

### 6.2 품질 및 의존성 (Code Quality & Dependencies)
- `mdb-react-ui-kit`: React 19와 충돌하여 일반 `npm install` 실패. 제거 및 표준 Tailwind UI 컴포넌트로 대체 필수.
- 중복 폰트/아이콘: `@fortawesome/fontawesome-free` + `react-icons` + `layout.tsx` CDN 링크 3중 중복.
- Next.js 16 빌드 워크스페이스 루트 경고: `next.config.ts` 설정 보완 필요.

### 6.3 성능 (Performance)
- 단일 18KB `page.tsx` 파일 내 모든 UI와 핸들러 집중으로 리렌더링 범위 과다.
- 키보드 타이핑마다 Redux store dispatch 실행으로 입력 지연 가능성.
- 지도 SDK 스크립트 비동기 동적 로딩 최적화 미적용.

---

## 7. 개선 우선순위 및 실행 계획

1. **[보안 및 기반 안정화]**
   - 불필요/충돌 의존성(`mdb-react-ui-kit`, 외부 CDN) 정리 및 `package.json`, `layout.tsx` 정비
   - `next.config.ts` Turbopack 루트 정리
   - 백엔드 예외 처리 강화 및 안정적인 모델 fallback, 검증된 지역 데이터셋 기반 실존 장소 검색 엔진 구축
2. **[디자인 시스템 및 토큰 구축]**
   - 다크 모드 기반 세련된 CSS 변수 토큰 및 유틸리티 구축 (`globals.css`)
   - 버튼, 인풋, 카드, 뱃지, 탭, 스켈레톤, 모달 공통 컴포넌트 라이브러리 제작
3. **[3열 레이아웃 리디자인]**
   - 좌측: 네비게이션 & 대화 기록 사이드바 (접기/펼치기 가능)
   - 중앙: 현대적 AI 채팅 패널 (프롬프트 추천 칩, 다중 턴 문맥, 자동 리사이징 인풋)
   - 우측: 실시간 인터랙티브 지도 & 검증된 장소 탐색 패널 (카카오맵 연동 + 인터랙티브 폴백)
4. **[실제 장소 추천 & 카카오맵 연동]**
   - 노원/도봉/강북/중랑/성북 5개 구의 실존 검증 데이터셋 + 카카오 로컬 REST API 연동
   - 클라이언트 카카오맵 SDK 스크립트 동적 로더 및 마커-카드 상호 연동(동기화)
   - 외부 API 미설정 시에도 완벽히 시연 가능한 '공식 검증 로컬 데모 모드' 명시 구현
5. **[반응형 & 접근성 & E2E QA]**
   - 모바일 3개 탭(채팅/추천목록/지도) 하단 내비게이션 및 바텀시트
   - 실제 브라우저 자동화 검수 및 스크린샷 캡처

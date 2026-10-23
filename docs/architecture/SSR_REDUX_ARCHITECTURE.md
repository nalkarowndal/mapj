# Next.js App Router — SSR & Redux Toolkit 아키텍처 명세서 (SSR_REDUX_ARCHITECTURE)

> **시스템 분류:** Frontend State & Rendering Architecture  
> **적용 버전:** Next.js 16.2.12 (Turbopack) · React 19 · Redux Toolkit 2.x  
> **설계 목표:** 100% Deterministic SSR Rendering & Zero Hydration Mismatch  

---

## 1. Hydration Mismatch 원인 분석 (Root Causes)

Next.js App Router에서 서버 사이드 렌더링(SSR)을 수행할 때, 서버가 사전 생성한 초기 HTML DOM 트리와 클라이언트 브라우저가 자바스크립트를 로드하여 마운트(Hydration)할 때 생성한 가상 DOM 트리가 1글자라도 다르면 **React Hydration Error**가 발생합니다.

### 본 프로젝트에서 식별되었던 3대 불일치 원인
1. **동적 타임스탬프 (`Date.now()`):**
   - 모듈 최상단에서 `Date.now()`를 평가할 경우, 서버 빌드/요청 시점(예: 10:42)과 브라우저 로드 시점(예: 11:13)의 시간이 달라 텍스트 불일치 발생.
2. **로케일 및 타임존 의존 렌더링 (`toLocaleTimeString()`):**
   - `toLocaleTimeString([], ...)`은 런타임 호스트 OS의 기본 로케일과 시스템 타임존에 종속됨. 서버가 UTC이거나 브라우저 언어 설정이 다를 경우 "오전" vs "AM", 9시간 시차 발생.
3. **모듈 전역 싱글톤 Store (`export const store = configureStore(...)`):**
   - 서버 사이드에서 모듈 스코프의 store는 여러 요청 간에 공유될 수 있어, 요청 간 상태 오염(State Pollution) 및 서버-클라이언트 초기 상태 불일치를 유발함.

---

## 2. 해결된 Redux Store 초기화 아키텍처

Next.js 공식 권장 사양에 따라 **요청별 Store 팩토리 패턴 (`makeStore`)**과 **클라이언트 `useRef` 싱글톤 패턴**을 결합하였습니다.

```
[Server Request / SSR]
  │
  ├─> makeStore() 팩토리 호출 (독립된 신규 Store 인스턴스 생성)
  │     └─ chatSlice: 결정론적 초기 상태 (초기 환영 메시지 타임스탬프 생략)
  │
  └─> HTML 사전 렌더링 (Static Prerender)

[Client Browser Mount]
  │
  ├─> Providers 컴포넌트: useRef<AppStore | null>(null)
  │     └─ storeRef.current가 없을 때 1회만 makeStore() 인스턴스 생성
  │     └─ 이후 리렌더링 시에도 동일한 Store 인스턴스 유지
  │
  └─> Hydration 성공 (서버 HTML과 클라이언트 Virtual DOM 100% 일치)
```

### 2.1 `store.ts` 구현 명세
```typescript
import { configureStore } from "@reduxjs/toolkit";
import chatReducer from "./chatSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      chat: chatReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
```

### 2.2 `providers.tsx` 구현 명세
```typescript
"use client";

import React, { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore, AppStore } from "@/store/store";

export function Providers({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
```

---

## 3. 결정론적 타임스탬프 렌더링 설계 (`ChatMessageItem.tsx`)

`suppressHydrationWarning`에 의존하여 에러를 억지로 숨기는 편법을 완전히 걷어내고, **Intl.DateTimeFormat** 기반의 결정론적 포맷터를 구축하였습니다.

### 3.1 원칙
1. **최초 환영 메시지 (`id: 'init-1'`):**
   - `timestamp` 속성을 아예 전달하지 않음.
   - 포맷터가 `null`을 반환하여 시간 `<span>` 태그 자체를 렌더링하지 않음으로써, 불필요한 고정 과거 시간 표시를 제거하고 UI를 정돈.
2. **실제 전송된 메시지:**
   - 메시지 전송 시 유효한 양의 정수 Epoch Milliseconds(`message.timestamp`) 부여.
   - 포맷터는 `timeZone: "Asia/Seoul"`, `locale: "ko-KR"`을 명시하여 전 세계 어떤 서버/클라이언트 환경에서도 동일한 시각 문자열("오전 11:45" 등)을 반환.

```typescript
const formattedTime = React.useMemo(() => {
  if (
    typeof message.timestamp !== "number" ||
    isNaN(message.timestamp) ||
    message.timestamp <= 0
  ) {
    return null;
  }
  try {
    const formatter = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return formatter.format(new Date(message.timestamp));
  } catch {
    return null;
  }
}, [message.timestamp]);
```

---

## 4. 대화 세션 상태 관리 모델 (`FullSession`)

과거 대화 복원 시 메시지와 장소 목록이 유실되던 문제를 해결하기 위해, `FullSession` 인터페이스를 기반으로 세션별 상태 격리 구조를 완성하였습니다.

```typescript
export interface FullSession {
  id: string;
  title: string;
  district: DistrictName;
  messages: ChatMessage[];
  places: PlaceInfo[];
  createdAt: number;
  updatedAt: number;
}
```

- **`startNewChat`:** 기존 활성 세션의 `messages`와 `places`를 스냅샷 저장 후, 새로운 세션을 딕셔너리(`sessions[newSessionId]`)에 등록.
- **`switchSession(targetId)`:** 타겟 세션의 `messages`, `places`, `district`를 활성 상태로 원상 복구하고 지도 및 마커 상태 동기화.

---

## 5. 회귀 방지(Anti-Regression) 가이드라인

1. **컴포넌트 렌더 함수 내부에서 `Date.now()`, `Math.random()`, `uuid()` 호출 금지**: ID 및 타임스탬프는 이벤트 핸들러(사용자 클릭/전송) 또는 백엔드 응답에서 생성하여 전달할 것.
2. **브라우저 전용 API (`window`, `localStorage`)는 `useEffect` 내부에서만 접근할 것**.
3. **시간/날짜 렌더링 시 반드시 `Intl.DateTimeFormat`에 `timeZone`과 `locale`을 고정 명시할 것**.

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  DistrictName,
  PlaceInfo,
  ChatMessage,
  MobileTab,
  CategoryFilter,
  FullSession,
  SettingsStatusResponse,
} from "@/lib/types";

interface ChatState {
  messages: ChatMessage[];
  inputText: string;
  isLoading: boolean;
  loadingStep: string;
  showMap: boolean;
  places: PlaceInfo[];
  selectedPlaceId: string | null;
  mobileView: "chat" | "map";
  mobileTab: MobileTab;
  selectedDistrict: DistrictName;
  activeCategory: CategoryFilter;
  isSidebarOpen: boolean;
  isMobileDrawerOpen: boolean;
  isSettingsOpen: boolean;
  activeSessionId: string;
  sessions: Record<string, FullSession>;
  settingsStatus: SettingsStatusResponse | null;
  requestNonce: number; // 요청 정합성 관리용 일련번호 (지역 변경/세션 전환 시 증가)
}

const initialSessionId = "session-initial";
const initialMessages: ChatMessage[] = [
  {
    id: "init-1",
    text: "안녕하세요! 서울 동북권 맞춤형 **AI 로컬 어시스턴트**입니다. 🤖\n\n선택하신 자치구의 **맛집, 카페, 학원가, 문화 명소**를 AI와 실시간 인터랙티브 지도로 탐색해 보세요. 아래 추천 질문을 누르시거나 직접 물어보세요!",
    sender: "ai",
    district: "노원구",
  },
];

const initialSession: FullSession = {
  id: initialSessionId,
  title: "노원구 첫 대화",
  district: "노원구",
  messages: initialMessages,
  places: [],
  createdAt: 0,
  updatedAt: 0,
};

const initialState: ChatState = {
  messages: initialMessages,
  inputText: "",
  isLoading: false,
  loadingStep: "",
  showMap: false,
  places: [],
  selectedPlaceId: null,
  mobileView: "chat",
  mobileTab: "chat",
  selectedDistrict: "노원구",
  activeCategory: "전체",
  isSidebarOpen: true,
  isMobileDrawerOpen: false,
  isSettingsOpen: false,
  activeSessionId: initialSessionId,
  sessions: {
    [initialSessionId]: initialSession,
  },
  settingsStatus: null,
  requestNonce: 1,
};

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setInputText: (state, action: PayloadAction<string>) => {
      state.inputText = action.payload;
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
      if (!action.payload) {
        state.loadingStep = "";
      }
    },
    setLoadingStep: (state, action: PayloadAction<string>) => {
      state.loadingStep = action.payload;
    },
    setShowMap: (state, action: PayloadAction<boolean>) => {
      state.showMap = action.payload;
    },
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);

      // 현재 활성 세션에 메시지 동기화
      const current = state.sessions[state.activeSessionId];
      if (current) {
        current.messages = state.messages;
        current.updatedAt = Date.now();
        // 첫 사용자 메시지로 세션 제목 자동 설정
        if (
          action.payload.sender === "user" &&
          state.messages.filter((m) => m.sender === "user").length === 1
        ) {
          current.title = action.payload.text.slice(0, 24);
        }
      }
    },
    setPlaces: (state, action: PayloadAction<PlaceInfo[]>) => {
      state.places = action.payload;
      if (action.payload.length > 0 && !state.selectedPlaceId) {
        state.selectedPlaceId = action.payload[0].id;
      }
      // 세션에 장소 목록 동기화
      const current = state.sessions[state.activeSessionId];
      if (current) {
        current.places = action.payload;
        current.updatedAt = Date.now();
      }
    },
    setSelectedPlaceId: (state, action: PayloadAction<string | null>) => {
      state.selectedPlaceId = action.payload;
    },
    setMobileView: (state, action: PayloadAction<"chat" | "map">) => {
      state.mobileView = action.payload;
      state.mobileTab = action.payload === "map" ? "map" : "chat";
    },
    setMobileTab: (state, action: PayloadAction<MobileTab>) => {
      state.mobileTab = action.payload;
      state.mobileView = action.payload === "map" ? "map" : "chat";
    },
    // [Bug 1-10 해결]: 모바일 지도 닫기 시 화면 탭까지 안전하게 복귀
    closeMap: (state) => {
      state.showMap = false;
      if (state.mobileTab === "map") {
        state.mobileTab = "chat";
        state.mobileView = "chat";
      }
    },
    // [Bug 1-4 해결]: 자치구 변경 시 이전 장소 목록 정리 및 요청 정합성 관리
    setSelectedDistrict: (state, action: PayloadAction<DistrictName>) => {
      if (state.selectedDistrict !== action.payload) {
        state.selectedDistrict = action.payload;
        // 이전 지역 결과가 새 지역 추천으로 남지 않도록 초기화
        state.places = [];
        state.selectedPlaceId = null;
        state.showMap = false;
        state.activeCategory = "전체";
        state.requestNonce += 1; // 진행 중인 이전 지역 비동기 응답 폐기용

        // 현재 세션의 자치구 정보 갱신
        const current = state.sessions[state.activeSessionId];
        if (current) {
          current.district = action.payload;
          current.places = [];
        }
      }
    },
    setActiveCategory: (state, action: PayloadAction<CategoryFilter>) => {
      state.activeCategory = action.payload;
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.isSidebarOpen = action.payload;
    },
    // [Bug 1-9 해결]: 모바일 전용 드로어 열림 상태 관리
    setMobileDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.isMobileDrawerOpen = action.payload;
    },
    // 설정 모달 열림 상태 관리
    setSettingsOpen: (state, action: PayloadAction<boolean>) => {
      state.isSettingsOpen = action.payload;
    },
    setSettingsStatus: (state, action: PayloadAction<SettingsStatusResponse | null>) => {
      state.settingsStatus = action.payload;
    },
    // [Bug 1-11 해결]: 새 대화 생성 및 기존 세션 저장
    startNewChat: (
      state,
      action: PayloadAction<{ sessionId?: string; timestamp?: number } | void>
    ) => {
      // 1. 현재 세션 스냅샷 저장
      if (state.sessions[state.activeSessionId]) {
        state.sessions[state.activeSessionId].messages = state.messages;
        state.sessions[state.activeSessionId].places = state.places;
      }

      // 2. 새 세션 초기화 (payload 파라미터 우선 적용)
      const now = action?.payload?.timestamp || Date.now();
      const newSessionId = action?.payload?.sessionId || `session-${now}`;
      const newMessages: ChatMessage[] = [
        {
          id: `init-${now}`,
          text: `**${state.selectedDistrict}** 새로운 대화를 시작합니다. 🤖\n\n무엇을 찾아드릴까요? 추천 질문을 누르시거나 찾으시는 장소나 분야를 입력해 주세요.`,
          sender: "ai",
          district: state.selectedDistrict,
        },
      ];

      const newSession: FullSession = {
        id: newSessionId,
        title: `${state.selectedDistrict} 새 대화`,
        district: state.selectedDistrict,
        messages: newMessages,
        places: [],
        createdAt: now,
        updatedAt: now,
      };

      state.sessions[newSessionId] = newSession;
      state.activeSessionId = newSessionId;
      state.messages = newMessages;
      state.places = [];
      state.selectedPlaceId = null;
      state.showMap = false;
      state.inputText = "";
      state.requestNonce += 1;
      state.isMobileDrawerOpen = false;
    },
    // [Bug 1-11 해결]: 기존 세션 완벽 복구
    switchSession: (state, action: PayloadAction<string>) => {
      const targetSessionId = action.payload;
      if (targetSessionId === state.activeSessionId) {
        state.isMobileDrawerOpen = false;
        return;
      }

      // 1. 현재 세션 저장
      if (state.sessions[state.activeSessionId]) {
        state.sessions[state.activeSessionId].messages = state.messages;
        state.sessions[state.activeSessionId].places = state.places;
      }

      // 2. 대상 세션 로드
      const target = state.sessions[targetSessionId];
      if (target) {
        state.activeSessionId = target.id;
        state.messages = target.messages || [];
        state.places = target.places || [];
        state.selectedDistrict = target.district;
        state.selectedPlaceId = target.places?.length > 0 ? target.places[0].id : null;
        state.showMap = target.places?.length > 0;
        state.requestNonce += 1;
      }
      state.isMobileDrawerOpen = false;
    },
    // [Bug 1-11 해결]: 세션 삭제
    deleteSession: (state, action: PayloadAction<string>) => {
      const sessionToDelete = action.payload;
      delete state.sessions[sessionToDelete];

      // 삭제한 세션이 현재 세션인 경우 남아있는 세션으로 전환하거나 새로 생성
      if (state.activeSessionId === sessionToDelete) {
        const remainingKeys = Object.keys(state.sessions);
        if (remainingKeys.length > 0) {
          const nextSession = state.sessions[remainingKeys[0]];
          state.activeSessionId = nextSession.id;
          state.messages = nextSession.messages;
          state.places = nextSession.places;
          state.selectedDistrict = nextSession.district;
          state.selectedPlaceId = nextSession.places?.[0]?.id || null;
          state.showMap = nextSession.places?.length > 0;
        } else {
          // 남은 세션이 없으면 새 대화 자동 생성
          const newId = `session-${Date.now()}`;
          const newSession: FullSession = {
            id: newId,
            title: `${state.selectedDistrict} 새 대화`,
            district: state.selectedDistrict,
            messages: initialMessages,
            places: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          state.sessions[newId] = newSession;
          state.activeSessionId = newId;
          state.messages = initialMessages;
          state.places = [];
          state.selectedPlaceId = null;
          state.showMap = false;
        }
      }
    },
    // 세션 이름 변경
    renameSession: (
      state,
      action: PayloadAction<{ sessionId: string; title: string }>
    ) => {
      const session = state.sessions[action.payload.sessionId];
      if (session && action.payload.title.trim()) {
        session.title = action.payload.title.trim();
      }
    },
    clearAllMessages: (state) => {
      state.messages = [];
      state.places = [];
      state.selectedPlaceId = null;
    },
  },
});

export const {
  setInputText,
  setIsLoading,
  setLoadingStep,
  setShowMap,
  addMessage,
  setPlaces,
  setSelectedPlaceId,
  setMobileView,
  setMobileTab,
  closeMap,
  setSelectedDistrict,
  setActiveCategory,
  toggleSidebar,
  setSidebarOpen,
  setMobileDrawerOpen,
  setSettingsOpen,
  setSettingsStatus,
  startNewChat,
  switchSession,
  deleteSession,
  renameSession,
  clearAllMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
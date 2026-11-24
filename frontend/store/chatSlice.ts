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
import { INITIAL_CURATED_PLACES } from "@/lib/districtData";

interface ChatState {
  messages: ChatMessage[];
  inputText: string;
  isLoading: boolean;
  loadingStep: string;
  showMap: boolean;
  places: PlaceInfo[];
  bookmarkedIds: string[];
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
  settingsTab: "groq" | "kakao_rest" | "kakao_js" | "system";
  mapReloadTrigger: number;
  requestNonce: number;
}

const initialSessionId = "session-initial";
const initialDistrict: DistrictName = "노원구";
const initialDistrictPlaces = INITIAL_CURATED_PLACES[initialDistrict] || [];

const initialMessages: ChatMessage[] = [
  {
    id: "init-1",
    text: "안녕하세요! 서울 동북권 미식 가이드 **맛탐정 동북 AI 컨시어지**입니다. 🍽️\n\n좌측과 중앙의 **맛집 큐레이션 쇼케이스**에서 자치구별 엄선된 노포·고기·베이커리 맛집을 바로 둘러보시거나, 오늘의 모임 목적·예산·취향을 저에게 물어보세요!",
    sender: "ai",
    district: initialDistrict,
  },
];

const initialSession: FullSession = {
  id: initialSessionId,
  title: "노원구 미식 탐색",
  district: initialDistrict,
  messages: initialMessages,
  places: initialDistrictPlaces,
  createdAt: 0,
  updatedAt: 0,
};

const initialState: ChatState = {
  messages: initialMessages,
  inputText: "",
  isLoading: false,
  loadingStep: "",
  showMap: true,
  places: initialDistrictPlaces,
  bookmarkedIds: ["nw-01", "db-01", "gb-01", "jn-02", "sb-01"],
  selectedPlaceId: initialDistrictPlaces[0]?.id || null,
  mobileView: "chat",
  mobileTab: "places",
  selectedDistrict: initialDistrict,
  activeCategory: "전체",
  isSidebarOpen: true,
  isMobileDrawerOpen: false,
  isSettingsOpen: false,
  settingsTab: "groq",
  mapReloadTrigger: 0,
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

      const current = state.sessions[state.activeSessionId];
      if (current) {
        current.messages = state.messages;
        current.updatedAt = Date.now();
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
      if (action.payload.length > 0) {
        state.selectedPlaceId = action.payload[0].id;
      }
      const current = state.sessions[state.activeSessionId];
      if (current) {
        current.places = action.payload;
        current.updatedAt = Date.now();
      }
    },
    resetDistrictPlaces: (state) => {
      const curated = INITIAL_CURATED_PLACES[state.selectedDistrict] || [];
      state.places = curated;
      state.selectedPlaceId = curated[0]?.id || null;
      state.activeCategory = "전체";
    },
    toggleBookmark: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.bookmarkedIds.includes(id)) {
        state.bookmarkedIds = state.bookmarkedIds.filter((item) => item !== id);
      } else {
        state.bookmarkedIds.push(id);
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
    closeMap: (state) => {
      state.showMap = false;
      if (state.mobileTab === "map") {
        state.mobileTab = "places";
        state.mobileView = "chat";
      }
    },
    setSelectedDistrict: (state, action: PayloadAction<DistrictName>) => {
      if (state.selectedDistrict !== action.payload) {
        state.selectedDistrict = action.payload;
        const defaultPlaces = INITIAL_CURATED_PLACES[action.payload] || [];
        state.places = defaultPlaces;
        state.selectedPlaceId = defaultPlaces[0]?.id || null;
        state.showMap = true;
        state.activeCategory = "전체";
        state.requestNonce += 1;

        const current = state.sessions[state.activeSessionId];
        if (current) {
          current.district = action.payload;
          current.places = defaultPlaces;
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
    setMobileDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.isMobileDrawerOpen = action.payload;
    },
    setSettingsOpen: (state, action: PayloadAction<boolean>) => {
      state.isSettingsOpen = action.payload;
    },
    setSettingsTab: (
      state,
      action: PayloadAction<"groq" | "kakao_rest" | "kakao_js" | "system">
    ) => {
      state.settingsTab = action.payload;
    },
    openSettingsWithTab: (
      state,
      action: PayloadAction<"groq" | "kakao_rest" | "kakao_js" | "system">
    ) => {
      state.settingsTab = action.payload;
      state.isSettingsOpen = true;
    },
    triggerMapReload: (state) => {
      state.mapReloadTrigger += 1;
    },
    setSettingsStatus: (state, action: PayloadAction<SettingsStatusResponse | null>) => {
      state.settingsStatus = action.payload;
    },
    startNewChat: (
      state,
      action: PayloadAction<{ sessionId?: string; timestamp?: number } | void>
    ) => {
      if (state.sessions[state.activeSessionId]) {
        state.sessions[state.activeSessionId].messages = state.messages;
        state.sessions[state.activeSessionId].places = state.places;
      }

      const now = action?.payload?.timestamp || Date.now();
      const newSessionId = action?.payload?.sessionId || `session-${now}`;
      const defaultPlaces = INITIAL_CURATED_PLACES[state.selectedDistrict] || [];
      const newMessages: ChatMessage[] = [
        {
          id: `init-${now}`,
          text: `**${state.selectedDistrict}** 미식 컨시어지 세션을 새로 시작합니다. 🍽️\n\n어떤 맛집을 찾으시나요? 노포, 고기/구이, 베이커리 카페, 데이트 코스 등 원하시는 메뉴를 물어보세요.`,
          sender: "ai",
          district: state.selectedDistrict,
        },
      ];

      const newSession: FullSession = {
        id: newSessionId,
        title: `${state.selectedDistrict} 미식 탐색`,
        district: state.selectedDistrict,
        messages: newMessages,
        places: defaultPlaces,
        createdAt: now,
        updatedAt: now,
      };

      state.sessions[newSessionId] = newSession;
      state.activeSessionId = newSessionId;
      state.messages = newMessages;
      state.places = defaultPlaces;
      state.selectedPlaceId = defaultPlaces[0]?.id || null;
      state.showMap = true;
      state.inputText = "";
      state.requestNonce += 1;
      state.isMobileDrawerOpen = false;
    },
    switchSession: (state, action: PayloadAction<string>) => {
      const targetSessionId = action.payload;
      if (targetSessionId === state.activeSessionId) {
        state.isMobileDrawerOpen = false;
        return;
      }

      if (state.sessions[state.activeSessionId]) {
        state.sessions[state.activeSessionId].messages = state.messages;
        state.sessions[state.activeSessionId].places = state.places;
      }

      const target = state.sessions[targetSessionId];
      if (target) {
        state.activeSessionId = target.id;
        state.messages = target.messages || [];
        const fallbackPlaces = INITIAL_CURATED_PLACES[target.district] || [];
        state.places = target.places?.length ? target.places : fallbackPlaces;
        state.selectedDistrict = target.district;
        state.selectedPlaceId = state.places[0]?.id || null;
        state.showMap = true;
        state.requestNonce += 1;
      }
      state.isMobileDrawerOpen = false;
    },
    deleteSession: (state, action: PayloadAction<string>) => {
      const sessionToDelete = action.payload;
      delete state.sessions[sessionToDelete];

      if (state.activeSessionId === sessionToDelete) {
        const remainingKeys = Object.keys(state.sessions);
        if (remainingKeys.length > 0) {
          const nextSession = state.sessions[remainingKeys[0]];
          state.activeSessionId = nextSession.id;
          state.messages = nextSession.messages;
          const fallbackPlaces = INITIAL_CURATED_PLACES[nextSession.district] || [];
          state.places = nextSession.places?.length ? nextSession.places : fallbackPlaces;
          state.selectedDistrict = nextSession.district;
          state.selectedPlaceId = state.places[0]?.id || null;
          state.showMap = true;
        } else {
          const newId = `session-${Date.now()}`;
          const defaultPlaces = INITIAL_CURATED_PLACES[state.selectedDistrict] || [];
          const newSession: FullSession = {
            id: newId,
            title: `${state.selectedDistrict} 미식 탐색`,
            district: state.selectedDistrict,
            messages: initialMessages,
            places: defaultPlaces,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          state.sessions[newId] = newSession;
          state.activeSessionId = newId;
          state.messages = initialMessages;
          state.places = defaultPlaces;
          state.selectedPlaceId = defaultPlaces[0]?.id || null;
          state.showMap = true;
        }
      }
    },
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
  resetDistrictPlaces,
  toggleBookmark,
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
  setSettingsTab,
  openSettingsWithTab,
  triggerMapReload,
  setSettingsStatus,
  startNewChat,
  switchSession,
  deleteSession,
  renameSession,
  clearAllMessages,
} = chatSlice.actions;

export default chatSlice.reducer;

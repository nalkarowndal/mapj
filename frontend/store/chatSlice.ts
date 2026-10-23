import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { DistrictName, PlaceInfo, ChatMessage, MobileTab, CategoryFilter } from "@/lib/types";

export interface ConversationSummary {
  id: string;
  title: string;
  district: DistrictName;
  timestamp: number;
}

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
  recentConversations: ConversationSummary[];
  activeSessionId: string;
}

const initialSessionId = `session-${Date.now()}`;

const initialState: ChatState = {
  messages: [
    {
      id: "init-1",
      text: "안녕하세요! 서울 동북권 맞춤형 **AI 로컬 어시스턴트**입니다. 🤖\n\n선택하신 자치구의 **맛집, 카페, 학원가, 문화 명소**를 AI와 실시간 인터랙티브 지도로 탐색해 보세요. 아래 추천 질문을 누르시거나 직접 물어보세요!",
      sender: "ai",
      timestamp: Date.now(),
      district: "노원구",
    },
  ],
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
  recentConversations: [
    {
      id: initialSessionId,
      title: "노원구 첫 대화",
      district: "노원구",
      timestamp: Date.now(),
    },
  ],
  activeSessionId: initialSessionId,
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
      // Update session title if first user message
      if (action.payload.sender === "user" && state.messages.filter((m) => m.sender === "user").length === 1) {
        const session = state.recentConversations.find((s) => s.id === state.activeSessionId);
        if (session) {
          session.title = action.payload.text.slice(0, 24);
        }
      }
    },
    setPlaces: (state, action: PayloadAction<PlaceInfo[]>) => {
      state.places = action.payload;
      if (action.payload.length > 0 && !state.selectedPlaceId) {
        state.selectedPlaceId = action.payload[0].id;
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
    setSelectedDistrict: (state, action: PayloadAction<DistrictName>) => {
      state.selectedDistrict = action.payload;
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
    startNewChat: (state) => {
      const newId = `session-${Date.now()}`;
      state.activeSessionId = newId;
      state.messages = [
        {
          id: `init-${Date.now()}`,
          text: `**${state.selectedDistrict}** 새로운 대화를 시작합니다. 🤖\n\n무엇을 찾아드릴까요? 추천 질문을 누르시거나 찾으시는 장소나 분야를 입력해 주세요.`,
          sender: "ai",
          timestamp: Date.now(),
          district: state.selectedDistrict,
        },
      ];
      state.places = [];
      state.selectedPlaceId = null;
      state.showMap = false;
      state.recentConversations.unshift({
        id: newId,
        title: `${state.selectedDistrict} 새 대화`,
        district: state.selectedDistrict,
        timestamp: Date.now(),
      });
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
  setSelectedDistrict,
  setActiveCategory,
  toggleSidebar,
  setSidebarOpen,
  startNewChat,
  clearAllMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
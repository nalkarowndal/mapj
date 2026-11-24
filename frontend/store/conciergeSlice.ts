import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RestaurantSummary } from "@/lib/types/gourmet";

export interface ConciergeRecommendationItem {
  restaurant: RestaurantSummary;
  ai_reason: string;
}

export interface ConciergeTurn {
  id: string;
  query: string;
  region?: string;
  budget?: string;
  purpose?: string;
  summary: string;
  recommendations: ConciergeRecommendationItem[];
  isFallback: boolean;
  disclaimer: string;
  createdAt: number;
}

interface ConciergeState {
  turns: ConciergeTurn[];
  activeTurnId: string | null;
}

const initialState: ConciergeState = {
  turns: [],
  activeTurnId: null,
};

export const conciergeSlice = createSlice({
  name: "concierge",
  initialState,
  reducers: {
    addConciergeTurn: (state, action: PayloadAction<ConciergeTurn>) => {
      state.turns.unshift(action.payload);
      state.activeTurnId = action.payload.id;
    },
    selectConciergeTurn: (state, action: PayloadAction<string>) => {
      state.activeTurnId = action.payload;
    },
    clearConciergeHistory: (state) => {
      state.turns = [];
      state.activeTurnId = null;
    },
  },
});

export const {
  addConciergeTurn,
  selectConciergeTurn,
  clearConciergeHistory,
} = conciergeSlice.actions;

export default conciergeSlice.reducer;


import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface BookmarksState {
  ids: string[];
  hydrated: boolean;
}

// 지시문 17절: 초기 샘플 저장 목록 완전 제거 — 사용자가 실제 저장한 항목만 표시
const initialState: BookmarksState = {
  ids: [],
  hydrated: false,
};

export const bookmarksSlice = createSlice({
  name: "bookmarks",
  initialState,
  reducers: {
    hydrateBookmarks: (state, action: PayloadAction<string[]>) => {
      state.ids = Array.from(new Set(action.payload.filter(Boolean)));
      state.hydrated = true;
    },
    toggleSavedRestaurant: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.ids.includes(id)) {
        state.ids = state.ids.filter((item) => item !== id);
      } else {
        state.ids.push(id);
      }
    },
    clearSavedRestaurants: (state) => {
      state.ids = [];
    },
  },
});

export const {
  hydrateBookmarks,
  toggleSavedRestaurant,
  clearSavedRestaurants,
} = bookmarksSlice.actions;

export default bookmarksSlice.reducer;


// Redux Store per-request factory for Next.js App Router (SSR safe)
import { configureStore } from "@reduxjs/toolkit";
import chatReducer from "./chatSlice";
import bookmarksReducer from "./bookmarksSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      chat: chatReducer,
      bookmarks: bookmarksReducer,
    },
  });
};

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

export const store = makeStore();

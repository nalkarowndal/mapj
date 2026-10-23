// Redux Store per-request factory for Next.js App Router (SSR safe)
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

// Fallback singleton for non-component utilities if needed
export const store = makeStore();
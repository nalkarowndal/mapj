"use client";
import { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "@/store/store";
import {
  hydrateBookmarks,
  toggleSavedRestaurant,
  clearSavedRestaurants,
} from "@/store/bookmarksSlice";

const STORAGE_KEY = "dongbuk_table_saved_restaurants_v1";

export function useBookmarks() {
  const dispatch = useDispatch<AppDispatch>();
  const { ids, hydrated } = useSelector((state: RootState) => state.bookmarks);

  useEffect(() => {
    if (hydrated || typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          dispatch(
            hydrateBookmarks(parsed.filter((v): v is string => typeof v === "string"))
          );
          return;
        }
      }
    } catch {
      // Ignore storage read errors
    }
    dispatch(hydrateBookmarks([]));
  }, [dispatch, hydrated]);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
      // Ignore storage write errors
    }
  }, [ids, hydrated]);

  const toggle = useCallback(
    (id: string) => {
      dispatch(toggleSavedRestaurant(id));
    },
    [dispatch]
  );

  const isSaved = useCallback((id: string) => ids.includes(id), [ids]);

  const clearAll = useCallback(() => {
    dispatch(clearSavedRestaurants());
  }, [dispatch]);

  return {
    savedIds: ids,
    savedCount: hydrated ? ids.length : 0,
    hydrated,
    isSaved,
    toggle,
    clearAll,
  };
}


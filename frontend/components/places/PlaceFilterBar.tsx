"use client";
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { setActiveCategory } from "@/store/chatSlice";
import { CATEGORY_TABS } from "@/lib/districtData";
import { CategoryFilter } from "@/lib/types";

export const PlaceFilterBar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeCategory } = useSelector((state: RootState) => state.chat);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {CATEGORY_TABS.map((tab) => {
        const isActive = activeCategory === tab;
        return (
          <button
            key={tab}
            onClick={() => dispatch(setActiveCategory(tab as CategoryFilter))}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              isActive
                ? "bg-[#FDE047] text-slate-950 border-amber-300 font-bold shadow-sm"
                : "bg-[#1E293B]/70 text-slate-300 hover:text-white border-white/5 hover:bg-white/10"
            }`}
          >
            {tab}
          </button>
        );
      })}
    </div>
  );
};

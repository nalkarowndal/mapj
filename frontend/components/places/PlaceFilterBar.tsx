"use client";
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { setActiveCategory } from "@/store/chatSlice";
import { CATEGORY_TABS } from "@/lib/districtData";
import { CategoryFilter } from "@/lib/types";

const CATEGORY_ICONS: Record<string, string> = {
  전체: "🍽️",
  "한식/노포": "🍲",
  "고기/구이": "🥩",
  "카페/베이커리": "🥐",
  "양식/일식/분식": "🍜",
};

export const PlaceFilterBar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { activeCategory } = useSelector((state: RootState) => state.chat);

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {CATEGORY_TABS.map((tab) => {
        const isActive = activeCategory === tab;
        const icon = CATEGORY_ICONS[tab] || "🍴";
        return (
          <button
            key={tab}
            onClick={() => dispatch(setActiveCategory(tab as CategoryFilter))}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              isActive
                ? "bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 border-amber-300 font-extrabold shadow-md shadow-amber-500/15"
                : "bg-[#1E293B]/80 text-slate-300 hover:text-white border-white/10 hover:bg-white/10"
            }`}
          >
            <span>{icon}</span>
            <span>{tab}</span>
          </button>
        );
      })}
    </div>
  );
};

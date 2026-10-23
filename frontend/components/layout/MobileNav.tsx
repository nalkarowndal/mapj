"use client";
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { setMobileTab } from "@/store/chatSlice";
import { MobileTab } from "@/lib/types";
import { FaComments, FaListUl, FaMap } from "react-icons/fa";

export const MobileNav: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { mobileTab, places, messages } = useSelector((state: RootState) => state.chat);

  const tabs: { id: MobileTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: "chat",
      label: "AI 대화",
      icon: <FaComments size={16} />,
      badge: messages.length > 1 ? messages.length : undefined,
    },
    {
      id: "places",
      label: "추천 장소",
      icon: <FaListUl size={16} />,
      badge: places.length > 0 ? places.length : undefined,
    },
    {
      id: "map",
      label: "지도 탐색",
      icon: <FaMap size={16} />,
      badge: places.length > 0 ? places.length : undefined,
    },
  ];

  return (
    <nav
      aria-label="모바일 하단 내비게이션"
      className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#131B2E]/95 backdrop-blur-2xl border-t border-white/10 px-2 py-1.5 flex justify-around items-center"
    >
      {tabs.map((tab) => {
        const isActive = mobileTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => dispatch(setMobileTab(tab.id))}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-2 rounded-2xl transition-all cursor-pointer relative ${
              isActive
                ? "text-[#FDE047] font-bold"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <div className="relative">
              {tab.icon}
              {tab.badge !== undefined && (
                <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[16px] h-4 rounded-full bg-blue-600 text-white text-[10px] font-extrabold flex items-center justify-center shadow-sm">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[11px] mt-1">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

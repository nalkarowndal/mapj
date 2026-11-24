"use client";
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import {
  setSelectedDistrict,
  setActiveCategory,
  startNewChat,
  switchSession,
  deleteSession,
  toggleSidebar,
  setSettingsOpen,
} from "@/store/chatSlice";
import { DISTRICT_LIST, CATEGORY_TABS } from "@/lib/districtData";
import { DistrictName, CategoryFilter } from "@/lib/types";
import { Button } from "../ui/Button";
import {
  FaUtensils,
  FaPlus,
  FaMapMarkerAlt,
  FaComments,
  FaChevronLeft,
  FaChevronRight,
  FaCompass,
  FaCog,
  FaTrashAlt,
  FaFire,
} from "react-icons/fa";

export const Sidebar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    isSidebarOpen,
    selectedDistrict,
    activeCategory,
    activeSessionId,
    sessions,
  } = useSelector((state: RootState) => state.chat);

  const sessionList = Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt);

  if (!isSidebarOpen) {
    return (
      <aside
        aria-label="축소된 미식 가이드 사이드바"
        className="hidden md:flex flex-col items-center py-4 w-16 bg-[#131B2E]/95 border-r border-white/10 shrink-0 justify-between select-none"
      >
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={() => dispatch(toggleSidebar())}
            title="사이드바 펼치기"
            aria-label="사이드바 펼치기"
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 hover:opacity-90 transition shadow-md cursor-pointer"
          >
            <FaUtensils size={16} />
          </button>
          <button
            onClick={() => dispatch(startNewChat())}
            title="새 맛집 추천 대화"
            aria-label="새 맛집 추천 대화"
            className="w-10 h-10 rounded-2xl bg-[#1E293B] hover:bg-slate-700 text-[#FDE047] border border-white/10 flex items-center justify-center transition shadow-md cursor-pointer"
          >
            <FaPlus size={14} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => dispatch(setSettingsOpen(true))}
            title="설정"
            aria-label="설정"
            className="p-2.5 text-slate-400 hover:text-[#FDE047] rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <FaCog size={15} />
          </button>
          <button
            onClick={() => dispatch(toggleSidebar())}
            title="사이드바 펼치기"
            aria-label="사이드바 펼치기"
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <FaChevronRight size={14} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="맛집 탐색 메인 사이드바"
      className="hidden md:flex flex-col w-68 bg-[#131B2E]/95 backdrop-blur-2xl border-r border-white/10 shrink-0 h-full overflow-hidden select-none transition-all duration-300"
    >
      {/* 1. Header: Gourmet Brand Logo & Collapse */}
      <div className="p-4 flex items-center justify-between border-b border-white/10 bg-[#17233A]/50">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-md text-base">
            <FaUtensils />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-white tracking-tight flex items-center gap-1">
              <span>맛탐정</span>
              <span className="text-[#FDE047]">동북</span>
            </h2>
            <p className="text-[11px] text-amber-200/80">서울 동북권 미식 큐레이션</p>
          </div>
        </div>
        <button
          onClick={() => dispatch(toggleSidebar())}
          title="사이드바 접기"
          aria-label="사이드바 접기"
          className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
        >
          <FaChevronLeft size={14} />
        </button>
      </div>

      {/* 2. District Gourmet Guide Selector */}
      <div className="px-4 py-3.5 border-b border-white/5">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <FaCompass size={11} className="text-amber-400" />
            <span>자치구별 맛집 가이드</span>
          </span>
          <span className="text-[11px] text-[#FDE047] bg-amber-400/15 px-2 py-0.5 rounded-lg border border-amber-400/30 font-bold">
            {selectedDistrict}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {DISTRICT_LIST.map((district) => {
            const isSelected = selectedDistrict === district;
            return (
              <button
                key={district}
                onClick={() => dispatch(setSelectedDistrict(district as DistrictName))}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-gradient-to-r from-amber-400/20 to-orange-500/20 text-[#FDE047] border-amber-400/60 shadow-sm"
                    : "bg-[#0B1120]/70 text-slate-300 border-white/5 hover:bg-white/5 hover:text-white"
                }`}
              >
                <FaMapMarkerAlt
                  size={10}
                  className={isSelected ? "text-[#FDE047]" : "text-rose-400/70"}
                />
                <span>{district}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Gourmet Food Category Quick Navigation */}
      <div className="px-4 py-3 border-b border-white/5">
        <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-2">
          <FaFire size={11} className="text-orange-400" />
          <span>미식 테마별 모아보기</span>
        </span>
        <div className="space-y-1">
          {CATEGORY_TABS.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => dispatch(setActiveCategory(cat as CategoryFilter))}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                  isActive
                    ? "bg-[#1E293B] text-[#FDE047] border-amber-400/40 font-bold"
                    : "bg-transparent text-slate-300 border-transparent hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{cat === "전체" ? "🍽️ 전체 엄선 맛집" : cat}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FDE047]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. AI Sommelier Consultation History */}
      <div className="flex-1 flex flex-col min-h-0 px-4 py-3 overflow-hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <FaComments size={11} className="text-amber-400" />
            <span>AI 미식 추천 기록 ({sessionList.length})</span>
          </span>
          <button
            onClick={() => dispatch(startNewChat())}
            className="text-[11px] font-bold text-[#FDE047] hover:underline flex items-center gap-1 cursor-pointer"
          >
            <FaPlus size={9} />
            <span>새 추천</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
          {sessionList.map((session) => {
            const isActive = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                onClick={() => dispatch(switchSession(session.id))}
                className={`p-2.5 rounded-xl text-xs transition cursor-pointer border flex items-center justify-between group ${
                  isActive
                    ? "bg-[#1E293B] text-white border-amber-400/40 shadow-sm"
                    : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold truncate text-slate-200 text-xs">
                    {session.title}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {session.district} · 추천 맛집 {session.places?.length || 0}곳
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(deleteSession(session.id));
                  }}
                  title="기록 삭제"
                  aria-label="기록 삭제"
                  className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
                >
                  <FaTrashAlt size={10} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Footer: Settings Button */}
      <div className="p-3 border-t border-white/10 bg-[#0F172A]/90 flex items-center justify-between">
        <button
          onClick={() => dispatch(setSettingsOpen(true))}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:text-[#FDE047] hover:bg-white/5 transition cursor-pointer font-semibold border border-transparent hover:border-white/10"
        >
          <FaCog size={13} className="text-[#FDE047]" />
          <span>API 및 지도 설정</span>
        </button>

        <span className="text-[10px] text-amber-300/70 font-mono">Gourmet v2.2</span>
      </div>
    </aside>
  );
};

"use client";
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import {
  setSelectedDistrict,
  startNewChat,
  toggleSidebar,
} from "@/store/chatSlice";
import { DISTRICT_LIST, DISTRICT_DETAILS } from "@/lib/districtData";
import { DistrictName } from "@/lib/types";
import { Button } from "../ui/Button";
import {
  FaRobot,
  FaPlus,
  FaMapMarkerAlt,
  FaComments,
  FaChevronLeft,
  FaChevronRight,
  FaCompass,
} from "react-icons/fa";

export const Sidebar: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isSidebarOpen, selectedDistrict, recentConversations, activeSessionId } =
    useSelector((state: RootState) => state.chat);

  if (!isSidebarOpen) {
    return (
      <aside
        aria-label="축소된 사이드바"
        className="hidden md:flex flex-col items-center py-5 w-16 bg-[#131B2E]/90 border-r border-white/10 shrink-0 justify-between select-none"
      >
        <div className="flex flex-col items-center gap-5">
          <button
            onClick={() => dispatch(toggleSidebar())}
            title="사이드바 펼치기"
            aria-label="사이드바 펼치기"
            className="w-10 h-10 rounded-2xl bg-[#1E293B] flex items-center justify-center text-[#FDE047] hover:bg-[#253550] transition shadow-md cursor-pointer border border-white/10"
          >
            <FaRobot size={18} />
          </button>
          <button
            onClick={() => dispatch(startNewChat())}
            title="새 대화 시작"
            aria-label="새 대화 시작"
            className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center transition shadow-md cursor-pointer"
          >
            <FaPlus size={14} />
          </button>
        </div>
        <button
          onClick={() => dispatch(toggleSidebar())}
          title="사이드바 펼치기"
          aria-label="사이드바 펼치기"
          className="p-2.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
        >
          <FaChevronRight size={14} />
        </button>
      </aside>
    );
  }

  return (
    <aside
      aria-label="메인 탐색 사이드바"
      className="hidden md:flex flex-col w-72 bg-[#131B2E]/95 backdrop-blur-2xl border-r border-white/10 shrink-0 h-full overflow-hidden select-none transition-all duration-300"
    >
      {/* 1. Header: Logo & Collapse Button */}
      <div className="p-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1E293B] border border-white/10 flex items-center justify-center text-[#FDE047] shadow-inner text-lg">
            <FaRobot />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-white tracking-tight flex items-center gap-1.5">
              AI <span className="text-[#FDE047]">로컬 비서</span>
            </h2>
            <p className="text-[11px] text-slate-400">서울 동북권 5대 자치구</p>
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

      {/* 2. New Chat Action */}
      <div className="p-4 pb-2">
        <Button
          variant="accent"
          size="md"
          className="w-full justify-center shadow-amber-400/10 shadow-lg text-slate-950 font-bold"
          leftIcon={<FaPlus size={12} />}
          onClick={() => dispatch(startNewChat())}
        >
          새 대화 시작
        </Button>
      </div>

      {/* 3. District Selector Grid */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <FaCompass size={11} className="text-blue-400" />
            탐색 자치구
          </span>
          <span className="text-[10px] text-[#FDE047] bg-[#FDE047]/10 px-2 py-0.5 rounded-lg border border-[#FDE047]/20 font-semibold">
            {selectedDistrict} 선택됨
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {DISTRICT_LIST.map((district) => {
            const isSelected = selectedDistrict === district;
            return (
              <button
                key={district}
                onClick={() => dispatch(setSelectedDistrict(district as DistrictName))}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-[#1E293B] text-[#FDE047] border-[#FDE047]/50 shadow-sm"
                    : "bg-[#0D111A]/60 text-slate-300 border-white/5 hover:bg-white/5 hover:text-white"
                }`}
              >
                <FaMapMarkerAlt
                  size={10}
                  className={isSelected ? "text-[#FDE047]" : "text-slate-500"}
                />
                <span>{district}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Recent Conversations History */}
      <div className="flex-1 flex flex-col min-h-0 px-4 py-3 overflow-hidden border-t border-white/5">
        <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-2.5">
          <FaComments size={11} className="text-slate-400" />
          최근 대화 기록
        </span>
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {recentConversations.length > 0 ? (
            recentConversations.map((session) => {
              const isActive = session.id === activeSessionId;
              return (
                <div
                  key={session.id}
                  className={`p-2.5 rounded-xl text-xs transition cursor-pointer border flex flex-col gap-0.5 ${
                    isActive
                      ? "bg-[#1E293B] text-white border-blue-500/30"
                      : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold truncate max-w-[170px] text-slate-200">
                      {session.title}
                    </span>
                    <span className="text-[10px] text-slate-500 shrink-0">
                      {session.district}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {new Date(session.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-xs text-slate-500">
              대화 기록이 없습니다.
            </div>
          )}
        </div>
      </div>

      {/* 5. Footer Info */}
      <div className="p-3 border-t border-white/10 bg-[#0F172A]/80 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          로컬 어시스턴트 v2.0
        </span>
        <span className="text-[10px] text-slate-500">FastAPI & Groq</span>
      </div>
    </aside>
  );
};

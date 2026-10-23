"use client";
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import {
  setMobileDrawerOpen,
  startNewChat,
  switchSession,
  deleteSession,
  setSelectedDistrict,
  setSettingsOpen,
} from "@/store/chatSlice";
import { DISTRICT_LIST } from "@/lib/districtData";
import { DistrictName } from "@/lib/types";
import { Button } from "../ui/Button";
import {
  FaRobot,
  FaPlus,
  FaMapMarkerAlt,
  FaComments,
  FaCog,
  FaTimes,
  FaTrashAlt,
  FaCompass,
} from "react-icons/fa";

export const MobileDrawer: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    isMobileDrawerOpen,
    selectedDistrict,
    activeSessionId,
    sessions,
  } = useSelector((state: RootState) => state.chat);

  const sessionList = Object.values(sessions).sort((a, b) => b.updatedAt - a.updatedAt);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileDrawerOpen) {
        dispatch(setMobileDrawerOpen(false));
      }
    };
    if (isMobileDrawerOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileDrawerOpen, dispatch]);

  if (!isMobileDrawerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="모바일 탐색 메뉴"
      className="fixed inset-0 z-50 flex sm:hidden bg-black/75 backdrop-blur-md animate-fadeIn"
      onClick={() => dispatch(setMobileDrawerOpen(false))}
    >
      <div
        className="w-[82%] max-w-xs h-full bg-[#131B2E] border-r border-white/10 shadow-2xl flex flex-col justify-between overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#17233A]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1E293B] border border-white/10 flex items-center justify-center text-[#FDE047] shadow-inner text-base">
              <FaRobot />
            </div>
            <div>
              <h2 className="font-extrabold text-sm text-white">
                AI <span className="text-[#FDE047]">로컬 비서</span>
              </h2>
              <p className="text-[10px] text-slate-400">서울 동북권 5대 자치구</p>
            </div>
          </div>

          <button
            onClick={() => dispatch(setMobileDrawerOpen(false))}
            aria-label="메뉴 닫기"
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* New Chat Button */}
          <Button
            variant="accent"
            size="md"
            className="w-full justify-center shadow-lg font-bold text-slate-950"
            leftIcon={<FaPlus size={12} />}
            onClick={() => dispatch(startNewChat())}
          >
            새 대화 시작
          </Button>

          {/* District Selector */}
          <div>
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-2">
              <FaCompass size={11} className="text-blue-400" />
              탐색 자치구 선택
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {DISTRICT_LIST.map((dist) => {
                const isSelected = selectedDistrict === dist;
                return (
                  <button
                    key={dist}
                    onClick={() => dispatch(setSelectedDistrict(dist as DistrictName))}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer border ${
                      isSelected
                        ? "bg-[#1E293B] text-[#FDE047] border-[#FDE047]/50 shadow-sm"
                        : "bg-[#0D111A]/80 text-slate-300 border-white/5"
                    }`}
                  >
                    <FaMapMarkerAlt
                      size={10}
                      className={isSelected ? "text-[#FDE047]" : "text-slate-500"}
                    />
                    <span>{dist}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recent Conversations */}
          <div>
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-2">
              <FaComments size={11} className="text-slate-400" />
              대화 세션 목록
            </span>
            <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
              {sessionList.map((session) => {
                const isActive = session.id === activeSessionId;
                return (
                  <div
                    key={session.id}
                    onClick={() => dispatch(switchSession(session.id))}
                    className={`p-2.5 rounded-xl text-xs transition cursor-pointer border flex items-center justify-between group ${
                      isActive
                        ? "bg-[#1E293B] text-white border-blue-500/40"
                        : "bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-slate-200"
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold truncate text-slate-200 text-xs">
                        {session.title}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {session.district} · {session.messages?.length || 0}개 메시지
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(deleteSession(session.id));
                      }}
                      title="대화 삭제"
                      aria-label="대화 삭제"
                      className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition cursor-pointer shrink-0"
                    >
                      <FaTrashAlt size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer: Settings Button */}
        <div className="p-3 border-t border-white/10 bg-[#0F172A] space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center text-xs"
            leftIcon={<FaCog size={12} className="text-[#FDE047]" />}
            onClick={() => {
              dispatch(setMobileDrawerOpen(false));
              dispatch(setSettingsOpen(true));
            }}
          >
            API 및 시스템 설정
          </Button>

          <div className="text-center text-[10px] text-slate-500">
            AI 로컬 어시스턴트 v2.1 (FastAPI & Groq)
          </div>
        </div>
      </div>
    </div>
  );
};

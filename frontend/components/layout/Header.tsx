"use client";
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import {
  setSelectedDistrict,
  setShowMap,
  setMobileDrawerOpen,
  setSettingsOpen,
} from "@/store/chatSlice";
import { DISTRICT_LIST } from "@/lib/districtData";
import { DistrictName } from "@/lib/types";
import { FaRobot, FaMapMarkerAlt, FaMap, FaBars, FaCog } from "react-icons/fa";

export const Header: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedDistrict, showMap, places } = useSelector(
    (state: RootState) => state.chat
  );

  return (
    <header className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 bg-[#17233A]/90 backdrop-blur-xl border-b border-white/10 shrink-0 gap-2 z-20">
      {/* Left: Mobile Drawer Trigger + Brand Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={() => dispatch(setMobileDrawerOpen(true))}
          aria-label="모바일 탐색 메뉴 열기"
          className="sm:hidden p-2 text-slate-300 hover:text-white rounded-xl bg-[#1E293B] border border-white/10 cursor-pointer shrink-0"
        >
          <FaBars size={14} />
        </button>

        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-[#1E293B] border border-white/10 flex items-center justify-center text-[#FDE047] shadow-inner text-sm sm:text-base shrink-0">
            <FaRobot />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-1 truncate">
              AI <span className="text-[#FDE047]">로컬 어시스턴트</span>
            </h1>
            <p className="hidden md:block text-[11px] text-slate-400 truncate">
              서울 동북권 5대 자치구 맞춤형 AI 추천 및 지도 연동
            </p>
          </div>
        </div>
      </div>

      {/* Right: District Selector, Map Toggle, Settings Button */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* District select */}
        <div className="flex items-center gap-1 bg-[#0D111A]/90 border border-white/10 px-2 sm:px-3 py-1.5 rounded-xl shadow-inner">
          <FaMapMarkerAlt className="text-red-400 text-xs shrink-0" />
          <span className="text-xs text-slate-400 hidden lg:inline">지역:</span>
          <select
            value={selectedDistrict}
            onChange={(e) => dispatch(setSelectedDistrict(e.target.value as DistrictName))}
            className="bg-transparent text-xs font-bold text-[#FDE047] focus:outline-none cursor-pointer pr-1"
            aria-label="자치구 선택"
          >
            {DISTRICT_LIST.map((dist) => (
              <option key={dist} value={dist} className="bg-[#17233A] text-white">
                {dist}
              </option>
            ))}
          </select>
        </div>

        {/* Map toggle button (Desktop/Tablet) */}
        <button
          onClick={() => dispatch(setShowMap(!showMap))}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            showMap
              ? "bg-blue-600/30 text-blue-300 border-blue-400/40 shadow-sm"
              : "bg-[#1E293B] text-slate-300 border-white/10 hover:bg-white/10"
          }`}
          aria-label={showMap ? "지도 닫기" : "지도 열기"}
        >
          <FaMap size={11} className={showMap ? "text-blue-400" : "text-slate-400"} />
          <span className="hidden md:inline">{showMap ? "지도 패널 닫기" : "지도 패널 열기"}</span>
          <span className="md:hidden">지도</span>
          {places.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500 text-white font-extrabold">
              {places.length}
            </span>
          )}
        </button>

        {/* Settings button */}
        <button
          onClick={() => dispatch(setSettingsOpen(true))}
          title="API 및 서비스 설정"
          aria-label="API 및 서비스 설정"
          className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-[#1E293B] hover:bg-[#253550] text-slate-300 hover:text-[#FDE047] border border-white/10 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
        >
          <FaCog size={13} className="text-[#FDE047]" />
          <span className="hidden md:inline">설정</span>
        </button>
      </div>
    </header>
  );
};

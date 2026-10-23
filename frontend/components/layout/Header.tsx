"use client";
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import {
  setSelectedDistrict,
  setShowMap,
  toggleSidebar,
} from "@/store/chatSlice";
import { DISTRICT_LIST } from "@/lib/districtData";
import { DistrictName } from "@/lib/types";
import { FaRobot, FaMapMarkerAlt, FaMap, FaBars } from "react-icons/fa";

export const Header: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedDistrict, showMap, places } = useSelector(
    (state: RootState) => state.chat
  );

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-[#17233A]/90 backdrop-blur-xl border-b border-white/10 shrink-0 gap-3 z-20">
      {/* Left: Mobile sidebar button + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => dispatch(toggleSidebar())}
          aria-label="사이드바 메뉴 토글"
          className="md:hidden p-2 text-slate-300 hover:text-white rounded-xl bg-[#1E293B] border border-white/10 cursor-pointer"
        >
          <FaBars size={14} />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#1E293B] border border-white/10 flex items-center justify-center text-[#FDE047] shadow-inner text-base">
            <FaRobot />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5">
              AI <span className="text-[#FDE047]">로컬 어시스턴트</span>
            </h1>
            <p className="hidden sm:block text-[11px] text-slate-400">
              서울 동북권 5대 자치구 맞춤형 AI 추천 및 지도 연동
            </p>
          </div>
        </div>
      </div>

      {/* Right: District Selector Dropdown & Map Mode Toggle */}
      <div className="flex items-center gap-2.5">
        {/* District select */}
        <div className="flex items-center gap-1.5 bg-[#0D111A]/90 border border-white/10 px-3 py-1.5 rounded-xl shadow-inner">
          <FaMapMarkerAlt className="text-red-400 text-xs shrink-0" />
          <span className="text-xs text-slate-400 hidden sm:inline">지역:</span>
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
          className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            showMap
              ? "bg-blue-600/30 text-blue-300 border-blue-400/40 shadow-sm"
              : "bg-[#1E293B] text-slate-300 border-white/10 hover:bg-white/10"
          }`}
          aria-label={showMap ? "지도 닫기" : "지도 열기"}
        >
          <FaMap size={11} className={showMap ? "text-blue-400" : "text-slate-400"} />
          <span>{showMap ? "지도 패널 닫기" : "지도 패널 열기"}</span>
          {places.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-500 text-white font-extrabold">
              {places.length}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

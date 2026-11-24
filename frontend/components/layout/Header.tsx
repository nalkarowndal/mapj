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
import {
  FaUtensils,
  FaMapMarkerAlt,
  FaMapMarkedAlt,
  FaBars,
  FaCog,
  FaHeart,
} from "react-icons/fa";

export const Header: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedDistrict, showMap, places, bookmarkedIds } = useSelector(
    (state: RootState) => state.chat
  );

  return (
    <header className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-[#141E33]/95 backdrop-blur-xl border-b border-white/10 shrink-0 gap-2 z-20">
      {/* Left: Mobile Drawer Trigger + Gourmet Brand Title */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        <button
          onClick={() => dispatch(setMobileDrawerOpen(true))}
          aria-label="모바일 미식 탐색 메뉴 열기"
          className="sm:hidden p-2 text-slate-300 hover:text-white rounded-xl bg-[#1E293B] border border-white/10 cursor-pointer shrink-0"
        >
          <FaBars size={14} />
        </button>

        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 text-base sm:text-lg shrink-0">
            <FaUtensils />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-lg font-extrabold tracking-tight text-white flex items-center gap-1.5 truncate">
                <span>맛탐정</span>
                <span className="text-[#FDE047]">동북</span>
              </h1>
              <span className="hidden lg:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400/15 text-amber-300 border border-amber-400/30">
                GOURMET GUIDE
              </span>
            </div>
            <p className="hidden md:block text-[11px] text-slate-300 truncate">
              서울 동북권 5대 자치구(노원·도봉·강북·중랑·성북) 엄선 노포 & 미식 큐레이션 플랫폼
            </p>
          </div>
        </div>
      </div>

      {/* Center: Quick District Switcher Pills (Desktop) */}
      <div className="hidden xl:flex items-center gap-1 bg-[#0B1120]/80 p-1 rounded-2xl border border-white/10">
        {DISTRICT_LIST.map((dist) => {
          const isSelected = selectedDistrict === dist;
          return (
            <button
              key={dist}
              onClick={() => dispatch(setSelectedDistrict(dist))}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                isSelected
                  ? "bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 shadow-sm"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              }`}
            >
              <FaMapMarkerAlt
                size={10}
                className={isSelected ? "text-slate-950" : "text-rose-400"}
              />
              <span>{dist}</span>
            </button>
          );
        })}
      </div>

      {/* Right: District Selector (Tablet/Mobile), Bookmarks count, Map/Concierge Panel Toggle, Settings */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {/* District select for smaller screens */}
        <div className="xl:hidden flex items-center gap-1 bg-[#0B1120]/90 border border-amber-400/30 px-2.5 py-1.5 rounded-xl shadow-inner">
          <FaMapMarkerAlt className="text-rose-400 text-xs shrink-0" />
          <select
            value={selectedDistrict}
            onChange={(e) => dispatch(setSelectedDistrict(e.target.value as DistrictName))}
            className="bg-transparent text-xs font-extrabold text-[#FDE047] focus:outline-none cursor-pointer pr-1"
            aria-label="미식 자치구 선택"
          >
            {DISTRICT_LIST.map((dist) => (
              <option key={dist} value={dist} className="bg-[#17233A] text-white">
                {dist} 맛집
              </option>
            ))}
          </select>
        </div>

        {/* Bookmarked Count Pill */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-rose-500/15 border border-rose-400/30 text-xs font-bold text-rose-300"
          title="내가 찜한 맛집 수"
        >
          <FaHeart size={11} className="text-rose-400" />
          <span>찜 {bookmarkedIds.length}</span>
        </div>

        {/* Right Panel toggle button (Desktop/Tablet) */}
        <button
          onClick={() => dispatch(setShowMap(!showMap))}
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
            showMap
              ? "bg-amber-400/20 text-[#FDE047] border-amber-400/40 shadow-sm"
              : "bg-[#1E293B] text-slate-300 border-white/10 hover:bg-white/10"
          }`}
          aria-label={showMap ? "지도 및 AI 패널 닫기" : "지도 및 AI 패널 열기"}
        >
          <FaMapMarkedAlt size={12} className={showMap ? "text-[#FDE047]" : "text-slate-400"} />
          <span className="hidden md:inline">
            {showMap ? "지도·AI 컨시어지 접기" : "지도·AI 컨시어지 열기"}
          </span>
          <span className="md:hidden">지도·AI</span>
          {places.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-400 text-slate-950 font-extrabold">
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

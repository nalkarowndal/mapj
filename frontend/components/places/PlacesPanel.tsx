"use client";
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { setSelectedPlaceId, setMobileTab } from "@/store/chatSlice";
import { PlaceInfo } from "@/lib/types";
import { PlaceCard } from "./PlaceCard";
import { PlaceFilterBar } from "./PlaceFilterBar";
import { PlaceDetailModal } from "./PlaceDetailModal";
import { FaSearch, FaMapMarkedAlt } from "react-icons/fa";

export const PlacesPanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { places, selectedPlaceId, selectedDistrict, activeCategory } = useSelector(
    (state: RootState) => state.chat
  );

  const [searchKeyword, setSearchKeyword] = useState("");
  const [detailPlace, setDetailPlace] = useState<PlaceInfo | null>(null);

  // Filter places based on activeCategory and searchKeyword
  const filteredPlaces = places.filter((place) => {
    const matchesCategory =
      activeCategory === "전체" || place.category.includes(activeCategory);
    const matchesSearch =
      !searchKeyword.trim() ||
      place.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      place.description.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      place.address.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleSelectPlace = (place: PlaceInfo) => {
    dispatch(setSelectedPlaceId(place.id));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#131B2E]/70 select-none">
      {/* Header bar */}
      <div className="p-3.5 sm:p-4 border-b border-white/10 space-y-3 shrink-0 bg-[#17233A]/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FaMapMarkedAlt className="text-[#FDE047] text-sm" />
            <h3 className="font-extrabold text-sm text-white">
              {selectedDistrict} 추천 장소
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-300 font-bold border border-blue-400/20">
              {filteredPlaces.length}개
            </span>
          </div>
        </div>

        {/* Search input within results */}
        <div className="relative">
          <FaSearch
            size={11}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="결과 내 검색 (장소명, 메뉴, 주소)..."
            aria-label="장소 결과 내 검색"
            className="w-full bg-[#0D111A]/80 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-[#FDE047]/60"
          />
        </div>

        {/* Category Tabs */}
        <PlaceFilterBar />
      </div>

      {/* Place cards scroll list */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
        {filteredPlaces.length > 0 ? (
          filteredPlaces.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              isSelected={selectedPlaceId === place.id}
              onSelect={handleSelectPlace}
              onOpenDetail={(p) => setDetailPlace(p)}
            />
          ))
        ) : (
          <div className="h-60 flex flex-col items-center justify-center text-center p-6 bg-[#0D111A]/40 rounded-2xl border border-white/5 text-slate-400">
            <div className="text-3xl mb-2">🔍</div>
            <p className="text-xs font-semibold text-slate-300">
              {places.length === 0
                ? "아직 추천된 장소가 없습니다."
                : "조건에 맞는 장소를 찾지 못했습니다."}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {places.length === 0
                ? "채팅창에 맛집이나 학원 추천을 질문해 보세요!"
                : "다른 검색어나 카테고리 필터를 선택해 보세요."}
            </p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <PlaceDetailModal
        place={detailPlace}
        isOpen={Boolean(detailPlace)}
        onClose={() => setDetailPlace(null)}
      />
    </div>
  );
};

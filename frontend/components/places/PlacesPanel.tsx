"use client";
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import {
  setSelectedPlaceId,
  setActiveCategory,
  resetDistrictPlaces,
} from "@/store/chatSlice";
import { PlaceInfo } from "@/lib/types";
import { DISTRICT_DETAILS, CURATION_THEMES } from "@/lib/districtData";
import { PlaceCard } from "./PlaceCard";
import { PlaceFilterBar } from "./PlaceFilterBar";
import { PlaceDetailModal } from "./PlaceDetailModal";
import {
  FaSearch,
  FaUtensils,
  FaFire,
  FaHeart,
  FaRedo,
  FaMapMarkerAlt,
  FaCrown,
} from "react-icons/fa";

interface PlacesPanelProps {
  onAskThemePrompt?: (prompt: string) => void;
}

export const PlacesPanel: React.FC<PlacesPanelProps> = ({ onAskThemePrompt }) => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    places,
    selectedPlaceId,
    selectedDistrict,
    activeCategory,
    bookmarkedIds,
  } = useSelector((state: RootState) => state.chat);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [sortBy, setSortBy] = useState<"rating" | "reviews">("rating");
  const [detailPlace, setDetailPlace] = useState<PlaceInfo | null>(null);

  const districtMeta = DISTRICT_DETAILS[selectedDistrict];

  // Category matching helper
  const matchesCategoryTab = (place: PlaceInfo, category: string) => {
    if (category === "전체") return true;
    if (place.category.includes(category)) return true;
    const cat = place.category.toLowerCase();
    const sub = (place.sub_category || "").toLowerCase();
    if (category === "한식/노포") return cat.includes("한식") || cat.includes("노포");
    if (category === "고기/구이") return cat.includes("고기") || cat.includes("구이") || sub.includes("갈비");
    if (category === "카페/베이커리") return cat.includes("카페") || cat.includes("베이커리") || sub.includes("빵");
    if (category === "양식/일식/분식") {
      return ["양식", "일식", "분식", "돈까스", "국수", "피자"].some(
        (k) => cat.includes(k) || sub.includes(k)
      );
    }
    return false;
  };

  const filteredPlaces = places
    .filter((place) => {
      const matchesCat = matchesCategoryTab(place, activeCategory);
      const matchesBookmark = !showBookmarksOnly || bookmarkedIds.includes(place.id);
      const kw = searchKeyword.trim().toLowerCase();
      const matchesSearch =
        !kw ||
        place.name.toLowerCase().includes(kw) ||
        place.description.toLowerCase().includes(kw) ||
        place.address.toLowerCase().includes(kw) ||
        (place.signature_menu || []).some((m) => m.toLowerCase().includes(kw)) ||
        (place.tags || []).some((t) => t.toLowerCase().includes(kw));
      return matchesCat && matchesBookmark && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "reviews") {
        return (b.review_count || 0) - (a.review_count || 0);
      }
      return (b.rating || 4.5) - (a.rating || 4.5);
    });

  const handleSelectPlace = (place: PlaceInfo) => {
    dispatch(setSelectedPlaceId(place.id));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F172A]/85 select-none">
      {/* 1. Gourmet Magazine Hero & Filter Header */}
      <div className="p-3.5 sm:p-4 border-b border-white/10 space-y-3 shrink-0 bg-gradient-to-b from-[#1A243B] to-[#131B2E]">
        {/* District Gourmet Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-[#FDE047] border border-amber-400/30 text-[10px] font-extrabold flex items-center gap-1">
                <FaCrown size={9} />
                <span>미식 가이드</span>
              </span>
              <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-1.5">
                <span>{selectedDistrict} 대표 맛집 큐레이션</span>
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 font-extrabold border border-orange-400/30">
                {filteredPlaces.length}곳
              </span>
            </div>
            {districtMeta && (
              <p className="text-[11px] text-slate-300 mt-0.5 truncate max-w-xl">
                {districtMeta.slogan}
              </p>
            )}
          </div>

          {/* Sort & Bookmark Filter Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowBookmarksOnly(!showBookmarksOnly)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                showBookmarksOnly
                  ? "bg-rose-500/25 text-rose-300 border-rose-400/40"
                  : "bg-[#0D111A]/70 text-slate-300 border-white/10 hover:text-white"
              }`}
              title="내가 찜한 맛집만 보기"
            >
              <FaHeart size={10} className={showBookmarksOnly ? "text-rose-400" : "text-slate-400"} />
              <span>찜한 맛집</span>
            </button>

            <button
              onClick={() => setSortBy(sortBy === "rating" ? "reviews" : "rating")}
              className="px-2.5 py-1.5 rounded-xl bg-[#0D111A]/70 hover:bg-white/10 text-xs font-semibold text-amber-300 border border-white/10 transition cursor-pointer"
              title="정렬 기준 변경"
            >
              {sortBy === "rating" ? "⭐ 평점순" : "💬 리뷰많은순"}
            </button>

            <button
              onClick={() => {
                setSearchKeyword("");
                setShowBookmarksOnly(false);
                dispatch(resetDistrictPlaces());
              }}
              className="p-1.5 rounded-xl bg-[#0D111A]/70 hover:bg-white/10 text-slate-300 hover:text-[#FDE047] border border-white/10 transition cursor-pointer"
              title="자치구 전체 엄선 맛집 다시 불러오기"
              aria-label="전체 맛집 초기화"
            >
              <FaRedo size={11} />
            </button>
          </div>
        </div>

        {/* Hotspot Quick Tags */}
        {districtMeta?.hotspots && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
            <span className="text-slate-400 font-bold shrink-0 flex items-center gap-1">
              <FaFire className="text-orange-400" size={10} />
              <span>핵심 미식상권:</span>
            </span>
            {districtMeta.hotspots.map((spot, idx) => (
              <button
                key={idx}
                onClick={() => setSearchKeyword(spot.split("(")[0].split(" ")[0])}
                className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-amber-400/20 text-slate-300 hover:text-[#FDE047] border border-white/5 transition whitespace-nowrap cursor-pointer"
              >
                📍 {spot}
              </button>
            ))}
          </div>
        )}

        {/* Search input within restaurants */}
        <div className="relative">
          <FaSearch
            size={11}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-400"
          />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder={`${selectedDistrict} 맛집 이름, 대표메뉴(예: 갈비, 설렁탕, 팡도르, 국수), 동네 검색...`}
            aria-label="맛집 결과 내 검색"
            className="w-full bg-[#0B1120]/90 border border-white/15 rounded-xl pl-9 pr-16 py-2 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-[#FDE047]"
          />
          {searchKeyword && (
            <button
              onClick={() => setSearchKeyword("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded bg-white/5 cursor-pointer"
            >
              초기화
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <PlaceFilterBar />
      </div>

      {/* 2. Scrollable Restaurant Showcase */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-4">
        {/* Curated Gourmet Themes Strip */}
        <div className="grid grid-cols-2 gap-2">
          {CURATION_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => {
                if (theme.filterTag === "카페/베이커리") {
                  dispatch(setActiveCategory("카페/베이커리"));
                } else {
                  dispatch(setActiveCategory("전체"));
                  setSearchKeyword(theme.filterTag);
                }
                if (onAskThemePrompt) {
                  onAskThemePrompt(`[${selectedDistrict}] ${theme.prompt}`);
                }
              }}
              className={`p-2.5 rounded-2xl bg-gradient-to-br ${theme.gradient} bg-[#151F34] border border-white/10 hover:border-amber-400/50 text-left transition group cursor-pointer flex items-start gap-2.5`}
            >
              <span className="text-xl shrink-0 mt-0.5">{theme.emoji}</span>
              <div className="min-w-0">
                <div className="text-xs font-extrabold text-white group-hover:text-[#FDE047] truncate">
                  {theme.title}
                </div>
                <div className="text-[10px] text-slate-300 truncate mt-0.5">
                  {theme.subtitle}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Restaurant Cards List */}
        {filteredPlaces.length > 0 ? (
          <div className="space-y-3">
            {filteredPlaces.map((place, index) => (
              <PlaceCard
                key={place.id}
                place={place}
                rank={index + 1}
                isSelected={selectedPlaceId === place.id}
                onSelect={handleSelectPlace}
                onOpenDetail={(p) => setDetailPlace(p)}
              />
            ))}
          </div>
        ) : (
          <div className="h-60 flex flex-col items-center justify-center text-center p-6 bg-[#0D111A]/60 rounded-2xl border border-white/10 text-slate-400">
            <div className="text-3xl mb-2">🍽️</div>
            <p className="text-xs font-bold text-slate-200">
              조건에 맞는 맛집을 찾지 못했습니다.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              검색어를 지우거나 전체 카테고리로 초기화하여 {selectedDistrict}의 엄선된 맛집을 확인해 보세요!
            </p>
            <button
              onClick={() => {
                setSearchKeyword("");
                setShowBookmarksOnly(false);
                dispatch(resetDistrictPlaces());
              }}
              className="mt-3 px-3.5 py-1.5 rounded-xl bg-[#FDE047] text-slate-950 font-extrabold text-xs cursor-pointer"
            >
              {selectedDistrict} 전체 맛집 보기
            </button>
          </div>
        )}
      </div>

      {/* 3. Gourmet Detail Modal */}
      <PlaceDetailModal
        place={detailPlace}
        isOpen={Boolean(detailPlace)}
        onClose={() => setDetailPlace(null)}
      />
    </div>
  );
};

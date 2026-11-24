"use client";
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { toggleBookmark } from "@/store/chatSlice";
import { PlaceInfo } from "@/lib/types";
import { Badge } from "../ui/Badge";
import {
  FaMapMarkerAlt,
  FaPhone,
  FaDirections,
  FaInfoCircle,
  FaStar,
  FaUtensils,
  FaClock,
  FaHeart,
  FaRegHeart,
} from "react-icons/fa";

interface PlaceCardProps {
  place: PlaceInfo;
  rank?: number;
  isSelected?: boolean;
  onSelect: (place: PlaceInfo) => void;
  onOpenDetail: (place: PlaceInfo) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  rank,
  isSelected = false,
  onSelect,
  onOpenDetail,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const bookmarkedIds = useSelector((state: RootState) => state.chat.bookmarkedIds);
  const isBookmarked = bookmarkedIds.includes(place.id);

  const getCategoryVisual = (category: string) => {
    if (category.includes("고기")) {
      return {
        emoji: "🥩",
        bgGradient: "from-rose-600/35 via-orange-600/20 to-amber-500/10",
        accentText: "text-rose-300",
        borderAccent: "border-rose-500/30",
      };
    }
    if (category.includes("카페") || category.includes("베이커리")) {
      return {
        emoji: "🥐",
        bgGradient: "from-amber-500/35 via-yellow-600/20 to-orange-500/10",
        accentText: "text-amber-300",
        borderAccent: "border-amber-400/30",
      };
    }
    if (category.includes("양식") || category.includes("일식") || category.includes("분식")) {
      return {
        emoji: "🍜",
        bgGradient: "from-orange-500/35 via-amber-500/20 to-rose-500/10",
        accentText: "text-orange-300",
        borderAccent: "border-orange-400/30",
      };
    }
    return {
      emoji: "🍲",
      bgGradient: "from-amber-600/35 via-orange-500/20 to-red-500/10",
      accentText: "text-amber-300",
      borderAccent: "border-amber-500/30",
    };
  };

  const visual = getCategoryVisual(place.category);
  const isLiveVerified =
    place.verification_status === "live_verified" ||
    (place.data_source && place.data_source.includes("카카오"));

  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url =
      place.kakao_url ||
      `https://map.kakao.com/link/search/${encodeURIComponent(place.name)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(toggleBookmark(place.id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(place);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isSelected}
      aria-label={`${place.name}, ${place.category}, ${place.address}`}
      onClick={() => onSelect(place)}
      onKeyDown={handleKeyDown}
      className={`group relative rounded-2xl transition-all duration-200 border cursor-pointer select-none text-left flex flex-col overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FDE047] ${
        isSelected
          ? "bg-[#1A263D] border-[#FDE047] ring-1 ring-[#FDE047]/60 shadow-xl shadow-amber-500/10"
          : "bg-[#141E33]/90 hover:bg-[#19253F] border-white/10 hover:border-amber-400/40 shadow-md"
      }`}
    >
      {/* Top Visual Banner Header */}
      <div
        className={`relative px-4 pt-3.5 pb-3 bg-gradient-to-r ${visual.bgGradient} border-b border-white/10 flex items-start justify-between gap-2`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {/* Rank or Food Icon */}
          <div className="relative w-11 h-11 rounded-2xl bg-[#0B1120]/85 border border-white/15 flex items-center justify-center shrink-0 text-xl shadow-inner">
            <span>{visual.emoji}</span>
            {typeof rank === "number" && (
              <span className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 font-extrabold text-[10px] flex items-center justify-center shadow">
                {rank}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {place.badge && (
                <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-[#FDE047] border border-amber-400/30 text-[10px] font-extrabold tracking-tight">
                  {place.badge}
                </span>
              )}
              <span className="text-[11px] font-semibold text-slate-300">
                {place.category} {place.sub_category && `· ${place.sub_category}`}
              </span>
            </div>

            <h4
              className={`font-extrabold text-base sm:text-[17px] truncate mt-0.5 ${
                isSelected ? "text-[#FDE047]" : "text-white group-hover:text-amber-200"
              }`}
            >
              {place.name}
            </h4>
          </div>
        </div>

        {/* Right: Rating & Bookmark */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-[#0B1120]/80 border border-amber-400/30 text-xs font-extrabold text-[#FDE047]">
            <FaStar size={11} className="text-amber-400" />
            <span>{place.rating ? place.rating.toFixed(1) : "4.6"}</span>
            {place.review_count && (
              <span className="text-[10px] text-slate-400 font-normal">
                ({place.review_count > 999 ? "999+" : place.review_count})
              </span>
            )}
          </div>

          <button
            onClick={handleToggleBookmark}
            aria-label={isBookmarked ? "맛집 찜 해제" : "맛집 찜하기"}
            title={isBookmarked ? "내 맛집 리스트에서 제거" : "내 맛집 리스트에 저장"}
            className={`p-2 rounded-xl border transition cursor-pointer ${
              isBookmarked
                ? "bg-rose-500/20 border-rose-400/40 text-rose-400"
                : "bg-[#0B1120]/60 border-white/10 text-slate-400 hover:text-rose-300"
            }`}
          >
            {isBookmarked ? <FaHeart size={12} /> : <FaRegHeart size={12} />}
          </button>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col gap-3">
        {/* Signature Menu Pills & Price Range */}
        {place.signature_menu && place.signature_menu.length > 0 && (
          <div className="p-2.5 rounded-xl bg-[#0B1120]/70 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <FaUtensils size={10} />
                <span>대표 시그니처 메뉴</span>
              </span>
              {place.price_range && (
                <span className="text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {place.price_range}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {place.signature_menu.map((menu, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 rounded-lg bg-[#17233A] text-slate-100 text-xs font-semibold border border-white/10"
                >
                  🍽️ {menu}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Editor's Gourmet Note */}
        <p className="text-xs text-slate-200 leading-relaxed line-clamp-2">
          {place.description}
        </p>

        {/* Address, Hours & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-300 pt-1 border-t border-white/5">
          <div className="flex items-center gap-1.5 truncate">
            <FaMapMarkerAlt size={11} className="text-rose-400 shrink-0" />
            <span className="truncate" title={place.address}>
              {place.address}
            </span>
          </div>

          {place.opening_hours && (
            <div className="flex items-center gap-1.5 truncate text-slate-400">
              <FaClock size={10} className="text-amber-400 shrink-0" />
              <span className="truncate">{place.opening_hours}</span>
            </div>
          )}
        </div>

        {/* Tags */}
        {place.tags && place.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {place.tags.slice(0, 4).map((tag, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] text-slate-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetail(place);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 font-bold border border-white/10 transition cursor-pointer"
            >
              <FaInfoCircle size={12} />
              <span>미식 가이드 상세</span>
            </button>

            {place.phone && (
              <span className="hidden md:inline-flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                <FaPhone size={10} className="text-emerald-400" />
                {place.phone}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <Badge
              variant={isLiveVerified ? "primary" : "accent"}
              size="sm"
              className="hidden sm:inline-flex"
            >
              {isLiveVerified ? "카카오 실시간" : "에디터 엄선"}
            </Badge>

            <button
              onClick={handleDirections}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-400 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-extrabold transition cursor-pointer shadow-sm"
            >
              <FaDirections size={11} />
              <span>길찾기</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

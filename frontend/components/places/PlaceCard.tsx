"use client";
import React from "react";
import { PlaceInfo } from "@/lib/types";
import { Badge } from "../ui/Badge";
import { FaMapMarkerAlt, FaPhone, FaDirections, FaInfoCircle } from "react-icons/fa";

interface PlaceCardProps {
  place: PlaceInfo;
  isSelected?: boolean;
  onSelect: (place: PlaceInfo) => void;
  onOpenDetail: (place: PlaceInfo) => void;
}

export const PlaceCard: React.FC<PlaceCardProps> = ({
  place,
  isSelected = false,
  onSelect,
  onOpenDetail,
}) => {
  const getCategoryIcon = (category: string) => {
    if (category.includes("맛집")) return "🍲";
    if (category.includes("카페")) return "☕";
    if (category.includes("학원")) return "📚";
    return "🏛️";
  };

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
      className={`p-4 rounded-2xl transition-all duration-200 border cursor-pointer select-none text-left flex flex-col gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FDE047] ${
        isSelected
          ? "bg-[#1E2E4E] border-[#FDE047] ring-1 ring-[#FDE047]/50 shadow-lg"
          : "bg-[#17233A]/85 hover:bg-[#1A2844] border-white/10 hover:border-white/20 shadow-sm"
      }`}
    >
      {/* Top Header: Category Icon, Name, Source Attribution Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#0D111A]/80 border border-white/10 flex items-center justify-center shrink-0 text-base shadow-inner">
            {getCategoryIcon(place.category)}
          </div>
          <div className="min-w-0">
            <h4
              className={`font-bold text-sm sm:text-base truncate ${
                isSelected ? "text-[#FDE047]" : "text-white"
              }`}
            >
              {place.name}
            </h4>
            <span className="text-xs text-slate-400 truncate block">
              {place.category} {place.sub_category && `· ${place.sub_category}`}
            </span>
          </div>
        </div>

        <Badge
          variant={isLiveVerified ? "primary" : "accent"}
          size="sm"
          className="shrink-0"
        >
          {isLiveVerified ? "공식 실시간 검색" : "로컬 참고 명소"}
        </Badge>
      </div>

      {/* Address & Phone */}
      <div className="space-y-1 text-xs text-slate-300">
        <div className="flex items-center gap-1.5 truncate">
          <FaMapMarkerAlt size={11} className="text-red-400 shrink-0" />
          <span className="truncate" title={place.address}>
            {place.address}
          </span>
        </div>
        {place.phone && (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <FaPhone size={10} className="text-emerald-400 shrink-0" />
            <span className="font-mono">{place.phone}</span>
          </div>
        )}
      </div>

      {/* Description Snippet */}
      <p className="text-xs text-slate-300 bg-[#0D111A]/60 p-2.5 rounded-xl leading-relaxed line-clamp-2 border border-white/5">
        {place.description}
      </p>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-xs">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(place);
          }}
          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold transition cursor-pointer py-1"
        >
          <FaInfoCircle size={12} />
          <span>상세 정보</span>
        </button>

        <button
          onClick={handleDirections}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 font-bold border border-blue-500/30 transition cursor-pointer"
        >
          <FaDirections size={11} />
          <span>길찾기</span>
        </button>
      </div>
    </div>
  );
};

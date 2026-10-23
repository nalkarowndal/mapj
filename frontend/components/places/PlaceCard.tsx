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

  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = place.kakao_url || `https://map.kakao.com/link/search/${encodeURIComponent(place.name)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={() => onSelect(place)}
      className={`p-3.5 rounded-2xl transition-all duration-200 border cursor-pointer select-none text-left flex flex-col gap-2.5 ${
        isSelected
          ? "bg-[#1E2E4E] border-[#FDE047] ring-1 ring-[#FDE047]/40 shadow-lg"
          : "bg-[#17233A]/80 hover:bg-[#1A2844] border-white/10 hover:border-white/20 shadow-sm"
      }`}
    >
      {/* Top Header: Category Icon, Name, Verified Badge */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-[#0D111A]/80 border border-white/10 flex items-center justify-center shrink-0 text-sm shadow-inner">
            {getCategoryIcon(place.category)}
          </div>
          <div className="min-w-0">
            <h4
              className={`font-bold text-sm truncate ${
                isSelected ? "text-[#FDE047]" : "text-white"
              }`}
            >
              {place.name}
            </h4>
            <span className="text-[11px] text-slate-400 truncate block">
              {place.category} {place.sub_category && `· ${place.sub_category}`}
            </span>
          </div>
        </div>

        <Badge
          variant={place.is_registered ? "primary" : "accent"}
          size="sm"
          className="shrink-0"
        >
          {place.is_registered ? "공식 등록" : "검증 명소"}
        </Badge>
      </div>

      {/* Address & Phone */}
      <div className="space-y-1 text-xs text-slate-300">
        <div className="flex items-center gap-1.5 truncate text-[11px]">
          <FaMapMarkerAlt size={10} className="text-red-400 shrink-0" />
          <span className="truncate">{place.address}</span>
        </div>
        {place.phone && (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <FaPhone size={9} className="text-emerald-400 shrink-0" />
            <span>{place.phone}</span>
          </div>
        )}
      </div>

      {/* Description Snippet */}
      <p className="text-xs text-slate-300 bg-[#0D111A]/60 p-2 rounded-xl leading-relaxed line-clamp-2 border border-white/5">
        {place.description}
      </p>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px]">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetail(place);
          }}
          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-semibold transition cursor-pointer"
        >
          <FaInfoCircle size={11} />
          <span>상세 정보</span>
        </button>

        <button
          onClick={handleDirections}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 font-semibold border border-blue-500/30 transition cursor-pointer"
        >
          <FaDirections size={10} />
          <span>길찾기</span>
        </button>
      </div>
    </div>
  );
};

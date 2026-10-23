"use client";
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { setSelectedPlaceId } from "@/store/chatSlice";
import { DISTRICT_DETAILS } from "@/lib/districtData";
import { PlaceInfo } from "@/lib/types";
import {
  FaPlus,
  FaMinus,
  FaRedo,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaExternalLinkAlt,
} from "react-icons/fa";

interface InteractiveMapFallbackProps {
  onOpenDetail?: (place: PlaceInfo) => void;
}

export const InteractiveMapFallback: React.FC<InteractiveMapFallbackProps> = ({
  onOpenDetail,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { places, selectedPlaceId, selectedDistrict } = useSelector(
    (state: RootState) => state.chat
  );

  const [zoomLevel, setZoomLevel] = useState(1);
  const districtCenter = DISTRICT_DETAILS[selectedDistrict]?.center || {
    lat: 37.6543,
    lng: 127.0564,
  };

  // Convert real lat/lng to relative coordinate percentage on canvas
  const getCoordinates = (lat: number, lng: number) => {
    // Offset relative to district center
    const latDiff = lat - districtCenter.lat;
    const lngDiff = lng - districtCenter.lng;

    // Normalizing scale factor
    const scale = 1800 * zoomLevel;
    const x = 50 + lngDiff * scale;
    const y = 50 - latDiff * scale;

    return {
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(10, Math.min(90, y)),
    };
  };

  const selectedPlace = places.find((p) => p.id === selectedPlaceId);

  return (
    <div className="relative w-full h-full bg-[#0B1120] overflow-hidden flex flex-col select-none">
      {/* Map Canvas Background: Stylized Vector Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

      {/* District Center Radar / Circular Boundary Rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[320px] h-[320px] rounded-full border border-blue-500/10 animate-ping [animation-duration:4s]" />
        <div className="w-[480px] h-[480px] rounded-full border border-slate-700/20" />
        <div className="w-[200px] h-[200px] rounded-full border border-amber-400/10" />
      </div>

      {/* Top Banner: Mode Attribution */}
      <div className="relative z-10 p-3 bg-[#131B2E]/90 backdrop-blur-md border-b border-white/10 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-bold text-white">[{selectedDistrict}] 인터랙티브 벡터 지도</span>
          <span className="text-[10px] text-amber-300/80 bg-amber-400/10 px-2 py-0.5 rounded-lg border border-amber-400/20 hidden sm:inline">
            검증 로컬 좌표 연동
          </span>
        </div>
        <span className="text-[11px] text-slate-400">
          마커를 클릭하면 장소가 동기화됩니다
        </span>
      </div>

      {/* Interactive Map Surface */}
      <div className="relative flex-1 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing">
        {/* District Center Anchor Badge */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-1 bg-[#17233A]/90 px-2.5 py-1 rounded-full border border-white/20 shadow-md text-[10px] font-bold text-slate-300 pointer-events-none"
          style={{ left: "50%", top: "50%" }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          <span>{selectedDistrict} 중심</span>
        </div>

        {/* Place Markers plotted with real GPS coordinates */}
        {places.map((place) => {
          const isSelected = place.id === selectedPlaceId;
          const { x, y } = getCoordinates(place.lat, place.lng);

          return (
            <div
              key={place.id}
              onClick={() => dispatch(setSelectedPlaceId(place.id))}
              style={{ left: `${x}%`, top: `${y}%` }}
              className="absolute transform -translate-x-1/2 -translate-y-full z-20 group cursor-pointer transition-transform duration-200"
            >
              {/* Pulse effect if selected */}
              {isSelected && (
                <div className="absolute -inset-2 bg-amber-400/30 rounded-full animate-ping pointer-events-none" />
              )}

              {/* Marker Pin */}
              <div
                className={`relative flex items-center justify-center rounded-2xl p-2 shadow-2xl transition-all duration-200 border ${
                  isSelected
                    ? "bg-[#FDE047] text-slate-950 scale-125 border-amber-200 shadow-amber-400/50"
                    : "bg-[#1E293B] text-blue-300 hover:scale-110 border-white/20 hover:text-[#FDE047]"
                }`}
              >
                <FaMapMarkerAlt size={16} />
              </div>

              {/* Tooltip / Label */}
              <div
                className={`absolute left-1/2 -translate-x-1/2 top-full mt-1.5 whitespace-nowrap px-2.5 py-1 rounded-xl text-[11px] font-bold shadow-xl border transition-all ${
                  isSelected
                    ? "bg-[#17233A] text-[#FDE047] border-[#FDE047]/60 z-30"
                    : "bg-[#0D111A]/90 text-slate-200 border-white/10 opacity-80 group-hover:opacity-100 z-10"
                }`}
              >
                {place.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Place Overlay Card */}
      {selectedPlace && (
        <div className="absolute bottom-4 left-4 right-4 z-30 bg-[#17233A]/95 backdrop-blur-2xl p-3.5 rounded-2xl border border-white/15 shadow-2xl flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm text-[#FDE047] truncate">
                {selectedPlace.name}
              </h4>
              <span className="text-[10px] px-2 py-0.5 rounded-lg bg-blue-600/30 text-blue-300 font-semibold border border-blue-400/20 shrink-0">
                {selectedPlace.category}
              </span>
            </div>
            <p className="text-xs text-slate-300 truncate mt-0.5">
              📍 {selectedPlace.address}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenDetail && (
              <button
                onClick={() => onOpenDetail(selectedPlace)}
                className="px-2.5 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-xs text-slate-200 font-semibold border border-white/10 transition cursor-pointer"
              >
                상세보기
              </button>
            )}
            <button
              onClick={() => {
                const url =
                  selectedPlace.kakao_url ||
                  `https://map.kakao.com/link/search/${encodeURIComponent(
                    selectedPlace.name
                  )}`;
                window.open(url, "_blank", "noopener,noreferrer");
              }}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs text-white font-bold transition cursor-pointer flex items-center gap-1 shadow-sm"
            >
              <span>길찾기</span>
              <FaExternalLinkAlt size={10} />
            </button>
          </div>
        </div>
      )}

      {/* Map Control Buttons (+, -, Reset) */}
      <div className="absolute top-14 right-4 z-20 flex flex-col gap-1.5 bg-[#17233A]/90 p-1 rounded-xl border border-white/10 shadow-lg">
        <button
          onClick={() => setZoomLevel((z) => Math.min(z + 0.3, 2.5))}
          title="지도 확대"
          aria-label="지도 확대"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <FaPlus size={11} />
        </button>
        <button
          onClick={() => setZoomLevel((z) => Math.max(z - 0.3, 0.6))}
          title="지도 축소"
          aria-label="지도 축소"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <FaMinus size={11} />
        </button>
        <button
          onClick={() => setZoomLevel(1)}
          title="중심 리셋"
          aria-label="중심 리셋"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-[#FDE047] hover:bg-white/10 transition cursor-pointer border-t border-white/5"
        >
          <FaRedo size={10} />
        </button>
      </div>
    </div>
  );
};

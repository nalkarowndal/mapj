"use client";
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { setSelectedPlaceId, openSettingsWithTab } from "@/store/chatSlice";
import { DISTRICT_DETAILS } from "@/lib/districtData";
import { PlaceInfo } from "@/lib/types";
import {
  FaPlus,
  FaMinus,
  FaRedo,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaExternalLinkAlt,
  FaCog,
  FaCompass,
  FaArrowLeft,
} from "react-icons/fa";

interface InteractiveMapFallbackProps {
  onOpenDetail?: (place: PlaceInfo) => void;
  onSwitchToRealMap?: () => void;
}

export const InteractiveMapFallback: React.FC<InteractiveMapFallbackProps> = ({
  onOpenDetail,
  onSwitchToRealMap,
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

  // GPS 위경도를 캔버스 상대 좌표(%)로 변환
  const getCoordinates = (lat: number, lng: number) => {
    const latDiff = lat - districtCenter.lat;
    const lngDiff = lng - districtCenter.lng;

    const scale = 1800 * zoomLevel;
    const x = 50 + lngDiff * scale;
    const y = 50 - latDiff * scale;

    return {
      x: Math.max(12, Math.min(88, x)),
      y: Math.max(12, Math.min(88, y)),
    };
  };

  const selectedPlace = places.find((p) => p.id === selectedPlaceId);

  return (
    <div className="relative w-full h-full bg-[#0B1120] overflow-hidden flex flex-col select-none">
      {/* 1. 상단 안내 배너: 실제 지도가 아님을 명확히 명시 */}
      <div className="relative z-20 px-4 py-2.5 bg-[#131B2E]/95 backdrop-blur-md border-b border-amber-400/20 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30 text-amber-300 font-bold text-[11px] flex items-center gap-1">
            <FaInfoCircle size={11} />
            <span>보조 벡터 시각화 모드</span>
          </span>
          <span className="text-slate-300 text-[11px] hidden sm:inline">
            카카오 지도 API 키 미설정 시 제공되는 대체 좌표 뷰입니다 (실제 타일 지도 아님).
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => {
              if (onSwitchToRealMap) {
                onSwitchToRealMap();
              } else {
                dispatch(openSettingsWithTab("kakao_js"));
              }
            }}
            className="px-3 py-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] shadow-sm flex items-center gap-1.5 cursor-pointer transition"
          >
            <FaCog size={11} />
            <span>실제 지도 전환 (키 설정)</span>
          </button>
        </div>
      </div>

      {/* 2. 인터랙티브 벡터 캔버스 */}
      <div className="relative flex-1 w-full h-full overflow-hidden cursor-grab active:cursor-grabbing">
        {/* 그리드 배경 패턴 */}
        <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-60 pointer-events-none" />

        {/* 기준점 방사형 가이드 라인 */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[300px] h-[300px] rounded-full border border-slate-700/30" />
          <div className="w-[460px] h-[460px] rounded-full border border-slate-800/20" />
        </div>

        {/* 자치구 기준점 명시 배지 */}
        <div
          className="absolute transform -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 bg-[#17233A]/90 px-3 py-1 rounded-full border border-white/20 shadow-md text-[11px] font-bold text-slate-300 pointer-events-none"
          style={{ left: "50%", top: "50%" }}
        >
          <span className="w-2 h-2 rounded-full bg-blue-400" />
          <span>[{selectedDistrict}] 기준 좌표점</span>
        </div>

        {/* 장소 마커 */}
        {places.map((place) => {
          const isSelected = place.id === selectedPlaceId;
          const { x, y } = getCoordinates(place.lat, place.lng);

          return (
            <div
              key={place.id}
              onClick={() => {
                dispatch(setSelectedPlaceId(place.id));
                if (onOpenDetail) onOpenDetail(place);
              }}
              style={{ left: `${x}%`, top: `${y}%` }}
              className="absolute transform -translate-x-1/2 -translate-y-full z-20 group cursor-pointer transition-transform duration-200"
            >
              {isSelected && (
                <div className="absolute -inset-2 bg-amber-400/30 rounded-full animate-ping pointer-events-none" />
              )}

              <div
                className={`relative flex items-center justify-center rounded-2xl p-2 shadow-2xl transition-all duration-200 border ${
                  isSelected
                    ? "bg-[#FDE047] text-slate-950 scale-125 border-amber-200 shadow-amber-400/50"
                    : "bg-[#1E293B] text-blue-300 hover:scale-110 border-white/20 hover:text-[#FDE047]"
                }`}
              >
                <FaMapMarkerAlt size={16} />
              </div>

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

      {/* 3. 줌 및 캔버스 컨트롤 */}
      <div className="absolute top-14 right-3 z-30 flex flex-col gap-1.5">
        <div className="flex flex-col rounded-xl overflow-hidden bg-[#17233A]/90 backdrop-blur-md border border-white/15 shadow-xl">
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
            title="확대"
            aria-label="확대"
            className="p-2.5 text-slate-200 hover:text-[#FDE047] hover:bg-[#1E293B] border-b border-white/10 transition cursor-pointer flex items-center justify-center"
          >
            <FaPlus size={12} />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.25))}
            title="축소"
            aria-label="축소"
            className="p-2.5 text-slate-200 hover:text-[#FDE047] hover:bg-[#1E293B] transition cursor-pointer flex items-center justify-center"
          >
            <FaMinus size={12} />
          </button>
        </div>

        <button
          onClick={() => setZoomLevel(1)}
          title="기본 배율 복귀"
          aria-label="기본 배율 복귀"
          className="p-2.5 rounded-xl bg-[#17233A]/90 hover:bg-[#1E293B] text-slate-200 hover:text-[#FDE047] backdrop-blur-md border border-white/15 shadow-xl transition cursor-pointer flex items-center justify-center"
        >
          <FaRedo size={12} />
        </button>
      </div>

      {/* 4. 선택된 장소 바텀 카드 */}
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
                className="px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-xs font-bold text-white border border-white/10 transition cursor-pointer flex items-center gap-1"
              >
                <span>상세보기</span>
              </button>
            )}
            <a
              href={`https://map.kakao.com/link/to/${encodeURIComponent(selectedPlace.name)},${selectedPlace.lat},${selectedPlace.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-[#FDE047] hover:bg-amber-300 text-slate-950 text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              <span>길찾기</span>
              <FaExternalLinkAlt size={10} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

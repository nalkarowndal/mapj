"use client";
import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { setShowMap } from "@/store/chatSlice";
import { KakaoMapView } from "./KakaoMapView";
import { PlaceDetailModal } from "../places/PlaceDetailModal";
import { PlaceInfo } from "@/lib/types";
import { FaMap, FaTimes } from "react-icons/fa";

export const MapContainer: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { selectedDistrict } = useSelector((state: RootState) => state.chat);
  const [detailPlace, setDetailPlace] = useState<PlaceInfo | null>(null);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-[#0D111A]/90 relative">
      {/* Map Header Toolbar */}
      <div className="relative z-10 px-4 py-3 bg-[#131B2E]/90 backdrop-blur-md flex justify-between items-center border-b border-white/10 shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">
            <FaMap />
          </div>
          <div>
            <h3 className="font-bold text-xs text-white">
              {selectedDistrict} 위치 지도
            </h3>
            <span className="text-[10px] text-slate-400">
              실시간 장소 마커 및 길찾기
            </span>
          </div>
        </div>

        <button
          onClick={() => dispatch(setShowMap(false))}
          title="지도 패널 닫기"
          aria-label="지도 패널 닫기"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1E293B] hover:bg-red-500/20 hover:text-red-300 text-slate-300 text-xs font-semibold border border-white/10 transition cursor-pointer"
        >
          <span>닫기</span>
          <FaTimes size={12} />
        </button>
      </div>

      {/* Map View Area */}
      <div className="flex-1 relative overflow-hidden">
        <KakaoMapView onOpenDetail={(p) => setDetailPlace(p)} />
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

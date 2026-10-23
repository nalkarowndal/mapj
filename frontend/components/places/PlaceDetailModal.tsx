"use client";
import React from "react";
import { PlaceInfo } from "@/lib/types";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { FaMapMarkerAlt, FaPhone, FaExternalLinkAlt, FaCheckCircle, FaTag } from "react-icons/fa";

interface PlaceDetailModalProps {
  place: PlaceInfo | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({
  place,
  isOpen,
  onClose,
}) => {
  if (!place) return null;

  const kakaoMapUrl =
    place.kakao_url || `https://map.kakao.com/link/search/${encodeURIComponent(place.name)}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>{place.name}</span>
          <Badge variant={place.is_registered ? "primary" : "accent"} size="sm">
            {place.is_registered ? "공식 등록" : "검증 명소"}
          </Badge>
        </div>
      }
      footer={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onClose}>
            닫기
          </Button>
          <Button
            variant="accent"
            size="sm"
            rightIcon={<FaExternalLinkAlt size={11} />}
            onClick={() => window.open(kakaoMapUrl, "_blank", "noopener,noreferrer")}
          >
            카카오맵 길찾기
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-slate-200">
        {/* Category & District info */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="font-semibold text-[#FDE047]">{place.district}</span>
          <span>•</span>
          <span>{place.category}</span>
          {place.sub_category && (
            <>
              <span>•</span>
              <span>{place.sub_category}</span>
            </>
          )}
          <span>•</span>
          <span className="text-slate-500">출처: {place.source || "검증된 지역 데이터베이스"}</span>
        </div>

        {/* Address & Contact Details */}
        <div className="p-3.5 rounded-2xl bg-[#0D111A]/80 border border-white/5 space-y-2">
          <div className="flex items-start gap-2 text-xs">
            <FaMapMarkerAlt size={12} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-medium text-white">{place.address}</div>
              {place.road_address && (
                <div className="text-[11px] text-slate-400">(지번: {place.road_address})</div>
              )}
            </div>
          </div>

          {place.phone && (
            <div className="flex items-center gap-2 text-xs pt-1 border-t border-white/5">
              <FaPhone size={11} className="text-emerald-400 shrink-0" />
              <a
                href={`tel:${place.phone}`}
                className="text-emerald-300 hover:underline font-mono"
              >
                {place.phone} (전화 걸기)
              </a>
            </div>
          )}
        </div>

        {/* Recommendation reason */}
        <div>
          <h4 className="text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
            <FaCheckCircle className="text-blue-400" size={12} />
            추천 이유 및 특징
          </h4>
          <p className="p-3 rounded-2xl bg-[#1E293B]/70 border border-white/5 text-xs text-slate-200 leading-relaxed">
            {place.description}
          </p>
        </div>

        {/* Tags */}
        {place.tags && place.tags.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FaTag size={10} />
              관련 키워드
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {place.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 text-[11px] text-slate-300 border border-white/5"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

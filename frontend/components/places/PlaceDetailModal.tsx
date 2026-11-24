"use client";
import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { toggleBookmark } from "@/store/chatSlice";
import { PlaceInfo } from "@/lib/types";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import {
  FaMapMarkerAlt,
  FaPhone,
  FaExternalLinkAlt,
  FaCheckCircle,
  FaTag,
  FaStar,
  FaUtensils,
  FaClock,
  FaCar,
  FaHeart,
  FaRegHeart,
  FaQuoteLeft,
} from "react-icons/fa";

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
  const dispatch = useDispatch<AppDispatch>();
  const bookmarkedIds = useSelector((state: RootState) => state.chat.bookmarkedIds);

  if (!place) return null;

  const isBookmarked = bookmarkedIds.includes(place.id);
  const kakaoMapUrl =
    place.kakao_url || `https://map.kakao.com/link/search/${encodeURIComponent(place.name)}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-lg font-extrabold text-white">{place.name}</span>
          {place.badge && (
            <Badge variant="accent" size="sm">
              {place.badge}
            </Badge>
          )}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-400/15 border border-amber-400/30 text-xs font-extrabold text-[#FDE047]">
            <FaStar size={11} />
            <span>{place.rating ? place.rating.toFixed(1) : "4.6"}</span>
          </div>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full gap-2">
          <button
            onClick={() => dispatch(toggleBookmark(place.id))}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              isBookmarked
                ? "bg-rose-500/20 text-rose-300 border-rose-400/40"
                : "bg-[#1E293B] text-slate-300 border-white/10 hover:text-white"
            }`}
          >
            {isBookmarked ? <FaHeart className="text-rose-400" /> : <FaRegHeart />}
            <span>{isBookmarked ? "찜한 맛집" : "맛집 찜하기"}</span>
          </button>

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
              카카오맵 상세 & 길찾기
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-sm text-slate-200">
        {/* Category & District Meta */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="font-bold text-[#FDE047] bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
            📍 {place.district}
          </span>
          <span className="font-semibold text-white">{place.category}</span>
          {place.sub_category && (
            <>
              <span>•</span>
              <span className="text-slate-300">{place.sub_category}</span>
            </>
          )}
          {place.atmosphere && (
            <>
              <span>•</span>
              <span className="text-amber-200/90">{place.atmosphere}</span>
            </>
          )}
        </div>

        {/* Editor's Curation Review Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1E293B] to-[#131B2E] border border-amber-400/20 space-y-2 shadow-inner">
          <h4 className="text-xs font-extrabold text-[#FDE047] flex items-center gap-1.5">
            <FaQuoteLeft size={11} />
            <span>미식 에디터 큐레이션 노트</span>
          </h4>
          <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
            {place.description}
          </p>
        </div>

        {/* Signature Menu & Price Info */}
        {place.signature_menu && place.signature_menu.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-[#0D111A]/90 border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <FaUtensils size={11} />
                <span>대표 시그니처 메뉴</span>
              </h4>
              {place.price_range && (
                <span className="text-xs font-extrabold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-lg border border-emerald-500/30">
                  평균 가격대: {place.price_range}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {place.signature_menu.map((menu, idx) => (
                <div
                  key={idx}
                  className="px-3 py-2 rounded-xl bg-[#17233A] border border-white/10 text-xs font-bold text-white flex items-center gap-2"
                >
                  <span className="text-amber-400">#{idx + 1}</span>
                  <span>{menu}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Practical Dining Info Grid (Address, Hours, Parking, Phone) */}
        <div className="p-3.5 rounded-2xl bg-[#0D111A]/80 border border-white/5 space-y-2.5 text-xs">
          <div className="flex items-start gap-2.5">
            <FaMapMarkerAlt size={13} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white">{place.address}</div>
              {place.road_address && (
                <div className="text-[11px] text-slate-400 mt-0.5">
                  (지번 주소: {place.road_address})
                </div>
              )}
            </div>
          </div>

          {place.opening_hours && (
            <div className="flex items-center gap-2.5 pt-2 border-t border-white/5">
              <FaClock size={12} className="text-amber-400 shrink-0" />
              <div>
                <span className="text-slate-400 mr-1.5">영업시간:</span>
                <span className="font-semibold text-slate-200">{place.opening_hours}</span>
              </div>
            </div>
          )}

          {place.parking && (
            <div className="flex items-center gap-2.5 pt-2 border-t border-white/5">
              <FaCar size={12} className="text-blue-400 shrink-0" />
              <div>
                <span className="text-slate-400 mr-1.5">주차 안내:</span>
                <span className="font-semibold text-slate-200">{place.parking}</span>
              </div>
            </div>
          )}

          {place.phone && (
            <div className="flex items-center gap-2.5 pt-2 border-t border-white/5">
              <FaPhone size={11} className="text-emerald-400 shrink-0" />
              <a
                href={`tel:${place.phone}`}
                className="text-emerald-300 hover:underline font-mono font-bold"
              >
                {place.phone} (매장 전화 연결)
              </a>
            </div>
          )}
        </div>

        {/* Tags */}
        {place.tags && place.tags.length > 0 && (
          <div>
            <h4 className="text-xs font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
              <FaTag size={10} />
              <span>미식 키워드 태그</span>
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {place.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-xl bg-slate-800 text-[11px] text-amber-200/90 border border-white/5"
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

"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Bookmark, MapPin } from "lucide-react";

export interface RestaurantCardData {
  id: string;
  slug: string;
  name: string;
  regionName: string;
  neighborhood?: string;
  category: string;
  oneLineIntro: string;
  priceRange?: string | null;
  imageUrl?: string | null;
  imageAlt?: string;
  highlights?: string[]; // 검증된 핵심 특징 최대 2개
}

interface RestaurantCardProps {
  restaurant: RestaurantCardData;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  priority?: boolean;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  isSaved = false,
  onToggleSave,
  priority = false,
}) => {
  const [imgError, setImgError] = useState(false);
  const src =
    !imgError && restaurant.imageUrl
      ? restaurant.imageUrl
      : "/images/placeholder-table.svg";
  const isPlaceholder = !restaurant.imageUrl || imgError;
  const visibleHighlights = (restaurant.highlights || []).slice(0, 2);

  return (
    <article className="group relative flex flex-col bg-[var(--bg-surface)] rounded-[14px] border border-[var(--border-default)] overflow-hidden transition-colors hover:border-[var(--border-strong)]">
      {/* 4:3 Image Container */}
      <div className="relative aspect-[4/3] w-full bg-[var(--bg-subtle)] overflow-hidden">
        <Link
          href={`/restaurants/${restaurant.slug}`}
          className="relative block w-full h-full focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[var(--brand-accent)]"
          aria-label={`${restaurant.name} 상세 정보 보기`}
        >
          <Image
            src={src}
            alt={restaurant.imageAlt || `${restaurant.name} 대표 이미지`}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setImgError(true)}
            className={`object-cover transition-transform duration-300 ${
              isPlaceholder ? "" : "group-hover:scale-[1.03]"
            }`}
          />
        </Link>

        {/* Bookmark Save Button */}
        {onToggleSave && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSave(restaurant.id);
            }}
            aria-pressed={isSaved}
            aria-label={isSaved ? `${restaurant.name} 저장 해제` : `${restaurant.name} 저장`}
            className={`absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer border ${
              isSaved
                ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                : "bg-[var(--bg-surface)]/92 text-[var(--text-primary)] border-[var(--border-default)] hover:bg-[var(--bg-surface)]"
            }`}
          >
            <Bookmark
              className="w-4 h-4"
              fill={isSaved ? "currentColor" : "none"}
            />
          </button>
        )}
      </div>

      {/* Clean Editorial Card Body (Max 2 verified highlights, no unverified ratings) */}
      <div className="flex-1 flex flex-col p-4 sm:p-5">
        <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-secondary)]">
          <MapPin className="w-3.5 h-3.5 text-[var(--brand-accent-text)] shrink-0" />
          <span className="truncate">
            {restaurant.regionName}
            {restaurant.neighborhood ? ` · ${restaurant.neighborhood}` : ""}
          </span>
          <span aria-hidden="true" className="text-[var(--border-strong)]">
            /
          </span>
          <span className="shrink-0 font-medium text-[var(--brand-primary)]">
            {restaurant.category}
          </span>
        </div>

        <h3 className="mt-1.5 font-editorial text-[18px] sm:text-[19px] font-semibold text-[var(--text-primary)] leading-snug line-clamp-1">
          <Link
            href={`/restaurants/${restaurant.slug}`}
            className="hover:text-[var(--brand-accent-text)] transition-colors"
          >
            {restaurant.name}
          </Link>
        </h3>

        <p className="mt-2 text-[14px] text-[var(--text-secondary)] leading-relaxed line-clamp-2 flex-1">
          {restaurant.oneLineIntro}
        </p>

        <div className="mt-4 pt-3 border-t border-[var(--border-default)] flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <span className="font-medium text-[var(--text-primary)] whitespace-nowrap">
            {restaurant.priceRange || "가격 정보 확인 필요"}
          </span>

          {visibleHighlights.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 min-w-0">
              {visibleHighlights.map((item, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] text-[12px] whitespace-nowrap"
                >
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};


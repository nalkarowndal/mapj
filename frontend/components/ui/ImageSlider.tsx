"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface SliderImage {
  url: string;
  alt: string;
  badge?: string | null;
  caption?: string | null;
  credit?: string | null;
}

interface ImageSliderProps {
  slides: SliderImage[];
  aspectClassName?: string;
  roundedClassName?: string;
  sizes?: string;
  priority?: boolean;
  compact?: boolean;
  showCounter?: boolean;
  showThumbnails?: boolean;
  showCaption?: boolean;
  autoPlayMs?: number;
  href?: string;
  linkAriaLabel?: string;
  topRightOverlay?: React.ReactNode;
}

export const ImageSlider: React.FC<ImageSliderProps> = ({
  slides,
  aspectClassName = "aspect-[4/3]",
  roundedClassName = "rounded-[16px]",
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
  compact = false,
  showCounter = false,
  showThumbnails = false,
  showCaption = false,
  autoPlayMs = 0,
  href,
  linkAriaLabel,
  topRightOverlay,
}) => {
  const safeSlides: SliderImage[] =
    slides.length > 0
      ? slides
      : [
          {
            url: "/images/placeholder-table.svg",
            alt: "동북미식 매장 사진 준비 중",
          },
        ];

  const [index, setIndex] = useState(0);
  const [failedIdx, setFailedIdx] = useState<Record<number, boolean>>({});
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const total = safeSlides.length;

  useEffect(() => {
    if (index >= total) setIndex(0);
  }, [index, total]);

  const goPrev = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setIndex((prev) => (prev - 1 + total) % total);
    },
    [total]
  );

  const goNext = useCallback(
    (e?: React.MouseEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setIndex((prev) => (prev + 1) % total);
    },
    [total]
  );

  useEffect(() => {
    if (!autoPlayMs || total <= 1 || paused) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % total);
    }, autoPlayMs);
    return () => clearInterval(timer);
  }, [autoPlayMs, total, paused]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || total <= 1) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = touchStartX.current - endX;
    if (Math.abs(delta) >= 40) {
      if (delta > 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (total <= 1) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goPrev();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goNext();
    }
  };

  const activeSlide = safeSlides[index] || safeSlides[0];

  const trackContent = (
    <div
      className="flex w-full h-full transition-transform duration-300 ease-out"
      style={{ transform: `translate3d(-${index * 100}%, 0, 0)` }}
    >
      {safeSlides.map((slide, idx) => {
        const src = failedIdx[idx]
          ? "/images/placeholder-table.svg"
          : slide.url || "/images/placeholder-table.svg";
        return (
          <div
            key={`${slide.url}-${idx}`}
            className="relative w-full h-full shrink-0 bg-[var(--bg-subtle)]"
          >
            <Image
              src={src}
              alt={slide.alt}
              fill
              priority={priority && idx === 0}
              sizes={sizes}
              onError={() =>
                setFailedIdx((prev) => ({ ...prev, [idx]: true }))
              }
              className="object-cover"
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div
      className="space-y-2.5 select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={activeSlide.alt}
        tabIndex={total > 1 ? 0 : undefined}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`group/slider relative ${aspectClassName} w-full overflow-hidden bg-[var(--bg-subtle)] ${roundedClassName}`}
      >
        {href ? (
          <Link
            href={href}
            aria-label={linkAriaLabel || activeSlide.alt}
            className="block w-full h-full relative"
          >
            {trackContent}
          </Link>
        ) : (
          trackContent
        )}

        {/* Top-Right Custom Overlay (e.g., Bookmark Button) */}
        {topRightOverlay && (
          <div className="absolute top-3 right-3 z-20">{topRightOverlay}</div>
        )}

        {/* Counter & Type Badge Pill */}
        {(showCounter && total > 1) || activeSlide.badge ? (
          <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 pointer-events-none">
            {showCounter && total > 1 && (
              <span className="px-2.5 py-1 rounded-full bg-[#1C241F]/78 text-white text-[12px] font-medium backdrop-blur-xs">
                {index + 1} / {total}
              </span>
            )}
            {activeSlide.badge && (
              <span className="px-2.5 py-1 rounded-full bg-white/90 text-[var(--text-primary)] text-[12px] font-semibold shadow-xs">
                {activeSlide.badge}
              </span>
            )}
          </div>
        ) : null}

        {/* Prev / Next Controls */}
        {total > 1 && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="이전 사진"
              className={`absolute left-2.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-[var(--text-primary)] shadow-md border border-black/10 transition-opacity cursor-pointer ${
                compact
                  ? "w-8 h-8 opacity-90 sm:opacity-0 sm:group-hover/slider:opacity-100 focus-visible:opacity-100"
                  : "w-9 h-9 sm:w-10 sm:h-10 opacity-90 hover:opacity-100"
              }`}
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="다음 사진"
              className={`absolute right-2.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-[var(--text-primary)] shadow-md border border-black/10 transition-opacity cursor-pointer ${
                compact
                  ? "w-8 h-8 opacity-90 sm:opacity-0 sm:group-hover/slider:opacity-100 focus-visible:opacity-100"
                  : "w-9 h-9 sm:w-10 sm:h-10 opacity-90 hover:opacity-100"
              }`}
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {/* Bottom Dot Indicators */}
            <div
              className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1C241F]/55 backdrop-blur-xs"
              role="tablist"
              aria-label="사진 슬라이드 선택"
            >
              {safeSlides.map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  role="tab"
                  aria-selected={idx === index}
                  aria-label={`${idx + 1}번 사진 보기`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIndex(idx);
                  }}
                  className={`rounded-full transition-all cursor-pointer ${
                    idx === index
                      ? "w-4 h-1.5 bg-white"
                      : "w-1.5 h-1.5 bg-white/55 hover:bg-white/85"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Optional Thumbnail Strip */}
      {showThumbnails && total > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5">
          {safeSlides.map((slide, idx) => (
            <button
              key={`${slide.url}-thumb-${idx}`}
              type="button"
              onClick={() => setIndex(idx)}
              aria-label={`${idx + 1}번 썸네일 선택`}
              aria-pressed={idx === index}
              className={`relative w-20 h-14 shrink-0 rounded-[10px] overflow-hidden border-2 transition-all cursor-pointer ${
                idx === index
                  ? "border-[var(--brand-primary)] opacity-100"
                  : "border-transparent opacity-65 hover:opacity-95"
              }`}
            >
              <Image
                src={
                  failedIdx[idx]
                    ? "/images/placeholder-table.svg"
                    : slide.url
                }
                alt={`${slide.alt} 썸네일`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Optional Dynamic Caption / Source Credit */}
      {showCaption && (activeSlide.credit || activeSlide.caption) && (
        <p className="text-[12px] text-[var(--text-muted)] text-right">
          {activeSlide.credit || activeSlide.caption}
        </p>
      )}
    </div>
  );
};


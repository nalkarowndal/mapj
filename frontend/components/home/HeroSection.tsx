"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "../ui/Button";
import { ImageSlider, SliderImage } from "../ui/ImageSlider";

const QUICK_SEARCH_TERMS = ["공릉동 국수", "성북동 베이커리", "도봉산 노포", "4.19 카페거리"];

const HERO_SLIDES: SliderImage[] = [
  {
    url: "/images/regions/region-seongbuk.jpg",
    alt: "성북구 성북동 전통 한옥 거리 풍경",
    credit: "성북구 성북동 실제 거리 풍경 · 좌우로 슬라이드해 동북권 5개 동네를 둘러보세요",
  },
  {
    url: "/images/restaurants/gb-01.jpg",
    alt: "강북구 엘림들깨수제비칼국수 실제 한 상",
    credit: "강북구 엘림들깨수제비칼국수 실제 음식 사진",
  },
  {
    url: "/images/regions/region-dobong.jpg",
    alt: "도봉구 도봉산 실제 봉우리 풍경",
    credit: "도봉구 도봉산 실제 풍경 사진",
  },
  {
    url: "/images/restaurants/nw-01.jpg",
    alt: "노원구 털보고된이 본점 실제 화덕 고등어구이",
    credit: "노원구 털보고된이 본점 실제 화덕 생선구이 사진",
  },
  {
    url: "/images/regions/region-jungnang.jpg",
    alt: "중랑구 중랑천 수변 산책로 실제 풍경",
    credit: "중랑구 중랑천 수변 산책로 실제 풍경 사진",
  },
];

export const HeroSection: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/restaurants?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/restaurants");
    }
  };

  return (
    <section className="w-full border-b border-[var(--border-default)] bg-[var(--bg-main)]">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Brand Message, Integrated Search & Primary CTA */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <p className="text-[13px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-accent-text)]">
                다섯 개의 동네, 수많은 맛의 이야기
              </p>
              <h1 className="font-editorial text-[36px] sm:text-[46px] lg:text-[52px] font-bold leading-[1.18] text-[var(--text-primary)]">
                우리 동네의
                <br />
                맛있는 발견.
              </h1>
              <p className="text-[15px] sm:text-[17px] text-[var(--text-secondary)] leading-relaxed max-w-xl">
                서울 동북권 다섯 지역의 숨겨진 맛과 특별한 식탁을 만나보세요.
              </p>
            </div>

            {/* Integrated Search Form */}
            <form
              onSubmit={handleSearch}
              role="search"
              aria-label="동북권 맛집 통합 검색"
              className="w-full max-w-xl"
            >
              <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-[12px] p-1.5 focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/15 transition-all shadow-[var(--shadow-subtle)]">
                <Search
                  aria-hidden="true"
                  className="w-5 h-5 text-[var(--text-muted)] ml-3 shrink-0"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="지역명, 음식명, 매장명으로 검색해 보세요"
                  aria-label="지역명, 음식명, 매장명 검색"
                  className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:outline-none focus-visible:outline-none"
                />
                <Button type="submit" variant="primary" size="md" className="shrink-0">
                  검색
                </Button>
              </div>
            </form>

            {/* Quick Search Suggestions */}
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-[var(--text-muted)] font-medium">추천 검색</span>
              {QUICK_SEARCH_TERMS.map((term) => (
                <Link
                  key={term}
                  href={`/restaurants?q=${encodeURIComponent(term)}`}
                  className="px-3 py-1 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {term}
                </Link>
              ))}
            </div>

            {/* Secondary Regional Navigation CTA */}
            <div className="pt-1 flex flex-wrap items-center gap-4">
              <Link
                href="/regions"
                className="inline-flex items-center gap-2 text-[15px] font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-accent-text)] transition-colors"
              >
                <span>다섯 개 자치구 미식 가이드 보기</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right: Multi-Image Real Neighborhood & Dining Slider */}
          <div className="lg:col-span-6">
            <ImageSlider
              slides={HERO_SLIDES}
              aspectClassName="aspect-[4/3]"
              roundedClassName="rounded-[16px] border border-[var(--border-default)]"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              showCounter
              showCaption
              autoPlayMs={5500}
            />
          </div>
        </div>
      </div>
    </section>
  );
};


"use client";
import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RestaurantSummary } from "@/lib/types/gourmet";
import { RestaurantCard } from "../restaurants/RestaurantCard";
import { useBookmarks } from "@/features/bookmarks/useBookmarks";

interface EditorPicksProps {
  restaurants: RestaurantSummary[];
}

export const EditorPicks: React.FC<EditorPicksProps> = ({ restaurants }) => {
  const { isSaved, toggle, hydrated } = useBookmarks();

  return (
    <section
      aria-labelledby="editor-picks-heading"
      className="w-full bg-[var(--bg-subtle)]/55 border-y border-[var(--border-default)] py-14 sm:py-20"
    >
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
          <div className="space-y-2">
            <p className="text-[13px] font-semibold tracking-[0.12em] uppercase text-[var(--brand-accent-text)]">
              EDITOR&apos;S SELECTION
            </p>
            <h2
              id="editor-picks-heading"
              className="font-editorial text-[26px] sm:text-[32px] font-semibold text-[var(--text-primary)]"
            >
              에디터 추천 맛집
            </h2>
            <p className="text-[15px] text-[var(--text-secondary)]">
              다섯 지역에서 실존 여부와 주소를 확인한 대표적인 로컬 식당들을 엄선했습니다.
            </p>
          </div>

          <Link
            href="/restaurants"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-accent-text)] transition-colors shrink-0"
          >
            <span>전체 맛집 탐색하기</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {restaurants.slice(0, 6).map((r) => (
            <RestaurantCard
              key={r.id}
              restaurant={{
                id: r.id,
                slug: r.slug,
                name: r.name,
                regionName: r.region_name,
                neighborhood: r.neighborhood,
                category: r.primary_category,
                oneLineIntro: r.one_line_intro,
                priceRange: r.price_range_label,
                imageUrl: r.primary_image?.url || null,
                imageAlt: r.primary_image?.alt,
                highlights: r.highlights,
              }}
              isSaved={hydrated ? isSaved(r.id) : false}
              onToggleSave={toggle}
            />
          ))}
        </div>
      </div>
    </section>
  );
};


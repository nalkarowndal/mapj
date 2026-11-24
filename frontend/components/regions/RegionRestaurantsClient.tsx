"use client";
import React, { useState } from "react";
import { CategoryItem, RestaurantSummary } from "@/lib/types/gourmet";
import { FilterChip } from "../ui/FilterChip";
import { RestaurantCard } from "../restaurants/RestaurantCard";
import { EmptyState } from "../ui/StateViews";
import { useBookmarks } from "@/features/bookmarks/useBookmarks";

interface RegionRestaurantsClientProps {
  regionName: string;
  categories: CategoryItem[];
  editorPicks: RestaurantSummary[];
  restaurants: RestaurantSummary[];
}

export const RegionRestaurantsClient: React.FC<RegionRestaurantsClientProps> = ({
  regionName,
  categories,
  editorPicks,
  restaurants,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { isSaved, toggle, hydrated } = useBookmarks();

  const filtered =
    selectedCategory === "all"
      ? restaurants
      : restaurants.filter((r) => r.primary_category_slug === selectedCategory);

  const toCardData = (r: RestaurantSummary) => ({
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
    images: r.images,
    topMenus: r.top_menus,
    highlights: r.highlights,
  });

  return (
    <div className="space-y-16">
      {/* 3. 지역 대표 맛집 (에디터 추천) */}
      <section aria-labelledby="region-picks-heading" className="space-y-6">
        <div className="space-y-1.5">
          <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-[var(--brand-accent-text)]">
            REPRESENTATIVE PICKS
          </p>
          <h2
            id="region-picks-heading"
            className="font-editorial text-[26px] sm:text-[30px] font-semibold text-[var(--text-primary)]"
          >
            {regionName} 대표 맛집
          </h2>
          <p className="text-[14px] sm:text-[15px] text-[var(--text-secondary)]">
            {regionName}의 미식 성격을 가장 잘 보여주는 에디터 선정 식당입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {editorPicks.slice(0, 3).map((r) => (
            <RestaurantCard
              key={r.id}
              restaurant={toCardData(r)}
              isSaved={hydrated ? isSaved(r.id) : false}
              onToggleSave={toggle}
            />
          ))}
        </div>
      </section>

      {/* 4 & 6. 음식 종류별 탐색 + 전체 등록 맛집 */}
      <section aria-labelledby="region-all-heading" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-1.5">
            <h2
              id="region-all-heading"
              className="font-editorial text-[26px] sm:text-[30px] font-semibold text-[var(--text-primary)]"
            >
              {regionName} 전체 등록 맛집 ({filtered.length})
            </h2>
            <p className="text-[14px] text-[var(--text-secondary)]">
              음식 종류를 선택해 원하는 스타일의 식당만 모아볼 수 있습니다.
            </p>
          </div>
        </div>

        <div
          role="group"
          aria-label="음식 종류별 필터"
          className="flex flex-wrap gap-2"
        >
          <FilterChip
            selected={selectedCategory === "all"}
            count={restaurants.length}
            onClick={() => setSelectedCategory("all")}
          >
            전체
          </FilterChip>
          {categories.map((cat) => (
            <FilterChip
              key={cat.slug}
              selected={selectedCategory === cat.slug}
              count={cat.count}
              onClick={() => setSelectedCategory(cat.slug)}
            >
              {cat.name}
            </FilterChip>
          ))}
        </div>

        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={toCardData(r)}
                isSaved={hydrated ? isSaved(r.id) : false}
                onToggleSave={toggle}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="선택한 음식 종류의 매장이 없습니다"
            description="전체 보기를 선택해 다른 음식 종류의 식당을 확인해 보세요."
            actionLabel="전체 보기"
            onAction={() => setSelectedCategory("all")}
          />
        )}
      </section>
    </div>
  );
};


"use client";
import React, { useState, useMemo } from "react";
import Link from "next/link";
import { MapPin, Trash2 } from "lucide-react";
import { RegionSummary, RestaurantSummary } from "@/lib/types/gourmet";
import { useBookmarks } from "@/features/bookmarks/useBookmarks";
import { FilterChip } from "../ui/FilterChip";
import { Button } from "../ui/Button";
import { EmptyState, RestaurantCardSkeleton } from "../ui/StateViews";
import { RestaurantCard } from "../restaurants/RestaurantCard";
import { useRouter } from "next/navigation";

interface SavedRestaurantsClientProps {
  allRestaurants: RestaurantSummary[];
  regions: RegionSummary[];
}

export const SavedRestaurantsClient: React.FC<SavedRestaurantsClientProps> = ({
  allRestaurants,
  regions,
}) => {
  const router = useRouter();
  const { savedIds, hydrated, toggle, clearAll } = useBookmarks();
  const [regionFilter, setRegionFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const savedRestaurants = useMemo(() => {
    const idSet = new Set(savedIds);
    return allRestaurants.filter((r) => idSet.has(r.id));
  }, [allRestaurants, savedIds]);

  const availableCategories = useMemo(() => {
    const map = new Map<string, string>();
    savedRestaurants.forEach((r) =>
      map.set(r.primary_category_slug, r.primary_category)
    );
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [savedRestaurants]);

  const filtered = useMemo(() => {
    return savedRestaurants.filter((r) => {
      if (regionFilter && r.region_slug !== regionFilter) return false;
      if (categoryFilter && r.primary_category_slug !== categoryFilter)
        return false;
      return true;
    });
  }, [savedRestaurants, regionFilter, categoryFilter]);

  if (!hydrated) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <RestaurantCardSkeleton />
        <RestaurantCardSkeleton />
        <RestaurantCardSkeleton />
      </div>
    );
  }

  if (savedRestaurants.length === 0) {
    return (
      <EmptyState
        title="아직 저장한 맛집이 없습니다"
        description="동북권의 다양한 식당을 둘러보고 마음에 드는 곳의 저장 아이콘을 눌러 나만의 미식 리스트를 만들어 보세요."
        actionLabel="전체 맛집 탐색하러 가기"
        onAction={() => router.push("/restaurants")}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="p-4 sm:p-5 rounded-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[15px] text-[var(--text-primary)]">
            총{" "}
            <strong className="font-semibold text-[var(--brand-primary)]">
              {savedRestaurants.length}곳
            </strong>
            의 맛집이 저장되어 있습니다.
          </p>

          <div className="flex items-center gap-2">
            <Link
              href={regionFilter ? `/map?region=${regionFilter}` : "/map"}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--brand-primary)] text-[13px] font-semibold"
            >
              <MapPin className="w-4 h-4" />
              <span>지도에서 확인</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              전체 비우기
            </Button>
          </div>
        </div>

        {/* Region Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            selected={!regionFilter}
            onClick={() => setRegionFilter("")}
          >
            전체 지역
          </FilterChip>
          {regions.map((reg) => {
            const cnt = savedRestaurants.filter(
              (r) => r.region_slug === reg.slug
            ).length;
            if (cnt === 0) return null;
            return (
              <FilterChip
                key={reg.slug}
                selected={regionFilter === reg.slug}
                count={cnt}
                onClick={() => setRegionFilter(reg.slug)}
              >
                {reg.name}
              </FilterChip>
            );
          })}
        </div>

        {/* Category Filter */}
        {availableCategories.length > 1 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-default)]">
            <FilterChip
              selected={!categoryFilter}
              onClick={() => setCategoryFilter("")}
            >
              전체 음식
            </FilterChip>
            {availableCategories.map((cat) => (
              <FilterChip
                key={cat.slug}
                selected={categoryFilter === cat.slug}
                onClick={() => setCategoryFilter(cat.slug)}
              >
                {cat.name}
              </FilterChip>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="선택한 필터에 해당하는 저장 맛집이 없습니다"
          description="필터를 초기화하여 저장해 둔 전체 맛집 목록을 확인해 보세요."
          actionLabel="필터 초기화"
          onAction={() => {
            setRegionFilter("");
            setCategoryFilter("");
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((r) => (
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
                highlights: r.highlights,
              }}
              isSaved={true}
              onToggleSave={toggle}
            />
          ))}
        </div>
      )}
    </div>
  );
};


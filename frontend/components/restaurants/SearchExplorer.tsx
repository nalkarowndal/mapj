"use client";
import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  MapPin,
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  CategoryItem,
  PaginatedRestaurantsResponse,
  RegionSummary,
} from "@/lib/types/gourmet";
import { getRestaurants } from "@/lib/api/client";
import { Button } from "../ui/Button";
import { FilterChip } from "../ui/FilterChip";
import { Modal } from "../ui/Modal";
import {
  EmptyState,
  ErrorState,
  RestaurantCardSkeleton,
} from "../ui/StateViews";
import { RestaurantCard } from "./RestaurantCard";
import { useBookmarks } from "@/features/bookmarks/useBookmarks";

const PRICE_OPTIONS = [
  { value: "", label: "전체 가격대" },
  { value: "under_10000", label: "1만원 이하" },
  { value: "10000_20000", label: "1만~2만원대" },
  { value: "20000_40000", label: "2만~4만원대" },
  { value: "over_40000", label: "4만원 이상" },
];

const FEATURE_OPTIONS = [
  { value: "solo_dining", label: "혼밥" },
  { value: "date", label: "데이트" },
  { value: "family", label: "가족 외식" },
  { value: "group", label: "단체 모임" },
  { value: "parking", label: "주차 가능" },
  { value: "reservation", label: "예약 가능" },
  { value: "pet_friendly", label: "반려동물 동반" },
  { value: "takeout", label: "포장 가능" },
];

const SORT_OPTIONS = [
  { value: "recommended", label: "추천순" },
  { value: "verified_recent", label: "최근 정보 확인순" },
  { value: "name_asc", label: "매장명순" },
  { value: "price_asc", label: "가격 낮은순" },
  { value: "price_desc", label: "가격 높은순" },
];

export interface SearchInitialState {
  q: string;
  region: string;
  neighborhood: string;
  category: string;
  price: string;
  features: string[];
  open_now: boolean;
  sort: string;
  page: number;
}

interface SearchExplorerProps {
  regions: RegionSummary[];
  categories: CategoryItem[];
  initialState: SearchInitialState;
  initialData: PaginatedRestaurantsResponse;
}

export const SearchExplorer: React.FC<SearchExplorerProps> = ({
  regions,
  categories,
  initialState,
  initialData,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isSaved, toggle, hydrated } = useBookmarks();

  const [state, setState] = useState<SearchInitialState>(initialState);
  const [searchInput, setSearchInput] = useState(initialState.q);
  const [data, setData] = useState<PaginatedRestaurantsResponse>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  // Sync if URL changes via browser Back/Forward
  useEffect(() => {
    setState(initialState);
    setSearchInput(initialState.q);
    setData(initialData);
  }, [initialState, initialData]);

  const buildQueryString = useCallback((next: SearchInitialState) => {
    const sp = new URLSearchParams();
    if (next.q.trim()) sp.set("q", next.q.trim());
    if (next.region) sp.set("region", next.region);
    if (next.neighborhood) sp.set("neighborhood", next.neighborhood);
    if (next.category) sp.set("category", next.category);
    if (next.price) sp.set("price", next.price);
    if (next.features.length > 0) sp.set("features", next.features.join(","));
    if (next.open_now) sp.set("open_now", "true");
    if (next.sort && next.sort !== "recommended") sp.set("sort", next.sort);
    if (next.page > 1) sp.set("page", String(next.page));
    return sp.toString();
  }, []);

  const applyFilters = useCallback(
    async (next: SearchInitialState) => {
      setState(next);
      const qs = buildQueryString(next);
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

      setLoading(true);
      setError(null);
      try {
        const res = await getRestaurants({
          q: next.q.trim() || undefined,
          region: next.region || undefined,
          neighborhood: next.neighborhood || undefined,
          category: next.category || undefined,
          price: next.price || undefined,
          features: next.features.length > 0 ? next.features : undefined,
          open_now: next.open_now || undefined,
          sort: next.sort,
          page: next.page,
          page_size: 12,
        });
        setData(res);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "맛집 목록을 불러오는 중 오류가 발생했습니다."
        );
      } finally {
        setLoading(false);
      }
    },
    [buildQueryString, pathname, router]
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ ...state, q: searchInput, page: 1 });
  };

  const handleResetAll = () => {
    setSearchInput("");
    applyFilters({
      q: "",
      region: "",
      neighborhood: "",
      category: "",
      price: "",
      features: [],
      open_now: false,
      sort: "recommended",
      page: 1,
    });
  };

  const toggleFeature = (feat: string) => {
    const exists = state.features.includes(feat);
    const nextFeatures = exists
      ? state.features.filter((f) => f !== feat)
      : [...state.features, feat];
    applyFilters({ ...state, features: nextFeatures, page: 1 });
  };

  const detailFilterCount =
    (state.price ? 1 : 0) +
    state.features.length +
    (state.open_now ? 1 : 0);

  const hasAnyFilter = Boolean(
    state.q ||
      state.region ||
      state.neighborhood ||
      state.category ||
      detailFilterCount > 0
  );

  const mapLinkQs = buildQueryString({ ...state, page: 1 });

  return (
    <div className="space-y-8">
      {/* Primary Practical Search & Filter Bar (Concept B) */}
      <div className="p-4 sm:p-6 rounded-[16px] bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-5">
        <form
          onSubmit={handleSearchSubmit}
          role="search"
          aria-label="전체 맛집 통합 검색"
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1 flex items-center bg-[var(--bg-main)] border border-[var(--border-strong)] rounded-[10px] focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/15">
            <Search
              aria-hidden="true"
              className="w-4 h-4 text-[var(--text-muted)] ml-3.5 shrink-0"
            />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="음식점명, 대표메뉴, 동네·상권, 특징으로 검색 (예: 공릉동 국수, 성북동 빵)"
              aria-label="맛집 검색어 입력"
              className="w-full bg-transparent px-3 py-2.5 min-h-[44px] text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:outline-none focus-visible:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button type="submit" variant="primary" size="md">
              검색
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setFilterModalOpen(true)}
              leftIcon={<SlidersHorizontal className="w-4 h-4" />}
            >
              상세 필터{detailFilterCount > 0 ? ` (${detailFilterCount})` : ""}
            </Button>
            <Link
              href={mapLinkQs ? `/map?${mapLinkQs}` : "/map"}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-[10px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--brand-primary)] text-[14px] font-semibold border border-[var(--border-default)] transition-colors whitespace-nowrap"
            >
              <MapPin className="w-4 h-4" />
              <span className="hidden md:inline">지도 보기</span>
            </Link>
          </div>
        </form>

        {/* Region Filter Row */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[13px] font-semibold text-[var(--text-secondary)] shrink-0 mr-1">
              지역
            </span>
            <FilterChip
              selected={!state.region}
              onClick={() =>
                applyFilters({
                  ...state,
                  region: "",
                  neighborhood: "",
                  page: 1,
                })
              }
            >
              전체 지역
            </FilterChip>
            {regions.map((r) => (
              <FilterChip
                key={r.slug}
                selected={state.region === r.slug}
                count={r.restaurant_count}
                onClick={() =>
                  applyFilters({
                    ...state,
                    region: r.slug,
                    neighborhood: "",
                    page: 1,
                  })
                }
              >
                {r.name}
              </FilterChip>
            ))}
          </div>

          {/* 13 Standard Food Category Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[13px] font-semibold text-[var(--text-secondary)] shrink-0 mr-1">
              음식
            </span>
            <FilterChip
              selected={!state.category}
              onClick={() => applyFilters({ ...state, category: "", page: 1 })}
            >
              전체
            </FilterChip>
            {categories.map((cat) => (
              <FilterChip
                key={cat.slug}
                selected={state.category === cat.slug}
                count={cat.count}
                onClick={() =>
                  applyFilters({ ...state, category: cat.slug, page: 1 })
                }
              >
                {cat.name}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      {/* Results Header: Total Count, Active Filters, Sort */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[15px] text-[var(--text-primary)]">
            검색 결과{" "}
            <strong className="font-semibold text-[var(--brand-primary)]">
              {data.pagination.total}곳
            </strong>
          </p>

          {state.neighborhood && (
            <button
              type="button"
              onClick={() =>
                applyFilters({ ...state, neighborhood: "", page: 1 })
              }
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--brand-accent-soft)] text-[var(--brand-accent-text)] text-[12px] font-medium cursor-pointer"
            >
              <span>상권: {state.neighborhood}</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {state.price && (
            <button
              type="button"
              onClick={() => applyFilters({ ...state, price: "", page: 1 })}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] text-[var(--text-primary)] text-[12px] font-medium cursor-pointer"
            >
              <span>
                {PRICE_OPTIONS.find((p) => p.value === state.price)?.label}
              </span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {state.features.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => toggleFeature(f)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--bg-subtle)] text-[var(--text-primary)] text-[12px] font-medium cursor-pointer"
            >
              <span>
                {FEATURE_OPTIONS.find((o) => o.value === f)?.label || f}
              </span>
              <X className="w-3.5 h-3.5" />
            </button>
          ))}

          {state.open_now && (
            <button
              type="button"
              onClick={() => applyFilters({ ...state, open_now: false, page: 1 })}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--status-open-bg)] text-[var(--status-open)] text-[12px] font-medium cursor-pointer"
            >
              <span>영업 중만 보기</span>
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {hasAnyFilter && (
            <button
              type="button"
              onClick={handleResetAll}
              className="inline-flex items-center gap-1 text-[13px] text-[var(--text-secondary)] hover:text-[var(--brand-accent-text)] px-2 py-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>필터 초기화</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label
            htmlFor="restaurant-sort"
            className="text-[13px] text-[var(--text-secondary)]"
          >
            정렬
          </label>
          <select
            id="restaurant-sort"
            value={state.sort}
            onChange={(e) =>
              applyFilters({ ...state, sort: e.target.value, page: 1 })
            }
            className="px-3 py-2 min-h-[40px] rounded-[8px] bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[14px] text-[var(--text-primary)] cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Grid / Skeleton / Error / Empty */}
      {error ? (
        <ErrorState
          description={error}
          onRetry={() => applyFilters(state)}
        />
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, idx) => (
            <RestaurantCardSkeleton key={idx} />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState
          title="조건에 맞는 맛집을 찾지 못했습니다"
          description={
            state.open_now
              ? "실시간 요일별 영업시간이 확인된 매장만 필터링됩니다. '영업 중' 조건을 해제하거나 다른 필터를 선택해 보세요."
              : "검색어나 상세 필터 조건을 완화하여 서울 동북권의 검증된 식당을 둘러보세요."
          }
          actionLabel="모든 필터 초기화"
          onAction={handleResetAll}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {data.items.map((r) => (
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
                  images: r.images,
                  highlights: r.highlights,
                }}
                isSaved={hydrated ? isSaved(r.id) : false}
                onToggleSave={toggle}
              />
            ))}
          </div>

          {/* Pagination */}
          {data.pagination.total_pages > 1 && (
            <nav
              aria-label="검색 결과 페이지네이션"
              className="pt-6 flex items-center justify-center gap-2"
            >
              <Button
                variant="outline"
                size="sm"
                disabled={data.pagination.page <= 1}
                onClick={() =>
                  applyFilters({ ...state, page: data.pagination.page - 1 })
                }
                leftIcon={<ChevronLeft className="w-4 h-4" />}
              >
                이전
              </Button>
              <span className="px-3 text-[14px] text-[var(--text-secondary)]">
                {data.pagination.page} / {data.pagination.total_pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={data.pagination.page >= data.pagination.total_pages}
                onClick={() =>
                  applyFilters({ ...state, page: data.pagination.page + 1 })
                }
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                다음
              </Button>
            </nav>
          )}
        </>
      )}

      {/* Detail Filter Modal / Mobile Bottom-Sheet Friendly Dialog */}
      <Modal
        isOpen={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        title="상세 필터"
        maxWidth="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" size="sm" onClick={handleResetAll}>
              초기화
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setFilterModalOpen(false)}
            >
              {data.pagination.total}개 결과 보기
            </Button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="space-y-2.5">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
              가격대
            </h3>
            <div className="flex flex-wrap gap-2">
              {PRICE_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.value || "all"}
                  selected={state.price === opt.value}
                  onClick={() =>
                    applyFilters({ ...state, price: opt.value, page: 1 })
                  }
                >
                  {opt.label}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
              방문 목적 및 편의시설
            </h3>
            <p className="text-[13px] text-[var(--text-secondary)]">
              확인된 정보만 필터에 반영하며, 미확인 매장은 임의로 포함하지 않습니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {FEATURE_OPTIONS.map((opt) => (
                <FilterChip
                  key={opt.value}
                  selected={state.features.includes(opt.value)}
                  onClick={() => toggleFeature(opt.value)}
                >
                  {opt.label}
                </FilterChip>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--border-default)]">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={state.open_now}
                onChange={(e) =>
                  applyFilters({ ...state, open_now: e.target.checked, page: 1 })
                }
                className="mt-1 w-4 h-4 accent-[var(--brand-primary)]"
              />
              <div>
                <div className="text-[14px] font-medium text-[var(--text-primary)]">
                  현재 영업 중인 매장만 보기 (한국 시간 기준)
                </div>
                <div className="text-[12px] text-[var(--text-secondary)]">
                  요일별 영업시간이 검증되지 않은 매장은 안전하게 제외됩니다.
                </div>
              </div>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};


import React from "react";
import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import {
  SearchExplorer,
  SearchInitialState,
} from "@/components/restaurants/SearchExplorer";
import { ErrorState } from "@/components/ui/StateViews";
import {
  getCategories,
  getRegions,
  getRestaurants,
} from "@/lib/api/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "전체 맛집 탐색",
  description:
    "노원·도봉·강북·중랑·성북 서울 동북권의 검증된 맛집을 지역, 음식 종류, 가격대, 방문 목적별로 검색하고 탐색하세요.",
};

interface RestaurantsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function pickStr(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] || "";
  return v || "";
}

export default async function RestaurantsPage({
  searchParams,
}: RestaurantsPageProps) {
  const sp = await searchParams;
  const rawFeatures = pickStr(sp.features);
  const initialState: SearchInitialState = {
    q: pickStr(sp.q),
    region: pickStr(sp.region),
    neighborhood: pickStr(sp.neighborhood),
    category: pickStr(sp.category),
    price: pickStr(sp.price),
    features: rawFeatures
      ? rawFeatures
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [],
    open_now: pickStr(sp.open_now) === "true",
    sort: pickStr(sp.sort) || "recommended",
    page: Math.max(1, Number(pickStr(sp.page)) || 1),
  };

  try {
    const [regions, categories, initialData] = await Promise.all([
      getRegions(),
      getCategories(),
      getRestaurants({
        q: initialState.q || undefined,
        region: initialState.region || undefined,
        neighborhood: initialState.neighborhood || undefined,
        category: initialState.category || undefined,
        price: initialState.price || undefined,
        features:
          initialState.features.length > 0 ? initialState.features : undefined,
        open_now: initialState.open_now || undefined,
        sort: initialState.sort,
        page: initialState.page,
        page_size: 12,
      }),
    ]);

    return (
      <SiteShell>
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
          <div className="space-y-3">
            <Breadcrumb
              items={[{ label: "홈", href: "/" }, { label: "전체 맛집 탐색" }]}
            />
            <h1 className="font-editorial text-[30px] sm:text-[38px] font-bold text-[var(--text-primary)]">
              전체 맛집 탐색
            </h1>
            <p className="text-[15px] text-[var(--text-secondary)]">
              지역, 음식 종류, 방문 목적 조건으로 서울 동북권의 검증된 식당을 빠르게 찾아보세요.
            </p>
          </div>

          <SearchExplorer
            regions={regions}
            categories={categories}
            initialState={initialState}
            initialData={initialData}
          />
        </div>
      </SiteShell>
    );
  } catch {
    return (
      <SiteShell>
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <ErrorState />
        </div>
      </SiteShell>
    );
  }
}


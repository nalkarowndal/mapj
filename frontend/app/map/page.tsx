import React from "react";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { MapExplorer } from "@/components/map/MapExplorer";
import { ErrorState } from "@/components/ui/StateViews";
import {
  getCategories,
  getRegions,
  getRestaurants,
} from "@/lib/api/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "지도 탐색",
  description:
    "카카오맵 지도 위에서 서울 동북권(노원·도봉·강북·중랑·성북) 검증된 맛집의 위치를 확인하고 주변 식당을 탐색하세요.",
};

interface MapPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

function pick(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] || "" : v || "";
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const sp = await searchParams;
  const region = pick(sp.region);
  const category = pick(sp.category);
  const q = pick(sp.q);

  try {
    const [regions, categories, res] = await Promise.all([
      getRegions(),
      getCategories(),
      getRestaurants({
        region: region || undefined,
        category: category || undefined,
        q: q || undefined,
        page: 1,
        page_size: 50,
      }),
    ]);

    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)]">
        <SiteHeader />
        <main className="flex-1 overflow-hidden">
          <MapExplorer
            regions={regions}
            categories={categories}
            initialRestaurants={res.items}
            initialRegion={region}
            initialCategory={category}
            initialQuery={q}
          />
        </main>
        <MobileBottomNav />
      </div>
    );
  } catch {
    return (
      <div className="min-h-screen flex flex-col bg-[var(--bg-main)]">
        <SiteHeader />
        <div className="max-w-3xl mx-auto px-4 py-16">
          <ErrorState />
        </div>
        <MobileBottomNav />
      </div>
    );
  }
}


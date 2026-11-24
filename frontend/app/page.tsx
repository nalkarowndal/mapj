import React from "react";
import { SiteShell } from "@/components/layout/SiteShell";
import { HeroSection } from "@/components/home/HeroSection";
import { RegionShowcase } from "@/components/home/RegionShowcase";
import { EditorPicks } from "@/components/home/EditorPicks";
import { ThemeEditorialGrid } from "@/components/home/ThemeEditorialGrid";
import { ConciergeBanner } from "@/components/home/ConciergeBanner";
import { ErrorState } from "@/components/ui/StateViews";
import {
  getCollections,
  getRegions,
  getRestaurants,
} from "@/lib/api/client";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  try {
    const [regions, editorRes, collections] = await Promise.all([
      getRegions(),
      getRestaurants({ editor_pick: true, page_size: 6 }),
      getCollections(),
    ]);

    return (
      <SiteShell>
        <HeroSection />
        <RegionShowcase regions={regions} />
        <EditorPicks restaurants={editorRes.items} />
        <ThemeEditorialGrid collections={collections} />
        <ConciergeBanner />
      </SiteShell>
    );
  } catch {
    return (
      <SiteShell>
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <ErrorState
            title="맛집 데이터를 불러오지 못했습니다"
            description="서버 연결 상태를 확인한 뒤 페이지를 새로고침해 주세요."
          />
        </div>
      </SiteShell>
    );
  }
}

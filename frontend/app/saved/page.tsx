import React from "react";
import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { SavedRestaurantsClient } from "@/components/restaurants/SavedRestaurantsClient";
import { ErrorState } from "@/components/ui/StateViews";
import { getRegions, getRestaurants } from "@/lib/api/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "저장한 맛집",
  robots: { index: false, follow: false },
};

export default async function SavedPage() {
  try {
    const [regions, res] = await Promise.all([
      getRegions(),
      getRestaurants({ page_size: 50 }),
    ]);

    return (
      <SiteShell>
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
          <div className="space-y-3">
            <Breadcrumb
              items={[{ label: "홈", href: "/" }, { label: "저장한 맛집" }]}
            />
            <h1 className="font-editorial text-[30px] sm:text-[38px] font-bold text-[var(--text-primary)]">
              저장한 맛집
            </h1>
            <p className="text-[15px] text-[var(--text-secondary)]">
              현재 브라우저에 안전하게 보관된 나만의 서울 동북권 맛집 리스트입니다.
            </p>
          </div>

          <SavedRestaurantsClient
            allRestaurants={res.items}
            regions={regions}
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


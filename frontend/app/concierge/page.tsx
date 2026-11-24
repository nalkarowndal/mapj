import React from "react";
import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ConciergeClient } from "@/components/concierge/ConciergeClient";
import { ErrorState } from "@/components/ui/StateViews";
import { getRegions } from "@/lib/api/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI 맛집 추천",
  description:
    "예산, 지역, 방문 목적을 말씀해 주시면 동북미식의 검증된 실존 맛집 데이터만을 바탕으로 AI가 맞춤 식당을 추천해 드립니다.",
};

export default async function ConciergePage() {
  try {
    const regions = await getRegions();

    return (
      <SiteShell>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
          <div className="space-y-3">
            <Breadcrumb
              items={[{ label: "홈", href: "/" }, { label: "AI 맛집 추천" }]}
            />
            <p className="text-[13px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-accent-text)]">
              AI GOURMET CONCIERGE
            </p>
            <h1 className="font-editorial text-[30px] sm:text-[40px] font-bold text-[var(--text-primary)] leading-tight">
              오늘의 식탁을 물어보세요.
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              동북미식에 등록된 실존 맛집 데이터베이스를 먼저 조회한 뒤, 조건에 맞는
              식당과 추천 이유를 투명하게 구분해 안내합니다.
            </p>
          </div>

          <ConciergeClient regions={regions} />
        </div>
      </SiteShell>
    );
  } catch {
    return (
      <SiteShell>
        <div className="max-w-4xl mx-auto px-4 py-16">
          <ErrorState />
        </div>
      </SiteShell>
    );
  }
}


import React from "react";
import type { Metadata } from "next";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { FeedbackFormClient } from "@/components/restaurants/FeedbackFormClient";

export const metadata: Metadata = {
  title: "정보 수정 제보",
  description:
    "동북미식에 등록된 맛집의 영업시간 변경, 폐업, 주소 오류를 제보하거나 새로운 동북권 로컬 맛집을 추천해 주세요.",
};

interface FeedbackPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FeedbackPage({
  searchParams,
}: FeedbackPageProps) {
  const sp = await searchParams;
  const rid = typeof sp.restaurant === "string" ? sp.restaurant : "";
  const rname = typeof sp.name === "string" ? sp.name : "";

  return (
    <SiteShell>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
        <div className="space-y-3">
          <Breadcrumb
            items={[{ label: "홈", href: "/" }, { label: "정보 수정 제보" }]}
          />
          <h1 className="font-editorial text-[30px] sm:text-[38px] font-bold text-[var(--text-primary)]">
            정보 수정 제보
          </h1>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
            현장과 다른 영업시간, 폐업·휴업 소식, 주소 오류를 알려주시면 검수 후 빠르게 업데이트합니다.
          </p>
        </div>

        <FeedbackFormClient
          initialRestaurantId={rid}
          initialRestaurantName={rname}
        />
      </div>
    </SiteShell>
  );
}


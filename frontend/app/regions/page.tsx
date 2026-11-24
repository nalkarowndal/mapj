import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ErrorState } from "@/components/ui/StateViews";
import { getRegions } from "@/lib/api/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "지역별 맛집",
  description:
    "서울 동북권 다섯 자치구(노원구, 도봉구, 강북구, 중랑구, 성북구)의 상권과 고유한 미식 문화를 소개합니다.",
};

export default async function RegionsIndexPage() {
  try {
    const regions = await getRegions();

    return (
      <SiteShell>
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
          <div className="space-y-4 border-b border-[var(--border-default)] pb-8">
            <Breadcrumb
              items={[{ label: "홈", href: "/" }, { label: "지역별 맛집" }]}
            />
            <p className="text-[13px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-accent-text)]">
              FIVE DISTRICTS OF NORTHEAST SEOUL
            </p>
            <h1 className="font-editorial text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)] leading-tight">
              다섯 개의 동네, 수많은 맛의 이야기.
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              철길 옆 숲길 카페가 모인 노원부터 도봉산 자락의 3대 노포, 북한산 4.19 카페거리,
              주민 단골이 탄탄한 중랑, 한옥 고택과 제과 명장이 살아 있는 성북까지 자치구별 미식 가이드를 만나보세요.
            </p>
          </div>

          <div className="space-y-10">
            {regions.map((region, idx) => (
              <article
                key={region.slug}
                className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center pb-10 border-b last:border-b-0 border-[var(--border-default)]"
              >
                <div
                  className={`lg:col-span-6 ${
                    idx % 2 === 1 ? "lg:order-2" : ""
                  }`}
                >
                  <Link
                    href={`/regions/${region.slug}`}
                    className="group block relative aspect-[4/3] w-full rounded-[16px] overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-default)]"
                  >
                    <Image
                      src={region.hero_image_url}
                      alt={`${region.name} 대표 에디토리얼 이미지`}
                      fill
                      priority={idx === 0}
                      sizes="(max-width: 1024px) 100vw, 50vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </Link>
                </div>

                <div
                  className={`lg:col-span-6 space-y-4 ${
                    idx % 2 === 1 ? "lg:order-1" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 text-[13px]">
                    <span className="font-semibold tracking-[0.14em] uppercase text-[var(--brand-accent-text)]">
                      0{idx + 1} · {region.english_name}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      등록 맛집 {region.restaurant_count}곳
                    </span>
                  </div>

                  <h2 className="font-editorial text-[28px] sm:text-[34px] font-bold text-[var(--text-primary)]">
                    <Link
                      href={`/regions/${region.slug}`}
                      className="hover:text-[var(--brand-primary)] transition-colors"
                    >
                      {region.name}
                    </Link>
                  </h2>

                  <p className="font-editorial text-[17px] text-[var(--brand-primary)]">
                    {region.tagline}
                  </p>

                  <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
                    {region.description}
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {region.neighborhoods.map((n) => (
                      <Link
                        key={n.slug}
                        href={`/restaurants?region=${region.slug}&neighborhood=${encodeURIComponent(n.name)}`}
                        className="px-3 py-1 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[13px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                      >
                        {n.name}
                      </Link>
                    ))}
                  </div>

                  <div className="pt-2">
                    <Link
                      href={`/regions/${region.slug}`}
                      className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-accent-text)] transition-colors"
                    >
                      <span>{region.name} 미식 가이드 보기</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
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


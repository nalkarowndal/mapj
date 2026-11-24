import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { RegionSummary } from "@/lib/types/gourmet";

interface RegionShowcaseProps {
  regions: RegionSummary[];
}

export const RegionShowcase: React.FC<RegionShowcaseProps> = ({ regions }) => {
  const featuredRegions = regions.slice(0, 2);
  const secondaryRegions = regions.slice(2, 5);

  return (
    <section
      aria-labelledby="regions-heading"
      className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div className="space-y-2">
          <p className="text-[13px] font-semibold tracking-[0.12em] uppercase text-[var(--brand-accent-text)]">
            NEIGHBORHOOD GUIDES
          </p>
          <h2
            id="regions-heading"
            className="font-editorial text-[26px] sm:text-[32px] font-semibold text-[var(--text-primary)]"
          >
            지역별 미식 탐색
          </h2>
          <p className="text-[15px] text-[var(--text-secondary)]">
            각 자치구의 상권과 고유한 식탁 이야기를 따라 동네 맛집을 만나보세요.
          </p>
        </div>

        <Link
          href="/regions"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-accent-text)] transition-colors shrink-0"
        >
          <span>전체 지역 가이드</span>
          <ArrowUpRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Editorial Asymmetric Grid: Top 2 Large + Bottom 3 Balanced */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {featuredRegions.map((region) => (
          <Link
            key={region.slug}
            href={`/regions/${region.slug}`}
            className="group block rounded-[16px] overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors"
          >
            <div className="relative aspect-[16/10] w-full bg-[var(--bg-subtle)] overflow-hidden">
              <Image
                src={region.hero_image_url}
                alt={`${region.name} 미식 대표 이미지`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="p-5 sm:p-6 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-accent-text)]">
                  {region.english_name}
                </span>
                <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                  등록 맛집 {region.restaurant_count}곳
                </span>
              </div>
              <h3 className="font-editorial text-[22px] sm:text-[24px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] flex items-center justify-between">
                <span>{region.name}</span>
                <ArrowUpRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--brand-accent-text)] transition-colors" />
              </h3>
              <p className="text-[14px] sm:text-[15px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                {region.summary}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {secondaryRegions.map((region) => (
          <Link
            key={region.slug}
            href={`/regions/${region.slug}`}
            className="group block rounded-[14px] overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--border-strong)] transition-colors"
          >
            <div className="relative aspect-[4/3] w-full bg-[var(--bg-subtle)] overflow-hidden">
              <Image
                src={region.hero_image_url}
                alt={`${region.name} 미식 대표 이미지`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="p-5 space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <span className="font-semibold tracking-[0.12em] uppercase text-[var(--brand-accent-text)]">
                  {region.english_name}
                </span>
                <span className="text-[var(--text-secondary)]">
                  등록 맛집 {region.restaurant_count}곳
                </span>
              </div>
              <h3 className="font-editorial text-[20px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] flex items-center justify-between">
                <span>{region.name}</span>
                <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-accent-text)]" />
              </h3>
              <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                {region.summary}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};


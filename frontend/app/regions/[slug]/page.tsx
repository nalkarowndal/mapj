import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight, Compass } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { RegionRestaurantsClient } from "@/components/regions/RegionRestaurantsClient";
import { RegionalMapToggle } from "@/components/regions/RegionalMapToggle";
import { ImageSlider } from "@/components/ui/ImageSlider";
import { getRegionDetail } from "@/lib/api/client";

export const dynamic = "force-dynamic";

interface RegionPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: RegionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getRegionDetail(slug);
  if (!data) {
    return { title: "지역을 찾을 수 없습니다" };
  }
  return {
    title: `${data.region.name} 맛집 가이드`,
    description: `${data.region.tagline} — ${data.region.summary}`,
    openGraph: {
      title: `${data.region.name} 미식 가이드 | 동북미식`,
      description: data.region.summary,
      images: [data.region.hero_image_url],
    },
  };
}

export default async function RegionDetailPage({ params }: RegionPageProps) {
  const { slug } = await params;
  const data = await getRegionDetail(slug);

  if (!data) {
    notFound();
  }

  const {
    region,
    editor_picks,
    categories,
    recommended_collections,
    restaurants,
    other_regions,
  } = data;

  return (
    <SiteShell>
      {/* 1. 지역 대표 이미지 및 고유 미식 스토리 */}
      <section className="w-full border-b border-[var(--border-default)] bg-[var(--bg-main)]">
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
          <Breadcrumb
            items={[
              { label: "홈", href: "/" },
              { label: "지역별 맛집", href: "/regions" },
              { label: region.name },
            ]}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-3 text-[13px]">
                <span className="font-semibold tracking-[0.14em] uppercase text-[var(--brand-accent-text)]">
                  {region.english_name} TABLE GUIDE
                </span>
                <span className="text-[var(--text-muted)]">
                  등록 맛집 {region.restaurant_count}곳
                </span>
              </div>

              <h1 className="font-editorial text-[34px] sm:text-[44px] font-bold text-[var(--text-primary)] leading-tight">
                {region.name}
              </h1>

              <p className="font-editorial text-[19px] sm:text-[21px] text-[var(--brand-primary)] leading-snug">
                {region.tagline}
              </p>

              <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] leading-relaxed">
                {region.description}
              </p>

              <blockquote className="pt-3 pl-4 border-l-2 border-[var(--brand-accent)] text-[14px] sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
                {region.editorial_story}
              </blockquote>
            </div>

            <div className="lg:col-span-6">
              <ImageSlider
                slides={
                  region.gallery_images && region.gallery_images.length > 0
                    ? region.gallery_images.map((g) => ({
                        url: g.url,
                        alt: g.alt || `${region.name} 실제 동네 풍경`,
                        credit: g.credit,
                      }))
                    : [
                        {
                          url: region.hero_image_url,
                          alt: `${region.name} 미식 대표 이미지`,
                          credit: region.hero_image_credit,
                        },
                      ]
                }
                aspectClassName="aspect-[4/3]"
                roundedClassName="rounded-[16px] border border-[var(--border-default)]"
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority
                showCounter
                showThumbnails
                showCaption
              />
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-16">
        {/* 2. 지역별 주요 상권 */}
        <section aria-labelledby="neighborhoods-heading" className="space-y-6">
          <div className="space-y-1.5">
            <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-[var(--brand-accent-text)]">
              LOCAL DISTRICTS
            </p>
            <h2
              id="neighborhoods-heading"
              className="font-editorial text-[26px] sm:text-[30px] font-semibold text-[var(--text-primary)]"
            >
              {region.name} 주요 상권
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {region.neighborhoods.map((hood) => (
              <Link
                key={hood.slug}
                href={`/restaurants?region=${region.slug}&neighborhood=${encodeURIComponent(hood.name)}`}
                className="group p-5 rounded-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--brand-primary)] transition-colors flex flex-col justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-editorial text-[19px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)]">
                      {hood.name}
                    </h3>
                    <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-accent-text)] shrink-0" />
                  </div>
                  <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                    {hood.summary}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {hood.keywords.map((kw) => (
                    <span
                      key={kw}
                      className="text-[12px] px-2.5 py-0.5 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)]"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* 3, 4, 6. 지역 대표 맛집 + 음식 종류별 탐색 + 전체 등록 맛집 */}
        <RegionRestaurantsClient
          regionName={region.name}
          categories={categories}
          editorPicks={editor_picks}
          restaurants={restaurants}
        />

        {/* 5. 지역별 추천 테마 */}
        {recommended_collections.length > 0 && (
          <section aria-labelledby="region-themes-heading" className="space-y-6">
            <div className="space-y-1.5">
              <p className="text-[12px] font-semibold tracking-[0.12em] uppercase text-[var(--brand-accent-text)]">
                CURATED FOR {region.english_name}
              </p>
              <h2
                id="region-themes-heading"
                className="font-editorial text-[26px] sm:text-[30px] font-semibold text-[var(--text-primary)]"
              >
                {region.name}에서 즐기기 좋은 테마
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {recommended_collections.map((col) => (
                <Link
                  key={col.slug}
                  href={`/collections/${col.slug}`}
                  className="group p-5 sm:p-6 rounded-[14px] bg-[var(--bg-subtle)]/70 hover:bg-[var(--bg-subtle)] border border-[var(--border-default)] transition-colors flex items-start justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <span className="text-[12px] font-medium text-[var(--brand-accent-text)]">
                      {region.name} 수록 매장 {col.restaurant_count}곳
                    </span>
                    <h3 className="font-editorial text-[20px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)]">
                      {col.title}
                    </h3>
                    <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                      {col.subtitle}
                    </p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--brand-accent-text)] shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* 7. 선택적으로 펼칠 수 있는 지도 */}
        <RegionalMapToggle
          regionName={region.name}
          regionSlug={region.slug}
          centerLat={region.center_lat}
          centerLng={region.center_lng}
          restaurants={restaurants}
        />

        {/* 8. 다른 지역 탐색 */}
        <section
          aria-labelledby="other-regions-heading"
          className="pt-8 border-t border-[var(--border-default)] space-y-6"
        >
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-[var(--brand-primary)]" />
            <h2
              id="other-regions-heading"
              className="font-editorial text-[24px] font-semibold text-[var(--text-primary)]"
            >
              다른 동북권 지역 둘러보기
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {other_regions.map((other) => (
              <Link
                key={other.slug}
                href={`/regions/${other.slug}`}
                className="group p-4 rounded-[12px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--brand-primary)] transition-colors space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-editorial text-[18px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)]">
                    {other.name}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-accent-text)]" />
                </div>
                <p className="text-[12px] text-[var(--text-secondary)]">
                  등록 맛집 {other.restaurant_count}곳
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </SiteShell>
  );
}


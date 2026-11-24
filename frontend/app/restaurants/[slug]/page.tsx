import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { RestaurantDetailClient } from "@/components/restaurants/RestaurantDetailClient";
import { getRestaurantDetail } from "@/lib/api/client";

export const dynamic = "force-dynamic";

interface RestaurantDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: RestaurantDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const restaurant = await getRestaurantDetail(slug);
  if (!restaurant) {
    return { title: "맛집을 찾을 수 없습니다" };
  }
  return {
    title: `${restaurant.name} · ${restaurant.region_name} ${restaurant.primary_category}`,
    description: `${restaurant.one_line_intro} (${restaurant.road_address})`,
    openGraph: {
      title: `${restaurant.name} | 동북미식`,
      description: restaurant.one_line_intro,
    },
  };
}

export default async function RestaurantDetailPage({
  params,
}: RestaurantDetailPageProps) {
  const { slug } = await params;
  const restaurant = await getRestaurantDetail(slug);

  if (!restaurant) {
    notFound();
  }

  // Schema.org Restaurant JSON-LD (22절: 확인되지 않은 평점 aggregateRating 절대 미포함)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: restaurant.name,
    description: restaurant.one_line_intro,
    servesCuisine: restaurant.primary_category,
    priceRange: restaurant.price_range_label || undefined,
    telephone: restaurant.phone || undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: restaurant.road_address,
      addressLocality: restaurant.region_name,
      addressRegion: "서울특별시",
      addressCountry: "KR",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: restaurant.lat,
      longitude: restaurant.lng,
    },
  };

  return (
    <SiteShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-6">
        <Breadcrumb
          items={[
            { label: "홈", href: "/" },
            {
              label: restaurant.region_name,
              href: `/regions/${restaurant.region_slug}`,
            },
            { label: restaurant.name },
          ]}
        />

        <RestaurantDetailClient restaurant={restaurant} />
      </div>
    </SiteShell>
  );
}


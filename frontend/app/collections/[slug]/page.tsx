import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { CollectionRestaurantGrid } from "@/components/collections/CollectionRestaurantGrid";
import { getCollectionDetail } from "@/lib/api/client";

export const dynamic = "force-dynamic";

interface CollectionDetailPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: CollectionDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const col = await getCollectionDetail(slug);
  if (!col) return { title: "테마를 찾을 수 없습니다" };
  return {
    title: col.title,
    description: col.description,
  };
}

export default async function CollectionDetailPage({
  params,
}: CollectionDetailPageProps) {
  const { slug } = await params;
  const col = await getCollectionDetail(slug);

  if (!col) {
    notFound();
  }

  return (
    <SiteShell>
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        <Breadcrumb
          items={[
            { label: "홈", href: "/" },
            { label: "미식 테마", href: "/collections" },
            { label: col.title },
          ]}
        />

        <header className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pb-10 border-b border-[var(--border-default)]">
          <div
            className={`space-y-4 ${
              col.hero_image_url ? "lg:col-span-7" : "lg:col-span-10"
            }`}
          >
            <p className="text-[13px] font-semibold tracking-[0.12em] uppercase text-[var(--brand-accent-text)]">
              CURATED COLLECTION · {col.restaurant_count}곳 수록
            </p>
            <h1 className="font-editorial text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)] leading-tight">
              {col.title}
            </h1>
            <p className="font-editorial text-[18px] text-[var(--brand-primary)]">
              {col.subtitle}
            </p>
            <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] leading-relaxed max-w-2xl">
              {col.description}
            </p>
          </div>

          {col.hero_image_url && (
            <div className="lg:col-span-5">
              <div className="relative aspect-[4/3] w-full rounded-[16px] overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-default)]">
                <Image
                  src={col.hero_image_url}
                  alt={col.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
              </div>
            </div>
          )}
        </header>

        <section aria-label="수록 맛집 목록" className="space-y-6">
          <CollectionRestaurantGrid restaurants={col.restaurants} />
        </section>

        <div className="pt-6 border-t border-[var(--border-default)]">
          <Link
            href="/collections"
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-accent-text)]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>전체 미식 테마 목록으로 돌아가기</span>
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}


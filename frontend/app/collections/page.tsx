import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { ErrorState } from "@/components/ui/StateViews";
import { getCollections } from "@/lib/api/client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "테마별 미식 큐레이션",
  description:
    "오랜 노포, 혼자서도 편안한 식사, 카페거리 산책, 가족 외식 등 10가지 주제로 엄선한 서울 동북권 미식 큐레이션.",
};

export default async function CollectionsPage() {
  try {
    const collections = await getCollections();
    const featured = collections.filter((c) => c.is_featured && c.hero_image_url);
    const others = collections.filter((c) => !c.is_featured || !c.hero_image_url);

    return (
      <SiteShell>
        <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12">
          <div className="space-y-4 border-b border-[var(--border-default)] pb-8">
            <Breadcrumb
              items={[
                { label: "홈", href: "/" },
                { label: "테마별 미식 큐레이션" },
              ]}
            />
            <p className="text-[13px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-accent-text)]">
              CURATED COLLECTIONS
            </p>
            <h1 className="font-editorial text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)]">
              테마별 미식 큐레이션
            </h1>
            <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] max-w-2xl leading-relaxed">
              노포, 혼밥, 가족 외식, 등산 후 한 끼, 베이커리 투어까지 오늘의 상황에 어울리는 동북권 식탁을 주제로 묶었습니다.
            </p>
          </div>

          {/* Top 4 Editorial Visual Stories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {featured.map((col) => (
              <Link
                key={col.slug}
                href={`/collections/${col.slug}`}
                className="group block space-y-3.5"
              >
                <div className="relative aspect-[4/3] w-full rounded-[16px] overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-default)]">
                  <Image
                    src={col.hero_image_url!}
                    alt={col.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <div className="space-y-1.5">
                  <span className="text-[12px] font-semibold text-[var(--brand-accent-text)]">
                    수록 맛집 {col.restaurant_count}곳
                  </span>
                  <h2 className="font-editorial text-[22px] sm:text-[26px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] flex items-center justify-between gap-2">
                    <span>{col.title}</span>
                    <ArrowUpRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--brand-accent-text)] shrink-0" />
                  </h2>
                  <p className="text-[14px] sm:text-[15px] text-[var(--text-secondary)] leading-relaxed">
                    {col.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {/* Remaining 6 Thematic Guides */}
          <section className="pt-8 border-t border-[var(--border-default)] space-y-6">
            <h2 className="font-editorial text-[24px] font-semibold text-[var(--text-primary)]">
              더 많은 미식 주제
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {others.map((col) => (
                <Link
                  key={col.slug}
                  href={`/collections/${col.slug}`}
                  className="group p-6 rounded-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--brand-primary)] transition-colors flex items-start justify-between gap-4"
                >
                  <div className="space-y-2">
                    <span className="text-[12px] font-medium text-[var(--brand-accent-text)]">
                      수록 맛집 {col.restaurant_count}곳
                    </span>
                    <h3 className="font-editorial text-[20px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)]">
                      {col.title}
                    </h3>
                    <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                      {col.description}
                    </p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--brand-accent-text)] shrink-0 mt-1" />
                </Link>
              ))}
            </div>
          </section>
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


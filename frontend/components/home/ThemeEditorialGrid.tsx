import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { CollectionItem } from "@/lib/types/gourmet";

interface ThemeEditorialGridProps {
  collections: CollectionItem[];
}

export const ThemeEditorialGrid: React.FC<ThemeEditorialGridProps> = ({
  collections,
}) => {
  const featured = collections.filter((c) => c.is_featured && c.hero_image_url);
  const indexItems = collections.filter((c) => !c.is_featured);
  const lead = featured[0];
  const secondary = featured.slice(1, 4);

  return (
    <section
      aria-labelledby="themes-heading"
      className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 sm:mb-10">
        <div className="space-y-2">
          <p className="text-[13px] font-semibold tracking-[0.12em] uppercase text-[var(--brand-accent-text)]">
            CURATED STORIES
          </p>
          <h2
            id="themes-heading"
            className="font-editorial text-[26px] sm:text-[32px] font-semibold text-[var(--text-primary)]"
          >
            테마별 미식 큐레이션
          </h2>
          <p className="text-[15px] text-[var(--text-secondary)]">
            함께하는 사람과 오늘의 분위기에 따라 동북권의 식탁을 골라보세요.
          </p>
        </div>

        <Link
          href="/collections"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-accent-text)] transition-colors shrink-0"
        >
          <span>모든 테마 보기</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Editorial Feature Story + Stacked Story List (Non-repetitive rhythm) */}
      {lead && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 border-b border-[var(--border-default)]">
          {/* Lead Feature */}
          <Link
            href={`/collections/${lead.slug}`}
            className="lg:col-span-7 group block space-y-4"
          >
            <div className="relative aspect-[4/3] w-full rounded-[16px] overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-default)]">
              <Image
                src={lead.hero_image_url!}
                alt={lead.title}
                fill
                sizes="(max-width: 1024px) 100vw, 58vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </div>
            <div className="space-y-2">
              <span className="text-[13px] font-medium text-[var(--brand-accent-text)]">
                특집 큐레이션 · {lead.restaurant_count}곳
              </span>
              <h3 className="font-editorial text-[24px] sm:text-[28px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)]">
                {lead.title}
              </h3>
              <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
                {lead.description}
              </p>
            </div>
          </Link>

          {/* Right Vertical Editorial Stack */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-6">
            {secondary.map((col) => (
              <Link
                key={col.slug}
                href={`/collections/${col.slug}`}
                className="group grid grid-cols-12 gap-4 items-center pb-6 last:pb-0 border-b last:border-b-0 border-[var(--border-default)]"
              >
                <div className="col-span-5 relative aspect-[4/3] rounded-[12px] overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-default)]">
                  <Image
                    src={col.hero_image_url!}
                    alt={col.title}
                    fill
                    sizes="(max-width: 1024px) 40vw, 18vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
                  />
                </div>
                <div className="col-span-7 space-y-1.5 min-w-0">
                  <span className="text-[12px] font-medium text-[var(--text-muted)]">
                    수록 맛집 {col.restaurant_count}곳
                  </span>
                  <h3 className="font-editorial text-[18px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-accent-text)] leading-snug">
                    {col.title}
                  </h3>
                  <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                    {col.subtitle}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Magazine Index List for Remaining 6 Themes (No repetitive boxes) */}
      {indexItems.length > 0 && (
        <div className="pt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
          {indexItems.map((col, idx) => (
            <Link
              key={col.slug}
              href={`/collections/${col.slug}`}
              className="group flex items-start justify-between gap-3 py-3.5 border-b border-[var(--border-default)] hover:border-[var(--brand-primary)] transition-colors"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-mono text-[var(--brand-accent-text)]">
                    {String(idx + 5).padStart(2, "0")}
                  </span>
                  <h3 className="font-editorial text-[17px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] truncate">
                    {col.title}
                  </h3>
                </div>
                <p className="text-[13px] text-[var(--text-secondary)] line-clamp-1">
                  {col.subtitle}
                </p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--brand-accent-text)] shrink-0 mt-1" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};


"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Search } from "lucide-react";
import { Button } from "../ui/Button";

const QUICK_SEARCH_TERMS = ["공릉동 국수", "성북동 베이커리", "도봉산 노포", "4.19 카페거리"];

export const HeroSection: React.FC = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/restaurants?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/restaurants");
    }
  };

  return (
    <section className="w-full border-b border-[var(--border-default)] bg-[var(--bg-main)]">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left: Brand Message, Integrated Search & Primary CTA */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-3">
              <p className="text-[13px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-accent-text)]">
                다섯 개의 동네, 수많은 맛의 이야기
              </p>
              <h1 className="font-editorial text-[36px] sm:text-[46px] lg:text-[52px] font-bold leading-[1.18] text-[var(--text-primary)]">
                우리 동네의
                <br />
                맛있는 발견.
              </h1>
              <p className="text-[15px] sm:text-[17px] text-[var(--text-secondary)] leading-relaxed max-w-xl">
                서울 동북권 다섯 지역의 숨겨진 맛과 특별한 식탁을 만나보세요.
              </p>
            </div>

            {/* Integrated Search Form */}
            <form
              onSubmit={handleSearch}
              role="search"
              aria-label="동북권 맛집 통합 검색"
              className="w-full max-w-xl"
            >
              <div className="flex items-center bg-[var(--bg-surface)] border border-[var(--border-strong)] rounded-[12px] p-1.5 focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/15 transition-all shadow-[var(--shadow-subtle)]">
                <Search
                  aria-hidden="true"
                  className="w-5 h-5 text-[var(--text-muted)] ml-3 shrink-0"
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="지역명, 음식명, 매장명으로 검색해 보세요"
                  aria-label="지역명, 음식명, 매장명 검색"
                  className="flex-1 min-w-0 bg-transparent px-3 py-2.5 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:outline-none focus-visible:outline-none"
                />
                <Button type="submit" variant="primary" size="md" className="shrink-0">
                  검색
                </Button>
              </div>
            </form>

            {/* Quick Search Suggestions */}
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="text-[var(--text-muted)] font-medium">추천 검색</span>
              {QUICK_SEARCH_TERMS.map((term) => (
                <Link
                  key={term}
                  href={`/restaurants?q=${encodeURIComponent(term)}`}
                  className="px-3 py-1 rounded-full bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {term}
                </Link>
              ))}
            </div>

            {/* Secondary Regional Navigation CTA */}
            <div className="pt-1 flex flex-wrap items-center gap-4">
              <Link
                href="/regions"
                className="inline-flex items-center gap-2 text-[15px] font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-accent-text)] transition-colors"
              >
                <span>다섯 개 자치구 미식 가이드 보기</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Right: Editorial Food Photography */}
          <div className="lg:col-span-6">
            <figure className="space-y-2">
              <div className="relative aspect-[4/3] w-full rounded-[16px] overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border-default)]">
                <Image
                  src="/images/editorial/hero-table.jpg"
                  alt="따뜻한 아침 햇살 아래 차려진 한국 로컬 식당의 정갈한 한식 상차림"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="text-[12px] text-[var(--text-muted)] text-right">
                동북미식 브랜드 에디토리얼 배너 (AI 생성 · 일반 미식 분위기 연출 이미지)
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
};


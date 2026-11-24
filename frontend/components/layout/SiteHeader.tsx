"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bookmark, Menu, X } from "lucide-react";
import { BrandLogo } from "../ui/BrandLogo";

const NAV_ITEMS = [
  { href: "/regions", label: "지역별 맛집" },
  { href: "/restaurants", label: "맛집 탐색" },
  { href: "/collections", label: "미식 테마" },
  { href: "/map", label: "지도 탐색" },
  { href: "/concierge", label: "AI 추천" },
];

interface SiteHeaderProps {
  savedCount?: number;
}

export const SiteHeader: React.FC<SiteHeaderProps> = ({ savedCount }) => {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", onKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileMenuOpen]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[var(--bg-main)]/95 backdrop-blur-sm border-b border-[var(--border-default)]">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 h-[68px] sm:h-[72px] flex items-center justify-between gap-4">
        <BrandLogo href="/" size="md" />

        {/* Desktop Primary Navigation (No Admin/API settings exposed) */}
        <nav
          aria-label="주요 내비게이션"
          className="hidden md:flex items-center gap-1 lg:gap-2"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`px-3.5 py-2 rounded-[8px] text-[15px] font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "text-[var(--brand-primary)] bg-[var(--brand-primary-soft)] font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions: Saved Link & Mobile Menu Trigger */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/saved"
            aria-label="저장한 맛집 보기"
            aria-current={isActive("/saved") ? "page" : undefined}
            className={`relative inline-flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-[10px] text-[14px] font-medium transition-colors border ${
              isActive("/saved")
                ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                : "bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)] hover:bg-[var(--bg-subtle)]"
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span className="hidden sm:inline">저장</span>
            {typeof savedCount === "number" && savedCount > 0 && (
              <span
                className={`text-[12px] font-semibold ${
                  isActive("/saved") ? "text-white/90" : "text-[var(--brand-accent-text)]"
                }`}
              >
                {savedCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-site-menu"
            aria-label={mobileMenuOpen ? "모바일 메뉴 닫기" : "모바일 메뉴 열기"}
            className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-[10px] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] border border-[var(--border-default)] bg-[var(--bg-surface)] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Accessible Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-site-menu"
          role="dialog"
          aria-modal="true"
          aria-label="모바일 내비게이션 메뉴"
          className="md:hidden fixed inset-x-0 top-[68px] bottom-0 z-50 bg-[var(--bg-main)] border-t border-[var(--border-default)] overflow-y-auto px-5 py-6"
        >
          <nav aria-label="모바일 주요 메뉴" className="flex flex-col gap-1.5">
            <Link
              href="/"
              className={`px-4 py-3.5 rounded-[12px] text-[16px] font-medium ${
                isActive("/")
                  ? "bg-[var(--brand-primary)] text-white"
                  : "text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              홈
            </Link>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`px-4 py-3.5 rounded-[12px] text-[16px] font-medium ${
                    active
                      ? "bg-[var(--brand-primary)] text-white"
                      : "text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/saved"
              className={`px-4 py-3.5 rounded-[12px] text-[16px] font-medium ${
                isActive("/saved")
                  ? "bg-[var(--brand-primary)] text-white"
                  : "text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              저장한 맛집
            </Link>
          </nav>

          <div className="mt-8 pt-6 border-t border-[var(--border-default)] flex flex-col gap-2 text-[14px] text-[var(--text-secondary)]">
            <Link href="/about" className="py-2 hover:text-[var(--text-primary)]">
              서비스 소개
            </Link>
            <Link href="/feedback" className="py-2 hover:text-[var(--text-primary)]">
              정보 수정 제보
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};


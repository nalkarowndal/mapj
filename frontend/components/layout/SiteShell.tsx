"use client";
import React from "react";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { MobileBottomNav } from "./MobileBottomNav";
import { useBookmarks } from "@/features/bookmarks/useBookmarks";

interface SiteShellProps {
  children: React.ReactNode;
}

export const SiteShell: React.FC<SiteShellProps> = ({ children }) => {
  const { savedCount } = useBookmarks();

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-main)] text-[var(--text-primary)]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-[8px] focus:bg-[var(--brand-primary)] focus:text-white"
      >
        본문 바로가기
      </a>
      <SiteHeader savedCount={savedCount} />
      <main id="main-content" className="flex-1 w-full">
        {children}
      </main>
      <SiteFooter />
      <MobileBottomNav />
    </div>
  );
};


"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, MapPin, Sparkles, Bookmark } from "lucide-react";

const MOBILE_TABS = [
  { href: "/", label: "홈", icon: Home },
  { href: "/restaurants", label: "탐색", icon: Search },
  { href: "/map", label: "지도", icon: MapPin },
  { href: "/concierge", label: "AI 추천", icon: Sparkles },
  { href: "/saved", label: "저장", icon: Bookmark },
];

export const MobileBottomNav: React.FC = () => {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <nav
      aria-label="모바일 하단 내비게이션"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[var(--bg-surface)]/95 backdrop-blur-sm border-t border-[var(--border-default)] pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-5 h-[62px]">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
                active
                  ? "text-[var(--brand-primary)] font-semibold"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  active ? "text-[var(--brand-accent-text)]" : ""
                }`}
                strokeWidth={active ? 2.2 : 1.8}
              />
              <span className="leading-none">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};


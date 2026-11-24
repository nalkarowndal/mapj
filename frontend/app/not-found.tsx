import React from "react";
import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";

export default function NotFound() {
  return (
    <SiteShell>
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-5">
        <p className="text-[13px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-accent-text)]">
          404 · PAGE NOT FOUND
        </p>
        <h1 className="font-editorial text-[32px] sm:text-[38px] font-bold text-[var(--text-primary)]">
          요청하신 페이지를 찾을 수 없습니다.
        </h1>
        <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
          주소가 변경되었거나 존재하지 않는 지역·맛집 페이지입니다. 동북미식 홈에서 다섯 지역의 맛집을 다시 탐색해 보세요.
        </p>
        <div className="pt-2 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="px-5 py-2.5 rounded-[10px] bg-[var(--brand-primary)] text-white text-[15px] font-medium"
          >
            홈으로 돌아가기
          </Link>
          <Link
            href="/regions"
            className="px-5 py-2.5 rounded-[10px] bg-[var(--bg-subtle)] text-[var(--text-primary)] text-[15px] font-medium border border-[var(--border-default)]"
          >
            지역별 맛집 보기
          </Link>
        </div>
      </div>
    </SiteShell>
  );
}


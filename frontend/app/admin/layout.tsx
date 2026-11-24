import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "관리자 콘솔 — 동북미식 (DONGBUK TABLE)",
  description: "동북미식 내부 데이터 검수 및 운영 관리 시스템",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F5F4F0] text-[var(--text-primary)]">
      {children}
    </div>
  );
}


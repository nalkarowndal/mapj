import React from "react";
import Link from "next/link";
import { ArrowRight, MapPin, Sparkles } from "lucide-react";

export const ConciergeBanner: React.FC = () => {
  return (
    <section
      aria-labelledby="concierge-cta-heading"
      className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12"
    >
      <div className="rounded-[18px] bg-[var(--brand-primary)] text-white px-6 py-10 sm:px-10 sm:py-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#E6E0D6]">
            <Sparkles className="w-4 h-4 text-[#E7A384]" />
            <span>동북미식 AI 추천 컨시어지</span>
          </div>
          <h2
            id="concierge-cta-heading"
            className="font-editorial text-[26px] sm:text-[32px] font-semibold leading-snug"
          >
            어디로 갈지 고민될 때, 오늘의 식탁을 물어보세요.
          </h2>
          <p className="text-[15px] text-white/80 leading-relaxed">
            예산, 방문 목적, 동네를 말씀해 주시면 동북미식에 등록된 실존 맛집 데이터만을
            바탕으로 가장 알맞은 식당과 추천 이유를 정리해 드립니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            href="/concierge"
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[48px] rounded-[10px] bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-white text-[15px] font-semibold transition-colors"
          >
            <span>AI 추천 시작하기</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/map"
            className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[48px] rounded-[10px] bg-white/10 hover:bg-white/18 text-white border border-white/20 text-[15px] font-medium transition-colors"
          >
            <MapPin className="w-4 h-4" />
            <span>지도에서 탐색</span>
          </Link>
        </div>
      </div>
    </section>
  );
};


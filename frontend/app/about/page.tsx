import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteShell } from "@/components/layout/SiteShell";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

export const metadata: Metadata = {
  title: "서비스 소개",
  description:
    "동북미식(DONGBUK TABLE)의 지역 특화 편집 기준, 데이터 검증 원칙, 이미지 및 정보 출처 안내.",
};

export default function AboutPage() {
  return (
    <SiteShell>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
        <div className="space-y-4 border-b border-[var(--border-default)] pb-8">
          <Breadcrumb
            items={[{ label: "홈", href: "/" }, { label: "서비스 소개" }]}
          />
          <p className="text-[13px] font-semibold tracking-[0.14em] uppercase text-[var(--brand-accent-text)]">
            ABOUT DONGBUK TABLE
          </p>
          <h1 className="font-editorial text-[32px] sm:text-[42px] font-bold text-[var(--text-primary)] leading-tight">
            다섯 개의 동네,
            <br />
            수많은 맛의 이야기.
          </h1>
          <p className="text-[16px] text-[var(--text-secondary)] leading-relaxed">
            동북미식(DONGBUK TABLE)은 서울 동북권 다섯 자치구(노원구·도봉구·강북구·중랑구·성북구)의
            실존하는 로컬 식당과 상권의 미식 문화를 정직하고 쾌적한 시선으로 소개하는 지역 특화 맛집 큐레이션 플랫폼입니다.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="font-editorial text-[24px] font-semibold text-[var(--text-primary)]">
            동북미식의 편집 및 검증 기준
          </h2>
          <ul className="list-disc pl-5 space-y-2 text-[15px] text-[var(--text-secondary)] leading-relaxed">
            <li>실존 여부, 자치구 소재지, 도로명·지번 주소, 좌표를 교차 확인한 매장만 공개합니다.</li>
            <li>확인되지 않은 평점, 임의의 인기 순위, 근거 없는 리뷰 수는 노출하지 않습니다.</li>
            <li>영업시간이나 편의시설이 미확인인 경우 추측하지 않고 &lsquo;확인 필요&rsquo;로 투명하게 안내합니다.</li>
            <li>AI 추천 기능 역시 등록된 실존 매장 데이터만을 기반으로 추천 이유를 제공합니다.</li>
          </ul>
        </section>

        <section id="sources" className="space-y-3 pt-6 border-t border-[var(--border-default)]">
          <h2 className="font-editorial text-[24px] font-semibold text-[var(--text-primary)]">
            이미지 및 정보 출처 안내
          </h2>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
            매장 위치 및 기본 정보는 카카오 로컬 공식 정보와 지역 공개 자료를 바탕으로 교차 검증하며,
            모든 상세 페이지에 최종 확인 날짜와 출처를 표시합니다. 홈페이지 배너와 지역·테마 소개에 사용된
            에디토리얼 이미지는 일반 분위기 연출용으로 제작된 AI 이미지이며, 실제 특정 매장의 사진이 아님을 명확히 구분합니다.
            실제 사진 사용 권한이 확인되지 않은 개별 매장에는 공통 플레이스홀더를 표시합니다.
          </p>
        </section>

        <section id="privacy" className="space-y-3 pt-6 border-t border-[var(--border-default)]">
          <h2 className="font-editorial text-[24px] font-semibold text-[var(--text-primary)]">
            개인정보처리방침
          </h2>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
            일반 사용자의 맛집 저장 목록은 별도 회원가입 없이 사용자 브라우저의 Local Storage에만 저장되며 서버로 전송되지 않습니다.
            정보 수정 제보 시 선택 입력한 연락처는 제보 내용 확인 목적 외에는 사용하지 않으며 검수 완료 후 안전하게 파기합니다.
          </p>
        </section>

        <section id="terms" className="space-y-3 pt-6 border-t border-[var(--border-default)]">
          <h2 className="font-editorial text-[24px] font-semibold text-[var(--text-primary)]">
            이용약관
          </h2>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed">
            본 서비스가 제공하는 영업시간, 가격대, 주차 정보는 매장 현장 사정에 따라 수시로 변동될 수 있으므로
            방문 전 매장에 직접 확인하시기를 권장합니다. 변경 사항이나 폐업 정보를 발견하신 경우{" "}
            <Link
              href="/feedback"
              className="text-[var(--brand-primary)] font-medium underline underline-offset-4"
            >
              정보 수정 제보
            </Link>{" "}
            페이지를 통해 알려주시면 신속히 반영하겠습니다.
          </p>
        </section>
      </div>
    </SiteShell>
  );
}


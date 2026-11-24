import React from "react";
import Link from "next/link";
import { BrandLogo } from "../ui/BrandLogo";

export const SiteFooter: React.FC = () => {
  return (
    <footer className="w-full bg-[var(--bg-subtle)] border-t border-[var(--border-default)] mt-16 pb-20 md:pb-0">
      <div className="max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-10 border-b border-[var(--border-default)]">
          {/* Brand Column */}
          <div className="md:col-span-5 space-y-3">
            <BrandLogo href="/" size="md" />
            <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed max-w-sm">
              다섯 개의 동네, 수많은 맛의 이야기. 서울 동북권(노원·도봉·강북·중랑·성북)의
              실존하는 로컬 식당과 상권의 미식 문화를 정직한 기준으로 소개합니다.
            </p>
          </div>

          {/* Regions Links */}
          <div className="md:col-span-3 space-y-3">
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
              지역별 맛집
            </h2>
            <ul className="space-y-2 text-[14px] text-[var(--text-secondary)]">
              <li>
                <Link href="/regions/nowon" className="hover:text-[var(--brand-primary)]">
                  노원구 미식 가이드
                </Link>
              </li>
              <li>
                <Link href="/regions/dobong" className="hover:text-[var(--brand-primary)]">
                  도봉구 미식 가이드
                </Link>
              </li>
              <li>
                <Link href="/regions/gangbuk" className="hover:text-[var(--brand-primary)]">
                  강북구 미식 가이드
                </Link>
              </li>
              <li>
                <Link href="/regions/jungnang" className="hover:text-[var(--brand-primary)]">
                  중랑구 미식 가이드
                </Link>
              </li>
              <li>
                <Link href="/regions/seongbuk" className="hover:text-[var(--brand-primary)]">
                  성북구 미식 가이드
                </Link>
              </li>
            </ul>
          </div>

          {/* Service & Policy Links */}
          <div className="md:col-span-4 space-y-3">
            <h2 className="text-[14px] font-semibold text-[var(--text-primary)]">
              서비스 안내 및 정책
            </h2>
            <ul className="space-y-2 text-[14px] text-[var(--text-secondary)]">
              <li>
                <Link href="/about" className="hover:text-[var(--brand-primary)]">
                  서비스 소개 및 편집 기준
                </Link>
              </li>
              <li>
                <Link href="/feedback" className="hover:text-[var(--brand-primary)]">
                  정보 수정 및 폐업 제보
                </Link>
              </li>
              <li>
                <Link href="/about#privacy" className="hover:text-[var(--brand-primary)]">
                  개인정보처리방침
                </Link>
              </li>
              <li>
                <Link href="/about#terms" className="hover:text-[var(--brand-primary)]">
                  이용약관
                </Link>
              </li>
              <li>
                <Link href="/about#sources" className="hover:text-[var(--brand-primary)]">
                  이미지 및 정보 출처 안내
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[13px] text-[var(--text-muted)]">
          <p>
            © {new Date().getFullYear()} 동북미식 (DONGBUK TABLE). All rights reserved.
          </p>
          <p>
            매장 영업정보는 현장 사정에 따라 변경될 수 있으며, 확인 날짜와 출처를 투명하게 표기합니다.
          </p>
        </div>
      </div>
    </footer>
  );
};


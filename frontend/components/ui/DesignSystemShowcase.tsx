"use client";
import React, { useState } from "react";
import Image from "next/image";
import { Search, SlidersHorizontal, MapPin, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { FilterChip } from "@/components/ui/FilterChip";
import { Modal } from "@/components/ui/Modal";
import {
  EmptyState,
  ErrorState,
  RestaurantCardSkeleton,
} from "@/components/ui/StateViews";
import {
  RestaurantCard,
  RestaurantCardData,
} from "@/components/restaurants/RestaurantCard";

const SAMPLE_CARDS: RestaurantCardData[] = [
  {
    id: "nw-01",
    slug: "teolbo-godeuni-nowon",
    name: "털보고된이 본점",
    regionName: "노원구",
    neighborhood: "노원역 문화의거리",
    category: "한식",
    oneLineIntro:
      "겉은 바삭하고 속은 촉촉한 화덕 생선구이와 구수한 청국장이 어우러지는 노원역 골목의 백반 식당입니다.",
    priceRange: "1만~1.5만원",
    imageUrl: null, // 실제 매장 사진 미확보 시 공통 플레이스홀더 표시 원칙 검증
    highlights: ["노원역 인근", "생선구이"],
  },
  {
    id: "db-01",
    slug: "musuok-dobong",
    name: "무수옥",
    regionName: "도봉구",
    neighborhood: "도봉동",
    category: "한식",
    oneLineIntro:
      "오랜 세월 가마솥에서 우려낸 맑은 한우 국물과 육회비빔밥으로 도봉산 자락을 지켜온 전통 노포입니다.",
    priceRange: "1.3만~4.5만원",
    imageUrl: null,
    highlights: ["전통 노포", "전용 주차"],
  },
  {
    id: "sb-03",
    slug: "napoleon-bakery-seongbuk",
    name: "나폴레옹과자점 성북본점",
    regionName: "성북구",
    neighborhood: "한성대입구",
    category: "베이커리",
    oneLineIntro:
      "1968년부터 성북동 초입을 지켜온 클래식 제과점. 사라다빵과 생크림 케이크로 세대를 이어 사랑받습니다.",
    priceRange: "4천~2만원",
    imageUrl: null,
    highlights: ["1968년 개업", "주차 가능"],
  },
];

const COLOR_SWATCHES = [
  { name: "메인 배경", token: "--bg-main", hex: "#F8F5EF" },
  { name: "카드 배경", token: "--bg-surface", hex: "#FFFFFF" },
  { name: "보조 배경", token: "--bg-subtle", hex: "#EFEAE1" },
  { name: "브랜드 컬러", token: "--brand-primary", hex: "#283A30", dark: true },
  { name: "포인트 컬러", token: "--brand-accent", hex: "#B65C37", dark: true },
  { name: "포인트 텍스트(AA)", token: "--brand-accent-text", hex: "#9C4A28", dark: true },
  { name: "기본 텍스트", token: "--text-primary", hex: "#252622", dark: true },
  { name: "보조 텍스트", token: "--text-muted", hex: "#736A61", dark: true },
  { name: "경계선", token: "--border-default", hex: "#E6E0D6" },
];

const EDITORIAL_ASSETS = [
  { src: "/images/editorial/hero-table.jpg", title: "홈 Hero 상차림", label: "AI 에디토리얼 배너" },
  { src: "/images/editorial/region-nowon.jpg", title: "노원구 · 경춘선숲길", label: "지역 테마 이미지" },
  { src: "/images/editorial/region-dobong.jpg", title: "도봉구 · 전통 설렁탕", label: "지역 테마 이미지" },
  { src: "/images/editorial/region-gangbuk.jpg", title: "강북구 · 4.19 카페거리", label: "지역 테마 이미지" },
  { src: "/images/editorial/region-jungnang.jpg", title: "중랑구 · 로컬 쌈밥", label: "지역 테마 이미지" },
  { src: "/images/editorial/region-seongbuk.jpg", title: "성북구 · 한옥 찻집", label: "지역 테마 이미지" },
];

export const DesignSystemShowcase: React.FC = () => {
  const [selectedChip, setSelectedChip] = useState("한식");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  const toggleSave = (id: string) => {
    setSavedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-primary)] flex flex-col">
      <SiteHeader savedCount={savedIds.length} />

      <main className="flex-1 w-full max-w-[var(--container-max)] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16">
        {/* Intro Header */}
        <section className="space-y-4 border-b border-[var(--border-default)] pb-10">
          <Breadcrumb
            items={[
              { label: "홈", href: "/" },
              { label: "동북미식 디자인 시스템 (P1 검수)" },
            ]}
          />
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <p className="text-[13px] font-semibold tracking-[0.12em] uppercase text-[var(--brand-accent-text)]">
                DONGBUK TABLE · DESIGN SYSTEM P1
              </p>
              <h1 className="font-editorial text-[32px] sm:text-[44px] font-bold leading-tight text-[var(--text-primary)]">
                우리 동네의 맛있는 발견.
              </h1>
              <p className="text-[15px] sm:text-[16px] text-[var(--text-secondary)] leading-relaxed">
                다섯 개의 동네, 수많은 맛의 이야기. 기존 다크 대시보드에서 완전히 벗어나
                따뜻한 로컬 미식 매거진의 타이포그래피, 컬러 토큰, 공통 UI 컴포넌트를 검증합니다.
              </p>
            </div>
            <BrandLogo href="" size="lg" />
          </div>
        </section>

        {/* 1. Color Palette */}
        <section className="space-y-6">
          <h2 className="font-editorial text-[26px] sm:text-[30px] font-semibold">
            컬러 토큰 (WCAG 2.2 AA 검증)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {COLOR_SWATCHES.map((sw) => (
              <div
                key={sw.token}
                className="rounded-[12px] overflow-hidden border border-[var(--border-default)] bg-[var(--bg-surface)]"
              >
                <div
                  className="h-20 w-full flex items-end p-3"
                  style={{ backgroundColor: sw.hex }}
                >
                  <span
                    className={`text-[12px] font-mono font-semibold ${
                      sw.dark ? "text-white" : "text-[var(--text-primary)]"
                    }`}
                  >
                    {sw.hex}
                  </span>
                </div>
                <div className="p-3">
                  <div className="text-[14px] font-semibold">{sw.name}</div>
                  <div className="text-[12px] text-[var(--text-muted)] font-mono">
                    {sw.token}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2. Typography & Interactive Controls */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-5">
            <h2 className="font-editorial text-[26px] sm:text-[30px] font-semibold">
              버튼 · 입력창 · 필터 칩
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">지역 맛집 보기</Button>
              <Button variant="accent" leftIcon={<Sparkles className="w-4 h-4" />}>
                AI 추천 시작
              </Button>
              <Button variant="secondary" leftIcon={<SlidersHorizontal className="w-4 h-4" />}>
                상세 필터
              </Button>
              <Button variant="outline" onClick={() => setModalOpen(true)}>
                미리보기 모달
              </Button>
              <Button variant="ghost">초기화</Button>
            </div>

            <div className="space-y-3 pt-2">
              <Input
                label="통합 맛집 검색"
                placeholder="지역명, 음식명, 매장명을 입력해 보세요 (예: 공릉동 국수)"
                leftIcon={<Search className="w-4 h-4" />}
                rightElement={
                  <Button variant="primary" size="sm">
                    검색
                  </Button>
                }
              />
              <div className="flex flex-wrap gap-2 pt-1">
                {["전체", "한식", "고기·구이", "면 요리", "카페", "베이커리"].map(
                  (cat) => (
                    <FilterChip
                      key={cat}
                      selected={selectedChip === cat}
                      onClick={() => setSelectedChip(cat)}
                    >
                      {cat}
                    </FilterChip>
                  )
                )}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <h2 className="font-editorial text-[26px] sm:text-[30px] font-semibold">
              배지 및 상태 가이드
            </h2>
            <div className="flex flex-wrap gap-2">
              <Badge variant="primary">노원구</Badge>
              <Badge variant="accent">에디터 추천</Badge>
              <Badge variant="success" dot>
                영업 중
              </Badge>
              <Badge variant="warning" dot>
                영업시간 확인 필요
              </Badge>
              <Badge variant="default">주차 가능</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <EmptyState
                title="검색 결과가 없습니다"
                description="다른 음식 종류나 자치구로 조건을 넓혀 탐색해 보세요."
                actionLabel="필터 초기화"
                onAction={() => setSelectedChip("전체")}
              />
              <ErrorState onRetry={() => setSelectedChip("한식")} />
            </div>
          </div>
        </section>

        {/* 3. Restaurant Card System (Placeholder rule verified) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <h2 className="font-editorial text-[26px] sm:text-[30px] font-semibold">
                신규 맛집 카드 컴포넌트
              </h2>
              <p className="text-[14px] text-[var(--text-secondary)] mt-1">
                실제 매장 사진 미확보 시 스톡/AI 이미지를 도용하지 않고 공통 플레이스홀더를 표시하며, 미검증 평점을 노출하지 않습니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SAMPLE_CARDS.map((card) => (
              <RestaurantCard
                key={card.id}
                restaurant={card}
                isSaved={savedIds.includes(card.id)}
                onToggleSave={toggleSave}
              />
            ))}
            <RestaurantCardSkeleton />
          </div>
        </section>

        {/* 4. Editorial Brand & Region Image Assets */}
        <section className="space-y-6">
          <div>
            <h2 className="font-editorial text-[26px] sm:text-[30px] font-semibold">
              브랜드 배너 및 지역 에디토리얼 이미지 에셋
            </h2>
            <p className="text-[14px] text-[var(--text-secondary)] mt-1">
              일반 브랜드 배너 및 지역·테마 소개 전용으로 제작된 에디토리얼 이미지이며, 실제 특정 매장의 사진이 아님을 명확히 관리합니다.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {EDITORIAL_ASSETS.map((asset) => (
              <figure
                key={asset.src}
                className="rounded-[14px] overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-default)]"
              >
                <div className="relative aspect-[4/3] w-full bg-[var(--bg-subtle)]">
                  <Image
                    src={asset.src}
                    alt={asset.title}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <figcaption className="p-4 flex items-center justify-between gap-2">
                  <span className="font-editorial font-semibold text-[16px]">
                    {asset.title}
                  </span>
                  <span className="text-[12px] text-[var(--text-muted)] flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {asset.label}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
      <MobileBottomNav />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="접근성 모달 미리보기"
        footer={
          <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>
            확인
          </Button>
        }
      >
        <p className="text-[var(--text-secondary)]">
          동북미식 모달은 지도 빠른 미리보기 등 꼭 필요한 맥락에서만 사용하며, 키보드 포커스 트랩과 Esc 닫기를 지원합니다.
        </p>
      </Modal>
    </div>
  );
};


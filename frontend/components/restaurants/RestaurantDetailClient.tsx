"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Bookmark,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Flag,
  MapPin,
  ParkingCircle,
  Phone,
  UtensilsCrossed,
} from "lucide-react";
import { RestaurantDetail } from "@/lib/types/gourmet";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ImageSlider, SliderImage } from "../ui/ImageSlider";
import { RestaurantCard } from "./RestaurantCard";
import { useBookmarks } from "@/features/bookmarks/useBookmarks";

const FEATURE_LABELS: Record<string, string> = {
  solo_dining: "혼밥 가능",
  date: "데이트 추천",
  family: "가족 외식",
  group: "단체 모임",
  parking: "주차 가능",
  reservation: "예약 가능",
  pet_friendly: "반려동물 동반",
  takeout: "포장 가능",
};

interface RestaurantDetailClientProps {
  restaurant: RestaurantDetail;
}

export const RestaurantDetailClient: React.FC<RestaurantDetailClientProps> = ({
  restaurant,
}) => {
  const { isSaved, toggle, hydrated } = useBookmarks();
  const saved = hydrated ? isSaved(restaurant.id) : false;
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [mapState, setMapState] = useState<"loading" | "ready" | "unavailable">(
    "loading"
  );
  const mapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const init = () => {
      if (cancelled || !mapContainerRef.current || !window.kakao?.maps) return;
      try {
        const pos = new window.kakao.maps.LatLng(restaurant.lat, restaurant.lng);
        const map = new window.kakao.maps.Map(mapContainerRef.current, {
          center: pos,
          level: 3,
        });
        new window.kakao.maps.Marker({
          position: pos,
          map,
          title: restaurant.name,
        });
        setMapState("ready");
      } catch {
        if (!cancelled) setMapState("unavailable");
      }
    };

    const load = async () => {
      let jsKey = "";
      try {
        const res = await fetch("/api/settings/public-map-config");
        if (res.ok) {
          const conf = await res.json();
          if (conf.kakao_js_key && !conf.kakao_js_key.startsWith("your_")) {
            jsKey = conf.kakao_js_key.trim();
          }
        }
      } catch {
        // fallback below
      }
      if (!jsKey) {
        const envKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || "";
        if (envKey && !envKey.startsWith("your_")) jsKey = envKey.trim();
      }
      if (!jsKey) {
        if (!cancelled) setMapState("unavailable");
        return;
      }

      if (window.kakao?.maps) {
        window.kakao.maps.load(init);
        return;
      }

      const existing = document.getElementById("kakao-map-sdk");
      if (existing) existing.remove();

      timeoutId = setTimeout(() => {
        if (!cancelled) setMapState("unavailable");
      }, 8000);

      const script = document.createElement("script");
      script.id = "kakao-map-sdk";
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false&libraries=services`;
      script.async = true;
      script.onload = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (window.kakao?.maps) window.kakao.maps.load(init);
        else if (!cancelled) setMapState("unavailable");
      };
      script.onerror = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (!cancelled) setMapState("unavailable");
      };
      document.head.appendChild(script);
    };

    load();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [restaurant.lat, restaurant.lng, restaurant.name]);

  const handleCopyAddress = async () => {
    try {
      await navigator.clipboard.writeText(restaurant.road_address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {
      // ignore
    }
  };

  const directionsUrl =
    restaurant.kakao_url ||
    `https://map.kakao.com/link/to/${encodeURIComponent(restaurant.name)},${restaurant.lat},${restaurant.lng}`;

  const IMAGE_TYPE_BADGE: Record<string, string> = {
    food: "음식 사진",
    interior: "매장 내부",
    exterior: "매장 외관",
    menu: "메뉴",
  };

  const gallerySlides: SliderImage[] =
    restaurant.images && restaurant.images.length > 0
      ? restaurant.images.map((img, i) => ({
          url: img.url,
          alt: img.alt || `${restaurant.name} 사진 ${i + 1}`,
          badge: IMAGE_TYPE_BADGE[img.image_type] || "매장 사진",
          credit: `사진 출처: ${img.source_name || "동북미식 등록 사진"}${
            img.license_type
              ? ` · ${img.license_type.split("(")[0].trim()}`
              : ""
          }`,
        }))
      : [
          {
            url: restaurant.primary_image?.url || "/images/placeholder-table.svg",
            alt: restaurant.primary_image?.alt || `${restaurant.name} 대표 사진`,
            credit: restaurant.primary_image
              ? `사진 출처: ${restaurant.primary_image.source_name || "동북미식 등록 사진"}`
              : "저작권 및 이용 권한이 확인된 실제 매장 사진이 확보되지 않아 공통 플레이스홀더를 표시합니다.",
          },
        ];

  return (
    <div className="space-y-14">
      {/* Main 2-Column Editorial Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Left Main Content (8 cols) */}
        <div className="lg:col-span-8 space-y-10">
          {/* Header Info */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="primary" size="md">
                {restaurant.region_name}
              </Badge>
              <Badge variant="accent" size="md">
                {restaurant.primary_category}
              </Badge>
              {restaurant.neighborhood && (
                <Badge variant="default" size="md">
                  {restaurant.neighborhood}
                </Badge>
              )}
              <Badge variant="warning" size="md" dot>
                영업시간 방문 전 확인 필요
              </Badge>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <h1 className="font-editorial text-[30px] sm:text-[40px] font-bold text-[var(--text-primary)] leading-tight">
                {restaurant.name}
              </h1>

              <Button
                variant={saved ? "primary" : "outline"}
                size="md"
                onClick={() => toggle(restaurant.id)}
                leftIcon={
                  <Bookmark
                    className="w-4 h-4"
                    fill={saved ? "currentColor" : "none"}
                  />
                }
                aria-pressed={saved}
                className="shrink-0"
              >
                {saved ? "저장됨" : "맛집 저장"}
              </Button>
            </div>

            <p className="text-[16px] sm:text-[17px] text-[var(--text-secondary)] leading-relaxed">
              {restaurant.one_line_intro}
            </p>
          </div>

          {/* Primary Photo & Multi-Image Slider Gallery Area */}
          <section aria-label="매장 사진 갤러리" className="space-y-3">
            <ImageSlider
              slides={gallerySlides}
              aspectClassName="aspect-[4/3]"
              roundedClassName="rounded-[16px] border border-[var(--border-default)]"
              sizes="(max-width: 1024px) 100vw, 66vw"
              priority
              showCounter
              showThumbnails
              showCaption
            />
          </section>

          {/* Editorial Introduction & Recommendation Note */}
          <section
            aria-labelledby="intro-heading"
            className="space-y-4 pt-2 border-t border-[var(--border-default)]"
          >
            <h2
              id="intro-heading"
              className="font-editorial text-[24px] font-semibold text-[var(--text-primary)]"
            >
              매장 소개 및 추천 이유
            </h2>
            <p className="text-[15px] sm:text-[16px] text-[var(--text-primary)] leading-relaxed">
              {restaurant.description}
            </p>
            {restaurant.editor_note && (
              <div className="p-5 rounded-[14px] bg-[var(--bg-subtle)]/75 border border-[var(--border-default)] space-y-1.5">
                <p className="text-[13px] font-semibold text-[var(--brand-primary)]">
                  동북미식 에디터 확인 메모
                </p>
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                  {restaurant.editor_note}
                </p>
              </div>
            )}
          </section>

          {/* Registered Menus */}
          <section
            aria-labelledby="menus-heading"
            className="space-y-4 pt-2 border-t border-[var(--border-default)]"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="menus-heading"
                className="font-editorial text-[24px] font-semibold text-[var(--text-primary)] flex items-center gap-2"
              >
                <UtensilsCrossed className="w-5 h-5 text-[var(--brand-accent-text)]" />
                <span>대표 메뉴 및 가격대</span>
              </h2>
              {restaurant.price_range_label && (
                <span className="text-[14px] font-semibold text-[var(--brand-primary)]">
                  평균 {restaurant.price_range_label}
                </span>
              )}
            </div>

            {restaurant.menus.length > 0 ? (
              <ul className="divide-y divide-[var(--border-default)] rounded-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] px-5">
                {restaurant.menus.map((m, idx) => (
                  <li
                    key={`${m.name}-${idx}`}
                    className="py-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-2">
                      {m.is_signature && (
                        <Badge variant="accent" size="sm">
                          대표
                        </Badge>
                      )}
                      <span className="text-[15px] font-medium text-[var(--text-primary)]">
                        {m.name}
                      </span>
                    </div>
                    <span className="text-[14px] text-[var(--text-secondary)] shrink-0">
                      {m.price ? `${m.price.toLocaleString()}원` : m.price_label || "현장 확인"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[14px] text-[var(--text-secondary)]">
                등록된 상세 메뉴가 없습니다. 방문 전 매장 또는 카카오맵을 통해 확인해 주세요.
              </p>
            )}
          </section>

          {/* Location Mini Map */}
          <section
            aria-labelledby="location-heading"
            className="space-y-4 pt-2 border-t border-[var(--border-default)]"
          >
            <div className="flex items-center justify-between gap-2">
              <h2
                id="location-heading"
                className="font-editorial text-[24px] font-semibold text-[var(--text-primary)]"
              >
                위치 및 찾아가는 길
              </h2>
              <Link
                href={`/map?region=${restaurant.region_slug}`}
                className="text-[14px] font-medium text-[var(--brand-primary)] hover:underline"
              >
                주변 맛집 지도로 보기
              </Link>
            </div>

            {mapState === "unavailable" ? (
              <div className="p-6 rounded-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-center space-y-3">
                <p className="text-[15px] text-[var(--text-primary)] font-medium">
                  현재 브라우저에서 지도를 불러올 수 없습니다.
                </p>
                <p className="text-[14px] text-[var(--text-secondary)]">
                  도로명주소: {restaurant.road_address}
                </p>
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[var(--brand-primary)] text-white text-[14px] font-medium"
                >
                  <span>카카오맵에서 위치 보기</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            ) : (
              <div className="relative h-[300px] sm:h-[360px] w-full rounded-[14px] overflow-hidden border border-[var(--border-default)] bg-[var(--bg-subtle)]">
                <div ref={mapContainerRef} className="w-full h-full" />
                {mapState === "loading" && (
                  <div className="absolute inset-0 flex items-center justify-center text-[14px] text-[var(--text-secondary)]">
                    위치를 불러오는 중입니다...
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Right Sticky Practical Visit Info Card (4 cols) */}
        <aside className="lg:col-span-4 lg:sticky lg:top-[92px] space-y-5">
          <div className="p-6 rounded-[16px] bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-5">
            <h2 className="font-editorial text-[20px] font-semibold text-[var(--text-primary)] pb-3 border-b border-[var(--border-default)]">
              방문 정보
            </h2>

            <dl className="space-y-4 text-[14px]">
              {/* Address */}
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-[var(--brand-accent-text)] shrink-0 mt-1" />
                <div className="space-y-1 flex-1 min-w-0">
                  <dt className="text-[12px] font-medium text-[var(--text-muted)]">
                    주소
                  </dt>
                  <dd className="text-[var(--text-primary)] font-medium leading-snug">
                    {restaurant.road_address}
                  </dd>
                  {restaurant.jibun_address && (
                    <dd className="text-[13px] text-[var(--text-secondary)]">
                      지번: {restaurant.jibun_address}
                    </dd>
                  )}
                  <button
                    type="button"
                    onClick={handleCopyAddress}
                    className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--brand-primary)] hover:underline pt-1 cursor-pointer"
                  >
                    {copiedAddress ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>주소가 복사되었습니다</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>도로명주소 복사</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Hours */}
              <div className="flex items-start gap-3 pt-3 border-t border-[var(--border-default)]">
                <Clock className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-1" />
                <div className="space-y-1">
                  <dt className="text-[12px] font-medium text-[var(--text-muted)]">
                    영업시간 · 휴무일 · 브레이크타임
                  </dt>
                  <dd className="text-[var(--text-secondary)] leading-relaxed">
                    {restaurant.opening_hours_note || "방문 전 확인 필요"}
                  </dd>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-3 pt-3 border-t border-[var(--border-default)]">
                <Phone className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-1" />
                <div className="space-y-1">
                  <dt className="text-[12px] font-medium text-[var(--text-muted)]">
                    전화번호
                  </dt>
                  <dd>
                    {restaurant.phone ? (
                      <a
                        href={`tel:${restaurant.phone}`}
                        className="font-medium text-[var(--brand-primary)] hover:underline"
                      >
                        {restaurant.phone}
                      </a>
                    ) : (
                      <span className="text-[var(--text-secondary)]">
                        전화번호 미등록 (확인 필요)
                      </span>
                    )}
                  </dd>
                </div>
              </div>

              {/* Parking & Features */}
              <div className="flex items-start gap-3 pt-3 border-t border-[var(--border-default)]">
                <ParkingCircle className="w-4 h-4 text-[var(--brand-primary)] shrink-0 mt-1" />
                <div className="space-y-2">
                  <dt className="text-[12px] font-medium text-[var(--text-muted)]">
                    주차 및 편의시설
                  </dt>
                  <dd className="text-[var(--text-secondary)]">
                    {restaurant.parking_info}
                  </dd>
                  {restaurant.features.length > 0 && (
                    <dd className="flex flex-wrap gap-1.5 pt-1">
                      {restaurant.features.map((f) => (
                        <Badge key={f} variant="default" size="sm">
                          {FEATURE_LABELS[f] || f}
                        </Badge>
                      ))}
                    </dd>
                  )}
                </div>
              </div>
            </dl>

            {/* Primary Visit Action CTAs */}
            <div className="pt-4 border-t border-[var(--border-default)] space-y-2.5">
              <a
                href={directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] rounded-[10px] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-[15px] font-medium transition-colors"
              >
                <span>카카오맵 길찾기</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              {restaurant.phone && (
                <a
                  href={`tel:${restaurant.phone}`}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 min-h-[46px] rounded-[10px] bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-primary)] border border-[var(--border-default)] text-[15px] font-medium transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>전화하기</span>
                </a>
              )}
            </div>

            {/* Source Attribution & Feedback Report */}
            <div className="pt-4 border-t border-[var(--border-default)] space-y-2 text-[12px] text-[var(--text-muted)]">
              <p>
                정보 확인일: {restaurant.verified_at || "확인 필요"} · 출처:{" "}
                {restaurant.data_source}
              </p>
              <Link
                href={`/feedback?restaurant=${encodeURIComponent(restaurant.id)}&name=${encodeURIComponent(restaurant.name)}`}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--brand-accent-text)] transition-colors"
              >
                <Flag className="w-3.5 h-3.5" />
                <span>폐업·영업시간 등 정보 수정 제보하기</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* Related Restaurants */}
      {restaurant.related_restaurants.length > 0 && (
        <section
          aria-labelledby="related-heading"
          className="pt-10 border-t border-[var(--border-default)] space-y-6"
        >
          <h2
            id="related-heading"
            className="font-editorial text-[26px] font-semibold text-[var(--text-primary)]"
          >
            함께 둘러볼 만한 동북권 맛집
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {restaurant.related_restaurants.map((rel) => (
              <RestaurantCard
                key={rel.id}
                restaurant={{
                  id: rel.id,
                  slug: rel.slug,
                  name: rel.name,
                  regionName: rel.region_name,
                  neighborhood: rel.neighborhood,
                  category: rel.primary_category,
                  oneLineIntro: rel.one_line_intro,
                  priceRange: rel.price_range_label,
                  imageUrl: rel.primary_image?.url || null,
                  images: rel.images,
                  highlights: rel.highlights,
                }}
                isSaved={hydrated ? isSaved(rel.id) : false}
                onToggleSave={toggle}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};


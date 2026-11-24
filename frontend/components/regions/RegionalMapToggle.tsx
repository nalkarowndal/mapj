"use client";
import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, ExternalLink, MapPin } from "lucide-react";
import { RestaurantSummary } from "@/lib/types/gourmet";
import { Button } from "../ui/Button";

interface RegionalMapToggleProps {
  regionName: string;
  regionSlug: string;
  centerLat: number;
  centerLng: number;
  restaurants: RestaurantSummary[];
}

type SdkState = "idle" | "loading" | "ready" | "unavailable";

export const RegionalMapToggle: React.FC<RegionalMapToggleProps> = ({
  regionName,
  regionSlug,
  centerLat,
  centerLng,
  restaurants,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sdkState, setSdkState] = useState<SdkState>("idle");
  const [selectedId, setSelectedId] = useState<string | null>(
    restaurants[0]?.id || null
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const initMap = () => {
      if (cancelled || !containerRef.current || !window.kakao?.maps) return;
      try {
        const center = new window.kakao.maps.LatLng(centerLat, centerLng);
        const map = new window.kakao.maps.Map(containerRef.current, {
          center,
          level: 5,
        });
        mapRef.current = map;

        const bounds = new window.kakao.maps.LatLngBounds();
        restaurants.forEach((r) => {
          const pos = new window.kakao.maps.LatLng(r.lat, r.lng);
          bounds.extend(pos);
          const marker = new window.kakao.maps.Marker({
            position: pos,
            map,
            title: r.name,
          });
          window.kakao.maps.event.addListener(marker, "click", () => {
            setSelectedId(r.id);
            map.panTo(pos);
          });
        });
        if (restaurants.length > 0) {
          map.setBounds(bounds);
        }
        setSdkState("ready");
      } catch {
        if (!cancelled) setSdkState("unavailable");
      }
    };

    const loadSdk = async () => {
      setSdkState("loading");
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
        // Fallback check below
      }
      if (!jsKey) {
        const envKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || "";
        if (envKey && !envKey.startsWith("your_")) jsKey = envKey.trim();
      }
      if (!jsKey) {
        if (!cancelled) setSdkState("unavailable");
        return;
      }

      if (window.kakao?.maps) {
        window.kakao.maps.load(initMap);
        return;
      }

      const existing = document.getElementById("kakao-map-sdk");
      if (existing) existing.remove();

      timeoutId = setTimeout(() => {
        if (!cancelled) setSdkState("unavailable");
      }, 8000);

      const script = document.createElement("script");
      script.id = "kakao-map-sdk";
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${jsKey}&autoload=false&libraries=services`;
      script.async = true;
      script.onload = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (window.kakao?.maps) {
          window.kakao.maps.load(initMap);
        } else if (!cancelled) {
          setSdkState("unavailable");
        }
      };
      script.onerror = () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (!cancelled) setSdkState("unavailable");
      };
      document.head.appendChild(script);
    };

    loadSdk();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, centerLat, centerLng, restaurants]);

  // ResizeObserver relayout preservation
  useEffect(() => {
    if (!isOpen || sdkState !== "ready" || !containerRef.current || !mapRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.relayout();
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [isOpen, sdkState]);

  const selectedRestaurant = restaurants.find((r) => r.id === selectedId) || restaurants[0];

  return (
    <section
      aria-labelledby="regional-map-heading"
      className="rounded-[16px] bg-[var(--bg-surface)] border border-[var(--border-default)] overflow-hidden"
    >
      <div className="px-5 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <MapPin className="w-5 h-5 text-[var(--brand-accent-text)]" />
          <div>
            <h2
              id="regional-map-heading"
              className="font-editorial text-[20px] font-semibold text-[var(--text-primary)]"
            >
              {regionName} 맛집 위치 지도로 보기
            </h2>
            <p className="text-[13px] text-[var(--text-secondary)]">
              필요할 때만 지도를 펼쳐 {regionName} 등록 매장 {restaurants.length}곳의 위치를 확인하세요.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/map?region=${regionSlug}`}
            className="text-[13px] font-medium text-[var(--brand-primary)] hover:underline px-2 py-1"
          >
            전체 지도로 열기
          </Link>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsOpen((v) => !v)}
            rightIcon={
              isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
            }
          >
            {isOpen ? "지도 접기" : "지도 펼치기"}
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-[var(--border-default)]">
          {sdkState === "unavailable" ? (
            /* 지시문 14절: 가짜 지도 금지 → 간결한 안내 + 외부 지도 링크 대체 수단 제공 */
            <div className="p-6 sm:p-8 bg-[var(--bg-main)] text-center space-y-3">
              <p className="text-[15px] font-medium text-[var(--text-primary)]">
                현재 브라우저에서 지도를 표시할 수 없습니다.
              </p>
              <p className="text-[14px] text-[var(--text-secondary)]">
                아래 매장 목록에서 상세 주소를 확인하시거나 카카오맵 외부 링크로 위치를 바로 열 수 있습니다.
              </p>
              {selectedRestaurant?.kakao_url && (
                <div className="pt-1">
                  <a
                    href={selectedRestaurant.kakao_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[8px] bg-[var(--brand-primary)] text-white text-[14px] font-medium"
                  >
                    <span>카카오맵에서 {selectedRestaurant.name} 보기</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="relative h-[360px] sm:h-[420px] w-full bg-[var(--bg-subtle)]">
              <div ref={containerRef} className="w-full h-full" />
              {sdkState === "loading" && (
                <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-main)]/80 text-[14px] text-[var(--text-secondary)]">
                  카카오 지도를 불러오는 중입니다...
                </div>
              )}
              {sdkState === "ready" && selectedRestaurant && (
                <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-sm z-10 rounded-[12px] bg-[var(--bg-surface)]/95 border border-[var(--border-default)] p-3.5 shadow-[var(--shadow-popover)] flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[12px] text-[var(--brand-accent-text)] font-medium">
                      {selectedRestaurant.primary_category} · {selectedRestaurant.neighborhood}
                    </p>
                    <p className="font-editorial font-semibold text-[16px] text-[var(--text-primary)] truncate">
                      {selectedRestaurant.name}
                    </p>
                    <p className="text-[12px] text-[var(--text-secondary)] truncate">
                      {selectedRestaurant.road_address}
                    </p>
                  </div>
                  <Link
                    href={`/restaurants/${selectedRestaurant.slug}`}
                    className="shrink-0 px-3 py-2 rounded-[8px] bg-[var(--brand-primary)] text-white text-[13px] font-medium"
                  >
                    상세
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
};


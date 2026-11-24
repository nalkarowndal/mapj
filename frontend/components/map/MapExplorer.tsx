"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Bookmark,
  ChevronDown,
  ChevronUp,
  Compass,
  ExternalLink,
  List,
  MapPin,
  Minus,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";
import {
  CategoryItem,
  RegionSummary,
  RestaurantSummary,
} from "@/lib/types/gourmet";
import { getRestaurants } from "@/lib/api/client";
import { Button } from "../ui/Button";
import { FilterChip } from "../ui/FilterChip";
import { EmptyState } from "../ui/StateViews";
import { useBookmarks } from "@/features/bookmarks/useBookmarks";

export type MapSdkLifecycle =
  | "config_loading"
  | "key_missing"
  | "sdk_loading"
  | "sdk_ready"
  | "map_initializing"
  | "map_ready"
  | "error";

interface MapExplorerProps {
  regions: RegionSummary[];
  categories: CategoryItem[];
  initialRestaurants: RestaurantSummary[];
  initialRegion: string;
  initialCategory: string;
  initialQuery: string;
}

const DEFAULT_CENTER = { lat: 37.635, lng: 127.048 };

export const MapExplorer: React.FC<MapExplorerProps> = ({
  regions,
  categories,
  initialRestaurants,
  initialRegion,
  initialCategory,
  initialQuery,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isSaved, toggle, hydrated } = useBookmarks();

  const [regionSlug, setRegionSlug] = useState(initialRegion);
  const [categorySlug, setCategorySlug] = useState(initialCategory);
  const [queryText, setQueryText] = useState(initialQuery);
  const [restaurants, setRestaurants] =
    useState<RestaurantSummary[]>(initialRestaurants);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialRestaurants[0]?.id || null
  );
  const [loadingList, setLoadingList] = useState(false);
  const [showAreaSearchBtn, setShowAreaSearchBtn] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // Kakao Maps SDK 7-stage lifecycle preserved from existing implementation
  const [lifecycle, setLifecycle] = useState<MapSdkLifecycle>("config_loading");
  const [activeJsKey, setActiveJsKey] = useState("");
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const overlaysRef = useRef<any[]>([]);
  const lastBoundsKeyRef = useRef<string>("");
  const cardRefs = useRef<Record<string, HTMLElement | null>>({});

  const selectedRegionObj = regions.find((r) => r.slug === regionSlug);
  const selectedRestaurant =
    restaurants.find((r) => r.id === selectedId) || restaurants[0] || null;

  const syncUrlAndFetch = useCallback(
    async (opts: {
      region?: string;
      category?: string;
      q?: string;
      bounds?: string;
    }) => {
      const nextRegion = opts.region ?? regionSlug;
      const nextCategory = opts.category ?? categorySlug;
      const nextQ = opts.q ?? queryText;

      const sp = new URLSearchParams();
      if (nextQ.trim()) sp.set("q", nextQ.trim());
      if (nextRegion) sp.set("region", nextRegion);
      if (nextCategory) sp.set("category", nextCategory);
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });

      setLoadingList(true);
      try {
        const res = await getRestaurants({
          q: nextQ.trim() || undefined,
          region: nextRegion || undefined,
          category: nextCategory || undefined,
          bounds: opts.bounds,
          page: 1,
          page_size: 50,
        });
        setRestaurants(res.items);
        setSelectedId(res.items[0]?.id || null);
        setShowAreaSearchBtn(false);
      } finally {
        setLoadingList(false);
      }
    },
    [regionSlug, categorySlug, queryText, pathname, router]
  );

  // 1. Fetch public Kakao JS Key
  const fetchMapConfig = useCallback(async () => {
    setLifecycle("config_loading");
    let key = "";
    try {
      const res = await fetch("/api/settings/public-map-config");
      if (res.ok) {
        const data = await res.json();
        if (data.kakao_js_key && !data.kakao_js_key.startsWith("your_")) {
          key = data.kakao_js_key.trim();
        }
      }
    } catch {
      // fallback below
    }
    if (!key) {
      const envKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY || "";
      if (envKey && !envKey.startsWith("your_")) key = envKey.trim();
    }
    if (key) {
      setActiveJsKey(key);
      setLifecycle("sdk_loading");
    } else {
      setActiveJsKey("");
      setLifecycle("key_missing");
    }
  }, []);

  useEffect(() => {
    fetchMapConfig();
  }, [fetchMapConfig]);

  // 2. Load Kakao Maps SDK (autoload=false, duplicate prevention, 8s timeout)
  useEffect(() => {
    if (lifecycle !== "sdk_loading" || !activeJsKey) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    if (window.kakao?.maps) {
      try {
        window.kakao.maps.load(() => {
          if (!cancelled) setLifecycle("sdk_ready");
        });
        return;
      } catch {
        // re-inject below
      }
    }

    const existing = document.getElementById("kakao-map-sdk");
    if (existing) existing.remove();

    timeoutId = setTimeout(() => {
      if (!cancelled) setLifecycle("error");
    }, 8000);

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${activeJsKey}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (cancelled) return;
      if (window.kakao?.maps) {
        window.kakao.maps.load(() => {
          if (!cancelled) setLifecycle("sdk_ready");
        });
      } else {
        setLifecycle("error");
      }
    };
    script.onerror = () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (!cancelled) setLifecycle("error");
    };
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [lifecycle, activeJsKey]);

  // 3. Initialize single reusable Map instance
  useEffect(() => {
    if (
      lifecycle !== "sdk_ready" ||
      !mapContainerRef.current ||
      !window.kakao?.maps
    ) {
      return;
    }
    setLifecycle("map_initializing");
    try {
      const center = selectedRegionObj
        ? { lat: selectedRegionObj.center_lat, lng: selectedRegionObj.center_lng }
        : DEFAULT_CENTER;
      const map = new window.kakao.maps.Map(mapContainerRef.current, {
        center: new window.kakao.maps.LatLng(center.lat, center.lng),
        level: selectedRegionObj ? 5 : 7,
      });
      kakaoMapRef.current = map;

      window.kakao.maps.event.addListener(map, "dragend", () => {
        setShowAreaSearchBtn(true);
      });
      window.kakao.maps.event.addListener(map, "zoom_changed", () => {
        setShowAreaSearchBtn(true);
      });

      setLifecycle("map_ready");
    } catch {
      setLifecycle("error");
    }
  }, [lifecycle, selectedRegionObj]);

  // 4. ResizeObserver -> map.relayout()
  useEffect(() => {
    if (
      lifecycle !== "map_ready" ||
      !mapContainerRef.current ||
      !kakaoMapRef.current
    ) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          kakaoMapRef.current?.relayout();
        }
      }
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, [lifecycle]);

  // 5. Region change -> smooth panTo (reuse map instance without recreating)
  useEffect(() => {
    if (lifecycle !== "map_ready" || !kakaoMapRef.current || !window.kakao?.maps)
      return;
    const center = selectedRegionObj
      ? { lat: selectedRegionObj.center_lat, lng: selectedRegionObj.center_lng }
      : DEFAULT_CENTER;
    kakaoMapRef.current.panTo(
      new window.kakao.maps.LatLng(center.lat, center.lng)
    );
  }, [lifecycle, selectedRegionObj]);

  // 6. Sync Markers & Safe DOM textContent CustomOverlay (no default white InfoWindow box)
  useEffect(() => {
    if (lifecycle !== "map_ready" || !kakaoMapRef.current || !window.kakao?.maps)
      return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    overlaysRef.current.forEach((ov) => ov.setMap(null));
    overlaysRef.current = [];

    const map = kakaoMapRef.current;
    const bounds = new window.kakao.maps.LatLngBounds();

    restaurants.forEach((r) => {
      const pos = new window.kakao.maps.LatLng(r.lat, r.lng);
      bounds.extend(pos);
      const marker = new window.kakao.maps.Marker({
        position: pos,
        map,
        title: r.name,
      });

      const box = document.createElement("div");
      box.style.padding = "7px 12px";
      box.style.background = "#283A30";
      box.style.color = "#FFFFFF";
      box.style.borderRadius = "999px";
      box.style.fontSize = "12px";
      box.style.fontWeight = "600";
      box.style.whiteSpace = "nowrap";
      box.style.boxShadow = "0 6px 16px rgba(24, 34, 28, 0.22)";
      box.style.border = "1px solid rgba(255, 255, 255, 0.18)";
      box.style.pointerEvents = "none";
      box.textContent = `${r.name} · ${r.primary_category}`;

      const overlay = new window.kakao.maps.CustomOverlay({
        position: pos,
        content: box,
        yAnchor: 2.35,
      });

      window.kakao.maps.event.addListener(marker, "click", () => {
        setSelectedId(r.id);
        overlaysRef.current.forEach((ov) => ov.setMap(null));
        overlay.setMap(map);
        map.panTo(pos);
        cardRefs.current[r.id]?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });

      if (r.id === selectedId) {
        overlay.setMap(map);
      }

      markersRef.current.push(marker);
      overlaysRef.current.push(overlay);
    });

    const boundsKey = restaurants.map((r) => r.id).join(",");
    if (restaurants.length > 0 && boundsKey !== lastBoundsKeyRef.current) {
      lastBoundsKeyRef.current = boundsKey;
      map.setBounds(bounds);
    }
  }, [lifecycle, restaurants, selectedId]);

  const handleSelectCard = (r: RestaurantSummary) => {
    setSelectedId(r.id);
    if (lifecycle === "map_ready" && kakaoMapRef.current && window.kakao?.maps) {
      kakaoMapRef.current.panTo(new window.kakao.maps.LatLng(r.lat, r.lng));
    }
  };

  const handleSearchCurrentBounds = () => {
    if (!kakaoMapRef.current) return;
    const b = kakaoMapRef.current.getBounds();
    const sw = b.getSouthWest();
    const ne = b.getNorthEast();
    const boundsStr = `${sw.getLat()},${sw.getLng()},${ne.getLat()},${ne.getLng()}`;
    syncUrlAndFetch({ bounds: boundsStr });
  };

  const handleZoom = (delta: number) => {
    if (!kakaoMapRef.current) return;
    const lvl = kakaoMapRef.current.getLevel();
    kakaoMapRef.current.setLevel(Math.max(1, Math.min(12, lvl + delta)));
  };

  const handleResetCenter = () => {
    if (!kakaoMapRef.current || !window.kakao?.maps) return;
    const c = selectedRegionObj
      ? { lat: selectedRegionObj.center_lat, lng: selectedRegionObj.center_lng }
      : DEFAULT_CENTER;
    kakaoMapRef.current.panTo(new window.kakao.maps.LatLng(c.lat, c.lng));
    kakaoMapRef.current.setLevel(selectedRegionObj ? 5 : 7);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    syncUrlAndFetch({ q: queryText });
  };

  const isMapUnavailable = lifecycle === "key_missing" || lifecycle === "error";

  return (
    <div className="flex flex-col h-[calc(100vh-68px-62px)] md:h-[calc(100vh-72px)] w-full overflow-hidden bg-[var(--bg-main)]">
      {/* Top Search & Region/Category Bar */}
      <div className="shrink-0 bg-[var(--bg-surface)] border-b border-[var(--border-default)] px-4 sm:px-6 py-3 space-y-2.5 z-20">
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <form
            onSubmit={handleSearchSubmit}
            className="flex items-center gap-2 flex-1 max-w-xl"
          >
            <div className="relative flex-1 flex items-center bg-[var(--bg-main)] border border-[var(--border-strong)] rounded-[10px]">
              <Search className="w-4 h-4 text-[var(--text-muted)] ml-3 shrink-0" />
              <input
                type="search"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="지도에서 매장명, 메뉴, 동네 검색"
                aria-label="지도 맛집 검색"
                className="w-full bg-transparent px-2.5 py-2 text-[14px] text-[var(--text-primary)] focus:outline-none"
              />
            </div>
            <Button type="submit" variant="primary" size="sm">
              검색
            </Button>
          </form>

          {/* Region Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <FilterChip
              selected={!regionSlug}
              onClick={() => {
                setRegionSlug("");
                syncUrlAndFetch({ region: "" });
              }}
              className="py-1.5 min-h-[34px] text-[13px]"
            >
              전체
            </FilterChip>
            {regions.map((r) => (
              <FilterChip
                key={r.slug}
                selected={regionSlug === r.slug}
                onClick={() => {
                  setRegionSlug(r.slug);
                  syncUrlAndFetch({ region: r.slug });
                }}
                className="py-1.5 min-h-[34px] text-[13px]"
              >
                {r.name}
              </FilterChip>
            ))}
          </div>

          {/* Category Select */}
          <select
            aria-label="음식 종류 필터"
            value={categorySlug}
            onChange={(e) => {
              setCategorySlug(e.target.value);
              syncUrlAndFetch({ category: e.target.value });
            }}
            className="px-3 py-1.5 min-h-[36px] rounded-[8px] bg-[var(--bg-main)] border border-[var(--border-strong)] text-[13px] text-[var(--text-primary)] shrink-0"
          >
            <option value="">전체 음식 종류</option>
            {categories
              .filter((c) => c.count > 0)
              .map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name} ({c.count})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Main Workspace: Desktop 38% List + 62% Map | Mobile Full Map + Bottom Sheet */}
      <div className="flex-1 flex relative overflow-hidden min-h-0">
        {/* Desktop Left List Panel (38%) */}
        <aside
          aria-label="지도 연동 맛집 목록"
          className="hidden md:flex flex-col w-[38%] max-w-[480px] min-w-[320px] h-full bg-[var(--bg-main)] border-r border-[var(--border-default)] overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-[var(--border-default)] bg-[var(--bg-surface)] flex items-center justify-between text-[13px]">
            <span className="font-semibold text-[var(--text-primary)]">
              검색된 맛집 {restaurants.length}곳
            </span>
            <Link
              href="/restaurants"
              className="text-[var(--brand-primary)] hover:underline font-medium"
            >
              목록 탐색으로 보기
            </Link>
          </div>

          <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
            {loadingList ? (
              <div className="p-8 text-center text-[14px] text-[var(--text-secondary)]">
                맛집 목록을 불러오는 중입니다...
              </div>
            ) : restaurants.length === 0 ? (
              <EmptyState
                title="표시할 맛집이 없습니다"
                description="지역이나 음식 종류 조건을 넓히거나 지도를 이동해 다시 검색해 보세요."
                actionLabel="전체 보기"
                onAction={() => {
                  setRegionSlug("");
                  setCategorySlug("");
                  setQueryText("");
                  syncUrlAndFetch({ region: "", category: "", q: "" });
                }}
              />
            ) : (
              restaurants.map((r) => {
                const active = r.id === selectedId;
                const saved = hydrated ? isSaved(r.id) : false;
                return (
                  <article
                    key={r.id}
                    ref={(el) => {
                      cardRefs.current[r.id] = el;
                    }}
                    onClick={() => handleSelectCard(r)}
                    className={`p-4 rounded-[12px] border cursor-pointer transition-colors space-y-2 ${
                      active
                        ? "bg-[var(--bg-surface)] border-[var(--brand-primary)] ring-1 ring-[var(--brand-primary)]"
                        : "bg-[var(--bg-surface)] border-[var(--border-default)] hover:border-[var(--border-strong)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[12px] text-[var(--brand-accent-text)] font-medium">
                          {r.region_name} · {r.neighborhood} · {r.primary_category}
                        </p>
                        <h3 className="font-editorial text-[17px] font-semibold text-[var(--text-primary)] truncate mt-0.5">
                          {r.name}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(r.id);
                        }}
                        aria-label={saved ? `${r.name} 저장 해제` : `${r.name} 저장`}
                        aria-pressed={saved}
                        className={`p-2 rounded-full border cursor-pointer shrink-0 ${
                          saved
                            ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                            : "bg-[var(--bg-main)] text-[var(--text-secondary)] border-[var(--border-default)]"
                        }`}
                      >
                        <Bookmark
                          className="w-3.5 h-3.5"
                          fill={saved ? "currentColor" : "none"}
                        />
                      </button>
                    </div>

                    <p className="text-[13px] text-[var(--text-secondary)] line-clamp-2 leading-relaxed">
                      {r.one_line_intro}
                    </p>

                    <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-between gap-2 text-[12px]">
                      <span className="text-[var(--text-muted)] truncate">
                        {r.road_address}
                      </span>
                      <Link
                        href={`/restaurants/${r.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 font-semibold text-[var(--brand-primary)] hover:underline"
                      >
                        상세 보기
                      </Link>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </aside>

        {/* Right Interactive Map Canvas (Desktop 62%, Mobile 100%) */}
        <div className="flex-1 relative h-full bg-[var(--bg-subtle)] overflow-hidden">
          {isMapUnavailable ? (
            /* 지시문 14절: 가짜 지도 금지 → 간결한 안내 + 목록 및 외부 카카오맵 링크 대체 */
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-main)]">
              <div className="max-w-md w-full p-7 rounded-[16px] bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-4">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] text-[var(--brand-primary)] flex items-center justify-center mx-auto">
                  <MapPin className="w-6 h-6" />
                </div>
                <h2 className="font-editorial text-[22px] font-semibold text-[var(--text-primary)]">
                  현재 지도 표시가 어렵습니다
                </h2>
                <p className="text-[14px] text-[var(--text-secondary)] leading-relaxed">
                  지도 서비스 연결이 일시적으로 제한되어 있습니다. 좌측 목록이나 전체 맛집 탐색에서
                  정확한 주소와 외부 카카오맵 길찾기를 이용하실 수 있습니다.
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={fetchMapConfig}
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    다시 시도
                  </Button>
                  <Link
                    href="/restaurants"
                    className="inline-flex items-center px-4 py-2 rounded-[8px] bg-[var(--brand-primary)] text-white text-[13px] font-medium"
                  >
                    전체 맛집 목록 보기
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div ref={mapContainerRef} className="w-full h-full" />

              {(lifecycle === "config_loading" ||
                lifecycle === "sdk_loading" ||
                lifecycle === "map_initializing") && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-main)]/85 text-[14px] text-[var(--text-secondary)]">
                  카카오 지도를 준비하는 중입니다...
                </div>
              )}

              {/* Search in Current Map Bounds CTA */}
              {lifecycle === "map_ready" && showAreaSearchBtn && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSearchCurrentBounds}
                    leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                    className="shadow-[var(--shadow-popover)]"
                  >
                    현 지도 영역에서 재검색
                  </Button>
                </div>
              )}

              {/* Map Controls (Zoom & Center Reset) */}
              {lifecycle === "map_ready" && (
                <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleResetCenter}
                    aria-label="지역 중심으로 이동"
                    className="w-10 h-10 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[var(--shadow-card)] flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                  >
                    <Compass className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col rounded-[10px] overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-[var(--shadow-card)]">
                    <button
                      type="button"
                      onClick={() => handleZoom(-1)}
                      aria-label="지도 확대"
                      className="w-10 h-10 flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] border-b border-[var(--border-default)] cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleZoom(1)}
                      aria-label="지도 축소"
                      className="w-10 h-10 flex items-center justify-center text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Desktop Selected Place Floating Preview */}
              {lifecycle === "map_ready" && selectedRestaurant && (
                <div className="hidden md:flex absolute bottom-5 left-5 right-5 max-w-lg z-20 p-4 rounded-[14px] bg-[var(--bg-surface)]/96 border border-[var(--border-default)] shadow-[var(--shadow-popover)] items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[12px] font-medium text-[var(--brand-accent-text)]">
                      {selectedRestaurant.region_name} · {selectedRestaurant.primary_category}
                    </p>
                    <h3 className="font-editorial text-[18px] font-semibold text-[var(--text-primary)] truncate">
                      {selectedRestaurant.name}
                    </h3>
                    <p className="text-[13px] text-[var(--text-secondary)] truncate">
                      {selectedRestaurant.road_address}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/restaurants/${selectedRestaurant.slug}`}
                      className="px-3.5 py-2 rounded-[8px] bg-[var(--brand-primary)] text-white text-[13px] font-medium"
                    >
                      상세
                    </Link>
                    {selectedRestaurant.kakao_url && (
                      <a
                        href={selectedRestaurant.kakao_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-[8px] bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-default)]"
                        aria-label="카카오맵 길찾기"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Mobile Expandable Bottom Sheet */}
          <div
            className={`md:hidden absolute inset-x-0 bottom-0 z-30 bg-[var(--bg-surface)] border-t border-[var(--border-default)] rounded-t-[18px] shadow-[var(--shadow-popover)] transition-all duration-200 flex flex-col ${
              mobileSheetOpen ? "h-[68%]" : "h-auto"
            }`}
          >
            <button
              type="button"
              onClick={() => setMobileSheetOpen((v) => !v)}
              className="w-full px-4 py-3 flex items-center justify-between border-b border-[var(--border-default)] cursor-pointer"
            >
              <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-[var(--text-primary)]">
                <List className="w-4 h-4 text-[var(--brand-primary)]" />
                <span>검색된 맛집 {restaurants.length}곳</span>
              </span>
              <span className="inline-flex items-center gap-1 text-[12px] text-[var(--text-secondary)]">
                {mobileSheetOpen ? (
                  <>
                    <span>지도 보기</span>
                    <ChevronDown className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>목록 펼치기</span>
                    <ChevronUp className="w-4 h-4" />
                  </>
                )}
              </span>
            </button>

            {!mobileSheetOpen && selectedRestaurant && (
              <div className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[12px] text-[var(--brand-accent-text)] font-medium">
                    {selectedRestaurant.region_name} · {selectedRestaurant.primary_category}
                  </p>
                  <p className="font-editorial text-[16px] font-semibold text-[var(--text-primary)] truncate">
                    {selectedRestaurant.name}
                  </p>
                  <p className="text-[12px] text-[var(--text-secondary)] truncate">
                    {selectedRestaurant.road_address}
                  </p>
                </div>
                <Link
                  href={`/restaurants/${selectedRestaurant.slug}`}
                  className="shrink-0 px-3.5 py-2 rounded-[8px] bg-[var(--brand-primary)] text-white text-[13px] font-medium"
                >
                  상세
                </Link>
              </div>
            )}

            {mobileSheetOpen && (
              <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5">
                {restaurants.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => {
                      handleSelectCard(r);
                      setMobileSheetOpen(false);
                    }}
                    className={`p-3.5 rounded-[12px] border cursor-pointer ${
                      r.id === selectedId
                        ? "border-[var(--brand-primary)] bg-[var(--bg-main)]"
                        : "border-[var(--border-default)] bg-[var(--bg-surface)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-editorial font-semibold text-[15px] text-[var(--text-primary)] truncate">
                        {r.name}
                      </p>
                      <Link
                        href={`/restaurants/${r.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[12px] font-semibold text-[var(--brand-primary)] shrink-0"
                      >
                        상세
                      </Link>
                    </div>
                    <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 truncate">
                      {r.region_name} · {r.primary_category} · {r.road_address}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


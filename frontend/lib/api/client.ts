import {
  CategoryItem,
  CollectionDetail,
  CollectionItem,
  PaginatedRestaurantsResponse,
  RegionDetailResponse,
  RegionSummary,
  RestaurantDetail,
} from "../types/gourmet";

function getApiBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return (
    process.env.BACKEND_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://127.0.0.1:8000"
  );
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    ...init,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API 요청 실패 (${res.status}): ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function getRegions(): Promise<RegionSummary[]> {
  return fetchJson<RegionSummary[]>("/api/regions");
}

export async function getRegionDetail(
  slug: string
): Promise<RegionDetailResponse | null> {
  const base = getApiBaseUrl();
  const res = await fetch(`${base}/api/regions/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`지역 정보를 불러오지 못했습니다 (${res.status})`);
  }
  return res.json() as Promise<RegionDetailResponse>;
}

export interface RestaurantQueryParams {
  q?: string;
  region?: string;
  neighborhood?: string;
  category?: string;
  price?: string;
  features?: string[];
  open_now?: boolean;
  editor_pick?: boolean;
  bounds?: string;
  sort?: string;
  page?: number;
  page_size?: number;
}

export async function getRestaurants(
  params: RestaurantQueryParams = {}
): Promise<PaginatedRestaurantsResponse> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.region) sp.set("region", params.region);
  if (params.neighborhood) sp.set("neighborhood", params.neighborhood);
  if (params.category) sp.set("category", params.category);
  if (params.price) sp.set("price", params.price);
  if (params.features && params.features.length > 0) {
    sp.set("features", params.features.join(","));
  }
  if (params.open_now) sp.set("open_now", "true");
  if (params.editor_pick) sp.set("editor_pick", "true");
  if (params.bounds) sp.set("bounds", params.bounds);
  if (params.sort) sp.set("sort", params.sort);
  if (params.page) sp.set("page", String(params.page));
  if (params.page_size) sp.set("page_size", String(params.page_size));

  const qs = sp.toString();
  return fetchJson<PaginatedRestaurantsResponse>(
    `/api/restaurants${qs ? `?${qs}` : ""}`
  );
}

export async function getRestaurantDetail(
  slug: string
): Promise<RestaurantDetail | null> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/api/restaurants/${encodeURIComponent(slug)}`,
    { cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`맛집 상세 정보를 불러오지 못했습니다 (${res.status})`);
  }
  return res.json() as Promise<RestaurantDetail>;
}

export async function getCategories(): Promise<CategoryItem[]> {
  return fetchJson<CategoryItem[]>("/api/categories");
}

export async function getCollections(): Promise<CollectionItem[]> {
  return fetchJson<CollectionItem[]>("/api/collections");
}

export async function getCollectionDetail(
  slug: string
): Promise<CollectionDetail | null> {
  const base = getApiBaseUrl();
  const res = await fetch(
    `${base}/api/collections/${encodeURIComponent(slug)}`,
    { cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`큐레이션 정보를 불러오지 못했습니다 (${res.status})`);
  }
  return res.json() as Promise<CollectionDetail>;
}


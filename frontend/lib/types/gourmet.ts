export type RegionSlug = "nowon" | "dobong" | "gangbuk" | "jungnang" | "seongbuk";

export interface NeighborhoodItem {
  slug: string;
  name: string;
  summary: string;
  keywords: string[];
}

export interface RegionSummary {
  slug: RegionSlug;
  name: string;
  english_name: string;
  tagline: string;
  summary: string;
  description: string;
  editorial_story: string;
  hero_image_url: string;
  hero_image_credit: string;
  center_lat: number;
  center_lng: number;
  restaurant_count: number;
  neighborhoods: NeighborhoodItem[];
}

export interface CategoryItem {
  slug: string;
  name: string;
  count: number;
}

export interface RestaurantImageItem {
  url: string;
  image_type: "food" | "interior" | "exterior" | "menu" | "placeholder";
  alt: string;
  source_name?: string;
  license_type?: string;
  verified_at?: string;
  is_ai_generated?: boolean;
}

export interface RestaurantMenuItem {
  name: string;
  price?: number | null;
  price_label?: string | null;
  is_signature: boolean;
  description?: string | null;
}

export interface RestaurantSummary {
  id: string;
  slug: string;
  name: string;
  region_slug: RegionSlug;
  region_name: string;
  neighborhood: string;
  primary_category_slug: string;
  primary_category: string;
  one_line_intro: string;
  price_range_label?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  road_address: string;
  jibun_address?: string | null;
  lat: number;
  lng: number;
  phone?: string | null;
  kakao_url?: string | null;
  is_editor_pick: boolean;
  highlights: string[];
  features: string[];
  signature_menus: string[];
  primary_image?: RestaurantImageItem | null;
  open_status: "open" | "closed" | "break" | "needs_check";
  verification_status: "verified" | "needs_verification" | "reference";
  verified_at?: string | null;
  data_source: string;
}

export interface RestaurantDetail extends RestaurantSummary {
  description: string;
  editor_note?: string | null;
  opening_hours_note?: string | null;
  parking_info?: string | null;
  menus: RestaurantMenuItem[];
  images: RestaurantImageItem[];
  related_restaurants: RestaurantSummary[];
}

export interface CollectionItem {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  hero_image_url?: string | null;
  is_featured: boolean;
  restaurant_count: number;
  region_focus?: string | null;
}

export interface CollectionDetail extends CollectionItem {
  restaurants: RestaurantSummary[];
}

export interface RegionDetailResponse {
  region: RegionSummary;
  editor_picks: RestaurantSummary[];
  categories: CategoryItem[];
  recommended_collections: CollectionItem[];
  restaurants: RestaurantSummary[];
  other_regions: RegionSummary[];
}

export interface PaginatedRestaurantsResponse {
  items: RestaurantSummary[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}


export type DistrictName = "노원구" | "도봉구" | "강북구" | "중랑구" | "성북구";

export interface PlaceInfo {
  id: string;
  name: string;
  district: string;
  category: string;
  sub_category?: string;
  address: string;
  road_address?: string;
  lat: number;
  lng: number;
  phone?: string;
  is_registered: boolean;
  description: string;
  tags?: string[];
  data_source?: string;
  verification_status?: "reference" | "live_verified";
  verified_at?: string;
  kakao_url?: string;
}

export interface ChatMessage {
  id: string | number;
  text: string;
  sender: "user" | "ai";
  timestamp?: number;
  is_demo?: boolean;
  places?: PlaceInfo[];
  district?: string;
  status?: "pending" | "success" | "error";
  canRetry?: boolean;
}

export interface FullSession {
  id: string;
  title: string;
  district: DistrictName;
  messages: ChatMessage[];
  places: PlaceInfo[];
  createdAt: number;
  updatedAt: number;
}

export interface ChatRequestPayload {
  message: string;
  district: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  category?: string;
}

export interface ChatResponsePayload {
  reply: string;
  show_map: boolean;
  places: PlaceInfo[];
  district: string;
  is_demo: boolean;
  status_message: string;
}

export interface DistrictMeta {
  name: DistrictName;
  center: { lat: number; lng: number };
  description: string;
  prompts: string[];
}

export type CategoryFilter = "전체" | "맛집" | "카페" | "학원" | "문화시설";

export type MobileTab = "chat" | "places" | "map";

export type ApiProvider = "groq" | "kakao_rest" | "kakao_js";

export type ApiConnectionStatus =
  | "unconfigured"
  | "configured_untested"
  | "connected"
  | "invalid_key"
  | "forbidden"
  | "rate_limited"
  | "error"
  | "timeout";

export interface GroqModelOption {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
}

export interface SettingsStatusResponse {
  groq: {
    is_configured: boolean;
    masked_key: string;
    model: string;
    status: ApiConnectionStatus;
    status_message: string;
    last_validated?: number;
    supported_models: GroqModelOption[];
  };
  kakao_rest: {
    is_configured: boolean;
    masked_key: string;
    status: ApiConnectionStatus;
    status_message: string;
    last_validated?: number;
  };
  kakao_js: {
    is_configured: boolean;
    masked_key: string;
    status: string;
    status_message: string;
    domain_guide: {
      registered_domains: string[];
      developers_url: string;
    };
  };
  operational_mode: "live_api" | "local_verified";
  server_time: number;
}

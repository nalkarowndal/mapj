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
  source?: string;
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

"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { setSelectedPlaceId, setSettingsOpen } from "@/store/chatSlice";
import { DISTRICT_DETAILS } from "@/lib/districtData";
import { PlaceInfo } from "@/lib/types";
import { InteractiveMapFallback } from "./InteractiveMapFallback";
import { FaExclamationTriangle, FaCog } from "react-icons/fa";

declare global {
  interface Window {
    kakao: any;
    __kakaoMapLoadingPromise?: Promise<void>;
  }
}

interface KakaoMapViewProps {
  onOpenDetail?: (place: PlaceInfo) => void;
}

export const KakaoMapView: React.FC<KakaoMapViewProps> = ({ onOpenDetail }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { places, selectedPlaceId, selectedDistrict } = useSelector(
    (state: RootState) => state.chat
  );

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowsRef = useRef<any[]>([]);

  const [activeJsKey, setActiveJsKey] = useState<string>("");
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // 1. 런타임 공개 지도 설정 조회 (정적 빌드 환경변수에만 의존하지 않음)
  useEffect(() => {
    const fetchPublicConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/settings/public-map-config`);
        if (res.ok) {
          const data = await res.json();
          if (data.kakao_js_key && !data.kakao_js_key.startsWith("your_")) {
            setActiveJsKey(data.kakao_js_key);
            return;
          }
        }
      } catch (err) {
        console.warn("지도 공개 설정 조회 실패:", err);
      }

      // Fallback to client env if present
      const envKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
      if (envKey && !envKey.startsWith("your_")) {
        setActiveJsKey(envKey);
      }
    };

    fetchPublicConfig();
  }, [apiUrl]);

  // 2. [Bug 1-7 해결]: 공유 Promise 기반 안정적 스크립트 로더
  useEffect(() => {
    if (!activeJsKey) return;

    if (window.kakao && window.kakao.maps) {
      window.kakao.maps.load(() => {
        setIsSdkLoaded(true);
        setSdkError(null);
      });
      return;
    }

    if (!window.__kakaoMapLoadingPromise) {
      window.__kakaoMapLoadingPromise = new Promise((resolve, reject) => {
        const existingScript = document.getElementById("kakao-map-sdk") as HTMLScriptElement;
        if (existingScript) existingScript.remove();

        const script = document.createElement("script");
        script.id = "kakao-map-sdk";
        script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${activeJsKey}&autoload=false&libraries=services`;
        script.async = true;

        script.onload = () => {
          if (window.kakao && window.kakao.maps) {
            window.kakao.maps.load(() => {
              resolve();
            });
          } else {
            reject(new Error("Kakao Map 객체 초기화 실패"));
          }
        };

        script.onerror = () => {
          reject(new Error("스크립트 다운로드 실패 (도메인 미등록 또는 키 오류)"));
        };

        document.head.appendChild(script);
      });
    }

    window.__kakaoMapLoadingPromise
      .then(() => {
        setIsSdkLoaded(true);
        setSdkError(null);
      })
      .catch((err) => {
        console.warn("[Kakao Map SDK Error]", err.message);
        setSdkError(err.message);
        setIsSdkLoaded(false);
      });
  }, [activeJsKey]);

  // 3. 지도 인스턴스 초기화
  useEffect(() => {
    if (!isSdkLoaded || !mapContainerRef.current || !window.kakao?.maps) return;

    const districtCenter = DISTRICT_DETAILS[selectedDistrict]?.center || {
      lat: 37.6543,
      lng: 127.0564,
    };
    const centerLatLng = new window.kakao.maps.LatLng(
      districtCenter.lat,
      districtCenter.lng
    );

    const mapOptions = {
      center: centerLatLng,
      level: 4,
    };

    const map = new window.kakao.maps.Map(mapContainerRef.current, mapOptions);
    kakaoMapRef.current = map;

    // Zoom 컨트롤
    const zoomControl = new window.kakao.maps.ZoomControl();
    map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
  }, [isSdkLoaded, selectedDistrict]);

  // 4. [Bug 1-8 해결]: InfoWindow 안전한 DOM 렌더링 (XSS 취약점 완전 방어) 및 마커 정리
  useEffect(() => {
    if (!isSdkLoaded || !kakaoMapRef.current || !window.kakao?.maps) return;

    // 기존 마커 및 인포윈도우 클린업
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    infoWindowsRef.current.forEach((iw) => iw.close());
    infoWindowsRef.current = [];

    const map = kakaoMapRef.current;
    const bounds = new window.kakao.maps.LatLngBounds();

    places.forEach((place) => {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng);
      bounds.extend(position);

      const isSelected = place.id === selectedPlaceId;

      const marker = new window.kakao.maps.Marker({
        position,
        map,
        title: place.name,
      });

      // [XSS 방어]: innerHTML 문자열 대신 safe DOM element 생성
      const infoContainer = document.createElement("div");
      infoContainer.style.padding = "8px 12px";
      infoContainer.style.background = "#17233A";
      infoContainer.style.color = "#FDE047";
      infoContainer.style.borderRadius = "12px";
      infoContainer.style.fontSize = "12px";
      infoContainer.style.fontWeight = "bold";
      infoContainer.style.boxShadow = "0 4px 12px rgba(0,0,0,0.4)";
      infoContainer.style.border = "1px solid rgba(255,255,255,0.15)";
      infoContainer.style.whiteSpace = "nowrap";

      const titleNode = document.createElement("span");
      titleNode.textContent = place.name; // textContent로 안전하게 이스케이프
      infoContainer.appendChild(titleNode);

      const categoryNode = document.createElement("span");
      categoryNode.textContent = ` (${place.category})`;
      categoryNode.style.color = "#94A3B8";
      categoryNode.style.fontSize = "11px";
      categoryNode.style.marginLeft = "4px";
      infoContainer.appendChild(categoryNode);

      const infowindow = new window.kakao.maps.InfoWindow({
        content: infoContainer,
      });

      window.kakao.maps.event.addListener(marker, "click", () => {
        dispatch(setSelectedPlaceId(place.id));
        infoWindowsRef.current.forEach((iw) => iw.close());
        infowindow.open(map, marker);
      });

      if (isSelected) {
        infowindow.open(map, marker);
      }

      markersRef.current.push(marker);
      infoWindowsRef.current.push(infowindow);
    });

    if (places.length > 0 && markersRef.current.length > 0) {
      map.setBounds(bounds);
    }
  }, [isSdkLoaded, places, selectedPlaceId, dispatch]);

  // 5. 마커 선택 시 부드러운 패닝
  useEffect(() => {
    if (!isSdkLoaded || !kakaoMapRef.current || !window.kakao?.maps) return;
    const targetPlace = places.find((p) => p.id === selectedPlaceId);
    if (targetPlace) {
      const moveLatLon = new window.kakao.maps.LatLng(
        targetPlace.lat,
        targetPlace.lng
      );
      kakaoMapRef.current.panTo(moveLatLon);
    }
  }, [isSdkLoaded, selectedPlaceId, places]);

  // 키 미설정 시 인터랙티브 벡터 맵 fallback
  if (!activeJsKey) {
    return <InteractiveMapFallback onOpenDetail={onOpenDetail} />;
  }

  // SDK 오류(도메인 미등록 등) 발생 시 안내 배너 + 폴백
  if (sdkError) {
    return (
      <div className="relative w-full h-full">
        <div className="absolute top-12 left-4 right-4 z-30 p-3 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs flex items-center justify-between shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <FaExclamationTriangle className="text-[#FDE047] shrink-0" size={14} />
            <span>
              카카오맵 SDK 로딩 오류: 플랫폼 Web 도메인 등록을 확인해 주세요.
            </span>
          </div>
          <button
            onClick={() => dispatch(setSettingsOpen(true))}
            className="px-2.5 py-1 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-[11px] font-bold text-white border border-white/10 shrink-0 cursor-pointer flex items-center gap-1"
          >
            <FaCog size={10} />
            <span>설정 확인</span>
          </button>
        </div>
        <InteractiveMapFallback onOpenDetail={onOpenDetail} />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-[#0B1120] overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

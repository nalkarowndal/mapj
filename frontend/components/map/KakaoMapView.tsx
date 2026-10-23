"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { setSelectedPlaceId } from "@/store/chatSlice";
import { DISTRICT_DETAILS } from "@/lib/districtData";
import { PlaceInfo } from "@/lib/types";
import { InteractiveMapFallback } from "./InteractiveMapFallback";

declare global {
  interface Window {
    kakao: any;
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

  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [sdkError, setSdkError] = useState(false);

  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  const isKeyValid = Boolean(kakaoKey && !kakaoKey.startsWith("your_"));

  // 1. Dynamic Script Loader for Kakao Map SDK
  useEffect(() => {
    if (!isKeyValid) return;

    if (window.kakao && window.kakao.maps) {
      setIsSdkLoaded(true);
      return;
    }

    const scriptId = "kakao-map-sdk";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false&libraries=services`;
    script.async = true;

    script.onload = () => {
      window.kakao.maps.load(() => {
        setIsSdkLoaded(true);
      });
    };

    script.onerror = () => {
      console.warn("카카오맵 SDK 스크립트 로드 실패. 인터랙티브 벡터 맵으로 대체합니다.");
      setSdkError(true);
    };

    document.head.appendChild(script);
  }, [kakaoKey, isKeyValid]);

  // 2. Initialize Kakao Map
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

    // Zoom control
    const zoomControl = new window.kakao.maps.ZoomControl();
    map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);
  }, [isSdkLoaded, selectedDistrict]);

  // 3. Render Markers on Map
  useEffect(() => {
    if (!isSdkLoaded || !kakaoMapRef.current || !window.kakao?.maps) return;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const map = kakaoMapRef.current;
    const bounds = new window.kakao.maps.LatLngBounds();

    places.forEach((place) => {
      const position = new window.kakao.maps.LatLng(place.lat, place.lng);
      bounds.extend(position);

      const isSelected = place.id === selectedPlaceId;

      // Marker element
      const marker = new window.kakao.maps.Marker({
        position,
        map,
        title: place.name,
      });

      // Info window
      const infowindow = new window.kakao.maps.InfoWindow({
        content: `
          <div style="padding:6px 10px; font-size:12px; font-weight:bold; color:#0f172a; border-radius:8px; white-space:nowrap;">
            ${place.name}
          </div>
        `,
      });

      window.kakao.maps.event.addListener(marker, "click", () => {
        dispatch(setSelectedPlaceId(place.id));
        infowindow.open(map, marker);
      });

      if (isSelected) {
        infowindow.open(map, marker);
      }

      markersRef.current.push(marker);
    });

    if (places.length > 0 && markersRef.current.length > 0) {
      map.setBounds(bounds);
    }
  }, [isSdkLoaded, places, selectedPlaceId, dispatch]);

  // 4. Smooth Pan To selected place
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

  // If Kakao Key is not provided or script errored, use high-fidelity InteractiveMapFallback
  if (!isKeyValid || sdkError) {
    return <InteractiveMapFallback onOpenDetail={onOpenDetail} />;
  }

  return (
    <div className="relative w-full h-full bg-[#0B1120] overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};

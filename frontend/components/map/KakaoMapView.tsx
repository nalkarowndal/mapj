"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import {
  setSelectedPlaceId,
  openSettingsWithTab,
} from "@/store/chatSlice";
import { DISTRICT_DETAILS } from "@/lib/districtData";
import { PlaceInfo } from "@/lib/types";
import { InteractiveMapFallback } from "./InteractiveMapFallback";
import {
  FaExclamationTriangle,
  FaCog,
  FaRedo,
  FaCompass,
  FaPlus,
  FaMinus,
  FaCheckCircle,
  FaCopy,
  FaExternalLinkAlt,
  FaMapMarkedAlt,
  FaLayerGroup,
} from "react-icons/fa";

declare global {
  interface Window {
    kakao: any;
    __kakaoMapLoadingPromise?: Promise<void>;
  }
}

interface KakaoMapViewProps {
  onOpenDetail?: (place: PlaceInfo) => void;
}

export type MapSdkLifecycle =
  | "config_loading"
  | "key_missing"
  | "sdk_loading"
  | "sdk_ready"
  | "map_initializing"
  | "map_ready"
  | "error";

export const KakaoMapView: React.FC<KakaoMapViewProps> = ({ onOpenDetail }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { places, selectedPlaceId, selectedDistrict, settingsStatus, mapReloadTrigger } =
    useSelector((state: RootState) => state.chat);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const kakaoMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowsRef = useRef<any[]>([]);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const [lifecycle, setLifecycle] = useState<MapSdkLifecycle>("config_loading");
  const [activeJsKey, setActiveJsKey] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDiagnostics, setErrorDiagnostics] = useState<string | null>(null);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);
  const [currentDomain, setCurrentDomain] = useState("http://localhost:3000");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";

  // 1. 현재 브라우저 Origin 감지
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentDomain(window.location.origin);
    }
  }, []);

  // 2. 공개 지도 설정 조회 (백엔드 AES-256 저장소 + .env fallback)
  const fetchPublicConfig = useCallback(async () => {
    setLifecycle("config_loading");
    setErrorMessage(null);
    setErrorDiagnostics(null);

    let retrievedKey = "";

    try {
      const res = await fetch(`${apiUrl}/api/settings/public-map-config`);
      if (res.ok) {
        const data = await res.json();
        if (data.kakao_js_key && !data.kakao_js_key.startsWith("your_")) {
          retrievedKey = data.kakao_js_key.trim();
        }
      }
    } catch (err) {
      console.warn("[KakaoMapView] /api/settings/public-map-config 조회 실패, 클라이언트 env 확인:", err);
    }

    if (!retrievedKey) {
      const envKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
      if (envKey && !envKey.startsWith("your_")) {
        retrievedKey = envKey.trim();
      }
    }

    if (retrievedKey) {
      setActiveJsKey(retrievedKey);
      setLifecycle("sdk_loading");
    } else {
      setActiveJsKey("");
      setLifecycle("key_missing");
    }
  }, [apiUrl]);

  useEffect(() => {
    fetchPublicConfig();
  }, [fetchPublicConfig, mapReloadTrigger, settingsStatus?.kakao_js?.is_configured]);

  // 3. 외부 설정 변경 커스텀 이벤트 리스너 (실시간 즉시 반영)
  useEffect(() => {
    const handleConfigChanged = () => {
      fetchPublicConfig();
    };
    window.addEventListener("kakao-map-config-changed", handleConfigChanged);
    return () => {
      window.removeEventListener("kakao-map-config-changed", handleConfigChanged);
    };
  }, [fetchPublicConfig]);

  // 4. 안전한 SDK 스크립트 로더 (중복 로딩 방지, 타임아웃, Promise 초기화)
  useEffect(() => {
    if (lifecycle !== "sdk_loading" || !activeJsKey) return;

    let isCancelled = false;
    let timerId: NodeJS.Timeout | null = null;

    // 이미 window.kakao.maps가 완전히 로드되어 있는 경우
    if (window.kakao && window.kakao.maps) {
      try {
        window.kakao.maps.load(() => {
          if (!isCancelled) {
            setLifecycle("sdk_ready");
            setErrorMessage(null);
          }
        });
        return;
      } catch (err: any) {
        console.warn("[KakaoMapView] 기존 window.kakao 재사용 실패, 재다운로드 시도:", err);
      }
    }

    // 기존 스크립트 제거 및 신규 스크립트 생성
    const existingScript = document.getElementById("kakao-map-sdk") as HTMLScriptElement;
    if (existingScript) {
      existingScript.remove();
    }

    // 타임아웃 설정 (8초)
    timerId = setTimeout(() => {
      if (!isCancelled) {
        setErrorMessage("카카오맵 SDK 다운로드 시간 초과");
        setErrorDiagnostics(
          "네트워크 연결이 지연되었거나, 카카오 지도 SDK 서버 응답이 지연되고 있습니다. 방화벽 또는 네트워크를 확인해 주세요."
        );
        setLifecycle("error");
      }
    }, 8000);

    const script = document.createElement("script");
    script.id = "kakao-map-sdk";
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${activeJsKey}&autoload=false&libraries=services`;
    script.async = true;

    script.onload = () => {
      if (timerId) clearTimeout(timerId);
      if (isCancelled) return;

      if (window.kakao && window.kakao.maps) {
        try {
          window.kakao.maps.load(() => {
            if (!isCancelled) {
              setLifecycle("sdk_ready");
              setErrorMessage(null);
              setErrorDiagnostics(null);
            }
          });
        } catch (initErr: any) {
          if (!isCancelled) {
            setErrorMessage("카카오 SDK 초기화 예외 발생");
            setErrorDiagnostics(initErr?.message || "초기화 함수 load() 호출 중 오류");
            setLifecycle("error");
          }
        }
      } else {
        if (!isCancelled) {
          setErrorMessage("카카오맵 SDK 객체 누락");
          setErrorDiagnostics(
            "스크립트는 수신되었으나 window.kakao.maps 객체가 존재하지 않습니다. JavaScript 키 형식을 확인해 주세요."
          );
          setLifecycle("error");
        }
      }
    };

    script.onerror = () => {
      if (timerId) clearTimeout(timerId);
      if (isCancelled) return;

      setErrorMessage("카카오맵 SDK 스크립트 다운로드 차단됨");
      setErrorDiagnostics(
        `카카오 개발자 콘솔의 [내 애플리케이션] > [앱 설정] > [플랫폼] > [Web]에 현재 접속 주소(${currentDomain})가 등록되어 있지 않거나, 발급받은 JavaScript 키가 올바르지 않습니다.`
      );
      setLifecycle("error");
    };

    document.head.appendChild(script);

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [lifecycle, activeJsKey, currentDomain]);

  // 5. 지도 인스턴스 초기화 (최초 1회만 생성)
  useEffect(() => {
    if (lifecycle !== "sdk_ready" || !mapContainerRef.current || !window.kakao?.maps) return;

    setLifecycle("map_initializing");

    try {
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

      // 카카오 줌 컨트롤 우측 상단 등록
      const zoomControl = new window.kakao.maps.ZoomControl();
      map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

      setLifecycle("map_ready");
      setErrorMessage(null);
    } catch (mapErr: any) {
      console.error("[KakaoMapView] Map 인스턴스 생성 오류:", mapErr);
      setErrorMessage("지도 캔버스 렌더링 실패");
      setErrorDiagnostics(mapErr?.message || "Map 생성자 실행 중 오류가 발생했습니다.");
      setLifecycle("error");
    }
  }, [lifecycle, selectedDistrict]);

  // 6. [Bug 1-10 해결 & 모바일 탭 대응]: ResizeObserver 기반 relayout 자동 실행
  useEffect(() => {
    if (!mapContainerRef.current || !kakaoMapRef.current) return;

    const container = mapContainerRef.current;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          if (kakaoMapRef.current) {
            kakaoMapRef.current.relayout();

            // 중심 좌표 복원
            const targetPlace = places.find((p) => p.id === selectedPlaceId);
            if (targetPlace) {
              const pos = new window.kakao.maps.LatLng(targetPlace.lat, targetPlace.lng);
              kakaoMapRef.current.setCenter(pos);
            } else {
              const dc = DISTRICT_DETAILS[selectedDistrict]?.center;
              if (dc) {
                kakaoMapRef.current.setCenter(new window.kakao.maps.LatLng(dc.lat, dc.lng));
              }
            }
          }
        }
      }
    });

    observer.observe(container);
    resizeObserverRef.current = observer;

    return () => {
      observer.disconnect();
    };
  }, [places, selectedPlaceId, selectedDistrict, lifecycle]);

  // 7. 자치구 변경 시 지도 인스턴스 재생성 없이 부드러운 panTo 이동
  useEffect(() => {
    if (lifecycle !== "map_ready" || !kakaoMapRef.current || !window.kakao?.maps) return;

    const districtCenter = DISTRICT_DETAILS[selectedDistrict]?.center;
    if (districtCenter) {
      const targetLatLng = new window.kakao.maps.LatLng(
        districtCenter.lat,
        districtCenter.lng
      );
      kakaoMapRef.current.panTo(targetLatLng);
    }
  }, [selectedDistrict, lifecycle]);

  // 8. 마커 렌더링 & XSS 완전 방어 DOM InfoWindow
  useEffect(() => {
    if (lifecycle !== "map_ready" || !kakaoMapRef.current || !window.kakao?.maps) return;

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

      // [XSS 방어]: textContent 기반 안전한 DOM 생성
      const infoContainer = document.createElement("div");
      infoContainer.style.padding = "8px 12px";
      infoContainer.style.background = "#17233A";
      infoContainer.style.color = "#FDE047";
      infoContainer.style.borderRadius = "12px";
      infoContainer.style.fontSize = "12px";
      infoContainer.style.fontWeight = "bold";
      infoContainer.style.boxShadow = "0 4px 14px rgba(0,0,0,0.45)";
      infoContainer.style.border = "1px solid rgba(255,255,255,0.18)";
      infoContainer.style.whiteSpace = "nowrap";

      const titleNode = document.createElement("span");
      titleNode.textContent = place.name;
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
        if (onOpenDetail) onOpenDetail(place);
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
  }, [lifecycle, places, selectedPlaceId, dispatch, onOpenDetail]);

  // 9. 선택된 장소 변경 시 패닝
  useEffect(() => {
    if (lifecycle !== "map_ready" || !kakaoMapRef.current || !window.kakao?.maps) return;
    const targetPlace = places.find((p) => p.id === selectedPlaceId);
    if (targetPlace) {
      const moveLatLon = new window.kakao.maps.LatLng(
        targetPlace.lat,
        targetPlace.lng
      );
      kakaoMapRef.current.panTo(moveLatLon);
    }
  }, [lifecycle, selectedPlaceId, places]);

  // 지도 줌 컨트롤 핸들러
  const handleZoom = (delta: number) => {
    if (!kakaoMapRef.current) return;
    const currentLevel = kakaoMapRef.current.getLevel();
    kakaoMapRef.current.setLevel(Math.max(1, Math.min(14, currentLevel + delta)));
  };

  // 현재 구 중심점 리셋 핸들러
  const handleResetCenter = () => {
    if (!kakaoMapRef.current || !window.kakao?.maps) return;
    const dc = DISTRICT_DETAILS[selectedDistrict]?.center;
    if (dc) {
      kakaoMapRef.current.panTo(new window.kakao.maps.LatLng(dc.lat, dc.lng));
      kakaoMapRef.current.setLevel(4);
    }
  };

  // 도메인 복사 핸들러
  const handleCopyDomain = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentDomain);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  // 재시도 핸들러
  const handleRetry = () => {
    setIsFallbackMode(false);
    fetchPublicConfig();
  };

  // 만약 사용자가 명시적으로 대체 벡터 맵을 선택한 경우
  if (isFallbackMode) {
    return (
      <InteractiveMapFallback
        onOpenDetail={onOpenDetail}
        onSwitchToRealMap={() => {
          setIsFallbackMode(false);
          handleRetry();
        }}
      />
    );
  }

  // 1. 설정 로딩 중
  if (lifecycle === "config_loading" || lifecycle === "sdk_loading" || lifecycle === "map_initializing") {
    return (
      <div className="relative w-full h-full bg-[#0B1120] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-400/30 flex items-center justify-center text-blue-400 mb-4 animate-pulse">
          <FaMapMarkedAlt size={22} />
        </div>
        <h4 className="text-sm font-bold text-white mb-1.5">
          {lifecycle === "config_loading"
            ? "지도 API 설정 확인 중..."
            : lifecycle === "sdk_loading"
            ? "카카오 지도 SDK 스크립트 로드 중..."
            : "카카오 지도 캔버스 초기화 중..."}
        </h4>
        <p className="text-xs text-slate-400 max-w-sm">
          실제 도로망, 지형, 건물 타일을 렌더링하기 위해 카카오 공식 지도 엔진을 준비하고 있습니다.
        </p>
      </div>
    );
  }

  // 2. JavaScript 키 미설정 상태 (가짜 원형 배경 대신 친절한 설정 가이드 화면 표시)
  if (lifecycle === "key_missing") {
    return (
      <div className="relative w-full h-full bg-[#0B1120] flex flex-col items-center justify-center p-6 overflow-y-auto select-none">
        <div className="max-w-md w-full bg-[#131B2E] border border-white/10 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-300 flex items-center justify-center mx-auto">
            <FaMapMarkedAlt size={26} />
          </div>

          <div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
              Kakao Maps Web SDK 미설정
            </span>
            <h3 className="text-base font-bold text-white mt-2">
              실제 카카오 지도를 표시하려면 키 설정이 필요합니다
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              현재 카카오 지도 JavaScript Key가 등록되지 않았습니다. 실제 도로·건물·지명 타일과 위성 지도를 로드하려면 키를 등록해 주세요.
            </p>
          </div>

          {/* Web 플랫폼 등록 주소 안내 */}
          <div className="p-3.5 rounded-2xl bg-[#0D111A] border border-white/5 text-left space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-semibold text-slate-400">카카오 개발자 등록 도메인:</span>
              <button
                onClick={handleCopyDomain}
                className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer font-semibold"
              >
                {copiedDomain ? <FaCheckCircle className="text-emerald-400" /> : <FaCopy />}
                <span>{copiedDomain ? "복사 완료" : "주소 복사"}</span>
              </button>
            </div>
            <div className="font-mono text-xs text-[#FDE047] bg-[#17233A] px-3 py-1.5 rounded-xl border border-white/10 truncate">
              {currentDomain}
            </div>
            <p className="text-[11px] text-slate-500">
              * 카카오 개발자 센터 &gt; [내 애플리케이션] &gt; [플랫폼] &gt; [Web]에 위 주소를 등록해야 합니다.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={() => dispatch(openSettingsWithTab("kakao_js"))}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-400/20 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <FaCog size={13} />
              <span>카카오 JavaScript 키 설정하기</span>
            </button>
            <button
              onClick={() => setIsFallbackMode(true)}
              className="py-2.5 px-3.5 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-white/10 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FaLayerGroup size={12} />
              <span>대체 벡터 맵 보기</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. SDK 다운로드 실패 또는 도메인 오류 발생 상태
  if (lifecycle === "error") {
    return (
      <div className="relative w-full h-full bg-[#0B1120] flex flex-col items-center justify-center p-6 overflow-y-auto select-none">
        <div className="max-w-md w-full bg-[#131B2E] border border-red-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center mx-auto">
            <FaExclamationTriangle size={24} />
          </div>

          <div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">
              카카오맵 SDK 로딩 오류
            </span>
            <h3 className="text-base font-bold text-white mt-2">
              {errorMessage || "실제 지도를 불러올 수 없습니다"}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {errorDiagnostics || "카카오 개발자 콘솔의 도메인 설정 또는 키를 확인해 주세요."}
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-[#0D111A] border border-white/5 text-left text-xs text-slate-300 space-y-1">
            <div className="font-semibold text-amber-300 flex items-center gap-1">
              <span>점검 체크리스트:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px]">
              <li>[플랫폼] &gt; [Web]에 등록된 사이트 도메인이 <span className="text-white font-mono">{currentDomain}</span> 인지 확인</li>
              <li>[제품 설정] &gt; [카카오맵]에서 활성화 설정이 ON 상태인지 확인</li>
              <li>REST API 키가 아닌 <span className="text-[#FDE047] font-semibold">JavaScript 키</span>를 입력했는지 확인</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              onClick={handleRetry}
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FaRedo size={12} />
              <span>다시 시도</span>
            </button>
            <button
              onClick={() => dispatch(openSettingsWithTab("kakao_js"))}
              className="py-2.5 px-4 rounded-xl bg-[#1E293B] hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-white/10 transition cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FaCog size={12} />
              <span>설정 열기</span>
            </button>
            <button
              onClick={() => setIsFallbackMode(true)}
              className="py-2.5 px-3 rounded-xl bg-[#17233A] hover:bg-slate-800 text-slate-300 text-xs border border-white/10 transition cursor-pointer flex items-center justify-center gap-1"
            >
              <span>대체 뷰</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. 정상 카카오 지도 렌더링 화면
  return (
    <div className="relative w-full h-full bg-[#0B1120] overflow-hidden select-none">
      {/* 실제 카카오 지도 컨테이너 */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Top Overlay Badge: 카카오맵 정식 연동 안내 */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0D111A]/90 backdrop-blur-md border border-white/15 shadow-xl text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white">Kakao Maps 정식 연동</span>
          <span className="text-[10px] text-slate-400 border-l border-white/15 pl-2">
            [{selectedDistrict}] 실시간 도로/건물 지도
          </span>
        </div>
      </div>

      {/* Floating Action Controls */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        {/* Reset Center */}
        <button
          onClick={handleResetCenter}
          title="현재 구 중심으로 이동"
          aria-label="현재 구 중심으로 이동"
          className="p-2.5 rounded-xl bg-[#0D111A]/90 hover:bg-[#1E293B] text-slate-200 hover:text-[#FDE047] backdrop-blur-md border border-white/15 shadow-xl transition cursor-pointer flex items-center justify-center"
        >
          <FaCompass size={15} />
        </button>

        {/* Custom Zoom Controls */}
        <div className="flex flex-col rounded-xl overflow-hidden bg-[#0D111A]/90 backdrop-blur-md border border-white/15 shadow-xl">
          <button
            onClick={() => handleZoom(-1)}
            title="지도 확대"
            aria-label="지도 확대"
            className="p-2.5 text-slate-200 hover:text-[#FDE047] hover:bg-[#1E293B] border-b border-white/10 transition cursor-pointer flex items-center justify-center"
          >
            <FaPlus size={13} />
          </button>
          <button
            onClick={() => handleZoom(1)}
            title="지도 축소"
            aria-label="지도 축소"
            className="p-2.5 text-slate-200 hover:text-[#FDE047] hover:bg-[#1E293B] transition cursor-pointer flex items-center justify-center"
          >
            <FaMinus size={13} />
          </button>
        </div>
      </div>

      {/* Bottom Place Marker Counter Badge */}
      {places.length > 0 && (
        <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
          <div className="px-3 py-1.5 rounded-xl bg-[#0D111A]/90 backdrop-blur-md border border-white/15 shadow-xl text-xs text-slate-300 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FDE047]" />
            <span className="font-bold text-[#FDE047]">{places.length}개</span>
            <span>추천 장소 마커 표시 중</span>
          </div>
        </div>
      )}
    </div>
  );
};

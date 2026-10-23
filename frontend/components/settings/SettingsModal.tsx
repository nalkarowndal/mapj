"use client";
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import { setSettingsOpen, setSettingsStatus } from "@/store/chatSlice";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import {
  FaRobot,
  FaMapMarkedAlt,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimesCircle,
  FaExternalLinkAlt,
  FaSyncAlt,
  FaTrashAlt,
  FaServer,
  FaInfoCircle,
} from "react-icons/fa";

type SettingsTab = "groq" | "kakao_rest" | "kakao_js" | "system";

export const SettingsModal: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isSettingsOpen, settingsStatus } = useSelector(
    (state: RootState) => state.chat
  );

  const [activeTab, setActiveTab] = useState<SettingsTab>("groq");

  // Form states
  const [groqKeyInput, setGroqKeyInput] = useState("");
  const [groqModelInput, setGroqModelInput] = useState("llama-3.3-70b-versatile");
  const [showGroqKey, setShowGroqKey] = useState(false);

  const [kakaoRestKeyInput, setKakaoRestKeyInput] = useState("");
  const [showKakaoRestKey, setShowKakaoRestKey] = useState(false);

  const [kakaoJsKeyInput, setKakaoJsKeyInput] = useState("");
  const [showKakaoJsKey, setShowKakaoJsKey] = useState(false);

  // Testing & Saving states
  const [isTestingGroq, setIsTestingGroq] = useState(false);
  const [isTestingKakaoRest, setIsTestingKakaoRest] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const [currentDomain, setCurrentDomain] = useState("http://localhost:3000");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentDomain(window.location.origin);
    }
  }, []);

  // Fetch status on open
  const fetchStatus = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/settings/status`);
      if (res.ok) {
        const data = await res.json();
        dispatch(setSettingsStatus(data));
        if (data.groq?.model) {
          setGroqModelInput(data.groq.model);
        }
      }
    } catch (err) {
      console.warn("설정 상태 조회 실패:", err);
    }
  };

  useEffect(() => {
    if (isSettingsOpen) {
      fetchStatus();
      setFeedbackMessage(null);
    }
  }, [isSettingsOpen]);

  // Save credential
  const handleSaveCredential = async (provider: "groq" | "kakao_rest" | "kakao_js") => {
    let keyVal = "";
    let modelVal: string | undefined = undefined;

    if (provider === "groq") {
      keyVal = groqKeyInput.trim();
      modelVal = groqModelInput;
      if (!keyVal && !settingsStatus?.groq?.is_configured) {
        setFeedbackMessage({ type: "error", text: "Groq API 키를 입력해 주세요." });
        return;
      }
    } else if (provider === "kakao_rest") {
      keyVal = kakaoRestKeyInput.trim();
      if (!keyVal && !settingsStatus?.kakao_rest?.is_configured) {
        setFeedbackMessage({ type: "error", text: "카카오 REST API 키를 입력해 주세요." });
        return;
      }
    } else if (provider === "kakao_js") {
      keyVal = kakaoJsKeyInput.trim();
      if (!keyVal && !settingsStatus?.kakao_js?.is_configured) {
        setFeedbackMessage({ type: "error", text: "카카오 JavaScript 키를 입력해 주세요." });
        return;
      }
    }

    try {
      setFeedbackMessage({ type: "info", text: "설정을 저장하고 유효성을 검증하는 중..." });
      const res = await fetch(`${apiUrl}/api/settings/credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          key: keyVal,
          model: modelVal,
        }),
      });

      if (!res.ok) throw new Error("저장 실패");
      const data = await res.json();
      dispatch(setSettingsStatus(data.updated_status));

      if (provider === "groq") setGroqKeyInput("");
      if (provider === "kakao_rest") setKakaoRestKeyInput("");
      if (provider === "kakao_js") setKakaoJsKeyInput("");

      if (data.test_result && !data.test_result.success) {
        setFeedbackMessage({
          type: "error",
          text: `저장되었으나 연결 테스트 실패: ${data.test_result.message}`,
        });
      } else {
        setFeedbackMessage({
          type: "success",
          text: `${provider === "groq" ? "Groq AI" : provider === "kakao_rest" ? "카카오 REST" : "카카오 지도"} 설정이 성공적으로 저장 및 검증되었습니다!`,
        });
      }
    } catch (err) {
      setFeedbackMessage({ type: "error", text: "서버 저장 중 오류가 발생했습니다." });
    }
  };

  // Test connection
  const handleTestConnection = async (provider: "groq" | "kakao_rest") => {
    try {
      if (provider === "groq") setIsTestingGroq(true);
      if (provider === "kakao_rest") setIsTestingKakaoRest(true);
      setFeedbackMessage(null);

      const testKey = provider === "groq" ? groqKeyInput.trim() : kakaoRestKeyInput.trim();
      const testModel = provider === "groq" ? groqModelInput : undefined;

      const res = await fetch(`${apiUrl}/api/settings/test-connection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          key: testKey || undefined,
          model: testModel,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedbackMessage({
          type: "success",
          text: `[연결 성공] ${data.message}`,
        });
      } else {
        setFeedbackMessage({
          type: "error",
          text: `[연결 실패] ${data.message}`,
        });
      }
      fetchStatus();
    } catch (err) {
      setFeedbackMessage({ type: "error", text: "연결 테스트 서버 통신 실패" });
    } finally {
      setIsTestingGroq(false);
      setIsTestingKakaoRest(false);
    }
  };

  // Delete credential
  const handleDeleteCredential = async (provider: "groq" | "kakao_rest" | "kakao_js") => {
    if (!confirm(`정말로 ${provider} 설정을 삭제하시겠습니까?`)) return;

    try {
      const res = await fetch(`${apiUrl}/api/settings/credentials/${provider}`, {
        method: "DELETE",
      });
      if (res.ok) {
        const data = await res.json();
        dispatch(setSettingsStatus(data.updated_status));
        setFeedbackMessage({ type: "info", text: `${provider} 설정이 삭제되었습니다.` });
      }
    } catch (err) {
      setFeedbackMessage({ type: "error", text: "삭제 중 오류가 발생했습니다." });
    }
  };

  const renderStatusBadge = (status?: string) => {
    switch (status) {
      case "connected":
        return (
          <Badge variant="success" size="sm" dot>
            정상 연결됨
          </Badge>
        );
      case "invalid_key":
        return (
          <Badge variant="warning" size="sm" dot>
            인증 실패 (키 확인 필요)
          </Badge>
        );
      case "configured_untested":
        return (
          <Badge variant="primary" size="sm" dot>
            키 설정됨 (미테스트)
          </Badge>
        );
      case "rate_limited":
        return (
          <Badge variant="warning" size="sm" dot>
            이용량 한도 초과 (429)
          </Badge>
        );
      default:
        return (
          <Badge variant="default" size="sm">
            미설정 (로컬 모드)
          </Badge>
        );
    }
  };

  return (
    <Modal
      isOpen={isSettingsOpen}
      onClose={() => dispatch(setSettingsOpen(false))}
      maxWidth="lg"
      title={
        <div className="flex items-center gap-2.5">
          <FaKey className="text-[#FDE047]" />
          <span>API 자격증명 및 서비스 설정</span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <FaServer size={11} className="text-emerald-400" />
            <span>서버 동적 런타임 저장소 연결됨</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => dispatch(setSettingsOpen(false))}
          >
            닫기
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0D111A]/80 rounded-2xl border border-white/5 overflow-x-auto scrollbar-none">
          <button
            onClick={() => {
              setActiveTab("groq");
              setFeedbackMessage(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === "groq"
                ? "bg-[#1E293B] text-[#FDE047] shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FaRobot size={12} />
            <span>Groq AI (LLM)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("kakao_rest");
              setFeedbackMessage(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === "kakao_rest"
                ? "bg-[#1E293B] text-amber-300 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FaKey size={11} />
            <span>카카오 로컬 REST</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("kakao_js");
              setFeedbackMessage(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === "kakao_js"
                ? "bg-[#1E293B] text-blue-400 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FaMapMarkedAlt size={12} />
            <span>카카오 지도 SDK</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("system");
              setFeedbackMessage(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
              activeTab === "system"
                ? "bg-[#1E293B] text-slate-100 shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FaInfoCircle size={12} />
            <span>진단 & 정보</span>
          </button>
        </div>

        {/* Global Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`p-3 rounded-2xl text-xs flex items-center gap-2 border animate-fadeIn ${
              feedbackMessage.type === "success"
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                : feedbackMessage.type === "error"
                ? "bg-red-500/15 text-red-300 border-red-500/30"
                : "bg-blue-500/15 text-blue-300 border-blue-500/30"
            }`}
          >
            {feedbackMessage.type === "success" && <FaCheckCircle size={14} className="shrink-0" />}
            {feedbackMessage.type === "error" && <FaExclamationTriangle size={14} className="shrink-0" />}
            {feedbackMessage.type === "info" && <FaInfoCircle size={14} className="shrink-0" />}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Tab 1: Groq AI */}
        {activeTab === "groq" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#0D111A]/60 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">Groq AI API Key</h4>
                  <p className="text-xs text-slate-400">
                    초고속 Llama 3.3 대화 추론을 위한 키 (서버 측 암호화 저장)
                  </p>
                </div>
                {renderStatusBadge(settingsStatus?.groq?.status)}
              </div>

              {settingsStatus?.groq?.masked_key && (
                <div className="text-xs font-mono bg-[#17233A] px-3 py-1.5 rounded-xl border border-white/10 text-slate-300 flex items-center justify-between">
                  <span>등록된 키: {settingsStatus.groq.masked_key}</span>
                  <button
                    onClick={() => handleDeleteCredential("groq")}
                    className="text-red-400 hover:text-red-300 text-[11px] font-sans flex items-center gap-1 cursor-pointer"
                  >
                    <FaTrashAlt size={10} />
                    <span>삭제</span>
                  </button>
                </div>
              )}

              <div className="relative">
                <input
                  type={showGroqKey ? "text" : "password"}
                  value={groqKeyInput}
                  onChange={(e) => setGroqKeyInput(e.target.value)}
                  placeholder={
                    settingsStatus?.groq?.is_configured
                      ? "새로운 키를 입력하여 변경..."
                      : "gsk_..."
                  }
                  className="w-full bg-[#17233A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FDE047]/60 pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowGroqKey(!showGroqKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showGroqKey ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              </div>

              {/* Model Select */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  사용할 AI 모델 선택
                </label>
                <select
                  value={groqModelInput}
                  onChange={(e) => setGroqModelInput(e.target.value)}
                  className="w-full bg-[#17233A] border border-white/10 rounded-xl px-3 py-2 text-xs text-[#FDE047] font-semibold focus:outline-none focus:border-[#FDE047]/60 cursor-pointer"
                >
                  {settingsStatus?.groq?.supported_models?.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#17233A] text-white">
                      {m.name}
                    </option>
                  )) || (
                    <option value="llama-3.3-70b-versatile">
                      Llama 3.3 70B Versatile (기본 추천)
                    </option>
                  )}
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => handleSaveCredential("groq")}
                >
                  저장 및 적용
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isTestingGroq}
                  leftIcon={<FaSyncAlt size={10} />}
                  onClick={() => handleTestConnection("groq")}
                >
                  연결 상태 테스트
                </Button>
                <a
                  href="https://console.groq.com/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                >
                  <span>키 무료 발급</span>
                  <FaExternalLinkAlt size={10} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Kakao REST */}
        {activeTab === "kakao_rest" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#0D111A]/60 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">카카오 로컬 REST API Key</h4>
                  <p className="text-xs text-slate-400">
                    실시간 최신 매장 및 신규 장소 검색용 키 (서버 측 전용 관리)
                  </p>
                </div>
                {renderStatusBadge(settingsStatus?.kakao_rest?.status)}
              </div>

              {settingsStatus?.kakao_rest?.masked_key && (
                <div className="text-xs font-mono bg-[#17233A] px-3 py-1.5 rounded-xl border border-white/10 text-slate-300 flex items-center justify-between">
                  <span>등록된 키: {settingsStatus.kakao_rest.masked_key}</span>
                  <button
                    onClick={() => handleDeleteCredential("kakao_rest")}
                    className="text-red-400 hover:text-red-300 text-[11px] font-sans flex items-center gap-1 cursor-pointer"
                  >
                    <FaTrashAlt size={10} />
                    <span>삭제</span>
                  </button>
                </div>
              )}

              <div className="relative">
                <input
                  type={showKakaoRestKey ? "text" : "password"}
                  value={kakaoRestKeyInput}
                  onChange={(e) => setKakaoRestKeyInput(e.target.value)}
                  placeholder={
                    settingsStatus?.kakao_rest?.is_configured
                      ? "새로운 REST API 키를 입력하여 변경..."
                      : "REST API Key 입력..."
                  }
                  className="w-full bg-[#17233A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FDE047]/60 pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKakaoRestKey(!showKakaoRestKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showKakaoRestKey ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => handleSaveCredential("kakao_rest")}
                >
                  저장 및 적용
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  isLoading={isTestingKakaoRest}
                  leftIcon={<FaSyncAlt size={10} />}
                  onClick={() => handleTestConnection("kakao_rest")}
                >
                  연결 상태 테스트
                </Button>
                <a
                  href="https://developers.kakao.com/console/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                >
                  <span>카카오 개발자 콘솔</span>
                  <FaExternalLinkAlt size={10} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Kakao Maps JS SDK */}
        {activeTab === "kakao_js" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#0D111A]/60 border border-white/5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-sm text-white">카카오 지도 JavaScript Key</h4>
                  <p className="text-xs text-slate-400">
                    브라우저에서 정식 카카오맵 로드뷰/위성지도를 렌더링하기 위한 공개 키
                  </p>
                </div>
                {renderStatusBadge(
                  settingsStatus?.kakao_js?.is_configured ? "connected" : "unconfigured"
                )}
              </div>

              {settingsStatus?.kakao_js?.masked_key && (
                <div className="text-xs font-mono bg-[#17233A] px-3 py-1.5 rounded-xl border border-white/10 text-slate-300 flex items-center justify-between">
                  <span>등록된 키: {settingsStatus.kakao_js.masked_key}</span>
                  <button
                    onClick={() => handleDeleteCredential("kakao_js")}
                    className="text-red-400 hover:text-red-300 text-[11px] font-sans flex items-center gap-1 cursor-pointer"
                  >
                    <FaTrashAlt size={10} />
                    <span>삭제</span>
                  </button>
                </div>
              )}

              <div className="relative">
                <input
                  type={showKakaoJsKey ? "text" : "password"}
                  value={kakaoJsKeyInput}
                  onChange={(e) => setKakaoJsKeyInput(e.target.value)}
                  placeholder={
                    settingsStatus?.kakao_js?.is_configured
                      ? "새로운 JavaScript 키를 입력하여 변경..."
                      : "JavaScript Key 입력..."
                  }
                  className="w-full bg-[#17233A] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FDE047]/60 pr-10 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKakaoJsKey(!showKakaoJsKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showKakaoJsKey ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                </button>
              </div>

              {/* Domain Guide Box */}
              <div className="p-3 rounded-xl bg-[#17233A] border border-blue-400/20 text-xs space-y-1.5">
                <div className="font-bold text-blue-300 flex items-center gap-1.5">
                  <FaInfoCircle />
                  <span>웹 플랫폼 도메인 등록 필수 안내</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  카카오 개발자 센터의 [내 애플리케이션] &gt; [앱 설정] &gt; [플랫폼] &gt; [Web]에
                  아래 주소가 등록되어 있어야 지도가 정상 로드됩니다.
                </p>
                <div className="font-mono bg-[#0D111A] px-2.5 py-1 rounded text-[#FDE047] text-[11px]">
                  {currentDomain}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  variant="accent"
                  size="sm"
                  onClick={() => handleSaveCredential("kakao_js")}
                >
                  저장 및 지도 SDK 적용
                </Button>
                <a
                  href="https://developers.kakao.com/console/app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold"
                >
                  <span>플랫폼 등록하기</span>
                  <FaExternalLinkAlt size={10} />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: System Diagnostics */}
        {activeTab === "system" && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-[#0D111A]/60 border border-white/5 space-y-3 text-xs">
              <h4 className="font-bold text-sm text-white">시스템 가동 모드 및 상태</h4>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-xl bg-[#17233A] border border-white/5">
                  <span className="text-slate-400 block text-[11px]">현재 동작 모드</span>
                  <span className="font-bold text-white text-sm mt-0.5 block">
                    {settingsStatus?.operational_mode === "live_api"
                      ? "⚡ 실시간 공인 API 모드"
                      : "🛡️ 검증 로컬 참고 모드"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#17233A] border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Groq 활성 모델</span>
                  <span className="font-bold text-[#FDE047] text-xs mt-0.5 block truncate">
                    {settingsStatus?.groq?.model || "Llama 3.3 70B"}
                  </span>
                </div>
              </div>

              <p className="text-slate-400 leading-relaxed text-[11px]">
                API 키가 없거나 외부 통신이 원활하지 않을 때에도, 본 시스템은 서울 동북 5개 자치구의
                검증된 로컬 데이터베이스를 바탕으로 안전하고 일관된 장소 추천과 인터랙티브 벡터 지도를 제공합니다.
              </p>

              <div className="pt-2 flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<FaSyncAlt size={10} />}
                  onClick={fetchStatus}
                >
                  상태 새로고침
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

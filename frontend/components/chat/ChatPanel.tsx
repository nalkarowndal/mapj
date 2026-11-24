"use client";
import React, { useRef, useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "@/store/store";
import {
  setInputText,
  setIsLoading,
  setLoadingStep,
  setShowMap,
  addMessage,
  setPlaces,
  setSelectedPlaceId,
} from "@/store/chatSlice";
import { ChatMessageItem } from "./ChatMessageItem";
import { ChatInputArea } from "./ChatInputArea";
import { QuickPromptChips } from "./QuickPromptChips";
import { ChatStatusIndicator } from "./ChatStatusIndicator";
import { FaArrowDown, FaUtensils } from "react-icons/fa";

export const ChatPanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    messages,
    inputText,
    isLoading,
    loadingStep,
    selectedDistrict,
    activeCategory,
    requestNonce,
  } = useSelector((state: RootState) => state.chat);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleScroll = useCallback(() => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollBottomBtn(!isNearBottom);
  }, []);

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  useEffect(() => {
    if (!showScrollBottomBtn) {
      scrollToBottom("smooth");
    }
  }, [messages, isLoading, showScrollBottomBtn]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isLoading) return;

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const capturedNonce = requestNonce;
    const userMessageId = `user-${Date.now()}`;

    dispatch(
      addMessage({
        id: userMessageId,
        text: textToSend,
        sender: "user",
        timestamp: Date.now(),
        district: selectedDistrict,
      })
    );
    dispatch(setInputText(""));
    dispatch(setIsLoading(true));
    dispatch(setLoadingStep(`${selectedDistrict} 미식 데이터베이스 및 메뉴 분석 중...`));

    const history = messages.slice(-6).map((m) => ({
      role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.text,
    }));

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortController.signal,
        body: JSON.stringify({
          message: textToSend,
          district: selectedDistrict,
          category: activeCategory !== "전체" ? activeCategory : undefined,
          history,
        }),
      });

      if (capturedNonce !== requestNonce) {
        return;
      }

      if (!response.ok) {
        throw new Error(`서버 응답 오류 (상태코드: ${response.status})`);
      }

      dispatch(setLoadingStep("미식 에디터 추천 카드 및 지도 마커 연동 중..."));
      const data = await response.json();

      if (capturedNonce !== requestNonce) return;

      const aiMessageId = `ai-${Date.now()}`;
      dispatch(
        addMessage({
          id: aiMessageId,
          text: data.reply,
          sender: "ai",
          timestamp: Date.now(),
          is_demo: data.is_demo,
          places: data.places,
          district: data.district,
        })
      );

      if (typeof data.show_map === "boolean" && data.show_map) {
        dispatch(setShowMap(true));
      }
      if (Array.isArray(data.places) && data.places.length > 0) {
        dispatch(setPlaces(data.places));
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        return;
      }

      if (capturedNonce !== requestNonce) return;

      console.error("통신 에러:", error);
      const errorMessageId = `err-${Date.now()}`;
      dispatch(
        addMessage({
          id: errorMessageId,
          text: `⚠️ **AI 미식 서버 연결 실패**: 백엔드 서버와의 통신에 실패했습니다.\n\n좌측의 **${selectedDistrict} 대표 맛집 큐레이션 카드**는 오프라인에서도 바로 탐색하실 수 있으며, AI 대화를 위해 서버 상태를 확인해 주세요.`,
          sender: "ai",
          timestamp: Date.now(),
          status: "error",
          canRetry: true,
        })
      );
    } finally {
      if (capturedNonce === requestNonce) {
        dispatch(setIsLoading(false));
      }
    }
  };

  const handleSelectPlace = (placeId: string) => {
    dispatch(setSelectedPlaceId(placeId));
    dispatch(setShowMap(true));
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F172A]/60 relative">
      {/* Compact Concierge Header Banner */}
      <div className="px-4 py-2 bg-[#141E33]/90 border-b border-white/10 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-lg bg-amber-400/20 text-[#FDE047] flex items-center justify-center text-xs">
            <FaUtensils size={11} />
          </span>
          <span className="text-xs font-extrabold text-white">
            AI 미식 소믈리에 & 맛집 컨시어지
          </span>
        </div>
        <span className="text-[11px] text-amber-300/90 font-semibold">
          {selectedDistrict} 맞춤 추천
        </span>
      </div>

      {/* Scrollable Messages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5"
      >
        {messages.length <= 1 && (
          <QuickPromptChips onSelectPrompt={(prompt) => handleSendQuery(prompt)} />
        )}

        {messages.map((msg) => (
          <ChatMessageItem
            key={msg.id}
            message={msg}
            onSelectPlace={handleSelectPlace}
            onRetry={
              msg.canRetry && messages[messages.length - 1]?.id === msg.id
                ? () => {
                    const lastUserMsg = [...messages]
                      .reverse()
                      .find((m) => m.sender === "user");
                    if (lastUserMsg) {
                      handleSendQuery(lastUserMsg.text);
                    }
                  }
                : undefined
            }
          />
        ))}

        {isLoading && <ChatStatusIndicator step={loadingStep} />}
      </div>

      {showScrollBottomBtn && (
        <button
          onClick={() => scrollToBottom("smooth")}
          aria-label="최신 메시지로 스크롤"
          className="absolute bottom-24 right-5 z-20 w-8 h-8 rounded-full bg-[#1E293B] hover:bg-slate-700 text-[#FDE047] border border-white/15 shadow-xl flex items-center justify-center transition-all cursor-pointer animate-bounce"
        >
          <FaArrowDown size={12} />
        </button>
      )}

      <ChatInputArea
        value={inputText}
        onChange={(val) => dispatch(setInputText(val))}
        onSend={() => handleSendQuery()}
        isLoading={isLoading}
        placeholder={`[${selectedDistrict}] 오늘 끌리는 메뉴, 노포, 데이트 맛집을 물어보세요...`}
      />
    </div>
  );
};

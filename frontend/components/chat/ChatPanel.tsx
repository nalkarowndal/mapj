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
import { FaArrowDown } from "react-icons/fa";

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

  // [Bug 1-5 해결]: 요청 취소 및 비동기 경쟁 상태 방지용 AbortController
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

  // 언마운트 시 진행 중인 요청 취소
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // [Bug 1-5 & 1-6 해결]: 실시간 네트워크 상태 연결 및 이전 요청 안전 취소
  const handleSendQuery = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isLoading) return;

    // 이전 비동기 요청 취소
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
    dispatch(setLoadingStep("질문 전송 및 지역 탐색 분석 중..."));

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

      // 요청 도중 지역이 바뀌었거나 세션이 전환된 경우 응답 폐기
      if (capturedNonce !== requestNonce) {
        console.warn("지역/세션 변경으로 인해 이전 요청 결과를 안전하게 폐기합니다.");
        return;
      }

      if (!response.ok) {
        throw new Error(`서버 응답 오류 (상태코드: ${response.status})`);
      }

      dispatch(setLoadingStep("추천 정보 정리 및 답변 렌더링 중..."));
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

      if (typeof data.show_map === "boolean") {
        dispatch(setShowMap(data.show_map));
      }
      if (Array.isArray(data.places) && data.places.length > 0) {
        dispatch(setPlaces(data.places));
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("사용자 요청에 의해 이전 비동기 작업이 취소되었습니다.");
        return;
      }

      if (capturedNonce !== requestNonce) return;

      console.error("통신 에러:", error);
      const errorMessageId = `err-${Date.now()}`;
      dispatch(
        addMessage({
          id: errorMessageId,
          text: `⚠️ **서버 연결 실패**: 백엔드 서버와의 통신에 실패했습니다.\n\n다시 시도하시거나 상단 **설정** 메뉴에서 API 연결 상태를 점검해 주세요.`,
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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F172A]/40 relative">
      {/* Scrollable Messages Area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-5"
      >
        {/* Quick Prompts on initial conversation */}
        {messages.length <= 1 && (
          <QuickPromptChips onSelectPrompt={(prompt) => handleSendQuery(prompt)} />
        )}

        {/* Message Bubble List */}
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

        {/* Loading Indicator with Real Steps */}
        {isLoading && <ChatStatusIndicator step={loadingStep} />}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottomBtn && (
        <button
          onClick={() => scrollToBottom("smooth")}
          aria-label="최신 메시지로 스크롤"
          className="absolute bottom-24 right-5 sm:right-6 z-20 w-9 h-9 rounded-full bg-[#1E293B] hover:bg-slate-700 text-[#FDE047] border border-white/15 shadow-xl flex items-center justify-center transition-all cursor-pointer animate-bounce"
        >
          <FaArrowDown size={13} />
        </button>
      )}

      {/* Input Form Area */}
      <ChatInputArea
        value={inputText}
        onChange={(val) => dispatch(setInputText(val))}
        onSend={() => handleSendQuery()}
        isLoading={isLoading}
        placeholder={`[${selectedDistrict}] 맛집, 카페, 학원, 문화시설을 물어보세요...`}
      />
    </div>
  );
};

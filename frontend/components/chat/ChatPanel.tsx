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
    places,
  } = useSelector((state: RootState) => state.chat);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);

  // Check scroll position to decide whether to show "Scroll to bottom" button
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
    // If near bottom, auto scroll on new message or status change
    if (!showScrollBottomBtn) {
      scrollToBottom("smooth");
    }
  }, [messages, isLoading, showScrollBottomBtn]);

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = (queryText || inputText).trim();
    if (!textToSend || isLoading) return;

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
    dispatch(setLoadingStep("질문 의도 및 자치구 분석 중..."));

    // Prepare multi-turn history
    const history = messages.slice(-6).map((m) => ({
      role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant",
      content: m.text,
    }));

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      setTimeout(() => {
        dispatch(setLoadingStep("실존 검증 장소 및 카카오 로컬 검색 중..."));
      }, 300);

      setTimeout(() => {
        dispatch(setLoadingStep("AI 지역 맞춤 추천 답변 정리 중..."));
      }, 600);

      const response = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          district: selectedDistrict,
          category: activeCategory !== "전체" ? activeCategory : undefined,
          history,
        }),
      });

      if (!response.ok) {
        throw new Error(`서버 응답 오류 (상태코드: ${response.status})`);
      }

      const data = await response.json();
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
    } catch (error) {
      console.error("통신 에러:", error);
      const errorMessageId = `err-${Date.now()}`;
      dispatch(
        addMessage({
          id: errorMessageId,
          text: `⚠️ **서버 통신 실패**: 백엔드 서버(포트 8000)와의 연결을 확인해 주세요.\n\n*잠시 후 다시 시도해 주시기 바랍니다.*`,
          sender: "ai",
          timestamp: Date.now(),
          status: "error",
        })
      );
    } finally {
      dispatch(setIsLoading(false));
      setTimeout(() => scrollToBottom("smooth"), 100);
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
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
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
          />
        ))}

        {/* Loading Indicator */}
        {isLoading && <ChatStatusIndicator step={loadingStep} />}
      </div>

      {/* Floating Scroll to Bottom Button */}
      {showScrollBottomBtn && (
        <button
          onClick={() => scrollToBottom("smooth")}
          aria-label="최신 메시지로 스크롤"
          className="absolute bottom-24 right-6 z-20 w-9 h-9 rounded-full bg-[#1E293B] hover:bg-slate-700 text-[#FDE047] border border-white/15 shadow-xl flex items-center justify-center transition-all cursor-pointer animate-bounce"
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

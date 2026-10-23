"use client";
import React from "react";
import { FaRobot } from "react-icons/fa";

interface ChatStatusIndicatorProps {
  step?: string;
}

export const ChatStatusIndicator: React.FC<ChatStatusIndicatorProps> = ({
  step = "최적의 장소 및 정보 분석 중...",
}) => {
  return (
    <div className="flex items-start gap-3 justify-start animate-fadeIn">
      <div className="w-9 h-9 rounded-2xl bg-[#1E293B] border border-white/10 flex items-center justify-center shrink-0 text-[#FDE047] shadow-md">
        <FaRobot size={16} />
      </div>
      <div className="bg-[#17233A]/90 backdrop-blur-md px-4 py-3 rounded-2xl rounded-tl-none shadow-md flex items-center gap-2.5 border border-white/10">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 bg-[#FDE047] rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-2 h-2 bg-[#FDE047] rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-2 h-2 bg-[#FDE047] rounded-full animate-bounce" />
        </div>
        <span className="text-xs text-slate-300 font-medium">{step}</span>
      </div>
    </div>
  );
};

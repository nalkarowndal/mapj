"use client";
import React from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";
import { DISTRICT_DETAILS } from "@/lib/districtData";
import { FaLightbulb, FaArrowRight } from "react-icons/fa";

interface QuickPromptChipsProps {
  onSelectPrompt: (prompt: string) => void;
}

export const QuickPromptChips: React.FC<QuickPromptChipsProps> = ({ onSelectPrompt }) => {
  const { selectedDistrict } = useSelector((state: RootState) => state.chat);
  const districtData = DISTRICT_DETAILS[selectedDistrict];

  if (!districtData) return null;

  return (
    <div className="p-4 sm:p-6 bg-[#131B2E]/60 border border-white/5 rounded-2xl mb-4 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-amber-400/20 text-[#FDE047] flex items-center justify-center text-xs">
          <FaLightbulb />
        </div>
        <h3 className="text-xs font-bold text-slate-300">
          [{selectedDistrict}] 맞춤 추천 질문
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {districtData.prompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => onSelectPrompt(prompt)}
            className="flex items-center justify-between p-3 rounded-xl bg-[#17233A]/80 hover:bg-[#1E2E4E] border border-white/10 hover:border-[#FDE047]/40 text-left text-xs text-slate-200 hover:text-white transition group cursor-pointer shadow-sm"
          >
            <span className="truncate pr-2">{prompt}</span>
            <FaArrowRight
              size={10}
              className="text-slate-500 group-hover:text-[#FDE047] group-hover:translate-x-0.5 transition shrink-0"
            />
          </button>
        ))}
      </div>
    </div>
  );
};

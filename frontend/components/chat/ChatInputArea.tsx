"use client";
import React, { useRef, useEffect } from "react";
import { FaPaperPlane } from "react-icons/fa";

interface ChatInputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  placeholder?: string;
  maxLength?: number;
}

export const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  value,
  onChange,
  onSend,
  isLoading,
  placeholder = "메시지를 입력하세요...",
  maxLength = 500,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        140
      )}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Prevent submission during Korean IME composition
    if (e.nativeEvent.isComposing) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!isLoading && value.trim()) {
        onSend();
      }
    }
  };

  const isSendDisabled = isLoading || !value.trim();

  return (
    <div className="p-3 sm:p-4 bg-[#131B2E]/90 backdrop-blur-xl border-t border-white/10 shrink-0">
      <div className="relative flex items-end gap-2 bg-[#0D111A]/90 border border-white/10 rounded-2xl p-2 focus-within:border-[#FDE047]/60 focus-within:ring-2 focus-within:ring-[#FDE047]/20 transition-all shadow-inner">
        {/* Multiline auto-expanding textarea */}
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          maxLength={maxLength}
          placeholder={placeholder}
          aria-label="채팅 메시지 입력"
          className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none max-h-36 overflow-y-auto leading-relaxed scrollbar-thin"
        />

        {/* Character count & Submit Button */}
        <div className="flex items-center gap-2 pb-1 pr-1 shrink-0">
          {value.length > 300 && (
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
              {value.length}/{maxLength}
            </span>
          )}

          <button
            onClick={onSend}
            disabled={isSendDisabled}
            aria-label="메시지 전송"
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95 ${
              isSendDisabled
                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                : "bg-[#FDE047] hover:bg-[#FACC15] text-slate-950 font-bold shadow-amber-400/20"
            }`}
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <FaPaperPlane size={13} />
            )}
          </button>
        </div>
      </div>
      <div className="flex justify-between items-center px-1 mt-1.5 text-[11px] text-slate-400">
        <span className="hidden sm:inline">
          <kbd className="px-1.5 py-0.5 bg-slate-800/80 rounded border border-white/10 font-mono text-[10px]">
            Enter
          </kbd>{" "}
          전송 ·{" "}
          <kbd className="px-1.5 py-0.5 bg-slate-800/80 rounded border border-white/10 font-mono text-[10px]">
            Shift+Enter
          </kbd>{" "}
          줄바꿈
        </span>
        <span className="sm:hidden text-[10px]">전송 버튼을 눌러 질문하세요</span>
        <span className="text-slate-400 text-[10px]">실존 검증 장소 매칭</span>
      </div>
    </div>
  );
};

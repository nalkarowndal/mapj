"use client";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ChatMessage } from "@/lib/types";
import { FaRobot, FaUser, FaCopy, FaCheck, FaMapMarkerAlt } from "react-icons/fa";

interface ChatMessageItemProps {
  message: ChatMessage;
  onSelectPlace?: (placeId: string) => void;
}

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onSelectPlace,
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.sender === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("복사 실패:", err);
    }
  };

  return (
    <div
      className={`flex items-start gap-3 ${
        isUser ? "flex-row-reverse" : "flex-row"
      } group animate-fadeIn`}
    >
      {/* Avatar */}
      <div
        className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 text-sm shadow-md border ${
          isUser
            ? "bg-blue-600/30 text-blue-300 border-blue-400/30"
            : "bg-[#1E293B] text-[#FDE047] border-white/10"
        }`}
      >
        {isUser ? <FaUser size={13} /> : <FaRobot size={16} />}
      </div>

      {/* Message Bubble Container */}
      <div
        className={`flex flex-col max-w-[85%] sm:max-w-[78%] ${
          isUser ? "items-end" : "items-start"
        }`}
      >
        <div
          className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg backdrop-blur-md border ${
            isUser
              ? "bg-[#2563EB] text-white rounded-tr-none border-blue-400/30 shadow-blue-900/20"
              : "bg-[#17233A]/90 text-slate-100 rounded-tl-none border-white/10 shadow-slate-950/30"
          }`}
        >
          {/* Action buttons (Copy) for AI messages */}
          {!isUser && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                title={copied ? "복사됨!" : "답변 복사"}
                aria-label="답변 복사"
                className="p-1.5 rounded-lg bg-[#1E293B] hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer shadow-sm border border-white/10"
              >
                {copied ? <FaCheck size={11} className="text-emerald-400" /> : <FaCopy size={11} />}
              </button>
            </div>
          )}

          {/* Markdown Content */}
          <div className="prose prose-invert prose-sm max-w-none text-slate-100 break-words leading-relaxed space-y-2 [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-[#FDE047] [&_h4]:text-xs [&_h4]:font-bold [&_h4]:text-blue-300 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_a]:text-blue-400 [&_a]:underline [&_p]:my-1">
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
              }}
            >
              {message.text}
            </ReactMarkdown>
          </div>

          {/* Attached places quick badges if present */}
          {message.places && message.places.length > 0 && (
            <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap gap-1.5">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 w-full mb-0.5">
                <FaMapMarkerAlt size={10} className="text-blue-400" />
                관련 추천 장소:
              </span>
              {message.places.map((place) => (
                <button
                  key={place.id}
                  onClick={() => onSelectPlace?.(place.id)}
                  className="px-2.5 py-1 rounded-xl bg-[#1E293B] hover:bg-blue-600/30 text-[11px] text-[#FDE047] hover:text-white border border-white/10 hover:border-blue-400/40 transition cursor-pointer flex items-center gap-1"
                >
                  <span>{place.name}</span>
                  <span className="text-[10px] text-slate-400">({place.category})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        {message.timestamp && (
          <span className="text-[10px] text-slate-500 mt-1 px-1">
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
    </div>
  );
};

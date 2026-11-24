"use client";
import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  ariaLabel?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "md",
  ariaLabel = "대화상자",
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      document.body.style.overflow = "hidden";

      setTimeout(() => {
        closeBtnRef.current?.focus();
      }, 40);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
          return;
        }

        if (e.key === "Tab" && modalRef.current) {
          const focusableElements =
            modalRef.current.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      };

      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "unset";
        window.removeEventListener("keydown", handleKeyDown);
        previousFocusRef.current?.focus?.();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === "string" ? title : ariaLabel}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#252622]/45"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`w-full ${maxWidthStyles[maxWidth]} bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[16px] shadow-[var(--shadow-popover)] overflow-hidden flex flex-col max-h-[90vh] text-[var(--text-primary)]`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border-default)] bg-[var(--bg-main)] shrink-0">
          <div className="font-editorial font-semibold text-lg text-[var(--text-primary)] truncate pr-2">
            {title}
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-[8px] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 text-[15px] leading-relaxed">
          {children}
        </div>

        {footer && (
          <div className="px-5 sm:px-6 py-3.5 border-t border-[var(--border-default)] bg-[var(--bg-main)] flex justify-end items-center gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

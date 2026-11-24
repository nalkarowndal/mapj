"use client";
import React from "react";

export interface FilterChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  count?: number;
  icon?: React.ReactNode;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  children,
  selected = false,
  count,
  icon,
  className = "",
  ...props
}) => {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[38px] rounded-full text-[14px] font-medium whitespace-nowrap transition-colors cursor-pointer border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] ${
        selected
          ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
          : "bg-[var(--bg-surface)] text-[var(--text-primary)] border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-subtle)]"
      } ${className}`}
      {...props}
    >
      {icon && (
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      )}
      <span>{children}</span>
      {typeof count === "number" && (
        <span
          className={`text-[12px] ${
            selected ? "text-white/80" : "text-[var(--text-muted)]"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
};


import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "accent" | "success" | "warning" | "subtle";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "sm",
  dot = false,
  className = "",
}) => {
  const sizeStyles = {
    sm: "text-[12px] px-2.5 py-0.5 gap-1.5",
    md: "text-[13px] px-3 py-1 gap-1.5",
  };

  const variantStyles = {
    default:
      "bg-[var(--bg-subtle)] text-[var(--text-secondary)] border border-[var(--border-default)]",
    subtle:
      "bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-default)]",
    primary:
      "bg-[var(--brand-primary)] text-white border border-transparent",
    accent:
      "bg-[var(--brand-accent-soft)] text-[var(--brand-accent-text)] border border-[#B65C37]/25",
    success:
      "bg-[var(--status-open-bg)] text-[var(--status-open)] border border-[#246142]/20",
    warning:
      "bg-[var(--status-warn-bg)] text-[var(--status-warn)] border border-[#8A5612]/20",
  };

  const dotColors = {
    default: "bg-[var(--text-muted)]",
    subtle: "bg-[var(--text-muted)]",
    primary: "bg-white",
    accent: "bg-[var(--brand-accent)]",
    success: "bg-[var(--status-open)]",
    warning: "bg-[var(--status-warn)]",
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full whitespace-nowrap leading-snug ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {dot && (
        <span
          aria-hidden="true"
          className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`}
        />
      )}
      {children}
    </span>
  );
};

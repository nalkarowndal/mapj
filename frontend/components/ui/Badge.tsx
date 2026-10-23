import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "primary" | "accent" | "success" | "warning" | "outline";
  size?: "sm" | "md";
  dot?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "sm",
  dot = false,
  className = "",
  ...props
}) => {
  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5 rounded-lg gap-1",
    md: "text-xs px-2.5 py-1 rounded-xl gap-1.5",
  };

  const variantStyles = {
    default: "bg-[#1E293B] text-slate-300 border border-white/10",
    primary: "bg-blue-500/15 text-blue-300 border border-blue-400/25",
    accent: "bg-amber-400/15 text-[#FDE047] border border-amber-300/25",
    success: "bg-emerald-500/15 text-emerald-300 border border-emerald-400/25",
    warning: "bg-amber-500/15 text-amber-300 border border-amber-400/25",
    outline: "bg-transparent text-slate-300 border border-white/15",
  };

  const dotColors = {
    default: "bg-slate-400",
    primary: "bg-blue-400",
    accent: "bg-[#FDE047]",
    success: "bg-emerald-400",
    warning: "bg-amber-400",
    outline: "bg-slate-300",
  };

  return (
    <span
      className={`inline-flex items-center font-medium tracking-tight ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

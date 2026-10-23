import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "glass" | "interactive";
  selected?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, variant = "glass", selected = false, className = "", ...props }, ref) => {
    const baseStyles = "rounded-2xl transition-all duration-200 border";

    const variantStyles = {
      default: "bg-[#17233A] border-white/10 text-slate-200",
      elevated: "bg-[#1E293B] border-white/15 shadow-xl text-slate-100",
      glass: "bg-[#17233A]/70 backdrop-blur-xl border-white/10 shadow-lg text-slate-200",
      interactive:
        "bg-[#17233A]/70 backdrop-blur-xl border-white/10 hover:border-white/25 hover:bg-[#1A2842]/80 hover:shadow-xl cursor-pointer text-slate-200 hover:-translate-y-0.5",
    };

    const selectedStyle = selected
      ? "ring-2 ring-[#FDE047] border-[#FDE047]/60 bg-[#1D2B4A]/90 shadow-amber-400/10 shadow-lg"
      : "";

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${selectedStyle} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

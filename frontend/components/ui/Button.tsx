import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-semibold transition-all duration-200 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B1120] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]";

    const sizeStyles = {
      sm: "text-xs px-3 py-1.5 rounded-xl gap-1.5",
      md: "text-sm px-4 py-2.5 rounded-xl gap-2",
      lg: "text-base px-6 py-3 rounded-2xl gap-2.5",
    };

    const variantStyles = {
      primary:
        "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/25 focus-visible:ring-blue-400 border border-blue-500/30",
      accent:
        "bg-[#FDE047] hover:bg-[#FACC15] text-slate-950 font-bold shadow-lg shadow-amber-400/20 focus-visible:ring-amber-300 border border-amber-300/30",
      secondary:
        "bg-[#1E293B] hover:bg-[#334155] text-slate-200 focus-visible:ring-slate-400 border border-white/10 shadow-sm",
      outline:
        "bg-transparent hover:bg-white/5 text-slate-200 border border-white/15 focus-visible:ring-slate-400",
      ghost:
        "bg-transparent hover:bg-white/10 text-slate-300 hover:text-white focus-visible:ring-slate-400",
      danger:
        "bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 focus-visible:ring-red-400",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";

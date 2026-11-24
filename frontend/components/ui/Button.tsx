import React from "react";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
      "inline-flex items-center justify-center font-medium transition-colors duration-150 select-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-accent)] disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none";

    const sizeStyles = {
      sm: "text-[13px] px-3.5 py-2 rounded-[8px] gap-1.5 min-h-[36px]",
      md: "text-[15px] px-5 py-2.5 rounded-[10px] gap-2 min-h-[44px]",
      lg: "text-[16px] px-6 py-3 rounded-[12px] gap-2.5 min-h-[48px]",
    };

    const variantStyles = {
      primary:
        "bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white border border-transparent",
      accent:
        "bg-[var(--brand-accent)] hover:bg-[var(--brand-accent-hover)] text-white border border-transparent",
      secondary:
        "bg-[var(--bg-subtle)] hover:bg-[var(--bg-subtle-hover)] text-[var(--text-primary)] border border-[var(--border-default)]",
      outline:
        "bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] border border-[var(--border-strong)]",
      ghost:
        "bg-transparent hover:bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent",
      danger:
        "bg-[var(--status-closed-bg)] hover:bg-[#f4dad6] text-[var(--status-closed)] border border-[#e3b9b2]",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span
            aria-hidden="true"
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"
          />
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

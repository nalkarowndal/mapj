import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      helperText,
      error,
      leftIcon,
      rightElement,
      className = "",
      ...props
    },
    ref
  ) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const messageId = `${inputId}-desc`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[14px] font-medium text-[var(--text-primary)] mb-1.5"
          >
            {label}
          </label>
        )}
        <div
          className={`relative flex items-center bg-[var(--bg-surface)] border rounded-[10px] transition-colors ${
            error
              ? "border-[var(--status-closed)] focus-within:ring-2 focus-within:ring-[var(--status-closed)]/20"
              : "border-[var(--border-strong)] focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/15"
          }`}
        >
          {leftIcon && (
            <span
              aria-hidden="true"
              className="pl-3.5 text-[var(--text-muted)] flex items-center shrink-0"
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={Boolean(error)}
            aria-describedby={error || helperText ? messageId : undefined}
            className={`w-full bg-transparent text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] py-2.5 min-h-[44px] outline-none focus:outline-none focus-visible:outline-none ${
              leftIcon ? "pl-2.5" : "pl-3.5"
            } ${rightElement ? "pr-2" : "pr-3.5"} ${className}`}
            {...props}
          />
          {rightElement && (
            <div className="pr-1.5 flex items-center shrink-0">{rightElement}</div>
          )}
        </div>
        {(error || helperText) && (
          <p
            id={messageId}
            className={`mt-1.5 text-[13px] ${
              error
                ? "text-[var(--status-closed)] font-medium"
                : "text-[var(--text-secondary)]"
            }`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";


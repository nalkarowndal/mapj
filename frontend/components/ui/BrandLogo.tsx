import React from "react";
import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  href = "/",
  size = "md",
  showSubtitle = true,
  className = "",
}) => {
  const titleSize = {
    sm: "text-lg",
    md: "text-xl sm:text-2xl",
    lg: "text-2xl sm:text-3xl",
  }[size];

  const subSize = {
    sm: "text-[9px]",
    md: "text-[10px]",
    lg: "text-[11px]",
  }[size];

  const content = (
    <span className={`inline-flex flex-col leading-none select-none ${className}`}>
      <span
        className={`font-editorial font-bold tracking-tight text-[var(--brand-primary)] ${titleSize}`}
      >
        동북미식
      </span>
      {showSubtitle && (
        <span
          className={`mt-1 font-sans font-medium tracking-[0.18em] uppercase text-[var(--text-muted)] ${subSize}`}
        >
          DONGBUK TABLE
        </span>
      )}
    </span>
  );

  if (!href) return content;

  return (
    <Link
      href={href}
      aria-label="동북미식 홈으로 이동"
      className="inline-flex items-center rounded-md focus-visible:outline-2 focus-visible:outline-[var(--brand-accent)]"
    >
      {content}
    </Link>
  );
};


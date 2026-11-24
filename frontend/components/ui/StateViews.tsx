import React from "react";
import { AlertCircle, RefreshCw, SearchX } from "lucide-react";
import { Button } from "./Button";

export const RestaurantCardSkeleton: React.FC = () => (
  <div
    aria-hidden="true"
    className="rounded-[14px] overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-default)] animate-pulse"
  >
    <div className="aspect-[4/3] w-full bg-[var(--bg-subtle)]" />
    <div className="p-4 space-y-2.5">
      <div className="h-3.5 w-24 rounded bg-[var(--bg-subtle)]" />
      <div className="h-5 w-3/4 rounded bg-[var(--bg-subtle)]" />
      <div className="h-4 w-full rounded bg-[var(--bg-subtle)]" />
      <div className="flex items-center justify-between pt-1">
        <div className="h-4 w-20 rounded bg-[var(--bg-subtle)]" />
        <div className="h-6 w-24 rounded-full bg-[var(--bg-subtle)]" />
      </div>
    </div>
  </div>
);

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
}) => (
  <div className="w-full py-14 px-6 text-center rounded-[16px] bg-[var(--bg-surface)] border border-[var(--border-default)]">
    <div className="w-12 h-12 rounded-full bg-[var(--bg-subtle)] text-[var(--text-secondary)] flex items-center justify-center mx-auto mb-4">
      <SearchX className="w-6 h-6" />
    </div>
    <h3 className="font-editorial text-xl font-semibold text-[var(--text-primary)]">
      {title}
    </h3>
    <p className="mt-2 text-[15px] text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
      {description}
    </p>
    {actionLabel && onAction && (
      <div className="mt-6">
        <Button variant="secondary" size="md" onClick={onAction}>
          {actionLabel}
        </Button>
      </div>
    )}
  </div>
);

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "정보를 불러오지 못했습니다",
  description = "잠시 후 다시 시도해 주세요. 네트워크 상태를 확인하거나 새로고침하시면 복구될 수 있습니다.",
  onRetry,
}) => (
  <div
    role="alert"
    className="w-full py-12 px-6 text-center rounded-[16px] bg-[var(--status-closed-bg)] border border-[#e3b9b2]"
  >
    <div className="w-12 h-12 rounded-full bg-[var(--bg-surface)] text-[var(--status-closed)] flex items-center justify-center mx-auto mb-4">
      <AlertCircle className="w-6 h-6" />
    </div>
    <h3 className="font-editorial text-xl font-semibold text-[var(--text-primary)]">
      {title}
    </h3>
    <p className="mt-2 text-[15px] text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
      {description}
    </p>
    {onRetry && (
      <div className="mt-6">
        <Button
          variant="primary"
          size="md"
          leftIcon={<RefreshCw className="w-4 h-4" />}
          onClick={onRetry}
        >
          다시 시도
        </Button>
      </div>
    )}
  </div>
);


"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowRight,
  Bookmark,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  History,
  Info,
  MapPin,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { RegionSummary } from "@/lib/types/gourmet";
import { AppDispatch, RootState } from "@/store/store";
import {
  addConciergeTurn,
  clearConciergeHistory,
  selectConciergeTurn,
  ConciergeTurn,
} from "@/store/conciergeSlice";
import { Button } from "../ui/Button";
import { FilterChip } from "../ui/FilterChip";
import { Badge } from "../ui/Badge";
import { EmptyState, ErrorState } from "../ui/StateViews";
import { useBookmarks } from "@/features/bookmarks/useBookmarks";

const EXAMPLE_PROMPTS = [
  "노원구에서 1만원대로 먹을 수 있는 점심 맛집을 추천해 줘.",
  "공릉동에서 산책하고 들를 만한 카페를 알려줘.",
  "도봉산 등산 후 식사하기 좋은 곳을 추천해 줘.",
  "성북동에서 데이트하기 좋은 식당을 찾아줘.",
  "부모님과 함께 가기 좋은 강북구 한식집을 알려줘.",
];

const BUDGET_CHIPS = [
  { value: "", label: "예산 무관" },
  { value: "under_10000", label: "1만원 이하" },
  { value: "10000_20000", label: "1만~2만원대" },
  { value: "20000_40000", label: "2만~4만원대" },
  { value: "over_40000", label: "4만원 이상" },
];

const PURPOSE_CHIPS = [
  { value: "", label: "방문 목적 전체" },
  { value: "solo_dining", label: "혼밥" },
  { value: "date", label: "데이트" },
  { value: "family", label: "가족 외식" },
  { value: "group", label: "단체 모임" },
  { value: "parking", label: "주차 가능" },
];

interface ConciergeClientProps {
  regions: RegionSummary[];
}

export const ConciergeClient: React.FC<ConciergeClientProps> = ({ regions }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { turns, activeTurnId } = useSelector(
    (state: RootState) => state.concierge
  );
  const { isSaved, toggle, hydrated } = useBookmarks();

  const [query, setQuery] = useState("");
  const [region, setRegion] = useState("");
  const [budget, setBudget] = useState("");
  const [purpose, setPurpose] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const activeTurn: ConciergeTurn | null =
    turns.find((t) => t.id === activeTurnId) || turns[0] || null;

  const runRecommend = async (customQuery?: string) => {
    const q = (customQuery ?? query).trim();
    if (!q || isLoading) return;

    setQuery(q);
    setIsLoading(true);
    setError(null);

    try {
      const historyPayload = turns
        .slice(0, 3)
        .reverse()
        .flatMap((t) => [
          { role: "user", content: t.query },
          { role: "assistant", content: t.summary },
        ]);

      const res = await fetch("/api/concierge/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          region: region || undefined,
          budget: budget || undefined,
          purpose: purpose || undefined,
          history: historyPayload,
        }),
      });

      if (!res.ok) {
        throw new Error(`추천 요청에 실패했습니다 (${res.status})`);
      }

      const data = await res.json();
      const turn: ConciergeTurn = {
        id: `turn-${Date.now()}`,
        query: q,
        region: region || undefined,
        budget: budget || undefined,
        purpose: purpose || undefined,
        summary: data.summary,
        recommendations: data.recommendations || [],
        isFallback: Boolean(data.is_fallback),
        disclaimer: data.disclaimer,
        createdAt: Date.now(),
      };
      dispatch(addConciergeTurn(turn));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "AI 추천 서버와 연결하지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runRecommend();
  };

  return (
    <div className="space-y-10">
      {/* Central Search & Structured Preferences Panel */}
      <section className="p-6 sm:p-8 rounded-[18px] bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-6">
        <form
          onSubmit={handleSubmit}
          role="search"
          aria-label="AI 맛집 추천 질문 입력"
          className="space-y-4"
        >
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1 flex items-center bg-[var(--bg-main)] border border-[var(--border-strong)] rounded-[12px] focus-within:border-[var(--brand-primary)] focus-within:ring-2 focus-within:ring-[var(--brand-primary)]/15">
              <Search className="w-5 h-5 text-[var(--text-muted)] ml-4 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="예: 성북동에서 부모님과 가기 좋은 조용한 한식집 추천해 줘"
                aria-label="원하는 식사 상황이나 음식 입력"
                className="w-full bg-transparent px-3 py-3.5 text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              leftIcon={<Sparkles className="w-4 h-4" />}
              className="shrink-0"
            >
              맛집 추천받기
            </Button>
          </div>

          {/* Structured Preference Chips */}
          <div className="space-y-3 pt-2 border-t border-[var(--border-default)]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[13px] font-semibold text-[var(--text-secondary)] mr-1.5">
                지역
              </span>
              <FilterChip
                selected={!region}
                onClick={() => setRegion("")}
                className="py-1 min-h-[34px] text-[13px]"
              >
                동북권 전체
              </FilterChip>
              {regions.map((r) => (
                <FilterChip
                  key={r.slug}
                  selected={region === r.slug}
                  onClick={() => setRegion(r.slug)}
                  className="py-1 min-h-[34px] text-[13px]"
                >
                  {r.name}
                </FilterChip>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[13px] font-semibold text-[var(--text-secondary)] mr-1.5">
                방문 목적
              </span>
              {PURPOSE_CHIPS.map((p) => (
                <FilterChip
                  key={p.value || "all"}
                  selected={purpose === p.value}
                  onClick={() => setPurpose(p.value)}
                  className="py-1 min-h-[34px] text-[13px]"
                >
                  {p.label}
                </FilterChip>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[13px] font-semibold text-[var(--text-secondary)] mr-1.5">
                예산
              </span>
              {BUDGET_CHIPS.map((b) => (
                <FilterChip
                  key={b.value || "all"}
                  selected={budget === b.value}
                  onClick={() => setBudget(b.value)}
                  className="py-1 min-h-[34px] text-[13px]"
                >
                  {b.label}
                </FilterChip>
              ))}
            </div>
          </div>
        </form>

        {/* Example Prompts (15.2) */}
        <div className="pt-4 border-t border-[var(--border-default)] space-y-2.5">
          <p className="text-[13px] font-medium text-[var(--text-secondary)]">
            이런 질문으로 바로 시작해 보세요
          </p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isLoading}
                onClick={() => runRecommend(prompt)}
                className="text-left px-3.5 py-2 rounded-[10px] bg-[var(--bg-main)] hover:bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[13px] text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Collapsible Previous Consultation History (Separate from main browse data) */}
      {turns.length > 0 && (
        <section className="rounded-[14px] bg-[var(--bg-surface)] border border-[var(--border-default)] overflow-hidden">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="w-full px-5 py-3.5 flex items-center justify-between text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--bg-main)] cursor-pointer"
          >
            <span className="inline-flex items-center gap-2">
              <History className="w-4 h-4 text-[var(--brand-primary)]" />
              <span>이전 추천 기록 ({turns.length})</span>
            </span>
            {historyOpen ? (
              <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
            )}
          </button>

          {historyOpen && (
            <div className="px-5 py-4 border-t border-[var(--border-default)] space-y-2.5 bg-[var(--bg-main)]/50">
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch(clearConciergeHistory())}
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                >
                  기록 비우기
                </Button>
              </div>
              <div className="space-y-2">
                {turns.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      dispatch(selectConciergeTurn(t.id));
                      setHistoryOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-[10px] border transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      activeTurn?.id === t.id
                        ? "bg-[var(--bg-surface)] border-[var(--brand-primary)]"
                        : "bg-[var(--bg-surface)] border-[var(--border-default)] hover:bg-[var(--bg-subtle)]"
                    }`}
                  >
                    <span className="text-[14px] text-[var(--text-primary)] truncate">
                      {t.query}
                    </span>
                    <span className="text-[12px] text-[var(--text-muted)] shrink-0">
                      추천 {t.recommendations.length}곳
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Error State */}
      {error && (
        <ErrorState
          title="추천 결과를 불러오지 못했습니다"
          description={error}
          onRetry={() => runRecommend()}
        />
      )}

      {/* Loading Indicator */}
      {isLoading && (
        <div className="p-8 rounded-[16px] bg-[var(--bg-surface)] border border-[var(--border-default)] text-center space-y-2">
          <p className="font-editorial text-[20px] font-semibold text-[var(--brand-primary)]">
            동북권 검증 맛집 데이터에서 조건을 찾고 있습니다...
          </p>
          <p className="text-[14px] text-[var(--text-secondary)]">
            등록된 실존 매장을 먼저 조회한 뒤 맞춤 추천 이유를 정리합니다.
          </p>
        </div>
      )}

      {/* Active Recommendation Result */}
      {!isLoading && activeTurn && (
        <section
          aria-labelledby="concierge-result-heading"
          className="space-y-6"
        >
          <div className="p-6 rounded-[16px] bg-[var(--bg-subtle)]/70 border border-[var(--border-default)] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Badge variant="primary" size="md">
                  추천 요약
                </Badge>
                {activeTurn.isFallback && (
                  <Badge variant="warning" size="sm">
                    데이터 기반 기본 추천 모드
                  </Badge>
                )}
              </div>
              <span className="text-[13px] text-[var(--text-muted)]">
                질문: &ldquo;{activeTurn.query}&rdquo;
              </span>
            </div>

            <h2
              id="concierge-result-heading"
              className="font-editorial text-[20px] sm:text-[22px] font-semibold text-[var(--text-primary)] leading-relaxed"
            >
              {activeTurn.summary}
            </h2>

            <p className="text-[12px] text-[var(--text-secondary)] flex items-start gap-1.5 pt-1">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-[var(--brand-primary)]" />
              <span>{activeTurn.disclaimer}</span>
            </p>
          </div>

          {activeTurn.recommendations.length === 0 ? (
            <EmptyState
              title="일치하는 등록 매장이 없습니다"
              description="동북미식 AI는 등록되지 않은 식당을 임의로 지어내지 않습니다. 자치구나 음식 조건을 넓혀 다시 물어보세요."
              actionLabel="전체 맛집 탐색하기"
              onAction={() => {
                window.location.href = "/restaurants";
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {activeTurn.recommendations.map(({ restaurant: r, ai_reason }) => {
                const saved = hydrated ? isSaved(r.id) : false;
                return (
                  <article
                    key={r.id}
                    className="rounded-[16px] bg-[var(--bg-surface)] border border-[var(--border-default)] overflow-hidden flex flex-col justify-between"
                  >
                    {/* Section 1: Verified Database Facts */}
                    <div className="p-5 sm:p-6 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-[12px]">
                            <Badge variant="primary" size="sm">
                              확인된 매장 정보
                            </Badge>
                            <span className="text-[var(--text-secondary)]">
                              {r.region_name} · {r.neighborhood} · {r.primary_category}
                            </span>
                          </div>
                          <h3 className="font-editorial text-[21px] font-semibold text-[var(--text-primary)]">
                            <Link
                              href={`/restaurants/${r.slug}`}
                              className="hover:text-[var(--brand-accent-text)]"
                            >
                              {r.name}
                            </Link>
                          </h3>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggle(r.id)}
                          aria-pressed={saved}
                          aria-label={saved ? `${r.name} 저장 해제` : `${r.name} 저장`}
                          className={`p-2.5 rounded-full border cursor-pointer shrink-0 ${
                            saved
                              ? "bg-[var(--brand-primary)] text-white border-[var(--brand-primary)]"
                              : "bg-[var(--bg-main)] text-[var(--text-primary)] border-[var(--border-default)]"
                          }`}
                        >
                          <Bookmark
                            className="w-4 h-4"
                            fill={saved ? "currentColor" : "none"}
                          />
                        </button>
                      </div>

                      <div className="text-[13px] text-[var(--text-secondary)] space-y-1">
                        <p className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-[var(--brand-accent-text)] shrink-0" />
                          <span>{r.road_address}</span>
                        </p>
                        <p>
                          가격대:{" "}
                          <strong className="font-medium text-[var(--text-primary)]">
                            {r.price_range_label || "확인 필요"}
                          </strong>
                          {r.signature_menus.length > 0 && (
                            <> · 대표 메뉴: {r.signature_menus.slice(0, 3).join(", ")}</>
                          )}
                        </p>
                      </div>

                      {/* Section 2: Clearly Separated AI Recommendation Reason */}
                      <div className="p-4 rounded-[12px] bg-[var(--bg-main)] border border-[var(--border-default)] space-y-1.5">
                        <p className="text-[12px] font-semibold text-[var(--brand-accent-text)] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>AI 추천 이유</span>
                        </p>
                        <p className="text-[14px] text-[var(--text-primary)] leading-relaxed">
                          {ai_reason}
                        </p>
                      </div>
                    </div>

                    {/* Footer Links */}
                    <div className="px-5 sm:px-6 py-3.5 bg-[var(--bg-main)]/60 border-t border-[var(--border-default)] flex items-center justify-between gap-2 text-[13px]">
                      <Link
                        href={`/restaurants/${r.slug}`}
                        className="inline-flex items-center gap-1.5 font-semibold text-[var(--brand-primary)] hover:text-[var(--brand-accent-text)]"
                      >
                        <span>매장 상세 보기</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      {r.kakao_url && (
                        <a
                          href={r.kakao_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <span>카카오맵</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
};


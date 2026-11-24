"use client";
import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const REPORT_TYPES = [
  { value: "hours", label: "영업시간 / 휴무일 변경" },
  { value: "closed", label: "폐업 또는 휴업" },
  { value: "address", label: "주소 / 위치 / 전화번호 오류" },
  { value: "menu", label: "대표 메뉴 / 가격대 변동" },
  { value: "new_place", label: "신규 동북권 맛집 추천" },
  { value: "other", label: "기타 의견" },
];

interface FeedbackFormClientProps {
  initialRestaurantId?: string;
  initialRestaurantName?: string;
}

export const FeedbackFormClient: React.FC<FeedbackFormClientProps> = ({
  initialRestaurantId = "",
  initialRestaurantName = "",
}) => {
  const [restaurantName, setRestaurantName] = useState(initialRestaurantName);
  const [reportType, setReportType] = useState("hours");
  const [content, setContent] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedMsg, setSubmittedMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim().length < 5) {
      setError("제보 내용을 5자 이상 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurant_id: initialRestaurantId || undefined,
          restaurant_name: restaurantName.trim() || undefined,
          report_type: reportType,
          content: content.trim(),
          reporter_contact: contact.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || "제보 접수에 실패했습니다.");
      }
      const data = await res.json();
      setSubmittedMsg(data.message || "소중한 제보가 접수되었습니다.");
      setContent("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "네트워크 오류가 발생했습니다."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedMsg) {
    return (
      <div className="p-8 rounded-[16px] bg-[var(--status-open-bg)] border border-[#246142]/25 text-center space-y-4">
        <CheckCircle2 className="w-10 h-10 text-[var(--status-open)] mx-auto" />
        <h2 className="font-editorial text-[24px] font-semibold text-[var(--text-primary)]">
          제보가 접수되었습니다
        </h2>
        <p className="text-[15px] text-[var(--text-secondary)]">{submittedMsg}</p>
        <div className="pt-2">
          <Button
            variant="primary"
            onClick={() => setSubmittedMsg(null)}
          >
            추가 제보 작성하기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="p-6 sm:p-8 rounded-[16px] bg-[var(--bg-surface)] border border-[var(--border-default)] space-y-5"
    >
      <Input
        label="매장명 (선택)"
        value={restaurantName}
        onChange={(e) => setRestaurantName(e.target.value)}
        placeholder="예: 털보고된이 본점"
      />

      <div>
        <label
          htmlFor="report-type"
          className="block text-[14px] font-medium text-[var(--text-primary)] mb-1.5"
        >
          제보 유형
        </label>
        <select
          id="report-type"
          value={reportType}
          onChange={(e) => setReportType(e.target.value)}
          className="w-full px-3.5 py-2.5 min-h-[44px] rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[15px] text-[var(--text-primary)]"
        >
          {REPORT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="report-content"
          className="block text-[14px] font-medium text-[var(--text-primary)] mb-1.5"
        >
          상세 내용 (필수)
        </label>
        <textarea
          id="report-content"
          rows={5}
          required
          minLength={5}
          maxLength={1000}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="변경된 영업시간, 휴무일, 메뉴 가격 변동, 폐업 여부 등 확인하신 내용을 알려주세요."
          className="w-full px-3.5 py-3 rounded-[10px] bg-[var(--bg-surface)] border border-[var(--border-strong)] text-[15px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] focus:ring-2 focus:ring-[var(--brand-primary)]/15"
        />
      </div>

      <Input
        label="회신 연락처 (선택)"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="이메일 등 (필요 시 확인 용도로만 사용됩니다)"
      />

      {error && (
        <p role="alert" className="text-[14px] text-[var(--status-closed)] font-medium">
          {error}
        </p>
      )}

      <div className="pt-2">
        <Button type="submit" variant="primary" size="lg" isLoading={submitting}>
          제보 보내기
        </Button>
      </div>
    </form>
  );
};


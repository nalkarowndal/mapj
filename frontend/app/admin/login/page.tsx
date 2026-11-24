"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(
          data.detail || "로그인에 실패했습니다. 자격 증명을 확인해 주세요."
        );
        return;
      }
      router.replace("/admin");
    } catch {
      setErrorMsg("서버와 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#F5F4F0]">
      <div className="w-full max-w-md bg-white border border-[var(--border-default)] rounded-2xl shadow-[var(--shadow-md)] p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold tracking-wider text-[var(--brand-accent-text)] uppercase">
                DONGBUK TABLE ADMIN
              </p>
              <h1 className="font-serif-kr text-xl font-bold text-[var(--text-primary)]">
                관리자 로그인
              </h1>
            </div>
          </div>
          <Link
            href="/"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--brand-primary)] inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            서비스로
          </Link>
        </div>

        <p className="text-sm text-[var(--text-secondary)] mb-6 leading-relaxed">
          동북미식 맛집 데이터 검수, 이미지 관리, 외부 API 설정은 서버 인증을
          거친 관리자만 접근할 수 있습니다.
        </p>

        {errorMsg && (
          <div
            role="alert"
            className="mb-5 p-3.5 rounded-xl bg-[rgba(181,68,52,0.08)] border border-[rgba(181,68,52,0.28)] text-sm text-[var(--status-error)] flex items-start gap-2.5"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
            >
              관리자 이메일
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@dongbuktable.kr"
              className="w-full h-11 px-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-main)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5"
            >
              비밀번호
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호 입력"
              className="w-full h-11 px-3.5 rounded-xl border border-[var(--border-default)] bg-[var(--bg-main)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full h-11 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {submitting ? "인증 확인 중..." : "관리자 로그인"}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-[var(--border-default)] text-xs text-[var(--text-muted)] space-y-1">
          <p>• 비밀번호는 서버에서 PBKDF2-SHA256으로 해시 검증됩니다.</p>
          <p>• 로그인 실패가 분당 5회를 초과하면 일시 제한됩니다.</p>
        </div>
      </div>
    </div>
  );
}


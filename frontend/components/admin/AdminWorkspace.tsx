"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Utensils,
  Image as ImageIcon,
  Layers,
  MessageSquareWarning,
  KeyRound,
  LogOut,
  Plus,
  RefreshCw,
  CheckCircle2,
  ShieldCheck,
  Search,
  Trash2,
  Edit3,
  ExternalLink,
  Upload,
  AlertCircle,
  X,
} from "lucide-react";

type AdminTab =
  | "dashboard"
  | "restaurants"
  | "images"
  | "curations"
  | "feedback"
  | "settings";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

const REGIONS = [
  { slug: "nowon", name: "노원구" },
  { slug: "dobong", name: "도봉구" },
  { slug: "gangbuk", name: "강북구" },
  { slug: "jungnang", name: "중랑구" },
  { slug: "seongbuk", name: "성북구" },
];

const CATEGORIES = [
  { slug: "korean", name: "한식" },
  { slug: "meat", name: "고기·구이" },
  { slug: "chinese", name: "중식" },
  { slug: "japanese", name: "일식" },
  { slug: "western", name: "양식" },
  { slug: "snack", name: "분식" },
  { slug: "noodle", name: "면 요리" },
  { slug: "cafe", name: "카페" },
  { slug: "bakery", name: "베이커리" },
  { slug: "dessert", name: "디저트" },
  { slug: "pub", name: "주점" },
  { slug: "etc", name: "기타" },
];

export const AdminWorkspace: React.FC = () => {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [toast, setToast] = useState<{ type: "ok" | "err"; msg: string } | null>(null);

  // Dashboard
  const [dashboard, setDashboard] = useState<any>(null);

  // Restaurants
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [restTotal, setRestTotal] = useState(0);
  const [restSearch, setRestSearch] = useState("");
  const [restRegion, setRestRegion] = useState("all");
  const [restPublish, setRestPublish] = useState("all");
  const [restPage, setRestPage] = useState(1);
  const [editingRest, setEditingRest] = useState<any | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    name: "",
    region_slug: "nowon",
    neighborhood: "",
    category_slug: "korean",
    road_address: "",
    jibun_address: "",
    lat: "37.6543",
    lng: "127.0564",
    phone: "",
    one_line_intro: "",
    price_range_label: "",
    signature_menus: "",
    publish_status: "published",
    verification_status: "needs_verification",
  });

  // Image Upload state
  const [imgRestId, setImgRestId] = useState("");
  const [imgType, setImgType] = useState("food");
  const [imgAlt, setImgAlt] = useState("");
  const [imgSource, setImgSource] = useState("");
  const [imgAuthor, setImgAuthor] = useState("");
  const [imgLicense, setImgLicense] = useState("직접 촬영 / 허가 사용");
  const [imgPrimary, setImgPrimary] = useState(true);
  const [imgAiGen, setImgAiGen] = useState(false);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [uploadingImg, setUploadingImg] = useState(false);

  // Regions & Collections
  const [adminRegions, setAdminRegions] = useState<any[]>([]);
  const [adminCollections, setAdminCollections] = useState<any[]>([]);

  // Feedback & Verification Logs
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [verLogs, setVerLogs] = useState<any[]>([]);

  // API Settings
  const [apiStatus, setApiStatus] = useState<any>(null);
  const [keyProvider, setKeyProvider] = useState<"groq" | "kakao_rest" | "kakao_js">("groq");
  const [keyValue, setKeyValue] = useState("");
  const [keyModel, setKeyModel] = useState("qwen/qwen3.8-27b");
  const [savingKey, setSavingKey] = useState(false);

  const showToast = (type: "ok" | "err", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const apiFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const res = await fetch(url, {
        ...init,
        credentials: "include",
      });
      if (res.status === 401) {
        router.replace("/admin/login");
        throw new Error("UNAUTHORIZED");
      }
      return res;
    },
    [router]
  );

  // Initial server session check
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/admin/auth/me", { credentials: "include" });
        if (!res.ok) {
          router.replace("/admin/login");
          return;
        }
        const data = await res.json();
        if (active) {
          setAdminUser(data.admin);
          setAuthChecked(true);
        }
      } catch {
        router.replace("/admin/login");
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const loadDashboard = useCallback(async () => {
    const res = await apiFetch("/api/admin/dashboard");
    if (res.ok) setDashboard(await res.json());
  }, [apiFetch]);

  const loadRestaurants = useCallback(async () => {
    const sp = new URLSearchParams();
    if (restSearch.trim()) sp.set("q", restSearch.trim());
    if (restRegion !== "all") sp.set("region", restRegion);
    if (restPublish !== "all") sp.set("publish_status", restPublish);
    sp.set("page", String(restPage));
    sp.set("page_size", "20");
    const res = await apiFetch(`/api/admin/restaurants?${sp.toString()}`);
    if (res.ok) {
      const data = await res.json();
      setRestaurants(data.items || []);
      setRestTotal(data.pagination?.total || 0);
      if (!imgRestId && data.items?.length) {
        setImgRestId(data.items[0].id);
      }
    }
  }, [apiFetch, restSearch, restRegion, restPublish, restPage, imgRestId]);

  const loadCurations = useCallback(async () => {
    const [rRes, cRes] = await Promise.all([
      apiFetch("/api/admin/regions"),
      apiFetch("/api/admin/collections"),
    ]);
    if (rRes.ok) setAdminRegions(await rRes.json());
    if (cRes.ok) setAdminCollections(await cRes.json());
  }, [apiFetch]);

  const loadFeedbackAndLogs = useCallback(async () => {
    const [fRes, vRes] = await Promise.all([
      apiFetch("/api/admin/feedback"),
      apiFetch("/api/admin/verification-logs?limit=40"),
    ]);
    if (fRes.ok) setFeedbacks(await fRes.json());
    if (vRes.ok) setVerLogs(await vRes.json());
  }, [apiFetch]);

  const loadSettings = useCallback(async () => {
    const res = await apiFetch("/api/admin/settings/status");
    if (res.ok) setApiStatus(await res.json());
  }, [apiFetch]);

  useEffect(() => {
    if (!authChecked) return;
    if (activeTab === "dashboard") loadDashboard();
    if (activeTab === "restaurants" || activeTab === "images") loadRestaurants();
    if (activeTab === "curations") loadCurations();
    if (activeTab === "feedback") loadFeedbackAndLogs();
    if (activeTab === "settings") loadSettings();
  }, [
    authChecked,
    activeTab,
    loadDashboard,
    loadRestaurants,
    loadCurations,
    loadFeedbackAndLogs,
    loadSettings,
  ]);

  const handleLogout = async () => {
    await fetch("/api/admin/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    router.replace("/admin/login");
  };

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiFetch("/api/admin/restaurants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...createForm,
          lat: parseFloat(createForm.lat),
          lng: parseFloat(createForm.lng),
          signature_menus: createForm.signature_menus
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("err", data.detail || "매장 등록에 실패했습니다.");
        return;
      }
      showToast("ok", `신규 매장 '${data.name}' 등록 완료`);
      setShowCreateModal(false);
      setCreateForm({
        name: "",
        region_slug: "nowon",
        neighborhood: "",
        category_slug: "korean",
        road_address: "",
        jibun_address: "",
        lat: "37.6543",
        lng: "127.0564",
        phone: "",
        one_line_intro: "",
        price_range_label: "",
        signature_menus: "",
        publish_status: "published",
        verification_status: "needs_verification",
      });
      loadRestaurants();
    } catch {
      showToast("err", "등록 중 오류가 발생했습니다.");
    }
  };

  const handleUpdateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRest) return;
    try {
      const res = await apiFetch(`/api/admin/restaurants/${editingRest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingRest.name,
          neighborhood: editingRest.neighborhood,
          road_address: editingRest.road_address,
          phone: editingRest.phone || null,
          one_line_intro: editingRest.one_line_intro,
          price_range_label: editingRest.price_range_label || null,
          publish_status: editingRest.publish_status,
          business_status: editingRest.business_status,
          verification_status: editingRest.verification_status,
          is_editor_pick: editingRest.is_editor_pick,
          verification_note: "관리자 콘솔에서 정보 수정 및 상태 갱신",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("err", data.detail || "수정에 실패했습니다.");
        return;
      }
      showToast("ok", `'${data.name}' 정보가 업데이트되었습니다.`);
      setEditingRest(null);
      loadRestaurants();
    } catch {
      showToast("err", "수정 요청 실패");
    }
  };

  const handleKakaoReverify = async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/restaurants/${id}/verify-kakao`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("err", data.detail || "카카오 재검증 실패");
        return;
      }
      showToast(data.matched ? "ok" : "err", data.note || "재검증 완료");
      loadRestaurants();
    } catch {
      showToast("err", "재검증 요청 중 오류 발생");
    }
  };

  const handleSoftDelete = async (id: string, name: string) => {
    if (!window.confirm(`'${name}' 매장을 폐업/비공개 처리하시겠습니까?`)) return;
    const res = await apiFetch(`/api/admin/restaurants/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast("ok", `'${name}' 폐업/비공개 처리 완료`);
      loadRestaurants();
    }
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imgFile || !imgRestId) {
      showToast("err", "대상 매장과 이미지 파일을 선택해 주세요.");
      return;
    }
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("restaurant_id", imgRestId);
      fd.append("image_type", imgType);
      fd.append("alt_text", imgAlt);
      fd.append("source_name", imgSource);
      fd.append("author", imgAuthor);
      fd.append("license_type", imgLicense);
      fd.append("is_primary", String(imgPrimary));
      fd.append("is_ai_generated", String(imgAiGen));
      fd.append("file", imgFile);

      const res = await apiFetch("/api/admin/images", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("err", data.detail || "이미지 업로드 실패");
        return;
      }
      showToast("ok", "이미지가 검증·저장되었습니다.");
      setImgAlt("");
      setImgSource("");
      setImgAuthor("");
      setImgFile(null);
      loadRestaurants();
    } finally {
      setUploadingImg(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    const res = await apiFetch(`/api/admin/images/${imageId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      showToast("ok", "이미지가 삭제되었습니다.");
      loadRestaurants();
    }
  };

  const handleUpdateFeedback = async (id: string, nextStatus: "resolved" | "rejected") => {
    const res = await apiFetch(`/api/admin/feedback/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: nextStatus,
        admin_note: nextStatus === "resolved" ? "관리자 확인 및 반영 완료" : "검토 결과 반려",
      }),
    });
    if (res.ok) {
      showToast("ok", `제보 상태가 '${nextStatus}'로 변경되었습니다.`);
      loadFeedbackAndLogs();
    }
  };

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingKey(true);
    try {
      const res = await apiFetch("/api/admin/settings/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: keyProvider,
          key: keyValue,
          model: keyProvider === "groq" ? keyModel : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showToast("err", data.detail || "API 설정 저장 실패");
        return;
      }
      setApiStatus(data.updated_status);
      setKeyValue("");
      showToast("ok", data.message || "API 키 저장 완료");
    } finally {
      setSavingKey(false);
    }
  };

  const handleTestProvider = async (provider: "groq" | "kakao_rest" | "kakao_js") => {
    const res = await apiFetch("/api/admin/settings/test-connection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider }),
    });
    const data = await res.json().catch(() => ({}));
    showToast(data.success ? "ok" : "err", `[${provider}] ${data.message || "테스트 완료"}`);
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-[var(--text-muted)]">
        관리자 세션을 확인하는 중입니다...
      </div>
    );
  }

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: "dashboard", label: "대시보드", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "restaurants", label: "맛집 관리", icon: <Utensils className="w-4 h-4" /> },
    { id: "images", label: "이미지 관리", icon: <ImageIcon className="w-4 h-4" /> },
    { id: "curations", label: "지역·테마 관리", icon: <Layers className="w-4 h-4" /> },
    { id: "feedback", label: "제보 & 검증 이력", icon: <MessageSquareWarning className="w-4 h-4" /> },
    { id: "settings", label: "외부 API 설정", icon: <KeyRound className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Admin Sidebar (Completely Separate from Public UI) */}
      <aside className="w-full lg:w-64 shrink-0 bg-[#1F2C24] text-white flex flex-col">
        <div className="p-5 border-b border-white/10">
          <p className="text-[11px] font-semibold tracking-widest text-[#D8B48E] uppercase">
            DONGBUK TABLE
          </p>
          <h1 className="font-serif-kr text-lg font-bold mt-0.5">관리자 콘솔</h1>
          <p className="text-xs text-white/65 mt-1 truncate">
            {adminUser?.name} ({adminUser?.email})
          </p>
        </div>

        <nav className="p-3 flex lg:flex-col gap-1 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === item.id
                  ? "bg-white/15 text-white"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto p-4 border-t border-white/10 flex lg:flex-col gap-2">
          <Link
            href="/"
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-white"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            공개 사이트 열기
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-red-900/50 text-xs font-medium text-white/85"
          >
            <LogOut className="w-3.5 h-3.5" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-5 sm:p-8 max-w-6xl w-full">
        {toast && (
          <div
            role="status"
            className={`mb-5 px-4 py-3 rounded-xl border text-sm flex items-center gap-2 ${
              toast.type === "ok"
                ? "bg-[#EAF3ED] border-[#BBD9C4] text-[#1F4A2E]"
                : "bg-[#FBECE9] border-[#E7B6AD] text-[#8E2A1C]"
            }`}
          >
            {toast.type === "ok" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.msg}</span>
          </div>
        )}

        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && dashboard && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif-kr text-2xl font-bold">운영 대시보드</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                서울 동북권 5개 자치구 통합 DB 현황과 검증 상태를 확인합니다.
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "전체 등록 매장", value: dashboard.summary.total_restaurants },
                { label: "공개 중 매장", value: dashboard.summary.published_restaurants },
                { label: "실존 검증 완료", value: dashboard.summary.verified_restaurants },
                { label: "미처리 제보", value: dashboard.summary.pending_feedback },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="bg-white border border-[var(--border-default)] rounded-2xl p-5"
                >
                  <p className="text-xs font-medium text-[var(--text-muted)]">{kpi.label}</p>
                  <p className="text-3xl font-bold mt-2 text-[var(--brand-primary)]">
                    {kpi.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="bg-white border border-[var(--border-default)] rounded-2xl p-5">
                <h3 className="font-semibold text-base mb-4">5개 자치구별 등록·검증 현황</h3>
                <div className="space-y-2.5">
                  {dashboard.regions.map((r: any) => (
                    <div
                      key={r.slug}
                      className="flex items-center justify-between py-2 border-b border-[var(--border-default)] last:border-0 text-sm"
                    >
                      <span className="font-semibold">{r.name}</span>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                        <span>전체 {r.total}</span>
                        <span className="text-[var(--brand-primary)] font-semibold">
                          공개 {r.published}
                        </span>
                        <span>검증 {r.verified}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[var(--border-default)] rounded-2xl p-5">
                <h3 className="font-semibold text-base mb-4">시스템 및 외부 API 상태</h3>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">데이터베이스 엔진</dt>
                    <dd className="font-medium uppercase">{dashboard.database.dialect}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">Groq AI</dt>
                    <dd className="font-medium">{dashboard.api_status.groq.status}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">Kakao Local REST</dt>
                    <dd className="font-medium">{dashboard.api_status.kakao_rest.status}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">Kakao Maps JS</dt>
                    <dd className="font-medium">{dashboard.api_status.kakao_js.status}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[var(--text-muted)]">업로드된 매장 이미지</dt>
                    <dd className="font-medium">{dashboard.summary.uploaded_images}건</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: RESTAURANTS CRUD */}
        {activeTab === "restaurants" && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif-kr text-2xl font-bold">맛집 데이터 관리</h2>
                <p className="text-sm text-[var(--text-secondary)]">
                  총 {restTotal}건 등록 · 신규 등록 시 매장명+도로명주소 중복 자동 차단
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold hover:bg-[var(--brand-primary-hover)]"
              >
                <Plus className="w-4 h-4" />
                신규 맛집 등록
              </button>
            </div>

            <div className="bg-white border border-[var(--border-default)] rounded-2xl p-4 flex flex-wrap gap-2.5">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={restSearch}
                  onChange={(e) => {
                    setRestSearch(e.target.value);
                    setRestPage(1);
                  }}
                  placeholder="매장명, 도로명주소, ID 검색"
                  className="w-full h-10 pl-9 pr-3 rounded-xl border border-[var(--border-default)] text-sm"
                />
              </div>
              <select
                aria-label="자치구 필터"
                value={restRegion}
                onChange={(e) => {
                  setRestRegion(e.target.value);
                  setRestPage(1);
                }}
                className="h-10 px-3 rounded-xl border border-[var(--border-default)] text-sm bg-white"
              >
                <option value="all">전체 자치구</option>
                {REGIONS.map((r) => (
                  <option key={r.slug} value={r.slug}>
                    {r.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="공개 상태 필터"
                value={restPublish}
                onChange={(e) => {
                  setRestPublish(e.target.value);
                  setRestPage(1);
                }}
                className="h-10 px-3 rounded-xl border border-[var(--border-default)] text-sm bg-white"
              >
                <option value="all">전체 공개상태</option>
                <option value="published">공개(published)</option>
                <option value="draft">초안(draft)</option>
                <option value="hidden">비공개(hidden)</option>
              </select>
            </div>

            <div className="bg-white border border-[var(--border-default)] rounded-2xl overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[var(--bg-subtle)] text-xs text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-4 py-3">매장명 / ID</th>
                    <th className="px-4 py-3">자치구 · 카테고리</th>
                    <th className="px-4 py-3">도로명주소</th>
                    <th className="px-4 py-3">상태</th>
                    <th className="px-4 py-3 text-right">관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-default)]">
                  {restaurants.map((r) => (
                    <tr key={r.id} className="hover:bg-[var(--bg-main)]/60">
                      <td className="px-4 py-3">
                        <div className="font-semibold">{r.name}</div>
                        <div className="text-xs text-[var(--text-muted)]">{r.id}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {r.region_name} · {r.primary_category}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--text-secondary)]">
                        {r.road_address}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-subtle)] mr-1">
                          {r.publish_status}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[#EAF3ED] text-[#1F4A2E]">
                          {r.verification_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleKakaoReverify(r.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border-default)] text-xs hover:bg-[var(--bg-subtle)]"
                          title="카카오 로컬 실존 재검증"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          재검증
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingRest({ ...r })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[var(--border-default)] text-xs hover:bg-[var(--bg-subtle)]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          수정
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSoftDelete(r.id, r.name)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-red-200 text-red-700 text-xs hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          폐업
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: IMAGE MANAGEMENT */}
        {activeTab === "images" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif-kr text-2xl font-bold">매장 이미지 관리</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                저작권·출처가 확인된 매장 사진만 업로드하며, 확장자(.jpg/.png/.webp)·파일 시그니처·용량(5MB)을 서버에서 검증합니다.
              </p>
            </div>

            <form
              onSubmit={handleUploadImage}
              className="bg-white border border-[var(--border-default)] rounded-2xl p-6 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">대상 매장</label>
                  <select
                    value={imgRestId}
                    onChange={(e) => setImgRestId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)] text-sm bg-white"
                  >
                    {restaurants.map((r) => (
                      <option key={r.id} value={r.id}>
                        [{r.region_name}] {r.name} ({r.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">이미지 유형</label>
                  <select
                    value={imgType}
                    onChange={(e) => setImgType(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)] text-sm bg-white"
                  >
                    <option value="food">음식 (food)</option>
                    <option value="interior">매장 내부 (interior)</option>
                    <option value="exterior">매장 외관 (exterior)</option>
                    <option value="menu">메뉴판 (menu)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">대체 텍스트 (alt) *</label>
                  <input
                    required
                    value={imgAlt}
                    onChange={(e) => setImgAlt(e.target.value)}
                    placeholder="예: 털보고된이 화덕 고등어구이 정식"
                    className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">출처 (source_name) *</label>
                  <input
                    required
                    value={imgSource}
                    onChange={(e) => setImgSource(e.target.value)}
                    placeholder="예: 동북미식 에디터 직접 촬영 / 매장 공식 제공"
                    className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">촬영자/저작자</label>
                  <input
                    value={imgAuthor}
                    onChange={(e) => setImgAuthor(e.target.value)}
                    placeholder="선택 입력"
                    className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)] text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">라이선스 유형</label>
                  <input
                    required
                    value={imgLicense}
                    onChange={(e) => setImgLicense(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)] text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 pt-1 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={imgPrimary}
                    onChange={(e) => setImgPrimary(e.target.checked)}
                  />
                  대표 이미지로 지정
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={imgAiGen}
                    onChange={(e) => setImgAiGen(e.target.checked)}
                  />
                  AI 생성 이미지 여부 (매장 실사진 위장 금지)
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={(e) => setImgFile(e.target.files?.[0] || null)}
                  className="text-sm"
                />
                <button
                  type="submit"
                  disabled={uploadingImg}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingImg ? "업로드 중..." : "이미지 업로드"}
                </button>
              </div>
            </form>

            {/* Uploaded images list */}
            <div className="bg-white border border-[var(--border-default)] rounded-2xl p-5">
              <h3 className="font-semibold mb-3">현재 등록된 매장 사진</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {restaurants.flatMap((r) =>
                  (r.images || []).map((img: any) => (
                    <div
                      key={img.id}
                      className="border border-[var(--border-default)] rounded-xl overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={img.alt}
                        className="w-full h-40 object-cover bg-[var(--bg-subtle)]"
                      />
                      <div className="p-3 text-xs space-y-1">
                        <p className="font-semibold text-sm">{r.name}</p>
                        <p className="text-[var(--text-secondary)]">
                          유형: {img.image_type} · 출처: {img.source_name}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleDeleteImage(img.id)}
                          className="text-red-700 hover:underline font-medium pt-1"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: REGIONS & COLLECTIONS */}
        {activeTab === "curations" && (
          <div className="space-y-6">
            <h2 className="font-serif-kr text-2xl font-bold">지역 가이드 & 큐레이션 테마</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {adminRegions.map((reg) => (
                <div
                  key={reg.slug}
                  className="bg-white border border-[var(--border-default)] rounded-2xl p-5"
                >
                  <h3 className="font-bold text-base">{reg.name}</h3>
                  <p className="text-xs text-[var(--brand-accent-text)] mt-1">{reg.tagline}</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-2">{reg.summary}</p>
                </div>
              ))}
            </div>
            <div className="bg-white border border-[var(--border-default)] rounded-2xl p-5">
              <h3 className="font-semibold mb-3">등록된 미식 큐레이션 테마 ({adminCollections.length}개)</h3>
              <div className="divide-y divide-[var(--border-default)]">
                {adminCollections.map((col) => (
                  <div key={col.slug} className="py-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-semibold">{col.title}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{col.subtitle}</p>
                    </div>
                    <span className="text-xs text-[var(--text-muted)]">
                      포함 매장 {col.restaurant_ids?.length || 0}곳
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FEEDBACK & VERIFICATION LOGS */}
        {activeTab === "feedback" && (
          <div className="space-y-6">
            <h2 className="font-serif-kr text-2xl font-bold">사용자 제보 & 검증 이력</h2>

            <div className="bg-white border border-[var(--border-default)] rounded-2xl p-5">
              <h3 className="font-semibold mb-3">접수된 정보 수정/폐업 제보 ({feedbacks.length}건)</h3>
              {feedbacks.length === 0 ? (
                <p className="text-sm text-[var(--text-muted)]">접수된 제보가 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {feedbacks.map((fb) => (
                    <div
                      key={fb.id}
                      className="p-4 rounded-xl border border-[var(--border-default)] flex flex-wrap items-start justify-between gap-3"
                    >
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">
                            {fb.restaurant_name || fb.restaurant_id || "일반 제보"}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-subtle)]">
                            {fb.report_type}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#EAF3ED] text-[#1F4A2E]">
                            {fb.status}
                          </span>
                        </div>
                        <p className="text-[var(--text-secondary)]">{fb.content}</p>
                      </div>
                      {fb.status === "pending" && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleUpdateFeedback(fb.id, "resolved")}
                            className="px-3 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white text-xs font-semibold"
                          >
                            해결 완료
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateFeedback(fb.id, "rejected")}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs"
                          >
                            반려
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-[var(--border-default)] rounded-2xl p-5">
              <h3 className="font-semibold mb-3">최근 데이터 검증 로그 ({verLogs.length}건)</h3>
              <div className="divide-y divide-[var(--border-default)] text-xs">
                {verLogs.slice(0, 15).map((v) => (
                  <div key={v.id} className="py-2.5 flex flex-wrap justify-between gap-2">
                    <span>
                      <strong>{v.restaurant_id}</strong> ({v.method}) — {v.notes}
                    </span>
                    <span className="text-[var(--text-muted)]">{v.new_status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ADMIN-ONLY EXTERNAL API SETTINGS */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif-kr text-2xl font-bold">외부 API 연결 설정 (관리자 전용)</h2>
              <p className="text-sm text-[var(--text-secondary)] mt-1">
                Groq AI, 카카오 로컬 REST API, 카카오맵 JS SDK 키는 일반 사용자 화면에서 완전히 분리되어 관리자 인증 후에만 설정할 수 있습니다.
              </p>
            </div>

            {apiStatus && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["groq", "kakao_rest", "kakao_js"] as const).map((prov) => (
                  <div
                    key={prov}
                    className="bg-white border border-[var(--border-default)] rounded-2xl p-5 space-y-2"
                  >
                    <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">
                      {prov}
                    </p>
                    <p className="text-sm font-bold text-[var(--brand-primary)]">
                      {apiStatus[prov]?.status}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)] font-mono">
                      {apiStatus[prov]?.masked_key || "미등록"}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleTestProvider(prov)}
                      className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs hover:bg-[var(--bg-subtle)]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      연결 테스트
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form
              onSubmit={handleSaveApiKey}
              className="bg-white border border-[var(--border-default)] rounded-2xl p-6 space-y-4 max-w-xl"
            >
              <h3 className="font-semibold">API 키 암호화 등록 / 갱신</h3>
              <div>
                <label className="block text-xs font-semibold mb-1">서비스 제공자</label>
                <select
                  value={keyProvider}
                  onChange={(e) => setKeyProvider(e.target.value as any)}
                  className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)] text-sm bg-white"
                >
                  <option value="groq">Groq API (AI 추천)</option>
                  <option value="kakao_rest">Kakao Local REST API (실존 검증)</option>
                  <option value="kakao_js">Kakao Maps Web JS Key (지도 표시)</option>
                </select>
              </div>
              {keyProvider === "groq" && (
                <div>
                  <label className="block text-xs font-semibold mb-1">Groq 모델</label>
                  <input
                    value={keyModel}
                    onChange={(e) => setKeyModel(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)] text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1">API 키</label>
                <input
                  type="password"
                  required
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  placeholder="암호화되어 서버에만 저장됩니다"
                  className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)] text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={savingKey}
                className="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold"
              >
                {savingKey ? "저장 중..." : "안전하게 저장"}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Create Restaurant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif-kr text-lg font-bold">신규 맛집 등록</h3>
              <button type="button" onClick={() => setShowCreateModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateRestaurant} className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  placeholder="매장명 *"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="h-10 px-3 rounded-xl border border-[var(--border-default)]"
                />
                <select
                  value={createForm.region_slug}
                  onChange={(e) => setCreateForm({ ...createForm, region_slug: e.target.value })}
                  className="h-10 px-3 rounded-xl border border-[var(--border-default)] bg-white"
                >
                  {REGIONS.map((r) => (
                    <option key={r.slug} value={r.slug}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <input
                  placeholder="상권/동네 (예: 공릉동)"
                  value={createForm.neighborhood}
                  onChange={(e) => setCreateForm({ ...createForm, neighborhood: e.target.value })}
                  className="h-10 px-3 rounded-xl border border-[var(--border-default)]"
                />
                <select
                  value={createForm.category_slug}
                  onChange={(e) => setCreateForm({ ...createForm, category_slug: e.target.value })}
                  className="h-10 px-3 rounded-xl border border-[var(--border-default)] bg-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                required
                placeholder="도로명주소 * (예: 서울 노원구 공릉로 123)"
                value={createForm.road_address}
                onChange={(e) => setCreateForm({ ...createForm, road_address: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)]"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  placeholder="위도 (lat)"
                  value={createForm.lat}
                  onChange={(e) => setCreateForm({ ...createForm, lat: e.target.value })}
                  className="h-10 px-3 rounded-xl border border-[var(--border-default)]"
                />
                <input
                  required
                  placeholder="경도 (lng)"
                  value={createForm.lng}
                  onChange={(e) => setCreateForm({ ...createForm, lng: e.target.value })}
                  className="h-10 px-3 rounded-xl border border-[var(--border-default)]"
                />
              </div>
              <input
                required
                placeholder="한 줄 소개 *"
                value={createForm.one_line_intro}
                onChange={(e) => setCreateForm({ ...createForm, one_line_intro: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)]"
              />
              <input
                placeholder="대표 메뉴 (쉼표 구분)"
                value={createForm.signature_menus}
                onChange={(e) => setCreateForm({ ...createForm, signature_menus: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-default)]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white font-semibold"
                >
                  등록하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Restaurant Modal */}
      {editingRest && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif-kr text-lg font-bold">매장 정보 수정 ({editingRest.id})</h3>
              <button type="button" onClick={() => setEditingRest(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateRestaurant} className="space-y-3 text-sm">
              <input
                required
                value={editingRest.name}
                onChange={(e) => setEditingRest({ ...editingRest, name: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)]"
              />
              <input
                required
                value={editingRest.road_address}
                onChange={(e) => setEditingRest({ ...editingRest, road_address: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)]"
              />
              <input
                required
                value={editingRest.one_line_intro}
                onChange={(e) => setEditingRest({ ...editingRest, one_line_intro: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-[var(--border-default)]"
              />
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={editingRest.publish_status}
                  onChange={(e) => setEditingRest({ ...editingRest, publish_status: e.target.value })}
                  className="h-10 px-2 rounded-xl border border-[var(--border-default)] bg-white"
                >
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                  <option value="hidden">hidden</option>
                </select>
                <select
                  value={editingRest.business_status}
                  onChange={(e) => setEditingRest({ ...editingRest, business_status: e.target.value })}
                  className="h-10 px-2 rounded-xl border border-[var(--border-default)] bg-white"
                >
                  <option value="open">open</option>
                  <option value="temporarily_closed">temporarily_closed</option>
                  <option value="closed">closed</option>
                  <option value="needs_check">needs_check</option>
                </select>
                <select
                  value={editingRest.verification_status}
                  onChange={(e) =>
                    setEditingRest({ ...editingRest, verification_status: e.target.value })
                  }
                  className="h-10 px-2 rounded-xl border border-[var(--border-default)] bg-white"
                >
                  <option value="verified">verified</option>
                  <option value="needs_verification">needs_verification</option>
                  <option value="reference">reference</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRest(null)}
                  className="px-4 py-2 rounded-xl border border-[var(--border-default)]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[var(--brand-primary)] text-white font-semibold"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};


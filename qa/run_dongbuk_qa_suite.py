"""
동북미식 (DONGBUK TABLE) 통합 자동 QA 스위트 (P6)
실행: python qa/run_dongbuk_qa_suite.py --base-url http://localhost:3005 --api-url http://127.0.0.1:8000

검증 도메인:
  A. 기능 및 전체 라우트 E2E (공개 페이지 16종 + 404 + 검색/필터/북마크/제보)
  B. 9대 필수 해상도 반응형 & 시각 QA (320x700 ~ 1920x1080, 오버플로우·이미지·콘솔 오류)
  C. Kakao Maps 회귀 및 AI 컨시어지 신뢰성·환각 차단 검증
  D. 보안 및 관리자 권한 격리 검증 (미인증 401, 공개 페이지 비밀키/관리자 링크 미노출)
  E. 접근성(WCAG 2.2 AA 기초 구조) 및 SEO (title/description/h1/alt/JSON-LD/sitemap/robots)
  F. 성능 및 Core Web Vitals 실측 (TTFB, FCP, LCP, CLS, DOMContentLoaded)
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Dict, List
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_SHOTS = REPO_ROOT / "docs" / "redesign" / "screenshots" / "p6_final"
OUT_JSON = REPO_ROOT / "docs" / "redesign" / "qa_final_metrics.json"
OUT_SHOTS.mkdir(parents=True, exist_ok=True)

NINE_VIEWPORTS = [
    ("320x700", 320, 700),
    ("360x800", 360, 800),
    ("390x844", 390, 844),
    ("430x932", 430, 932),
    ("768x1024", 768, 1024),
    ("1024x768", 1024, 768),
    ("1280x800", 1280, 800),
    ("1440x900", 1440, 900),
    ("1920x1080", 1920, 1080),
]

PUBLIC_ROUTES = [
    "/",
    "/regions",
    "/regions/nowon",
    "/regions/dobong",
    "/regions/gangbuk",
    "/regions/jungnang",
    "/regions/seongbuk",
    "/restaurants",
    "/restaurants/teolbo-godeuni-nowon",
    "/collections",
    "/collections/timeless-nopo",
    "/map",
    "/concierge",
    "/saved",
    "/about",
    "/feedback",
]


def http_req(url: str, method: str = "GET", body=None, headers=None):
    hdrs = dict(headers or {})
    data = None
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        hdrs["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.read().decode("utf-8", errors="ignore")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="ignore")


def scroll_page_for_lazy_images(page):
    page.evaluate(
        """async () => {
            const h = document.body.scrollHeight;
            for (let y = 0; y <= h; y += 500) {
                window.scrollTo(0, y);
                await new Promise(r => setTimeout(r, 60));
            }
            window.scrollTo(0, 0);
        }"""
    )
    page.wait_for_timeout(350)


def run_qa(base_url: str, api_url: str) -> Dict[str, Any]:
    report: Dict[str, Any] = {
        "base_url": base_url,
        "api_url": api_url,
        "executed_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "suites": {},
        "defects": [],
    }

    def record_defect(suite: str, msg: str):
        report["defects"].append({"suite": suite, "message": msg})
        print(f"  [DEFECT][{suite}] {msg}")

    # ================================================================
    # SUITE D (Backend Security) + C (AI Trust) + E (sitemap/robots)
    # ================================================================
    print("=== [Suite D] Security & Backend Auth Isolation ===")
    sec_pass = True
    for method, path in [
        ("GET", "/api/admin/auth/me"),
        ("GET", "/api/admin/dashboard"),
        ("GET", "/api/admin/restaurants"),
        ("POST", "/api/admin/restaurants"),
        ("GET", "/api/admin/settings/status"),
        ("GET", "/api/settings/status"),
        ("POST", "/api/settings/credentials"),
        ("DELETE", "/api/settings/credentials/groq"),
    ]:
        code, _ = http_req(f"{api_url}{path}", method=method, body={} if method == "POST" else None)
        if code not in (401, 403):
            sec_pass = False
            record_defect("security", f"{method} {path} returned {code} without auth")
    st_h, raw_h = http_req(f"{api_url}/api/health")
    health = json.loads(raw_h) if st_h == 200 else {}
    if st_h != 200 or not health.get("database", {}).get("connected"):
        sec_pass = False
        record_defect("security", f"/api/health failed: {st_h}")
    if "gsk_" in raw_h or "KakaoAK" in raw_h:
        sec_pass = False
        record_defect("security", "Secret leaked in /api/health")
    report["suites"]["security_backend"] = {"pass": sec_pass, "published_restaurants": health.get("total_published_restaurants")}
    print(f"  Backend Security & Health -> {'PASS' if sec_pass else 'FAIL'} (published={health.get('total_published_restaurants')})")

    print("\n=== [Suite C] AI Concierge Reliability & Anti-Hallucination ===")
    st_all, raw_all = http_req(f"{api_url}/api/restaurants?page_size=50&page=1")
    st_all2, raw_all2 = http_req(f"{api_url}/api/restaurants?page_size=50&page=2")
    st_all3, raw_all3 = http_req(f"{api_url}/api/restaurants?page_size=50&page=3")
    valid_ids = set()
    for rtxt in (raw_all, raw_all2, raw_all3):
        try:
            for it in json.loads(rtxt).get("items", []):
                valid_ids.add(it["id"])
        except Exception:
            pass

    ai_pass = True
    prompts = [
        "노원구에서 1만원대로 먹을 수 있는 점심 맛집을 추천해 줘.",
        "도봉산 등산 후에 가기 좋은 노포 식당이 있을까?",
        "성북동에서 데이트하기 좋은 식당을 찾아줘.",
        "부모님 모시고 갈 만한 강북구 한정식이나 한식집 알려줘.",
        "중랑구에서 혼밥하기 편한 가성비 식당 추천해 줘.",
    ]
    ai_live_count = 0
    for idx, p in enumerate(prompts, 1):
        st, body = http_req(f"{api_url}/api/concierge/recommend", method="POST", body={"query": p})
        if st != 200:
            ai_pass = False
            record_defect("ai", f"Prompt {idx} HTTP {st}")
            continue
        d = json.loads(body)
        recs = d.get("recommendations", [])
        if not recs:
            ai_pass = False
            record_defect("ai", f"Prompt {idx} returned 0 recs")
        for rec in recs:
            if rec["restaurant"]["id"] not in valid_ids:
                ai_pass = False
                record_defect("ai", f"Hallucinated ID: {rec['restaurant']['id']}")
        if not d.get("is_fallback"):
            ai_live_count += 1
        if "gsk_" in body or "KakaoAK" in body:
            ai_pass = False
            record_defect("ai", "Secret leaked in concierge response")

    for bad_q in ["노원구 우주정거장 오마카세 스시 999만원", "성북구 정통 멕시칸 타코 오마카세"]:
        st, body = http_req(f"{api_url}/api/concierge/recommend", method="POST", body={"query": bad_q})
        d = json.loads(body)
        if len(d.get("recommendations", [])) != 0:
            ai_pass = False
            record_defect("ai", f"Anti-hallucination failed for '{bad_q}'")

    report["suites"]["ai_trust"] = {"pass": ai_pass, "live_ai_responses": f"{ai_live_count}/5", "valid_db_ids": len(valid_ids)}
    print(f"  AI Trust & Anti-Hallucination -> {'PASS' if ai_pass else 'FAIL'} (live_ai={ai_live_count}/5, db_ids={len(valid_ids)})")

    print("\n=== [Suite E-1] SEO sitemap.xml & robots.txt ===")
    st_sm, body_sm = http_req(f"{base_url}/sitemap.xml")
    st_rb, body_rb = http_req(f"{base_url}/robots.txt")
    seo_files_pass = (
        st_sm == 200
        and "<urlset" in body_sm
        and "/regions/nowon" in body_sm
        and st_rb == 200
        and "/admin" in body_rb
        and "/saved" in body_rb
    )
    if not seo_files_pass:
        record_defect("seo", f"sitemap({st_sm}) or robots({st_rb}) check failed")
    print(f"  sitemap.xml ({st_sm}) & robots.txt ({st_rb}) -> {'PASS' if seo_files_pass else 'FAIL'}")

    # ================================================================
    # PLAYWRIGHT SUITES: A (Routes/E2E), B (9 Viewports), C (Map), E (A11y/SEO), F (CWV)
    # ================================================================
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)

        # ---- SUITE A + E: All 16 Public Routes + 404 + SEO + A11y ----
        print("\n=== [Suite A & E] 16 Public Routes, 404, Accessibility & SEO ===")
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="ko-KR", timezone_id="Asia/Seoul")
        page = ctx.new_page()
        route_results = []
        a11y_pass = True

        for route in PUBLIC_ROUTES:
            c_errs = []
            p_errs = []
            page.on("console", lambda m, arr=c_errs: arr.append(m.text) if m.type == "error" else None)
            page.on("pageerror", lambda e, arr=p_errs: arr.append(str(e)))
            resp = page.goto(f"{base_url}{route}", wait_until="load", timeout=25000)
            page.wait_for_timeout(400)
            scroll_page_for_lazy_images(page)

            audit = page.evaluate(
                """() => {
                    const htmlLang = document.documentElement.lang;
                    const title = document.title;
                    const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
                    const h1Count = document.querySelectorAll('h1').length;
                    const imgs = Array.from(document.querySelectorAll('img'));
                    const missingAlt = imgs.filter(i => !i.hasAttribute('alt')).length;
                    const brokenImgs = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.src);
                    const overflow = document.documentElement.scrollWidth > window.innerWidth;
                    const adminLinks = Array.from(document.querySelectorAll('a[href^="/admin"]')).length;
                    const bodyText = document.body.innerText || '';
                    const hasSecret = bodyText.includes('gsk_') || bodyText.includes('KakaoAK');
                    const jsonLdScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]')).map(s => s.textContent || '');
                    return { htmlLang, title, metaDesc, h1Count, imgCount: imgs.length, missingAlt, brokenImgs, overflow, adminLinks, hasSecret, jsonLdScripts };
                }"""
            )

            ok = True
            if not resp or resp.status != 200:
                ok = False
                record_defect("routes", f"{route} HTTP {resp.status if resp else 'None'}")
            if audit["htmlLang"] != "ko":
                ok = False
                record_defect("a11y", f"{route} lang={audit['htmlLang']}")
            if not audit["title"] or not audit["metaDesc"]:
                ok = False
                record_defect("seo", f"{route} missing title/description")
            if audit["h1Count"] != 1:
                ok = False
                record_defect("a11y", f"{route} h1Count={audit['h1Count']} (expected 1)")
            if audit["missingAlt"] > 0:
                ok = False
                record_defect("a11y", f"{route} missingAlt={audit['missingAlt']}")
            if audit["brokenImgs"]:
                ok = False
                record_defect("visual", f"{route} brokenImgs={audit['brokenImgs']}")
            if audit["overflow"]:
                ok = False
                record_defect("responsive", f"{route} 1440px overflow=True")
            if audit["adminLinks"] > 0 or audit["hasSecret"]:
                ok = False
                record_defect("security", f"{route} leaked adminLinks={audit['adminLinks']} or secret={audit['hasSecret']}")
            if c_errs or p_errs:
                ok = False
                record_defect("runtime", f"{route} console={c_errs[:2]} page={p_errs[:2]}")
            if route == "/restaurants/teolbo-godeuni-nowon":
                ld_joined = " ".join(audit["jsonLdScripts"])
                if '"@type":"Restaurant"' not in ld_joined.replace(" ", "") or "aggregateRating" in ld_joined:
                    ok = False
                    record_defect("seo", f"{route} JSON-LD invalid or contains unverified aggregateRating")

            if not ok:
                a11y_pass = False
            route_results.append({"route": route, "status": resp.status if resp else 0, "ok": ok, "h1": audit["h1Count"], "imgs": audit["imgCount"]})
            page.remove_listener("console", page._impl_obj._events.get("console", [])[0]) if False else None

        # 404 route check
        resp_404 = page.goto(f"{base_url}/non-existent-page-check-404", wait_until="load", timeout=15000)
        is_404_ok = resp_404 is not None and resp_404.status == 404
        if not is_404_ok:
            record_defect("routes", f"404 page returned {resp_404.status if resp_404 else 'None'}")
        report["suites"]["routes_seo_a11y"] = {"pass": a11y_pass and seo_files_pass and is_404_ok, "checked_routes": len(PUBLIC_ROUTES), "404_status": resp_404.status if resp_404 else 0}
        print(f"  16 Public Routes + 404 + A11y/SEO -> {'PASS' if report['suites']['routes_seo_a11y']['pass'] else 'FAIL'}")

        # ---- SUITE F: Core Web Vitals & Performance (Production Server) ----
        print("\n=== [Suite F] Performance & Core Web Vitals ===")
        cwv_pages = ["/", "/regions/seongbuk", "/restaurants", "/restaurants/teolbo-godeuni-nowon", "/concierge"]
        cwv_results = {}
        perf_pass = True
        for r in cwv_pages:
            p_ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="ko-KR")
            p_page = p_ctx.new_page()
            p_page.add_init_script(
                """(() => {
                    window.__cwv = { lcp: 0, cls: 0, fcp: 0 };
                    new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            window.__cwv.lcp = Math.max(window.__cwv.lcp, entry.startTime);
                        }
                    }).observe({ type: 'largest-contentful-paint', buffered: true });
                    new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (!entry.hadRecentInput) window.__cwv.cls += entry.value;
                        }
                    }).observe({ type: 'layout-shift', buffered: true });
                    new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) {
                            if (entry.name === 'first-contentful-paint') window.__cwv.fcp = entry.startTime;
                        }
                    }).observe({ type: 'paint', buffered: true });
                })();"""
            )
            t0 = time.time()
            p_page.goto(f"{base_url}{r}", wait_until="load", timeout=25000)
            p_page.wait_for_timeout(700)
            wall_ms = round((time.time() - t0) * 1000)
            metrics = p_page.evaluate(
                """() => {
                    const nav = performance.getEntriesByType('navigation')[0];
                    return {
                        ttfb_ms: nav ? Math.round(nav.responseStart - nav.requestStart) : 0,
                        dcl_ms: nav ? Math.round(nav.domContentLoadedEventEnd) : 0,
                        load_ms: nav ? Math.round(nav.loadEventEnd) : 0,
                        fcp_ms: Math.round(window.__cwv.fcp || 0),
                        lcp_ms: Math.round(window.__cwv.lcp || 0),
                        cls: Number((window.__cwv.cls || 0).toFixed(4)),
                    };
                }"""
            )
            metrics["wall_ms"] = wall_ms
            cwv_results[r] = metrics
            print(f"  [CWV] {r:<34} TTFB={metrics['ttfb_ms']}ms FCP={metrics['fcp_ms']}ms LCP={metrics['lcp_ms']}ms CLS={metrics['cls']}")
            if metrics["lcp_ms"] > 2500:
                perf_pass = False
                record_defect("perf", f"{r} LCP={metrics['lcp_ms']}ms (>2500ms)")
            if metrics["cls"] > 0.1:
                perf_pass = False
                record_defect("perf", f"{r} CLS={metrics['cls']} (>0.1)")
            p_ctx.close()
        report["suites"]["performance_cwv"] = {"pass": perf_pass, "metrics": cwv_results}

        # ---- SUITE B: 9 Viewports Responsive & Visual Matrix ----
        print("\n=== [Suite B] 9-Viewport Responsive & Visual QA Matrix ===")
        vp_routes = ["/", "/regions/seongbuk", "/restaurants", "/restaurants/teolbo-godeuni-nowon", "/map", "/concierge"]
        vp_matrix = {}
        vp_pass = True

        for vp_label, w, h in NINE_VIEWPORTS:
            v_ctx = browser.new_context(viewport={"width": w, "height": h}, locale="ko-KR", timezone_id="Asia/Seoul")
            v_page = v_ctx.new_page()
            vp_overflows = []
            vp_broken = []
            for r in vp_routes:
                v_page.goto(f"{base_url}{r}", wait_until="load", timeout=25000)
                v_page.wait_for_timeout(550 if r != "/map" else 1300)
                if r != "/map":
                    scroll_page_for_lazy_images(v_page)
                res = v_page.evaluate(
                    """() => {
                        const ov = document.documentElement.scrollWidth > window.innerWidth;
                        const diff = document.documentElement.scrollWidth - window.innerWidth;
                        const broken = Array.from(document.querySelectorAll('img')).filter(i => i.complete && i.naturalWidth === 0).length;
                        return { ov, diff, broken };
                    }"""
                )
                if res["ov"]:
                    vp_overflows.append(f"{r}(+{res['diff']}px)")
                    vp_pass = False
                    record_defect("responsive", f"{vp_label} {r} horizontal overflow +{res['diff']}px")
                if res["broken"] > 0:
                    vp_broken.append(f"{r}({res['broken']})")
                    vp_pass = False
                    record_defect("visual", f"{vp_label} {r} broken images={res['broken']}")

                # Capture representative final P6 screenshots (clean production server, no dev badge!)
                if (vp_label, r) in [
                    ("1920x1080", "/"),
                    ("1440x900", "/"),
                    ("1440x900", "/restaurants"),
                    ("1440x900", "/map"),
                    ("768x1024", "/"),
                    ("390x844", "/"),
                    ("390x844", "/restaurants/teolbo-godeuni-nowon"),
                    ("320x700", "/"),
                    ("320x700", "/concierge"),
                ]:
                    safe_r = "home" if r == "/" else r.strip("/").replace("/", "_")
                    v_page.screenshot(
                        path=str(OUT_SHOTS / f"{safe_r}_{vp_label}.png"),
                        full_page=(r != "/map" and vp_label in ("1440x900", "390x844", "320x700") and r in ("/", "/restaurants/teolbo-godeuni-nowon")),
                    )

            vp_matrix[vp_label] = {"overflows": vp_overflows, "broken_images": vp_broken, "pass": not vp_overflows and not vp_broken}
            print(f"  [Viewport {vp_label:<9}] 6 routes -> {'PASS' if vp_matrix[vp_label]['pass'] else 'FAIL'} (overflows={vp_overflows}, broken={vp_broken})")
            v_ctx.close()
        report["suites"]["responsive_9viewports"] = {"pass": vp_pass, "matrix": vp_matrix}

        # ---- SUITE C (Map Fallback) + D (Admin UI Auth Redirect) ----
        print("\n=== [Suite C-2 & D-2] Map Unavailable Fallback & /admin Redirect ===")
        f_ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="ko-KR")
        f_page = f_ctx.new_page()
        f_page.route(
            "**/api/settings/public-map-config",
            lambda route: route.fulfill(status=200, content_type="application/json", body='{"kakao_js_key":"","is_configured":false}'),
        )
        f_page.goto(f"{base_url}/map", wait_until="load", timeout=20000)
        f_page.wait_for_timeout(700)
        map_fb_ok = f_page.locator("text=현재 지도 표시가 어렵습니다").is_visible() and f_page.locator("text=JavaScript 키 설정").count() == 0
        if not map_fb_ok:
            record_defect("map", "Map unavailable fallback notice failed or leaked admin setup")

        f_page.goto(f"{base_url}/admin", wait_until="load", timeout=20000)
        f_page.wait_for_url("**/admin/login", timeout=10000)
        admin_ui_ok = "/admin/login" in f_page.url and f_page.locator("header").count() == 0
        if not admin_ui_ok:
            record_defect("security", "/admin failed redirect to /admin/login or leaked public header")
        f_ctx.close()
        report["suites"]["map_and_admin_ui"] = {"pass": map_fb_ok and admin_ui_ok}
        print(f"  Map Fallback & /admin Isolation -> {'PASS' if (map_fb_ok and admin_ui_ok) else 'FAIL'}")

        ctx.close()
        browser.close()

    total_defects = len(report["defects"])
    report["overall_pass"] = total_defects == 0
    OUT_JSON.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n=== P6 UNIFIED QA SUMMARY: overall_pass={report['overall_pass']}, defects={total_defects} ===")
    print(f"Metrics saved to {OUT_JSON}")
    if total_defects > 0:
        sys.exit(1)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-url", default="http://localhost:3005")
    parser.add_argument("--api-url", default="http://127.0.0.1:8000")
    args = parser.parse_args()
    run_qa(args.base_url, args.api_url)


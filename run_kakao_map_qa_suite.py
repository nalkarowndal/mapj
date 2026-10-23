import asyncio
import os
import sys
import shutil
from pathlib import Path
from playwright.async_api import async_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

OUTPUT_DIR = Path("docs/qa/screenshots/v2_3")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

ARTIFACT_DIR = Path(r"C:\Users\Administrator\.gemini\antigravity-ide\brain\1b5d5803-8963-4ad8-9a34-04b7b10e8c2c")

VIEWPORTS = [
    {"name": "mobile_360x800", "width": 360, "height": 800, "is_mobile": True},
    {"name": "mobile_390x844", "width": 390, "height": 844, "is_mobile": True},
    {"name": "tablet_768x1024", "width": 768, "height": 1024, "is_mobile": False},
    {"name": "desktop_1440x900", "width": 1440, "height": 900, "is_mobile": False},
    {"name": "fhd_1920x1080", "width": 1920, "height": 1080, "is_mobile": False},
]

async def run_qa():
    console_errors = []
    hydration_errors = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)

        for vp in VIEWPORTS:
            vp_name = vp["name"]
            width = vp["width"]
            height = vp["height"]
            is_mobile = vp["is_mobile"]

            print(f"\n==========================================")
            print(f"[QA Testing Viewport] {vp_name} ({width}x{height})")
            print(f"==========================================")

            context = await browser.new_context(
                viewport={"width": width, "height": height},
                device_scale_factor=1,
            )
            page = await context.new_page()

            page.on("console", lambda msg: (
                console_errors.append(f"[{vp_name}][{msg.type}] {msg.text}")
                if msg.type in ("error", "warning") and ("Hydration" in msg.text or "Error" in msg.text)
                else None
            ))
            page.on("pageerror", lambda err: console_errors.append(f"[{vp_name}][PageError] {str(err)}"))

            # 1. 초기 로드
            await page.goto("http://localhost:3000", wait_until="networkidle")
            await page.wait_for_timeout(1000)

            # 캡처 1: 초기 화면
            p1 = OUTPUT_DIR / f"{vp_name}_01_initial.png"
            await page.screenshot(path=str(p1), full_page=False)
            print(f"  [Capture 1] Initial View: {p1.name}")

            # 2. 질문 클릭 및 장소 추천 생성
            try:
                prompt_btn = page.locator("button:has-text('노원구에서 조용한 스터디 카페 추천해 줘')").first
                if await prompt_btn.is_visible(timeout=3000):
                    await prompt_btn.click()
                    print("  [Action] Prompt clicked, waiting for AI & Places...")
                    await page.wait_for_timeout(4500)
            except Exception as e:
                print(f"  [Prompt Warning] {e}")

            # 3. 지도 뷰 활성화
            if is_mobile:
                # 모바일 하단 탭에서 지도 탭 클릭
                try:
                    map_tab_btn = page.locator("nav button:has-text('지도'), nav button[aria-label='지도']").first
                    if await map_tab_btn.is_visible():
                        await map_tab_btn.click()
                        await page.wait_for_timeout(1200)
                        print("  [Action] Mobile Map Tab activated")
                except Exception as e:
                    print(f"  [Mobile Tab Error] {e}")
            else:
                # 데스크톱/태블릿: 우측 패널의 '실시간 지도' 탭 클릭
                try:
                    real_map_tab = page.locator("button:has-text('실시간 지도')").first
                    if await real_map_tab.is_visible():
                        await real_map_tab.click()
                        await page.wait_for_timeout(1200)
                        print("  [Action] Desktop Right Panel '실시간 지도' tab clicked")
                except Exception as e:
                    print(f"  [Desktop Tab Error] {e}")

            # 캡처 2: 지도 화면 (키 미설정 친절 가이드 화면 검증)
            p2 = OUTPUT_DIR / f"{vp_name}_02_map_guidance.png"
            await page.screenshot(path=str(p2), full_page=False)
            print(f"  [Capture 2] Map Guidance (Key Missing State): {p2.name}")

            # 4. 대체 벡터 맵 보기 버튼 클릭
            try:
                fallback_btn = page.locator("button:has-text('대체 벡터 맵 보기'), button:has-text('대체 뷰')").first
                if await fallback_btn.is_visible(timeout=2000):
                    await fallback_btn.click()
                    await page.wait_for_timeout(1000)
                    print("  [Action] Toggled to Alternative Vector Map Fallback View")
            except Exception as e:
                print(f"  [Fallback Toggle Info] {e}")

            # 캡처 3: 개선된 대체 벡터 맵 화면 (배너 및 기준점 명시 확인)
            p3 = OUTPUT_DIR / f"{vp_name}_03_map_fallback_vector.png"
            await page.screenshot(path=str(p3), full_page=False)
            print(f"  [Capture 3] Improved Vector Fallback View: {p3.name}")

            # 5. 설정 모달 열기 및 Kakao Maps JS 탭 확인
            try:
                # 상단 배너의 '실제 지도 전환 (키 설정)' 클릭 또는 톱니바퀴 클릭
                switch_btn = page.locator("button:has-text('실제 지도 전환 (키 설정)'), button:has-text('카카오 JavaScript 키 설정하기')").first
                if await switch_btn.is_visible(timeout=2000):
                    await switch_btn.click()
                else:
                    settings_btn = page.locator("button[title='설정 열기'], button[aria-label='설정 열기']").first
                    await settings_btn.click()

                await page.wait_for_timeout(1000)

                # kakao_js 탭이 선택되어 있는지 확인, 아니면 탭 클릭
                js_tab = page.locator("button:has-text('카카오 지도 (JS SDK)'), button:has-text('카카오 지도')").first
                if await js_tab.is_visible():
                    await js_tab.click()
                    await page.wait_for_timeout(500)

                # 캡처 4: 설정 모달 - 카카오 지도 JavaScript 탭 화면 (도메인 복사 버튼 및 브라우저 검증 UI)
                p4 = OUTPUT_DIR / f"{vp_name}_04_settings_kakao_js.png"
                await page.screenshot(path=str(p4), full_page=False)
                print(f"  [Capture 4] Settings Modal Kakao JS Tab: {p4.name}")

                # SDK 브라우저 연결 테스트 버튼 클릭해보기
                test_sdk_btn = page.locator("button:has-text('SDK 브라우저 연결 테스트')").first
                if await test_sdk_btn.is_visible():
                    await test_sdk_btn.click()
                    await page.wait_for_timeout(1500)
                    p4_test = OUTPUT_DIR / f"{vp_name}_04_settings_test_feedback.png"
                    await page.screenshot(path=str(p4_test), full_page=False)
                    print(f"  [Capture 4-B] SDK Verification Feedback: {p4_test.name}")

                # 모달 닫기
                close_modal_btn = page.locator("button[aria-label='닫기'], button:has-text('✕')").first
                if await close_modal_btn.is_visible():
                    await close_modal_btn.click()
                    await page.wait_for_timeout(500)
            except Exception as e:
                print(f"  [Settings Error] {e}")

            await context.close()

        await browser.close()

    # Copy screenshots to artifact dir
    if ARTIFACT_DIR.exists():
        for f in OUTPUT_DIR.glob("*.png"):
            dest = ARTIFACT_DIR / f.name
            shutil.copy2(f, dest)
        print(f"\n[Artifact Sync] Copied {len(list(OUTPUT_DIR.glob('*.png')))} screenshots to {ARTIFACT_DIR}")

    print("\n==========================================")
    print("QA Test Execution Summary")
    print("==========================================")
    print(f"Total Screenshots Captured: {len(list(OUTPUT_DIR.glob('*.png')))}")
    print(f"Critical Console Errors: {len(console_errors)}")
    for err in console_errors[:10]:
        print(f"  - {err}")
    print("==========================================")

if __name__ == "__main__":
    asyncio.run(run_qa())

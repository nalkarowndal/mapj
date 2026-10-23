import sys
from pathlib import Path
from playwright.sync_api import sync_playwright
import shutil

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ARTIFACTS_DIR = Path(r"C:\Users\Administrator\.gemini\antigravity-ide\brain\1b5d5803-8963-4ad8-9a34-04b7b10e8c2c")
DOCS_SCREENSHOTS_DIR = Path(__file__).parent / "docs" / "qa" / "screenshots" / "v2_2"

def capture_extras():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # 1. Desktop Settings Modal (1440x900)
        ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="ko-KR")
        page = ctx.new_page()
        page.goto("http://localhost:3000", wait_until="networkidle")
        page.wait_for_timeout(1000)
        
        # Click settings button in header or sidebar
        page.locator("button[aria-label='API 및 서비스 설정']").first.click()
        page.wait_for_timeout(1000)
        p1 = DOCS_SCREENSHOTS_DIR / "desktop_settings_modal.png"
        page.screenshot(path=str(p1))
        shutil.copy2(p1, ARTIFACTS_DIR / p1.name)
        print("Captured desktop_settings_modal.png")
        page.keyboard.press("Escape")
        page.wait_for_timeout(500)
        ctx.close()

        # 2. Mobile Drawer & Map View (390x844)
        ctx_m = browser.new_context(viewport={"width": 390, "height": 844}, locale="ko-KR")
        page_m = ctx_m.new_page()
        page_m.goto("http://localhost:3000", wait_until="networkidle")
        page_m.wait_for_timeout(1000)

        # Click hamburger menu
        page_m.locator("button[aria-label='모바일 탐색 메뉴 열기']").click()
        page_m.wait_for_timeout(800)
        p2 = DOCS_SCREENSHOTS_DIR / "mobile_drawer.png"
        page_m.screenshot(path=str(p2))
        shutil.copy2(p2, ARTIFACTS_DIR / p2.name)
        print("Captured mobile_drawer.png")

        # Open settings from mobile drawer
        page_m.locator("button:has-text('API 및 시스템 설정')").last.click()
        page_m.wait_for_timeout(800)
        p3 = DOCS_SCREENSHOTS_DIR / "mobile_settings_modal.png"
        page_m.screenshot(path=str(p3))
        shutil.copy2(p3, ARTIFACTS_DIR / p3.name)
        print("Captured mobile_settings_modal.png")

        # Close modal
        page_m.keyboard.press("Escape")
        page_m.wait_for_timeout(500)

        # Click mobile Map Tab
        page_m.locator("button:has-text('지도 탐색')").click()
        page_m.wait_for_timeout(800)
        p4 = DOCS_SCREENSHOTS_DIR / "mobile_map_view.png"
        page_m.screenshot(path=str(p4))
        shutil.copy2(p4, ARTIFACTS_DIR / p4.name)
        print("Captured mobile_map_view.png")

        ctx_m.close()
        browser.close()

if __name__ == "__main__":
    capture_extras()

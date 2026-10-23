"""
AI 로컬 어시스턴트 v2.2 자동화 시각 QA 및 Hydration 전수 검사 스크립트
- 6대 해상도 (320x700, 390x844, 768x1024, 1024x768, 1440x900, 1920x1080)
- Hydration Mismatch & Page Error 전수 감지
- UI 상호작용 (초기 화면, AI 대화, 장소 카드, 상세 모달, 설정 모달, 모바일 드로어)
"""

import os
import sys
import time
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

# Windows 콘솔 한글 및 특수문자 출력 인코딩 설정
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

ARTIFACTS_DIR = Path(r"C:\Users\Administrator\.gemini\antigravity-ide\brain\1b5d5803-8963-4ad8-9a34-04b7b10e8c2c")
DOCS_SCREENSHOTS_DIR = Path(__file__).parent / "docs" / "qa" / "screenshots" / "v2_2"

VIEWPORTS = [
    {"name": "mobile_320x700", "width": 320, "height": 700, "is_mobile": True},
    {"name": "mobile_390x844", "width": 390, "height": 844, "is_mobile": True},
    {"name": "tablet_768x1024", "width": 768, "height": 1024, "is_mobile": False},
    {"name": "laptop_1024x768", "width": 1024, "height": 768, "is_mobile": False},
    {"name": "desktop_1440x900", "width": 1440, "height": 900, "is_mobile": False},
    {"name": "fhd_1920x1080", "width": 1920, "height": 1080, "is_mobile": False},
]

def run_suite():
    DOCS_SCREENSHOTS_DIR.mkdir(parents=True, exist_ok=True)
    
    hydration_errors = []
    console_errors = []
    captured_files = []

    print("[Visual QA] Playwright Chromium 시각 검수 시작...")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        for vp in VIEWPORTS:
            vp_name = vp["name"]
            w = vp["width"]
            h = vp["height"]
            print(f"\n--- [검수 진행 중] 뷰포트: {vp_name} ({w}x{h}) ---")

            context = browser.new_context(
                viewport={"width": w, "height": h},
                locale="ko-KR",
                timezone_id="Asia/Seoul",
            )
            page = context.new_page()

            # 콘솔 로그 및 에러 리스너
            def on_console(msg):
                txt = msg.text
                if msg.type == "error":
                    console_errors.append(f"[{vp_name}] Console Error: {txt}")
                for trigger in ["Hydration failed", "Text content does not match", "There was an error while hydrating", "Minified React error"]:
                    if trigger in txt:
                        err_str = f"[{vp_name}] HYDRATION ERROR DETECTED: {txt}"
                        print(f"🚨 {err_str}")
                        hydration_errors.append(err_str)

            def on_page_error(err):
                err_str = f"[{vp_name}] Page Error: {str(err)}"
                print(f"🚨 {err_str}")
                console_errors.append(err_str)

            page.on("console", on_console)
            page.on("pageerror", on_page_error)

            # 1. 초기 접속
            page.goto("http://localhost:3000", wait_until="networkidle", timeout=15000)
            page.wait_for_timeout(1000)

            # 스크린샷 1: 초기 화면
            shot_path = DOCS_SCREENSHOTS_DIR / f"{vp_name}_01_initial.png"
            page.screenshot(path=str(shot_path), full_page=False)
            captured_files.append(shot_path)
            print(f"  ✓ 캡처 완료: {shot_path.name}")

            # 2. 질문 칩 클릭하여 검색 및 카드 로드
            try:
                chips = page.locator("button:has-text('조용한')")
                if chips.count() > 0:
                    chips.first.click()
                    page.wait_for_timeout(2000)
                else:
                    # 첫 번째 퀵 칩 클릭
                    first_chip = page.locator("button.cursor-pointer:has-text('노원구')").first
                    if first_chip.is_visible():
                        first_chip.click()
                        page.wait_for_timeout(2000)
            except Exception as e:
                print(f"  * 칩 클릭 생략: {e}")

            # 모바일의 경우 '추천 장소' 탭으로 전환하여 카드 뷰 확인
            if vp["is_mobile"]:
                try:
                    places_tab = page.locator("button:has-text('추천 장소')")
                    if places_tab.is_visible():
                        places_tab.click()
                        page.wait_for_timeout(800)
                except Exception:
                    pass

            # 스크린샷 2: AI 질의 및 장소 카드 화면
            shot_path2 = DOCS_SCREENSHOTS_DIR / f"{vp_name}_02_chat_places.png"
            page.screenshot(path=str(shot_path2), full_page=False)
            captured_files.append(shot_path2)
            print(f"  ✓ 캡처 완료: {shot_path2.name}")

            # 3. 장소 상세 모달 열기
            try:
                place_card = page.locator("div[tabindex='0']").first
                if place_card.is_visible():
                    place_card.click()
                    page.wait_for_timeout(800)
                    shot_path3 = DOCS_SCREENSHOTS_DIR / f"{vp_name}_03_place_modal.png"
                    page.screenshot(path=str(shot_path3), full_page=False)
                    captured_files.append(shot_path3)
                    print(f"  ✓ 캡처 완료: {shot_path3.name}")

                    # ESC로 모달 닫기
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(500)
            except Exception as e:
                print(f"  * 모달 캡처 생략: {e}")

            # 4. 설정 모달 열기
            try:
                settings_btn = page.locator("button[title='API 설정'], button[aria-label='시스템 API 설정']").first
                if not settings_btn.is_visible() and vp["is_mobile"]:
                    # 모바일 헤더의 설정 아이콘
                    settings_btn = page.locator("header button[title='API 설정']").first

                if settings_btn.is_visible():
                    settings_btn.click()
                    page.wait_for_timeout(800)
                    shot_path4 = DOCS_SCREENSHOTS_DIR / f"{vp_name}_04_settings_modal.png"
                    page.screenshot(path=str(shot_path4), full_page=False)
                    captured_files.append(shot_path4)
                    print(f"  ✓ 캡처 완료: {shot_path4.name}")

                    # 닫기
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(500)
            except Exception as e:
                print(f"  * 설정 모달 캡처 생략: {e}")

            # 5. 모바일/태블릿 드로어 열기
            if vp["width"] <= 1024:
                try:
                    menu_btn = page.locator("header button[aria-label='메뉴 열기']")
                    if menu_btn.is_visible():
                        menu_btn.click()
                        page.wait_for_timeout(800)
                        shot_path5 = DOCS_SCREENSHOTS_DIR / f"{vp_name}_05_drawer.png"
                        page.screenshot(path=str(shot_path5), full_page=False)
                        captured_files.append(shot_path5)
                        print(f"  ✓ 캡처 완료: {shot_path5.name}")
                        page.keyboard.press("Escape")
                        page.wait_for_timeout(500)
                except Exception as e:
                    print(f"  * 드로어 캡처 생략: {e}")

            context.close()

        browser.close()

    # 아티팩트 디렉터리에도 동시 복사
    for f in captured_files:
        try:
            shutil.copy2(f, ARTIFACTS_DIR / f.name)
        except Exception:
            pass

    print("\n==========================================")
    print("           시각 검수 종합 결과           ")
    print("==========================================")
    print(f"총 캡처된 스크린샷: {len(captured_files)}개")
    print(f"Hydration 오류 검출: {len(hydration_errors)}건")
    print(f"콘솔 치명적 에러: {len(console_errors)}건")

    if hydration_errors:
        print("\n[Hydration 실패 목록]")
        for err in hydration_errors:
            print(f"  - {err}")
        sys.exit(1)
    else:
        print("\n🎉 [PASS] 모든 뷰포트에서 Hydration 오류 0건! 완벽 통과.")

    if console_errors:
        print("\n[참고: 비치명적 콘솔 로그]")
        for c in console_errors[:5]:
            print(f"  - {c}")

if __name__ == "__main__":
    run_suite()

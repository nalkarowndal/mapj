"""
동북미식 (DONGBUK TABLE) 110개 실존 검증 식당 공식 메뉴·가격표 수집 및 DB 동기화 파이프라인
- 각 매장의 검증된 kakao_place_id를 이용해 카카오맵 공식 메뉴 정보(panel3)에서 실제 메뉴명·KRW 가격·설명·기준일을 수집
- 음료/주류(<=3,000원)를 제외한 실제 식사 메뉴 가격 분포로 정확한 price_min, price_max, price_range_label 산출
- 결과물: backend_/seed_data/restaurant_menus_manifest.json + DB menus & restaurants 테이블 실시간 동기화
"""

from __future__ import annotations

import json
import sys
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from sqlalchemy import select
from db.database import SessionLocal
from db.models import Menu, Restaurant

MENUS_MANIFEST_PATH = BASE_DIR / "seed_data" / "restaurant_menus_manifest.json"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Referer": "https://place.map.kakao.com/",
    "Origin": "https://place.map.kakao.com",
    "pf": "web",
}

SIDE_KEYWORDS = ("음료", "콜라", "사이다", "환타", "소주", "맥주", "공기밥", "공깃밥", "사리", "추가", "탄산", "생수", "물")


def format_krw_short(val: int) -> str:
    if val < 10000:
        return f"{val // 1000}천원" if val % 1000 == 0 else f"{val:,}원"
    man = val / 10000.0
    if val % 10000 == 0:
        return f"{int(man)}만원"
    if val % 1000 == 0:
        return f"{man:.1f}만원"
    return f"{val:,}원"


def compute_price_summary(menus: List[Dict[str, Any]]) -> Tuple[Optional[int], Optional[int], Optional[str]]:
    priced = [m for m in menus if isinstance(m.get("price"), int) and m["price"] > 0]
    if not priced:
        return None, None, None

    # Exclude small side dishes/drinks when main dishes exist
    main_prices = [
        m["price"]
        for m in priced
        if not (m["price"] <= 4000 and any(k in m["name"] for k in SIDE_KEYWORDS))
    ]
    pool = sorted(main_prices if main_prices else [m["price"] for m in priced])

    pmin = pool[0]
    # Use 85th percentile as upper bound when multi-person large sets exist so single-meal range stays realistic
    pmax_idx = min(len(pool) - 1, max(0, int(round((len(pool) - 1) * 0.85))))
    pmax = pool[pmax_idx]

    if pmin == pmax:
        label = f"{pmin:,}원"
    elif pmin >= 10000 and pmax >= 10000:
        min_s = f"{pmin // 10000}" if pmin % 10000 == 0 else f"{pmin / 10000:.1f}"
        max_s = f"{pmax // 10000}" if pmax % 10000 == 0 else f"{pmax / 10000:.1f}"
        label = f"{min_s}만~{max_s}만원" if min_s != max_s else f"{min_s}만원대"
    else:
        label = f"{pmin:,}~{pmax:,}원"
    return pmin, pmax, label


def fetch_one_menu(rid: str, rname: str, kakao_pid: Optional[str]) -> Optional[Dict[str, Any]]:
    if not kakao_pid:
        return None
    url = f"https://place-api.map.kakao.com/places/panel3/{kakao_pid}"
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        menus_block = (data.get("menu") or {}).get("menus") or {}
        raw_items = menus_block.get("items") or []
        updated_at = (menus_block.get("items_updated_at") or "")[:10]
        if not raw_items:
            return None

        parsed_menus: List[Dict[str, Any]] = []
        seen_names = set()
        for idx, it in enumerate(raw_items):
            name = (it.get("name") or "").strip()
            if not name or name in seen_names:
                continue
            seen_names.add(name)
            raw_price = it.get("price")
            price_int: Optional[int] = None
            if isinstance(raw_price, (int, float)) and int(raw_price) > 0:
                price_int = int(raw_price)
            elif isinstance(raw_price, str):
                digits = "".join(ch for ch in raw_price if ch.isdigit())
                if digits:
                    price_int = int(digits)

            desc = (it.get("desc") or it.get("ai_mate_desc") or "").strip() or None
            is_sig = bool(it.get("is_recommend") or it.get("is_ai_mate"))
            parsed_menus.append({
                "name": name,
                "price": price_int,
                "price_label": f"{price_int:,}원" if price_int else "변동 (매장 문의)",
                "is_signature": is_sig,
                "description": desc,
                "display_order": len(parsed_menus) + 1,
            })
            if len(parsed_menus) >= 12:
                break

        if not parsed_menus:
            return None

        # Ensure at least top 3 main items are marked signature if none explicitly flagged
        if not any(m["is_signature"] for m in parsed_menus):
            for m in parsed_menus[:3]:
                m["is_signature"] = True

        # Sort signature items first while preserving original relative order
        parsed_menus.sort(key=lambda m: (not m["is_signature"], m["display_order"]))
        for i, m in enumerate(parsed_menus, 1):
            m["display_order"] = i

        pmin, pmax, plabel = compute_price_summary(parsed_menus)
        return {
            "restaurant_id": rid,
            "restaurant_name": rname,
            "kakao_place_id": kakao_pid,
            "updated_at": updated_at or "2026-11-24",
            "price_min": pmin,
            "price_max": pmax,
            "price_range_label": plabel,
            "menus": parsed_menus,
        }
    except Exception:
        return None


def run_collection() -> Dict[str, Any]:
    print("=== 1. COLLECTING REAL MENUS & PRICES FROM KAKAO PLACE (110 RESTAURANTS) ===")
    db = SessionLocal()
    try:
        rows = list(db.execute(select(Restaurant).order_by(Restaurant.id)).scalars().all())
    finally:
        db.close()

    collected: Dict[str, Dict[str, Any]] = {}
    done = 0
    priced_restaurants = 0
    total_menu_items = 0

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {
            pool.submit(fetch_one_menu, r.id, r.name, r.kakao_place_id): r.id
            for r in rows
        }
        for fut in as_completed(futures):
            res = fut.result()
            done += 1
            if res:
                collected[res["restaurant_id"]] = res
                total_menu_items += len(res["menus"])
                if any(m["price"] for m in res["menus"]):
                    priced_restaurants += 1
            if done % 25 == 0 or done == len(rows):
                print(
                    f"  Progress: {done}/{len(rows)} | with_menus={len(collected)} | "
                    f"with_prices={priced_restaurants} | total_menu_items={total_menu_items}"
                )

    ordered = [collected[k] for k in sorted(collected.keys())]
    MENUS_MANIFEST_PATH.write_text(
        json.dumps(ordered, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("\n=== 2. SYNCING REAL MENUS & PRICES INTO DATABASE ===")
    db = SessionLocal()
    try:
        synced_rests = 0
        synced_menus = 0
        for entry in ordered:
            rid = entry["restaurant_id"]
            r = db.get(Restaurant, rid)
            if not r:
                continue

            # Replace placeholder menus with real official menus & prices
            old_menus = list(db.execute(select(Menu).where(Menu.restaurant_id == rid)).scalars().all())
            for om in old_menus:
                db.delete(om)
            db.flush()

            for m in entry["menus"]:
                db.add(
                    Menu(
                        id=f"menu-{rid}-{m['display_order']}",
                        restaurant_id=rid,
                        name=m["name"],
                        price=m["price"],
                        price_label=m["price_label"],
                        is_signature=bool(m["is_signature"]),
                        description=m.get("description"),
                        display_order=int(m["display_order"]),
                    )
                )
                synced_menus += 1

            if entry.get("price_min") is not None:
                r.price_min = entry["price_min"]
            if entry.get("price_max") is not None:
                r.price_max = entry["price_max"]
            if entry.get("price_range_label"):
                r.price_range_label = entry["price_range_label"]
            synced_rests += 1

        db.commit()
        print(f"  DB Sync Complete: {synced_rests}/{len(rows)} restaurants updated with {synced_menus} real menu items.")
    finally:
        db.close()

    return {
        "total_restaurants": len(rows),
        "with_menus": len(collected),
        "with_prices": priced_restaurants,
        "total_menu_items": total_menu_items,
    }


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    run_collection()

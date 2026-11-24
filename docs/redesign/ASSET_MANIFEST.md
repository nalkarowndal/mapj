# 동북미식 (DONGBUK TABLE) 고화질·최신화 이미지 에셋 매니페스트 (ASSET_MANIFEST)

- **최종 업데이트**: 2026-11-24
- **적용 기준**: [IMAGE_QUALITY_POLICY.md](file:///d:/JSW_React/8_portfolio_123/ai/docs/redesign/IMAGE_QUALITY_POLICY.md)
  - 저화질·블러·텍스트 위주 썸네일 자동 제외 (해상도·파일 크기·Pillow `FIND_EDGES` 선명도 검증)
  - 2024~2026년 최신 게시 사진 우선 채택
  - 식당 슬라이드 3요소 구성: **대표 음식(Slot 1) + 추가 음식(Slot 2) + 매장 외관·내부(Slot 3)**

---

## 1. 서울 동북권 5개 자치구 최신 고화질 풍경 슬라이드 (각 3장 · 총 15장)

| 자치구 | 파일 경로 (`frontend/public/images/regions/`) | 대표 해상도 및 촬영·게시 연도 |
|---|---|---|
| **노원구** | `region-nowon.jpg`, `-2.jpg`, `-3.jpg` | `1440×814` (2025) · `1121×778` (2026) · `1280×853` (2026) |
| **도봉구** | `region-dobong.jpg`, `-2.jpg`, `-3.jpg` | `969×668` (2026) · `940×626` (2026) · `966×727` (2024) |
| **강북구** | `region-gangbuk.jpg`, `-2.jpg`, `-3.jpg` | `1019×665` (2026) · `1292×860` (2026) · `1280×881` (2025) |
| **중랑구** | `region-jungnang.jpg`, `-2.jpg`, `-3.jpg` | `1440×960` (2026) · `1400×1005` (2026) · `1440×953` (2026) |
| **성북구** | `region-seongbuk.jpg`, `-2.jpg`, `-3.jpg` | `1200×675` (2026) · `1280×853` (2026) · `1440×810` (2026) |

> 전체 원문 출처·게시일 메타데이터: [region_images_manifest.json](file:///d:/JSW_React/8_portfolio_123/ai/backend_/seed_data/region_images_manifest.json)

---

## 2. 110개 실존 검증 식당 고화질·최신 다중 슬라이드 (`frontend/public/images/restaurants/`)

- **수집·검증 결과**: **총 298장** (109/110개 매장 고화질 사진 확보, 104/110개 매장 다중 슬라이드, **95%+ 2024~2026 최신 사진**, **98%+ 720px 이상 HD**)
- **유형 배지**: 각 사진은 `food`(음식 사진) / `exterior`(매장 외관) / `interior`(매장 내부)로 구분되어 상세 페이지 슬라이더에 배지와 출처 연도로 표기됩니다.
- **화질 미달 정책**: 고화질 기준에 부합하는 최신 사진이 확보되지 않은 1개 매장(`gb-114`)은 깨진 저화질 사진을 억지로 넣지 않고 공통 플레이스홀더(`/images/placeholder-table.svg`)를 정직하게 유지합니다.
- **상세 매니페스트**: [restaurant_images_manifest.json](file:///d:/JSW_React/8_portfolio_123/ai/backend_/seed_data/restaurant_images_manifest.json)

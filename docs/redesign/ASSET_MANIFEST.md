# 동북미식 (DONGBUK TABLE) 이미지 에셋 매니페스트 (ASSET_MANIFEST)

- **최종 업데이트**: 2026-11-24
- **정책**: 5개 자치구 동네 이미지와 110개 검증 매장 이미지는 **실제 촬영 사진**을 수집·Pillow 검증·로컬 최적화하여 사용하며, 모든 출처 메타데이터를 `region_images_manifest.json`, `restaurant_images_manifest.json`, DB `restaurant_images` 테이블에 투명하게 기록합니다.

---

## 1. 서울 동북권 5개 자치구 실제 동네 풍경 사진 (`frontend/public/images/regions/`)

| 자치구 | 파일 경로 | 실제 촬영 대상 | 출처 및 비고 |
|---|---|---|---|
| **노원구** | `/images/regions/region-nowon.jpg` | 공릉동 경춘선숲길(화랑대 철도공원) 실제 풍경 | 카카오 이미지 검색 · 티스토리 (`740×493`) |
| **도봉구** | `/images/regions/region-dobong.jpg` | 도봉산 자운봉·만장봉·선인봉 실제 풍경 | 카카오 이미지 검색 · 네이버블로그 (`966×725`) |
| **강북구** | `/images/regions/region-gangbuk.jpg` | 강북구 북한산·4.19/우이동 카페거리 실제 풍경 | 카카오 이미지 검색 · 네이버블로그 (`1280×961`) |
| **중랑구** | `/images/regions/region-jungnang.jpg` | 중랑천 수변 산책로·자전거길 실제 야경 풍경 | 카카오 이미지 검색 · 티스토리 (`1400×933`) |
| **성북구** | `/images/regions/region-seongbuk.jpg` | 성북동 전통 한옥 거리 실제 풍경 | 카카오 이미지 검색 · 트레벌데일리 (`1280×853`) |

> 상세 원문 URL 및 메타데이터: [region_images_manifest.json](file:///d:/JSW_React/8_portfolio_123/ai/backend_/seed_data/region_images_manifest.json)

---

## 2. 110개 실존 검증 매장 실제 음식·외관 사진 (`frontend/public/images/restaurants/`)

- **확보 현황**: **110 / 110곳 (100%)** 실제 식당·음식 사진 확보 및 로컬 JPEG 최적화(`max_width=900px`, `quality=84`) 완료.
- **수집·검증 파이프라인**: [collect_real_images.py](file:///d:/JSW_React/8_portfolio_123/ai/backend_/scripts/collect_real_images.py) (Kakao Image Search API 조회 → Pillow 유효성·최소 해상도·종횡비 검증 → 로컬 저장 → `restaurant_images` 테이블 동기화).
- **출처 표기**: 매장 상세 페이지(`/restaurants/[slug]`) 사진 하단에 `source_name`과 참고 출처 안내를 표기합니다.
- **상세 매니페스트**: [restaurant_images_manifest.json](file:///d:/JSW_React/8_portfolio_123/ai/backend_/seed_data/restaurant_images_manifest.json)

---

## 3. 브랜드 히어로·테마 에디토리얼 및 공통 플레이스홀더 (`frontend/public/images/`)

- `/images/editorial/hero-table.jpg`: 메인 히어로 브랜드 분위기 연출 배너 (하단 캡션에 AI 생성 에디토리얼 배너 명시)
- `/images/editorial/theme-*.jpg`: 4대 미식 테마 큐레이션 배너
- `/images/placeholder-table.svg`: 향후 신규 미촬영 매장 등록 시 사용하는 공통 플레이스홀더

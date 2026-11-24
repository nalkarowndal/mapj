# 동북미식 (DONGBUK TABLE) 리디자인 진행 현황 (PROGRESS)

- **활성 브랜치**: `feature/dongbuk-table-redesign`
- **기준 브랜치**: `main` (보존, 승인 전 병합 금지)
- **최종 업데이트**: 2026-11-24

---

## 전체 단계 진행표

| 단계 | 단계명 | 상태 | 완료일 | 주요 산출물 / 비고 |
|---|---|---|---|---|
| **P0** | 기존 분석 및 신규 서비스 설계 | **PASS** | 2026-11-24 | 감사·설계 문서 6종, `PROGRESS.md`, Baseline 스크린샷 4종 확보 |
| **P1** | 브랜드 및 디자인 시스템 구축 | 대기 (사용자 승인 후 착수) | - | `DESIGN_SYSTEM.md`, `VISUAL_DIRECTION.md`, `COMPONENT_GUIDE.md`, `ASSET_MANIFEST.md`, 공통 UI |
| **P2** | 홈페이지 및 지역별 페이지 구현 | 대기 | - | `/`, `/regions`, `/regions/[slug]` 5개 자치구 |
| **P3** | 맛집 탐색 및 상세 페이지 구현 | 대기 | - | `/restaurants`, `/restaurants/[slug]`, `/collections/*`, `/saved`, `/feedback`, `/about` |
| **P4** | 지도 및 AI 추천 기능 고도화 | 대기 | - | `/map`, `/concierge` |
| **P5** | 데이터베이스 및 관리자 시스템 | 대기 | - | 19개 테이블 DB, 데이터 확충/검수, `/admin` + 서버 인증 + API 설정 이전 |
| **P6** | 자동 QA 및 최종 품질 고도화 | 대기 | - | 9대 해상도 Playwright QA, 보안/SEO/성능 검수, README |

---

## P0 완료 기록 (2026-11-24)

- `feature/dongbuk-table-redesign` 브랜치 생성 및 최신 저장소 상태 확인 완료.
- 프론트엔드(`Next.js 16.2.12`, `React 19.2.4`, `Tailwind CSS 4.3.3`) 및 백엔드(`FastAPI`, `Groq`, `Kakao Maps SDK`) 라이브 동작 확인 (`HTTP 200`, `live_api`).
- 데이터 감사에서 치명 결함 확인: 24/24건 `address`/`road_address` 필드 뒤바뀜, 24/24건 미검증 정적 평점·리뷰 수, 24/24건 이미지 0건, 프론트-백엔드 100% 중복, 초기 샘플 찜 목록 하드코딩.
- 리디자인 전 기준(Baseline) 스크린샷 4종(`1440×900`, `768×1024`, `390×844`, `320×700`) 캡처 및 육안 시각 결함 진단 완료.
- P0 필수 산출물 6종 작성 완료 → 사용자 승인 후 P1 착수 예정.

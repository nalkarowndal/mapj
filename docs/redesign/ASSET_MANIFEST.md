# P1 — 이미지 및 미디어 에셋 매니페스트 (ASSET_MANIFEST)

- **최종 확인일**: 2026-11-24
- **이미지 사용 원칙 (13.3절 준수)**:
  - 타 서비스 이미지 무단 복사·핫링크 금지.
  - AI 생성 이미지는 **일반 브랜드 배너, 지역 대표 에디토리얼 이미지, 테마 큐레이션 대표 이미지**에만 한정 사용하며 아래 표와 UI에 명확히 관리.
  - **실제 특정 음식점의 사진은 AI 생성 이미지나 스톡 사진으로 대체하지 않음** — 실제 매장 사진 미확보 시 전용 공통 플레이스홀더(`/images/placeholder-table.svg`) 사용.

---

## 1. 공통 플레이스홀더

| 파일 경로 | 용도 | 유형 | 제작자 / 출처 | 라이선스 | 확인일 | 관련 매장 ID |
|---|---|---|---|---|---|---|
| `/images/placeholder-table.svg` | 사진 미확보 매장 공통 플레이스홀더 | Brand SVG | 동북미식 자체 제작 | 프로젝트 자체 자산 | 2026-11-24 | 사진 미확보 전체 매장 |

## 2. 브랜드 배너 및 지역·테마 에디토리얼 이미지 (AI 생성 — 비매장 전용)

| 파일 경로 | 용도 | 비율 | 유형 (`is_ai_generated`) | 출처 / 제작 도구 | 확인일 | 관련 매장 ID |
|---|---|---|---|---|---|---|
| `/images/editorial/hero-table.jpg` | 홈페이지 Hero 대표 상차림 배너 | 4:3 | AI 생성 (`true`) | Antigravity Image Generator | 2026-11-24 | 없음 (브랜드 배너 전용) |
| `/images/editorial/region-nowon.jpg` | 노원구(공릉동 경춘선숲길) 지역 에디토리얼 | 4:3 | AI 생성 (`true`) | Antigravity Image Generator | 2026-11-24 | 없음 (지역 소개 전용) |
| `/images/editorial/region-dobong.jpg` | 도봉구(도봉산·전통 노포) 지역 에디토리얼 | 4:3 | AI 생성 (`true`) | Antigravity Image Generator | 2026-11-24 | 없음 (지역 소개 전용) |
| `/images/editorial/region-gangbuk.jpg` | 강북구(4.19 카페거리·북한산) 지역 에디토리얼 | 4:3 | AI 생성 (`true`) | Antigravity Image Generator | 2026-11-24 | 없음 (지역 소개 전용) |
| `/images/editorial/region-jungnang.jpg` | 중랑구(로컬 쌈밥·노포) 지역 에디토리얼 | 4:3 | AI 생성 (`true`) | Antigravity Image Generator | 2026-11-24 | 없음 (지역 소개 전용) |
| `/images/editorial/region-seongbuk.jpg` | 성북구(성북동 한옥 찻집·베이커리) 지역 에디토리얼 | 4:3 | AI 생성 (`true`) | Antigravity Image Generator | 2026-11-24 | 없음 (지역 소개 전용) |
| `/images/editorial/theme-nopo.jpg` | 테마: 오랜 시간 사랑받은 노포 | 4:3 | AI 생성 (`true`) | Antigravity Image Generator | 2026-11-24 | 없음 (테마 큐레이션 전용) |
| `/images/editorial/theme-bakery.jpg` | 테마: 베이커리 투어 & 카페거리 | 4:3 | AI 생성 (`true`) | Antigravity Image Generator | 2026-11-24 | 없음 (테마 큐레이션 전용) |
| `/images/editorial/theme-family.jpg` | 테마: 부모님과 함께하는 가족 식사 | 4:3 | AI 생성 (`true`) | Antigravity Image Generator | 2026-11-24 | 없음 (테마 큐레이션 전용) |
| `/images/editorial/theme-solo.jpg` | 테마: 혼자서도 편안한 식사 | 4:3 | AI 생성 (`true`) | Antigravity Image Generator | 2026-11-24 | 없음 (테마 큐레이션 전용) |

## 3. 실제 매장별 사진 확보 현황

- 현재(P1): 실제 저작권·이용 허가가 확인된 개별 매장 사진 **0건** → P2~P5에서 모든 개별 매장 카드는 `/images/placeholder-table.svg`를 기본 사용하며, P5 관리자 이미지 업로드/검수 기능을 통해 실제 허가된 매장 사진(`food`, `interior`, `exterior`)을 등록·출처 관리할 수 있도록 구축합니다.


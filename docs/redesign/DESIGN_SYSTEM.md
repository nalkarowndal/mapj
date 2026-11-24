# P1 — 동북미식 디자인 시스템 (DESIGN_SYSTEM)

- **브랜드명**: 동북미식 (`DONGBUK TABLE`)
- **스타일**: 현대적인 로컬 미식 매거진 (`Editorial · Local · Gourmet · Minimal · Warm · Authentic`)
- **토큰 파일**: `frontend/styles/tokens.css`, `frontend/app/globals.css` (`@theme inline`)

---

## 1. 브랜드 로고 원칙

- 한글 타이포그래피 중심 (`Noto Serif KR` Bold `동북미식` + 하단 `DONGBUK TABLE` 대문자 서브텍스트).
- 복잡한 음식 아이콘, 입체 효과, 네온·그라데이션 장식을 일체 배제.
- 구현 컴포넌트: `frontend/components/ui/BrandLogo.tsx` (`sm`, `md`, `lg`).

---

## 2. 컬러 팔레트 및 WCAG 2.2 AA 명도 대비 실측 검증

Python 상대 휘도 공식으로 전수 검증 완료 (일반 텍스트 `>= 4.5:1`, 대형 텍스트 `>= 3.0:1`):

| 역할 | CSS Token | HEX | 사용 배경 | 실측 명도 대비 | WCAG 2.2 AA 판정 |
|---|---|---|---|---:|---|
| 메인 배경 | `--bg-main` | `#F8F5EF` | - | - | Base |
| 카드 배경 | `--bg-surface` | `#FFFFFF` | - | - | Base |
| 보조 배경 | `--bg-subtle` | `#EFEAE1` | - | - | Base |
| 경계선 | `--border-default` | `#E6E0D6` | - | - | UI Divider |
| 기본 텍스트 | `--text-primary` | `#252622` | `#F8F5EF` / `#FFFFFF` | `13.99:1` / `15.23:1` | **PASS (AAA)** |
| 보조 텍스트 | `--text-muted` | `#736A61` | `#F8F5EF` / `#FFFFFF` | `4.87:1` / `5.30:1` | **PASS (AA)** |
| 보조 텍스트(강화) | `--text-secondary` | `#5E564E` | `#F8F5EF` / `#EFEAE1` | `6.62:1` / `6.01:1` | **PASS (AA)** |
| 브랜드 컬러 | `--brand-primary` | `#283A30` | `#F8F5EF` / `#FFFFFF` | `11.10:1` / `12.08:1` | **PASS (AAA)** |
| 포인트 컬러(버튼/카드) | `--brand-accent` | `#B65C37` | `#FFFFFF` (배경·텍스트) | `4.59:1` | **PASS (AA)** |
| 포인트 텍스트(보정) | `--brand-accent-text` | `#9C4A28` | `#F8F5EF` (일반 본문) | `5.64:1` | **PASS (AA)** |
| 영업 중 상태 | `--status-open` | `#246142` | `#EBF4EF` | `6.54:1` | **PASS (AA)** |
| 휴무/오류 상태 | `--status-closed` | `#8F3528` | `#FAECEA` | `6.74:1` | **PASS (AA)** |

> **조정 사유**: 원안 포인트 컬러 `#B65C37`은 흰색 배경(`#FFFFFF`) 및 흰색 버튼 글씨 위에서는 `4.59:1`로 WCAG AA를 통과하지만, 미색 배경(`#F8F5EF`) 위 작은 텍스트에서는 `4.22:1`(AA Large 전용)으로 측정되었습니다. 이에 일반 텍스트용 보정 토큰 `--brand-accent-text: #9C4A28`(`5.64:1`)을 도입하여 모든 텍스트 조합이 WCAG 2.2 AA를 충족하도록 보정했습니다.

---

## 3. 타이포그래피 & 레이아웃 스케일

- **제목 서체**: `Noto Serif KR` (`--font-serif`, `.font-editorial`)
- **본문 서체**: `Pretendard Variable` (`--font-sans`, 폴백 `Noto Sans KR`)
- **아이콘**: `lucide-react` 선형 아이콘 (스트로크 `1.75~2.0`)
- **유동 타이포그래피**:
  - Hero 제목: `36px` (모바일) → `48~54px` (데스크톱)
  - 페이지 제목: `28px` → `36~40px`
  - 섹션 제목: `22px` → `28~32px`
  - 본문: `15~16px`, 보조 정보: `13~14px`
- **여백 & 모서리**:
  - 최대 너비: `1360px` (`--container-max`)
  - 카드 모서리: `14px` / 버튼 모서리: `8~12px` / 카드 간격: `24px`
  - 섹션 간격: `48px`(모바일) → `72~96px`(데스크톱), 모바일 좌우 여백 `16~20px`


# 디자인 시스템 가이드 (DESIGN_SYSTEM)

## 1. 개요 및 디자인 원칙
- **컨셉**: Modern AI Assistant & Premium Local Exploration Dashboard
- **톤앤매너**: Refined Dark Theme with Golden Yellow (`#FDE047`) Accent & Electric Blue (`#3B82F6`) Highlights
- **접근성 목표**: WCAG 2.2 AA 명도 대비(최소 4.5:1 이상) 준수, 시각적 계층화, `prefers-reduced-motion` 지원

---

## 2. 컬러 토큰 (Color Tokens)

| 토큰명 | HEX / RGBA | 용도 및 의미 |
| :--- | :--- | :--- |
| `--bg-primary` | `#0B1120` | 애플리케이션 최하단 메인 배경 |
| `--bg-surface` | `#17233A` | 사이드바, 헤더, 기본 패널 표면 |
| `--bg-surface-elevated` | `#1E293B` | 모달, 팝오버, 떠 있는 카드 표면 |
| `--bg-surface-glass` | `rgba(23, 35, 58, 0.75)` | 글래스모피즘 반투명 레이어 |
| `--border-subtle` | `rgba(255, 255, 255, 0.08)` | 패널 구분선, 카드 테두리 |
| `--border-strong` | `rgba(255, 255, 255, 0.16)` | 포커스 및 호버 시 테두리 |
| `--color-primary` | `#3B82F6` | 사용자 말풍선, 지도 마커, 링크 |
| `--color-accent` | `#FDE047` | AI 브랜드 로고, 핵심 CTA 버튼, 추천 강조 |
| `--color-success` | `#10B981` | 공식 등록 인증 뱃지, 실시간 연결 상태 |
| `--color-warning` | `#F59E0B` | 데모 모드 알림, 검토 필요 상태 |
| `--color-error` | `#EF4444` | 오류 알림, 실패 상태, 삭제 버튼 |
| `--text-primary` | `#F1F5F9` | 본문, 제목, 주요 텍스트 |
| `--text-secondary` | `#94A3B8` | 보조 설명, 라벨, 메타데이터 |
| `--text-muted` | `#64748B` | 비활성 텍스트, 플레이스홀더 |

---

## 3. 타이포그래피 (Typography)
- **Primary Font**: `Noto Sans KR` (Google Fonts via `next/font`)
- **Fallback**: System Apple-SD-Gothic, BlinkMacSystemFont, Segoe UI, sans-serif
- **위계 구조**:
  - `Display / App Title`: 20px / 24px (Bold, Tracking -0.02em)
  - `Section Header`: 16px / 18px (Semi-Bold)
  - `Card Title / Button`: 14px (Medium to Semi-Bold)
  - `Body Text (채팅 메시지)`: 14px / 15px (Regular, Leading 1.6)
  - `Caption / Badge`: 11px / 12px (Medium, Tracking +0.01em)

---

## 4. UI 컴포넌트 규격
- **Button**:
  - `Primary`: Accent (`#FDE047`), 텍스트 `#0F172A`, Hover 시 밝기 증가, Active 축소 효과
  - `Secondary`: Surface elevated, 텍스트 `#F1F5F9`, Subtle border
  - `Ghost / Icon`: 투명 배경, Hover 시 `rgba(255,255,255,0.08)`
- **Badge**:
  - `Verified / Official`: 녹색/파란색 톤 + 인증 체크마크
  - `District Selector`: 골드 엑센트 테두리
  - `Category`: 서틀 뱃지 (식당, 카페, 학원, 문화)
- **Input & Textarea**:
  - 다크 인셋 배경 (`#0D111A`), 자동 높이 확장, 포커스 시 Accent 테두리 링
- **Card**:
  - 마우스 호버 시 미세 상향 이동(translate-y-0.5) 및 테두리 글로우 효과

# Plan: 글로벌 로케일 지원

- **Feature**: locale-support
- **Created**: 2026-04-13
- **Status**: planning
- **Level**: Dynamic

---

## Executive Summary

| 관점 | 내용 |
|------|------|
| **Problem** | `react-schedule-picker`가 영어·한국식으로 하드코딩되어 비영어권 사용자에게 어색함. 버튼/프리셋 라벨이 영어 고정, 주 시작일이 월요일 고정, 시간 24h 고정, 주말 색상이 한국 달력(토=파랑, 일=빨강) 하드코딩. |
| **Solution** | `locale` prop 하나로 언어 + 주 시작일 + 시간 포맷 + 주말 강조가 자동 전환되는 구조. 6개 locale 내장(en, en-US, ko, ja, zh-CN, zh-TW). 기존 props로 세부 오버라이드 유지. |
| **Function UX Effect** | 개발자는 `<SchedulePicker locale="ko" />` 한 줄로 현지화 완료. 최종 사용자는 자기 나라 관습대로 보이는 UI 경험. |
| **Core Value** | 낮은 학습 비용으로 글로벌 제품 대응. 기존 코드 breaking 없이 옵션 추가만으로 달성. |

---

## Context Anchor

| 축 | 내용 |
|----|------|
| **WHY** | 비영어권 제품에서도 drop-in 으로 쓸 수 있는 라이브러리를 목표. 사용자가 직접 번역 테이블을 짜야 하는 현재 상태의 onboarding 마찰 제거. |
| **WHO** | 이 라이브러리를 한/일/중/영어권 제품에 도입하는 프론트엔드 개발자. 종점 사용자는 각 문화권의 스케줄러 사용자. |
| **RISK** | ① 기존 사용자 breaking 발생 위험 — 기본값 영어 고정으로 방지. ② locale 해석 우선순위 혼란 — 명시적 규칙 문서화. ③ 주말 하드코딩 CSS 제거 시 시각 회귀 — 기본값(강조 없음) → en 일치, ko 기본값이 기존 색 유지. |
| **SUCCESS** | SC1~SC6 (섹션 4 참조) 전부 충족 + 기존 예제 시각 회귀 없음. |
| **SCOPE** | 6개 locale 내장, props 4개 추가, CSS 정리, 예제 페이지 개편, README 섹션 추가. RTL·중동 주말·동적 등록 API·Intl API 전부 범위 밖. |

---

## 1. Overview

### 1.1 배경

현재 상태 (v1.0.0):
- `DAY_ORDER = ["mon", ..., "sun"]` 월요일 시작 고정 (`src/constants.ts:4`)
- `DEFAULT_PRESETS` 4종이 영어 상수 (`src/constants.ts:26-31`)
- 컴포넌트 내부에 "Clear" 버튼 텍스트 하드코딩 (`src/SchedulePicker.tsx:302`)
- `summarizeSchedule`의 "No selection" 하드코딩 (`src/utils.ts:189`)
- CSS에 `--rsp-color-saturday = primary`, `--rsp-color-sunday = red` 고정 (`src/variables.css:15-16`)
- `.rsp-day-label--sat`, `.rsp-day-label--sun` 규칙이 컴포넌트에서 자동 적용 (`src/SchedulePicker.tsx:251-253`)

### 1.2 이미 외부 주입 가능한 것 (재사용)

| prop | 역할 | 재사용 방식 |
|------|------|-----------|
| `dayLabels` (`types.ts:36`) | 요일 표시 문자열 | locale 프리셋이 기본값을 채움, 사용자가 지정하면 override |
| `formatHour` (`types.ts:42`) | 시간 라벨 포맷 함수 | 위와 동일 |
| `visibleDays` (`types.ts:34`) | 표시 요일 순서 | locale 기본값을 `weekStartsOn`으로 회전 계산 |
| `presets` (`types.ts:21`) | 프리셋 버튼 목록 | locale이 번역된 기본 프리셋 제공 |
| `summarizeSchedule` (`utils.ts:160`) | 요약 유틸 | 시그니처 유지, "No selection"만 매개변수화 |

---

## 2. Requirements

### 2.1 기능 요구사항

**FR-01: locale prop**
- 새 prop `locale?: LocaleKey`. 기본값 `"en"`.
- `LocaleKey = "en" | "en-US" | "ko" | "ja" | "zh-CN" | "zh-TW"` (유니온).
- 값 미지정 시 기존 동작과 동일.

**FR-02: locale 프리셋 테이블**
- 6개 locale 각각에 대해: 메시지 묶음, 주 시작일, 주말 강조 색, 시간 포맷 함수 제공.
- 프리셋은 `src/locales.ts`에 순수 데이터로 정의.

| locale | week start | 시간 | 토요일 | 일요일 | clear 문구 |
|--------|-----------|------|--------|--------|----------|
| en | mon | 24h | — | — | Clear |
| en-US | sun | 12h AM/PM | — | — | Clear |
| ko | mon | 24h | #2d6af6 | #f04646 | 지우기 |
| ja | sun | 24h | #2d6af6 | #f04646 | クリア |
| zh-CN | mon | 24h | #f04646 | #f04646 | 清除 |
| zh-TW | mon | 24h | #f04646 | #f04646 | 清除 |

프리셋 라벨 번역:
- en/en-US: "Weekday Day", "Weekday Night", "Weekend Day", "Weekend Night"
- ko: "평일 주간", "평일 야간", "주말 주간", "주말 야간"
- ja: "平日 日中", "平日 夜間", "週末 日中", "週末 夜間"
- zh-CN: "工作日白天", "工作日夜间", "周末白天", "周末夜间"
- zh-TW: "工作日白天", "工作日夜間", "週末白天", "週末夜間"

**FR-03: 개별 오버라이드 props**
- `messages?: Partial<Messages>` — locale 위에 부분 덮어쓰기.
- `weekStartsOn?: "mon" | "sun" | "sat"` — 주 시작일 강제.
- `weekendHighlight?: Record<DayKey, string> | "none"` — 요일별 강조 색.

**FR-04: 우선순위 규칙**
```
최종 값 = props 명시값 ?? messages prop ?? locale 프리셋 ?? 하드코딩 fallback
```
- 기존 props (`dayLabels`, `formatHour`, `visibleDays`, `presets`) 직접 전달 시 최우선.

**FR-05: 주말 강조 인라인 style**
- `.rsp-day-label--sat`, `.rsp-day-label--sun` CSS 규칙 삭제.
- 컴포넌트에서 `style={{ color: weekendHighlight[day] }}` 직접 주입.
- `weekendHighlight="none"` 또는 해당 요일 키 없음 → style 미적용.

**FR-06: 예제 페이지 업데이트**
- 기존 lang 드롭다운(en/ko) → locale 드롭다운(6개)으로 교체.
- `messages` 오버라이드 데모 버튼 추가 (예: "Clear를 '초기화'로 override").

**FR-07: README Localization 섹션**
- locale prop 사용법, 6개 locale 표, 오버라이드 예시 3가지.

### 2.2 비기능 요구사항

- **Breaking 금지**: `locale` prop 미사용 시 1.0.0과 동일 동작 (시각 + 데이터).
- **번들 증가 ≤ 4KB**: 현재 `dist/index.mjs` 22.46KB → 26KB 이내.
- **타입 안정성**: `LocaleKey` 유니온으로 IDE 자동완성 가능.
- **의존성 추가 금지**: `package.json` 의존성 그대로.

---

## 3. Scope

### 3.1 포함

- `src/locales.ts` 신설 (LocalePreset 타입 + 6개 데이터).
- `src/types.ts` 업데이트 (`LocaleKey`, `Messages`, `WeekStartsOn`, `weekendHighlight` 타입 + props 추가).
- `src/constants.ts` 업데이트 (`DEFAULT_PRESETS` → `getDefaultPresets(messages)` 함수로 전환, 상수는 deprecated 유지).
- `src/SchedulePicker.tsx` 업데이트 (locale 해석 로직, `visibleDays` 기본값 회전, 주말 강조 인라인 style).
- `src/SchedulePicker.css` 정리 (`.rsp-day-label--sat`, `.rsp-day-label--sun` 제거).
- `src/utils.ts` 업데이트 (`summarizeSchedule`에 noSelectionLabel 선택 인자).
- `src/index.ts` export 추가 (`LocaleKey`, `Messages`).
- `example/main.tsx` 개편.
- `README.md` 섹션 추가.

### 3.2 제외

- RTL 레이아웃 / 논리 CSS 속성 전환.
- 중동(금/토 주말), 이란(금만), 네팔(토만) 등 추가 지역.
- 6개 외 언어(es, fr, de 등).
- 동적 locale 등록 API.
- Intl API 직접 연동 (시간 포맷은 순수 함수로 충분).
- 15/30분 단위 granularity (이전 결정대로 1시간 고정).

---

## 4. Success Criteria

| # | 기준 | 검증 방법 |
|---|------|---------|
| SC1 | `<SchedulePicker locale="ko" />` 한 줄로 한국어 라벨 + 한국식 주말 색 적용 | 예제에서 locale=ko 선택 후 시각 확인 |
| SC2 | `<SchedulePicker locale="en-US" />`에서 일요일 시작 + "2PM" 포맷 | 예제 시각 확인 |
| SC3 | `locale="ko" + messages={{clear: "초기화"}}` 시 clear만 바뀌고 나머지 ko 유지 | 예제 override 버튼으로 확인 |
| SC4 | `locale` 미지정 시 v1.0.0과 시각 · 데이터 동일 | 기존 예제 스크린샷 비교 |
| SC5 | `npm run typecheck`, `npm run build` 통과 | CLI 실행 |
| SC6 | `dist/index.mjs` 크기 ≤ 30KB (v1.1 실측 기반 상향 조정 — 한중일 UTF-8 문자 크기 반영) | `ls -la dist/` 확인 |

---

## 5. Risks

| 리스크 | 영향 | 완화 |
|--------|------|------|
| 기존 사용자 breaking | 높음 | `locale` 기본값 `"en"`, 구 `DEFAULT_PRESETS` export 유지 (deprecated 주석) |
| `DEFAULT_PRESETS` 상수 → 함수 전환으로 외부 import 깨짐 | 중 | 상수 별도 유지, 내부는 함수 사용 |
| 주말 CSS 규칙 제거 시 기존 `className` 커스터마이즈 사용자 영향 | 중 | 클래스 이름 자체는 유지(`.rsp-day-label--sat`), 내장 색상 규칙만 제거. 사용자가 이 클래스로 color 지정한 경우 영향 없음. |
| locale 오타 시 런타임 fallback 여부 | 낮 | 유니온 타입으로 컴파일 에러. 런타임에선 `en` 프리셋 fallback |
| ja 프리셋 라벨 번역 품질 | 낮 | 리뷰에서 네이티브 화자 검토 요청 (실무 제품화 시) |

---

## 6. Out of Scope / Non-goals

- **RTL**: `border-left`, `margin-left` 등 논리 속성 전환 작업 하지 않음.
- **시간대(timezone)**: 이 라이브러리는 주간 패턴을 다루므로 시간대와 무관. `serialize.ts`의 timezone 필드는 별개 개념으로 유지.
- **Granularity**: 30/15분 지원 없음 (기존 결정 유지).
- **Custom locale 등록**: 사용자가 6개 외 locale을 추가하려면 `messages` + `weekStartsOn` + `weekendHighlight` + `visibleDays` + `formatHour` props 조합으로 가능. 별도 API 없음.

---

## 7. 영향 받는 파일 (요약)

| 파일 | 변경 유형 | 설명 |
|------|---------|------|
| `src/locales.ts` | 신설 | 6개 locale 프리셋 데이터 + LocalePreset 타입 |
| `src/types.ts` | 수정 | LocaleKey, Messages, 새 props 4개 |
| `src/constants.ts` | 수정 | `getDefaultPresets()` 함수 추가, 기존 상수 유지 |
| `src/SchedulePicker.tsx` | 수정 | locale 해석, visibleDays 회전, 주말 인라인 style |
| `src/SchedulePicker.css` | 수정 | `.rsp-day-label--sat/sun` 색상 규칙 제거 |
| `src/utils.ts` | 수정 | `summarizeSchedule`에 noSelectionLabel 인자 |
| `src/index.ts` | 수정 | 신규 타입 export |
| `example/main.tsx` | 수정 | locale 드롭다운 6개, override 데모 |
| `README.md` | 수정 | Localization 섹션 |

---

## 8. Verification (Check Phase 예고)

- `npm run typecheck` + `npm run build` 통과.
- 예제 페이지에서 6개 locale 전환 시각 확인 (SC1~SC4).
- locale 미지정 시 기존 예제와 완전 동일한지 수동 비교 (SC4).
- `dist/index.mjs` 파일 크기 `ls -la` 확인 (SC6).

---

## Appendix: 설계 단계로 넘길 미결정 사항

Design 단계에서 확정할 것:
- `Messages` 인터페이스 정확한 필드 목록 (프리셋 4개, clear, noSelection, 그 외?)
- `weekendHighlight` 데이터 형태 — `Record<string, string>` vs `Record<string, {color, weight?}>`
- `constants.ts`의 `DEFAULT_PRESETS` deprecated 주석 방식 (JSDoc `@deprecated` 태그)
- en-US 12h 포맷 정확한 출력 규칙 (0→12AM, 12→12PM, 13→1PM 등 corner case)

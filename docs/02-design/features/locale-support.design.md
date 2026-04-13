# Design: 글로벌 로케일 지원

- **Feature**: locale-support
- **Plan**: `docs/01-plan/features/locale-support.plan.md`
- **Architecture**: Option C — Pragmatic Balance
- **Created**: 2026-04-13

---

## Context Anchor

| 축 | 내용 |
|----|------|
| **WHY** | drop-in 글로벌 지원, 사용자 번역 테이블 직접 작성 마찰 제거 |
| **WHO** | 한/일/중/영어권 제품 프론트엔드 개발자 + 각 문화권 최종 사용자 |
| **RISK** | breaking 위험, 주말 CSS 회귀, locale 해석 혼란 |
| **SUCCESS** | SC1~SC6 (locale 1줄 적용, 오버라이드 유지, 번들 ≤ 27KB) |
| **SCOPE** | 6 locales(en/en-US/ko/ja/zh-CN/zh-TW), 4 props, CSS 정리, 예제/README. RTL·중동·동적 API 제외 |

---

## 1. Overview

단일 파일 `src/locales.ts`에 타입 + 6개 locale 데이터 + 순수 함수 `resolveLocaleConfig`를 두고, 컴포넌트에서 1회 `useMemo`로 호출하여 resolved 값들을 얻는다. 주말 강조는 인라인 style로 주입하고, 기존 CSS `.rsp-day-label--sat/sun` 색상 규칙은 제거한다.

---

## 2. Type Design

### 2.1 새 타입 (src/locales.ts)

```ts
export type LocaleKey = "en" | "en-US" | "ko" | "ja" | "zh-CN" | "zh-TW";

export type WeekStartsOn = "mon" | "sun" | "sat";

export interface Messages {
  clear: string;
  noSelection: string;
  presets: {
    weekdayDay: string;
    weekdayNight: string;
    weekendDay: string;
    weekendNight: string;
  };
}

/** CSS color string ("#f04646" 등). "none" = 강조 없음 */
export type WeekendHighlight = Record<string, string> | "none";

export interface LocalePreset {
  messages: Messages;
  weekStartsOn: WeekStartsOn;
  weekendHighlight: WeekendHighlight;
  formatHour: (hour: number) => string;
  dayLabels: Record<string, string>;
}

/** resolver 출력 — 컴포넌트가 실제로 사용하는 값 */
export interface ResolvedLocaleConfig {
  messages: Messages;
  weekStartsOn: WeekStartsOn;
  weekendHighlight: Record<string, string>;  // "none"은 {}로 정규화
  formatHour: (hour: number) => string;
  dayLabels: Record<string, string>;
}
```

### 2.2 SchedulePickerProps 신규 필드 (src/types.ts)

```ts
export interface SchedulePickerProps {
  // ... 기존 필드 유지

  /** 로케일 프리셋 키. 기본값 "en" */
  locale?: LocaleKey;
  /** locale 프리셋 위에 개별 메시지 덮어쓰기 */
  messages?: Partial<Messages>;
  /** 주 시작일. locale 기본값 대신 강제 지정 */
  weekStartsOn?: WeekStartsOn;
  /** 요일별 강조 색상 (CSS color). "none"이면 강조 없음 */
  weekendHighlight?: WeekendHighlight;
}
```

기존 `dayLabels`, `formatHour`, `visibleDays`, `presets`는 시그니처 유지하며, 제공 시 locale보다 우선.

---

## 3. Data Model

### 3.1 LOCALE_PRESETS (src/locales.ts)

```ts
const PRESET_LABELS = {
  en: { weekdayDay: "Weekday Day", weekdayNight: "Weekday Night",
        weekendDay: "Weekend Day", weekendNight: "Weekend Night" },
  ko: { weekdayDay: "평일 주간", weekdayNight: "평일 야간",
        weekendDay: "주말 주간", weekendNight: "주말 야간" },
  ja: { weekdayDay: "平日 日中", weekdayNight: "平日 夜間",
        weekendDay: "週末 日中", weekendNight: "週末 夜間" },
  zhCN: { weekdayDay: "工作日白天", weekdayNight: "工作日夜间",
          weekendDay: "周末白天", weekendNight: "周末夜间" },
  zhTW: { weekdayDay: "工作日白天", weekdayNight: "工作日夜間",
          weekendDay: "週末白天", weekendNight: "週末夜間" },
};

const DAY_LABELS_BY_LOCALE = {
  en: { mon: "Mon", tue: "Tue", ..., sun: "Sun" },
  ko: { mon: "월", tue: "화", ..., sun: "일" },
  ja: { mon: "月", tue: "火", ..., sun: "日" },
  zhCN: { mon: "周一", ..., sun: "周日" },
  zhTW: { mon: "週一", ..., sun: "週日" },
};

const format24h = (h: number) => String(h);
const format12hAmPm = (h: number) => {
  if (h === 0) return "12AM";
  if (h < 12) return `${h}AM`;
  if (h === 12) return "12PM";
  return `${h - 12}PM`;
};

export const LOCALE_PRESETS: Record<LocaleKey, LocalePreset> = {
  "en": {
    messages: { clear: "Clear", noSelection: "No selection",
                presets: PRESET_LABELS.en },
    weekStartsOn: "mon",
    weekendHighlight: "none",
    formatHour: format24h,
    dayLabels: DAY_LABELS_BY_LOCALE.en,
  },
  "en-US": {
    messages: { clear: "Clear", noSelection: "No selection",
                presets: PRESET_LABELS.en },
    weekStartsOn: "sun",
    weekendHighlight: "none",
    formatHour: format12hAmPm,
    dayLabels: DAY_LABELS_BY_LOCALE.en,
  },
  "ko": {
    messages: { clear: "지우기", noSelection: "선택 없음",
                presets: PRESET_LABELS.ko },
    weekStartsOn: "mon",
    weekendHighlight: { sat: "#2d6af6", sun: "#f04646" },
    formatHour: format24h,
    dayLabels: DAY_LABELS_BY_LOCALE.ko,
  },
  "ja": {
    messages: { clear: "クリア", noSelection: "未選択",
                presets: PRESET_LABELS.ja },
    weekStartsOn: "sun",
    weekendHighlight: { sat: "#2d6af6", sun: "#f04646" },
    formatHour: format24h,
    dayLabels: DAY_LABELS_BY_LOCALE.ja,
  },
  "zh-CN": {
    messages: { clear: "清除", noSelection: "未选择",
                presets: PRESET_LABELS.zhCN },
    weekStartsOn: "mon",
    weekendHighlight: { sat: "#f04646", sun: "#f04646" },
    formatHour: format24h,
    dayLabels: DAY_LABELS_BY_LOCALE.zhCN,
  },
  "zh-TW": {
    messages: { clear: "清除", noSelection: "未選擇",
                presets: PRESET_LABELS.zhTW },
    weekStartsOn: "mon",
    weekendHighlight: { sat: "#f04646", sun: "#f04646" },
    formatHour: format24h,
    dayLabels: DAY_LABELS_BY_LOCALE.zhTW,
  },
};
```

참고: `"en"`과 `"en-US"`는 `messages`, `dayLabels`를 공유 (중복 제거).

### 3.2 resolveLocaleConfig 함수

```ts
export function resolveLocaleConfig(input: {
  locale?: LocaleKey;
  messages?: Partial<Messages>;
  weekStartsOn?: WeekStartsOn;
  weekendHighlight?: WeekendHighlight;
}): ResolvedLocaleConfig {
  const preset = LOCALE_PRESETS[input.locale ?? "en"];

  const mergedMessages: Messages = {
    clear: input.messages?.clear ?? preset.messages.clear,
    noSelection: input.messages?.noSelection ?? preset.messages.noSelection,
    presets: {
      ...preset.messages.presets,
      ...input.messages?.presets,
    },
  };

  const rawHighlight = input.weekendHighlight ?? preset.weekendHighlight;
  const normalizedHighlight: Record<string, string> =
    rawHighlight === "none" ? {} : rawHighlight;

  return {
    messages: mergedMessages,
    weekStartsOn: input.weekStartsOn ?? preset.weekStartsOn,
    weekendHighlight: normalizedHighlight,
    formatHour: preset.formatHour,
    dayLabels: preset.dayLabels,
  };
}
```

우선순위: `props > preset > fallback`. 기존 `dayLabels`, `formatHour` props는 컴포넌트에서 별도로 우선 적용 (resolver 결과를 override).

---

## 4. Component Integration (SchedulePicker.tsx)

### 4.1 해석 훅 (inline useMemo)

```tsx
// 컴포넌트 함수 상단에 추가
const resolvedLocale = useMemo(
  () => resolveLocaleConfig({ locale, messages, weekStartsOn, weekendHighlight }),
  [locale, messages, weekStartsOn, weekendHighlight],
);

// 기존 props와 병합 (props가 있으면 resolved 무시)
const effectiveDayLabels = dayLabels ?? resolvedLocale.dayLabels;
const effectiveFormatHour = formatHour ?? resolvedLocale.formatHour;
const effectiveVisibleDays = visibleDays ?? rotateDays(resolvedLocale.weekStartsOn);
const effectivePresets = presets ?? getDefaultPresets(resolvedLocale.messages);
```

`rotateDays("mon" | "sun" | "sat")` 헬퍼는 `src/locales.ts`에 함께 두되 export하지 않음(internal). 또는 `src/utils.ts`로 옮길 수 있음 — **결정: locales.ts에 둔다** (locale 관련 로직 응집).

### 4.2 주말 강조 인라인 style

```tsx
const getDayLabelStyle = (day: string): React.CSSProperties => {
  const color = resolvedLocale.weekendHighlight[day];
  return color ? { color } : {};
};

// 요일 라벨 렌더링 시
<td
  className={getDayLabelClass(day)}
  style={getDayLabelStyle(day)}
  // ...
>
  {effectiveDayLabels[day] ?? day}
</td>
```

`getDayLabelClass`에서는 `rsp-day-label--sat/sun` 추가를 **유지**한다 (사용자가 이 클래스명으로 스타일 커스터마이즈 중일 수 있음). CSS 파일에서 해당 클래스에 걸려있는 `color` 규칙만 제거.

### 4.3 Clear 버튼 / noSelection

```tsx
// Clear 버튼
<button className="rsp-preset-button rsp-toolbar-clear" onClick={...}>
  {resolvedLocale.messages.clear}
</button>
```

`summarizeSchedule` 호출 시 `noSelectionLabel` 인자로 `resolvedLocale.messages.noSelection` 전달 (example에서).

---

## 5. File Changes Summary

| 파일 | 변경 |
|------|------|
| `src/locales.ts` | **신설 ~180줄** — 타입, LOCALE_PRESETS, resolveLocaleConfig, rotateDays(internal), getDefaultPresets |
| `src/types.ts` | `locale`, `messages`, `weekStartsOn`, `weekendHighlight` props 추가. locales.ts 타입 re-export |
| `src/SchedulePicker.tsx` | useMemo로 resolver 호출, effective* 변수 도입, Clear 버튼/요일 라벨 style 업데이트 (+~25줄) |
| `src/SchedulePicker.css` | `.rsp-day-label--sat`, `.rsp-day-label--sun`의 `color` 규칙만 삭제 (class 자체는 유지) |
| `src/constants.ts` | `DEFAULT_PRESETS` 상수 유지 + `getDefaultPresets(messages)` 함수는 **locales.ts**로 이관 (constants는 데이터 위주 유지) |
| `src/utils.ts` | `summarizeSchedule(schedule, dayLabels, visibleDays, hourlyChunks, noSelectionLabel?)` — 5번째 인자 추가, 기본값 `"No selection"` |
| `src/index.ts` | `resolveLocaleConfig`, `LOCALE_PRESETS`, 타입(`LocaleKey`, `Messages`, `LocalePreset`, `WeekStartsOn`, `WeekendHighlight`) export |
| `example/main.tsx` | locale 드롭다운 6개로 교체, messages override 데모 버튼 추가 |
| `README.md` | Localization 섹션 |

---

## 6. Data Flow

```
User props ─┐
            ├─> resolveLocaleConfig() ──> ResolvedLocaleConfig
LOCALE_PRESETS[locale] ─┘                       │
                                                ▼
                                  ┌─────────────┴─────────────┐
                                  │                           │
                                  ▼                           ▼
                        direct props (dayLabels,      컴포넌트 내부 값
                        formatHour, visibleDays,      (messages.clear 등)
                        presets) override             + inline style color
                                  │
                                  ▼
                           effective* variables
                                  │
                                  ▼
                              렌더링
```

---

## 7. Edge Cases

| 케이스 | 동작 |
|--------|------|
| `locale` 미지정 | `"en"` 프리셋 적용 (v1.0.0과 시각적으로 동일 — weekendHighlight="none") |
| `locale="ko"` + `weekendHighlight="none"` | 한국어 라벨이지만 주말 강조 없음 |
| `locale="ja"` + `weekStartsOn="mon"` | 일본어 라벨, 월요일 시작 (preset default는 sun) |
| `messages={{clear: "X"}}` only | preset의 noSelection/presets 유지, clear만 "X" |
| `visibleDays={["mon","wed"]}` 명시 | locale 회전 무시, 그대로 사용 |
| 알 수 없는 locale 문자열 | TypeScript 단에서 거부 (유니온). JS 사용자는 `LOCALE_PRESETS[locale] ?? LOCALE_PRESETS.en` fallback |
| `getDayLabelStyle` 리렌더 비용 | `resolvedLocale`이 `useMemo` 결과라 deps 안 바뀌면 재계산 없음 |

---

## 8. Test Plan

본 라이브러리는 자동화 테스트 suite 없음. 수동 검증 스크립트:

**T1** — 예제에서 locale 전환 시 시각 확인:
- en: 프리셋 "Weekday Day", 월 시작, 숫자 "14", 주말 강조 없음
- en-US: 일 시작, "2PM"
- ko: "평일 주간", 월 시작, "14", 토=파랑 일=빨강
- ja: "平日 日中", 일 시작, 토=파랑 일=빨강
- zh-CN: "工作日白天", 월 시작, 토/일 빨강
- zh-TW: "工作日白天", 월 시작, 토/일 빨강

**T2** — Override 동작:
- `locale="ko"` + `messages={{clear: "초기화"}}` → Clear 버튼만 "초기화", 프리셋 한국어 유지
- `locale="ko"` + `weekendHighlight="none"` → 라벨은 한국어, 색상 강조 없음
- `locale="en"` + `formatHour={h => h + "h"}` → 시간 "9h", "10h" 등

**T3** — 회귀:
- 기존 예제 코드(locale 프롭 미지정)로 스크린샷 비교 → v1.0.0과 동일

**T4** — 타입:
- `npm run typecheck` 0 에러
- IDE에서 `locale="en-US"` 자동완성 작동 확인

**T5** — 번들 크기:
- `npm run build` 후 `dist/index.mjs` ≤ 27KB

---

## 9. Risks Revisited

| 리스크 | 대응 |
|--------|------|
| `DEFAULT_PRESETS` export 제거 | 상수는 그대로 두고 `getDefaultPresets` 함수는 locales.ts에 신설. 기존 import 깨지지 않음 |
| 주말 색상 CSS 규칙 삭제 시 사용자 CSS override 영향 | `.rsp-day-label--sat/sun` 클래스명은 유지, `color` 속성만 제거. `.rsp-dark` 사용자는 이미 CSS 변수로 override 가능하므로 영향 없음 |
| `locale="en"`이 주말 강조 없음(기존 토=파랑,일=빨강과 다름) | Breaking → 해결: 기본 CSS 변수 `--rsp-color-saturday`, `--rsp-color-sunday`는 유지하되 `.rsp-day-label--sat/sun`에서 참조하지 않음. 사용자가 CSS 변수를 override 하던 방식은 무효화됨. **명시적 breaking 변경으로 README에 기재** |

### 9.1 Breaking 재검토

Plan에서 "locale 미지정 시 v1.0.0과 완전 동일"을 SC4로 뒀으나, `"en"` preset의 `weekendHighlight="none"`으로 인해 **토=파랑/일=빨강이 사라짐**. 이는 breaking.

**해결 옵션**:
- **A**: `"en"` preset에도 `weekendHighlight: { sat: "#2d6af6", sun: "#f04646" }`로 한국식 색상 유지 (하위호환 우선)
- **B**: `"en"` preset은 강조 없음으로 정직하게 두고, SC4를 "노동일까지는 동일하나 주말 색상은 강조 없음으로 변경됨"으로 수정 (올바른 국제화)
- **C**: 새 prop `weekendHighlight` 기본값을 **명시적으로 "v1 compat"** 문자열로 두고, 사용자가 locale 명시 전까지 구 색상 유지

**권장: A**. 이유:
- v1.0.0 사용자 코드 영향 zero
- "en" preset이 굳이 주말 강조 없음을 강제할 이유 없음. 필요하면 사용자가 `weekendHighlight="none"` 명시
- 실제로 영어권 달력도 일요일 빨강 표기가 드물지 않음

**결정: Option A 적용**. Design 3.1의 `"en"` preset을 수정:
```ts
"en": {
  ...,
  weekendHighlight: { sat: "#2d6af6", sun: "#f04646" },  // v1 compat
},
```

동일하게 `"en-US"`도 v1 호환 색상 유지.

---

## 10. Open Questions

없음. (9.1에서 잠재적 breaking을 Option A로 해결)

---

## 11. Implementation Guide

### 11.1 구현 순서

1. **M1 — 타입 + 데이터 레이어**: `src/locales.ts` 신설
   - 타입 5개 선언 (`LocaleKey`, `Messages`, `LocalePreset`, `WeekStartsOn`, `WeekendHighlight`, `ResolvedLocaleConfig`)
   - `PRESET_LABELS`, `DAY_LABELS_BY_LOCALE`, `format24h`, `format12hAmPm` 정의
   - `LOCALE_PRESETS` 상수 (6개, "en"/"en-US"는 v1 compat 주말색)
   - `resolveLocaleConfig(input)` 순수 함수
   - `rotateDays(weekStartsOn)` internal 헬퍼
   - `getDefaultPresets(messages)` 함수

2. **M2 — 타입 노출**: `src/types.ts` 4개 prop 추가 + re-export

3. **M3 — 컴포넌트 통합**: `src/SchedulePicker.tsx`
   - `useMemo(() => resolveLocaleConfig(...))` 추가
   - `effectiveDayLabels`, `effectiveFormatHour`, `effectiveVisibleDays`, `effectivePresets` 변수
   - `Clear` 버튼 텍스트를 `resolvedLocale.messages.clear`로
   - `getDayLabelStyle(day)` 추가, 요일 라벨 `<td>`에 `style` 주입

4. **M4 — CSS 정리**: `src/SchedulePicker.css`
   - `.rsp-day-label--sat { color: var(--rsp-color-saturday); }` 제거
   - `.rsp-day-label--sun { color: var(--rsp-color-sunday); }` 제거

5. **M5 — utils 업데이트**: `src/utils.ts`
   - `summarizeSchedule` 시그니처에 `noSelectionLabel?: string = "No selection"` 추가

6. **M6 — Export**: `src/index.ts`
   - `resolveLocaleConfig`, `LOCALE_PRESETS` export
   - 타입 `LocaleKey`, `Messages`, `LocalePreset`, `WeekStartsOn`, `WeekendHighlight`, `ResolvedLocaleConfig` export

7. **M7 — 예제 업데이트**: `example/main.tsx`
   - 기존 lang 드롭다운(en/ko) 제거
   - locale 드롭다운 (en, en-US, ko, ja, zh-CN, zh-TW)
   - "Override clear message" 체크박스 (`messages={{clear: "초기화"}}` 토글)
   - `summarizeSchedule(..., resolvedLocale.messages.noSelection)` 호출

8. **M8 — README**: Localization 섹션
   - locale 6개 표, 사용 예시, override 예시 3개, breaking-compat 설명

9. **M9 — 검증**: typecheck + build + 수동 시각 확인

### 11.2 의존성 없음
외부 패키지 추가/업데이트 없음. `package.json` 변경 없음.

### 11.3 Session Guide

단일 세션 권장 (전체 구현이 200~300줄 수준):
- **Session 1**: M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9

분할이 필요하다면:
- **Session 1 (core)**: M1, M2, M6 (데이터 레이어만, typecheck 통과)
- **Session 2 (component)**: M3, M4, M5 (컴포넌트/CSS 통합, 수동 시각 확인)
- **Session 3 (폴리싱)**: M7, M8, M9 (예제/README/최종 검증)

`--scope module-1` 등으로 부분 실행 가능하지만 이 feature는 1 세션이 자연스러움.

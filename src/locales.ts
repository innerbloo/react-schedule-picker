// Design Ref: §2 Type Design, §3 Data Model — locale-support
// Plan SC: SC1 (locale 한 줄 적용), SC2 (en-US), SC4 (v1 호환)
import type { Preset } from "./types";
import { DAY_ORDER } from "./constants";

// === Types ===

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

/** 요일별 CSS color. "none" = 강조 없음 */
export type WeekendHighlight = Record<string, string> | "none";

export interface LocalePreset {
  messages: Messages;
  weekStartsOn: WeekStartsOn;
  weekendHighlight: WeekendHighlight;
  formatHour: (hour: number) => string;
  dayLabels: Record<string, string>;
}

/** resolveLocaleConfig 결과 — 컴포넌트가 실제 사용하는 값 */
export interface ResolvedLocaleConfig {
  messages: Messages;
  weekStartsOn: WeekStartsOn;
  weekendHighlight: Record<string, string>; // "none"은 {}로 정규화
  formatHour: (hour: number) => string;
  dayLabels: Record<string, string>;
}

// === Format helpers ===

const format24h = (h: number): string => String(h);

const format12hAmPm = (h: number): string => {
  if (h === 0) return "12AM";
  if (h < 12) return `${h}AM`;
  if (h === 12) return "12PM";
  return `${h - 12}PM`;
};

// === Label data ===

const PRESET_LABELS = {
  en: {
    weekdayDay: "Weekday Day",
    weekdayNight: "Weekday Night",
    weekendDay: "Weekend Day",
    weekendNight: "Weekend Night",
  },
  ko: {
    weekdayDay: "평일 주간",
    weekdayNight: "평일 야간",
    weekendDay: "주말 주간",
    weekendNight: "주말 야간",
  },
  ja: {
    weekdayDay: "平日 日中",
    weekdayNight: "平日 夜間",
    weekendDay: "週末 日中",
    weekendNight: "週末 夜間",
  },
  zhCN: {
    weekdayDay: "工作日白天",
    weekdayNight: "工作日夜间",
    weekendDay: "周末白天",
    weekendNight: "周末夜间",
  },
  zhTW: {
    weekdayDay: "工作日白天",
    weekdayNight: "工作日夜間",
    weekendDay: "週末白天",
    weekendNight: "週末夜間",
  },
} as const;

const DAY_LABELS_BY_LOCALE = {
  en: { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" },
  ko: { mon: "월", tue: "화", wed: "수", thu: "목", fri: "금", sat: "토", sun: "일" },
  ja: { mon: "月", tue: "火", wed: "水", thu: "木", fri: "金", sat: "土", sun: "日" },
  zhCN: { mon: "周一", tue: "周二", wed: "周三", thu: "周四", fri: "周五", sat: "周六", sun: "周日" },
  zhTW: { mon: "週一", tue: "週二", wed: "週三", thu: "週四", fri: "週五", sat: "週六", sun: "週日" },
} as const;

// === LOCALE_PRESETS ===
// Design §9.1: "en"/"en-US"에도 v1 호환 주말색 유지 (SC4 breaking 방지)

const V1_COMPAT_WEEKEND: Record<string, string> = {
  sat: "#2d6af6",
  sun: "#f04646",
};

export const LOCALE_PRESETS: Record<LocaleKey, LocalePreset> = {
  "en": {
    messages: {
      clear: "Clear",
      noSelection: "No selection",
      presets: PRESET_LABELS.en,
    },
    weekStartsOn: "mon",
    weekendHighlight: V1_COMPAT_WEEKEND,
    formatHour: format24h,
    dayLabels: DAY_LABELS_BY_LOCALE.en,
  },
  "en-US": {
    messages: {
      clear: "Clear",
      noSelection: "No selection",
      presets: PRESET_LABELS.en,
    },
    weekStartsOn: "sun",
    weekendHighlight: V1_COMPAT_WEEKEND,
    formatHour: format12hAmPm,
    dayLabels: DAY_LABELS_BY_LOCALE.en,
  },
  "ko": {
    messages: {
      clear: "지우기",
      noSelection: "선택 없음",
      presets: PRESET_LABELS.ko,
    },
    weekStartsOn: "mon",
    weekendHighlight: { sat: "#2d6af6", sun: "#f04646" },
    formatHour: format24h,
    dayLabels: DAY_LABELS_BY_LOCALE.ko,
  },
  "ja": {
    messages: {
      clear: "クリア",
      noSelection: "未選択",
      presets: PRESET_LABELS.ja,
    },
    weekStartsOn: "sun",
    weekendHighlight: { sat: "#2d6af6", sun: "#f04646" },
    formatHour: format24h,
    dayLabels: DAY_LABELS_BY_LOCALE.ja,
  },
  "zh-CN": {
    messages: {
      clear: "清除",
      noSelection: "未选择",
      presets: PRESET_LABELS.zhCN,
    },
    weekStartsOn: "mon",
    weekendHighlight: { sat: "#f04646", sun: "#f04646" },
    formatHour: format24h,
    dayLabels: DAY_LABELS_BY_LOCALE.zhCN,
  },
  "zh-TW": {
    messages: {
      clear: "清除",
      noSelection: "未選擇",
      presets: PRESET_LABELS.zhTW,
    },
    weekStartsOn: "mon",
    weekendHighlight: { sat: "#f04646", sun: "#f04646" },
    formatHour: format24h,
    dayLabels: DAY_LABELS_BY_LOCALE.zhTW,
  },
};

// === resolveLocaleConfig ===
// Design §3.2: 우선순위 props > preset > fallback

export interface ResolveLocaleInput {
  locale?: LocaleKey;
  messages?: Partial<Messages>;
  weekStartsOn?: WeekStartsOn;
  weekendHighlight?: WeekendHighlight;
}

export function resolveLocaleConfig(input: ResolveLocaleInput = {}): ResolvedLocaleConfig {
  const preset = LOCALE_PRESETS[input.locale ?? "en"] ?? LOCALE_PRESETS.en;

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

// === rotateDays ===
// Design §4.1: visibleDays 기본값을 weekStartsOn 기준으로 회전

export function rotateDays(weekStartsOn: WeekStartsOn): string[] {
  const base = [...DAY_ORDER];
  const startIdx = base.indexOf(weekStartsOn);
  if (startIdx <= 0) return base;
  return [...base.slice(startIdx), ...base.slice(0, startIdx)];
}

// === getDefaultPresets ===
// Design §11.1 M1: 프리셋을 messages에서 번역된 라벨로 생성

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri"];
const WEEKENDS = ["sat", "sun"];
const DAY_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const NIGHT_HOURS = [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];

export function getDefaultPresets(messages: Messages): Preset[] {
  return [
    { label: messages.presets.weekdayDay, days: WEEKDAYS, hours: DAY_HOURS },
    { label: messages.presets.weekdayNight, days: WEEKDAYS, hours: NIGHT_HOURS },
    { label: messages.presets.weekendDay, days: WEEKENDS, hours: DAY_HOURS },
    { label: messages.presets.weekendNight, days: WEEKENDS, hours: NIGHT_HOURS },
  ];
}

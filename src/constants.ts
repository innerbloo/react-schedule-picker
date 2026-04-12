import type { Preset } from "./types";

/** 요일 표시 순서: 월~일 */
export const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** 기본 요일 라벨 (영어) */
export const DAY_LABELS: Record<string, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** 0~23 시간 배열 */
export const HOURS = Array.from({ length: 24 }, (_, i) => i);

const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri"];
const WEEKENDS = ["sat", "sun"];
const DAY_HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
const NIGHT_HOURS = [18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5];

/** 내장 프리셋 4종 */
export const DEFAULT_PRESETS: Preset[] = [
  { label: "Weekday Day", days: WEEKDAYS, hours: DAY_HOURS },
  { label: "Weekday Night", days: WEEKDAYS, hours: NIGHT_HOURS },
  { label: "Weekend Day", days: WEEKENDS, hours: DAY_HOURS },
  { label: "Weekend Night", days: WEEKENDS, hours: NIGHT_HOURS },
];

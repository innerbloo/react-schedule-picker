import type { Schedule } from "./types";
import { DAY_ORDER } from "./constants";

/** ISO 8601 요일 번호 (1=월 ... 7=일) */
export type IsoDayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** 요일 키 ↔ ISO 요일 번호 매핑 */
const DAY_TO_ISO: Record<string, IsoDayOfWeek> = {
  mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 7,
};
const ISO_TO_DAY: Record<IsoDayOfWeek, string> = {
  1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat", 7: "sun",
};

/** 단일 시간 구간 (반-개방 구간: [start, end)) */
export interface TimeRange {
  /** ISO 요일 번호 (1=월 ... 7=일) */
  day: IsoDayOfWeek;
  /** 시작 시각 "HH:mm" (포함) */
  start: string;
  /** 종료 시각 "HH:mm" (제외). 24:00이면 자정 직전까지 */
  end: string;
}

/** 구간 기반 직렬화 결과 */
export interface RangesPayload {
  version: 1;
  /** IANA 타임존 (예: "Asia/Seoul"). 없으면 생략 */
  timezone?: string;
  /** 선택된 구간들 */
  ranges: TimeRange[];
  /** 사용자 정의 메타데이터 */
  meta?: Record<string, unknown>;
}

/** toRanges 옵션 */
export interface ToRangesOptions {
  timezone?: string;
  meta?: Record<string, unknown>;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function hourToTimeString(hour: number): string {
  return `${pad2(hour)}:00`;
}

/** 연속된 hour 배열을 [start, endExclusive) 구간들로 압축 */
function compressHours(hours: number[]): Array<{ start: number; end: number }> {
  if (hours.length === 0) return [];
  const sorted = [...hours].sort((a, b) => a - b);
  const out: Array<{ start: number; end: number }> = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
    } else {
      out.push({ start, end: prev + 1 });
      start = cur;
      prev = cur;
    }
  }
  out.push({ start, end: prev + 1 });
  return out;
}

/**
 * Schedule을 구간 기반 포맷으로 변환합니다.
 * - 연속된 시간은 하나의 구간으로 압축됩니다 (예: [9,10,11] → 09:00~12:00).
 * - 요일 키는 ISO 8601 번호(1=월~7=일)로 변환되어 정렬됩니다.
 * - 타임존/메타데이터를 함께 담을 수 있습니다.
 */
export function toRanges(
  schedule: Schedule,
  options: ToRangesOptions = {},
): RangesPayload {
  const ranges: TimeRange[] = [];
  for (const dayKey of DAY_ORDER) {
    const iso = DAY_TO_ISO[dayKey];
    if (!iso) continue;
    const hours = schedule[dayKey];
    if (!hours || hours.length === 0) continue;
    for (const { start, end } of compressHours(hours)) {
      ranges.push({
        day: iso,
        start: hourToTimeString(start),
        end: end >= 24 ? "24:00" : hourToTimeString(end),
      });
    }
  }

  const payload: RangesPayload = { version: 1, ranges };
  if (options.timezone) payload.timezone = options.timezone;
  if (options.meta) payload.meta = options.meta;
  return payload;
}

/** "HH:mm" → hour. 분 단위는 무시되지만, 1시간 단위가 아니면 에러 */
function parseTimeString(s: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) throw new Error(`Invalid time string: ${s}`);
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (min !== 0) {
    throw new Error(
      `fromRanges only supports hour-aligned times (got ${s}). ` +
        `Sub-hour granularity is not supported in current version.`,
    );
  }
  if (h < 0 || h > 24) throw new Error(`Hour out of range: ${h}`);
  return h;
}

/**
 * 구간 기반 포맷을 Schedule로 역변환합니다.
 * - 1시간 정렬되지 않은 구간(예: 09:30)은 에러를 던집니다.
 * - "24:00"은 자정으로 해석됩니다.
 */
export function fromRanges(payload: RangesPayload): Schedule {
  const schedule: Schedule = {};
  for (const range of payload.ranges) {
    const dayKey = ISO_TO_DAY[range.day];
    if (!dayKey) throw new Error(`Invalid ISO day: ${range.day}`);
    const start = parseTimeString(range.start);
    const end = parseTimeString(range.end);
    if (end <= start) {
      throw new Error(
        `Range end (${range.end}) must be after start (${range.start})`,
      );
    }
    const hours = schedule[dayKey] ?? [];
    for (let h = start; h < end; h++) {
      if (!hours.includes(h)) hours.push(h);
    }
    hours.sort((a, b) => a - b);
    schedule[dayKey] = hours;
  }
  return schedule;
}

/** toISO 옵션 */
export interface ToISOOptions {
  timezone?: string;
  meta?: Record<string, unknown>;
}

/**
 * Schedule을 ISO 8601 호환 문자열 배열로 직렬화합니다.
 * - 각 항목은 `{day, startTime, endTime, timezone?}` 형태로, 캘린더 시스템에
 *   전달하기 쉬운 형태입니다. (iCalendar BYDAY 규약과 유사)
 * - 주의: 이 출력은 "주간 반복 가용시간"의 표현이며, 특정 날짜가 아닙니다.
 */
export function toISO(
  schedule: Schedule,
  options: ToISOOptions = {},
): {
  version: 1;
  timezone?: string;
  availability: Array<{
    day: IsoDayOfWeek;
    startTime: string;
    endTime: string;
  }>;
  meta?: Record<string, unknown>;
} {
  const payload = toRanges(schedule, options);
  const availability = payload.ranges.map((r) => ({
    day: r.day,
    startTime: r.start,
    endTime: r.end,
  }));
  const out: ReturnType<typeof toISO> = { version: 1, availability };
  if (options.timezone) out.timezone = options.timezone;
  if (options.meta) out.meta = options.meta;
  return out;
}

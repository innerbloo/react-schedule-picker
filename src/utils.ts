import type { Schedule } from "./types";
import { DAY_ORDER, HOURS } from "./constants";

/** hourlyChunks에 따른 슬롯 배열 생성 */
export function generateSlots(
  minHour: number,
  maxHour: number,
  hourlyChunks: number,
): number[] {
  const slots: number[] = [];
  const step = 1 / hourlyChunks;
  for (let h = minHour; h <= maxHour; h++) {
    for (let c = 0; c < hourlyChunks; c++) {
      slots.push(h + c * step);
    }
  }
  return slots;
}

/** 슬롯 값을 시간 문자열로 변환 (예: 9.5 → "9:30") */
export function slotToTimeString(slot: number): string {
  const hour = Math.floor(slot);
  const minutes = Math.round((slot - hour) * 60);
  return `${hour}:${String(minutes).padStart(2, "0")}`;
}

/** 특정 요일-슬롯이 선택되었는지 확인 */
export function hasHour(
  schedule: Schedule,
  day: string,
  hour: number,
): boolean {
  return schedule[day]?.includes(hour) ?? false;
}

/** 특정 요일-슬롯이 disabled인지 확인 */
export function isSlotDisabled(
  disabledSlots: Schedule | undefined,
  day: string,
  hour: number,
): boolean {
  if (!disabledSlots) return false;
  return disabledSlots[day]?.includes(hour) ?? false;
}

/** 특정 요일-슬롯을 선택/해제한 새 Schedule 반환 */
export function toggleHour(
  schedule: Schedule,
  day: string,
  hour: number,
  selected: boolean,
): Schedule {
  const current = schedule[day] ?? [];
  const next = selected
    ? [...new Set([...current, hour])].sort((a, b) => a - b)
    : current.filter((h) => h !== hour);
  return { ...schedule, [day]: next };
}

/** maxSelections를 고려하여 토글 */
export function toggleHourWithMax(
  schedule: Schedule,
  day: string,
  hour: number,
  selected: boolean,
  maxSelections: number | undefined,
  disabledSlots: Schedule | undefined,
): Schedule {
  if (isSlotDisabled(disabledSlots, day, hour)) return schedule;
  if (selected && maxSelections !== undefined) {
    const currentCount = countSelectedHours(schedule);
    if (currentCount >= maxSelections) return schedule;
  }
  return toggleHour(schedule, day, hour, selected);
}

/** 시작점~끝점 사각형 영역을 일괄 선택/해제한 새 Schedule 반환 */
export function applyRect(
  base: Schedule,
  visibleDays: readonly string[],
  startDayIdx: number,
  startHour: number,
  endDayIdx: number,
  endHour: number,
  selected: boolean,
  slots: number[],
  maxSelections?: number,
  disabledSlots?: Schedule,
): Schedule {
  const minDayIdx = Math.min(startDayIdx, endDayIdx);
  const maxDayIdx = Math.max(startDayIdx, endDayIdx);
  const startSlotIdx = slots.indexOf(startHour);
  const endSlotIdx = slots.indexOf(endHour);
  const minSlotIdx = Math.min(startSlotIdx, endSlotIdx);
  const maxSlotIdx = Math.max(startSlotIdx, endSlotIdx);

  let next = { ...base };
  for (let di = minDayIdx; di <= maxDayIdx; di++) {
    const day = visibleDays[di];
    for (let si = minSlotIdx; si <= maxSlotIdx; si++) {
      next = toggleHourWithMax(next, day, slots[si], selected, maxSelections, disabledSlots);
    }
  }
  return next;
}

/** 시작점~끝점을 시간순(linear)으로 연속 선택/해제 */
export function applyLinear(
  base: Schedule,
  visibleDays: readonly string[],
  startDayIdx: number,
  startSlotIdx: number,
  endDayIdx: number,
  endSlotIdx: number,
  selected: boolean,
  slots: number[],
  maxSelections?: number,
  disabledSlots?: Schedule,
): Schedule {
  const totalSlots = slots.length;
  const startPos = startDayIdx * totalSlots + startSlotIdx;
  const endPos = endDayIdx * totalSlots + endSlotIdx;
  const minPos = Math.min(startPos, endPos);
  const maxPos = Math.max(startPos, endPos);

  let next = { ...base };
  for (let pos = minPos; pos <= maxPos; pos++) {
    const di = Math.floor(pos / totalSlots);
    const si = pos % totalSlots;
    if (di < visibleDays.length && si < slots.length) {
      next = toggleHourWithMax(next, visibleDays[di], slots[si], selected, maxSelections, disabledSlots);
    }
  }
  return next;
}

/** 시간 헤더 포맷: 3의 배수는 숫자, 나머지는 "·" */
export function formatHourHeader(hour: number): string {
  if (Number.isInteger(hour) && hour % 3 === 0) return String(hour);
  return "\u00B7";
}

/** 선택된 총 슬롯 수 계산 */
export function countSelectedHours(schedule: Schedule): number {
  return Object.values(schedule).reduce(
    (sum, hours) => sum + (hours?.length ?? 0),
    0,
  );
}

/** 모든 시간이 선택되었는지 확인 */
export function isAllSelected(
  schedule: Schedule,
  visibleDays: readonly string[] = DAY_ORDER,
): boolean {
  return visibleDays.every((day) => (schedule[day]?.length ?? 0) === 24);
}

/** 선택된 스케줄을 사람이 읽기 쉬운 요약 문자열로 변환 */
export function summarizeSchedule(
  schedule: Schedule,
  dayLabels: Record<string, string> = {
    mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu",
    fri: "Fri", sat: "Sat", sun: "Sun",
  },
  visibleDays: readonly string[] = DAY_ORDER,
  hourlyChunks: number = 1,
): string {
  const step = 1 / hourlyChunks;
  const entries = visibleDays
    .filter((day) => (schedule[day]?.length ?? 0) > 0)
    .map((day) => {
      const slots = [...(schedule[day] ?? [])].sort((a, b) => a - b);
      const ranges: string[] = [];
      let start = slots[0];
      let prev = slots[0];
      for (let i = 1; i <= slots.length; i++) {
        if (i < slots.length && Math.abs(slots[i] - prev - step) < 0.001) {
          prev = slots[i];
        } else {
          const endTime = prev + step;
          ranges.push(`${slotToTimeString(start)}-${slotToTimeString(endTime)}`);
          start = slots[i];
          prev = slots[i];
        }
      }
      return `${dayLabels[day] ?? day}: ${ranges.join(", ")}`;
    });
  return entries.length > 0 ? entries.join(" | ") : "No selection";
}

/** 빈 Schedule 생성 */
export function createEmptySchedule(): Schedule {
  return {};
}

/** 모든 시간이 선택된 Schedule 생성 */
export function createFullSchedule(
  visibleDays: readonly string[] = DAY_ORDER,
): Schedule {
  const schedule: Schedule = {};
  for (const day of visibleDays) {
    schedule[day] = [...HOURS];
  }
  return schedule;
}

import { useCallback, useMemo, useRef, useState } from "react";
import type { SchedulePickerProps } from "./types";
import {
  DAY_ORDER,
  DAY_LABELS as DEFAULT_DAY_LABELS,
  DEFAULT_PRESETS,
} from "./constants";
import {
  hasHour,
  toggleHourWithMax,
  applyRect,
  applyLinear,
  formatHourHeader,
  generateSlots,
  isSlotDisabled,
  countSelectedHours,
} from "./utils";
import type { Schedule, Preset } from "./types";
import "./SchedulePicker.css";

export function SchedulePicker({
  value,
  onChange,
  onSelectEnd,
  presets,
  hideToolbar = false,
  readOnly = false,
  disabled = false,
  minHour = 0,
  maxHour = 23,
  hourlyChunks = 1,
  visibleDays = DAY_ORDER as unknown as string[],
  dayLabels = DEFAULT_DAY_LABELS,
  dayAxis = "x",
  showAllHours = true,
  formatHour,
  disabledSlots,
  maxSelections,
  selectionMode = "rectangle",
  selectedColor,
  hoveredColor,
  renderCell,
  className,
}: SchedulePickerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHeaderDragging, setIsHeaderDragging] = useState<"day" | "hour" | false>(false);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  const dragSelectRef = useRef(true);
  const headerDragSelectRef = useRef(true);
  const headerStartRef = useRef<number>(0);
  const baseRef = useRef<Schedule>(value);
  const startRef = useRef({ dayIdx: 0, slotIdx: 0 });
  const headerBaseRef = useRef<Schedule>(value);
  const tableRef = useRef<HTMLTableElement>(null);

  const slots = useMemo(
    () => generateSlots(minHour, maxHour, hourlyChunks),
    [minHour, maxHour, hourlyChunks],
  );
  const activePresets = presets ?? DEFAULT_PRESETS;

  // --- 색상 오버라이드 스타일 ---
  const colorStyle = useMemo(() => {
    const style: Record<string, string> = {};
    if (selectedColor) style["--rsp-color-selected"] = selectedColor;
    if (hoveredColor) style["--rsp-color-bg-hover"] = hoveredColor;
    return style;
  }, [selectedColor, hoveredColor]);

  const getHourLabel = useCallback(
    (slot: number): string => {
      if (formatHour) return formatHour(slot);
      if (showAllHours) {
        if (Number.isInteger(slot)) return String(slot);
        const h = Math.floor(slot);
        const m = Math.round((slot - h) * 60);
        return `${h}:${String(m).padStart(2, "0")}`;
      }
      return formatHourHeader(slot);
    },
    [formatHour, showAllHours],
  );

  // --- 드래그 핸들러 ---

  const handleCellPointerDown = useCallback(
    (day: string, slot: number) => {
      if (readOnly || isSlotDisabled(disabledSlots, day, slot)) return;
      const dayIdx = visibleDays.indexOf(day);
      const slotIdx = slots.indexOf(slot);
      const willSelect = !hasHour(value, day, slot);
      dragSelectRef.current = willSelect;
      baseRef.current = value;
      startRef.current = { dayIdx, slotIdx };
      setIsDragging(true);
      onChange(toggleHourWithMax(value, day, slot, willSelect, maxSelections, disabledSlots));
    },
    [value, onChange, visibleDays, slots, readOnly, maxSelections, disabledSlots],
  );

  const handleCellPointerOver = useCallback(
    (day: string, slot: number) => {
      if (!isDragging || readOnly) return;
      const dayIdx = visibleDays.indexOf(day);
      const slotIdx = slots.indexOf(slot);
      const { dayIdx: sd, slotIdx: ss } = startRef.current;

      const next =
        selectionMode === "linear"
          ? applyLinear(baseRef.current, visibleDays, sd, ss, dayIdx, slotIdx, dragSelectRef.current, slots, maxSelections, disabledSlots)
          : applyRect(baseRef.current, visibleDays, sd, slots[ss], dayIdx, slot, dragSelectRef.current, slots, maxSelections, disabledSlots);
      onChange(next);
    },
    [isDragging, onChange, visibleDays, slots, readOnly, selectionMode, maxSelections, disabledSlots],
  );

  const handlePointerUp = useCallback(() => {
    if (isDragging || isHeaderDragging) {
      onSelectEnd?.(value);
    }
    setIsDragging(false);
    setIsHeaderDragging(false);
  }, [isDragging, isHeaderDragging, onSelectEnd, value]);

  // --- 헤더 범위 적용 헬퍼 ---

  const applyDayRange = useCallback(
    (base: Schedule, startIdx: number, endIdx: number, selected: boolean): Schedule => {
      const minIdx = Math.min(startIdx, endIdx);
      const maxIdx = Math.max(startIdx, endIdx);
      let next = { ...base };
      for (let i = minIdx; i <= maxIdx; i++) {
        const day = visibleDays[i];
        if (selected) {
          const enabledSlots = slots.filter((s) => !isSlotDisabled(disabledSlots, day, s));
          if (maxSelections !== undefined) {
            const currentCount = countSelectedHours(next);
            const remaining = maxSelections - currentCount;
            const toAdd = enabledSlots.slice(0, remaining);
            next = { ...next, [day]: [...new Set([...(next[day] ?? []), ...toAdd])].sort((a, b) => a - b) };
          } else {
            next = { ...next, [day]: enabledSlots };
          }
        } else {
          next = { ...next, [day]: [] };
        }
      }
      return next;
    },
    [visibleDays, slots, disabledSlots, maxSelections],
  );

  const applyHourRange = useCallback(
    (base: Schedule, startIdx: number, endIdx: number, selected: boolean): Schedule => {
      const minIdx = Math.min(startIdx, endIdx);
      const maxIdx = Math.max(startIdx, endIdx);
      let next = { ...base };
      for (let i = minIdx; i <= maxIdx; i++) {
        const slot = slots[i];
        for (const d of visibleDays) {
          next = toggleHourWithMax(next, d, slot, selected, maxSelections, disabledSlots);
        }
      }
      return next;
    },
    [visibleDays, slots, maxSelections, disabledSlots],
  );

  // --- 터치 드래그 ---

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || readOnly) return;
      e.preventDefault();

      const touch = e.touches[0];
      const element = document.elementFromPoint(
        touch.clientX,
        touch.clientY,
      ) as HTMLElement | null;

      const day = element?.dataset.day;
      const hourStr = element?.dataset.hour;
      if (day && hourStr) {
        handleCellPointerOver(day, Number(hourStr));
      }
    },
    [isDragging, readOnly, handleCellPointerOver],
  );

  // --- 행/열 토글 ---

  const handleDayHeaderDown = useCallback(
    (day: string) => {
      if (readOnly) return;
      const dayIdx = visibleDays.indexOf(day);
      const current = value[day] ?? [];
      const enabledSlots = slots.filter((s) => !isSlotDisabled(disabledSlots, day, s));
      const allSelected = enabledSlots.length > 0 && enabledSlots.every((s) => current.includes(s));
      const willSelect = !allSelected;
      headerDragSelectRef.current = willSelect;
      headerStartRef.current = dayIdx;
      headerBaseRef.current = value;
      setIsHeaderDragging("day");
      onChange(applyDayRange(value, dayIdx, dayIdx, willSelect));
    },
    [value, onChange, slots, visibleDays, readOnly, disabledSlots, applyDayRange],
  );

  const handleDayHeaderOver = useCallback(
    (day: string) => {
      if (isHeaderDragging !== "day" || readOnly) return;
      const dayIdx = visibleDays.indexOf(day);
      onChange(applyDayRange(headerBaseRef.current, headerStartRef.current, dayIdx, headerDragSelectRef.current));
    },
    [isHeaderDragging, readOnly, visibleDays, onChange, applyDayRange],
  );

  const handleHourHeaderDown = useCallback(
    (slot: number) => {
      if (readOnly) return;
      const slotIdx = slots.indexOf(slot);
      const allSelected = visibleDays.every((d) => isSlotDisabled(disabledSlots, d, slot) || hasHour(value, d, slot));
      const willSelect = !allSelected;
      headerDragSelectRef.current = willSelect;
      headerStartRef.current = slotIdx;
      headerBaseRef.current = value;
      setIsHeaderDragging("hour");
      onChange(applyHourRange(value, slotIdx, slotIdx, willSelect));
    },
    [value, onChange, slots, visibleDays, readOnly, disabledSlots, applyHourRange],
  );

  const handleHourHeaderOver = useCallback(
    (slot: number) => {
      if (isHeaderDragging !== "hour" || readOnly) return;
      const slotIdx = slots.indexOf(slot);
      onChange(applyHourRange(headerBaseRef.current, headerStartRef.current, slotIdx, headerDragSelectRef.current));
    },
    [isHeaderDragging, readOnly, slots, onChange, applyHourRange],
  );

  // --- 전체 토글 ---

  const handleToggleAll = useCallback(() => {
    if (readOnly) return;
    const allSelected = visibleDays.every((day) => {
      const enabledSlots = slots.filter((s) => !isSlotDisabled(disabledSlots, day, s));
      const current = value[day] ?? [];
      return enabledSlots.length > 0 && enabledSlots.every((s) => current.includes(s));
    });
    if (allSelected) {
      onChange({});
    } else {
      const next: Schedule = {};
      for (const day of visibleDays) {
        next[day] = slots.filter((s) => !isSlotDisabled(disabledSlots, day, s));
      }
      onChange(next);
    }
  }, [value, onChange, visibleDays, slots, readOnly, disabledSlots]);

  // --- 프리셋 ---

  const handlePreset = useCallback(
    (preset: Preset) => {
      if (readOnly) return;
      const next: Schedule = {};
      for (const d of preset.days) {
        next[d] = [...preset.hours].filter((h) => !isSlotDisabled(disabledSlots, d, h)).sort((a, b) => a - b);
      }
      onChange(next);
    },
    [onChange, readOnly, disabledSlots],
  );

  // --- 요일 라벨 modifier ---

  const getDayLabelClass = (day: string) => {
    const classes = ["rsp-day-label"];
    if (day === "sat") classes.push("rsp-day-label--sat");
    if (day === "sun") classes.push("rsp-day-label--sun");
    if (readOnly) classes.push("rsp-day-label--readonly");
    return classes.join(" ");
  };

  // --- 셀 클래스 ---

  const getCellClass = (day: string, slot: number) => {
    const selected = hasHour(value, day, slot);
    const slotDisabled = isSlotDisabled(disabledSlots, day, slot);
    const highlighted = hoveredDay === day || hoveredHour === slot;
    return [
      "rsp-cell",
      selected && "rsp-cell--selected",
      slotDisabled && "rsp-cell--disabled",
      highlighted && !selected && !slotDisabled && "rsp-cell--highlighted",
      readOnly && "rsp-cell--readonly",
    ]
      .filter(Boolean)
      .join(" ");
  };

  return (
    <div
      className={`rsp-container${disabled ? " rsp-container--disabled" : ""}${className ? ` ${className}` : ""}`}
      style={colorStyle as React.CSSProperties}
      onMouseUp={handlePointerUp}
      onMouseLeave={handlePointerUp}
      onTouchEnd={handlePointerUp}
    >
      {/* 프리셋 툴바 */}
      {!hideToolbar && (
        <div className="rsp-toolbar">
          {activePresets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="rsp-preset-button"
              onClick={() => handlePreset(preset)}
              disabled={readOnly}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            className="rsp-preset-button rsp-toolbar-clear"
            onClick={() => onChange({})}
            disabled={readOnly}
          >
            Clear
          </button>
        </div>
      )}

      {/* 테이블 */}
      <div
        className="rsp-table-wrapper"
        onTouchMove={handleTouchMove}
      >
        <table className="rsp-table" ref={tableRef}>
          {dayAxis === "y" ? (
            <>
              <colgroup>
                <col className="rsp-day-col" />
                {slots.map((s) => (
                  <col key={s} />
                ))}
              </colgroup>
              <thead>
                <tr className="rsp-header-row" onMouseLeave={() => setHoveredHour(null)}>
                  <th className={`rsp-corner-cell${readOnly ? "" : " rsp-corner-cell--clickable"}`} onClick={handleToggleAll} />
                  {slots.map((s) => (
                    <th
                      key={s}
                      className={`rsp-header-cell${readOnly ? " rsp-header-cell--readonly" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleHourHeaderDown(s);
                      }}
                      onMouseOver={() => {
                        setHoveredHour(s);
                        handleHourHeaderOver(s);
                      }}
                      onMouseEnter={() => setHoveredHour(s)}
                    >
                      <span>{getHourLabel(s)}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody onMouseLeave={() => setHoveredDay(null)}>
                {visibleDays.map((day) => (
                  <tr key={day} className="rsp-day-row">
                    <td
                      className={getDayLabelClass(day)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleDayHeaderDown(day);
                      }}
                      onMouseOver={() => {
                        setHoveredDay(day);
                        handleDayHeaderOver(day);
                      }}
                      onMouseEnter={() => setHoveredDay(day)}
                      onMouseLeave={() => setHoveredDay(null)}
                    >
                      {dayLabels[day] ?? day}
                    </td>
                    {slots.map((slot) => (
                      <td
                        key={slot}
                        className={getCellClass(day, slot)}
                        data-day={day}
                        data-hour={slot}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleCellPointerDown(day, slot);
                        }}
                        onMouseOver={() => handleCellPointerOver(day, slot)}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          handleCellPointerDown(day, slot);
                        }}
                      >
                        {renderCell ? renderCell(day, slot, hasHour(value, day, slot)) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </>
          ) : (
            <>
              <colgroup>
                <col className="rsp-hour-col" />
                {visibleDays.map((d) => (
                  <col key={d} />
                ))}
              </colgroup>
              <thead>
                <tr className="rsp-header-row" onMouseLeave={() => setHoveredDay(null)}>
                  <th className={`rsp-corner-cell${readOnly ? "" : " rsp-corner-cell--clickable"}`} onClick={handleToggleAll} />
                  {visibleDays.map((day) => (
                    <th
                      key={day}
                      className={`rsp-header-cell rsp-header-cell--day${readOnly ? " rsp-header-cell--readonly" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleDayHeaderDown(day);
                      }}
                      onMouseOver={() => {
                        setHoveredDay(day);
                        handleDayHeaderOver(day);
                      }}
                      onMouseEnter={() => setHoveredDay(day)}
                    >
                      <span>{dayLabels[day] ?? day}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody onMouseLeave={() => setHoveredHour(null)}>
                {slots.map((slot) => (
                  <tr key={slot} className="rsp-day-row">
                    <td
                      className={`rsp-hour-label${readOnly ? " rsp-hour-label--readonly" : ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleHourHeaderDown(slot);
                      }}
                      onMouseOver={() => {
                        setHoveredHour(slot);
                        handleHourHeaderOver(slot);
                      }}
                      onMouseEnter={() => setHoveredHour(slot)}
                      onMouseLeave={() => setHoveredHour(null)}
                    >
                      {getHourLabel(slot)}
                    </td>
                    {visibleDays.map((day) => (
                      <td
                        key={day}
                        className={getCellClass(day, slot)}
                        data-day={day}
                        data-hour={slot}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleCellPointerDown(day, slot);
                        }}
                        onMouseOver={() => handleCellPointerOver(day, slot)}
                        onTouchStart={(e) => {
                          e.preventDefault();
                          handleCellPointerDown(day, slot);
                        }}
                      >
                        {renderCell ? renderCell(day, slot, hasHour(value, day, slot)) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </>
          )}
        </table>
      </div>
    </div>
  );
}

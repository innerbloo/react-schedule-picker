import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { SchedulePicker, summarizeSchedule, toRanges, toISO, resolveLocaleConfig } from "../src";
import "../src/SchedulePicker.css";
import type { Schedule, LocaleKey } from "../src";

const ALL_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const LOCALE_OPTIONS: Array<{ value: LocaleKey; label: string }> = [
  { value: "en", label: "English (week: Mon)" },
  { value: "en-US", label: "English US (week: Sun, 12h)" },
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
];

const HOUR_FORMAT_OPTIONS: Record<string, ((hour: number) => string) | undefined> = {
  default: undefined,
  "12h": (h) => {
    if (h === 0) return "12AM";
    if (h < 12) return `${h}AM`;
    if (h === 12) return "12PM";
    return `${h - 12}PM`;
  },
  padded: (h) => String(h).padStart(2, "0"),
};

const LUNCH_DISABLED: Schedule = {
  mon: [12, 13], tue: [12, 13], wed: [12, 13],
  thu: [12, 13], fri: [12, 13],
};

function App() {
  const [schedule, setSchedule] = useState<Schedule>({});
  const [readOnly, setReadOnly] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [hideToolbar, setHideToolbar] = useState(false);
  const [dayAxis, setDayAxis] = useState<"x" | "y">("x");
  const [locale, setLocale] = useState<LocaleKey>("en");
  const [overrideClear, setOverrideClear] = useState(false);
  const [noWeekendHighlight, setNoWeekendHighlight] = useState(false);
  const [showAllHours, setShowAllHours] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [hourFormat, setHourFormat] = useState<string>("default");
  const [visibleDays, setVisibleDays] = useState<string[]>([...ALL_DAYS]);
  const [useDisabledSlots, setUseDisabledSlots] = useState(false);
  const [minHour, setMinHour] = useState(0);
  const [maxHour, setMaxHour] = useState(23);
  const [outputFormat, setOutputFormat] = useState<"raw" | "ranges" | "iso">("raw");
  const [includeTimezone, setIncludeTimezone] = useState(false);
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const serialized = (() => {
    const opts = includeTimezone ? { timezone } : {};
    if (outputFormat === "ranges") return toRanges(schedule, opts);
    if (outputFormat === "iso") return toISO(schedule, opts);
    return schedule;
  })();

  const selectedCount = Object.values(schedule).reduce(
    (sum, hours) => sum + (hours?.length ?? 0),
    0,
  );

  // locale 기반 라벨/메시지 해석 (예제에서도 내장 프리셋 활용)
  const resolvedLocale = resolveLocaleConfig({ locale });
  const summary = summarizeSchedule(
    schedule,
    resolvedLocale.dayLabels,
    visibleDays,
    1,
    resolvedLocale.messages.noSelection,
  );

  useEffect(() => {
    document.body.style.background = darkMode ? "#18181b" : "#ffffff";
    document.body.style.transition = "background 0.15s ease";
  }, [darkMode]);

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "40px auto",
        padding: "0 16px",
        color: darkMode ? "#f4f4f5" : undefined,
      }}
    >
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>react-schedule-picker</h1>
      <p style={{ color: "#71717a", marginBottom: 24 }}>
        Click or drag to select time slots. Selected: <strong>{selectedCount}</strong> hours
      </p>

      {/* Options Panel */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "center",
          padding: 16,
          marginBottom: 16,
          background: darkMode ? "#232328" : "#f9fafb",
          borderRadius: 8,
          border: `1px solid ${darkMode ? "#2e2e35" : "#e4e4e7"}`,
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} />
          Dark Mode
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} />
          Read Only
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
          Disabled
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={hideToolbar} onChange={(e) => setHideToolbar(e.target.checked)} />
          Hide Toolbar
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={showAllHours} onChange={(e) => setShowAllHours(e.target.checked)} />
          Show All Hours
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={useDisabledSlots} onChange={(e) => setUseDisabledSlots(e.target.checked)} />
          Disable Lunch (12-14)
        </label>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          Days:
          {ALL_DAYS.map((day) => (
            <label key={day} style={{ display: "flex", alignItems: "center", gap: 2 }}>
              <input
                type="checkbox"
                checked={visibleDays.includes(day)}
                onChange={(e) => {
                  setVisibleDays((prev) =>
                    e.target.checked
                      ? [...prev, day].sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b))
                      : prev.filter((d) => d !== day),
                  );
                }}
              />
              {resolvedLocale.dayLabels[day]}
            </label>
          ))}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          Day Axis:
          <select value={dayAxis} onChange={(e) => setDayAxis(e.target.value as "x" | "y")} style={{ padding: "2px 8px" }}>
            <option value="x">X (columns)</option>
            <option value="y">Y (rows)</option>
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          Locale:
          <select value={locale} onChange={(e) => setLocale(e.target.value as LocaleKey)} style={{ padding: "2px 8px" }}>
            {LOCALE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={overrideClear} onChange={(e) => setOverrideClear(e.target.checked)} />
          Override "Clear" → "Reset"
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={noWeekendHighlight} onChange={(e) => setNoWeekendHighlight(e.target.checked)} />
          No weekend highlight
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          Hour Format:
          <select value={hourFormat} onChange={(e) => setHourFormat(e.target.value)} style={{ padding: "2px 8px" }}>
            <option value="default">Default</option>
            <option value="12h">12h (AM/PM)</option>
            <option value="padded">Padded (00)</option>
          </select>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          Min:
          <input type="number" min={0} max={maxHour} value={minHour} onChange={(e) => setMinHour(Number(e.target.value))} style={{ width: 48, padding: "2px 4px" }} />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
          Max:
          <input type="number" min={minHour} max={23} value={maxHour} onChange={(e) => setMaxHour(Number(e.target.value))} style={{ width: 48, padding: "2px 4px" }} />
        </label>

        <button onClick={() => setSchedule({})} style={{ padding: "4px 12px", cursor: "pointer" }}>
          Clear All
        </button>
      </div>

      <SchedulePicker
        value={schedule}
        onChange={setSchedule}
        readOnly={readOnly}
        disabled={disabled}
        hideToolbar={hideToolbar}
        visibleDays={visibleDays}
        dayAxis={dayAxis}
        showAllHours={showAllHours}
        formatHour={HOUR_FORMAT_OPTIONS[hourFormat]}
        minHour={minHour}
        maxHour={maxHour}
        disabledSlots={useDisabledSlots ? LUNCH_DISABLED : undefined}
        className={darkMode ? "rsp-dark" : undefined}
        locale={locale}
        messages={overrideClear ? { clear: "Reset" } : undefined}
        weekendHighlight={noWeekendHighlight ? "none" : undefined}
      />

      {/* Summary */}
      <p style={{ marginTop: 12, fontSize: 13, color: "#71717a", wordBreak: "break-word" }}>
        {summary}
      </p>

      <details style={{ marginTop: 16 }} open>
        <summary style={{ cursor: "pointer", color: "#71717a" }}>
          Schedule Data (JSON)
        </summary>

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
            marginTop: 8,
            fontSize: 13,
          }}
        >
          <span style={{ fontWeight: 600 }}>Format:</span>
          {(["raw", "ranges", "iso"] as const).map((f) => (
            <label key={f} style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <input
                type="radio"
                name="outputFormat"
                checked={outputFormat === f}
                onChange={() => setOutputFormat(f)}
              />
              {f === "raw" && "Raw (internal)"}
              {f === "ranges" && "Ranges (compact)"}
              {f === "iso" && "ISO (calendar-compatible)"}
            </label>
          ))}
          <label style={{ display: "flex", gap: 4, alignItems: "center", marginLeft: 8 }}>
            <input
              type="checkbox"
              checked={includeTimezone}
              onChange={(e) => setIncludeTimezone(e.target.checked)}
              disabled={outputFormat === "raw"}
            />
            Include timezone ({timezone})
          </label>
        </div>

        <pre
          style={{
            background: darkMode ? "#232328" : "#f4f4f5",
            color: darkMode ? "#f4f4f5" : undefined,
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            marginTop: 8,
            overflow: "auto",
            border: darkMode ? "1px solid #2e2e35" : "1px solid #e4e4e7",
          }}
        >
          {JSON.stringify(serialized, null, 2)}
        </pre>

        <p style={{ fontSize: 12, color: "#71717a", marginTop: 4 }}>
          {outputFormat === "raw" && "컴포넌트 내부 표현. 렌더링에 최적화되어 있음."}
          {outputFormat === "ranges" && "연속 시간을 구간으로 압축. DB/API 전송에 적합."}
          {outputFormat === "iso" && "iCalendar 호환 필드명(startTime/endTime). 외부 캘린더 연동용."}
        </p>
      </details>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

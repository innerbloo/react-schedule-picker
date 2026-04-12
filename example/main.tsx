import { useState } from "react";
import { createRoot } from "react-dom/client";
import { SchedulePicker, summarizeSchedule } from "../src";
import "../src/SchedulePicker.css";
import type { Schedule } from "../src";

const KO_LABELS: Record<string, string> = {
  mon: "월", tue: "화", wed: "수", thu: "목",
  fri: "금", sat: "토", sun: "일",
};

const EN_LABELS: Record<string, string> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu",
  fri: "Fri", sat: "Sat", sun: "Sun",
};

const LABEL_OPTIONS: Record<string, Record<string, string>> = {
  en: EN_LABELS,
  ko: KO_LABELS,
};

const ALL_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

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
  const [lang, setLang] = useState<"en" | "ko">("en");
  const [showAllHours, setShowAllHours] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [hourFormat, setHourFormat] = useState<string>("default");
  const [visibleDays, setVisibleDays] = useState<string[]>([...ALL_DAYS]);
  const [useDisabledSlots, setUseDisabledSlots] = useState(false);
  const [minHour, setMinHour] = useState(0);
  const [maxHour, setMaxHour] = useState(23);

  const selectedCount = Object.values(schedule).reduce(
    (sum, hours) => sum + (hours?.length ?? 0),
    0,
  );

  const summary = summarizeSchedule(schedule, LABEL_OPTIONS[lang], visibleDays);

  return (
    <div
      style={{
        maxWidth: 960,
        margin: "40px auto",
        padding: "0 16px",
        color: darkMode ? "#e4e4e7" : undefined,
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
          background: darkMode ? "#27272a" : "#f9fafb",
          borderRadius: 8,
          border: `1px solid ${darkMode ? "#3f3f46" : "#e4e4e7"}`,
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
              {EN_LABELS[day]}
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
          Labels:
          <select value={lang} onChange={(e) => setLang(e.target.value as "en" | "ko")} style={{ padding: "2px 8px" }}>
            <option value="en">English</option>
            <option value="ko">Korean</option>
          </select>
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
        dayLabels={LABEL_OPTIONS[lang]}
        minHour={minHour}
        maxHour={maxHour}
        disabledSlots={useDisabledSlots ? LUNCH_DISABLED : undefined}
        className={darkMode ? "rsp-dark" : undefined}
      />

      {/* Summary */}
      <p style={{ marginTop: 12, fontSize: 13, color: "#71717a", wordBreak: "break-word" }}>
        {summary}
      </p>

      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", color: "#71717a" }}>
          Schedule Data (JSON)
        </summary>
        <pre
          style={{
            background: darkMode ? "#27272a" : "#f4f4f5",
            color: darkMode ? "#e4e4e7" : undefined,
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            marginTop: 8,
            overflow: "auto",
          }}
        >
          {JSON.stringify(schedule, null, 2)}
        </pre>
      </details>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

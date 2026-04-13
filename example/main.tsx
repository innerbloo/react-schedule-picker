import { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { SchedulePicker, summarizeSchedule, toRanges, toISO, resolveLocaleConfig } from "../src";
import "../src/SchedulePicker.css";
import type { Schedule, LocaleKey } from "../src";

const ALL_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function rotateDays(days: readonly string[], startDay: string): string[] {
  const idx = days.indexOf(startDay);
  if (idx <= 0) return [...days];
  return [...days.slice(idx), ...days.slice(0, idx)];
}

const LOCALE_OPTIONS: Array<{ value: LocaleKey; label: string }> = [
  { value: "en", label: "English" },
  { value: "en-US", label: "English (US)" },
  { value: "ko", label: "한국어" },
  { value: "ja", label: "日本語" },
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
];

const LUNCH_DISABLED: Schedule = {
  mon: [12, 13], tue: [12, 13], wed: [12, 13], thu: [12, 13], fri: [12, 13],
};

// === Demo page i18n ===
type UiLang = "en" | "ko";

const TRANSLATIONS = {
  en: {
    heroLead1: "Drag-to-select weekly schedule picker for React.",
    heroLead2: "Zero dependencies, fully typed, locale-aware.",
    viewGithub: "View on GitHub",
    viewNpm: "View on npm",
    playgroundEyebrow: "Playground",
    playgroundTitle: "Try it",
    playgroundLead: "Click or drag any cell. Drag across day or hour headers to select entire rows/columns.",
    groupDisplay: "Display",
    groupLocale: "Locale",
    groupConstraints: "Constraints",
    groupVisibleDays: "Visible days",
    dayAxis: "Day axis",
    axisX: "X (columns)",
    axisY: "Y (rows)",
    compactHourLabels: "Compact hour labels",
    hideToolbar: "Hide toolbar",
    language: "Language",
    weekStarts: "Week starts",
    localeDefault: "Locale default",
    monday: "Monday",
    sunday: "Sunday",
    saturday: "Saturday",
    minHour: "Min hour",
    maxHour: "Max hour",
    readOnly: "Read only",
    disabled: "Disabled",
    disableLunch: "Disable lunch (12-14)",
    outputEyebrow: "Serialization",
    outputTitle: "Type-safe output",
    outputLead: "Choose the right shape for your API or database. Switch between formats below.",
    outputDescRaw: "The internal data shape — optimized for rendering. Day key → array of selected hour numbers.",
    outputDescRanges: "Compressed range-based format with ISO 8601 day-of-week numbers. Best for API transport and database storage.",
    outputDescIso: "iCalendar-style field names (startTime / endTime) for feeding external calendar systems.",
    propsEyebrow: "Reference",
    propsTitle: "Props",
    propsLead1: "All props are optional except",
    propsLead2: "and",
    propsLead3: ".",
    tableProp: "Prop",
    tableType: "Type",
    tableDefault: "Default",
    tableDescription: "Description",
    catCore: "Core",
    catLocalization: "Localization",
    catDisplay: "Display",
    catState: "State",
    catToolbar: "Toolbar",
    catStyling: "Styling",
    required: "required",
    localeDefaultCell: "locale default",
    fourBuiltIn: "4 built-in",
    propValue: "Current schedule value (controlled). Shape:",
    propOnChange: "Called whenever the schedule changes (including during drag)",
    propOnSelectEnd: "Called once when a drag interaction completes",
    propLocale: "Sets week start, hour format, weekend colors, and all built-in text",
    propWeekStartsOn: "Override the first day of the week",
    propWeekendHighlight1: "Weekend text colors.",
    propWeekendHighlight2: "disables highlighting",
    propDayLabels: "Custom labels for day headers",
    propMessages: "Override individual messages (e.g.",
    propMessagesAfter: ")",
    propDayAxis1: ": days as columns.",
    propDayAxis2: ": days as rows",
    propVisibleDays: "Which days to show and their order. Keys:",
    propVisibleDaysAfter: "…",
    propMinHour: "Earliest hour to display (0–23)",
    propMaxHour: "Latest hour to display (0–23)",
    propCompactHourLabels: "Show only every 3rd hour label (others shown as",
    propCompactHourLabelsAfter: ")",
    propFormatHour: "Custom hour label formatter. Overrides",
    propDisabledSlots: "Slots that cannot be selected (shown with hatched pattern)",
    propReadOnly: "Display-only mode. Selected cells turn gray, no interactions",
    propDisabled: "Fully disabled state. Dims entire component",
    propPresets: "Preset buttons in the toolbar. Empty array hides presets",
    propHideToolbar: "Hide the preset toolbar entirely",
    propClassName: "Extra class on the outermost container",
  },
  ko: {
    heroLead1: "드래그로 시간을 고르는 React 스케줄 피커예요.",
    heroLead2: "가볍고, 타입도 빈틈없이 맞춰져 있어요.",
    viewGithub: "GitHub에서 보기",
    viewNpm: "npm에서 보기",
    playgroundEyebrow: "플레이그라운드",
    playgroundTitle: "직접 써보기",
    playgroundLead: "셀을 클릭하거나 드래그해 시간을 골라보세요. 요일·시간 헤더를 드래그하면 한 줄씩 선택할 수 있어요.",
    groupDisplay: "디스플레이",
    groupLocale: "언어·지역",
    groupConstraints: "제약",
    groupVisibleDays: "보여줄 요일",
    dayAxis: "요일 축",
    axisX: "X (세로줄)",
    axisY: "Y (가로줄)",
    compactHourLabels: "시간 라벨 압축",
    hideToolbar: "툴바 숨기기",
    language: "언어",
    weekStarts: "주 시작일",
    localeDefault: "자동 (로케일 기준)",
    monday: "월요일",
    sunday: "일요일",
    saturday: "토요일",
    minHour: "시작 시간",
    maxHour: "끝 시간",
    readOnly: "읽기 전용",
    disabled: "비활성화",
    disableLunch: "점심시간 잠그기 (12-14시)",
    outputEyebrow: "데이터 형식",
    outputTitle: "타입까지 챙긴 출력",
    outputLead: "API나 DB에 맞춰 원하는 형식으로 받아 쓸 수 있어요. 아래에서 바꿔보세요.",
    outputDescRaw: "렌더링에 최적화된 내부 데이터 형식. 요일 키 → 선택된 시간 배열.",
    outputDescRanges: "ISO 8601 요일 번호를 사용한 압축 범위 형식. API 전송과 DB 저장에 적합.",
    outputDescIso: "외부 캘린더 시스템 연동에 사용하는 iCalendar 스타일 필드명 (startTime / endTime).",
    propsEyebrow: "레퍼런스",
    propsTitle: "Props",
    propsLead1: "",
    propsLead2: "와",
    propsLead3: "만 필수고, 나머지는 모두 선택이에요.",
    tableProp: "Prop",
    tableType: "타입",
    tableDefault: "기본값",
    tableDescription: "설명",
    catCore: "핵심",
    catLocalization: "언어·지역",
    catDisplay: "표시",
    catState: "상태",
    catToolbar: "툴바",
    catStyling: "스타일",
    required: "필수",
    localeDefaultCell: "로케일 기준",
    fourBuiltIn: "기본 4개",
    propValue: "현재 스케줄 값 (controlled). 형태:",
    propOnChange: "스케줄이 변경될 때마다 호출 (드래그 중에도 포함)",
    propOnSelectEnd: "드래그 상호작용이 완료되었을 때 한 번 호출",
    propLocale: "주 시작일, 시간 형식, 주말 색상, 모든 내장 텍스트를 설정",
    propWeekStartsOn: "주의 첫 번째 요일을 재정의",
    propWeekendHighlight1: "주말 텍스트 색상.",
    propWeekendHighlight2: "으로 지정하면 강조 비활성화",
    propDayLabels: "요일 헤더의 커스텀 라벨",
    propMessages: "개별 메시지 재정의 (예:",
    propMessagesAfter: ")",
    propDayAxis1: ": 요일을 열로 표시.",
    propDayAxis2: ": 요일을 행으로 표시",
    propVisibleDays: "표시할 요일과 순서. 키:",
    propVisibleDaysAfter: "…",
    propMinHour: "표시할 최소 시간 (0–23)",
    propMaxHour: "표시할 최대 시간 (0–23)",
    propCompactHourLabels: "3의 배수 시간만 숫자로 표시 (나머지는",
    propCompactHourLabelsAfter: ")",
    propFormatHour: "커스텀 시간 라벨 포맷터. 다음보다 우선 적용:",
    propDisabledSlots: "선택 불가능한 슬롯 (빗금 패턴으로 표시)",
    propReadOnly: "표시 전용 모드. 선택된 셀이 회색으로 변경되며 상호작용 없음",
    propDisabled: "완전 비활성화 상태. 컴포넌트 전체 흐리게 표시",
    propPresets: "툴바에 표시할 프리셋 버튼. 빈 배열이면 프리셋 숨김",
    propHideToolbar: "프리셋 툴바 전체 숨김",
    propClassName: "최외곽 컨테이너에 추가할 클래스",
  },
} as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // fallback: do nothing
    }
  };

  return (
    <button
      type="button"
      className="demo-copy-btn"
      onClick={handleCopy}
      aria-label="Copy to clipboard"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 8 7 12 13 4" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="5" width="9" height="9" rx="1.5" />
          <path d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5" />
        </svg>
      )}
    </button>
  );
}

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

const INSTALL_COMMANDS: Record<PackageManager, string> = {
  npm: "npm install react-schedule-picker",
  pnpm: "pnpm add react-schedule-picker",
  yarn: "yarn add react-schedule-picker",
  bun: "bun add react-schedule-picker",
};

function App() {
  const [uiLang, setUiLang] = useState<UiLang>("en");
  const [pkgManager, setPkgManager] = useState<PackageManager>("npm");
  const t = TRANSLATIONS[uiLang];

  const [schedule, setSchedule] = useState<Schedule>({});
  const [readOnly, setReadOnly] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [hideToolbar, setHideToolbar] = useState(false);
  const [dayAxis, setDayAxis] = useState<"x" | "y">("x");
  const [locale, setLocale] = useState<LocaleKey>("en");
  const [compactHourLabels, setCompactHourLabels] = useState(false);
  const [enabledDays, setEnabledDays] = useState<Set<string>>(() => new Set(ALL_DAYS));
  const [useDisabledSlots, setUseDisabledSlots] = useState(false);
  const [minHour, setMinHour] = useState(0);
  const [maxHour, setMaxHour] = useState(23);
  const [overrideWeekStart, setOverrideWeekStart] = useState<"" | "mon" | "sun" | "sat">("");
  const [outputFormat, setOutputFormat] = useState<"raw" | "ranges" | "iso">("raw");

  const resolvedLocale = resolveLocaleConfig({ locale });

  const visibleDays = useMemo(() => {
    const ordered = rotateDays(ALL_DAYS, resolvedLocale.weekStartsOn);
    return ordered.filter((d) => enabledDays.has(d));
  }, [resolvedLocale.weekStartsOn, enabledDays]);

  const visibleDaysProp = enabledDays.size === ALL_DAYS.length ? undefined : visibleDays;

  const summary = summarizeSchedule(
    schedule,
    resolvedLocale.dayLabels,
    visibleDays,
    1,
    resolvedLocale.messages.noSelection,
  );

  const serialized = (() => {
    if (outputFormat === "ranges") return toRanges(schedule);
    if (outputFormat === "iso") return toISO(schedule);
    return schedule;
  })();

  return (
    <div className="demo-page">
      {/* Fixed language toggle (top-right) */}
      <div className="demo-ui-lang-toggle">
        <button
          type="button"
          className={`demo-ui-lang-btn${uiLang === "en" ? " demo-ui-lang-btn--active" : ""}`}
          onClick={() => {
            setUiLang("en");
            setLocale("en");
          }}
        >
          EN
        </button>
        <button
          type="button"
          className={`demo-ui-lang-btn${uiLang === "ko" ? " demo-ui-lang-btn--active" : ""}`}
          onClick={() => {
            setUiLang("ko");
            setLocale("ko");
          }}
        >
          KO
        </button>
      </div>

      {/* === Section 1: Hero === */}
      <section className="demo-section demo-hero">
        <h1 className="demo-h1">react-schedule-picker</h1>
        <p className="demo-lead">
          {t.heroLead1}
          <br />
          {t.heroLead2}
        </p>
        <div className="demo-hero-actions">
          <a
            className="demo-btn demo-btn-primary"
            href="https://github.com/innerbloo/react-schedule-picker"
            target="_blank"
            rel="noreferrer"
          >
            {t.viewGithub}
          </a>
          <a
            className="demo-btn demo-btn-ghost"
            href="https://www.npmjs.com/package/react-schedule-picker"
            target="_blank"
            rel="noreferrer"
          >
            {t.viewNpm}
          </a>
        </div>
        <div className="demo-install">
          <div className="demo-install-tabs">
            {(["npm", "pnpm", "yarn", "bun"] as const).map((pm) => (
              <button
                key={pm}
                type="button"
                className={`demo-install-tab${pkgManager === pm ? " demo-install-tab--active" : ""}`}
                onClick={() => setPkgManager(pm)}
              >
                {pm}
              </button>
            ))}
          </div>
          <div className="demo-code-inline">
            <span>{INSTALL_COMMANDS[pkgManager]}</span>
            <CopyButton text={INSTALL_COMMANDS[pkgManager]} />
          </div>
        </div>
      </section>

      {/* === Section 2: Playground === */}
      <section className="demo-section">
        <p className="demo-eyebrow">{t.playgroundEyebrow}</p>
        <h2 className="demo-h2">{t.playgroundTitle}</h2>
        <p className="demo-lead">
          {t.playgroundLead.split(/(?<=\.)\s+/).map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && <br />}
            </span>
          ))}
        </p>

        <div className="demo-playground">
          <div className="demo-playground-main">
            <SchedulePicker
              value={schedule}
              onChange={setSchedule}
              readOnly={readOnly}
              disabled={disabled}
              hideToolbar={hideToolbar}
              visibleDays={visibleDaysProp}
              dayAxis={dayAxis}
              compactHourLabels={compactHourLabels}
              minHour={minHour}
              maxHour={maxHour}
              disabledSlots={useDisabledSlots ? LUNCH_DISABLED : undefined}
              locale={locale}
              weekStartsOn={overrideWeekStart || undefined}
            />
            <div className="demo-playground-summary">{summary}</div>
          </div>

          <div className="demo-options">
            <div className="demo-option-group">
              <span className="demo-option-group-label">{t.groupDisplay}</span>
              <div className="demo-option-row">
                <label>{t.dayAxis}</label>
                <select value={dayAxis} onChange={(e) => setDayAxis(e.target.value as "x" | "y")}>
                  <option value="x">{t.axisX}</option>
                  <option value="y">{t.axisY}</option>
                </select>
              </div>
              <div className="demo-option-row">
                <label>
                  <input type="checkbox" checked={compactHourLabels} onChange={(e) => setCompactHourLabels(e.target.checked)} />
                  {t.compactHourLabels}
                </label>
              </div>
              <div className="demo-option-row">
                <label>
                  <input type="checkbox" checked={hideToolbar} onChange={(e) => setHideToolbar(e.target.checked)} />
                  {t.hideToolbar}
                </label>
              </div>
            </div>

            <div className="demo-option-group">
              <span className="demo-option-group-label">{t.groupLocale}</span>
              <div className="demo-option-row">
                <label>{t.language}</label>
                <select value={locale} onChange={(e) => setLocale(e.target.value as LocaleKey)}>
                  {LOCALE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="demo-option-row">
                <label>{t.weekStarts}</label>
                <select
                  value={overrideWeekStart}
                  onChange={(e) => setOverrideWeekStart(e.target.value as "" | "mon" | "sun" | "sat")}
                >
                  <option value="">{t.localeDefault}</option>
                  <option value="mon">{t.monday}</option>
                  <option value="sun">{t.sunday}</option>
                  <option value="sat">{t.saturday}</option>
                </select>
              </div>
            </div>

            <div className="demo-option-group">
              <span className="demo-option-group-label">{t.groupConstraints}</span>
              <div className="demo-option-row">
                <label>{t.minHour}</label>
                <input
                  type="number"
                  min={0}
                  max={maxHour}
                  value={minHour}
                  onChange={(e) => setMinHour(Number(e.target.value))}
                />
              </div>
              <div className="demo-option-row">
                <label>{t.maxHour}</label>
                <input
                  type="number"
                  min={minHour}
                  max={23}
                  value={maxHour}
                  onChange={(e) => setMaxHour(Number(e.target.value))}
                />
              </div>
              <div className="demo-option-row">
                <label>
                  <input type="checkbox" checked={readOnly} onChange={(e) => setReadOnly(e.target.checked)} />
                  {t.readOnly}
                </label>
              </div>
              <div className="demo-option-row">
                <label>
                  <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
                  {t.disabled}
                </label>
              </div>
              <div className="demo-option-row">
                <label>
                  <input type="checkbox" checked={useDisabledSlots} onChange={(e) => setUseDisabledSlots(e.target.checked)} />
                  {t.disableLunch}
                </label>
              </div>
            </div>

            <div className="demo-option-group">
              <span className="demo-option-group-label">{t.groupVisibleDays}</span>
              <div className="demo-day-checks">
                {ALL_DAYS.map((day) => (
                  <label key={day}>
                    <input
                      type="checkbox"
                      checked={enabledDays.has(day)}
                      onChange={(e) => {
                        setEnabledDays((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(day);
                          else next.delete(day);
                          return next;
                        });
                      }}
                    />
                    {resolvedLocale.dayLabels[day]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* === Section 3: Output === */}
      <section className="demo-section">
        <p className="demo-eyebrow">{t.outputEyebrow}</p>
        <h2 className="demo-h2">{t.outputTitle}</h2>
        <p className="demo-lead">
          {t.outputLead.split(/(?<=\.)\s+/).map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && <br />}
            </span>
          ))}
        </p>

        <div className="demo-output-controls">
          {(["raw", "ranges", "iso"] as const).map((f) => (
            <button
              key={f}
              type="button"
              className={`demo-format-pill${outputFormat === f ? " demo-format-pill--active" : ""}`}
              onClick={() => setOutputFormat(f)}
            >
              {f === "raw" ? "Schedule" : f === "ranges" ? "toRanges()" : "toISO()"}
            </button>
          ))}
        </div>

        <div className="demo-output">
          <div>
            <h3 className="demo-h3">
              {outputFormat === "raw" && "Schedule"}
              {outputFormat === "ranges" && "toRanges()"}
              {outputFormat === "iso" && "toISO()"}
            </h3>
            <p className="demo-body">
              {(outputFormat === "raw"
                ? t.outputDescRaw
                : outputFormat === "ranges"
                  ? t.outputDescRanges
                  : t.outputDescIso
              )
                .split(/(?<=\.)\s+/)
                .map((part, i, arr) => (
                  <span key={i}>
                    {part}
                    {i < arr.length - 1 && <br />}
                  </span>
                ))}
            </p>
          </div>
          <pre className="demo-code-block">{JSON.stringify(serialized, null, 2)}</pre>
        </div>
      </section>

      {/* === Section 4: Props === */}
      <section className="demo-section">
        <p className="demo-eyebrow">{t.propsEyebrow}</p>
        <h2 className="demo-h2">{t.propsTitle}</h2>
        <p className="demo-lead">
          {t.propsLead1} <code>value</code> {t.propsLead2} <code>onChange</code>{t.propsLead3}
        </p>

        <div className="demo-api-table-wrapper">
          <table className="demo-api-table">
            <thead>
              <tr>
                <th>{t.tableProp}</th>
                <th>{t.tableType}</th>
                <th>{t.tableDefault}</th>
                <th>{t.tableDescription}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="demo-api-category">
                <td colSpan={4}>{t.catCore}</td>
              </tr>
              <tr>
                <td><code>value</code></td>
                <td><code>Schedule</code></td>
                <td><span className="demo-api-required">{t.required}</span></td>
                <td>{t.propValue} <code>{"{ [day]: number[] }"}</code></td>
              </tr>
              <tr>
                <td><code>onChange</code></td>
                <td><code>(s: Schedule) =&gt; void</code></td>
                <td><span className="demo-api-required">{t.required}</span></td>
                <td>{t.propOnChange}</td>
              </tr>
              <tr>
                <td><code>onSelectEnd</code></td>
                <td><code>(s: Schedule) =&gt; void</code></td>
                <td>—</td>
                <td>{t.propOnSelectEnd}</td>
              </tr>

              <tr className="demo-api-category">
                <td colSpan={4}>{t.catLocalization}</td>
              </tr>
              <tr>
                <td><code>locale</code></td>
                <td><code>"en" | "en-US" | "ko" | "ja" | "zh-CN" | "zh-TW"</code></td>
                <td><code>"en"</code></td>
                <td>{t.propLocale}</td>
              </tr>
              <tr>
                <td><code>weekStartsOn</code></td>
                <td><code>"mon" | "sun" | "sat"</code></td>
                <td>{t.localeDefaultCell}</td>
                <td>{t.propWeekStartsOn}</td>
              </tr>
              <tr>
                <td><code>weekendHighlight</code></td>
                <td><code>Record&lt;string, string&gt; | "none"</code></td>
                <td>{t.localeDefaultCell}</td>
                <td>{t.propWeekendHighlight1} <code>"none"</code> {t.propWeekendHighlight2}</td>
              </tr>
              <tr>
                <td><code>dayLabels</code></td>
                <td><code>Record&lt;string, string&gt;</code></td>
                <td>{t.localeDefaultCell}</td>
                <td>{t.propDayLabels}</td>
              </tr>
              <tr>
                <td><code>messages</code></td>
                <td><code>Partial&lt;Messages&gt;</code></td>
                <td>{t.localeDefaultCell}</td>
                <td>{t.propMessages} <code>{"{ clear: 'Reset' }"}</code>{t.propMessagesAfter}</td>
              </tr>

              <tr className="demo-api-category">
                <td colSpan={4}>{t.catDisplay}</td>
              </tr>
              <tr>
                <td><code>dayAxis</code></td>
                <td><code>"x" | "y"</code></td>
                <td><code>"x"</code></td>
                <td><code>"x"</code>{t.propDayAxis1} <code>"y"</code>{t.propDayAxis2}</td>
              </tr>
              <tr>
                <td><code>visibleDays</code></td>
                <td><code>string[]</code></td>
                <td>{t.localeDefaultCell}</td>
                <td>{t.propVisibleDays} <code>mon</code> {t.propVisibleDaysAfter} <code>sun</code></td>
              </tr>
              <tr>
                <td><code>minHour</code></td>
                <td><code>number</code></td>
                <td><code>0</code></td>
                <td>{t.propMinHour}</td>
              </tr>
              <tr>
                <td><code>maxHour</code></td>
                <td><code>number</code></td>
                <td><code>23</code></td>
                <td>{t.propMaxHour}</td>
              </tr>
              <tr>
                <td><code>compactHourLabels</code></td>
                <td><code>boolean</code></td>
                <td><code>false</code></td>
                <td>{t.propCompactHourLabels} <code>·</code>{t.propCompactHourLabelsAfter}</td>
              </tr>
              <tr>
                <td><code>formatHour</code></td>
                <td><code>(h: number) =&gt; string</code></td>
                <td>{t.localeDefaultCell}</td>
                <td>{t.propFormatHour} <code>compactHourLabels</code></td>
              </tr>

              <tr className="demo-api-category">
                <td colSpan={4}>{t.catState}</td>
              </tr>
              <tr>
                <td><code>readOnly</code></td>
                <td><code>boolean</code></td>
                <td><code>false</code></td>
                <td>{t.propReadOnly}</td>
              </tr>
              <tr>
                <td><code>disabled</code></td>
                <td><code>boolean</code></td>
                <td><code>false</code></td>
                <td>{t.propDisabled}</td>
              </tr>
              <tr>
                <td><code>disabledSlots</code></td>
                <td><code>Schedule</code></td>
                <td>—</td>
                <td>{t.propDisabledSlots}</td>
              </tr>

              <tr className="demo-api-category">
                <td colSpan={4}>{t.catToolbar}</td>
              </tr>
              <tr>
                <td><code>presets</code></td>
                <td><code>Preset[]</code></td>
                <td>{t.fourBuiltIn}</td>
                <td>{t.propPresets}</td>
              </tr>
              <tr>
                <td><code>hideToolbar</code></td>
                <td><code>boolean</code></td>
                <td><code>false</code></td>
                <td>{t.propHideToolbar}</td>
              </tr>

              <tr className="demo-api-category">
                <td colSpan={4}>{t.catStyling}</td>
              </tr>
              <tr>
                <td><code>className</code></td>
                <td><code>string</code></td>
                <td>—</td>
                <td>{t.propClassName}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* === Footer === */}
      <footer className="demo-footer">
        <div className="demo-footer-links">
          <a href="https://github.com/innerbloo/react-schedule-picker" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://www.npmjs.com/package/react-schedule-picker" target="_blank" rel="noreferrer">npm</a>
        </div>
        <div>
          MIT License · Made by{" "}
          <a href="https://github.com/innerbloo" target="_blank" rel="noreferrer">
            @innerbloo
          </a>
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

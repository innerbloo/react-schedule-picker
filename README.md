# react-schedule-picker

Drag-to-select weekly schedule picker for React.

## Localization

Pass `locale` to switch all built-in text, week start, time format, and weekend colors in one line.

```tsx
<SchedulePicker locale="ko" value={schedule} onChange={setSchedule} />
```

### Built-in locales

| `locale` | Week start | Hour format | Sat / Sun color | `clear` |
|----------|-----------|-------------|-----------------|---------|
| `"en"` (default) | Mon | `14` | blue / red | Clear |
| `"en-US"` | Sun | `2PM` | blue / red | Clear |
| `"ko"` | Mon | `14` | blue / red | 지우기 |
| `"ja"` | Sun | `14` | blue / red | クリア |
| `"zh-CN"` | Mon | `14` | red / red | 清除 |
| `"zh-TW"` | Mon | `14` | red / red | 清除 |

Preset button labels (Weekday Day / Weekday Night / Weekend Day / Weekend Night) are translated per locale as well.

### Overriding parts of a locale

Four props let you override locale defaults independently. Any existing prop (`dayLabels`, `formatHour`, `visibleDays`, `presets`) still takes precedence when provided.

```tsx
// Change the clear button text only
<SchedulePicker locale="ko" messages={{ clear: "초기화" }} />

// Remove weekend color highlight
<SchedulePicker locale="ko" weekendHighlight="none" />

// Force Sunday-start regardless of locale
<SchedulePicker locale="ja" weekStartsOn="mon" />

// Custom weekend colors (e.g. Middle-East Fri/Sat weekend)
<SchedulePicker locale="en" weekendHighlight={{ fri: "#f04646", sat: "#f04646" }} />
```

### Priority order

```
explicit prop (dayLabels / formatHour / visibleDays / presets)
   > messages / weekStartsOn / weekendHighlight
   > LOCALE_PRESETS[locale]
   > "en" fallback
```

### Backward compatibility

Omitting `locale` keeps v1.0.0 behavior: English labels, Monday start, 24-hour format, blue Saturday + red Sunday. No existing code breaks.

## Serialization

The component's internal `Schedule` shape (`Record<string, number[]>`) is optimized for rendering. For API transport and database storage, convert it to a compact range-based format.

### `toRanges(schedule, options?)`

Compress consecutive hours into `[start, end)` ranges, keyed by ISO 8601 day-of-week (1=Mon … 7=Sun).

```ts
import { toRanges } from "react-schedule-picker";

const schedule = { mon: [9, 10, 11, 14, 15], tue: [9, 10, 11] };

toRanges(schedule, { timezone: "Asia/Seoul", meta: { userId: "u_123" } });
// {
//   version: 1,
//   timezone: "Asia/Seoul",
//   ranges: [
//     { day: 1, start: "09:00", end: "12:00" },
//     { day: 1, start: "14:00", end: "16:00" },
//     { day: 2, start: "09:00", end: "12:00" },
//   ],
//   meta: { userId: "u_123" },
// }
```

### `fromRanges(payload)`

Inverse of `toRanges`. Throws on sub-hour times (`09:30`) — only hour-aligned input is supported in the current version.

```ts
import { fromRanges } from "react-schedule-picker";

const schedule = fromRanges({
  version: 1,
  ranges: [{ day: 1, start: "09:00", end: "12:00" }],
});
// { mon: [9, 10, 11] }
```

### `toISO(schedule, options?)`

Same data as `toRanges`, but with iCalendar-style field names (`startTime` / `endTime`). Use this when feeding external calendar systems.

```ts
import { toISO } from "react-schedule-picker";

toISO(schedule, { timezone: "Asia/Seoul" });
// {
//   version: 1,
//   timezone: "Asia/Seoul",
//   availability: [
//     { day: 1, startTime: "09:00", endTime: "12:00" },
//     ...
//   ],
// }
```

### Notes & limitations

- Current release supports **1-hour granularity only**. 30/15-minute support would require a schema change and is not planned at this time.
- Ranges use half-open intervals: `end` is exclusive. `end: "24:00"` means up to midnight.
- Day keys in the raw `Schedule` remain string (`"mon"`…`"sun"`). ISO numeric keys appear only in serialized output.

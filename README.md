# react-schedule-picker

[![npm version](https://img.shields.io/npm/v/react-schedule-picker.svg)](https://www.npmjs.com/package/react-schedule-picker)
[![bundle size](https://img.shields.io/bundlephobia/minzip/react-schedule-picker)](https://bundlephobia.com/package/react-schedule-picker)
[![types](https://img.shields.io/npm/types/react-schedule-picker.svg)](https://www.npmjs.com/package/react-schedule-picker)
[![license](https://img.shields.io/npm/l/react-schedule-picker.svg)](./LICENSE)

Drag-to-select weekly schedule picker for React. Zero dependencies, fully typed, locale-aware.

```tsx
<SchedulePicker value={schedule} onChange={setSchedule} />
```

## Features

- **Drag selection** — click cells, drag rectangles, or drag day/hour headers to select rows/columns
- **Touch support** — full mobile drag with haptic feedback
- **Locale-aware** — built-in `en`, `en-US`, `ko`, `ja`, `zh-CN`, `zh-TW` (week start, hour format, weekend colors, button text)
- **Serializable** — convert to ranges or iCalendar-style payloads for APIs and databases
- **Themable** — CSS custom properties, no styling library required
- **Zero runtime dependencies** — only React as a peer dep
- **Fully typed** — written in TypeScript with strict types

## Installation

```bash
npm install react-schedule-picker
# or
pnpm add react-schedule-picker
# or
yarn add react-schedule-picker
# or
bun add react-schedule-picker
```

Import the stylesheet once at your app root:

```tsx
import "react-schedule-picker/styles.css";
```

## Quick Start

```tsx
import { useState } from "react";
import { SchedulePicker, type Schedule } from "react-schedule-picker";
import "react-schedule-picker/styles.css";

export function Availability() {
  const [schedule, setSchedule] = useState<Schedule>({});

  return <SchedulePicker value={schedule} onChange={setSchedule} />;
}
```

The `Schedule` shape is `Record<string, number[]>` — day key (`"mon"` … `"sun"`) mapped to an array of selected hours (0–23).

## Common Examples

### Localized to Korean

```tsx
<SchedulePicker locale="ko" value={schedule} onChange={setSchedule} />
```

### Business hours only

```tsx
<SchedulePicker
  value={schedule}
  onChange={setSchedule}
  minHour={9}
  maxHour={18}
  visibleDays={["mon", "tue", "wed", "thu", "fri"]}
/>
```

### Block out specific slots

```tsx
const lunchBreak: Schedule = {
  mon: [12, 13], tue: [12, 13], wed: [12, 13], thu: [12, 13], fri: [12, 13],
};

<SchedulePicker
  value={schedule}
  onChange={setSchedule}
  disabledSlots={lunchBreak}
/>
```

### Read-only display

```tsx
<SchedulePicker value={schedule} onChange={setSchedule} readOnly />
```

### Submit-style — fire only when the user finishes dragging

```tsx
<SchedulePicker
  value={schedule}
  onChange={setSchedule}
  onSelectEnd={(final) => saveToServer(final)}
/>
```

## Props

### Core

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `Schedule` | required | Controlled schedule value |
| `onChange` | `(s: Schedule) => void` | required | Fires on every change, including during drag |
| `onSelectEnd` | `(s: Schedule) => void` | — | Fires once when a drag completes |

### Localization

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `locale` | `"en" \| "en-US" \| "ko" \| "ja" \| "zh-CN" \| "zh-TW"` | `"en"` | Sets week start, hour format, weekend colors, and built-in text |
| `weekStartsOn` | `"mon" \| "sun" \| "sat"` | locale default | Override the first day of the week |
| `weekendHighlight` | `Record<string, string> \| "none"` | locale default | Weekend text colors. `"none"` disables highlighting |
| `dayLabels` | `Record<string, string>` | locale default | Custom day header labels |
| `messages` | `Partial<Messages>` | locale default | Override individual built-in messages |

### Display

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `dayAxis` | `"x" \| "y"` | `"x"` | `"x"`: days as columns. `"y"`: days as rows |
| `visibleDays` | `string[]` | locale default | Which days to show, and their order |
| `minHour` | `number` | `0` | Earliest hour to display |
| `maxHour` | `number` | `23` | Latest hour to display |
| `compactHourLabels` | `boolean` | `false` | Show only every 3rd hour label |
| `formatHour` | `(h: number) => string` | locale default | Custom hour label formatter |

### State

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `readOnly` | `boolean` | `false` | Display-only mode (no interactions) |
| `disabled` | `boolean` | `false` | Fully disabled state |
| `disabledSlots` | `Schedule` | — | Slots that cannot be selected |

### Toolbar

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `presets` | `Preset[]` | 4 built-in | Preset buttons. Empty array hides the toolbar entries |
| `hideToolbar` | `boolean` | `false` | Hide the toolbar entirely |

### Styling

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | — | Extra class on the outermost container |

## Localization Details

Each `locale` preset bundles week start, hour format, weekend colors, and translated text in one prop:

| `locale` | Week start | Hour format | Sat / Sun | `clear` |
|----------|-----------|-------------|-----------|---------|
| `"en"` | Mon | `14` | none | Clear |
| `"en-US"` | Sun | `2PM` | none | Clear |
| `"ko"` | Mon | `14` | blue / red | 초기화 |
| `"ja"` | Sun | `14` | blue / red | クリア |
| `"zh-CN"` | Mon | `14` | red / red | 清除 |
| `"zh-TW"` | Mon | `14` | red / red | 清除 |

Preset button labels (Weekday Day / Weekday Night / etc.) are translated per locale as well.

### Override priority

```
explicit prop (dayLabels / formatHour / visibleDays / presets)
   > messages / weekStartsOn / weekendHighlight props
   > LOCALE_PRESETS[locale]
   > "en" fallback
```

## Serialization

The internal `Schedule` shape is optimized for rendering. For API transport and storage, convert it with one of the bundled helpers.

### `toRanges(schedule, options?)`

Compress consecutive hours into `[start, end)` ranges, keyed by ISO 8601 day-of-week (1=Mon … 7=Sun).

```ts
import { toRanges } from "react-schedule-picker";

toRanges({ mon: [9, 10, 11, 14, 15] }, { timezone: "Asia/Seoul" });
// {
//   version: 1,
//   timezone: "Asia/Seoul",
//   ranges: [
//     { day: 1, start: "09:00", end: "12:00" },
//     { day: 1, start: "14:00", end: "16:00" },
//   ],
// }
```

### `fromRanges(payload)`

Inverse of `toRanges`. Accepts only hour-aligned input.

```ts
import { fromRanges } from "react-schedule-picker";

fromRanges({
  version: 1,
  ranges: [{ day: 1, start: "09:00", end: "12:00" }],
});
// { mon: [9, 10, 11] }
```

### `toISO(schedule, options?)`

Same data as `toRanges`, but with iCalendar-style field names (`startTime` / `endTime`).

```ts
import { toISO } from "react-schedule-picker";

toISO({ mon: [9, 10, 11] }, { timezone: "Asia/Seoul" });
// {
//   version: 1,
//   timezone: "Asia/Seoul",
//   availability: [
//     { day: 1, startTime: "09:00", endTime: "12:00" },
//   ],
// }
```

### Notes

- 1-hour granularity only. Sub-hour (15/30 min) is not supported.
- Ranges use half-open intervals: `end` is exclusive. `end: "24:00"` means up to midnight.
- Day keys in the raw `Schedule` are strings (`"mon"`…`"sun"`). ISO numeric keys appear only in serialized output.

## Theming

All colors and sizes are CSS custom properties on `.rsp-container`. Override what you need:

```css
.rsp-container {
  --rsp-color-selected: #34d399;
  --rsp-color-border: #d4d4d8;
  --rsp-cell-size: 40px;
  --rsp-border-radius: 12px;
}
```

See [`src/variables.css`](./src/variables.css) for the full list.

## Requirements

- React 18+
- Modern browsers (last 2 versions of Chrome, Safari, Firefox, Edge)
- TypeScript 4.7+ (optional)

## License

[MIT](./LICENSE) © [innerbloo](https://github.com/innerbloo)

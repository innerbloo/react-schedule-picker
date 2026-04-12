# Competitor Research (2026-04-12)

## react-schedule-selector
- `hourlyChunks`: 30분/15분 단위 분할
- `selectionMode`: "square" vs "linear" 선택 모드
- `renderDateCell`, `renderTimeLabel`, `renderDateLabel`: 커스텀 렌더링
- `unselectedColor`, `selectedColor`, `hoveredColor`: 색상 prop

## react-week-scheduler
- 300ms 터치 딜레이 (iOS Safari)
- ResizeObserver 반응형
- date range pairs 형태 데이터

## react-timeslot-calendar
- `disabledTimeslots`: 특정 시간 비활성화
- `maxTimeslots`: 최대 선택 수 제한
- `renderDays`: 요일 필터링

## slotpicker
- `interval`: 분 단위 슬롯 간격
- `unAvailableSlots`: 선택 불가 슬롯
- dayjs 기반 경량

## Potential Features to Add
- `hourlyChunks` (30분/15분 단위)
- `disabledSlots` (특정 슬롯 비활성화)
- `maxSelections` (최대 선택 수 제한)
- `selectionMode` (rectangle vs linear)
- Color props (CSS 변수 없이 직접 전달)

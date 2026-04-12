/** 주간 스케줄 데이터: 요일 키 → 슬롯 배열 */
export type Schedule = Record<string, number[]>;

/** 프리셋 정의 */
export interface Preset {
  label: string;
  days: string[];
  hours: number[];
}

/** SchedulePicker Props */
export interface SchedulePickerProps {
  /** 현재 스케줄 값 (controlled) */
  value: Schedule;
  /** 스케줄 변경 핸들러 */
  onChange: (schedule: Schedule) => void;
  /** 드래그 완료 시 호출되는 콜백 */
  onSelectEnd?: (schedule: Schedule) => void;

  /** 프리셋 버튼 목록. 미제공 시 내장 프리셋 4종 사용. 빈 배열이면 프리셋 숨김 */
  presets?: Preset[];
  /** 프리셋 툴바 숨김 */
  hideToolbar?: boolean;
  /** 읽기 전용 모드 */
  readOnly?: boolean;
  /** 비활성화 모드 */
  disabled?: boolean;

  /** 표시할 최소 시간 (기본: 0) */
  minHour?: number;
  /** 표시할 최대 시간 (기본: 23) */
  maxHour?: number;
  /** 표시할 요일 및 순서 (기본: ["mon","tue","wed","thu","fri","sat","sun"]) */
  visibleDays?: string[];
  /** 요일 라벨 */
  dayLabels?: Record<string, string>;
  /** 요일 축 방향: "x"면 요일이 열, "y"면 요일이 행 (기본: "x") */
  dayAxis?: "x" | "y";
  /** 모든 시간 라벨 표시 여부 (기본: true) */
  showAllHours?: boolean;
  /** 시간 라벨 포맷 함수. showAllHours보다 우선 적용 */
  formatHour?: (hour: number) => string;
  /** 선택 불가 슬롯. Schedule과 동일한 형태 */
  disabledSlots?: Schedule;

  /** 최외곽 className 추가 */
  className?: string;
}

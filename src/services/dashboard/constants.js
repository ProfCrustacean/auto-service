export const ACTIVE_STATUSES = new Set([
  "waiting_diagnosis",
  "waiting_approval",
  "waiting_parts",
  "scheduled",
  "in_progress",
  "paused",
  "ready_pickup",
]);

export const BLOCKED_STATUSES = new Set(["waiting_parts", "waiting_approval", "waiting_diagnosis", "paused"]);
export const WEEK_PLANNED_STATUSES = new Set(["booked", "confirmed", "arrived"]);
export const WEEK_WINDOW_DAYS = 7;
export const BAY_DAILY_CAPACITY_BASELINE = 4;
export const ASSIGNEE_DAILY_CAPACITY_BASELINE = 3;
export const SEARCH_RESULTS_LIMIT = 8;
export const SEARCH_TIMING_BASELINE_MS = 200;
export const DISPATCH_DAY_START_MINUTES = 8 * 60;
export const DISPATCH_DAY_END_MINUTES = 20 * 60;
export const DISPATCH_SLOT_STEP_MINUTES = 15;
export const DISPATCH_DEFAULT_DURATION_MIN = 60;
export const DISPATCH_DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;
export const DISPATCH_CALENDAR_ENGINE = "event_calendar";
export const DISPATCH_CALENDAR_ENGINE_VERSION = "5.5.1";

export const ABSOLUTE_SLOT_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/;
export const RELATIVE_SLOT_RE = /^(Сегодня|Завтра)\s+(\d{1,2}):(\d{2})$/i;

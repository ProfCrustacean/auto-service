import {
  ABSOLUTE_SLOT_RE,
  DISPATCH_DATE_RE,
  DISPATCH_DEFAULT_DURATION_MIN,
  RELATIVE_SLOT_RE,
  WEEK_WINDOW_DAYS,
} from "./constants.js";

export function startOfLocalDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addLocalDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

export function toDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfLocalWeekMonday(value) {
  const start = startOfLocalDay(value);
  const jsDay = start.getDay();
  const mondayOffset = (jsDay + 6) % 7;
  return addLocalDays(start, -mondayOffset);
}

export function formatWeekDayLabel(date) {
  const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date).replace(".", "");
  const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(date);
  return `${weekday.slice(0, 1).toUpperCase()}${weekday.slice(1)} ${dayMonth}`;
}

export function buildWeekDays(now) {
  const start = startOfLocalWeekMonday(now);
  const days = [];

  for (let offset = 0; offset < WEEK_WINDOW_DAYS; offset += 1) {
    const date = addLocalDays(start, offset);
    days.push({
      dayKey: toDayKey(date),
      dayLabel: formatWeekDayLabel(date),
      offset,
    });
  }

  return days;
}

export function parseAbsoluteSlot(value) {
  const match = ABSOLUTE_SLOT_RE.exec(value);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const hour = match[4] === undefined ? null : Number.parseInt(match[4], 10);
  const minute = match[5] === undefined ? null : Number.parseInt(match[5], 10);

  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return null;
  }

  if (
    hour !== null
    && (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59)
  ) {
    return null;
  }

  const dayKey = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const timeLabel = hour === null ? "без времени" : `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return {
    dayKey,
    timeLabel,
    slotKey: `${dayKey} ${timeLabel}`,
  };
}

export function parseRelativeSlot(value, now) {
  const match = RELATIVE_SLOT_RE.exec(value);
  if (!match) {
    return null;
  }

  const keyword = match[1].toLowerCase();
  const hour = Number.parseInt(match[2], 10);
  const minute = Number.parseInt(match[3], 10);

  if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }

  const baseDate = startOfLocalDay(now);
  const offsetDays = keyword === "завтра" ? 1 : 0;
  const dayDate = addLocalDays(baseDate, offsetDays);
  const dayKey = toDayKey(dayDate);
  const timeLabel = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  return {
    dayKey,
    timeLabel,
    slotKey: `${dayKey} ${timeLabel}`,
  };
}

export function parseWeekSlot(value, now) {
  const plannedStartLocal = String(value ?? "").trim();
  if (plannedStartLocal.length === 0) {
    return { kind: "unscheduled" };
  }

  const absolute = parseAbsoluteSlot(plannedStartLocal);
  if (absolute) {
    return { kind: "scheduled", ...absolute };
  }

  const relative = parseRelativeSlot(plannedStartLocal, now);
  if (relative) {
    return { kind: "scheduled", ...relative };
  }

  return { kind: "unscheduled" };
}

export function normalizeDispatchDay(value, now) {
  if (typeof value === "string" && DISPATCH_DATE_RE.test(value.trim())) {
    return value.trim();
  }
  return toDayKey(startOfLocalDay(now));
}

export function normalizeLaneMode(value) {
  return value === "technician" ? "technician" : "bay";
}

export function parseMinutesFromTimeLabel(label) {
  if (typeof label !== "string") {
    return null;
  }

  const match = /^(\d{2}):(\d{2})$/u.exec(label.trim());
  if (!match) {
    return null;
  }

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return null;
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return (hour * 60) + minute;
}

export function normalizeDispatchDuration(value) {
  if (!Number.isInteger(value)) {
    return DISPATCH_DEFAULT_DURATION_MIN;
  }
  return Math.min(720, Math.max(15, value));
}

export function formatMinuteLabel(minuteOfDay) {
  const hour = String(Math.floor(minuteOfDay / 60)).padStart(2, "0");
  const minute = String(minuteOfDay % 60).padStart(2, "0");
  return `${hour}:${minute}`;
}

export function formatLocalDateTime(dayLocal, minuteOfDay) {
  return `${dayLocal} ${formatMinuteLabel(minuteOfDay)}:00`;
}

export function normalizeDispatchStatusClass(status) {
  const normalized = String(status ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/gu, "");
  if (normalized.length === 0) {
    return "status-booked";
  }
  return `status-${normalized}`;
}

const PLANNED_START_LOCAL_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/u;

function isValidDateParts(year, month, day, hour, minute) {
  const date = new Date(year, month - 1, day, hour, minute, 0, 0);
  return (
    date.getFullYear() === year
    && date.getMonth() + 1 === month
    && date.getDate() === day
    && date.getHours() === hour
    && date.getMinutes() === minute
  );
}

export function normalizePlannedStartLocal(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const match = PLANNED_START_LOCAL_RE.exec(trimmed);
  if (!match) {
    return null;
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4], 10);
  const minute = Number.parseInt(match[5], 10);

  if (
    Number.isNaN(year)
    || Number.isNaN(month)
    || Number.isNaN(day)
    || Number.isNaN(hour)
    || Number.isNaN(minute)
  ) {
    return null;
  }

  if (!isValidDateParts(year, month, day, hour, minute)) {
    return null;
  }

  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}


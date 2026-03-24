import {
  ASSIGNEE_DAILY_CAPACITY_BASELINE,
  BAY_DAILY_CAPACITY_BASELINE,
  WEEK_PLANNED_STATUSES,
} from "./constants.js";
import {
  buildWeekDays,
  parseWeekSlot,
} from "./timeUtils.js";

function createWeekResourceRow(key) {
  return {
    key,
    dayMap: new Map(),
  };
}

function incrementWeekResourceLoad(map, resourceKey, dayKey, slotKey) {
  const key = resourceKey ?? "Без назначения";
  const row = map.get(key) ?? createWeekResourceRow(key);
  const dayEntry = row.dayMap.get(dayKey) ?? { plannedCount: 0, slotCounts: new Map() };

  dayEntry.plannedCount += 1;
  dayEntry.slotCounts.set(slotKey, (dayEntry.slotCounts.get(slotKey) ?? 0) + 1);

  row.dayMap.set(dayKey, dayEntry);
  map.set(key, row);
}

function finalizeWeekRows(map, days, capacityPerDay) {
  const rows = [];

  for (const row of map.values()) {
    let totalPlanned = 0;
    let overbookedCells = 0;
    let underbookedCells = 0;
    let overbookedSlots = 0;

    const dayCells = days.map((day) => {
      const dayEntry = row.dayMap.get(day.dayKey) ?? { plannedCount: 0, slotCounts: new Map() };
      const plannedCount = dayEntry.plannedCount;
      const slotConflicts = [...dayEntry.slotCounts.values()].filter((count) => count > 1).length;
      const isOverbooked = slotConflicts > 0 || plannedCount > capacityPerDay;
      const isUnderbooked = plannedCount === 0;
      const loadRatio = capacityPerDay > 0 ? plannedCount / capacityPerDay : 0;

      let status = "normal";
      let statusLabel = "Норма";

      if (isOverbooked) {
        status = "overbooked";
        statusLabel = "Перегруз";
      } else if (isUnderbooked) {
        status = "underbooked";
        statusLabel = "Пусто";
      } else if (loadRatio >= 0.75) {
        status = "high";
        statusLabel = "Высокая";
      }

      if (isOverbooked) {
        overbookedCells += 1;
      }

      if (isUnderbooked) {
        underbookedCells += 1;
      }

      overbookedSlots += slotConflicts;
      totalPlanned += plannedCount;

      return {
        dayKey: day.dayKey,
        plannedCount,
        capacityPerDay,
        slotConflicts,
        isOverbooked,
        isUnderbooked,
        status,
        statusLabel,
      };
    });

    rows.push({
      key: row.key,
      totalPlanned,
      overbookedCells,
      underbookedCells,
      overbookedSlots,
      days: dayCells,
    });
  }

  return rows.sort((left, right) => right.totalPlanned - left.totalPlanned || left.key.localeCompare(right.key, "ru-RU"));
}

function sumRowMetric(rows, field) {
  return rows.reduce((accumulator, row) => accumulator + (row[field] ?? 0), 0);
}

export function buildWeekPlanning({
  now,
  appointments,
  serviceMeta,
  employees,
}) {
  const days = buildWeekDays(now);
  const dayKeys = new Set(days.map((day) => day.dayKey));

  const bayMap = new Map(serviceMeta.bays.map((bay) => [bay.name, createWeekResourceRow(bay.name)]));
  const assigneeMap = new Map(employees.map((employee) => [employee.name, createWeekResourceRow(employee.name)]));

  let unscheduledAppointmentsCount = 0;
  let inWindowAppointmentsCount = 0;

  for (const appointment of appointments) {
    if (!WEEK_PLANNED_STATUSES.has(appointment.status)) {
      continue;
    }

    const slot = parseWeekSlot(appointment.plannedStartLocal, now);
    if (slot.kind !== "scheduled") {
      unscheduledAppointmentsCount += 1;
      continue;
    }

    if (!dayKeys.has(slot.dayKey)) {
      continue;
    }

    inWindowAppointmentsCount += 1;

    incrementWeekResourceLoad(bayMap, appointment.bayName ?? "Без поста", slot.dayKey, slot.slotKey);
    incrementWeekResourceLoad(assigneeMap, appointment.primaryAssignee ?? "Без ответственного", slot.dayKey, slot.slotKey);
  }

  const byBay = finalizeWeekRows(bayMap, days, BAY_DAILY_CAPACITY_BASELINE);
  const byAssignee = finalizeWeekRows(assigneeMap, days, ASSIGNEE_DAILY_CAPACITY_BASELINE);

  return {
    days,
    assumptions: {
      bayCapacityPerDay: BAY_DAILY_CAPACITY_BASELINE,
      assigneeCapacityPerDay: ASSIGNEE_DAILY_CAPACITY_BASELINE,
    },
    summary: {
      inWindowAppointmentsCount,
      unscheduledAppointmentsCount,
      overbookedCellsByBay: sumRowMetric(byBay, "overbookedCells"),
      overbookedCellsByAssignee: sumRowMetric(byAssignee, "overbookedCells"),
      underbookedCellsByBay: sumRowMetric(byBay, "underbookedCells"),
      underbookedCellsByAssignee: sumRowMetric(byAssignee, "underbookedCells"),
    },
    byBay,
    byAssignee,
  };
}

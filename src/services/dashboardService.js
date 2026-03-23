const ACTIVE_STATUSES = new Set([
  "waiting_diagnosis",
  "waiting_approval",
  "waiting_parts",
  "scheduled",
  "in_progress",
  "paused",
  "ready_pickup",
]);

const BLOCKED_STATUSES = new Set(["waiting_parts", "waiting_approval", "waiting_diagnosis", "paused"]);
const WEEK_PLANNED_STATUSES = new Set(["booked", "confirmed", "arrived"]);
const WEEK_WINDOW_DAYS = 7;
const BAY_DAILY_CAPACITY_BASELINE = 4;
const ASSIGNEE_DAILY_CAPACITY_BASELINE = 3;
const SEARCH_RESULTS_LIMIT = 8;
const SEARCH_TIMING_BASELINE_MS = 200;
const DISPATCH_DAY_START_MINUTES = 8 * 60;
const DISPATCH_DAY_END_MINUTES = 20 * 60;
const DISPATCH_SLOT_STEP_MINUTES = 15;
const DISPATCH_DEFAULT_DURATION_MIN = 60;
const DISPATCH_DATE_RE = /^\d{4}-\d{2}-\d{2}$/u;

const ABSOLUTE_SLOT_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?$/;
const RELATIVE_SLOT_RE = /^(Сегодня|Завтра)\s+(\d{1,2}):(\d{2})$/i;

function formatRub(value) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} руб.`;
}

function formatBlockedDuration(blockedSinceIso, now) {
  if (!blockedSinceIso) {
    return "н/д";
  }

  const blockedSince = new Date(blockedSinceIso);
  if (Number.isNaN(blockedSince.getTime())) {
    return "н/д";
  }

  const ms = now.getTime() - blockedSince.getTime();
  if (ms <= 0) {
    return "0 ч";
  }

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} дн`;
  }

  return `${hours} ч`;
}

function formatAgeSince(isoValue, now) {
  if (!isoValue) {
    return "н/д";
  }

  const startedAt = new Date(isoValue);
  if (Number.isNaN(startedAt.getTime())) {
    return "н/д";
  }

  const ms = now.getTime() - startedAt.getTime();
  if (ms <= 0) {
    return "0 ч";
  }

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days} дн`;
  }
  return `${hours} ч`;
}

function ageHoursSince(isoValue, now) {
  if (!isoValue) {
    return null;
  }
  const startedAt = new Date(isoValue);
  if (Number.isNaN(startedAt.getTime())) {
    return null;
  }
  const ms = now.getTime() - startedAt.getTime();
  if (ms <= 0) {
    return 0;
  }
  return Math.floor(ms / (1000 * 60 * 60));
}

function toQueueItem(order, customerPhone, now, partsMetrics = null) {
  const balanceDueRub = order.balanceDueRub ?? 0;
  const blockedDurationLabel = formatBlockedDuration(order.blockedSinceIso, now);
  const pendingPartsCount = partsMetrics?.pendingCount ?? 0;
  const oldestPendingPartsAgeLabel = formatAgeSince(partsMetrics?.oldestRequestedAt ?? null, now);
  const oldestPendingPartsAgeHours = ageHoursSince(partsMetrics?.oldestRequestedAt ?? null, now);

  let nextActionLabel = "Обновить задачу";
  if (order.status === "waiting_parts") {
    nextActionLabel = pendingPartsCount > 0
      ? `Контроль поставки (${pendingPartsCount})`
      : "Проверить запросы запчастей";
  } else if (order.status === "ready_pickup" && balanceDueRub > 0) {
    nextActionLabel = "Позвонить клиенту и закрыть оплату";
  } else if (order.status === "ready_pickup") {
    nextActionLabel = "Позвонить клиенту";
  }

  return {
    id: order.id,
    detailHref: `/work-orders/${order.id}`,
    code: order.code,
    customerName: order.customerName,
    customerPhone,
    vehicleLabel: order.vehicleLabel,
    status: order.status,
    statusLabelRu: order.statusLabelRu,
    primaryAssignee: order.primaryAssignee,
    bayName: order.bayName ?? "Без поста",
    balanceDueRub,
    balanceDueLabel: balanceDueRub > 0 ? formatRub(balanceDueRub) : "0 руб.",
    blockedDurationLabel,
    pendingPartsCount,
    oldestPendingPartsAgeLabel,
    oldestPendingPartsAgeHours,
    nextActionLabel,
  };
}

function incrementLoad(map, key, field) {
  const current = map.get(key) ?? { key, plannedCount: 0, activeCount: 0, blockedCount: 0 };
  current[field] += 1;
  map.set(key, current);
}

function startOfLocalDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addLocalDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function toDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWeekDayLabel(date) {
  const weekday = new Intl.DateTimeFormat("ru-RU", { weekday: "short" }).format(date).replace(".", "");
  const dayMonth = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit" }).format(date);
  return `${weekday.slice(0, 1).toUpperCase()}${weekday.slice(1)} ${dayMonth}`;
}

function buildWeekDays(now) {
  const start = startOfLocalDay(now);
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

function parseAbsoluteSlot(value) {
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
    hour !== null &&
    (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59)
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

function parseRelativeSlot(value, now) {
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

function parseWeekSlot(value, now) {
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

function normalizeDispatchDay(value, now) {
  if (typeof value === "string" && DISPATCH_DATE_RE.test(value.trim())) {
    return value.trim();
  }
  return toDayKey(startOfLocalDay(now));
}

function normalizeLaneMode(value) {
  return value === "technician" ? "technician" : "bay";
}

function parseMinutesFromTimeLabel(label) {
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

function normalizeDispatchDuration(value) {
  if (!Number.isInteger(value)) {
    return DISPATCH_DEFAULT_DURATION_MIN;
  }
  return Math.min(720, Math.max(15, value));
}

function buildDispatchTimeSlots() {
  const slots = [];
  for (let minute = DISPATCH_DAY_START_MINUTES; minute < DISPATCH_DAY_END_MINUTES; minute += DISPATCH_SLOT_STEP_MINUTES) {
    const hour = String(Math.floor(minute / 60)).padStart(2, "0");
    const min = String(minute % 60).padStart(2, "0");
    slots.push({
      minuteOfDay: minute,
      label: `${hour}:${min}`,
    });
  }
  return slots;
}

function resolveAppointmentLaneKey(appointment, laneMode) {
  if (laneMode === "technician") {
    const assignee = String(appointment.primaryAssignee ?? "").trim();
    return assignee.length > 0 && assignee !== "Без ответственного"
      ? `tech:${assignee}`
      : "tech:none";
  }

  const bayId = String(appointment.bayId ?? "").trim();
  return bayId.length > 0 ? `bay:${bayId}` : "bay:none";
}

function sortByCodeAscending(left, right) {
  return String(left.code ?? "").localeCompare(String(right.code ?? ""), "ru-RU");
}

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

function normalizeLookupText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^0-9a-zа-яё]/giu, "");
}

function buildEmptySearchPayload() {
  return {
    query: "",
    normalizedQuery: "",
    performed: false,
    limits: {
      perGroup: SEARCH_RESULTS_LIMIT,
    },
    timing: null,
    totals: {
      customers: 0,
      vehicles: 0,
      appointments: 0,
      workOrders: 0,
      all: 0,
    },
    truncated: {
      customers: false,
      vehicles: false,
      appointments: false,
      workOrders: false,
    },
    customers: [],
    vehicles: [],
    appointments: [],
    workOrders: [],
  };
}

function buildSearchResults({ repository, query = "" }) {
  const queryText = String(query ?? "").trim();
  if (queryText.length === 0) {
    return buildEmptySearchPayload();
  }

  const startedAtMs = Date.now();
  const normalizedQuery = normalizeLookupText(queryText);
  const customerResult = repository.searchCustomers({
    query: queryText,
    limit: SEARCH_RESULTS_LIMIT,
  });
  const vehicleResult = repository.searchVehicles({
    query: queryText,
    limit: SEARCH_RESULTS_LIMIT,
  });
  const appointmentResult = repository.searchAppointmentRecords({
    query: queryText,
    limit: SEARCH_RESULTS_LIMIT,
  });
  const workOrderResult = repository.searchWorkOrders({
    query: queryText,
    limit: SEARCH_RESULTS_LIMIT,
  });

  const customers = {
    items: customerResult.rows.map((item) => ({
      id: item.id,
      fullName: item.fullName,
      phone: item.phone,
    })),
    total: customerResult.total,
    truncated: customerResult.total > SEARCH_RESULTS_LIMIT,
  };

  const vehicles = {
    items: vehicleResult.rows.map((item) => ({
      id: item.id,
      customerId: item.customerId,
      customerName: item.customerName,
      label: item.label,
      plateNumber: item.plateNumber,
      vin: item.vin,
      model: item.model,
    })),
    total: vehicleResult.total,
    truncated: vehicleResult.total > SEARCH_RESULTS_LIMIT,
  };

  const appointments = {
    items: appointmentResult.rows.map((item) => ({
      id: item.id,
      code: item.code,
      plannedStartLocal: item.plannedStartLocal,
      customerName: item.customerName,
      vehicleLabel: item.vehicleLabel,
      detailHref: `/appointments/${item.id}`,
    })),
    total: appointmentResult.total,
    truncated: appointmentResult.total > SEARCH_RESULTS_LIMIT,
  };

  const workOrders = {
    items: workOrderResult.rows.map((item) => ({
      id: item.id,
      code: item.code,
      customerName: item.customerName,
      vehicleLabel: item.vehicleLabel,
      statusLabelRu: item.statusLabelRu,
      detailHref: `/work-orders/${item.id}`,
    })),
    total: workOrderResult.total,
    truncated: workOrderResult.total > SEARCH_RESULTS_LIMIT,
  };

  const durationMs = Date.now() - startedAtMs;

  return {
    query: queryText,
    normalizedQuery,
    performed: true,
    limits: {
      perGroup: SEARCH_RESULTS_LIMIT,
    },
    timing: {
      durationMs,
      baselineMs: SEARCH_TIMING_BASELINE_MS,
      withinBaseline: durationMs <= SEARCH_TIMING_BASELINE_MS,
    },
    totals: {
      customers: customers.total,
      vehicles: vehicles.total,
      appointments: appointments.total,
      workOrders: workOrders.total,
      all: customers.total + vehicles.total + appointments.total + workOrders.total,
    },
    truncated: {
      customers: customers.truncated,
      vehicles: vehicles.truncated,
      appointments: appointments.truncated,
      workOrders: workOrders.truncated,
    },
    customers: customers.items,
    vehicles: vehicles.items,
    appointments: appointments.items,
    workOrders: workOrders.items,
  };
}

function buildWeekPlanning({ now, appointments, serviceMeta, employees }) {
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

export class DashboardService {
  constructor(repository) {
    this.repository = repository;
  }

  getTodayDashboard({ searchQuery = "" } = {}) {
    const now = new Date();
    const todayDayKey = toDayKey(startOfLocalDay(now));
    const customers = this.repository.listCustomers();
    const appointments = this.repository.listAppointments();
    const workOrders = this.repository.listWorkOrders();
    const employees = this.repository.listEmployees();
    const serviceMeta = this.repository.getServiceMeta();
    const search = this.searchLookup({ query: searchQuery });

    const customerPhoneById = new Map(customers.map((customer) => [customer.id, customer.phone]));
    const appointmentsToday = appointments.filter((appointment) => {
      const slot = parseWeekSlot(appointment.plannedStartLocal, now);
      return slot.kind === "scheduled" && slot.dayKey === todayDayKey;
    });

    const activeWorkOrders = workOrders.filter((order) => ACTIVE_STATUSES.has(order.status));
    const partsAgingMap = this.repository.listBlockingPartsRequestAgingByWorkOrderIds(
      activeWorkOrders.map((order) => order.id),
    );
    const waitingDiagnosis = activeWorkOrders
      .filter((order) => order.status === "waiting_diagnosis")
      .map((order) => toQueueItem(order, customerPhoneById.get(order.customerId) ?? "нет телефона", now, null));
    const waitingApproval = activeWorkOrders
      .filter((order) => order.status === "waiting_approval")
      .map((order) => toQueueItem(order, customerPhoneById.get(order.customerId) ?? "нет телефона", now, null));
    const waitingParts = activeWorkOrders
      .filter((order) => order.status === "waiting_parts")
      .map((order) => toQueueItem(
        order,
        customerPhoneById.get(order.customerId) ?? "нет телефона",
        now,
        partsAgingMap.get(order.id) ?? null,
      ))
      .sort((left, right) => {
        const leftAge = left.oldestPendingPartsAgeHours ?? -1;
        const rightAge = right.oldestPendingPartsAgeHours ?? -1;
        return rightAge - leftAge || right.pendingPartsCount - left.pendingPartsCount || left.code.localeCompare(right.code, "ru-RU");
      });
    const paused = activeWorkOrders
      .filter((order) => order.status === "paused")
      .map((order) => toQueueItem(order, customerPhoneById.get(order.customerId) ?? "нет телефона", now, null));
    const readyPickup = activeWorkOrders
      .filter((order) => order.status === "ready_pickup")
      .map((order) => toQueueItem(order, customerPhoneById.get(order.customerId) ?? "нет телефона", now, null));

    const unpaidReadyForPickup = readyPickup.filter((order) => order.balanceDueRub > 0);
    const unpaidReadyForPickupAmountRub = unpaidReadyForPickup.reduce((acc, order) => acc + order.balanceDueRub, 0);
    const totalOutstandingActiveRub = activeWorkOrders.reduce((acc, order) => acc + (order.balanceDueRub ?? 0), 0);

    const overdueItemsCount = activeWorkOrders.filter((order) => {
      if (!BLOCKED_STATUSES.has(order.status)) {
        return false;
      }
      if (!order.blockedSinceIso) {
        return false;
      }
      const durationMs = now.getTime() - new Date(order.blockedSinceIso).getTime();
      return durationMs >= 1000 * 60 * 60 * 24 * 2;
    }).length;

    const bayLoad = new Map(serviceMeta.bays.map((bay) => [bay.name, { key: bay.name, plannedCount: 0, activeCount: 0, blockedCount: 0 }]));

    const assigneeLoad = new Map();

    for (const appointment of appointmentsToday) {
      incrementLoad(bayLoad, appointment.bayName ?? "Без поста", "plannedCount");
      incrementLoad(assigneeLoad, appointment.primaryAssignee ?? "Без ответственного", "plannedCount");
    }

    for (const order of activeWorkOrders) {
      incrementLoad(bayLoad, order.bayName ?? "Без поста", "activeCount");
      incrementLoad(assigneeLoad, order.primaryAssignee ?? "Без ответственного", "activeCount");
      if (BLOCKED_STATUSES.has(order.status)) {
        incrementLoad(bayLoad, order.bayName ?? "Без поста", "blockedCount");
        incrementLoad(assigneeLoad, order.primaryAssignee ?? "Без ответственного", "blockedCount");
      }
    }

    const week = buildWeekPlanning({
      now,
      appointments,
      serviceMeta,
      employees,
    });

    const appointmentRows = appointmentsToday.map((appointment) => ({
      ...appointment,
      detailHref: `/appointments/${appointment.id}`,
    }));

    return {
      generatedAt: now.toISOString(),
      service: serviceMeta,
      summary: {
        appointmentsToday: appointmentsToday.length,
        activeWorkOrders: activeWorkOrders.length,
        waitingDiagnosisCount: waitingDiagnosis.length,
        waitingApprovalCount: waitingApproval.length,
        waitingPartsCount: waitingParts.length,
        pausedCount: paused.length,
        readyForPickupCount: readyPickup.length,
        unpaidReadyForPickupCount: unpaidReadyForPickup.length,
        unpaidReadyForPickupAmountRub,
        unpaidReadyForPickupAmountLabel: formatRub(unpaidReadyForPickupAmountRub),
        totalOutstandingActiveRub,
        totalOutstandingActiveLabel: formatRub(totalOutstandingActiveRub),
        overdueItemsCount,
      },
      actions: {
        newAppointmentHref: "/appointments/new",
        newWalkInHref: "/intake/walk-in",
        openActiveQueueHref: "/work-orders/active",
        openDispatchBoardHref: "/dispatch/board",
      },
      appointments: appointmentRows,
      load: {
        byBay: [...bayLoad.values()].sort((a, b) => b.activeCount - a.activeCount || b.plannedCount - a.plannedCount),
        byAssignee: [...assigneeLoad.values()].sort(
          (a, b) => b.activeCount - a.activeCount || b.plannedCount - a.plannedCount,
        ),
      },
      week,
      search,
      queues: {
        waitingDiagnosis,
        waitingApproval,
        waitingParts,
        paused,
        readyPickup,
        active: activeWorkOrders,
      },
    };
  }

  getDispatchBoard({ day = null, laneMode = "bay" } = {}) {
    const now = new Date();
    const dayLocal = normalizeDispatchDay(day, now);
    const normalizedLaneMode = normalizeLaneMode(laneMode);
    const serviceMeta = this.repository.getServiceMeta();
    const employees = this.repository.listEmployees({ includeInactive: false });
    const dayAppointments = this.repository.listAppointmentRecords({
      dateFromLocal: dayLocal,
      dateToLocal: dayLocal,
      limit: null,
      offset: 0,
    });
    const allAppointments = this.repository.listAppointmentRecords({
      limit: 200,
      offset: 0,
    });
    const walkInQueue = this.repository
      .listUnscheduledWalkInWorkOrders({ limit: 40 })
      .filter((item) => item.status === "waiting_diagnosis" || item.status === "waiting_approval");

    const lanes = normalizedLaneMode === "technician"
      ? [
        ...employees.map((employee) => ({
          key: `tech:${employee.name}`,
          label: employee.name,
          type: "technician",
          value: employee.name,
        })),
        {
          key: "tech:none",
          label: "Без ответственного",
          type: "technician",
          value: null,
        },
      ]
      : [
        ...serviceMeta.bays.map((bay) => ({
          key: `bay:${bay.id}`,
          label: bay.name,
          type: "bay",
          value: bay.id,
        })),
        {
          key: "bay:none",
          label: "Без поста",
          type: "bay",
          value: null,
        },
      ];

    const laneByKey = new Map(lanes.map((lane) => [lane.key, lane]));
    const appointmentCards = [];
    const unscheduledAppointments = [];

    for (const appointment of dayAppointments) {
      const slot = parseWeekSlot(appointment.plannedStartLocal, now);
      if (slot.kind !== "scheduled" || slot.dayKey !== dayLocal) {
        unscheduledAppointments.push(appointment);
        continue;
      }

      const startMinute = parseMinutesFromTimeLabel(slot.timeLabel);
      if (!Number.isInteger(startMinute)) {
        unscheduledAppointments.push(appointment);
        continue;
      }

      const durationMin = normalizeDispatchDuration(appointment.expectedDurationMin);
      const laneKey = resolveAppointmentLaneKey(appointment, normalizedLaneMode);
      if (!laneByKey.has(laneKey)) {
        unscheduledAppointments.push(appointment);
        continue;
      }

      appointmentCards.push({
        id: appointment.id,
        code: appointment.code,
        customerName: appointment.customerName,
        vehicleLabel: appointment.vehicleLabel,
        complaint: appointment.complaint,
        status: appointment.status,
        laneKey,
        plannedStartLocal: appointment.plannedStartLocal,
        startMinute,
        endMinute: Math.min(DISPATCH_DAY_END_MINUTES, startMinute + durationMin),
        durationMin,
        expectedDurationMin: appointment.expectedDurationMin ?? null,
        bayId: appointment.bayId ?? null,
        bayName: appointment.bayName ?? "Без поста",
        primaryAssignee: appointment.primaryAssignee ?? "Без ответственного",
      });
    }

    appointmentCards.sort((left, right) => left.startMinute - right.startMinute || sortByCodeAscending(left, right));

    const outsideOfDayQueue = allAppointments
      .filter((appointment) => {
        if (!WEEK_PLANNED_STATUSES.has(appointment.status)) {
          return false;
        }
        const slot = parseWeekSlot(appointment.plannedStartLocal, now);
        return slot.kind === "scheduled" && slot.dayKey !== dayLocal;
      })
      .slice(0, 40)
      .sort((left, right) => String(left.plannedStartLocal).localeCompare(String(right.plannedStartLocal), "ru-RU"))
      .map((appointment) => ({
        kind: "appointment",
        id: appointment.id,
        code: appointment.code,
        customerName: appointment.customerName,
        vehicleLabel: appointment.vehicleLabel,
        complaint: appointment.complaint,
        plannedStartLocal: appointment.plannedStartLocal,
        status: appointment.status,
      }));

    const walkInQueueItems = walkInQueue.map((workOrder) => ({
      kind: "walkin",
      id: workOrder.id,
      code: workOrder.code,
      customerId: workOrder.customerId,
      vehicleId: workOrder.vehicleId,
      customerName: workOrder.customerName,
      vehicleLabel: workOrder.vehicleLabel,
      complaint: workOrder.complaint ?? "Без уточнений",
      status: workOrder.status,
      statusLabelRu: workOrder.statusLabelRu,
      createdAt: workOrder.createdAt,
    }));

    const laneLoad = lanes.map((lane) => {
      const cards = appointmentCards.filter((card) => card.laneKey === lane.key);
      const bookedMinutes = cards.reduce((acc, card) => acc + Math.max(0, card.endMinute - card.startMinute), 0);
      const capacityMinutes = DISPATCH_DAY_END_MINUTES - DISPATCH_DAY_START_MINUTES;
      const utilizationRatio = capacityMinutes > 0 ? bookedMinutes / capacityMinutes : 0;
      return {
        laneKey: lane.key,
        appointmentsCount: cards.length,
        bookedMinutes,
        utilizationRatio,
        isOverloaded: utilizationRatio > 1,
      };
    });

    return {
      generatedAt: now.toISOString(),
      dayLocal,
      laneMode: normalizedLaneMode,
      timeline: {
        startMinute: DISPATCH_DAY_START_MINUTES,
        endMinute: DISPATCH_DAY_END_MINUTES,
        stepMinutes: DISPATCH_SLOT_STEP_MINUTES,
        slots: buildDispatchTimeSlots(),
      },
      lanes,
      laneLoad,
      appointments: appointmentCards,
      queues: {
        unscheduledAppointments: outsideOfDayQueue,
        walkIn: walkInQueueItems,
      },
      summary: {
        scheduledAppointmentsCount: appointmentCards.length,
        unscheduledDayCount: unscheduledAppointments.length,
        carryOverQueueCount: outsideOfDayQueue.length,
        walkInQueueCount: walkInQueueItems.length,
        overloadedLanesCount: laneLoad.filter((lane) => lane.isOverloaded).length,
      },
      actions: {
        backHref: "/",
        createAppointmentHref: "/appointments/new",
        createWalkInHref: "/intake/walk-in",
      },
    };
  }

  searchLookup({ query = "" } = {}) {
    return buildSearchResults({
      repository: this.repository,
      query,
    });
  }

  getWorkOrderById(id) {
    return this.repository.getWorkOrderRecordById(id);
  }

  getAppointmentById(id) {
    return this.repository.listAppointments().find((appointment) => appointment.id === id) ?? null;
  }
}

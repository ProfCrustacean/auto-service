import {
  ACTIVE_STATUSES,
  BLOCKED_STATUSES,
} from "./constants.js";
import {
  parseWeekSlot,
  startOfLocalDay,
  toDayKey,
} from "./timeUtils.js";
import { buildWeekPlanning } from "./weekProjection.js";
import { buildSearchResults } from "./searchProjection.js";

function formatRub(value) {
  return `${new Intl.NumberFormat("ru-RU").format(value)} руб.`;
}

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export function buildTodayDashboard({ repository, searchQuery = "" }) {
  const now = new Date();
  const todayDayKey = toDayKey(startOfLocalDay(now));
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const reportPeriodFrom = toLocalDateKey(monthStart);
  const reportPeriodTo = toLocalDateKey(now);
  const customers = repository.listCustomers();
  const appointments = repository.listAppointments();
  const workOrders = repository.listWorkOrders();
  const employees = repository.listEmployees();
  const serviceMeta = repository.getServiceMeta();
  const search = buildSearchResults({ repository, query: searchQuery });

  const customerPhoneById = new Map(customers.map((customer) => [customer.id, customer.phone]));
  const appointmentsToday = appointments.filter((appointment) => {
    const slot = parseWeekSlot(appointment.plannedStartLocal, now);
    return slot.kind === "scheduled" && slot.dayKey === todayDayKey;
  });

  const activeWorkOrders = workOrders.filter((order) => ACTIVE_STATUSES.has(order.status));
  const partsAgingMap = repository.listBlockingPartsRequestAgingByWorkOrderIds(
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
  const operationsReport = repository.getOperationsReport({
    dateFromLocal: reportPeriodFrom,
    dateToLocal: reportPeriodTo,
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
    reporting: {
      ...operationsReport,
      laborRevenueLabel: formatRub(operationsReport.laborRevenueRub ?? 0),
      partsRevenueLabel: formatRub(operationsReport.partsRevenueRub ?? 0),
      totalRevenueLabel: formatRub(operationsReport.totalRevenueRub ?? 0),
      averageTicketLabel: formatRub(operationsReport.averageTicketRub ?? 0),
      grossMarginLabel: formatRub(operationsReport.grossMarginRub ?? 0),
      openBalancesLabel: formatRub(operationsReport.openBalancesRub ?? 0),
      readyPickupUnpaidLabel: formatRub(operationsReport.readyPickupUnpaidRub ?? 0),
      partsCostLabel: formatRub(operationsReport.partsCostRub ?? 0),
      outsideServiceCostLabel: formatRub(operationsReport.outsideServiceCostRub ?? 0),
    },
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

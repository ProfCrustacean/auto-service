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

function toQueueItem(order, customerPhone, now) {
  const balanceDueRub = order.balanceDueRub ?? 0;
  const blockedDurationLabel = formatBlockedDuration(order.blockedSinceIso, now);

  let nextActionLabel = "Обновить задачу";
  if (order.status === "waiting_parts") {
    nextActionLabel = "Уточнить поставку";
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
    nextActionLabel,
  };
}

function incrementLoad(map, key, field) {
  const current = map.get(key) ?? { key, plannedCount: 0, activeCount: 0, blockedCount: 0 };
  current[field] += 1;
  map.set(key, current);
}

export class DashboardService {
  constructor(repository) {
    this.repository = repository;
  }

  getTodayDashboard() {
    const now = new Date();
    const customers = this.repository.listCustomers();
    const appointments = this.repository.listAppointments();
    const workOrders = this.repository.listWorkOrders();

    const customerPhoneById = new Map(customers.map((customer) => [customer.id, customer.phone]));

    const activeWorkOrders = workOrders.filter((order) => ACTIVE_STATUSES.has(order.status));
    const waitingParts = activeWorkOrders
      .filter((order) => order.status === "waiting_parts")
      .map((order) => toQueueItem(order, customerPhoneById.get(order.customerId) ?? "нет телефона", now));
    const readyPickup = activeWorkOrders
      .filter((order) => order.status === "ready_pickup")
      .map((order) => toQueueItem(order, customerPhoneById.get(order.customerId) ?? "нет телефона", now));

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

    const bayLoad = new Map(
      this.repository
        .getServiceMeta()
        .bays.map((bay) => [bay.name, { key: bay.name, plannedCount: 0, activeCount: 0, blockedCount: 0 }]),
    );

    const assigneeLoad = new Map();

    for (const appointment of appointments) {
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

    const appointmentRows = appointments.map((appointment) => ({
      ...appointment,
      detailHref: `/appointments/${appointment.id}`,
    }));

    return {
      generatedAt: now.toISOString(),
      service: this.repository.getServiceMeta(),
      summary: {
        appointmentsToday: appointments.length,
        activeWorkOrders: activeWorkOrders.length,
        waitingPartsCount: waitingParts.length,
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
      },
      appointments: appointmentRows,
      load: {
        byBay: [...bayLoad.values()].sort((a, b) => b.activeCount - a.activeCount || b.plannedCount - a.plannedCount),
        byAssignee: [...assigneeLoad.values()].sort(
          (a, b) => b.activeCount - a.activeCount || b.plannedCount - a.plannedCount,
        ),
      },
      queues: {
        waitingParts,
        readyPickup,
        active: activeWorkOrders,
      },
    };
  }

  getWorkOrderById(id) {
    return this.repository.listWorkOrders().find((workOrder) => workOrder.id === id) ?? null;
  }

  getAppointmentById(id) {
    return this.repository.listAppointments().find((appointment) => appointment.id === id) ?? null;
  }
}

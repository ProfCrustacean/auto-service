import {
  DISPATCH_CALENDAR_ENGINE,
  DISPATCH_CALENDAR_ENGINE_VERSION,
  DISPATCH_DAY_END_MINUTES,
  DISPATCH_DAY_START_MINUTES,
  DISPATCH_DEFAULT_DURATION_MIN,
  WEEK_PLANNED_STATUSES,
} from "./constants.js";
import {
  formatLocalDateTime,
  formatMinuteLabel,
  normalizeDispatchDay,
  normalizeDispatchDuration,
  normalizeDispatchStatusClass,
  normalizeLaneMode,
  parseMinutesFromTimeLabel,
  parseWeekSlot,
} from "./timeUtils.js";

function resolveAppointmentLaneKey(appointment, laneMode) {
  if (laneMode === "technician") {
    const assignee = String(appointment.primaryAssignee ?? "").trim();
    return assignee.length > 0 && assignee !== "Без ответственного"
      ? `tech:${assignee}`
      : null;
  }

  const bayId = String(appointment.bayId ?? "").trim();
  return bayId.length > 0 ? `bay:${bayId}` : null;
}

function sortByCodeAscending(left, right) {
  return String(left.code ?? "").localeCompare(String(right.code ?? ""), "ru-RU");
}

function collectDispatchOverlappedEventIds(cards) {
  const byLane = new Map();
  for (const card of cards) {
    const laneCards = byLane.get(card.laneKey) ?? [];
    laneCards.push(card);
    byLane.set(card.laneKey, laneCards);
  }

  const overlappedIds = new Set();
  for (const laneCards of byLane.values()) {
    laneCards.sort((left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute);
    for (let index = 0; index < laneCards.length; index += 1) {
      const current = laneCards[index];
      for (let nextIndex = index + 1; nextIndex < laneCards.length; nextIndex += 1) {
        const candidate = laneCards[nextIndex];
        if (candidate.startMinute >= current.endMinute) {
          break;
        }
        if (candidate.endMinute > current.startMinute) {
          overlappedIds.add(current.id);
          overlappedIds.add(candidate.id);
        }
      }
    }
  }

  return overlappedIds;
}

export function buildDispatchBoard({ repository, day = null, laneMode = "bay" }) {
  const now = new Date();
  const dayLocal = normalizeDispatchDay(day, now);
  const normalizedLaneMode = normalizeLaneMode(laneMode);
  const serviceMeta = repository.getServiceMeta();
  const employees = repository.listEmployees({ includeInactive: false });
  const dayAppointments = repository.listAppointmentRecords({
    dateFromLocal: dayLocal,
    dateToLocal: dayLocal,
    limit: null,
    offset: 0,
  });
  const allAppointments = repository.listAppointmentRecords({
    limit: 200,
    offset: 0,
  });
  const walkInQueue = repository
    .listUnscheduledWalkInWorkOrders({ limit: 40 })
    .filter((item) => item.status === "waiting_diagnosis" || item.status === "waiting_approval");

  const lanes = normalizedLaneMode === "technician"
    ? employees.map((employee) => ({
      key: `tech:${employee.name}`,
      label: employee.name,
      type: "technician",
      value: employee.name,
    }))
    : serviceMeta.bays.map((bay) => ({
      key: `bay:${bay.id}`,
      label: bay.name,
      type: "bay",
      value: bay.id,
    }));

  const laneByKey = new Map(lanes.map((lane) => [lane.key, lane]));
  const appointmentCards = [];

  for (const appointment of dayAppointments) {
    const slot = parseWeekSlot(appointment.plannedStartLocal, now);
    if (slot.kind !== "scheduled" || slot.dayKey !== dayLocal) {
      continue;
    }

    const startMinute = parseMinutesFromTimeLabel(slot.timeLabel);
    if (!Number.isInteger(startMinute)) {
      continue;
    }

    const durationMin = normalizeDispatchDuration(appointment.expectedDurationMin);
    const laneKey = resolveAppointmentLaneKey(appointment, normalizedLaneMode);
    if (!laneByKey.has(laneKey)) {
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

  const unscheduledAppointmentsQueue = allAppointments
    .filter((appointment) => {
      if (!WEEK_PLANNED_STATUSES.has(appointment.status)) {
        return false;
      }
      const slot = parseWeekSlot(appointment.plannedStartLocal, now);
      const laneKey = resolveAppointmentLaneKey(appointment, normalizedLaneMode);
      if (slot.kind !== "scheduled") {
        return true;
      }
      if (slot.dayKey !== dayLocal) {
        return true;
      }
      return laneKey === null;
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
      expectedDurationMin: appointment.expectedDurationMin ?? DISPATCH_DEFAULT_DURATION_MIN,
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

  const resources = lanes.map((lane) => {
    const load = laneLoad.find((entry) => entry.laneKey === lane.key) ?? {
      appointmentsCount: 0,
      bookedMinutes: 0,
      utilizationRatio: 0,
    };
    return {
      id: lane.key,
      title: lane.label,
      type: lane.type,
      value: lane.value,
      extendedProps: {
        laneType: lane.type,
        laneValue: lane.value,
        appointmentsCount: load.appointmentsCount,
        bookedMinutes: load.bookedMinutes,
        utilizationRatio: load.utilizationRatio,
      },
    };
  });

  const overlappedIds = collectDispatchOverlappedEventIds(appointmentCards);
  const events = appointmentCards.map((card) => ({
    id: card.id,
    start: formatLocalDateTime(dayLocal, card.startMinute),
    end: formatLocalDateTime(dayLocal, card.endMinute),
    resourceId: card.laneKey,
    title: `${card.code} · ${card.customerName} · ${card.vehicleLabel}`,
    classNames: [
      normalizeDispatchStatusClass(card.status),
      ...(overlappedIds.has(card.id) ? ["status-overlap"] : []),
    ],
    extendedProps: {
      code: card.code,
      customerName: card.customerName,
      vehicleLabel: card.vehicleLabel,
      complaint: card.complaint,
      status: card.status,
      plannedStartLocal: card.plannedStartLocal,
      durationMin: card.durationMin,
      expectedDurationMin: card.expectedDurationMin,
      bayId: card.bayId,
      bayName: card.bayName,
      primaryAssignee: card.primaryAssignee,
    },
  }));

  return {
    generatedAt: now.toISOString(),
    dayLocal,
    laneMode: normalizedLaneMode,
    calendar: {
      engine: DISPATCH_CALENDAR_ENGINE,
      engineVersion: DISPATCH_CALENDAR_ENGINE_VERSION,
      view: "resourceTimeGridDay",
      dayLocal,
      slotMinTime: `${formatMinuteLabel(DISPATCH_DAY_START_MINUTES)}:00`,
      slotMaxTime: `${formatMinuteLabel(DISPATCH_DAY_END_MINUTES)}:00`,
      slotDuration: "00:15:00",
      snapDuration: "00:15:00",
      locale: "ru-RU",
    },
    resources,
    events,
    queues: {
      unscheduledAppointments: unscheduledAppointmentsQueue,
      walkIn: walkInQueueItems,
    },
    actions: {
      backHref: "/",
      createAppointmentHref: "/appointments/new",
      createWalkInHref: "/appointments/new?mode=walkin",
    },
  };
}

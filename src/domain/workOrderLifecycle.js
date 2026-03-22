export const WORK_ORDER_STATUS_META = Object.freeze({
  draft: Object.freeze({
    code: "draft",
    labelRu: "Черновик",
    isActive: false,
    isBlocked: false,
    isTerminal: false,
  }),
  waiting_diagnosis: Object.freeze({
    code: "waiting_diagnosis",
    labelRu: "Ожидает диагностики",
    isActive: true,
    isBlocked: true,
    isTerminal: false,
  }),
  waiting_approval: Object.freeze({
    code: "waiting_approval",
    labelRu: "Ожидает согласования",
    isActive: true,
    isBlocked: true,
    isTerminal: false,
  }),
  waiting_parts: Object.freeze({
    code: "waiting_parts",
    labelRu: "Ожидает запчасти",
    isActive: true,
    isBlocked: true,
    isTerminal: false,
  }),
  scheduled: Object.freeze({
    code: "scheduled",
    labelRu: "Запланирован",
    isActive: true,
    isBlocked: false,
    isTerminal: false,
  }),
  in_progress: Object.freeze({
    code: "in_progress",
    labelRu: "В работе",
    isActive: true,
    isBlocked: false,
    isTerminal: false,
  }),
  paused: Object.freeze({
    code: "paused",
    labelRu: "Пауза",
    isActive: true,
    isBlocked: true,
    isTerminal: false,
  }),
  ready_pickup: Object.freeze({
    code: "ready_pickup",
    labelRu: "Готово к выдаче",
    isActive: true,
    isBlocked: false,
    isTerminal: false,
  }),
  completed: Object.freeze({
    code: "completed",
    labelRu: "Завершен",
    isActive: false,
    isBlocked: false,
    isTerminal: true,
  }),
  cancelled: Object.freeze({
    code: "cancelled",
    labelRu: "Отменен",
    isActive: false,
    isBlocked: false,
    isTerminal: true,
  }),
});

export const WORK_ORDER_STATUS_CODES = Object.freeze(Object.keys(WORK_ORDER_STATUS_META));

export const WORK_ORDER_ALLOWED_TRANSITIONS = Object.freeze({
  draft: Object.freeze(["waiting_diagnosis", "scheduled", "cancelled"]),
  waiting_diagnosis: Object.freeze(["waiting_approval", "scheduled", "in_progress", "cancelled"]),
  waiting_approval: Object.freeze(["scheduled", "in_progress", "waiting_parts", "cancelled"]),
  waiting_parts: Object.freeze(["scheduled", "in_progress", "cancelled"]),
  scheduled: Object.freeze(["in_progress", "waiting_parts", "paused", "cancelled"]),
  in_progress: Object.freeze(["paused", "waiting_parts", "waiting_approval", "ready_pickup", "cancelled"]),
  paused: Object.freeze(["in_progress", "waiting_parts", "waiting_approval", "cancelled"]),
  ready_pickup: Object.freeze(["completed", "in_progress", "cancelled"]),
  completed: Object.freeze([]),
  cancelled: Object.freeze([]),
});

export function isKnownWorkOrderStatus(status) {
  return typeof status === "string" && Object.hasOwn(WORK_ORDER_STATUS_META, status);
}

export function getWorkOrderStatusMeta(status) {
  if (!isKnownWorkOrderStatus(status)) {
    return null;
  }
  return WORK_ORDER_STATUS_META[status];
}

export function getWorkOrderStatusLabel(status) {
  const meta = getWorkOrderStatusMeta(status);
  return meta ? meta.labelRu : null;
}

export function isBlockedWorkOrderStatus(status) {
  const meta = getWorkOrderStatusMeta(status);
  return meta ? meta.isBlocked : false;
}

export function isActiveWorkOrderStatus(status) {
  const meta = getWorkOrderStatusMeta(status);
  return meta ? meta.isActive : false;
}

export function isTerminalWorkOrderStatus(status) {
  const meta = getWorkOrderStatusMeta(status);
  return meta ? meta.isTerminal : false;
}

export function listAllowedWorkOrderTransitions(fromStatus) {
  if (!isKnownWorkOrderStatus(fromStatus)) {
    return [];
  }

  return [...(WORK_ORDER_ALLOWED_TRANSITIONS[fromStatus] ?? [])];
}

export function isWorkOrderTransitionAllowed(fromStatus, toStatus) {
  if (!isKnownWorkOrderStatus(fromStatus) || !isKnownWorkOrderStatus(toStatus)) {
    return false;
  }

  if (fromStatus === toStatus) {
    return true;
  }

  const allowed = WORK_ORDER_ALLOWED_TRANSITIONS[fromStatus] ?? [];
  return allowed.includes(toStatus);
}

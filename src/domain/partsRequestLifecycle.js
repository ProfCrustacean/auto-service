export const PARTS_REQUEST_STATUS_META = Object.freeze({
  requested: Object.freeze({
    code: "requested",
    labelRu: "Запрошена",
    isBlocking: true,
    isTerminal: false,
  }),
  ordered: Object.freeze({
    code: "ordered",
    labelRu: "Заказана",
    isBlocking: true,
    isTerminal: false,
  }),
  received: Object.freeze({
    code: "received",
    labelRu: "Получена",
    isBlocking: false,
    isTerminal: true,
  }),
  substituted: Object.freeze({
    code: "substituted",
    labelRu: "Заменена",
    isBlocking: false,
    isTerminal: true,
  }),
  cancelled: Object.freeze({
    code: "cancelled",
    labelRu: "Отменена",
    isBlocking: false,
    isTerminal: true,
  }),
  returned: Object.freeze({
    code: "returned",
    labelRu: "Возврат",
    isBlocking: false,
    isTerminal: true,
  }),
});

export const PARTS_REQUEST_STATUS_CODES = Object.freeze(Object.keys(PARTS_REQUEST_STATUS_META));

export const PARTS_REQUEST_ALLOWED_TRANSITIONS = Object.freeze({
  requested: Object.freeze(["ordered", "received", "substituted", "cancelled"]),
  ordered: Object.freeze(["received", "substituted", "cancelled", "returned"]),
  received: Object.freeze(["returned"]),
  substituted: Object.freeze([]),
  cancelled: Object.freeze([]),
  returned: Object.freeze([]),
});

export const PARTS_PURCHASE_ACTION_STATUS_CODES = Object.freeze(["ordered", "received", "cancelled", "returned"]);
export const PARTS_PURCHASE_ACTION_STATUS_LABELS_RU = Object.freeze({
  ordered: "Заказ оформлен",
  received: "Поставка получена",
  cancelled: "Заказ отменен",
  returned: "Поставка возвращена",
});

export function isKnownPartsRequestStatus(status) {
  return typeof status === "string" && Object.hasOwn(PARTS_REQUEST_STATUS_META, status);
}

export function getPartsRequestStatusMeta(status) {
  if (!isKnownPartsRequestStatus(status)) {
    return null;
  }

  return PARTS_REQUEST_STATUS_META[status];
}

export function getPartsRequestStatusLabel(status) {
  const meta = getPartsRequestStatusMeta(status);
  return meta ? meta.labelRu : null;
}

export function isBlockingPartsRequestStatus(status) {
  const meta = getPartsRequestStatusMeta(status);
  return meta ? meta.isBlocking : false;
}

export function isTerminalPartsRequestStatus(status) {
  const meta = getPartsRequestStatusMeta(status);
  return meta ? meta.isTerminal : false;
}

export function listAllowedPartsRequestTransitions(fromStatus) {
  if (!isKnownPartsRequestStatus(fromStatus)) {
    return [];
  }

  return [...(PARTS_REQUEST_ALLOWED_TRANSITIONS[fromStatus] ?? [])];
}

export function isPartsRequestTransitionAllowed(fromStatus, toStatus) {
  if (!isKnownPartsRequestStatus(fromStatus) || !isKnownPartsRequestStatus(toStatus)) {
    return false;
  }

  if (fromStatus === toStatus) {
    return true;
  }

  const allowed = PARTS_REQUEST_ALLOWED_TRANSITIONS[fromStatus] ?? [];
  return allowed.includes(toStatus);
}

export function isKnownPartsPurchaseActionStatus(status) {
  return typeof status === "string" && PARTS_PURCHASE_ACTION_STATUS_CODES.includes(status);
}

export function getPartsPurchaseActionStatusLabel(status) {
  if (!isKnownPartsPurchaseActionStatus(status)) {
    return null;
  }

  return PARTS_PURCHASE_ACTION_STATUS_LABELS_RU[status] ?? status;
}

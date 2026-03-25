export const WORK_ORDER_PAYMENT_TYPE_CODES = ["deposit", "partial", "final"];
export const WORK_ORDER_PAYMENT_METHOD_CODES = ["cash", "card", "bank_transfer", "other"];

const PAYMENT_TYPE_LABELS_RU = {
  deposit: "Депозит",
  partial: "Частичная оплата",
  final: "Финальная оплата",
};

const PAYMENT_METHOD_LABELS_RU = {
  cash: "Наличные",
  card: "Карта",
  bank_transfer: "Банковский перевод",
  other: "Другое",
};

export function isKnownWorkOrderPaymentType(value) {
  return WORK_ORDER_PAYMENT_TYPE_CODES.includes(value);
}

export function isKnownWorkOrderPaymentMethod(value) {
  return WORK_ORDER_PAYMENT_METHOD_CODES.includes(value);
}

export function getWorkOrderPaymentTypeLabel(value) {
  return PAYMENT_TYPE_LABELS_RU[value] ?? null;
}

export function getWorkOrderPaymentMethodLabel(value) {
  return PAYMENT_METHOD_LABELS_RU[value] ?? null;
}

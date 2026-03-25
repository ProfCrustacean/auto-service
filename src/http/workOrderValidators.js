import {
  collectUnknownFields,
  finalizeUnknownQueryFields,
  isNonEmptyString,
  normalizeBooleanField,
  normalizeBooleanLike,
  normalizeEnum,
  normalizeIntegerRange,
  normalizeLocalDateQuery,
  normalizeOptionalId,
  normalizeOptionalString,
  normalizePaginationQuery,
  normalizeSearchQuery,
} from "./validatorUtils.js";
import { WORK_ORDER_STATUS_CODES } from "../domain/workOrderLifecycle.js";
import {
  PARTS_PURCHASE_ACTION_STATUS_CODES,
  PARTS_REQUEST_STATUS_CODES,
} from "../domain/partsRequestLifecycle.js";
import {
  WORK_ORDER_PAYMENT_METHOD_CODES,
  WORK_ORDER_PAYMENT_TYPE_CODES,
} from "../domain/workOrderPayment.js";

function normalizeStatus(value, field, errors) {
  return normalizeEnum(value, field, errors, {
    allowedValues: WORK_ORDER_STATUS_CODES,
    enumMessage: `${field} must be one of: ${WORK_ORDER_STATUS_CODES.join(", ")}`,
  });
}

function normalizeNonNegativeInteger(value, field, errors) {
  return normalizeIntegerRange(value, field, errors, {
    min: 0,
    max: Number.MAX_SAFE_INTEGER,
    allowNull: false,
    integerMessage: `${field} must be an integer`,
    rangeMessage: `${field} must be >= 0`,
  });
}

function normalizePositiveInteger(value, field, errors) {
  return normalizeIntegerRange(value, field, errors, {
    min: 1,
    max: Number.MAX_SAFE_INTEGER,
    allowNull: false,
    integerMessage: `${field} must be an integer`,
    rangeMessage: `${field} must be > 0`,
  });
}

function normalizeOptionalBoolean(value, field, errors) {
  return normalizeBooleanField(value, field, errors, {
    strict: true,
    strictMessage: `${field} must be boolean-like (true/false/1/0)`,
  });
}

function normalizePartsRequestStatus(value, field, errors) {
  return normalizeEnum(value, field, errors, {
    allowedValues: PARTS_REQUEST_STATUS_CODES,
    enumMessage: `${field} must be one of: ${PARTS_REQUEST_STATUS_CODES.join(", ")}`,
  });
}

function normalizePartsPurchaseActionStatus(value, field, errors) {
  return normalizeEnum(value, field, errors, {
    allowedValues: PARTS_PURCHASE_ACTION_STATUS_CODES,
    enumMessage: `${field} must be one of: ${PARTS_PURCHASE_ACTION_STATUS_CODES.join(", ")}`,
  });
}

function normalizeWorkOrderPaymentType(value, field, errors) {
  return normalizeEnum(value, field, errors, {
    allowedValues: WORK_ORDER_PAYMENT_TYPE_CODES,
    enumMessage: `${field} must be one of: ${WORK_ORDER_PAYMENT_TYPE_CODES.join(", ")}`,
  });
}

function normalizeWorkOrderPaymentMethod(value, field, errors) {
  return normalizeEnum(value, field, errors, {
    allowedValues: WORK_ORDER_PAYMENT_METHOD_CODES,
    enumMessage: `${field} must be one of: ${WORK_ORDER_PAYMENT_METHOD_CODES.join(", ")}`,
  });
}

const WORK_ORDER_UPDATE_ALLOWED_FIELDS = [
  "status",
  "bayId",
  "primaryAssignee",
  "complaint",
  "findings",
  "internalNotes",
  "customerNotes",
  "balanceDueRub",
  "laborTotalRub",
  "outsideServiceCostRub",
  "reason",
  "changedBy",
];

const WORK_ORDER_UPDATE_MUTABLE_FIELDS = [
  "status",
  "bayId",
  "primaryAssignee",
  "complaint",
  "findings",
  "internalNotes",
  "customerNotes",
  "balanceDueRub",
  "laborTotalRub",
  "outsideServiceCostRub",
];

const PARTS_REQUEST_UPDATE_ALLOWED_FIELDS = [
  "status",
  "supplierName",
  "expectedArrivalDateLocal",
  "requestedQty",
  "requestedUnitCostRub",
  "salePriceRub",
  "isBlocking",
  "notes",
  "reason",
  "replacementPartName",
  "replacementRequestedQty",
  "replacementSupplierName",
  "changedBy",
];

const PARTS_REQUEST_UPDATE_MUTABLE_FIELDS = [
  "status",
  "supplierName",
  "expectedArrivalDateLocal",
  "requestedQty",
  "requestedUnitCostRub",
  "salePriceRub",
  "isBlocking",
  "notes",
  "replacementPartName",
  "replacementRequestedQty",
  "replacementSupplierName",
];

function appendUnknownFieldErrors(body, allowedFields, errors) {
  for (const field of collectUnknownFields(body, allowedFields)) {
    errors.push({ field, message: "unknown field" });
  }
}

function hasAnyOwnField(value, fields) {
  return fields.some((field) => Object.hasOwn(value, field));
}

export function validateListWorkOrdersQuery(query) {
  const errors = [];
  const pagination = normalizePaginationQuery(query, errors);

  const status = normalizeStatus(query.status, "status", errors) ?? null;
  const bayId = normalizeOptionalId(query.bayId, "bayId", errors) ?? null;
  const primaryAssignee = normalizeOptionalString(query.primaryAssignee, "primaryAssignee", errors) ?? null;
  const dateFromLocal = normalizeLocalDateQuery(query.dateFromLocal, "dateFromLocal", errors) ?? null;
  const dateToLocal = normalizeLocalDateQuery(query.dateToLocal, "dateToLocal", errors) ?? null;
  const search = normalizeSearchQuery(query.q, "q", errors);
  const includeClosedRaw = normalizeBooleanLike(query.includeClosed);
  if (query.includeClosed !== undefined && includeClosedRaw === null) {
    errors.push({ field: "includeClosed", message: "includeClosed must be boolean-like (true/false/1/0)" });
  }

  if (dateFromLocal && dateToLocal && dateFromLocal > dateToLocal) {
    errors.push({ field: "dateFromLocal", message: "dateFromLocal must be <= dateToLocal" });
  }

  finalizeUnknownQueryFields(query, [
    "status",
    "bayId",
    "primaryAssignee",
    "dateFromLocal",
    "dateToLocal",
    "q",
    "includeClosed",
    "limit",
    "offset",
  ], errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      status,
      bayId,
      primaryAssignee,
      dateFromLocal,
      dateToLocal,
      query: search,
      includeClosed: includeClosedRaw === null ? true : includeClosedRaw,
      limit: pagination.limit,
      offset: pagination.offset,
    },
  };
}

export function validateWorkOrderUpdate(body) {
  const errors = [];
  const value = {};

  const status = normalizeStatus(body.status, "status", errors);
  if (status !== undefined) {
    value.status = status;
  }

  const bayId = normalizeOptionalId(body.bayId, "bayId", errors);
  if (bayId !== undefined) {
    value.bayId = bayId;
  }

  const primaryAssignee = normalizeOptionalString(body.primaryAssignee, "primaryAssignee", errors);
  if (primaryAssignee !== undefined) {
    value.primaryAssignee = primaryAssignee;
  }

  const complaint = normalizeOptionalString(body.complaint, "complaint", errors);
  if (complaint !== undefined) {
    value.complaint = complaint;
  }

  const findings = normalizeOptionalString(body.findings, "findings", errors);
  if (findings !== undefined) {
    value.findings = findings;
  }

  const internalNotes = normalizeOptionalString(body.internalNotes, "internalNotes", errors);
  if (internalNotes !== undefined) {
    value.internalNotes = internalNotes;
  }

  const customerNotes = normalizeOptionalString(body.customerNotes, "customerNotes", errors);
  if (customerNotes !== undefined) {
    value.customerNotes = customerNotes;
  }

  const balanceDueRub = normalizeNonNegativeInteger(body.balanceDueRub, "balanceDueRub", errors);
  if (balanceDueRub !== undefined) {
    value.balanceDueRub = balanceDueRub;
  }

  const laborTotalRub = normalizeNonNegativeInteger(body.laborTotalRub, "laborTotalRub", errors);
  if (laborTotalRub !== undefined) {
    value.laborTotalRub = laborTotalRub;
  }

  const outsideServiceCostRub = normalizeNonNegativeInteger(body.outsideServiceCostRub, "outsideServiceCostRub", errors);
  if (outsideServiceCostRub !== undefined) {
    value.outsideServiceCostRub = outsideServiceCostRub;
  }

  const reason = normalizeOptionalString(body.reason, "reason", errors);
  if (reason !== undefined) {
    value.reason = reason;
  }

  const changedBy = normalizeOptionalString(body.changedBy, "changedBy", errors);
  if (changedBy !== undefined) {
    value.changedBy = changedBy;
  }

  appendUnknownFieldErrors(body, WORK_ORDER_UPDATE_ALLOWED_FIELDS, errors);
  const hasMutableField = hasAnyOwnField(value, WORK_ORDER_UPDATE_MUTABLE_FIELDS);

  if (!hasMutableField) {
    errors.push({ field: "body", message: "at least one updatable field is required" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value };
}

export function validateConvertAppointmentToWorkOrder(body) {
  const errors = [];
  const value = {};

  const reason = normalizeOptionalString(body.reason, "reason", errors);
  if (reason !== undefined) {
    value.reason = reason;
  }

  const changedBy = normalizeOptionalString(body.changedBy, "changedBy", errors);
  if (changedBy !== undefined) {
    value.changedBy = changedBy;
  }

  appendUnknownFieldErrors(body, ["reason", "changedBy"], errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value };
}

export function validateListPartsRequestsQuery(query) {
  const errors = [];
  const includeResolvedRaw = normalizeBooleanLike(query.includeResolved);
  if (query.includeResolved !== undefined && includeResolvedRaw === null) {
    errors.push({ field: "includeResolved", message: "includeResolved must be boolean-like (true/false/1/0)" });
  }

  finalizeUnknownQueryFields(query, ["includeResolved"], errors);

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      includeResolved: includeResolvedRaw === null ? true : includeResolvedRaw,
    },
  };
}

export function validateCreatePartsRequest(body) {
  const errors = [];
  const value = {};

  if (!isNonEmptyString(body.partName)) {
    errors.push({ field: "partName", message: "partName is required" });
  } else {
    value.partName = body.partName.trim();
  }

  const supplierName = normalizeOptionalString(body.supplierName, "supplierName", errors);
  if (supplierName !== undefined) {
    value.supplierName = supplierName;
  }

  const expectedArrivalDateLocal = normalizeOptionalString(body.expectedArrivalDateLocal, "expectedArrivalDateLocal", errors);
  if (expectedArrivalDateLocal !== undefined) {
    value.expectedArrivalDateLocal = expectedArrivalDateLocal;
  }

  const requestedQty = normalizePositiveInteger(body.requestedQty, "requestedQty", errors);
  if (requestedQty === undefined) {
    errors.push({ field: "requestedQty", message: "requestedQty is required and must be > 0" });
  } else {
    value.requestedQty = requestedQty;
  }

  const requestedUnitCostRub = normalizeNonNegativeInteger(body.requestedUnitCostRub, "requestedUnitCostRub", errors);
  if (requestedUnitCostRub !== undefined) {
    value.requestedUnitCostRub = requestedUnitCostRub;
  }

  const salePriceRub = normalizeNonNegativeInteger(body.salePriceRub, "salePriceRub", errors);
  if (salePriceRub !== undefined) {
    value.salePriceRub = salePriceRub;
  }

  const status = normalizePartsRequestStatus(body.status, "status", errors);
  if (status !== undefined) {
    value.status = status;
  }

  const isBlocking = normalizeOptionalBoolean(body.isBlocking, "isBlocking", errors);
  if (isBlocking !== undefined) {
    value.isBlocking = isBlocking;
  }

  const notes = normalizeOptionalString(body.notes, "notes", errors);
  if (notes !== undefined) {
    value.notes = notes;
  }

  const reason = normalizeOptionalString(body.reason, "reason", errors);
  if (reason !== undefined) {
    value.reason = reason;
  }

  const replacementForRequestId = normalizeOptionalString(body.replacementForRequestId, "replacementForRequestId", errors);
  if (replacementForRequestId !== undefined) {
    value.replacementForRequestId = replacementForRequestId;
  }

  const changedBy = normalizeOptionalString(body.changedBy, "changedBy", errors);
  if (changedBy !== undefined) {
    value.changedBy = changedBy;
  }

  const unknownFields = collectUnknownFields(body, [
    "partName",
    "supplierName",
    "expectedArrivalDateLocal",
    "requestedQty",
    "requestedUnitCostRub",
    "salePriceRub",
    "status",
    "isBlocking",
    "notes",
    "reason",
    "replacementForRequestId",
    "changedBy",
  ]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown field" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value };
}

export function validateUpdatePartsRequest(body) {
  const errors = [];
  const value = {};

  const status = normalizePartsRequestStatus(body.status, "status", errors);
  if (status !== undefined) {
    value.status = status;
  }

  const supplierName = normalizeOptionalString(body.supplierName, "supplierName", errors);
  if (supplierName !== undefined) {
    value.supplierName = supplierName;
  }

  const expectedArrivalDateLocal = normalizeOptionalString(body.expectedArrivalDateLocal, "expectedArrivalDateLocal", errors);
  if (expectedArrivalDateLocal !== undefined) {
    value.expectedArrivalDateLocal = expectedArrivalDateLocal;
  }

  const requestedQty = normalizePositiveInteger(body.requestedQty, "requestedQty", errors);
  if (requestedQty !== undefined) {
    value.requestedQty = requestedQty;
  }

  const requestedUnitCostRub = normalizeNonNegativeInteger(body.requestedUnitCostRub, "requestedUnitCostRub", errors);
  if (requestedUnitCostRub !== undefined) {
    value.requestedUnitCostRub = requestedUnitCostRub;
  }

  const salePriceRub = normalizeNonNegativeInteger(body.salePriceRub, "salePriceRub", errors);
  if (salePriceRub !== undefined) {
    value.salePriceRub = salePriceRub;
  }

  const isBlocking = normalizeOptionalBoolean(body.isBlocking, "isBlocking", errors);
  if (isBlocking !== undefined) {
    value.isBlocking = isBlocking;
  }

  const notes = normalizeOptionalString(body.notes, "notes", errors);
  if (notes !== undefined) {
    value.notes = notes;
  }

  const reason = normalizeOptionalString(body.reason, "reason", errors);
  if (reason !== undefined) {
    value.reason = reason;
  }

  const replacementPartName = normalizeOptionalString(body.replacementPartName, "replacementPartName", errors);
  if (replacementPartName !== undefined) {
    value.replacementPartName = replacementPartName;
  }

  const replacementRequestedQty = normalizePositiveInteger(body.replacementRequestedQty, "replacementRequestedQty", errors);
  if (replacementRequestedQty !== undefined) {
    value.replacementRequestedQty = replacementRequestedQty;
  }

  const replacementSupplierName = normalizeOptionalString(body.replacementSupplierName, "replacementSupplierName", errors);
  if (replacementSupplierName !== undefined) {
    value.replacementSupplierName = replacementSupplierName;
  }

  const changedBy = normalizeOptionalString(body.changedBy, "changedBy", errors);
  if (changedBy !== undefined) {
    value.changedBy = changedBy;
  }

  appendUnknownFieldErrors(body, PARTS_REQUEST_UPDATE_ALLOWED_FIELDS, errors);
  const hasMutableField = hasAnyOwnField(value, PARTS_REQUEST_UPDATE_MUTABLE_FIELDS);

  if (!hasMutableField) {
    errors.push({ field: "body", message: "at least one updatable field is required" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value };
}

export function validateCreatePartsPurchaseAction(body) {
  const errors = [];
  const value = {};

  const supplierName = normalizeOptionalString(body.supplierName, "supplierName", errors);
  if (supplierName !== undefined) {
    value.supplierName = supplierName;
  }

  const supplierReference = normalizeOptionalString(body.supplierReference, "supplierReference", errors);
  if (supplierReference !== undefined) {
    value.supplierReference = supplierReference;
  }

  const orderedQty = normalizePositiveInteger(body.orderedQty, "orderedQty", errors);
  if (orderedQty === undefined) {
    errors.push({ field: "orderedQty", message: "orderedQty is required and must be > 0" });
  } else {
    value.orderedQty = orderedQty;
  }

  const unitCostRub = normalizeNonNegativeInteger(body.unitCostRub, "unitCostRub", errors);
  if (unitCostRub === undefined) {
    errors.push({ field: "unitCostRub", message: "unitCostRub is required and must be >= 0" });
  } else {
    value.unitCostRub = unitCostRub;
  }

  const status = normalizePartsPurchaseActionStatus(body.status, "status", errors);
  value.status = status ?? "ordered";

  const notes = normalizeOptionalString(body.notes, "notes", errors);
  if (notes !== undefined) {
    value.notes = notes;
  }

  const reason = normalizeOptionalString(body.reason, "reason", errors);
  if (reason !== undefined) {
    value.reason = reason;
  }

  const changedBy = normalizeOptionalString(body.changedBy, "changedBy", errors);
  if (changedBy !== undefined) {
    value.changedBy = changedBy;
  }

  const unknownFields = collectUnknownFields(body, [
    "supplierName",
    "supplierReference",
    "orderedQty",
    "unitCostRub",
    "status",
    "notes",
    "reason",
    "changedBy",
  ]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown field" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value };
}

export function validateCreateWorkOrderPayment(body) {
  const errors = [];
  const value = {};

  const paymentType = normalizeWorkOrderPaymentType(body.paymentType, "paymentType", errors);
  if (paymentType === undefined) {
    errors.push({ field: "paymentType", message: "paymentType is required" });
  } else {
    value.paymentType = paymentType;
  }

  const paymentMethod = normalizeWorkOrderPaymentMethod(body.paymentMethod, "paymentMethod", errors);
  if (paymentMethod === undefined) {
    errors.push({ field: "paymentMethod", message: "paymentMethod is required" });
  } else {
    value.paymentMethod = paymentMethod;
  }

  const amountRub = normalizePositiveInteger(body.amountRub, "amountRub", errors);
  if (amountRub === undefined) {
    errors.push({ field: "amountRub", message: "amountRub is required and must be > 0" });
  } else {
    value.amountRub = amountRub;
  }

  const note = normalizeOptionalString(body.note, "note", errors);
  if (note !== undefined) {
    value.note = note;
  }

  const recordedAt = normalizeOptionalString(body.recordedAt, "recordedAt", errors);
  if (recordedAt !== undefined) {
    const parsed = new Date(recordedAt);
    if (Number.isNaN(parsed.getTime())) {
      errors.push({ field: "recordedAt", message: "recordedAt must be a valid ISO timestamp" });
    } else {
      value.recordedAt = recordedAt;
    }
  }

  const changedBy = normalizeOptionalString(body.changedBy, "changedBy", errors);
  if (changedBy !== undefined) {
    value.changedBy = changedBy;
  }

  const unknownFields = collectUnknownFields(body, [
    "paymentType",
    "paymentMethod",
    "amountRub",
    "note",
    "recordedAt",
    "changedBy",
  ]);
  for (const field of unknownFields) {
    errors.push({ field, message: "unknown field" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, value };
}

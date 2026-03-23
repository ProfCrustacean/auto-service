function asBoolean(value) {
  return Boolean(value);
}

export function mapEmployeeRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    roles: JSON.parse(row.rolesJson),
    isActive: asBoolean(row.isActive),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapBayRow(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    isActive: asBoolean(row.isActive),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapCustomerRecord(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    messagingHandle: row.messagingHandle,
    notes: row.notes,
    isActive: asBoolean(row.isActive),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapVehicleRecord(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    customerId: row.customerId,
    customerName: row.customerName,
    label: row.label,
    vin: row.vin,
    plateNumber: row.plateNumber,
    make: row.make,
    model: row.model,
    productionYear: row.productionYear,
    engineOrTrim: row.engineOrTrim,
    mileageKm: row.mileageKm,
    isActive: asBoolean(row.isActive),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapAppointmentRecord(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    code: row.code,
    plannedStartLocal: row.plannedStartLocal,
    customerId: row.customerId,
    customerName: row.customerName,
    vehicleId: row.vehicleId,
    vehicleLabel: row.vehicleLabel,
    complaint: row.complaint,
    status: row.status,
    bayId: row.bayId,
    bayName: row.bayName,
    primaryAssignee: row.primaryAssignee,
    source: row.source,
    expectedDurationMin: row.expectedDurationMin,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapIntakeEventRecord(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    source: row.source,
    sourceAppointmentId: row.sourceAppointmentId,
    customerId: row.customerId,
    vehicleId: row.vehicleId,
    complaint: row.complaint,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapWorkOrderRecord(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    code: row.code,
    customerId: row.customerId,
    customerName: row.customerName,
    vehicleId: row.vehicleId,
    vehicleLabel: row.vehicleLabel,
    status: row.status,
    statusLabelRu: row.statusLabelRu,
    bayId: row.bayId,
    bayName: row.bayName,
    primaryAssignee: row.primaryAssignee,
    complaint: row.complaint ?? null,
    findings: row.findings ?? null,
    internalNotes: row.internalNotes ?? null,
    customerNotes: row.customerNotes ?? null,
    blockedSinceIso: row.blockedSinceIso ?? null,
    balanceDueRub: row.balanceDueRub ?? 0,
    createdAt: row.createdAt,
    closedAt: row.closedAt ?? null,
    updatedAt: row.updatedAt,
  };
}

export function mapWorkOrderStatusHistoryRecord(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    workOrderId: row.workOrderId,
    fromStatus: row.fromStatus ?? null,
    fromStatusLabelRu: row.fromStatusLabelRu ?? null,
    toStatus: row.toStatus,
    toStatusLabelRu: row.toStatusLabelRu,
    changedAt: row.changedAt,
    changedBy: row.changedBy ?? null,
    reason: row.reason ?? null,
    source: row.source,
  };
}

export function mapWorkOrderPartsRequestRecord(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    workOrderId: row.workOrderId,
    replacementForRequestId: row.replacementForRequestId ?? null,
    partName: row.partName,
    supplierName: row.supplierName ?? null,
    expectedArrivalDateLocal: row.expectedArrivalDateLocal ?? null,
    requestedQty: row.requestedQty,
    requestedUnitCostRub: row.requestedUnitCostRub,
    salePriceRub: row.salePriceRub,
    status: row.status,
    statusLabelRu: row.statusLabelRu,
    isBlocking: asBoolean(row.isBlocking),
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    resolvedAt: row.resolvedAt ?? null,
    updatedAt: row.updatedAt,
    purchaseActionCount: row.purchaseActionCount ?? 0,
    openPurchaseActionCount: row.openPurchaseActionCount ?? 0,
  };
}

export function mapPartsPurchaseActionRecord(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    partsRequestId: row.partsRequestId,
    supplierName: row.supplierName ?? null,
    supplierReference: row.supplierReference ?? null,
    orderedQty: row.orderedQty,
    unitCostRub: row.unitCostRub,
    status: row.status,
    orderedAt: row.orderedAt,
    receivedAt: row.receivedAt ?? null,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapWorkOrderPartsHistoryRecord(row) {
  if (!row) {
    return null;
  }

  let details = null;
  if (typeof row.detailsJson === "string" && row.detailsJson.length > 0) {
    try {
      details = JSON.parse(row.detailsJson);
    } catch {
      details = null;
    }
  }

  return {
    id: row.id,
    workOrderId: row.workOrderId,
    partsRequestId: row.partsRequestId ?? null,
    purchaseActionId: row.purchaseActionId ?? null,
    fromStatus: row.fromStatus ?? null,
    fromStatusLabelRu: row.fromStatusLabelRu ?? null,
    toStatus: row.toStatus ?? null,
    toStatusLabelRu: row.toStatusLabelRu ?? null,
    changedAt: row.changedAt,
    changedBy: row.changedBy ?? null,
    reason: row.reason ?? null,
    source: row.source,
    details,
  };
}

export function mapVehicleOwnershipHistoryRow(row) {
  return {
    id: row.id,
    vehicleId: row.vehicleId,
    customerId: row.customerId,
    customerName: row.customerName,
    changedAt: row.changedAt,
    changeReason: row.changeReason,
    source: row.source,
  };
}

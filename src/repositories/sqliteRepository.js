import { randomUUID } from "node:crypto";

function asBoolean(value) {
  return Boolean(value);
}

function mapEmployeeRow(row) {
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

function mapBayRow(row) {
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

function mapCustomerRecord(row) {
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

function mapVehicleRecord(row) {
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

function mapAppointmentRecord(row) {
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

function mapIntakeEventRecord(row) {
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

function mapWorkOrderRecord(row) {
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

function mapWorkOrderStatusHistoryRecord(row) {
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

function mapWorkOrderPartsRequestRecord(row) {
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

function mapPartsPurchaseActionRecord(row) {
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

function mapWorkOrderPartsHistoryRecord(row) {
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

export class SqliteRepository {
  constructor(database) {
    this.database = database;
    this.transactionDepth = 0;
    this.transactionCounter = 0;
  }

  runInTransaction(work, { immediate = false } = {}) {
    const useSavepoint = this.transactionDepth > 0;
    const savepointName = `sp_${this.transactionCounter += 1}`;

    try {
      if (useSavepoint) {
        this.database.exec(`SAVEPOINT ${savepointName};`);
      } else {
        this.database.exec(immediate ? "BEGIN IMMEDIATE TRANSACTION;" : "BEGIN TRANSACTION;");
      }

      this.transactionDepth += 1;
      const result = work();
      this.transactionDepth -= 1;

      if (useSavepoint) {
        this.database.exec(`RELEASE SAVEPOINT ${savepointName};`);
      } else {
        this.database.exec("COMMIT;");
      }

      return result;
    } catch (error) {
      if (this.transactionDepth > 0) {
        this.transactionDepth -= 1;
      }

      try {
        if (useSavepoint) {
          this.database.exec(`ROLLBACK TO SAVEPOINT ${savepointName};`);
          this.database.exec(`RELEASE SAVEPOINT ${savepointName};`);
        } else {
          this.database.exec("ROLLBACK;");
        }
      } catch {
        // If transaction rollback fails, propagate original error.
      }

      throw error;
    }
  }

  reserveSequenceValue(entity) {
    return this.runInTransaction(() => {
      const row = this.database
        .prepare(
          `SELECT next_value AS nextValue
           FROM code_sequences
           WHERE entity = ?`,
        )
        .get(entity);

      if (!row || !Number.isInteger(row.nextValue)) {
        throw new Error(`Code sequence is not configured for entity '${entity}'`);
      }

      this.database
        .prepare(
          `UPDATE code_sequences
           SET next_value = next_value + 1
           WHERE entity = ?`,
        )
        .run(entity);
      return row.nextValue;
    }, { immediate: true });
  }

  allocateNextAppointmentCode() {
    const value = this.reserveSequenceValue("appointment");
    return `APT-${String(value).padStart(3, "0")}`;
  }

  allocateNextWorkOrderCode() {
    const value = this.reserveSequenceValue("work_order");
    return `WO-${String(value).padStart(4, "0")}`;
  }

  getServiceMeta() {
    const service = this.database
      .prepare(
        `SELECT id, display_name_ru AS displayNameRu, city_ru AS cityRu
         FROM service_meta
         LIMIT 1`,
      )
      .get();

    if (!service) {
      throw new Error("Service metadata is missing");
    }

    const bays = this.database
      .prepare(
        `SELECT id, name
         FROM bays
         WHERE is_active = 1
         ORDER BY name ASC`,
      )
      .all();

    return {
      ...service,
      bays,
    };
  }

  listAppointments() {
    return this.database
      .prepare(
        `SELECT
          a.id,
          a.code,
          a.planned_start_local AS plannedStartLocal,
          a.customer_id AS customerId,
          a.customer_name_snapshot AS customerName,
          a.vehicle_id AS vehicleId,
          a.vehicle_label_snapshot AS vehicleLabel,
          a.complaint,
          a.status,
          a.bay_id AS bayId,
          COALESCE(a.bay_name_snapshot, b.name, 'Без поста') AS bayName,
          COALESCE(a.primary_assignee, 'Без ответственного') AS primaryAssignee,
          a.source,
          a.expected_duration_min AS expectedDurationMin,
          a.notes,
          a.created_at AS createdAt,
          a.updated_at AS updatedAt
         FROM appointments a
         LEFT JOIN bays b ON b.id = a.bay_id
         ORDER BY a.planned_start_local ASC, a.code ASC`,
      )
      .all()
      .map(mapAppointmentRecord);
  }

  listAppointmentRecords({
    status = null,
    customerId = null,
    vehicleId = null,
    bayId = null,
    query = "",
    limit = null,
    offset = 0,
  } = {}) {
    const conditions = [];
    const values = [];

    if (status) {
      conditions.push("a.status = ?");
      values.push(status);
    }

    if (customerId) {
      conditions.push("a.customer_id = ?");
      values.push(customerId);
    }

    if (vehicleId) {
      conditions.push("a.vehicle_id = ?");
      values.push(vehicleId);
    }

    if (bayId) {
      conditions.push("a.bay_id = ?");
      values.push(bayId);
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length > 0) {
      const pattern = `%${trimmedQuery}%`;
      conditions.push(
        "(a.code LIKE ? OR a.customer_name_snapshot LIKE ? OR a.vehicle_label_snapshot LIKE ? OR a.complaint LIKE ? OR COALESCE(a.primary_assignee, '') LIKE ?)",
      );
      values.push(pattern, pattern, pattern, pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const hasLimit = Number.isInteger(limit);
    const hasOffsetOnly = !hasLimit && Number.isInteger(offset) && offset > 0;
    const paginationClause = hasLimit
      ? " LIMIT ? OFFSET ?"
      : hasOffsetOnly
        ? " LIMIT -1 OFFSET ?"
        : "";
    const paginationValues = hasLimit
      ? [limit, offset]
      : hasOffsetOnly
        ? [offset]
        : [];

    return this.database
      .prepare(
        `SELECT
          a.id,
          a.code,
          a.planned_start_local AS plannedStartLocal,
          a.customer_id AS customerId,
          a.customer_name_snapshot AS customerName,
          a.vehicle_id AS vehicleId,
          a.vehicle_label_snapshot AS vehicleLabel,
          a.complaint,
          a.status,
          a.bay_id AS bayId,
          COALESCE(a.bay_name_snapshot, b.name) AS bayName,
          a.primary_assignee AS primaryAssignee,
          a.source,
          a.expected_duration_min AS expectedDurationMin,
          a.notes,
          a.created_at AS createdAt,
         a.updated_at AS updatedAt
         FROM appointments a
         LEFT JOIN bays b ON b.id = a.bay_id
         ${whereClause}
         ORDER BY a.planned_start_local ASC, a.code ASC${paginationClause}`,
      )
      .all(...values, ...paginationValues)
      .map(mapAppointmentRecord);
  }

  searchAppointmentRecords({ query, limit }) {
    const trimmedQuery = query.trim();
    const pattern = `%${trimmedQuery}%`;

    const total = this.database
      .prepare(
        `SELECT COUNT(1) AS count
         FROM appointments a
         WHERE (
           a.code LIKE ?
           OR a.planned_start_local LIKE ?
           OR a.customer_name_snapshot LIKE ?
           OR a.vehicle_label_snapshot LIKE ?
           OR a.complaint LIKE ?
           OR COALESCE(a.primary_assignee, '') LIKE ?
         )`,
      )
      .get(pattern, pattern, pattern, pattern, pattern, pattern)
      .count;

    const rows = this.database
      .prepare(
        `SELECT
          a.id,
          a.code,
          a.planned_start_local AS plannedStartLocal,
          a.customer_name_snapshot AS customerName,
          a.vehicle_label_snapshot AS vehicleLabel
         FROM appointments a
         WHERE (
           a.code LIKE ?
           OR a.planned_start_local LIKE ?
           OR a.customer_name_snapshot LIKE ?
           OR a.vehicle_label_snapshot LIKE ?
           OR a.complaint LIKE ?
           OR COALESCE(a.primary_assignee, '') LIKE ?
         )
         ORDER BY a.planned_start_local ASC, a.code ASC
         LIMIT ?`,
      )
      .all(pattern, pattern, pattern, pattern, pattern, pattern, limit);

    return { total, rows };
  }

  getAppointmentRecordById(id) {
    const row = this.database
      .prepare(
        `SELECT
          a.id,
          a.code,
          a.planned_start_local AS plannedStartLocal,
          a.customer_id AS customerId,
          a.customer_name_snapshot AS customerName,
          a.vehicle_id AS vehicleId,
          a.vehicle_label_snapshot AS vehicleLabel,
          a.complaint,
          a.status,
          a.bay_id AS bayId,
          COALESCE(a.bay_name_snapshot, b.name) AS bayName,
          a.primary_assignee AS primaryAssignee,
          a.source,
          a.expected_duration_min AS expectedDurationMin,
          a.notes,
          a.created_at AS createdAt,
          a.updated_at AS updatedAt
         FROM appointments a
         LEFT JOIN bays b ON b.id = a.bay_id
         WHERE a.id = ?`,
      )
      .get(id);

    return mapAppointmentRecord(row);
  }

  createAppointment({
    id,
    code,
    plannedStartLocal,
    customerId,
    vehicleId,
    customerNameSnapshot,
    vehicleLabelSnapshot,
    complaint,
    status,
    bayId,
    bayNameSnapshot,
    primaryAssignee,
    source,
    expectedDurationMin,
    notes,
  }) {
    const nowIso = new Date().toISOString();

    this.database
      .prepare(
        `INSERT INTO appointments(
          id,
          code,
          planned_start_local,
          customer_id,
          vehicle_id,
          customer_name_snapshot,
          vehicle_label_snapshot,
          complaint,
          status,
          bay_id,
          bay_name_snapshot,
          primary_assignee,
          source,
          expected_duration_min,
          notes,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        code,
        plannedStartLocal,
        customerId,
        vehicleId,
        customerNameSnapshot,
        vehicleLabelSnapshot,
        complaint,
        status,
        bayId,
        bayNameSnapshot,
        primaryAssignee,
        source,
        expectedDurationMin,
        notes,
        nowIso,
        nowIso,
      );

    return this.getAppointmentRecordById(id);
  }

  updateAppointmentById(id, updates) {
    const existing = this.getAppointmentRecordById(id);
    if (!existing) {
      return null;
    }

    const assignments = [];
    const values = [];

    if (updates.plannedStartLocal !== undefined) {
      assignments.push("planned_start_local = ?");
      values.push(updates.plannedStartLocal);
    }

    if (updates.customerId !== undefined) {
      assignments.push("customer_id = ?");
      values.push(updates.customerId);
    }

    if (updates.vehicleId !== undefined) {
      assignments.push("vehicle_id = ?");
      values.push(updates.vehicleId);
    }

    if (updates.customerNameSnapshot !== undefined) {
      assignments.push("customer_name_snapshot = ?");
      values.push(updates.customerNameSnapshot);
    }

    if (updates.vehicleLabelSnapshot !== undefined) {
      assignments.push("vehicle_label_snapshot = ?");
      values.push(updates.vehicleLabelSnapshot);
    }

    if (updates.complaint !== undefined) {
      assignments.push("complaint = ?");
      values.push(updates.complaint);
    }

    if (updates.status !== undefined) {
      assignments.push("status = ?");
      values.push(updates.status);
    }

    if (updates.bayId !== undefined) {
      assignments.push("bay_id = ?");
      values.push(updates.bayId);
    }

    if (updates.bayNameSnapshot !== undefined) {
      assignments.push("bay_name_snapshot = ?");
      values.push(updates.bayNameSnapshot);
    }

    if (updates.primaryAssignee !== undefined) {
      assignments.push("primary_assignee = ?");
      values.push(updates.primaryAssignee);
    }

    if (updates.source !== undefined) {
      assignments.push("source = ?");
      values.push(updates.source);
    }

    if (updates.expectedDurationMin !== undefined) {
      assignments.push("expected_duration_min = ?");
      values.push(updates.expectedDurationMin);
    }

    if (updates.notes !== undefined) {
      assignments.push("notes = ?");
      values.push(updates.notes);
    }

    if (assignments.length === 0) {
      return existing;
    }

    assignments.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    this.database
      .prepare(`UPDATE appointments SET ${assignments.join(", ")} WHERE id = ?`)
      .run(...values);

    return this.getAppointmentRecordById(id);
  }

  listSlotBlockingAppointments({ plannedStartLocal, excludeAppointmentId = null }) {
    if (excludeAppointmentId) {
      return this.database
        .prepare(
          `SELECT
            id,
            code,
            bay_id AS bayId,
            primary_assignee AS primaryAssignee,
            status
           FROM appointments
           WHERE planned_start_local = ?
             AND status IN ('booked', 'confirmed', 'arrived')
             AND id != ?
           ORDER BY code ASC`,
        )
        .all(plannedStartLocal, excludeAppointmentId);
    }

    return this.database
      .prepare(
        `SELECT
          id,
          code,
          bay_id AS bayId,
          primary_assignee AS primaryAssignee,
          status
         FROM appointments
         WHERE planned_start_local = ?
           AND status IN ('booked', 'confirmed', 'arrived')
         ORDER BY code ASC`,
      )
      .all(plannedStartLocal);
  }

  listWorkOrders() {
    return this.listWorkOrderRecords({
      includeClosed: true,
      limit: null,
      offset: 0,
    });
  }

  listWorkOrderRecords({
    status = null,
    bayId = null,
    primaryAssignee = null,
    query = "",
    includeClosed = true,
    limit = null,
    offset = 0,
  } = {}) {
    const conditions = [];
    const values = [];

    if (status) {
      conditions.push("w.status = ?");
      values.push(status);
    }

    if (bayId) {
      conditions.push("w.bay_id = ?");
      values.push(bayId);
    }

    if (primaryAssignee) {
      conditions.push("w.primary_assignee = ?");
      values.push(primaryAssignee);
    }

    if (!includeClosed) {
      conditions.push("w.status NOT IN ('completed', 'cancelled')");
    }

    const trimmedQuery = String(query ?? "").trim();
    if (trimmedQuery.length > 0) {
      const pattern = `%${trimmedQuery}%`;
      conditions.push(
        "(w.code LIKE ? OR w.customer_name_snapshot LIKE ? OR w.vehicle_label_snapshot LIKE ? OR w.status_label_ru LIKE ? OR COALESCE(w.primary_assignee, '') LIKE ?)",
      );
      values.push(pattern, pattern, pattern, pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const hasLimit = Number.isInteger(limit);
    const hasOffsetOnly = !hasLimit && Number.isInteger(offset) && offset > 0;
    const paginationClause = hasLimit
      ? " LIMIT ? OFFSET ?"
      : hasOffsetOnly
        ? " LIMIT -1 OFFSET ?"
        : "";
    const paginationValues = hasLimit
      ? [limit, offset]
      : hasOffsetOnly
        ? [offset]
        : [];

    return this.database
      .prepare(
        `SELECT
          w.id,
          w.code,
          w.customer_id AS customerId,
          w.customer_name_snapshot AS customerName,
          w.vehicle_id AS vehicleId,
          w.vehicle_label_snapshot AS vehicleLabel,
          w.status,
          w.status_label_ru AS statusLabelRu,
          w.bay_id AS bayId,
          COALESCE(w.bay_name_snapshot, b.name, 'Без поста') AS bayName,
          COALESCE(w.primary_assignee, 'Без ответственного') AS primaryAssignee,
          w.complaint,
          w.findings,
          w.internal_notes AS internalNotes,
          w.customer_notes AS customerNotes,
          w.blocked_since_iso AS blockedSinceIso,
          w.balance_due_rub AS balanceDueRub,
          w.created_at AS createdAt,
          w.closed_at AS closedAt,
          w.updated_at AS updatedAt
         FROM work_orders w
         LEFT JOIN bays b ON b.id = w.bay_id
         ${whereClause}
         ORDER BY w.code ASC${paginationClause}`,
      )
      .all(...values, ...paginationValues)
      .map(mapWorkOrderRecord);
  }

  searchWorkOrders({ query, limit }) {
    const trimmedQuery = query.trim();
    const pattern = `%${trimmedQuery}%`;

    const total = this.database
      .prepare(
        `SELECT COUNT(1) AS count
         FROM work_orders w
         WHERE (
           w.code LIKE ?
           OR w.customer_name_snapshot LIKE ?
           OR w.vehicle_label_snapshot LIKE ?
           OR w.status_label_ru LIKE ?
           OR COALESCE(w.primary_assignee, '') LIKE ?
         )`,
      )
      .get(pattern, pattern, pattern, pattern, pattern)
      .count;

    const rows = this.database
      .prepare(
        `SELECT
          w.id,
          w.code,
          w.customer_name_snapshot AS customerName,
          w.vehicle_label_snapshot AS vehicleLabel,
          w.status_label_ru AS statusLabelRu
         FROM work_orders w
         WHERE (
           w.code LIKE ?
           OR w.customer_name_snapshot LIKE ?
           OR w.vehicle_label_snapshot LIKE ?
           OR w.status_label_ru LIKE ?
           OR COALESCE(w.primary_assignee, '') LIKE ?
         )
         ORDER BY w.code ASC
         LIMIT ?`,
      )
      .all(pattern, pattern, pattern, pattern, pattern, limit);

    return { total, rows };
  }

  getWorkOrderById(id) {
    return this.getWorkOrderRecordById(id);
  }

  getWorkOrderRecordById(id) {
    const row = this.database
      .prepare(
        `SELECT
          w.id,
          w.code,
          w.customer_id AS customerId,
          w.customer_name_snapshot AS customerName,
          w.vehicle_id AS vehicleId,
          w.vehicle_label_snapshot AS vehicleLabel,
          w.status,
          w.status_label_ru AS statusLabelRu,
          w.bay_id AS bayId,
          COALESCE(w.bay_name_snapshot, b.name, 'Без поста') AS bayName,
          COALESCE(w.primary_assignee, 'Без ответственного') AS primaryAssignee,
          w.complaint,
          w.findings,
          w.internal_notes AS internalNotes,
          w.customer_notes AS customerNotes,
          w.balance_due_rub AS balanceDueRub,
          w.blocked_since_iso AS blockedSinceIso,
          w.created_at AS createdAt,
          w.closed_at AS closedAt,
          w.updated_at AS updatedAt
         FROM work_orders w
         LEFT JOIN bays b ON b.id = w.bay_id
         WHERE w.id = ?`,
      )
      .get(id);

    return mapWorkOrderRecord(row);
  }

  listWorkOrderStatusHistory(workOrderId) {
    return this.database
      .prepare(
        `SELECT
          id,
          work_order_id AS workOrderId,
          from_status AS fromStatus,
          from_status_label_ru AS fromStatusLabelRu,
          to_status AS toStatus,
          to_status_label_ru AS toStatusLabelRu,
          changed_at AS changedAt,
          changed_by AS changedBy,
          reason,
          source
         FROM work_order_status_history
         WHERE work_order_id = ?
         ORDER BY changed_at DESC, id DESC`,
      )
      .all(workOrderId)
      .map(mapWorkOrderStatusHistoryRecord);
  }

  listWorkOrderPartsRequests(workOrderId, { includeResolved = true } = {}) {
    const conditions = ["r.work_order_id = ?"];
    const values = [workOrderId];

    if (!includeResolved) {
      conditions.push("r.status IN ('requested', 'ordered')");
    }

    return this.database
      .prepare(
        `SELECT
          r.id,
          r.work_order_id AS workOrderId,
          r.replacement_for_request_id AS replacementForRequestId,
          r.part_name AS partName,
          r.supplier_name AS supplierName,
          r.expected_arrival_date_local AS expectedArrivalDateLocal,
          r.requested_qty AS requestedQty,
          r.requested_unit_cost_rub AS requestedUnitCostRub,
          r.sale_price_rub AS salePriceRub,
          r.status,
          r.status_label_ru AS statusLabelRu,
          r.is_blocking AS isBlocking,
          r.notes,
          r.created_at AS createdAt,
          r.resolved_at AS resolvedAt,
          r.updated_at AS updatedAt,
          (
            SELECT COUNT(1)
            FROM parts_purchase_actions p
            WHERE p.parts_request_id = r.id
          ) AS purchaseActionCount,
          (
            SELECT COUNT(1)
            FROM parts_purchase_actions p
            WHERE p.parts_request_id = r.id
              AND p.status = 'ordered'
          ) AS openPurchaseActionCount
         FROM work_order_parts_requests r
         WHERE ${conditions.join(" AND ")}
         ORDER BY r.created_at DESC, r.id DESC`,
      )
      .all(...values)
      .map(mapWorkOrderPartsRequestRecord);
  }

  getWorkOrderPartsRequestById(workOrderId, requestId) {
    const row = this.database
      .prepare(
        `SELECT
          r.id,
          r.work_order_id AS workOrderId,
          r.replacement_for_request_id AS replacementForRequestId,
          r.part_name AS partName,
          r.supplier_name AS supplierName,
          r.expected_arrival_date_local AS expectedArrivalDateLocal,
          r.requested_qty AS requestedQty,
          r.requested_unit_cost_rub AS requestedUnitCostRub,
          r.sale_price_rub AS salePriceRub,
          r.status,
          r.status_label_ru AS statusLabelRu,
          r.is_blocking AS isBlocking,
          r.notes,
          r.created_at AS createdAt,
          r.resolved_at AS resolvedAt,
          r.updated_at AS updatedAt,
          (
            SELECT COUNT(1)
            FROM parts_purchase_actions p
            WHERE p.parts_request_id = r.id
          ) AS purchaseActionCount,
          (
            SELECT COUNT(1)
            FROM parts_purchase_actions p
            WHERE p.parts_request_id = r.id
              AND p.status = 'ordered'
          ) AS openPurchaseActionCount
         FROM work_order_parts_requests r
         WHERE r.work_order_id = ?
           AND r.id = ?`,
      )
      .get(workOrderId, requestId);

    return mapWorkOrderPartsRequestRecord(row);
  }

  listPartsPurchaseActions(partsRequestId) {
    return this.database
      .prepare(
        `SELECT
          id,
          parts_request_id AS partsRequestId,
          supplier_name AS supplierName,
          supplier_reference AS supplierReference,
          ordered_qty AS orderedQty,
          unit_cost_rub AS unitCostRub,
          status,
          ordered_at AS orderedAt,
          received_at AS receivedAt,
          notes,
          created_at AS createdAt,
          updated_at AS updatedAt
         FROM parts_purchase_actions
         WHERE parts_request_id = ?
         ORDER BY created_at DESC, id DESC`,
      )
      .all(partsRequestId)
      .map(mapPartsPurchaseActionRecord);
  }

  listWorkOrderPartsHistory(workOrderId) {
    return this.database
      .prepare(
        `SELECT
          id,
          work_order_id AS workOrderId,
          parts_request_id AS partsRequestId,
          purchase_action_id AS purchaseActionId,
          from_status AS fromStatus,
          from_status_label_ru AS fromStatusLabelRu,
          to_status AS toStatus,
          to_status_label_ru AS toStatusLabelRu,
          changed_at AS changedAt,
          changed_by AS changedBy,
          reason,
          source,
          details_json AS detailsJson
         FROM work_order_parts_history
         WHERE work_order_id = ?
         ORDER BY changed_at DESC, id DESC`,
      )
      .all(workOrderId)
      .map(mapWorkOrderPartsHistoryRecord);
  }

  createWorkOrderPartsHistoryEntry({
    id,
    workOrderId,
    partsRequestId = null,
    purchaseActionId = null,
    fromStatus = null,
    fromStatusLabelRu = null,
    toStatus = null,
    toStatusLabelRu = null,
    changedAt,
    changedBy = null,
    reason = null,
    source,
    details = null,
  }) {
    this.database
      .prepare(
        `INSERT INTO work_order_parts_history(
          id,
          work_order_id,
          parts_request_id,
          purchase_action_id,
          from_status,
          from_status_label_ru,
          to_status,
          to_status_label_ru,
          changed_at,
          changed_by,
          reason,
          source,
          details_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        workOrderId,
        partsRequestId,
        purchaseActionId,
        fromStatus,
        fromStatusLabelRu,
        toStatus,
        toStatusLabelRu,
        changedAt,
        changedBy,
        reason,
        source,
        details ? JSON.stringify(details) : null,
      );
  }

  hasOpenBlockingPartsRequests(workOrderId) {
    const row = this.database
      .prepare(
        `SELECT COUNT(1) AS count
         FROM work_order_parts_requests
         WHERE work_order_id = ?
           AND is_blocking = 1
           AND status IN ('requested', 'ordered')`,
      )
      .get(workOrderId);
    return (row?.count ?? 0) > 0;
  }

  listBlockingPartsRequestAgingByWorkOrderIds(workOrderIds) {
    if (!Array.isArray(workOrderIds) || workOrderIds.length === 0) {
      return new Map();
    }

    const placeholders = workOrderIds.map(() => "?").join(", ");
    const rows = this.database
      .prepare(
        `SELECT
          work_order_id AS workOrderId,
          COUNT(1) AS pendingCount,
          MIN(created_at) AS oldestRequestedAt
         FROM work_order_parts_requests
         WHERE work_order_id IN (${placeholders})
           AND is_blocking = 1
           AND status IN ('requested', 'ordered')
         GROUP BY work_order_id`,
      )
      .all(...workOrderIds);

    const result = new Map();
    for (const row of rows) {
      result.set(row.workOrderId, {
        pendingCount: row.pendingCount ?? 0,
        oldestRequestedAt: row.oldestRequestedAt ?? null,
      });
    }
    return result;
  }

  createWorkOrderPartsRequest({
    id,
    workOrderId,
    replacementForRequestId = null,
    partName,
    supplierName = null,
    expectedArrivalDateLocal = null,
    requestedQty,
    requestedUnitCostRub = 0,
    salePriceRub = 0,
    status,
    statusLabelRu,
    isBlocking = true,
    notes = null,
    changedBy = null,
    reason = null,
    source = "parts_request_create",
  }) {
    const nowIso = new Date().toISOString();
    const resolvedAt = status === "requested" || status === "ordered" ? null : nowIso;

    this.runInTransaction(() => {
      this.database
        .prepare(
          `INSERT INTO work_order_parts_requests(
            id,
            work_order_id,
            replacement_for_request_id,
            part_name,
            supplier_name,
            expected_arrival_date_local,
            requested_qty,
            requested_unit_cost_rub,
            sale_price_rub,
            status,
            status_label_ru,
            is_blocking,
            notes,
            created_at,
            resolved_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          workOrderId,
          replacementForRequestId,
          partName,
          supplierName,
          expectedArrivalDateLocal,
          requestedQty,
          requestedUnitCostRub,
          salePriceRub,
          status,
          statusLabelRu,
          isBlocking ? 1 : 0,
          notes,
          nowIso,
          resolvedAt,
          nowIso,
        );

      this.createWorkOrderPartsHistoryEntry({
        id: `woph-${randomUUID().split("-")[0]}`,
        workOrderId,
        partsRequestId: id,
        fromStatus: null,
        fromStatusLabelRu: null,
        toStatus: status,
        toStatusLabelRu: statusLabelRu,
        changedAt: nowIso,
        changedBy,
        reason,
        source,
        details: {
          partName,
          requestedQty,
          requestedUnitCostRub,
          salePriceRub,
          isBlocking: Boolean(isBlocking),
        },
      });
    });

    return this.getWorkOrderPartsRequestById(workOrderId, id);
  }

  updateWorkOrderPartsRequest({ workOrderId, requestId, updates, historyEntry = null }) {
    const existing = this.getWorkOrderPartsRequestById(workOrderId, requestId);
    if (!existing) {
      return null;
    }

    const nowIso = new Date().toISOString();
    const assignments = [];
    const values = [];

    if (updates.partName !== undefined) {
      assignments.push("part_name = ?");
      values.push(updates.partName);
    }

    if (updates.supplierName !== undefined) {
      assignments.push("supplier_name = ?");
      values.push(updates.supplierName);
    }

    if (updates.expectedArrivalDateLocal !== undefined) {
      assignments.push("expected_arrival_date_local = ?");
      values.push(updates.expectedArrivalDateLocal);
    }

    if (updates.requestedQty !== undefined) {
      assignments.push("requested_qty = ?");
      values.push(updates.requestedQty);
    }

    if (updates.requestedUnitCostRub !== undefined) {
      assignments.push("requested_unit_cost_rub = ?");
      values.push(updates.requestedUnitCostRub);
    }

    if (updates.salePriceRub !== undefined) {
      assignments.push("sale_price_rub = ?");
      values.push(updates.salePriceRub);
    }

    if (updates.status !== undefined) {
      assignments.push("status = ?");
      values.push(updates.status);
    }

    if (updates.statusLabelRu !== undefined) {
      assignments.push("status_label_ru = ?");
      values.push(updates.statusLabelRu);
    }

    if (updates.isBlocking !== undefined) {
      assignments.push("is_blocking = ?");
      values.push(updates.isBlocking ? 1 : 0);
    }

    if (updates.notes !== undefined) {
      assignments.push("notes = ?");
      values.push(updates.notes);
    }

    if (updates.resolvedAt !== undefined) {
      assignments.push("resolved_at = ?");
      values.push(updates.resolvedAt);
    }

    if (assignments.length > 0) {
      assignments.push("updated_at = ?");
      values.push(nowIso);
      values.push(requestId, workOrderId);
    }

    this.runInTransaction(() => {
      if (assignments.length > 0) {
        this.database
          .prepare(
            `UPDATE work_order_parts_requests
             SET ${assignments.join(", ")}
             WHERE id = ?
               AND work_order_id = ?`,
          )
          .run(...values);
      }

      if (historyEntry) {
        this.createWorkOrderPartsHistoryEntry({
          id: `woph-${randomUUID().split("-")[0]}`,
          workOrderId,
          partsRequestId: requestId,
          fromStatus: historyEntry.fromStatus ?? null,
          fromStatusLabelRu: historyEntry.fromStatusLabelRu ?? null,
          toStatus: historyEntry.toStatus ?? null,
          toStatusLabelRu: historyEntry.toStatusLabelRu ?? null,
          changedAt: nowIso,
          changedBy: historyEntry.changedBy ?? null,
          reason: historyEntry.reason ?? null,
          source: historyEntry.source ?? "parts_request_update",
          details: historyEntry.details ?? null,
        });
      }
    });

    return this.getWorkOrderPartsRequestById(workOrderId, requestId);
  }

  createPartsPurchaseAction({
    id,
    workOrderId,
    partsRequestId,
    supplierName = null,
    supplierReference = null,
    orderedQty,
    unitCostRub,
    status,
    orderedAt = null,
    receivedAt = null,
    notes = null,
    historyEntry = null,
  }) {
    const nowIso = new Date().toISOString();
    const effectiveOrderedAt = orderedAt ?? nowIso;
    const effectiveReceivedAt = receivedAt ?? null;

    this.runInTransaction(() => {
      this.database
        .prepare(
          `INSERT INTO parts_purchase_actions(
            id,
            parts_request_id,
            supplier_name,
            supplier_reference,
            ordered_qty,
            unit_cost_rub,
            status,
            ordered_at,
            received_at,
            notes,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          partsRequestId,
          supplierName,
          supplierReference,
          orderedQty,
          unitCostRub,
          status,
          effectiveOrderedAt,
          effectiveReceivedAt,
          notes,
          nowIso,
          nowIso,
        );

      if (historyEntry) {
        this.createWorkOrderPartsHistoryEntry({
          id: `woph-${randomUUID().split("-")[0]}`,
          workOrderId,
          partsRequestId,
          purchaseActionId: id,
          fromStatus: historyEntry.fromStatus ?? null,
          fromStatusLabelRu: historyEntry.fromStatusLabelRu ?? null,
          toStatus: historyEntry.toStatus ?? null,
          toStatusLabelRu: historyEntry.toStatusLabelRu ?? null,
          changedAt: nowIso,
          changedBy: historyEntry.changedBy ?? null,
          reason: historyEntry.reason ?? null,
          source: historyEntry.source ?? "parts_purchase_action_create",
          details: historyEntry.details ?? null,
        });
      }
    });

    const purchaseAction = this.database
      .prepare(
        `SELECT
          id,
          parts_request_id AS partsRequestId,
          supplier_name AS supplierName,
          supplier_reference AS supplierReference,
          ordered_qty AS orderedQty,
          unit_cost_rub AS unitCostRub,
          status,
          ordered_at AS orderedAt,
          received_at AS receivedAt,
          notes,
          created_at AS createdAt,
          updated_at AS updatedAt
         FROM parts_purchase_actions
         WHERE id = ?`,
      )
      .get(id);

    return mapPartsPurchaseActionRecord(purchaseAction);
  }

  createWorkOrderStatusHistoryEntry({
    id,
    workOrderId,
    fromStatus,
    fromStatusLabelRu,
    toStatus,
    toStatusLabelRu,
    changedAt,
    changedBy = null,
    reason = null,
    source,
  }) {
    this.database
      .prepare(
        `INSERT INTO work_order_status_history(
          id,
          work_order_id,
          from_status,
          from_status_label_ru,
          to_status,
          to_status_label_ru,
          changed_at,
          changed_by,
          reason,
          source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        workOrderId,
        fromStatus ?? null,
        fromStatusLabelRu ?? null,
        toStatus,
        toStatusLabelRu,
        changedAt,
        changedBy ?? null,
        reason ?? null,
        source,
      );
  }

  updateWorkOrderRecord({ id, updates, transitionEntry = null }) {
    const existing = this.getWorkOrderRecordById(id);
    if (!existing) {
      return null;
    }

    const assignments = [];
    const values = [];
    const nowIso = new Date().toISOString();

    if (updates.status !== undefined) {
      assignments.push("status = ?");
      values.push(updates.status);
    }

    if (updates.statusLabelRu !== undefined) {
      assignments.push("status_label_ru = ?");
      values.push(updates.statusLabelRu);
    }

    if (updates.bayId !== undefined) {
      assignments.push("bay_id = ?");
      values.push(updates.bayId);
    }

    if (updates.bayNameSnapshot !== undefined) {
      assignments.push("bay_name_snapshot = ?");
      values.push(updates.bayNameSnapshot);
    }

    if (updates.primaryAssignee !== undefined) {
      assignments.push("primary_assignee = ?");
      values.push(updates.primaryAssignee);
    }

    if (updates.complaint !== undefined) {
      assignments.push("complaint = ?");
      values.push(updates.complaint);
    }

    if (updates.findings !== undefined) {
      assignments.push("findings = ?");
      values.push(updates.findings);
    }

    if (updates.internalNotes !== undefined) {
      assignments.push("internal_notes = ?");
      values.push(updates.internalNotes);
    }

    if (updates.customerNotes !== undefined) {
      assignments.push("customer_notes = ?");
      values.push(updates.customerNotes);
    }

    if (updates.balanceDueRub !== undefined) {
      assignments.push("balance_due_rub = ?");
      values.push(updates.balanceDueRub);
    }

    if (updates.blockedSinceIso !== undefined) {
      assignments.push("blocked_since_iso = ?");
      values.push(updates.blockedSinceIso);
    }

    if (updates.closedAt !== undefined) {
      assignments.push("closed_at = ?");
      values.push(updates.closedAt);
    }

    if (assignments.length > 0) {
      assignments.push("updated_at = ?");
      values.push(nowIso);
      values.push(id);
    }

    this.runInTransaction(() => {
      if (assignments.length > 0) {
        this.database
          .prepare(`UPDATE work_orders SET ${assignments.join(", ")} WHERE id = ?`)
          .run(...values);
      }

      if (transitionEntry) {
        this.createWorkOrderStatusHistoryEntry({
          id: `woh-${randomUUID().split("-")[0]}`,
          workOrderId: id,
          fromStatus: transitionEntry.fromStatus,
          fromStatusLabelRu: transitionEntry.fromStatusLabelRu,
          toStatus: transitionEntry.toStatus,
          toStatusLabelRu: transitionEntry.toStatusLabelRu,
          changedAt: nowIso,
          changedBy: transitionEntry.changedBy ?? null,
          reason: transitionEntry.reason ?? null,
          source: transitionEntry.source ?? "status_transition",
        });
      }
    });

    return this.getWorkOrderRecordById(id);
  }

  getWorkOrderLinkByAppointmentId(appointmentId) {
    const row = this.database
      .prepare(
        `SELECT appointment_id AS appointmentId, work_order_id AS workOrderId
         FROM appointment_work_order_links
         WHERE appointment_id = ?`,
      )
      .get(appointmentId);

    if (!row) {
      return null;
    }

    return {
      appointmentId: row.appointmentId,
      workOrderId: row.workOrderId,
    };
  }

  createWorkOrderFromAppointment({
    appointmentId,
    intakeEventId,
    workOrderId,
    workOrderCode,
    customerId,
    customerNameSnapshot,
    vehicleId,
    vehicleLabelSnapshot,
    complaint,
    status,
    statusLabelRu,
    bayId,
    bayNameSnapshot,
    primaryAssignee,
    changedBy = null,
    reason = null,
    source = "appointment_conversion",
  }) {
    const nowIso = new Date().toISOString();

    const result = this.runInTransaction(() => {
      const existingLink = this.database
        .prepare(
          `SELECT appointment_id AS appointmentId, work_order_id AS workOrderId
           FROM appointment_work_order_links
           WHERE appointment_id = ?`,
        )
        .get(appointmentId);

      if (existingLink?.workOrderId) {
        return {
          created: false,
          appointmentId,
          workOrderId: existingLink.workOrderId,
        };
      }

      this.database
        .prepare(
          `INSERT INTO intake_events(
            id,
            source,
            source_appointment_id,
            customer_id,
            vehicle_id,
            complaint,
            status,
            created_at,
            updated_at
          ) VALUES (?, 'appointment', ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(intakeEventId, appointmentId, customerId, vehicleId, complaint, "converted_to_work_order", nowIso, nowIso);

      this.database
        .prepare(
          `INSERT INTO work_orders(
            id,
            code,
            customer_id,
            customer_name_snapshot,
            vehicle_id,
            vehicle_label_snapshot,
            status,
            status_label_ru,
            bay_id,
            bay_name_snapshot,
            primary_assignee,
            complaint,
            findings,
            internal_notes,
            customer_notes,
            blocked_since_iso,
            balance_due_rub,
            created_at,
            closed_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 0, ?, NULL, ?)`,
        )
        .run(
          workOrderId,
          workOrderCode,
          customerId,
          customerNameSnapshot,
          vehicleId,
          vehicleLabelSnapshot,
          status,
          statusLabelRu,
          bayId ?? null,
          bayNameSnapshot ?? null,
          primaryAssignee ?? null,
          complaint,
          nowIso,
          nowIso,
        );

      this.database
        .prepare(
          `INSERT INTO appointment_work_order_links(
            appointment_id,
            work_order_id,
            created_at
          ) VALUES (?, ?, ?)`,
        )
        .run(appointmentId, workOrderId, nowIso);

      this.createWorkOrderStatusHistoryEntry({
        id: `woh-${randomUUID().split("-")[0]}`,
        workOrderId,
        fromStatus: null,
        fromStatusLabelRu: null,
        toStatus: status,
        toStatusLabelRu: statusLabelRu,
        changedAt: nowIso,
        changedBy,
        reason,
        source,
      });

      return {
        created: true,
        appointmentId,
        workOrderId,
      };
    });

    return {
      created: result.created,
      appointmentId: result.appointmentId,
      workOrder: this.getWorkOrderRecordById(result.workOrderId),
      intakeEvent: result.created ? this.getIntakeEventById(intakeEventId) : null,
    };
  }

  listVehicles() {
    return this.database
      .prepare(
        `SELECT
          id,
          customer_id AS customerId,
          label,
          vin
         FROM vehicles
         WHERE is_active = 1
         ORDER BY label ASC`,
      )
      .all();
  }

  listCustomers() {
    return this.database
      .prepare(
        `SELECT
          id,
          full_name AS name,
          phone
         FROM customers
         WHERE is_active = 1
         ORDER BY full_name ASC`,
      )
      .all();
  }

  listEmployees({ includeInactive = false, limit = null, offset = 0 } = {}) {
    const whereClause = includeInactive ? "" : "WHERE is_active = 1";
    const hasLimit = Number.isInteger(limit);
    const hasOffsetOnly = !hasLimit && Number.isInteger(offset) && offset > 0;
    const paginationClause = hasLimit
      ? " LIMIT ? OFFSET ?"
      : hasOffsetOnly
        ? " LIMIT -1 OFFSET ?"
        : "";
    const paginationValues = hasLimit
      ? [limit, offset]
      : hasOffsetOnly
        ? [offset]
        : [];

    const rows = this.database
      .prepare(
        `SELECT
          id,
          name,
          roles_json AS rolesJson,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
         FROM employees
         ${whereClause}
         ORDER BY name ASC${paginationClause}`,
      )
      .all(...paginationValues);

    return rows.map(mapEmployeeRow);
  }

  getEmployeeById(id) {
    const row = this.database
      .prepare(
        `SELECT
          id,
          name,
          roles_json AS rolesJson,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
         FROM employees
         WHERE id = ?`,
      )
      .get(id);

    return mapEmployeeRow(row);
  }

  createEmployee({ id, name, roles, isActive }) {
    const nowIso = new Date().toISOString();

    this.database
      .prepare(
        `INSERT INTO employees(id, name, roles_json, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(id, name, JSON.stringify(roles), isActive ? 1 : 0, nowIso, nowIso);

    return this.getEmployeeById(id);
  }

  updateEmployeeById(id, updates) {
    const existing = this.getEmployeeById(id);
    if (!existing) {
      return null;
    }

    const assignments = [];
    const values = [];

    if (updates.name !== undefined) {
      assignments.push("name = ?");
      values.push(updates.name);
    }

    if (updates.roles !== undefined) {
      assignments.push("roles_json = ?");
      values.push(JSON.stringify(updates.roles));
    }

    if (updates.isActive !== undefined) {
      assignments.push("is_active = ?");
      values.push(updates.isActive ? 1 : 0);
    }

    if (assignments.length === 0) {
      return existing;
    }

    assignments.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    this.database.prepare(`UPDATE employees SET ${assignments.join(", ")} WHERE id = ?`).run(...values);

    return this.getEmployeeById(id);
  }

  deactivateEmployeeById(id) {
    return this.updateEmployeeById(id, { isActive: false });
  }

  listBays({ includeInactive = false, limit = null, offset = 0 } = {}) {
    const whereClause = includeInactive ? "" : "WHERE is_active = 1";
    const hasLimit = Number.isInteger(limit);
    const hasOffsetOnly = !hasLimit && Number.isInteger(offset) && offset > 0;
    const paginationClause = hasLimit
      ? " LIMIT ? OFFSET ?"
      : hasOffsetOnly
        ? " LIMIT -1 OFFSET ?"
        : "";
    const paginationValues = hasLimit
      ? [limit, offset]
      : hasOffsetOnly
        ? [offset]
        : [];

    const rows = this.database
      .prepare(
        `SELECT
          id,
          name,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
         FROM bays
         ${whereClause}
         ORDER BY name ASC${paginationClause}`,
      )
      .all(...paginationValues);

    return rows.map(mapBayRow);
  }

  getBayById(id) {
    const row = this.database
      .prepare(
        `SELECT
          id,
          name,
          is_active AS isActive,
          created_at AS createdAt,
          updated_at AS updatedAt
         FROM bays
         WHERE id = ?`,
      )
      .get(id);

    return mapBayRow(row);
  }

  createBay({ id, name, isActive }) {
    const nowIso = new Date().toISOString();

    this.database
      .prepare(
        `INSERT INTO bays(id, name, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(id, name, isActive ? 1 : 0, nowIso, nowIso);

    return this.getBayById(id);
  }

  updateBayById(id, updates) {
    const existing = this.getBayById(id);
    if (!existing) {
      return null;
    }

    const assignments = [];
    const values = [];

    if (updates.name !== undefined) {
      assignments.push("name = ?");
      values.push(updates.name);
    }

    if (updates.isActive !== undefined) {
      assignments.push("is_active = ?");
      values.push(updates.isActive ? 1 : 0);
    }

    if (assignments.length === 0) {
      return existing;
    }

    assignments.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    this.database.prepare(`UPDATE bays SET ${assignments.join(", ")} WHERE id = ?`).run(...values);

    return this.getBayById(id);
  }

  deactivateBayById(id) {
    return this.updateBayById(id, { isActive: false });
  }

  listCustomerRecords({ includeInactive = false, query = "", limit = null, offset = 0 } = {}) {
    const conditions = [];
    const values = [];

    if (!includeInactive) {
      conditions.push("c.is_active = 1");
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length > 0) {
      conditions.push("(c.full_name LIKE ? OR c.phone LIKE ?)");
      const pattern = `%${trimmedQuery}%`;
      values.push(pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const hasLimit = Number.isInteger(limit);
    const hasOffsetOnly = !hasLimit && Number.isInteger(offset) && offset > 0;
    const paginationClause = hasLimit
      ? " LIMIT ? OFFSET ?"
      : hasOffsetOnly
        ? " LIMIT -1 OFFSET ?"
        : "";
    const paginationValues = hasLimit
      ? [limit, offset]
      : hasOffsetOnly
        ? [offset]
        : [];

    const rows = this.database
      .prepare(
        `SELECT
          c.id,
          c.full_name AS fullName,
          c.phone,
          c.messaging_handle AS messagingHandle,
          c.notes,
          c.is_active AS isActive,
          c.created_at AS createdAt,
          c.updated_at AS updatedAt
         FROM customers c
         ${whereClause}
         ORDER BY c.full_name ASC${paginationClause}`,
      )
      .all(...values, ...paginationValues);

    return rows.map(mapCustomerRecord);
  }

  searchCustomers({ query, limit }) {
    const trimmedQuery = query.trim();
    const pattern = `%${trimmedQuery}%`;
    const phoneDigits = trimmedQuery.replace(/\D/gu, "");
    const phonePattern = `%${phoneDigits}%`;

    const total = this.database
      .prepare(
        `SELECT COUNT(1) AS count
         FROM customers c
         WHERE c.is_active = 1
           AND (
             c.full_name LIKE ?
             OR c.phone LIKE ?
             OR (? != '' AND replace(replace(replace(replace(replace(c.phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?)
           )`,
      )
      .get(pattern, pattern, phoneDigits, phonePattern)
      .count;

    const rows = this.database
      .prepare(
        `SELECT
          c.id,
          c.full_name AS fullName,
          c.phone
         FROM customers c
         WHERE c.is_active = 1
           AND (
             c.full_name LIKE ?
             OR c.phone LIKE ?
             OR (? != '' AND replace(replace(replace(replace(replace(c.phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?)
           )
         ORDER BY c.full_name ASC
         LIMIT ?`,
      )
      .all(pattern, pattern, phoneDigits, phonePattern, limit);

    return { total, rows };
  }

  getCustomerById(id) {
    const row = this.database
      .prepare(
        `SELECT
          c.id,
          c.full_name AS fullName,
          c.phone,
          c.messaging_handle AS messagingHandle,
          c.notes,
          c.is_active AS isActive,
          c.created_at AS createdAt,
          c.updated_at AS updatedAt
         FROM customers c
         WHERE c.id = ?`,
      )
      .get(id);

    return mapCustomerRecord(row);
  }

  createCustomer({ id, fullName, phone, messagingHandle, notes, isActive }) {
    const nowIso = new Date().toISOString();

    this.database
      .prepare(
        `INSERT INTO customers(
          id,
          full_name,
          phone,
          messaging_handle,
          notes,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(id, fullName, phone, messagingHandle, notes, isActive ? 1 : 0, nowIso, nowIso);

    return this.getCustomerById(id);
  }

  updateCustomerById(id, updates) {
    const existing = this.getCustomerById(id);
    if (!existing) {
      return null;
    }

    const assignments = [];
    const values = [];

    if (updates.fullName !== undefined) {
      assignments.push("full_name = ?");
      values.push(updates.fullName);
    }

    if (updates.phone !== undefined) {
      assignments.push("phone = ?");
      values.push(updates.phone);
    }

    if (updates.messagingHandle !== undefined) {
      assignments.push("messaging_handle = ?");
      values.push(updates.messagingHandle);
    }

    if (updates.notes !== undefined) {
      assignments.push("notes = ?");
      values.push(updates.notes);
    }

    if (updates.isActive !== undefined) {
      assignments.push("is_active = ?");
      values.push(updates.isActive ? 1 : 0);
    }

    if (assignments.length === 0) {
      return existing;
    }

    assignments.push("updated_at = ?");
    values.push(new Date().toISOString());
    values.push(id);

    this.database.prepare(`UPDATE customers SET ${assignments.join(", ")} WHERE id = ?`).run(...values);

    return this.getCustomerById(id);
  }

  deactivateCustomerById(id) {
    return this.updateCustomerById(id, { isActive: false });
  }

  listVehicleRecords({ includeInactive = false, query = "", customerId = null, limit = null, offset = 0 } = {}) {
    const conditions = [];
    const values = [];

    if (!includeInactive) {
      conditions.push("v.is_active = 1");
    }

    if (customerId) {
      conditions.push("v.customer_id = ?");
      values.push(customerId);
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length > 0) {
      conditions.push(
        "(v.label LIKE ? OR COALESCE(v.plate_number, '') LIKE ? OR COALESCE(v.vin, '') LIKE ? OR COALESCE(v.make, '') LIKE ? OR COALESCE(v.model, '') LIKE ?)",
      );
      const pattern = `%${trimmedQuery}%`;
      values.push(pattern, pattern, pattern, pattern, pattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const hasLimit = Number.isInteger(limit);
    const hasOffsetOnly = !hasLimit && Number.isInteger(offset) && offset > 0;
    const paginationClause = hasLimit
      ? " LIMIT ? OFFSET ?"
      : hasOffsetOnly
        ? " LIMIT -1 OFFSET ?"
        : "";
    const paginationValues = hasLimit
      ? [limit, offset]
      : hasOffsetOnly
        ? [offset]
        : [];

    const rows = this.database
      .prepare(
        `SELECT
          v.id,
          v.customer_id AS customerId,
          c.full_name AS customerName,
          v.label,
          v.vin,
          v.plate_number AS plateNumber,
          v.make,
          v.model,
          v.production_year AS productionYear,
          v.engine_or_trim AS engineOrTrim,
          v.mileage_km AS mileageKm,
          v.is_active AS isActive,
          v.created_at AS createdAt,
          v.updated_at AS updatedAt
         FROM vehicles v
         JOIN customers c ON c.id = v.customer_id
         ${whereClause}
         ORDER BY v.label ASC${paginationClause}`,
      )
      .all(...values, ...paginationValues);

    return rows.map(mapVehicleRecord);
  }

  searchVehicles({ query, limit }) {
    const trimmedQuery = query.trim();
    const pattern = `%${trimmedQuery}%`;

    const total = this.database
      .prepare(
        `SELECT COUNT(1) AS count
         FROM vehicles v
         JOIN customers c ON c.id = v.customer_id
         WHERE v.is_active = 1
           AND (
             v.label LIKE ?
             OR COALESCE(v.plate_number, '') LIKE ?
             OR COALESCE(v.vin, '') LIKE ?
             OR COALESCE(v.make, '') LIKE ?
             OR COALESCE(v.model, '') LIKE ?
             OR c.full_name LIKE ?
           )`,
      )
      .get(pattern, pattern, pattern, pattern, pattern, pattern)
      .count;

    const rows = this.database
      .prepare(
        `SELECT
          v.id,
          v.customer_id AS customerId,
          c.full_name AS customerName,
          v.label,
          v.plate_number AS plateNumber,
          v.vin,
          v.model
         FROM vehicles v
         JOIN customers c ON c.id = v.customer_id
         WHERE v.is_active = 1
           AND (
             v.label LIKE ?
             OR COALESCE(v.plate_number, '') LIKE ?
             OR COALESCE(v.vin, '') LIKE ?
             OR COALESCE(v.make, '') LIKE ?
             OR COALESCE(v.model, '') LIKE ?
             OR c.full_name LIKE ?
           )
         ORDER BY v.label ASC
         LIMIT ?`,
      )
      .all(pattern, pattern, pattern, pattern, pattern, pattern, limit);

    return { total, rows };
  }

  getVehicleById(id) {
    const row = this.database
      .prepare(
        `SELECT
          v.id,
          v.customer_id AS customerId,
          c.full_name AS customerName,
          v.label,
          v.vin,
          v.plate_number AS plateNumber,
          v.make,
          v.model,
          v.production_year AS productionYear,
          v.engine_or_trim AS engineOrTrim,
          v.mileage_km AS mileageKm,
          v.is_active AS isActive,
          v.created_at AS createdAt,
          v.updated_at AS updatedAt
         FROM vehicles v
         JOIN customers c ON c.id = v.customer_id
         WHERE v.id = ?`,
      )
      .get(id);

    return mapVehicleRecord(row);
  }

  createVehicle({
    id,
    customerId,
    label,
    vin,
    plateNumber,
    make,
    model,
    productionYear,
    engineOrTrim,
    mileageKm,
    isActive,
  }) {
    const nowIso = new Date().toISOString();

    this.runInTransaction(() => {
      this.database
        .prepare(
          `INSERT INTO vehicles(
            id,
            customer_id,
            label,
            vin,
            plate_number,
            make,
            model,
            production_year,
            engine_or_trim,
            mileage_km,
            is_active,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          customerId,
          label,
          vin,
          plateNumber,
          make,
          model,
          productionYear,
          engineOrTrim,
          mileageKm,
          isActive ? 1 : 0,
          nowIso,
          nowIso,
        );

      this.database
        .prepare(
          `INSERT INTO vehicle_ownership_history(
            id,
            vehicle_id,
            customer_id,
            changed_at,
            change_reason,
            source
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(`ownership-${randomUUID().split("-")[0]}`, id, customerId, nowIso, "vehicle_created", "api");
    });

    return this.getVehicleById(id);
  }

  updateVehicleById(id, updates) {
    const existing = this.getVehicleById(id);
    if (!existing) {
      return null;
    }

    const assignments = [];
    const values = [];

    if (updates.customerId !== undefined) {
      assignments.push("customer_id = ?");
      values.push(updates.customerId);
    }

    if (updates.label !== undefined) {
      assignments.push("label = ?");
      values.push(updates.label);
    }

    if (updates.vin !== undefined) {
      assignments.push("vin = ?");
      values.push(updates.vin);
    }

    if (updates.plateNumber !== undefined) {
      assignments.push("plate_number = ?");
      values.push(updates.plateNumber);
    }

    if (updates.make !== undefined) {
      assignments.push("make = ?");
      values.push(updates.make);
    }

    if (updates.model !== undefined) {
      assignments.push("model = ?");
      values.push(updates.model);
    }

    if (updates.productionYear !== undefined) {
      assignments.push("production_year = ?");
      values.push(updates.productionYear);
    }

    if (updates.engineOrTrim !== undefined) {
      assignments.push("engine_or_trim = ?");
      values.push(updates.engineOrTrim);
    }

    if (updates.mileageKm !== undefined) {
      assignments.push("mileage_km = ?");
      values.push(updates.mileageKm);
    }

    if (updates.isActive !== undefined) {
      assignments.push("is_active = ?");
      values.push(updates.isActive ? 1 : 0);
    }

    if (assignments.length === 0) {
      return existing;
    }

    const nowIso = new Date().toISOString();
    assignments.push("updated_at = ?");
    values.push(nowIso);
    values.push(id);

    const customerChanged = updates.customerId !== undefined && updates.customerId !== existing.customerId;

    this.runInTransaction(() => {
      this.database.prepare(`UPDATE vehicles SET ${assignments.join(", ")} WHERE id = ?`).run(...values);

      if (customerChanged) {
        this.database
          .prepare(
            `INSERT INTO vehicle_ownership_history(
              id,
              vehicle_id,
              customer_id,
              changed_at,
              change_reason,
              source
            ) VALUES (?, ?, ?, ?, ?, ?)`,
          )
          .run(
            `ownership-${randomUUID().split("-")[0]}`,
            id,
            updates.customerId,
            nowIso,
            "owner_reassigned",
            "api",
          );
      }
    });

    return this.getVehicleById(id);
  }

  deactivateVehicleById(id) {
    return this.updateVehicleById(id, { isActive: false });
  }

  listVehicleOwnershipHistory(vehicleId) {
    const rows = this.database
      .prepare(
        `SELECT
          h.id,
          h.vehicle_id AS vehicleId,
          h.customer_id AS customerId,
          c.full_name AS customerName,
          h.changed_at AS changedAt,
          h.change_reason AS changeReason,
          h.source
         FROM vehicle_ownership_history h
         JOIN customers c ON c.id = h.customer_id
         WHERE h.vehicle_id = ?
         ORDER BY h.changed_at DESC, h.id DESC`,
      )
      .all(vehicleId);

    return rows.map((row) => ({
      id: row.id,
      vehicleId: row.vehicleId,
      customerId: row.customerId,
      customerName: row.customerName,
      changedAt: row.changedAt,
      changeReason: row.changeReason,
      source: row.source,
    }));
  }

  getIntakeEventById(id) {
    const row = this.database
      .prepare(
        `SELECT
          id,
          source,
          source_appointment_id AS sourceAppointmentId,
          customer_id AS customerId,
          vehicle_id AS vehicleId,
          complaint,
          status,
          created_at AS createdAt,
          updated_at AS updatedAt
         FROM intake_events
         WHERE id = ?`,
      )
      .get(id);

    return mapIntakeEventRecord(row);
  }

  createWalkInIntakeBundle({
    intakeEventId,
    workOrderId,
    workOrderCode,
    customerId,
    customerNameSnapshot,
    vehicleId,
    vehicleLabelSnapshot,
    complaint,
    status,
    statusLabelRu,
    bayId,
    bayNameSnapshot,
    primaryAssignee,
  }) {
    const nowIso = new Date().toISOString();

    this.runInTransaction(() => {
      this.database
        .prepare(
          `INSERT INTO intake_events(
            id,
            source,
            source_appointment_id,
            customer_id,
            vehicle_id,
            complaint,
            status,
            created_at,
            updated_at
          ) VALUES (?, 'walk_in', NULL, ?, ?, ?, ?, ?, ?)`,
        )
        .run(intakeEventId, customerId, vehicleId, complaint, status, nowIso, nowIso);

      this.database
        .prepare(
          `INSERT INTO work_orders(
            id,
            code,
            customer_id,
            customer_name_snapshot,
            vehicle_id,
            vehicle_label_snapshot,
            status,
            status_label_ru,
            bay_id,
            bay_name_snapshot,
            primary_assignee,
            complaint,
            findings,
            internal_notes,
            customer_notes,
            blocked_since_iso,
            balance_due_rub,
            created_at,
            closed_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, 0, ?, NULL, ?)`,
        )
        .run(
          workOrderId,
          workOrderCode,
          customerId,
          customerNameSnapshot,
          vehicleId,
          vehicleLabelSnapshot,
          status,
          statusLabelRu,
          bayId ?? null,
          bayNameSnapshot ?? null,
          primaryAssignee ?? null,
          complaint,
          nowIso,
          nowIso,
        );

      this.createWorkOrderStatusHistoryEntry({
        id: `woh-${randomUUID().split("-")[0]}`,
        workOrderId,
        fromStatus: null,
        fromStatusLabelRu: null,
        toStatus: status,
        toStatusLabelRu: statusLabelRu,
        changedAt: nowIso,
        changedBy: "front_desk",
        reason: "Прием walk-in",
        source: "walk_in_intake",
      });
    });

    return {
      intakeEvent: this.getIntakeEventById(intakeEventId),
      workOrder: this.getWorkOrderById(workOrderId),
    };
  }

  listIntakeEvents() {
    return this.database
      .prepare(
        `SELECT
          id,
          source,
          source_appointment_id AS sourceAppointmentId,
          customer_id AS customerId,
          vehicle_id AS vehicleId,
          complaint,
          status,
          created_at AS createdAt,
          updated_at AS updatedAt
         FROM intake_events
         ORDER BY created_at DESC, id DESC`,
      )
      .all()
      .map(mapIntakeEventRecord);
  }
}

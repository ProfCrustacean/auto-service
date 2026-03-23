import { randomUUID } from "node:crypto";
import {
  mapAppointmentRecord,
  mapIntakeEventRecord,
  mapPartsPurchaseActionRecord,
  mapWorkOrderPartsHistoryRecord,
  mapWorkOrderPartsRequestRecord,
  mapWorkOrderRecord,
  mapWorkOrderStatusHistoryRecord,
} from "./sqliteRepositoryMappers.js";
import {
  createBayRepository,
  createCustomerRepository,
  createEmployeeRepository,
  createVehicleRepository,
  deactivateBayByIdRepository,
  deactivateCustomerByIdRepository,
  deactivateEmployeeByIdRepository,
  deactivateVehicleByIdRepository,
  getBayByIdRepository,
  getCustomerByIdRepository,
  getEmployeeByIdRepository,
  getVehicleByIdRepository,
  listBaysRepository,
  listCustomerRecordsRepository,
  listCustomersRepository,
  listEmployeesRepository,
  listVehicleOwnershipHistoryRepository,
  listVehicleRecordsRepository,
  listVehiclesRepository,
  searchCustomersRepository,
  searchVehiclesRepository,
  updateBayByIdRepository,
  updateCustomerByIdRepository,
  updateEmployeeByIdRepository,
  updateVehicleByIdRepository,
} from "./sqliteRepositoryReferenceCustomerVehicle.js";

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
    dateFromLocal = null,
    dateToLocal = null,
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

    if (dateFromLocal) {
      conditions.push("substr(a.planned_start_local, 1, 10) >= ?");
      values.push(dateFromLocal);
    }

    if (dateToLocal) {
      conditions.push("substr(a.planned_start_local, 1, 10) <= ?");
      values.push(dateToLocal);
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

  listAppointmentScheduleHistory(appointmentId, { limit = 25 } = {}) {
    const hasLimit = Number.isInteger(limit) && limit > 0;
    const query = hasLimit
      ? `SELECT
          id,
          appointment_id AS appointmentId,
          from_planned_start_local AS fromPlannedStartLocal,
          to_planned_start_local AS toPlannedStartLocal,
          from_expected_duration_min AS fromExpectedDurationMin,
          to_expected_duration_min AS toExpectedDurationMin,
          from_bay_id AS fromBayId,
          to_bay_id AS toBayId,
          from_primary_assignee AS fromPrimaryAssignee,
          to_primary_assignee AS toPrimaryAssignee,
          changed_at AS changedAt,
          changed_by AS changedBy,
          reason,
          source
         FROM appointment_schedule_history
         WHERE appointment_id = ?
         ORDER BY changed_at DESC, id DESC
         LIMIT ?`
      : `SELECT
          id,
          appointment_id AS appointmentId,
          from_planned_start_local AS fromPlannedStartLocal,
          to_planned_start_local AS toPlannedStartLocal,
          from_expected_duration_min AS fromExpectedDurationMin,
          to_expected_duration_min AS toExpectedDurationMin,
          from_bay_id AS fromBayId,
          to_bay_id AS toBayId,
          from_primary_assignee AS fromPrimaryAssignee,
          to_primary_assignee AS toPrimaryAssignee,
          changed_at AS changedAt,
          changed_by AS changedBy,
          reason,
          source
         FROM appointment_schedule_history
         WHERE appointment_id = ?
         ORDER BY changed_at DESC, id DESC`;

    const rows = hasLimit
      ? this.database.prepare(query).all(appointmentId, limit)
      : this.database.prepare(query).all(appointmentId);

    return rows.map((row) => ({
      id: row.id,
      appointmentId: row.appointmentId,
      fromPlannedStartLocal: row.fromPlannedStartLocal,
      toPlannedStartLocal: row.toPlannedStartLocal,
      fromExpectedDurationMin: row.fromExpectedDurationMin,
      toExpectedDurationMin: row.toExpectedDurationMin,
      fromBayId: row.fromBayId,
      toBayId: row.toBayId,
      fromPrimaryAssignee: row.fromPrimaryAssignee,
      toPrimaryAssignee: row.toPrimaryAssignee,
      changedAt: row.changedAt,
      changedBy: row.changedBy,
      reason: row.reason,
      source: row.source,
    }));
  }

  createAppointmentScheduleHistoryEntry({
    id,
    appointmentId,
    fromPlannedStartLocal,
    toPlannedStartLocal,
    fromExpectedDurationMin = null,
    toExpectedDurationMin = null,
    fromBayId = null,
    toBayId = null,
    fromPrimaryAssignee = null,
    toPrimaryAssignee = null,
    changedAt,
    changedBy = null,
    reason = null,
    source,
  }) {
    this.database
      .prepare(
        `INSERT INTO appointment_schedule_history(
          id,
          appointment_id,
          from_planned_start_local,
          to_planned_start_local,
          from_expected_duration_min,
          to_expected_duration_min,
          from_bay_id,
          to_bay_id,
          from_primary_assignee,
          to_primary_assignee,
          changed_at,
          changed_by,
          reason,
          source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        appointmentId,
        fromPlannedStartLocal,
        toPlannedStartLocal,
        fromExpectedDurationMin,
        toExpectedDurationMin,
        fromBayId,
        toBayId,
        fromPrimaryAssignee,
        toPrimaryAssignee,
        changedAt,
        changedBy,
        reason,
        source,
      );
  }

  listIntervalBlockingAppointments({
    dateFromLocal,
    dateToLocal,
    excludeAppointmentId = null,
  }) {
    const conditions = ["status IN ('booked', 'confirmed', 'arrived')"];
    const values = [];

    if (dateFromLocal) {
      conditions.push("substr(planned_start_local, 1, 10) >= ?");
      values.push(dateFromLocal);
    }

    if (dateToLocal) {
      conditions.push("substr(planned_start_local, 1, 10) <= ?");
      values.push(dateToLocal);
    }

    if (excludeAppointmentId) {
      conditions.push("id != ?");
      values.push(excludeAppointmentId);
    }

    return this.database
      .prepare(
        `SELECT
          id,
          code,
          planned_start_local AS plannedStartLocal,
          expected_duration_min AS expectedDurationMin,
          bay_id AS bayId,
          primary_assignee AS primaryAssignee,
          status
         FROM appointments
         WHERE ${conditions.join(" AND ")}
         ORDER BY planned_start_local ASC, code ASC`,
      )
      .all(...values);
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
    dateFromLocal = null,
    dateToLocal = null,
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

    if (dateFromLocal) {
      conditions.push("substr(COALESCE(w.created_at, w.updated_at), 1, 10) >= ?");
      values.push(dateFromLocal);
    }

    if (dateToLocal) {
      conditions.push("substr(COALESCE(w.created_at, w.updated_at), 1, 10) <= ?");
      values.push(dateToLocal);
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

  listUnscheduledWalkInWorkOrders({ limit = 50 } = {}) {
    const safeLimit = Number.isInteger(limit) && limit > 0 ? limit : 50;

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
         LEFT JOIN appointment_work_order_links l ON l.work_order_id = w.id
         WHERE l.work_order_id IS NULL
           AND w.status NOT IN ('completed', 'cancelled')
         ORDER BY w.created_at DESC, w.code DESC
         LIMIT ?`,
      )
      .all(safeLimit)
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

  createAppointmentWorkOrderLink({ appointmentId, workOrderId }) {
    const nowIso = new Date().toISOString();
    this.database
      .prepare(
        `INSERT OR IGNORE INTO appointment_work_order_links(
          appointment_id,
          work_order_id,
          created_at
        ) VALUES (?, ?, ?)`,
      )
      .run(appointmentId, workOrderId, nowIso);
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
    return listVehiclesRepository(this);
  }

  listCustomers() {
    return listCustomersRepository(this);
  }

  listEmployees({ includeInactive = false, limit = null, offset = 0 } = {}) {
    return listEmployeesRepository(this, { includeInactive, limit, offset });
  }

  getEmployeeById(id) {
    return getEmployeeByIdRepository(this, id);
  }

  createEmployee({ id, name, roles, isActive }) {
    return createEmployeeRepository(this, { id, name, roles, isActive });
  }

  updateEmployeeById(id, updates) {
    return updateEmployeeByIdRepository(this, id, updates);
  }

  deactivateEmployeeById(id) {
    return deactivateEmployeeByIdRepository(this, id);
  }

  listBays({ includeInactive = false, limit = null, offset = 0 } = {}) {
    return listBaysRepository(this, { includeInactive, limit, offset });
  }

  getBayById(id) {
    return getBayByIdRepository(this, id);
  }

  createBay({ id, name, isActive }) {
    return createBayRepository(this, { id, name, isActive });
  }

  updateBayById(id, updates) {
    return updateBayByIdRepository(this, id, updates);
  }

  deactivateBayById(id) {
    return deactivateBayByIdRepository(this, id);
  }

  listCustomerRecords({ includeInactive = false, query = "", limit = null, offset = 0 } = {}) {
    return listCustomerRecordsRepository(this, { includeInactive, query, limit, offset });
  }

  searchCustomers({ query, limit }) {
    return searchCustomersRepository(this, { query, limit });
  }

  getCustomerById(id) {
    return getCustomerByIdRepository(this, id);
  }

  createCustomer({ id, fullName, phone, messagingHandle, notes, isActive }) {
    return createCustomerRepository(this, { id, fullName, phone, messagingHandle, notes, isActive });
  }

  updateCustomerById(id, updates) {
    return updateCustomerByIdRepository(this, id, updates);
  }

  deactivateCustomerById(id) {
    return deactivateCustomerByIdRepository(this, id);
  }

  listVehicleRecords({ includeInactive = false, query = "", customerId = null, limit = null, offset = 0 } = {}) {
    return listVehicleRecordsRepository(this, { includeInactive, query, customerId, limit, offset });
  }

  searchVehicles({ query, limit }) {
    return searchVehiclesRepository(this, { query, limit });
  }

  getVehicleById(id) {
    return getVehicleByIdRepository(this, id);
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
    return createVehicleRepository(this, {
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
    });
  }

  updateVehicleById(id, updates) {
    return updateVehicleByIdRepository(this, id, updates);
  }

  deactivateVehicleById(id) {
    return deactivateVehicleByIdRepository(this, id);
  }

  listVehicleOwnershipHistory(vehicleId) {
    return listVehicleOwnershipHistoryRepository(this, vehicleId);
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
        reason: "Прием без записи",
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

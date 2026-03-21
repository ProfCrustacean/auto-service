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

export class SqliteRepository {
  constructor(database) {
    this.database = database;
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
          COALESCE(a.primary_assignee, 'Без ответственного') AS primaryAssignee
         FROM appointments a
         LEFT JOIN bays b ON b.id = a.bay_id
         ORDER BY a.planned_start_local ASC, a.code ASC`,
      )
      .all();
  }

  listWorkOrders() {
    return this.database
      .prepare(
        `SELECT
          w.id,
          w.code,
          w.customer_id AS customerId,
          w.customer_name_snapshot AS customerName,
          w.vehicle_id AS vehicleId,
          w.vehicle_label_snapshot AS vehicleLabel,
          COALESCE(w.bay_name_snapshot, b.name, 'Без поста') AS bayName,
          w.status,
          w.status_label_ru AS statusLabelRu,
          COALESCE(w.primary_assignee, 'Без ответственного') AS primaryAssignee,
          w.balance_due_rub AS balanceDueRub,
          w.blocked_since_iso AS blockedSinceIso
         FROM work_orders w
         LEFT JOIN bays b ON b.id = w.bay_id
         ORDER BY w.code ASC`,
      )
      .all();
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

  listEmployees({ includeInactive = false } = {}) {
    const rows = includeInactive
      ? this.database
          .prepare(
            `SELECT
              id,
              name,
              roles_json AS rolesJson,
              is_active AS isActive,
              created_at AS createdAt,
              updated_at AS updatedAt
             FROM employees
             ORDER BY name ASC`,
          )
          .all()
      : this.database
          .prepare(
            `SELECT
              id,
              name,
              roles_json AS rolesJson,
              is_active AS isActive,
              created_at AS createdAt,
              updated_at AS updatedAt
             FROM employees
             WHERE is_active = 1
             ORDER BY name ASC`,
          )
          .all();

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

  listBays({ includeInactive = false } = {}) {
    const rows = includeInactive
      ? this.database
          .prepare(
            `SELECT
              id,
              name,
              is_active AS isActive,
              created_at AS createdAt,
              updated_at AS updatedAt
             FROM bays
             ORDER BY name ASC`,
          )
          .all()
      : this.database
          .prepare(
            `SELECT
              id,
              name,
              is_active AS isActive,
              created_at AS createdAt,
              updated_at AS updatedAt
             FROM bays
             WHERE is_active = 1
             ORDER BY name ASC`,
          )
          .all();

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

  listCustomerRecords({ includeInactive = false, query = "" } = {}) {
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
         ORDER BY c.full_name ASC`,
      )
      .all(...values);

    return rows.map(mapCustomerRecord);
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

  listVehicleRecords({ includeInactive = false, query = "", customerId = null } = {}) {
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
         ORDER BY v.label ASC`,
      )
      .all(...values);

    return rows.map(mapVehicleRecord);
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

    try {
      this.database.exec("BEGIN TRANSACTION;");

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

      this.database.exec("COMMIT;");
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }

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

    try {
      this.database.exec("BEGIN TRANSACTION;");
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

      this.database.exec("COMMIT;");
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }

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
      .all();
  }
}

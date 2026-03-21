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

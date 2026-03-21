function asBoolean(value) {
  return Boolean(value);
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

  listEmployees() {
    const rows = this.database
      .prepare(
        `SELECT
          id,
          name,
          roles_json AS rolesJson,
          is_active AS isActive
         FROM employees
         ORDER BY name ASC`,
      )
      .all();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      roles: JSON.parse(row.rolesJson),
      isActive: asBoolean(row.isActive),
    }));
  }

  listBays() {
    const rows = this.database
      .prepare(
        `SELECT
          id,
          name,
          is_active AS isActive
         FROM bays
         ORDER BY name ASC`,
      )
      .all();

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      isActive: asBoolean(row.isActive),
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

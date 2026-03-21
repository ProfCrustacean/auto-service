import fs from "node:fs";

function parseVehicleLabel(label) {
  if (!label) {
    return { make: null, model: null, plateNumber: null };
  }

  const parts = label.trim().split(/\s+/);
  if (parts.length < 2) {
    return { make: label, model: null, plateNumber: null };
  }

  const [make, ...tail] = parts;
  const plateNumber = tail.length > 1 ? tail.at(-1) : null;
  const model = tail.length > 1 ? tail.slice(0, -1).join(" ") : tail[0] ?? null;

  return { make, model, plateNumber };
}

function getRowCount(database, table) {
  return database.prepare(`SELECT COUNT(1) AS count FROM ${table}`).get().count;
}

function getSummaryCounts(database) {
  return {
    bays: getRowCount(database, "bays"),
    employees: getRowCount(database, "employees"),
    customers: getRowCount(database, "customers"),
    vehicles: getRowCount(database, "vehicles"),
    vehicleOwnershipHistory: getRowCount(database, "vehicle_ownership_history"),
    appointments: getRowCount(database, "appointments"),
    intakeEvents: getRowCount(database, "intake_events"),
    workOrders: getRowCount(database, "work_orders"),
  };
}

function clearAllData(database) {
  database.exec("DELETE FROM vehicle_ownership_history;");
  database.exec("DELETE FROM intake_events;");
  database.exec("DELETE FROM appointments;");
  database.exec("DELETE FROM work_orders;");
  database.exec("DELETE FROM vehicles;");
  database.exec("DELETE FROM customers;");
  database.exec("DELETE FROM employees;");
  database.exec("DELETE FROM bays;");
  database.exec("DELETE FROM service_meta;");
}

export function seedDatabase({ database, seedPath, logger, force = false }) {
  const existingCustomers = getRowCount(database, "customers");
  if (existingCustomers > 0 && !force) {
    return {
      seeded: false,
      reason: "database_not_empty",
      counts: getSummaryCounts(database),
    };
  }

  const raw = fs.readFileSync(seedPath, "utf8");
  const fixtures = JSON.parse(raw);
  const nowIso = new Date().toISOString();

  const bayIdByName = new Map((fixtures.service.bays ?? []).map((bay) => [bay.name, bay.id]));

  const insertService = database.prepare(
    "INSERT INTO service_meta(id, display_name_ru, city_ru) VALUES (?, ?, ?)",
  );
  const insertBay = database.prepare(
    `INSERT INTO bays(id, name, is_active, created_at, updated_at)
     VALUES (?, ?, 1, ?, ?)`,
  );
  const insertEmployee = database.prepare(
    `INSERT INTO employees(id, name, roles_json, is_active, created_at, updated_at)
     VALUES (?, ?, ?, 1, ?, ?)`,
  );
  const insertCustomer = database.prepare(
    `INSERT INTO customers(id, full_name, phone, messaging_handle, notes, is_active, created_at, updated_at)
     VALUES (?, ?, ?, NULL, NULL, 1, ?, ?)`,
  );
  const insertVehicle = database.prepare(
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, 1, ?, ?)`,
  );
  const insertVehicleOwnershipHistory = database.prepare(
    `INSERT INTO vehicle_ownership_history(
      id,
      vehicle_id,
      customer_id,
      changed_at,
      change_reason,
      source
    ) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insertAppointment = database.prepare(
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual', NULL, NULL, ?, ?)`,
  );
  const insertIntakeEvent = database.prepare(
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertWorkOrder = database.prepare(
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
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?)`,
  );

  try {
    database.exec("BEGIN TRANSACTION;");

    if (force) {
      clearAllData(database);
    }

    insertService.run(fixtures.service.id, fixtures.service.displayNameRu, fixtures.service.cityRu);

    for (const bay of fixtures.service.bays ?? []) {
      insertBay.run(bay.id, bay.name, nowIso, nowIso);
    }

    for (const employee of fixtures.employees ?? []) {
      insertEmployee.run(employee.id, employee.name, JSON.stringify(employee.roles ?? []), nowIso, nowIso);
    }

    for (const customer of fixtures.customers ?? []) {
      insertCustomer.run(customer.id, customer.name, customer.phone, nowIso, nowIso);
    }

    for (const vehicle of fixtures.vehicles ?? []) {
      const parsedLabel = parseVehicleLabel(vehicle.label);
      insertVehicle.run(
        vehicle.id,
        vehicle.customerId,
        vehicle.label,
        vehicle.vin ?? null,
        parsedLabel.plateNumber,
        parsedLabel.make,
        parsedLabel.model,
        nowIso,
        nowIso,
      );

      insertVehicleOwnershipHistory.run(
        `ownership-${vehicle.id}-seed`,
        vehicle.id,
        vehicle.customerId,
        nowIso,
        "initial_seed_owner",
        "seed",
      );
    }

    for (const appointment of fixtures.appointments ?? []) {
      insertAppointment.run(
        appointment.id,
        appointment.code,
        appointment.plannedStartLocal,
        appointment.customerId,
        appointment.vehicleId,
        appointment.customerName,
        appointment.vehicleLabel,
        appointment.complaint,
        appointment.status,
        appointment.bayId ?? bayIdByName.get(appointment.bayName) ?? null,
        appointment.bayName ?? null,
        appointment.primaryAssignee ?? null,
        nowIso,
        nowIso,
      );

      insertIntakeEvent.run(
        `intake-${appointment.id}`,
        "appointment",
        appointment.id,
        appointment.customerId,
        appointment.vehicleId,
        appointment.complaint,
        appointment.status,
        nowIso,
        nowIso,
      );
    }

    for (const order of fixtures.workOrders ?? []) {
      const orderCreatedAt = order.blockedSinceIso ?? nowIso;
      const closedAt = order.status === "completed" ? nowIso : null;

      insertWorkOrder.run(
        order.id,
        order.code,
        order.customerId,
        order.customerName,
        order.vehicleId,
        order.vehicleLabel,
        order.status,
        order.statusLabelRu,
        bayIdByName.get(order.bayName) ?? null,
        order.bayName ?? null,
        order.primaryAssignee ?? null,
        order.blockedSinceIso ?? null,
        order.balanceDueRub ?? 0,
        orderCreatedAt,
        closedAt,
        nowIso,
      );

      if (order.status === "waiting_diagnosis") {
        insertIntakeEvent.run(
          `intake-${order.id}`,
          "walk_in",
          null,
          order.customerId,
          order.vehicleId,
          `Первичный прием по заказ-наряду ${order.code}`,
          "accepted",
          orderCreatedAt,
          nowIso,
        );
      }
    }

    database.exec("COMMIT;");

    const counts = getSummaryCounts(database);
    logger.info("db_seed_applied", counts);

    return {
      seeded: true,
      reason: "seeded_from_fixture",
      counts,
    };
  } catch (error) {
    database.exec("ROLLBACK;");
    throw new Error(`Database seed failed: ${error.message}`);
  }
}

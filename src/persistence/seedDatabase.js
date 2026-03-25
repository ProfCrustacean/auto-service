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
    workOrderStatusHistory: getRowCount(database, "work_order_status_history"),
    workOrderPayments: getRowCount(database, "work_order_payments"),
    workOrderPartsRequests: getRowCount(database, "work_order_parts_requests"),
    partsPurchaseActions: getRowCount(database, "parts_purchase_actions"),
    workOrderPartsHistory: getRowCount(database, "work_order_parts_history"),
    appointmentWorkOrderLinks: getRowCount(database, "appointment_work_order_links"),
  };
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validateCollection(fixtures, field, errors) {
  const items = fixtures[field];
  if (items === undefined) {
    return [];
  }

  if (!Array.isArray(items)) {
    errors.push(`${field} must be an array`);
    return [];
  }

  const ids = new Set();
  for (const [index, item] of items.entries()) {
    const id = item?.id;
    if (!isNonEmptyString(id)) {
      errors.push(`${field}[${index}].id must be a non-empty string`);
      continue;
    }
    if (ids.has(id)) {
      errors.push(`${field} contains duplicate id '${id}'`);
      continue;
    }
    ids.add(id);
  }

  return items;
}

export function validateSeedFixtures(fixtures) {
  const errors = [];
  if (!fixtures || typeof fixtures !== "object" || Array.isArray(fixtures)) {
    errors.push("seed fixtures must be a JSON object");
  }

  const service = fixtures?.service;
  if (!service || typeof service !== "object" || Array.isArray(service)) {
    errors.push("service must be an object");
  } else {
    if (!isNonEmptyString(service.id)) {
      errors.push("service.id must be a non-empty string");
    }
    if (!isNonEmptyString(service.displayNameRu)) {
      errors.push("service.displayNameRu must be a non-empty string");
    }
    if (!isNonEmptyString(service.cityRu)) {
      errors.push("service.cityRu must be a non-empty string");
    }
    if (!Array.isArray(service.bays) || service.bays.length === 0) {
      errors.push("service.bays must be a non-empty array");
    }
  }

  const employees = validateCollection(fixtures ?? {}, "employees", errors);
  const customers = validateCollection(fixtures ?? {}, "customers", errors);
  const vehicles = validateCollection(fixtures ?? {}, "vehicles", errors);
  const appointments = validateCollection(fixtures ?? {}, "appointments", errors);
  const intakeEvents = validateCollection(fixtures ?? {}, "intakeEvents", errors);
  const workOrders = validateCollection(fixtures ?? {}, "workOrders", errors);
  const payments = validateCollection(fixtures ?? {}, "payments", errors);

  const customerIds = new Set(customers.map((item) => item.id));
  const vehicleIds = new Set(vehicles.map((item) => item.id));
  const appointmentIds = new Set(appointments.map((item) => item.id));

  for (const [index, vehicle] of vehicles.entries()) {
    if (!isNonEmptyString(vehicle.customerId)) {
      errors.push(`vehicles[${index}].customerId must be a non-empty string`);
      continue;
    }
    if (!customerIds.has(vehicle.customerId)) {
      errors.push(`vehicles[${index}] references unknown customerId '${vehicle.customerId}'`);
    }
  }

  for (const [index, appointment] of appointments.entries()) {
    if (!customerIds.has(appointment.customerId)) {
      errors.push(`appointments[${index}] references unknown customerId '${appointment.customerId}'`);
    }
    if (!vehicleIds.has(appointment.vehicleId)) {
      errors.push(`appointments[${index}] references unknown vehicleId '${appointment.vehicleId}'`);
    }
  }

  for (const [index, intake] of intakeEvents.entries()) {
    if (!customerIds.has(intake.customerId)) {
      errors.push(`intakeEvents[${index}] references unknown customerId '${intake.customerId}'`);
    }
    if (!vehicleIds.has(intake.vehicleId)) {
      errors.push(`intakeEvents[${index}] references unknown vehicleId '${intake.vehicleId}'`);
    }
    if (intake.sourceAppointmentId && !appointmentIds.has(intake.sourceAppointmentId)) {
      errors.push(
        `intakeEvents[${index}] references unknown sourceAppointmentId '${intake.sourceAppointmentId}'`,
      );
    }
  }

  for (const [index, workOrder] of workOrders.entries()) {
    if (!customerIds.has(workOrder.customerId)) {
      errors.push(`workOrders[${index}] references unknown customerId '${workOrder.customerId}'`);
    }
    if (!vehicleIds.has(workOrder.vehicleId)) {
      errors.push(`workOrders[${index}] references unknown vehicleId '${workOrder.vehicleId}'`);
    }
  }

  const workOrderIds = new Set(workOrders.map((item) => item.id));
  for (const [index, payment] of payments.entries()) {
    if (!workOrderIds.has(payment.workOrderId)) {
      errors.push(`payments[${index}] references unknown workOrderId '${payment.workOrderId}'`);
    }
    if (!isNonEmptyString(payment.paymentType)) {
      errors.push(`payments[${index}].paymentType must be a non-empty string`);
    }
    if (!isNonEmptyString(payment.paymentMethod)) {
      errors.push(`payments[${index}].paymentMethod must be a non-empty string`);
    }
    if (!Number.isInteger(payment.amountRub) || payment.amountRub <= 0) {
      errors.push(`payments[${index}].amountRub must be an integer > 0`);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
  };
}

function clearAllData(database) {
  database.exec("DELETE FROM work_order_payments;");
  database.exec("DELETE FROM work_order_parts_history;");
  database.exec("DELETE FROM parts_purchase_actions;");
  database.exec("DELETE FROM work_order_parts_requests;");
  database.exec("DELETE FROM appointment_work_order_links;");
  database.exec("DELETE FROM work_order_status_history;");
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

function syncCodeSequences(database) {
  const hasTable = database
    .prepare("SELECT COUNT(1) AS count FROM sqlite_master WHERE type = 'table' AND name = 'code_sequences'")
    .get()
    .count > 0;

  if (!hasTable) {
    return;
  }

  database
    .prepare("INSERT INTO code_sequences(entity, next_value) VALUES ('appointment', 1) ON CONFLICT(entity) DO NOTHING")
    .run();
  database
    .prepare("INSERT INTO code_sequences(entity, next_value) VALUES ('work_order', 1) ON CONFLICT(entity) DO NOTHING")
    .run();

  database
    .prepare(
      `UPDATE code_sequences
       SET next_value = COALESCE((
         SELECT MAX(CAST(substr(code, 5) AS INTEGER)) + 1
         FROM appointments
         WHERE code GLOB 'APT-[0-9]*'
       ), 1)
       WHERE entity = 'appointment'`,
    )
    .run();

  database
    .prepare(
      `UPDATE code_sequences
       SET next_value = COALESCE((
         SELECT MAX(CAST(substr(code, 4) AS INTEGER)) + 1
         FROM work_orders
         WHERE code GLOB 'WO-[0-9]*'
       ), 1)
       WHERE entity = 'work_order'`,
    )
    .run();
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
  const seedValidation = validateSeedFixtures(fixtures);
  if (!seedValidation.ok) {
    throw new Error(`Seed fixtures integrity check failed: ${seedValidation.errors.join("; ")}`);
  }
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
      labor_total_rub,
      outside_service_cost_rub,
      created_at,
      closed_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertWorkOrderStatusHistory = database.prepare(
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
  );
  const insertWorkOrderPayment = database.prepare(
    `INSERT INTO work_order_payments(
      id,
      work_order_id,
      payment_type,
      payment_method,
      amount_rub,
      note,
      recorded_at,
      recorded_by,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertWorkOrderPartsRequest = database.prepare(
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
  );
  const insertPartsPurchaseAction = database.prepare(
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
  );
  const insertWorkOrderPartsHistory = database.prepare(
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
        order.laborTotalRub ?? 0,
        order.outsideServiceCostRub ?? 0,
        orderCreatedAt,
        closedAt,
        nowIso,
      );

      insertWorkOrderStatusHistory.run(
        `woh-${order.id}-seed`,
        order.id,
        null,
        null,
        order.status,
        order.statusLabelRu,
        orderCreatedAt,
        "seed",
        "Initial seed lifecycle event",
        "seed",
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

    for (const payment of fixtures.payments ?? []) {
      const recordedAt = payment.recordedAt ?? nowIso;
      insertWorkOrderPayment.run(
        payment.id,
        payment.workOrderId,
        payment.paymentType,
        payment.paymentMethod,
        payment.amountRub,
        payment.note ?? null,
        recordedAt,
        payment.recordedBy ?? "seed",
        recordedAt,
        nowIso,
      );
    }

    const waitingPartsOrder = (fixtures.workOrders ?? []).find((order) => order.status === "waiting_parts");
    if (waitingPartsOrder) {
      const requestId = `wopr-${waitingPartsOrder.id}-1`;
      const purchaseActionId = `ppa-${waitingPartsOrder.id}-1`;
      const requestCreatedAt = waitingPartsOrder.blockedSinceIso ?? nowIso;
      const requestedAtDate = new Date(requestCreatedAt);
      const safeRequestedAtDate = Number.isNaN(requestedAtDate.getTime()) ? new Date(nowIso) : requestedAtDate;
      const substitutionRequestedAt = new Date(safeRequestedAtDate.getTime() - (1000 * 60 * 60 * 24 * 2)).toISOString();
      const substitutionResolvedAt = new Date(safeRequestedAtDate.getTime() - (1000 * 60 * 60 * 24)).toISOString();
      const replacementReceivedAt = new Date(safeRequestedAtDate.getTime() - (1000 * 60 * 60 * 12)).toISOString();

      insertWorkOrderPartsRequest.run(
        requestId,
        waitingPartsOrder.id,
        null,
        "Стойка стабилизатора передняя",
        "АвтоПоставка",
        "2026-03-24",
        1,
        3500,
        5200,
        "ordered",
        "Заказана",
        1,
        "Деталь в заказе по поставщику",
        requestCreatedAt,
        null,
        nowIso,
      );

      insertPartsPurchaseAction.run(
        purchaseActionId,
        requestId,
        "АвтоПоставка",
        `PO-${waitingPartsOrder.code}`,
        1,
        3500,
        "ordered",
        requestCreatedAt,
        null,
        "Ожидаем входящую поставку",
        requestCreatedAt,
        nowIso,
      );

      insertWorkOrderPartsHistory.run(
        `woph-${waitingPartsOrder.id}-request-seed`,
        waitingPartsOrder.id,
        requestId,
        null,
        null,
        null,
        "ordered",
        "Заказана",
        requestCreatedAt,
        "seed",
        "Initial seeded parts request",
        "seed",
        JSON.stringify({
          partName: "Стойка стабилизатора передняя",
          requestedQty: 1,
          isBlocking: true,
        }),
      );

      insertWorkOrderPartsHistory.run(
        `woph-${waitingPartsOrder.id}-purchase-seed`,
        waitingPartsOrder.id,
        requestId,
        purchaseActionId,
        null,
        null,
        "purchase_ordered",
        "Заказ поставщику оформлен",
        requestCreatedAt,
        "seed",
        "Initial seeded supplier purchase action",
        "seed",
        JSON.stringify({
          supplierName: "АвтоПоставка",
          supplierReference: `PO-${waitingPartsOrder.code}`,
          orderedQty: 1,
          unitCostRub: 3500,
        }),
      );

      const substitutedRequestId = `wopr-${waitingPartsOrder.id}-substituted`;
      const replacementRequestId = `wopr-${waitingPartsOrder.id}-replacement`;
      const replacementPurchaseActionId = `ppa-${waitingPartsOrder.id}-replacement`;

      insertWorkOrderPartsRequest.run(
        substitutedRequestId,
        waitingPartsOrder.id,
        null,
        "Опора амортизатора передняя",
        "БыстрыйСклад",
        "2026-03-20",
        1,
        2200,
        3500,
        "substituted",
        "Заменена",
        1,
        "Исходная позиция недоступна, оформлена замена",
        substitutionRequestedAt,
        substitutionResolvedAt,
        substitutionResolvedAt,
      );

      insertWorkOrderPartsRequest.run(
        replacementRequestId,
        waitingPartsOrder.id,
        substitutedRequestId,
        "Опора амортизатора передняя усиленная",
        "БыстрыйСклад",
        "2026-03-21",
        1,
        2600,
        3900,
        "received",
        "Получена",
        1,
        "Заменяющая позиция получена и доступна",
        substitutionResolvedAt,
        replacementReceivedAt,
        replacementReceivedAt,
      );

      insertPartsPurchaseAction.run(
        replacementPurchaseActionId,
        replacementRequestId,
        "БыстрыйСклад",
        `PO-${waitingPartsOrder.code}-R1`,
        1,
        2600,
        "received",
        substitutionResolvedAt,
        replacementReceivedAt,
        "Заменяющая позиция поставлена полностью",
        substitutionResolvedAt,
        replacementReceivedAt,
      );

      insertWorkOrderPartsHistory.run(
        `woph-${waitingPartsOrder.id}-sub-requested`,
        waitingPartsOrder.id,
        substitutedRequestId,
        null,
        null,
        null,
        "requested",
        "Запрошена",
        substitutionRequestedAt,
        "seed",
        "Initial seeded request before substitution",
        "seed",
        JSON.stringify({
          partName: "Опора амортизатора передняя",
          requestedQty: 1,
          isBlocking: true,
        }),
      );

      insertWorkOrderPartsHistory.run(
        `woph-${waitingPartsOrder.id}-sub-substituted`,
        waitingPartsOrder.id,
        substitutedRequestId,
        null,
        "requested",
        "Запрошена",
        "substituted",
        "Заменена",
        substitutionResolvedAt,
        "seed",
        "Seed substitution example",
        "seed",
        JSON.stringify({
          replacementPartName: "Опора амортизатора передняя усиленная",
        }),
      );

      insertWorkOrderPartsHistory.run(
        `woph-${waitingPartsOrder.id}-replacement-request`,
        waitingPartsOrder.id,
        replacementRequestId,
        null,
        null,
        null,
        "received",
        "Получена",
        replacementReceivedAt,
        "seed",
        "Replacement request resolved",
        "seed",
        JSON.stringify({
          replacementForRequestId: substitutedRequestId,
          partName: "Опора амортизатора передняя усиленная",
          requestedQty: 1,
        }),
      );

      insertWorkOrderPartsHistory.run(
        `woph-${waitingPartsOrder.id}-replacement-purchase`,
        waitingPartsOrder.id,
        replacementRequestId,
        replacementPurchaseActionId,
        null,
        null,
        "purchase_received",
        "Поставка получена",
        replacementReceivedAt,
        "seed",
        "Replacement purchase received",
        "seed",
        JSON.stringify({
          supplierName: "БыстрыйСклад",
          supplierReference: `PO-${waitingPartsOrder.code}-R1`,
          orderedQty: 1,
          unitCostRub: 2600,
        }),
      );
    }

    syncCodeSequences(database);

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

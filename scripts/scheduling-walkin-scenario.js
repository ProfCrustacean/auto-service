import {
  assertHarness,
  buildFailurePayload,
  expectStatus,
  isLocalBaseUrl,
  parseBooleanFlag,
  requestJson,
} from "./harness-diagnostics.js";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";

loadDotenvIntoProcessSync();
const baseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";

function resolveMode() {
  const hasNonDestructiveArg = process.argv.includes("--non-destructive");
  const hasDestructiveArg = process.argv.includes("--destructive");

  if (hasNonDestructiveArg && hasDestructiveArg) {
    throw new Error("cannot use --non-destructive and --destructive together");
  }

  const envMode = parseBooleanFlag(process.env.SCENARIO_NON_DESTRUCTIVE, "SCENARIO_NON_DESTRUCTIVE");

  if (hasNonDestructiveArg || envMode === true) {
    return {
      name: "non_destructive",
      source: hasNonDestructiveArg ? "arg" : "env",
      reason: "explicit_non_destructive",
    };
  }

  if (hasDestructiveArg || envMode === false) {
    return {
      name: "default",
      source: hasDestructiveArg ? "arg" : "env",
      reason: "explicit_destructive",
    };
  }

  if (!isLocalBaseUrl(baseUrl)) {
    return {
      name: "non_destructive",
      source: "auto",
      reason: "non_local_default",
    };
  }

  return {
    name: "default",
    source: "auto",
    reason: "local_default",
  };
}

function buildIsolation(mode, writesPerformed) {
  if (mode.name === "non_destructive") {
    return {
      strategy: "read_only",
      writesPerformed,
      cleanupStatus: "not_required",
    };
  }

  return {
    strategy: "write",
    writesPerformed,
    cleanupStatus: "not_performed",
  };
}

function buildUniqueSlot(token, hour = 13) {
  const date = new Date();
  const minute = Number.parseInt(token.slice(-2), 10) % 60;
  date.setHours(hour, minute, 0, 0);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

async function request(path, { step, method = "GET", body } = {}) {
  return requestJson(baseUrl, { step, path, method, body });
}

async function requestList(path, step) {
  const response = await request(path, { step });
  expectStatus(response, 200, step);
  assertHarness(Array.isArray(response.payload?.items), `${step} payload must include items array`, {
    step,
    method: response.method,
    path: response.path,
    url: response.url,
    responseStatus: response.status,
    responsePayload: response.payload,
  });
  return response.payload.items;
}

function buildPhoneSuffix(token) {
  const digitsOnly = token.replace(/\D/g, "");
  return digitsOnly.slice(-10).padStart(10, "0");
}

async function createScenarioCustomer(token) {
  const step = "provision_customer";
  const response = await request("/api/v1/customers", {
    step,
    method: "POST",
    body: {
      fullName: `Сценарий Клиент ${token}`,
      phone: `+7 ${buildPhoneSuffix(token)}`,
      notes: "Автогенерация ресурсом сценария",
    },
  });

  expectStatus(response, 201, step);
  assertHarness(response.payload?.item?.id, "scenario customer create response missing item.id", {
    step,
    method: response.method,
    path: response.path,
    url: response.url,
    responseStatus: response.status,
    responsePayload: response.payload,
  });
  return response.payload.item;
}

async function createScenarioVehicle(token, customerId) {
  const step = "provision_vehicle";
  const response = await request("/api/v1/vehicles", {
    step,
    method: "POST",
    body: {
      customerId,
      label: `Сценарий Авто ${token}`,
      plateNumber: `SC${buildPhoneSuffix(token).slice(-6)}`,
      notes: "Автогенерация ресурсом сценария",
    },
  });

  expectStatus(response, 201, step);
  assertHarness(response.payload?.item?.id, "scenario vehicle create response missing item.id", {
    step,
    method: response.method,
    path: response.path,
    url: response.url,
    responseStatus: response.status,
    responsePayload: response.payload,
  });
  return response.payload.item;
}

async function loadWriteModeResources(token) {
  let customers = await requestList("/api/v1/customers", "list_customers");
  let vehicles = await requestList("/api/v1/vehicles", "list_vehicles");

  const provisioned = {
    customers: 0,
    vehicles: 0,
    customerIds: [],
    vehicleIds: [],
  };

  if (customers.length === 0) {
    const createdCustomer = await createScenarioCustomer(token);
    customers = [...customers, createdCustomer];
    provisioned.customers += 1;
    provisioned.customerIds.push(createdCustomer.id);
  }

  if (vehicles.length === 0) {
    const owner = customers[0];
    assertHarness(owner?.id, "cannot provision vehicle: customer id is missing", {
      step: "provision_vehicle",
    });
    const createdVehicle = await createScenarioVehicle(token, owner.id);
    vehicles = [...vehicles, createdVehicle];
    provisioned.vehicles += 1;
    provisioned.vehicleIds.push(createdVehicle.id);
  }

  const bays = await requestList("/api/v1/bays", "list_bays");
  const employees = await requestList("/api/v1/employees", "list_employees");

  return {
    customers,
    vehicles,
    bays,
    employees,
    provisioned,
  };
}

function resolveScenarioResources({ customers, vehicles, bays, employees }) {
  assertHarness(customers.length >= 1, "expected at least one customer", {
    step: "resolve_resources",
    customerCount: customers.length,
  });
  assertHarness(vehicles.length >= 1, "expected at least one vehicle", {
    step: "resolve_resources",
    vehicleCount: vehicles.length,
  });

  const customerById = new Map(customers.map((customer) => [customer.id, customer]));

  const appointmentVehicle = vehicles.find((vehicle) => customerById.has(vehicle.customerId)) ?? vehicles[0];
  const appointmentCustomer = customerById.get(appointmentVehicle.customerId) ?? customers[0];

  const walkInVehicle = vehicles.find((vehicle) => vehicle.id !== appointmentVehicle.id) ?? appointmentVehicle;
  const walkInCustomer = customerById.get(walkInVehicle.customerId) ?? appointmentCustomer;

  const appointmentBayId = bays[0]?.id;
  const walkInBayId = bays.find((bay) => bay.id !== appointmentBayId)?.id ?? appointmentBayId;

  const appointmentAssignee = employees[0]?.name;
  const walkInAssignee = employees.find((employee) => employee.name !== appointmentAssignee)?.name ?? appointmentAssignee;

  return {
    appointmentCustomerId: appointmentCustomer.id,
    appointmentVehicleId: appointmentVehicle.id,
    walkInCustomerId: walkInCustomer.id,
    walkInVehicleId: walkInVehicle.id,
    appointmentBayId,
    walkInBayId,
    appointmentAssignee,
    walkInAssignee,
  };
}

async function runNonDestructiveScenario(mode) {
  const dashboard = await request("/api/v1/dashboard/today", { step: "dashboard_before" });
  expectStatus(dashboard, 200, "dashboard_before");

  const customers = await request("/api/v1/customers", { step: "list_customers" });
  expectStatus(customers, 200, "list_customers");
  assertHarness(customers.payload?.count >= 1, "expected at least one customer for read-only scenario", {
    step: "list_customers",
    method: customers.method,
    path: customers.path,
    url: customers.url,
    responseStatus: customers.status,
    responsePayload: customers.payload,
  });

  const vehicles = await request("/api/v1/vehicles", { step: "list_vehicles" });
  expectStatus(vehicles, 200, "list_vehicles");
  assertHarness(vehicles.payload?.count >= 1, "expected at least one vehicle for read-only scenario", {
    step: "list_vehicles",
    method: vehicles.method,
    path: vehicles.path,
    url: vehicles.url,
    responseStatus: vehicles.status,
    responsePayload: vehicles.payload,
  });

  const bays = await request("/api/v1/bays", { step: "list_bays" });
  expectStatus(bays, 200, "list_bays");

  const employees = await request("/api/v1/employees", { step: "list_employees" });
  expectStatus(employees, 200, "list_employees");

  const result = {
    status: "scheduling_walkin_scenario_passed",
    mode: mode.name,
    modeSource: mode.source,
    modeReason: mode.reason,
    baseUrl,
    writesPerformed: false,
    isolation: buildIsolation(mode, false),
    checks: {
      appointmentsToday: dashboard.payload.summary.appointmentsToday,
      activeWorkOrders: dashboard.payload.summary.activeWorkOrders,
      customers: customers.payload.count,
      vehicles: vehicles.payload.count,
      bays: bays.payload.count,
      employees: employees.payload.count,
    },
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function runDefaultScenario(mode) {
  const before = await request("/api/v1/dashboard/today", { step: "dashboard_before" });
  expectStatus(before, 200, "dashboard_before");

  const uniqueToken = `${Date.now()}`;
  const resourcesWithProvisioning = await loadWriteModeResources(uniqueToken);
  const resources = resolveScenarioResources(resourcesWithProvisioning);

  const plannedStartLocal = buildUniqueSlot(uniqueToken, 13);
  const appointmentCreateBody = {
    plannedStartLocal,
    customerId: resources.appointmentCustomerId,
    vehicleId: resources.appointmentVehicleId,
    complaint: `Scenario scheduling ${uniqueToken}`,
    status: "booked",
  };

  if (resources.appointmentBayId) {
    appointmentCreateBody.bayId = resources.appointmentBayId;
  }

  if (resources.appointmentAssignee) {
    appointmentCreateBody.primaryAssignee = resources.appointmentAssignee;
  }

  const createAppointment = await request("/api/v1/appointments", {
    step: "create_appointment",
    method: "POST",
    body: appointmentCreateBody,
  });
  expectStatus(createAppointment, 201, "create_appointment");
  assertHarness(createAppointment.payload?.item?.id, "appointment create response missing item.id", {
    step: "create_appointment",
    method: createAppointment.method,
    path: createAppointment.path,
    url: createAppointment.url,
    responseStatus: createAppointment.status,
    responsePayload: createAppointment.payload,
  });

  const appointmentId = createAppointment.payload.item.id;

  const confirmAppointment = await request(`/api/v1/appointments/${appointmentId}`, {
    step: "confirm_appointment",
    method: "PATCH",
    body: { status: "confirmed" },
  });
  expectStatus(confirmAppointment, 200, "confirm_appointment");

  const walkInCreateBody = {
    customerId: resources.walkInCustomerId,
    vehicleId: resources.walkInVehicleId,
    complaint: `Scenario walk-in ${uniqueToken}`,
  };

  if (resources.walkInBayId) {
    walkInCreateBody.bayId = resources.walkInBayId;
  }

  if (resources.walkInAssignee) {
    walkInCreateBody.primaryAssignee = resources.walkInAssignee;
  }

  const createWalkIn = await request("/api/v1/intake/walk-ins", {
    step: "create_walkin",
    method: "POST",
    body: walkInCreateBody,
  });
  expectStatus(createWalkIn, 201, "create_walkin");
  assertHarness(createWalkIn.payload?.item?.workOrder?.id, "walk-in create response missing workOrder.id", {
    step: "create_walkin",
    method: createWalkIn.method,
    path: createWalkIn.path,
    url: createWalkIn.url,
    responseStatus: createWalkIn.status,
    responsePayload: createWalkIn.payload,
  });

  const workOrderId = createWalkIn.payload.item.workOrder.id;

  const after = await request("/api/v1/dashboard/today", { step: "dashboard_after" });
  expectStatus(after, 200, "dashboard_after");

  assertHarness(
    after.payload.summary.appointmentsToday === before.payload.summary.appointmentsToday + 1,
    "appointmentsToday did not increment by 1",
    {
      step: "dashboard_after",
      beforeAppointments: before.payload.summary.appointmentsToday,
      afterAppointments: after.payload.summary.appointmentsToday,
      responsePayload: after.payload,
    },
  );
  assertHarness(
    after.payload.summary.activeWorkOrders === before.payload.summary.activeWorkOrders + 1,
    "activeWorkOrders did not increment by 1",
    {
      step: "dashboard_after",
      beforeActive: before.payload.summary.activeWorkOrders,
      afterActive: after.payload.summary.activeWorkOrders,
      responsePayload: after.payload,
    },
  );
  assertHarness(after.payload.appointments.some((item) => item.id === appointmentId), "appointment not present on day board", {
    step: "dashboard_after",
    appointmentId,
    responsePayload: after.payload,
  });
  assertHarness(after.payload.queues.active.some((item) => item.id === workOrderId), "walk-in work order not present in active queue", {
    step: "dashboard_after",
    workOrderId,
    responsePayload: after.payload,
  });

  const result = {
    status: "scheduling_walkin_scenario_passed",
    mode: mode.name,
    modeSource: mode.source,
    modeReason: mode.reason,
    baseUrl,
    writesPerformed: true,
    isolation: buildIsolation(mode, true),
    plannedStartLocal,
    appointmentId,
    appointmentCode: createAppointment.payload.item.code,
    workOrderId,
    workOrderCode: createWalkIn.payload.item.workOrder.code,
    checks: {
      appointmentsBefore: before.payload.summary.appointmentsToday,
      appointmentsAfter: after.payload.summary.appointmentsToday,
      activeBefore: before.payload.summary.activeWorkOrders,
      activeAfter: after.payload.summary.activeWorkOrders,
      dynamicResources: {
        appointmentCustomerId: resources.appointmentCustomerId,
        appointmentVehicleId: resources.appointmentVehicleId,
        walkInCustomerId: resources.walkInCustomerId,
        walkInVehicleId: resources.walkInVehicleId,
      },
      provisioning: resourcesWithProvisioning.provisioned,
    },
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

async function main() {
  const mode = resolveMode();

  if (mode.name === "non_destructive") {
    await runNonDestructiveScenario(mode);
    return;
  }

  await runDefaultScenario(mode);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify(buildFailurePayload("scheduling_walkin_scenario_failed", error))}\n`);
  process.exit(1);
});

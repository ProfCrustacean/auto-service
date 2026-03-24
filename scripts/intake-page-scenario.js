import {
  assertHarness,
  expectStatus,
} from "./harness-diagnostics.js";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";
import {
  buildScenarioIsolation,
  buildUniqueSlot,
  renderScenarioFailure,
  requestScenarioJson,
  requestScenarioText,
  runScenario,
  submitScenarioForm,
} from "./scenario-runtime.js";

loadDotenvIntoProcessSync();
const baseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";
const BLOCKING_APPOINTMENT_STATUSES = new Set(["booked", "confirmed", "arrived"]);

function parseMode(argv) {
  const args = Array.isArray(argv) ? argv : [];
  let mode = "booking";

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === "--mode") {
      const value = String(args[index + 1] ?? "").trim().toLowerCase();
      if (value !== "booking" && value !== "walkin") {
        throw new Error("--mode must be one of: booking, walkin");
      }
      mode = value;
      index += 1;
      continue;
    }

    if (token === "--non-destructive" || token === "--destructive") {
      continue;
    }

    throw new Error(`Unknown argument: ${token}`);
  }

  return mode;
}

const formConfigByMode = {
  booking: {
    pagePath: "/appointments/new?mode=booking",
    submitPath: "/appointments/new",
    openStep: "booking_page_open",
    lookupStep: "booking_lookup",
    invalidStep: "booking_invalid_submit",
    conflictStep: "booking_conflict_submit",
    submitStep: "booking_submit",
    detailStep: "booking_detail_page",
    headingSnippet: "Форма записи",
    lookupSnippet: "Авто",
    detailSnippet: "Запись APT-",
    successStatus: "booking_page_scenario_passed",
  },
  walkin: {
    pagePath: "/appointments/new?mode=walkin",
    submitPath: "/appointments/new",
    openStep: "walkin_page_open",
    lookupStep: "walkin_lookup",
    invalidStep: "walkin_invalid_submit",
    conflictStep: "walkin_mismatch_submit",
    submitStep: "walkin_submit",
    detailStep: "walkin_detail_page",
    headingSnippet: "Форма приема",
    lookupSnippet: "Клиенты",
    detailSnippet: "Заказ-наряд WO-",
    successStatus: "walkin_page_scenario_passed",
  },
};

async function request(path, { step, method = "GET", body } = {}) {
  return requestScenarioJson(baseUrl, path, { step, method, body });
}

async function requestPage(path, step) {
  return requestScenarioText(baseUrl, path, step);
}

async function submitForm(path, { step, payload, redirect = "manual" }) {
  return submitScenarioForm(baseUrl, path, { step, payload, redirect });
}

function expectTextIncludes(response, expectedSnippet, step, details = {}) {
  assertHarness(response.text.includes(expectedSnippet), `expected response text to include '${expectedSnippet}'`, {
    step,
    method: response.method,
    path: response.path,
    url: response.url,
    responseStatus: response.status,
    responseBodySnippet: response.text.slice(0, 500),
    ...details,
  });
}

function extractRedirectId(locationHeader, prefix) {
  const match = new RegExp(`^/${prefix}/([^?]+)`, "u").exec(locationHeader ?? "");
  return match ? match[1] : null;
}

function resolveCapacityConflictPayload(appointments) {
  if (!Array.isArray(appointments)) {
    return null;
  }

  const candidate = appointments.find((item) => (
    item
    && BLOCKING_APPOINTMENT_STATUSES.has(item.status)
    && typeof item.plannedStartLocal === "string"
    && item.plannedStartLocal.length > 0
    && (typeof item.bayId === "string" && item.bayId.length > 0
      || typeof item.primaryAssignee === "string" && item.primaryAssignee.length > 0)
    && typeof item.customerId === "string"
    && item.customerId.length > 0
    && typeof item.vehicleId === "string"
    && item.vehicleId.length > 0
  ));

  if (!candidate) {
    return null;
  }

  return {
    strategy: "capacity_conflict",
    expectedStatus: 303,
    payload: {
      plannedStartLocal: candidate.plannedStartLocal,
      customerId: candidate.customerId,
      vehicleId: candidate.vehicleId,
      complaint: "Scenario conflict check",
      bayId: candidate.bayId ?? undefined,
      primaryAssignee: candidate.primaryAssignee ?? undefined,
    },
    context: {
      appointmentId: candidate.id ?? null,
      appointmentCode: candidate.code ?? null,
      plannedStartLocal: candidate.plannedStartLocal,
      bayId: candidate.bayId ?? null,
      primaryAssignee: candidate.primaryAssignee ?? null,
    },
  };
}

function resolveVehicleMismatchPayload(customers, vehicles) {
  if (!Array.isArray(customers) || !Array.isArray(vehicles)) {
    return null;
  }

  for (const vehicle of vehicles) {
    const ownerId = vehicle?.customerId;
    if (typeof ownerId !== "string" || ownerId.length === 0) {
      continue;
    }

    const mismatchCustomer = customers.find((candidate) => {
      const customerId = candidate?.id;
      return typeof customerId === "string" && customerId.length > 0 && customerId !== ownerId;
    });

    if (mismatchCustomer) {
      return {
        strategy: "vehicle_mismatch_conflict",
        expectedStatus: 409,
        expectedMessage: "Авто не принадлежит выбранному клиенту",
        payload: {
          mode: "walkin",
          customerId: mismatchCustomer.id,
          vehicleId: vehicle.id,
          complaint: "Scenario mismatch conflict check",
        },
        context: {
          vehicleId: vehicle.id,
          vehicleOwnerId: ownerId,
          mismatchCustomerId: mismatchCustomer.id,
        },
      };
    }
  }

  return null;
}

async function runBookingNonDestructive(modeMeta, config) {
  const bookingPage = await requestPage(config.pagePath, config.openStep);
  assertHarness(bookingPage.status === 200, "booking page must return 200", {
    step: config.openStep,
    method: bookingPage.method,
    path: bookingPage.path,
    url: bookingPage.url,
    responseStatus: bookingPage.status,
    responseBodySnippet: bookingPage.text.slice(0, 500),
  });
  expectTextIncludes(bookingPage, "Новая запись", config.openStep);
  expectTextIncludes(bookingPage, config.headingSnippet, config.openStep);

  const lookupPage = await requestPage(`${config.pagePath}&q=Kia`, config.lookupStep);
  assertHarness(lookupPage.status === 200, "booking lookup page must return 200", {
    step: config.lookupStep,
    method: lookupPage.method,
    path: lookupPage.path,
    url: lookupPage.url,
    responseStatus: lookupPage.status,
    responseBodySnippet: lookupPage.text.slice(0, 500),
  });
  expectTextIncludes(lookupPage, config.lookupSnippet, config.lookupStep);

  const invalidSubmit = await submitForm(config.submitPath, {
    step: config.invalidStep,
    payload: {
      mode: "booking",
      plannedStartLocal: "2026-03-23 10:30",
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "",
    },
  });
  assertHarness(invalidSubmit.status === 400, "invalid booking submit must return 400", {
    step: config.invalidStep,
    method: invalidSubmit.method,
    path: invalidSubmit.path,
    url: invalidSubmit.url,
    responseStatus: invalidSubmit.status,
    responseBodySnippet: invalidSubmit.text.slice(0, 500),
  });
  expectTextIncludes(invalidSubmit, "Исправьте ошибки перед сохранением", config.invalidStep);

  const appointments = await request("/api/v1/appointments", { step: "booking_conflict_seed_probe" });
  expectStatus(appointments, 200, "booking_conflict_seed_probe");
  let conflictProbe = resolveCapacityConflictPayload(appointments.payload?.items);

  if (!conflictProbe) {
    const customers = await request("/api/v1/customers", { step: "booking_conflict_customers_probe" });
    expectStatus(customers, 200, "booking_conflict_customers_probe");
    const vehicles = await request("/api/v1/vehicles", { step: "booking_conflict_vehicles_probe" });
    expectStatus(vehicles, 200, "booking_conflict_vehicles_probe");
    conflictProbe = resolveVehicleMismatchPayload(customers.payload?.items, vehicles.payload?.items);
  }

  assertHarness(Boolean(conflictProbe), "non-destructive conflict probe requires at least one deterministic conflict path", {
    step: "booking_conflict_probe_prepare",
    appointmentsCount: Array.isArray(appointments.payload?.items) ? appointments.payload.items.length : null,
  });

  const conflictSubmit = await submitForm(config.submitPath, {
    step: config.conflictStep,
    payload: conflictProbe.payload,
  });

  if (conflictProbe.strategy === "capacity_conflict") {
    assertHarness(conflictSubmit.status === 303, "capacity-overlap booking submit must redirect with 303", {
      step: config.conflictStep,
      method: conflictSubmit.method,
      path: conflictSubmit.path,
      url: conflictSubmit.url,
      responseStatus: conflictSubmit.status,
      responseBodySnippet: conflictSubmit.text.slice(0, 500),
      location: conflictSubmit.location,
      conflictStrategy: conflictProbe.strategy,
      conflictContext: conflictProbe.context,
    });
    assertHarness(
      typeof conflictSubmit.location === "string" && conflictSubmit.location.startsWith("/appointments/"),
      "capacity-overlap submit must provide appointment redirect",
      {
        step: config.conflictStep,
        location: conflictSubmit.location,
        conflictStrategy: conflictProbe.strategy,
      },
    );
  } else {
    assertHarness(conflictSubmit.status === 409, "mismatch booking submit must return 409", {
      step: config.conflictStep,
      method: conflictSubmit.method,
      path: conflictSubmit.path,
      url: conflictSubmit.url,
      responseStatus: conflictSubmit.status,
      responseBodySnippet: conflictSubmit.text.slice(0, 500),
      conflictStrategy: conflictProbe.strategy,
      conflictContext: conflictProbe.context,
    });
    expectTextIncludes(conflictSubmit, conflictProbe.expectedMessage, config.conflictStep, {
      conflictStrategy: conflictProbe.strategy,
    });
  }

  process.stdout.write(`${JSON.stringify({
    status: config.successStatus,
    scenario: "intake_page",
    formMode: "booking",
    mode: modeMeta.name,
    modeSource: modeMeta.source,
    modeReason: modeMeta.reason,
    baseUrl,
    writesPerformed: false,
    isolation: buildScenarioIsolation(modeMeta, false),
    checks: {
      booking_page_open: "ok",
      booking_lookup: "ok",
      booking_invalid_submit: "ok",
      booking_conflict_submit: {
        status: "ok",
        strategy: conflictProbe.strategy,
        context: conflictProbe.context,
      },
    },
  }, null, 2)}\n`);
}

async function runBookingDefault(modeMeta, config) {
  const before = await request("/api/v1/dashboard/today", { step: "dashboard_before" });
  expectStatus(before, 200, "dashboard_before");

  const uniqueToken = `${Date.now()}`;
  const submit = await submitForm(config.submitPath, {
    step: config.submitStep,
    payload: {
      mode: "booking",
      plannedStartLocal: buildUniqueSlot(uniqueToken, 12),
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: `Scenario booking ${uniqueToken}`,
    },
    redirect: "manual",
  });

  assertHarness(submit.status === 303, "booking submit must redirect with 303", {
    step: config.submitStep,
    location: submit.location,
    responseStatus: submit.status,
  });
  assertHarness(typeof submit.location === "string" && submit.location.startsWith("/appointments/"), "booking submit missing redirect location", {
    step: config.submitStep,
    location: submit.location,
  });

  const appointmentId = extractRedirectId(submit.location, "appointments");
  assertHarness(Boolean(appointmentId), "unable to parse appointment id from redirect location", {
    step: config.submitStep,
    location: submit.location,
  });

  const appointmentApi = await request(`/api/v1/appointments/${appointmentId}`, { step: "booking_appointment_api" });
  expectStatus(appointmentApi, 200, "booking_appointment_api");

  const detailPage = await requestPage(submit.location, config.detailStep);
  assertHarness(detailPage.status === 200, "booking detail page must return 200", {
    step: config.detailStep,
    responseStatus: detailPage.status,
  });
  expectTextIncludes(detailPage, config.detailSnippet, config.detailStep);

  const after = await request("/api/v1/dashboard/today", { step: "dashboard_after" });
  expectStatus(after, 200, "dashboard_after");

  assertHarness(
    after.payload.summary.appointmentsToday === before.payload.summary.appointmentsToday + 1,
    "appointmentsToday did not increment by 1 after booking submit",
    {
      step: "dashboard_after",
      beforeAppointments: before.payload.summary.appointmentsToday,
      afterAppointments: after.payload.summary.appointmentsToday,
    },
  );

  process.stdout.write(`${JSON.stringify({
    status: config.successStatus,
    scenario: "intake_page",
    formMode: "booking",
    mode: modeMeta.name,
    modeSource: modeMeta.source,
    modeReason: modeMeta.reason,
    baseUrl,
    writesPerformed: true,
    isolation: buildScenarioIsolation(modeMeta, true),
    appointmentId,
    appointmentCode: appointmentApi.payload?.item?.code ?? null,
    checks: {
      appointmentsBefore: before.payload.summary.appointmentsToday,
      appointmentsAfter: after.payload.summary.appointmentsToday,
    },
  }, null, 2)}\n`);
}

async function runWalkInNonDestructive(modeMeta, config) {
  const intakePage = await requestPage(config.pagePath, config.openStep);
  assertHarness(intakePage.status === 200, "walk-in page must return 200", {
    step: config.openStep,
    responseStatus: intakePage.status,
  });
  expectTextIncludes(intakePage, "Новая запись", config.openStep);
  expectTextIncludes(intakePage, config.headingSnippet, config.openStep);

  const lookupPage = await requestPage(`${config.pagePath}&q=Kia`, config.lookupStep);
  assertHarness(lookupPage.status === 200, "walk-in lookup page must return 200", {
    step: config.lookupStep,
    responseStatus: lookupPage.status,
  });
  expectTextIncludes(lookupPage, config.lookupSnippet, config.lookupStep);
  expectTextIncludes(lookupPage, "Авто", config.lookupStep);

  const invalidSubmit = await submitForm(config.submitPath, {
    step: config.invalidStep,
    payload: {
      mode: "walkin",
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "",
    },
  });
  assertHarness(invalidSubmit.status === 400, "invalid walk-in submit must return 400", {
    step: config.invalidStep,
    responseStatus: invalidSubmit.status,
  });
  expectTextIncludes(invalidSubmit, "Исправьте ошибки перед сохранением", config.invalidStep);
  expectTextIncludes(invalidSubmit, "Опишите жалобу или запрос клиента", config.invalidStep);

  const mismatchSubmit = await submitForm(config.submitPath, {
    step: config.conflictStep,
    payload: {
      mode: "walkin",
      customerId: "cust-1",
      vehicleId: "veh-3",
      complaint: "Walk-in mismatch check",
    },
  });
  assertHarness(mismatchSubmit.status === 409, "mismatch walk-in submit must return 409", {
    step: config.conflictStep,
    responseStatus: mismatchSubmit.status,
  });
  expectTextIncludes(mismatchSubmit, "Авто не принадлежит выбранному клиенту", config.conflictStep);

  process.stdout.write(`${JSON.stringify({
    status: config.successStatus,
    scenario: "intake_page",
    formMode: "walkin",
    mode: modeMeta.name,
    modeSource: modeMeta.source,
    modeReason: modeMeta.reason,
    baseUrl,
    writesPerformed: false,
    isolation: buildScenarioIsolation(modeMeta, false),
    checks: ["walkin_page_open", "walkin_lookup", "walkin_invalid_submit", "walkin_mismatch_submit"],
  }, null, 2)}\n`);
}

async function runWalkInDefault(modeMeta, config) {
  const before = await request("/api/v1/dashboard/today", { step: "dashboard_before" });
  expectStatus(before, 200, "dashboard_before");

  const uniqueToken = `${Date.now()}`;
  const submit = await submitForm(config.submitPath, {
    step: config.submitStep,
    payload: {
      mode: "walkin",
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: `Scenario walk-in page ${uniqueToken}`,
    },
    redirect: "manual",
  });

  assertHarness(submit.status === 303, "walk-in submit must redirect with 303", {
    step: config.submitStep,
    location: submit.location,
    responseStatus: submit.status,
  });
  assertHarness(typeof submit.location === "string" && submit.location.startsWith("/work-orders/"), "walk-in submit missing redirect location", {
    step: config.submitStep,
    location: submit.location,
  });

  const workOrderId = extractRedirectId(submit.location, "work-orders");
  assertHarness(Boolean(workOrderId), "unable to parse work-order id from redirect location", {
    step: config.submitStep,
    location: submit.location,
  });

  const detailPage = await requestPage(submit.location, config.detailStep);
  assertHarness(detailPage.status === 200, "walk-in detail page must return 200", {
    step: config.detailStep,
    responseStatus: detailPage.status,
  });
  expectTextIncludes(detailPage, config.detailSnippet, config.detailStep);

  const after = await request("/api/v1/dashboard/today", { step: "dashboard_after" });
  expectStatus(after, 200, "dashboard_after");

  assertHarness(
    after.payload.summary.activeWorkOrders === before.payload.summary.activeWorkOrders + 1,
    "activeWorkOrders did not increment by 1 after walk-in submit",
    {
      step: "dashboard_after",
      beforeActiveWorkOrders: before.payload.summary.activeWorkOrders,
      afterActiveWorkOrders: after.payload.summary.activeWorkOrders,
    },
  );
  assertHarness(
    after.payload.summary.appointmentsToday === before.payload.summary.appointmentsToday,
    "walk-in submit must not change appointmentsToday",
    {
      step: "dashboard_after",
      beforeAppointments: before.payload.summary.appointmentsToday,
      afterAppointments: after.payload.summary.appointmentsToday,
    },
  );

  process.stdout.write(`${JSON.stringify({
    status: config.successStatus,
    scenario: "intake_page",
    formMode: "walkin",
    mode: modeMeta.name,
    modeSource: modeMeta.source,
    modeReason: modeMeta.reason,
    baseUrl,
    writesPerformed: true,
    isolation: buildScenarioIsolation(modeMeta, true),
    workOrderId,
    checks: {
      activeWorkOrdersBefore: before.payload.summary.activeWorkOrders,
      activeWorkOrdersAfter: after.payload.summary.activeWorkOrders,
    },
  }, null, 2)}\n`);
}

const selectedFormMode = parseMode(process.argv.slice(2));
const selectedConfig = formConfigByMode[selectedFormMode];

runScenario({
  baseUrl,
  runNonDestructive: async (modeMeta) => {
    if (selectedFormMode === "booking") {
      await runBookingNonDestructive(modeMeta, selectedConfig);
      return;
    }
    await runWalkInNonDestructive(modeMeta, selectedConfig);
  },
  runDefault: async (modeMeta) => {
    if (selectedFormMode === "booking") {
      await runBookingDefault(modeMeta, selectedConfig);
      return;
    }
    await runWalkInDefault(modeMeta, selectedConfig);
  },
}).catch((error) => {
  renderScenarioFailure("intake_page_scenario_failed", error);
  process.exit(1);
});

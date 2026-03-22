import {
  assertHarness,
  buildFailurePayload,
  expectStatus,
  failHarness,
  isLocalBaseUrl,
  parseBooleanFlag,
  requestJson,
  requestText,
} from "./harness-diagnostics.js";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";

loadDotenvIntoProcessSync();
const baseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";
const BLOCKING_APPOINTMENT_STATUSES = new Set(["booked", "confirmed", "arrived"]);

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

function buildUniqueSlot(token, hour = 12) {
  const date = new Date();
  const minute = Number.parseInt(token.slice(-2), 10) % 60;
  date.setHours(hour, minute, 0, 0);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toFormBody(payload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) {
      continue;
    }
    params.set(key, String(value));
  }
  return params.toString();
}

async function request(path, { step, method = "GET", body } = {}) {
  return requestJson(baseUrl, { step, path, method, body });
}

async function requestPage(path, step) {
  return requestText(baseUrl, { step, path });
}

async function submitForm(path, { step, payload, redirect = "manual" }) {
  const url = new URL(path, baseUrl).toString();

  let response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: toFormBody(payload),
      redirect,
    });
  } catch (error) {
    failHarness(`network request failed for POST ${path}`, {
      step,
      method: "POST",
      path,
      url,
      errorKind: "network",
      targetUrl: url,
    }, error);
  }

  let text;
  try {
    text = await response.text();
  } catch (error) {
    failHarness(`failed to read response text for POST ${path}`, {
      step,
      method: "POST",
      path,
      url,
      responseStatus: response.status,
      errorKind: "response_read",
    }, error);
  }

  return {
    method: "POST",
    path,
    url,
    status: response.status,
    text,
    location: response.headers.get("location"),
  };
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

function extractAppointmentId(locationHeader) {
  const match = /^\/appointments\/([^?]+)/u.exec(locationHeader ?? "");
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
    expectedMessage: "Конфликт загрузки в выбранном слоте",
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
        expectedMessage: "Авто не принадлежит выбранному клиенту",
        payload: {
          plannedStartLocal: buildUniqueSlot(`${Date.now()}`, 13),
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

async function runNonDestructiveScenario(mode) {
  const bookingPage = await requestPage("/appointments/new", "booking_page_open");
  assertHarness(bookingPage.status === 200, "booking page must return 200", {
    step: "booking_page_open",
    method: bookingPage.method,
    path: bookingPage.path,
    url: bookingPage.url,
    responseStatus: bookingPage.status,
    responseBodySnippet: bookingPage.text.slice(0, 500),
  });
  expectTextIncludes(bookingPage, "Новая запись", "booking_page_open");
  expectTextIncludes(bookingPage, "Форма записи", "booking_page_open");

  const lookupPage = await requestPage("/appointments/new?q=Kia", "booking_lookup");
  assertHarness(lookupPage.status === 200, "booking lookup page must return 200", {
    step: "booking_lookup",
    method: lookupPage.method,
    path: lookupPage.path,
    url: lookupPage.url,
    responseStatus: lookupPage.status,
    responseBodySnippet: lookupPage.text.slice(0, 500),
  });
  expectTextIncludes(lookupPage, "Авто", "booking_lookup");

  const invalidSubmit = await submitForm("/appointments/new", {
    step: "booking_invalid_submit",
    payload: {
      plannedStartLocal: "2026-03-23 10:30",
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "",
    },
  });
  assertHarness(invalidSubmit.status === 400, "invalid booking submit must return 400", {
    step: "booking_invalid_submit",
    method: invalidSubmit.method,
    path: invalidSubmit.path,
    url: invalidSubmit.url,
    responseStatus: invalidSubmit.status,
    responseBodySnippet: invalidSubmit.text.slice(0, 500),
  });
  expectTextIncludes(invalidSubmit, "Исправьте ошибки перед сохранением", "booking_invalid_submit");

  const appointments = await request("/api/v1/appointments", { step: "booking_conflict_seed_probe" });
  expectStatus(appointments, 200, "booking_conflict_seed_probe");
  const capacityConflict = resolveCapacityConflictPayload(appointments.payload?.items);

  let conflictProbe = capacityConflict;
  if (!conflictProbe) {
    const customers = await request("/api/v1/customers", { step: "booking_conflict_customers_probe" });
    expectStatus(customers, 200, "booking_conflict_customers_probe");
    const vehicles = await request("/api/v1/vehicles", { step: "booking_conflict_vehicles_probe" });
    expectStatus(vehicles, 200, "booking_conflict_vehicles_probe");
    conflictProbe = resolveVehicleMismatchPayload(customers.payload?.items, vehicles.payload?.items);
  }

  assertHarness(Boolean(conflictProbe), "non-destructive conflict probe requires at least one deterministic 409 path", {
    step: "booking_conflict_probe_prepare",
    appointmentsCount: Array.isArray(appointments.payload?.items) ? appointments.payload.items.length : null,
  });

  const conflictSubmit = await submitForm("/appointments/new", {
    step: "booking_conflict_submit",
    payload: conflictProbe.payload,
  });
  assertHarness(conflictSubmit.status === 409, "conflicting booking submit must return 409", {
    step: "booking_conflict_submit",
    method: conflictSubmit.method,
    path: conflictSubmit.path,
    url: conflictSubmit.url,
    responseStatus: conflictSubmit.status,
    responseBodySnippet: conflictSubmit.text.slice(0, 500),
    conflictStrategy: conflictProbe.strategy,
    conflictContext: conflictProbe.context,
  });
  expectTextIncludes(conflictSubmit, conflictProbe.expectedMessage, "booking_conflict_submit", {
    conflictStrategy: conflictProbe.strategy,
    conflictContext: conflictProbe.context,
  });

  process.stdout.write(
    `${JSON.stringify({
      status: "booking_page_scenario_passed",
      mode: mode.name,
      modeSource: mode.source,
      modeReason: mode.reason,
      baseUrl,
      writesPerformed: false,
      isolation: buildIsolation(mode, false),
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
    }, null, 2)}\n`,
  );
}

async function runDefaultScenario(mode) {
  const before = await request("/api/v1/dashboard/today", { step: "dashboard_before" });
  expectStatus(before, 200, "dashboard_before");

  const uniqueToken = `${Date.now()}`;
  const submit = await submitForm("/appointments/new", {
    step: "booking_submit",
    payload: {
      plannedStartLocal: buildUniqueSlot(uniqueToken, 12),
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: `Scenario booking ${uniqueToken}`,
    },
    redirect: "manual",
  });

  assertHarness(submit.status === 303, "booking submit must redirect with 303", {
    step: "booking_submit",
    method: submit.method,
    path: submit.path,
    url: submit.url,
    responseStatus: submit.status,
    responseBodySnippet: submit.text.slice(0, 500),
    location: submit.location,
  });
  assertHarness(typeof submit.location === "string" && submit.location.startsWith("/appointments/"), "booking submit missing redirect location", {
    step: "booking_submit",
    responseStatus: submit.status,
    location: submit.location,
  });

  const appointmentId = extractAppointmentId(submit.location);
  assertHarness(Boolean(appointmentId), "unable to parse appointment id from redirect location", {
    step: "booking_submit",
    location: submit.location,
  });

  const appointmentApi = await request(`/api/v1/appointments/${appointmentId}`, {
    step: "booking_appointment_api",
  });
  expectStatus(appointmentApi, 200, "booking_appointment_api");
  assertHarness(appointmentApi.payload?.item?.id === appointmentId, "created appointment lookup returned mismatched id", {
    step: "booking_appointment_api",
    appointmentId,
    responsePayload: appointmentApi.payload,
  });

  const detailPage = await requestPage(submit.location, "booking_detail_page");
  assertHarness(detailPage.status === 200, "booking detail page must return 200", {
    step: "booking_detail_page",
    method: detailPage.method,
    path: detailPage.path,
    url: detailPage.url,
    responseStatus: detailPage.status,
    responseBodySnippet: detailPage.text.slice(0, 500),
  });
  expectTextIncludes(detailPage, "Запись APT-", "booking_detail_page");

  const after = await request("/api/v1/dashboard/today", { step: "dashboard_after" });
  expectStatus(after, 200, "dashboard_after");

  assertHarness(
    after.payload.summary.appointmentsToday === before.payload.summary.appointmentsToday + 1,
    "appointmentsToday did not increment by 1 after booking submit",
    {
      step: "dashboard_after",
      beforeAppointments: before.payload.summary.appointmentsToday,
      afterAppointments: after.payload.summary.appointmentsToday,
      responsePayload: after.payload,
    },
  );
  assertHarness(after.payload.appointments.some((item) => item.id === appointmentId), "created appointment not present on board", {
    step: "dashboard_after",
    appointmentId,
    responsePayload: after.payload,
  });

  process.stdout.write(
    `${JSON.stringify({
      status: "booking_page_scenario_passed",
      mode: mode.name,
      modeSource: mode.source,
      modeReason: mode.reason,
      baseUrl,
      writesPerformed: true,
      isolation: buildIsolation(mode, true),
      appointmentId,
      appointmentCode: appointmentApi.payload.item.code,
      checks: {
        appointmentsBefore: before.payload.summary.appointmentsToday,
        appointmentsAfter: after.payload.summary.appointmentsToday,
      },
    }, null, 2)}\n`,
  );
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
  process.stderr.write(`${JSON.stringify(buildFailurePayload("booking_page_scenario_failed", error))}\n`);
  process.exit(1);
});

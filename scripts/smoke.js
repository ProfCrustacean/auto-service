import {
  assertHarness,
  buildFailurePayload,
  expectStatus,
  failHarness,
  requestJson,
  requestText,
} from "./harness-diagnostics.js";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";

loadDotenvIntoProcessSync();
const baseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";

function assertNonNegativeInteger(value, label, step, response) {
  assertHarness(Number.isInteger(value), `${label} must be an integer`, {
    step,
    responseStatus: response.status,
    responsePayload: response.payload,
  });
  assertHarness(value >= 0, `${label} must be >= 0`, {
    step,
    responseStatus: response.status,
    responsePayload: response.payload,
  });
}

async function main() {
  const health = await requestJson(baseUrl, {
    step: "healthz",
    path: "/healthz",
  });
  expectStatus(health, 200, "healthz");
  assertHarness(health.payload?.status === "ok", "healthz status must be ok", {
    step: "healthz",
    responseStatus: health.status,
    responsePayload: health.payload,
  });

  const dashboard = await requestJson(baseUrl, {
    step: "dashboard_api",
    path: "/api/v1/dashboard/today",
  });
  expectStatus(dashboard, 200, "dashboard_api");

  assertHarness(dashboard.payload?.summary && typeof dashboard.payload.summary === "object", "dashboard summary is missing", {
    step: "dashboard_api",
    responseStatus: dashboard.status,
    responsePayload: dashboard.payload,
  });
  assertHarness(dashboard.payload?.queues && typeof dashboard.payload.queues === "object", "dashboard queues are missing", {
    step: "dashboard_api",
    responseStatus: dashboard.status,
    responsePayload: dashboard.payload,
  });
  assertHarness(dashboard.payload?.week && typeof dashboard.payload.week === "object", "dashboard week payload is missing", {
    step: "dashboard_api",
    responseStatus: dashboard.status,
    responsePayload: dashboard.payload,
  });
  assertHarness(Array.isArray(dashboard.payload?.appointments), "dashboard appointments must be an array", {
    step: "dashboard_api",
    responseStatus: dashboard.status,
    responsePayload: dashboard.payload,
  });
  assertHarness(Array.isArray(dashboard.payload?.queues?.waitingParts), "dashboard waitingParts queue must be an array", {
    step: "dashboard_api",
    responseStatus: dashboard.status,
    responsePayload: dashboard.payload,
  });
  assertHarness(Array.isArray(dashboard.payload?.queues?.readyPickup), "dashboard readyPickup queue must be an array", {
    step: "dashboard_api",
    responseStatus: dashboard.status,
    responsePayload: dashboard.payload,
  });
  assertHarness(Array.isArray(dashboard.payload?.queues?.active), "dashboard active queue must be an array", {
    step: "dashboard_api",
    responseStatus: dashboard.status,
    responsePayload: dashboard.payload,
  });
  assertHarness(Array.isArray(dashboard.payload?.week?.days), "dashboard week days must be an array", {
    step: "dashboard_api",
    responseStatus: dashboard.status,
    responsePayload: dashboard.payload,
  });
  assertHarness(dashboard.payload.week.days.length === 7, "dashboard week must contain 7 days", {
    step: "dashboard_api",
    responseStatus: dashboard.status,
    responsePayload: dashboard.payload,
  });
  assertHarness(Array.isArray(dashboard.payload?.week?.byBay), "dashboard week.byBay must be an array", {
    step: "dashboard_api",
    responseStatus: dashboard.status,
    responsePayload: dashboard.payload,
  });
  assertHarness(Array.isArray(dashboard.payload?.week?.byAssignee), "dashboard week.byAssignee must be an array", {
    step: "dashboard_api",
    responseStatus: dashboard.status,
    responsePayload: dashboard.payload,
  });

  assertNonNegativeInteger(dashboard.payload.summary.appointmentsToday, "summary.appointmentsToday", "dashboard_api", dashboard);
  assertNonNegativeInteger(dashboard.payload.summary.waitingPartsCount, "summary.waitingPartsCount", "dashboard_api", dashboard);
  assertNonNegativeInteger(dashboard.payload.summary.readyForPickupCount, "summary.readyForPickupCount", "dashboard_api", dashboard);
  assertNonNegativeInteger(dashboard.payload.summary.activeWorkOrders, "summary.activeWorkOrders", "dashboard_api", dashboard);

  assertHarness(
    dashboard.payload.summary.appointmentsToday === dashboard.payload.appointments.length,
    "summary.appointmentsToday must match appointments array length",
    {
      step: "dashboard_api",
      responseStatus: dashboard.status,
      responsePayload: dashboard.payload,
    },
  );
  assertHarness(
    dashboard.payload.summary.waitingPartsCount === dashboard.payload.queues.waitingParts.length,
    "summary.waitingPartsCount must match waitingParts queue length",
    {
      step: "dashboard_api",
      responseStatus: dashboard.status,
      responsePayload: dashboard.payload,
    },
  );
  assertHarness(
    dashboard.payload.summary.readyForPickupCount === dashboard.payload.queues.readyPickup.length,
    "summary.readyForPickupCount must match readyPickup queue length",
    {
      step: "dashboard_api",
      responseStatus: dashboard.status,
      responsePayload: dashboard.payload,
    },
  );
  assertHarness(
    dashboard.payload.summary.activeWorkOrders === dashboard.payload.queues.active.length,
    "summary.activeWorkOrders must match active queue length",
    {
      step: "dashboard_api",
      responseStatus: dashboard.status,
      responsePayload: dashboard.payload,
    },
  );

  const appointments = await requestJson(baseUrl, {
    step: "appointments_api",
    path: "/api/v1/appointments",
  });
  expectStatus(appointments, 200, "appointments_api");
  assertHarness(Array.isArray(appointments.payload?.items), "appointments payload must include items array", {
    step: "appointments_api",
    responseStatus: appointments.status,
    responsePayload: appointments.payload,
  });
  assertNonNegativeInteger(appointments.payload.count, "appointments.count", "appointments_api", appointments);
  assertHarness(appointments.payload.count === appointments.payload.items.length, "appointments.count must match items length", {
    step: "appointments_api",
    responseStatus: appointments.status,
    responsePayload: appointments.payload,
  });

  const search = await requestJson(baseUrl, {
    step: "search_api",
    path: "/api/v1/search?q=A123AA13",
  });
  expectStatus(search, 200, "search_api");
  assertHarness(search.payload?.performed === true, "search_api performed flag must be true for non-empty query", {
    step: "search_api",
    responseStatus: search.status,
    responsePayload: search.payload,
  });
  assertHarness(Array.isArray(search.payload?.vehicles), "search_api vehicles must be an array", {
    step: "search_api",
    responseStatus: search.status,
    responsePayload: search.payload,
  });
  assertNonNegativeInteger(search.payload?.totals?.vehicles ?? -1, "search_api totals.vehicles", "search_api", search);

  const dashboardUi = await requestText(baseUrl, {
    step: "dashboard_ui",
    path: "/",
  });
  if (dashboardUi.status !== 200) {
    failHarness("unexpected response status for GET /", {
      step: "dashboard_ui",
      method: "GET",
      path: "/",
      url: dashboardUi.url,
      responseStatus: dashboardUi.status,
      responseBodySnippet: dashboardUi.text?.slice(0, 400),
    });
  }
  assertHarness(
    (dashboardUi.text.includes("Операционная доска") || dashboardUi.text.includes("Автосервис")) &&
      dashboardUi.text.includes("План недели: загрузка и перегруз") &&
      dashboardUi.text.includes("Быстрый поиск клиента и авто"),
    "Russian UI content missing",
    {
      step: "dashboard_ui",
      method: "GET",
      path: "/",
      url: dashboardUi.url,
      responseStatus: dashboardUi.status,
      responseBodySnippet: dashboardUi.text.slice(0, 400),
    },
  );

  const bookingUi = await requestText(baseUrl, {
    step: "booking_ui",
    path: "/appointments/new",
  });
  if (bookingUi.status !== 200) {
    failHarness("unexpected response status for GET /appointments/new", {
      step: "booking_ui",
      method: "GET",
      path: "/appointments/new",
      url: bookingUi.url,
      responseStatus: bookingUi.status,
      responseBodySnippet: bookingUi.text?.slice(0, 400),
    });
  }
  assertHarness(
    bookingUi.text.includes("Новая запись") &&
      bookingUi.text.includes("Форма записи"),
    "booking UI content missing",
    {
      step: "booking_ui",
      method: "GET",
      path: "/appointments/new",
      url: bookingUi.url,
      responseStatus: bookingUi.status,
      responseBodySnippet: bookingUi.text.slice(0, 400),
    },
  );

  const walkInUi = await requestText(baseUrl, {
    step: "walkin_ui",
    path: "/intake/walk-in",
  });
  if (walkInUi.status !== 200) {
    failHarness("unexpected response status for GET /intake/walk-in", {
      step: "walkin_ui",
      method: "GET",
      path: "/intake/walk-in",
      url: walkInUi.url,
      responseStatus: walkInUi.status,
      responseBodySnippet: walkInUi.text?.slice(0, 400),
    });
  }
  assertHarness(
    walkInUi.text.includes("Прием walk-in") &&
      walkInUi.text.includes("Форма intake"),
    "walk-in UI content missing",
    {
      step: "walkin_ui",
      method: walkInUi.method,
      path: walkInUi.path,
      url: walkInUi.url,
      responseStatus: walkInUi.status,
      responseBodySnippet: walkInUi.text.slice(0, 400),
    },
  );

  process.stdout.write(
    `${JSON.stringify({
      status: "smoke_passed",
      baseUrl,
      checks: ["healthz", "dashboard_api", "appointments_api", "search_api", "dashboard_ui", "booking_ui", "walkin_ui"],
    })}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify(buildFailurePayload("smoke_failed", error))}\n`);
  process.exit(1);
});

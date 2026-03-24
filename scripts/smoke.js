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
const DASHBOARD_ARRAY_FIELDS = [
  "appointments",
  "queues.waitingParts",
  "queues.waitingDiagnosis",
  "queues.waitingApproval",
  "queues.paused",
  "queues.readyPickup",
  "queues.active",
  "week.days",
  "week.byBay",
  "week.byAssignee",
];
const DASHBOARD_SUMMARY_FIELDS = [
  "summary.appointmentsToday",
  "summary.waitingDiagnosisCount",
  "summary.waitingApprovalCount",
  "summary.waitingPartsCount",
  "summary.pausedCount",
  "summary.readyForPickupCount",
  "summary.activeWorkOrders",
];
const DASHBOARD_LENGTH_PARITY = [
  ["summary.appointmentsToday", "appointments"],
  ["summary.waitingDiagnosisCount", "queues.waitingDiagnosis"],
  ["summary.waitingApprovalCount", "queues.waitingApproval"],
  ["summary.waitingPartsCount", "queues.waitingParts"],
  ["summary.pausedCount", "queues.paused"],
  ["summary.readyForPickupCount", "queues.readyPickup"],
  ["summary.activeWorkOrders", "queues.active"],
];
const UI_PAGES = [
  {
    step: "dashboard_ui",
    path: "/",
    snippets: ["План недели: загрузка и перегруз", "Быстрый поиск клиента и авто"],
    oneOf: ["Операционная доска", "Автосервис"],
  },
  {
    step: "booking_ui",
    path: "/appointments/new",
    snippets: ["Новая запись", "Форма записи"],
  },
  {
    step: "walkin_ui",
    path: "/appointments/new?mode=walkin",
    snippets: ["Новая запись", "Принять сейчас", "Форма приема"],
  },
  {
    step: "dispatch_board_ui",
    path: "/dispatch/board",
    snippets: ["Диспетчерская доска", "Неназначенные и переносы", 'id="dispatch-calendar"', 'id="dispatch-unassign-dropzone"'],
  },
];

function getPathValue(source, dottedPath) {
  return String(dottedPath)
    .split(".")
    .reduce((value, key) => (value == null ? undefined : value[key]), source);
}

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

function assertPageStatus(response, step, path) {
  if (response.status === 200) {
    return;
  }
  failHarness(`unexpected response status for GET ${path}`, {
    step,
    method: "GET",
    path,
    url: response.url,
    responseStatus: response.status,
    responseBodySnippet: response.text?.slice(0, 400),
  });
}

function assertIncludesAll(response, expectedSnippets, step) {
  for (const snippet of expectedSnippets) {
    assertHarness(response.text.includes(snippet), `expected UI snippet '${snippet}'`, {
      step,
      method: response.method,
      path: response.path,
      url: response.url,
      responseStatus: response.status,
      responseBodySnippet: response.text.slice(0, 400),
    });
  }
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

  for (const objectPath of ["summary", "queues", "week"]) {
    const value = getPathValue(dashboard.payload, objectPath);
    assertHarness(value && typeof value === "object" && !Array.isArray(value), `dashboard ${objectPath} is missing`, {
      step: "dashboard_api",
      responseStatus: dashboard.status,
      responsePayload: dashboard.payload,
    });
  }
  for (const arrayPath of DASHBOARD_ARRAY_FIELDS) {
    const value = getPathValue(dashboard.payload, arrayPath);
    assertHarness(Array.isArray(value), `dashboard ${arrayPath} must be an array`, {
      step: "dashboard_api",
      responseStatus: dashboard.status,
      responsePayload: dashboard.payload,
    });
  }
  assertHarness(dashboard.payload.week.days.length === 7, "dashboard week must contain 7 days", {
    step: "dashboard_api",
    responseStatus: dashboard.status,
    responsePayload: dashboard.payload,
  });
  for (const field of DASHBOARD_SUMMARY_FIELDS) {
    assertNonNegativeInteger(getPathValue(dashboard.payload, field), field, "dashboard_api", dashboard);
  }
  for (const [summaryField, arrayField] of DASHBOARD_LENGTH_PARITY) {
    const summaryValue = getPathValue(dashboard.payload, summaryField);
    const arrayValue = getPathValue(dashboard.payload, arrayField);
    assertHarness(summaryValue === arrayValue.length, `${summaryField} must match ${arrayField} queue length`, {
      step: "dashboard_api",
      responseStatus: dashboard.status,
      responsePayload: dashboard.payload,
    });
  }

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

  for (const page of UI_PAGES) {
    const response = await requestText(baseUrl, { step: page.step, path: page.path });
    assertPageStatus(response, page.step, page.path);
    if (Array.isArray(page.oneOf)) {
      assertHarness(page.oneOf.some((snippet) => response.text.includes(snippet)), `none of ${page.oneOf.join(", ")} found`, {
        step: page.step,
        method: response.method,
        path: response.path,
        url: response.url,
        responseStatus: response.status,
        responseBodySnippet: response.text.slice(0, 400),
      });
    }
    assertIncludesAll(response, page.snippets, page.step);
  }

  const dispatchBoardApi = await requestJson(baseUrl, {
    step: "dispatch_board_api",
    path: "/api/v1/dispatch/board",
  });
  expectStatus(dispatchBoardApi, 200, "dispatch_board_api");
  assertHarness(Array.isArray(dispatchBoardApi.payload?.resources), "dispatch board resources must be an array", {
    step: "dispatch_board_api",
    responseStatus: dispatchBoardApi.status,
    responsePayload: dispatchBoardApi.payload,
  });
  assertHarness(Array.isArray(dispatchBoardApi.payload?.events), "dispatch board events must be an array", {
    step: "dispatch_board_api",
    responseStatus: dispatchBoardApi.status,
    responsePayload: dispatchBoardApi.payload,
  });
  assertHarness(
    dispatchBoardApi.payload?.calendar?.engine === "event_calendar",
    "dispatch board calendar engine must be event_calendar",
    {
      step: "dispatch_board_api",
      responseStatus: dispatchBoardApi.status,
      responsePayload: dispatchBoardApi.payload,
    },
  );

  process.stdout.write(
    `${JSON.stringify({
      status: "smoke_passed",
      baseUrl,
      checks: [
        "healthz",
        "dashboard_api",
        "appointments_api",
        "search_api",
        "dashboard_ui",
        "booking_ui",
        "walkin_ui",
        "dispatch_board_api",
        "dispatch_board_ui",
      ],
    })}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify(buildFailurePayload("smoke_failed", error))}\n`);
  process.exit(1);
});

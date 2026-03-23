import {
  assertHarness,
  expectStatus,
} from "./harness-diagnostics.js";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";
import {
  buildScenarioIsolation,
  renderScenarioFailure,
  requestScenarioJson,
  requestScenarioText,
  runScenario,
  submitScenarioForm,
} from "./scenario-runtime.js";

loadDotenvIntoProcessSync();
const baseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";

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

function extractWorkOrderId(locationHeader) {
  const match = /^\/work-orders\/([^?]+)/u.exec(locationHeader ?? "");
  return match ? match[1] : null;
}

async function runNonDestructiveScenario(mode) {
  const intakePage = await requestPage("/intake/walk-in", "walkin_page_open");
  assertHarness(intakePage.status === 200, "walk-in page must return 200", {
    step: "walkin_page_open",
    method: intakePage.method,
    path: intakePage.path,
    url: intakePage.url,
    responseStatus: intakePage.status,
    responseBodySnippet: intakePage.text.slice(0, 500),
  });
  expectTextIncludes(intakePage, "Прием walk-in", "walkin_page_open");
  expectTextIncludes(intakePage, "Форма intake", "walkin_page_open");

  const lookupPage = await requestPage("/intake/walk-in?q=Kia", "walkin_lookup");
  assertHarness(lookupPage.status === 200, "walk-in lookup page must return 200", {
    step: "walkin_lookup",
    method: lookupPage.method,
    path: lookupPage.path,
    url: lookupPage.url,
    responseStatus: lookupPage.status,
    responseBodySnippet: lookupPage.text.slice(0, 500),
  });
  expectTextIncludes(lookupPage, "Клиенты", "walkin_lookup");
  expectTextIncludes(lookupPage, "Авто", "walkin_lookup");

  const invalidSubmit = await submitForm("/intake/walk-in", {
    step: "walkin_invalid_submit",
    payload: {
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "",
    },
  });
  assertHarness(invalidSubmit.status === 400, "invalid walk-in submit must return 400", {
    step: "walkin_invalid_submit",
    method: invalidSubmit.method,
    path: invalidSubmit.path,
    url: invalidSubmit.url,
    responseStatus: invalidSubmit.status,
    responseBodySnippet: invalidSubmit.text.slice(0, 500),
  });
  expectTextIncludes(invalidSubmit, "Исправьте ошибки перед сохранением", "walkin_invalid_submit");
  expectTextIncludes(invalidSubmit, "Опишите жалобу или запрос клиента", "walkin_invalid_submit");

  const mismatchSubmit = await submitForm("/intake/walk-in", {
    step: "walkin_mismatch_submit",
    payload: {
      customerId: "cust-1",
      vehicleId: "veh-3",
      complaint: "Walk-in mismatch check",
    },
  });
  assertHarness(mismatchSubmit.status === 409, "mismatch walk-in submit must return 409", {
    step: "walkin_mismatch_submit",
    method: mismatchSubmit.method,
    path: mismatchSubmit.path,
    url: mismatchSubmit.url,
    responseStatus: mismatchSubmit.status,
    responseBodySnippet: mismatchSubmit.text.slice(0, 500),
  });
  expectTextIncludes(mismatchSubmit, "Авто не принадлежит выбранному клиенту", "walkin_mismatch_submit");

  process.stdout.write(
    `${JSON.stringify({
      status: "walkin_page_scenario_passed",
      mode: mode.name,
      modeSource: mode.source,
      modeReason: mode.reason,
      baseUrl,
      writesPerformed: false,
      isolation: buildScenarioIsolation(mode, false),
      checks: ["walkin_page_open", "walkin_lookup", "walkin_invalid_submit", "walkin_mismatch_submit"],
    }, null, 2)}\n`,
  );
}

async function runDefaultScenario(mode) {
  const before = await request("/api/v1/dashboard/today", { step: "dashboard_before" });
  expectStatus(before, 200, "dashboard_before");

  const uniqueToken = `${Date.now()}`;
  const submit = await submitForm("/intake/walk-in", {
    step: "walkin_submit",
    payload: {
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: `Scenario walk-in page ${uniqueToken}`,
    },
    redirect: "manual",
  });

  assertHarness(submit.status === 303, "walk-in submit must redirect with 303", {
    step: "walkin_submit",
    method: submit.method,
    path: submit.path,
    url: submit.url,
    responseStatus: submit.status,
    responseBodySnippet: submit.text.slice(0, 500),
    location: submit.location,
  });
  assertHarness(typeof submit.location === "string" && submit.location.startsWith("/work-orders/"), "walk-in submit missing redirect location", {
    step: "walkin_submit",
    responseStatus: submit.status,
    location: submit.location,
  });

  const workOrderId = extractWorkOrderId(submit.location);
  assertHarness(Boolean(workOrderId), "unable to parse work-order id from redirect location", {
    step: "walkin_submit",
    location: submit.location,
  });

  const detailPage = await requestPage(submit.location, "walkin_detail_page");
  assertHarness(detailPage.status === 200, "walk-in detail page must return 200", {
    step: "walkin_detail_page",
    method: detailPage.method,
    path: detailPage.path,
    url: detailPage.url,
    responseStatus: detailPage.status,
    responseBodySnippet: detailPage.text.slice(0, 500),
  });
  expectTextIncludes(detailPage, "Заказ-наряд WO-", "walkin_detail_page");

  const after = await request("/api/v1/dashboard/today", { step: "dashboard_after" });
  expectStatus(after, 200, "dashboard_after");

  assertHarness(
    after.payload.summary.activeWorkOrders === before.payload.summary.activeWorkOrders + 1,
    "activeWorkOrders did not increment by 1 after walk-in submit",
    {
      step: "dashboard_after",
      beforeActiveWorkOrders: before.payload.summary.activeWorkOrders,
      afterActiveWorkOrders: after.payload.summary.activeWorkOrders,
      responsePayload: after.payload,
    },
  );
  assertHarness(
    after.payload.summary.appointmentsToday === before.payload.summary.appointmentsToday,
    "walk-in submit must not change appointmentsToday",
    {
      step: "dashboard_after",
      beforeAppointments: before.payload.summary.appointmentsToday,
      afterAppointments: after.payload.summary.appointmentsToday,
      responsePayload: after.payload,
    },
  );
  assertHarness(after.payload.queues.active.some((item) => item.id === workOrderId), "created work-order not present in active queue", {
    step: "dashboard_after",
    workOrderId,
    responsePayload: after.payload,
  });

  process.stdout.write(
    `${JSON.stringify({
      status: "walkin_page_scenario_passed",
      mode: mode.name,
      modeSource: mode.source,
      modeReason: mode.reason,
      baseUrl,
      writesPerformed: true,
      isolation: buildScenarioIsolation(mode, true),
      workOrderId,
      checks: {
        activeWorkOrdersBefore: before.payload.summary.activeWorkOrders,
        activeWorkOrdersAfter: after.payload.summary.activeWorkOrders,
      },
    }, null, 2)}\n`,
  );
}

runScenario({
  baseUrl,
  runNonDestructive: runNonDestructiveScenario,
  runDefault: runDefaultScenario,
}).catch((error) => {
  renderScenarioFailure("walkin_page_scenario_failed", error);
  process.exit(1);
});

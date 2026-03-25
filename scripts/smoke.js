import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";

loadDotenvIntoProcessSync();

const baseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";

function fail(step, message, extra = {}) {
  const payload = {
    status: "smoke_failed",
    step,
    message,
    ...extra,
  };
  process.stderr.write(`${JSON.stringify(payload)}\n`);
  process.exit(1);
}

async function requestJson(step, path) {
  const url = `${baseUrl}${path}`;
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    fail(step, "request failed", {
      method: "GET",
      path,
      url,
      error: error.message,
    });
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // ignored
  }

  return {
    response,
    payload,
    url,
    path,
  };
}

async function requestText(step, path) {
  const url = `${baseUrl}${path}`;
  let response;
  try {
    response = await fetch(url);
  } catch (error) {
    fail(step, "request failed", {
      method: "GET",
      path,
      url,
      error: error.message,
    });
  }

  const text = await response.text();
  return {
    response,
    text,
    url,
    path,
  };
}

function assertStatus(step, response, expectedStatus, context = {}) {
  if (response.status === expectedStatus) {
    return;
  }

  fail(step, `unexpected HTTP status (expected ${expectedStatus}, got ${response.status})`, {
    responseStatus: response.status,
    ...context,
  });
}

function assertCondition(step, condition, message, context = {}) {
  if (!condition) {
    fail(step, message, context);
  }
}

function assertUiIncludes(step, page, snippets) {
  for (const snippet of snippets) {
    if (!page.text.includes(snippet)) {
      fail(step, `missing UI snippet: ${snippet}`, {
        path: page.path,
        url: page.url,
        responseStatus: page.response.status,
        responseBodySnippet: page.text.slice(0, 400),
      });
    }
  }
}

async function main() {
  const checks = [];

  const health = await requestJson("healthz", "/healthz");
  assertStatus("healthz", health.response, 200, { payload: health.payload });
  assertCondition("healthz", health.payload?.status === "ok", "healthz status must be ok", {
    payload: health.payload,
  });
  checks.push("healthz");

  const dashboard = await requestJson("dashboard_api", "/api/v1/dashboard/today");
  assertStatus("dashboard_api", dashboard.response, 200, { payload: dashboard.payload });
  assertCondition("dashboard_api", dashboard.payload && typeof dashboard.payload === "object", "dashboard payload must be object", {
    payload: dashboard.payload,
  });
  assertCondition("dashboard_api", Array.isArray(dashboard.payload?.appointments), "dashboard appointments must be array", {
    payload: dashboard.payload,
  });
  assertCondition("dashboard_api", dashboard.payload?.summary && typeof dashboard.payload.summary === "object", "dashboard summary must be object", {
    payload: dashboard.payload,
  });
  checks.push("dashboard_api");

  const appointments = await requestJson("appointments_api", "/api/v1/appointments");
  assertStatus("appointments_api", appointments.response, 200, { payload: appointments.payload });
  assertCondition("appointments_api", Array.isArray(appointments.payload?.items), "appointments payload must include items array", {
    payload: appointments.payload,
  });
  checks.push("appointments_api");

  const workOrders = await requestJson("work_orders_api", "/api/v1/work-orders");
  assertStatus("work_orders_api", workOrders.response, 200, { payload: workOrders.payload });
  assertCondition("work_orders_api", Array.isArray(workOrders.payload?.items), "work-orders payload must include items array", {
    payload: workOrders.payload,
  });
  checks.push("work_orders_api");

  const search = await requestJson("search_api", "/api/v1/search?q=A123AA13");
  assertStatus("search_api", search.response, 200, { payload: search.payload });
  assertCondition("search_api", search.payload?.performed === true, "search should be marked as performed", {
    payload: search.payload,
  });
  checks.push("search_api");

  const dashboardUi = await requestText("dashboard_ui", "/");
  assertStatus("dashboard_ui", dashboardUi.response, 200);
  assertCondition(
    "dashboard_ui",
    dashboardUi.text.includes("Операционная доска") || dashboardUi.text.includes("Автосервис"),
    "dashboard page missing expected title",
    {
      path: dashboardUi.path,
      url: dashboardUi.url,
      responseBodySnippet: dashboardUi.text.slice(0, 400),
    },
  );
  assertUiIncludes("dashboard_ui", dashboardUi, ["Быстрый поиск клиента и авто", "План недели: загрузка и перегруз"]);
  checks.push("dashboard_ui");

  const bookingUi = await requestText("booking_ui", "/appointments/new");
  assertStatus("booking_ui", bookingUi.response, 200);
  assertUiIncludes("booking_ui", bookingUi, ["Новая запись", "Форма записи"]);
  checks.push("booking_ui");

  const walkInUi = await requestText("walkin_ui", "/appointments/new?mode=walkin");
  assertStatus("walkin_ui", walkInUi.response, 200);
  assertUiIncludes("walkin_ui", walkInUi, ["Новая запись", "Принять сейчас", "Форма приема"]);
  checks.push("walkin_ui");

  const activeWorkOrdersUi = await requestText("work_orders_active_ui", "/work-orders/active");
  assertStatus("work_orders_active_ui", activeWorkOrdersUi.response, 200);
  assertCondition(
    "work_orders_active_ui",
    activeWorkOrdersUi.text.includes("Активная очередь заказ-нарядов")
      || activeWorkOrdersUi.text.includes("Активные заказ-наряды"),
    "active work-orders page missing expected heading",
    {
      path: activeWorkOrdersUi.path,
      url: activeWorkOrdersUi.url,
      responseStatus: activeWorkOrdersUi.response.status,
      responseBodySnippet: activeWorkOrdersUi.text.slice(0, 400),
    },
  );
  checks.push("work_orders_active_ui");

  process.stdout.write(`${JSON.stringify({ status: "smoke_passed", baseUrl, checks })}\n`);
}

main().catch((error) => {
  fail("smoke", error.message);
});

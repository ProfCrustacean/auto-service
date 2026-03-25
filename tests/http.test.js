import test from "node:test";
import assert from "node:assert/strict";
import { withTestServer } from "./helpers/httpHarness.js";

test("health and dashboard endpoints return successful responses", async () => {
  await withTestServer("auto-service-http-test", async ({ baseUrl }) => {

    const healthRes = await fetch(`${baseUrl}/healthz`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.status, "ok");

    const dashboardRes = await fetch(`${baseUrl}/api/v1/dashboard/today`);
    assert.equal(dashboardRes.status, 200);
    const dashboard = await dashboardRes.json();
    assert.equal(dashboard.summary.appointmentsToday, dashboard.appointments.length);
    assert.equal(dashboard.summary.waitingPartsCount, 1);
    assert.equal(Array.isArray(dashboard.week.days), true);
    assert.equal(dashboard.week.days.length, 7);
    assert.equal(Array.isArray(dashboard.week.byBay), true);
    assert.equal(Array.isArray(dashboard.week.byAssignee), true);
    assert.equal(dashboard.search.performed, false);
    assert.equal(typeof dashboard.reporting.completedWorkOrdersCount, "number");
    assert.equal(typeof dashboard.reporting.totalRevenueRub, "number");

    const reportRes = await fetch(`${baseUrl}/api/v1/reports/operations`);
    assert.equal(reportRes.status, 200);
    const report = await reportRes.json();
    assert.equal(typeof report.completedWorkOrdersCount, "number");
    assert.equal(typeof report.laborRevenueRub, "number");
    assert.equal(typeof report.partsRevenueRub, "number");
    assert.equal(typeof report.openBalancesRub, "number");

    const uiRes = await fetch(baseUrl);
    assert.equal(uiRes.status, 200);
    const html = await uiRes.text();
    assert.match(html, /Диспетчер действий/);
    assert.match(html, /Финансовый срез \(месяц\)/);
    assert.match(html, /План недели: загрузка и перегруз/);
    assert.match(html, /Операционные очереди/);
    assert.match(html, /Нагрузка по сотрудникам \(день\)/);
    const todayDateMatches = [...html.matchAll(/Сегодня:\s\d{2}\.\d{2}\.\d{4}/gu)];
    assert.ok(todayDateMatches.length >= 2);
    const loadWrapMatches = html.match(/class="table-wrap load-table-wrap"/gu) ?? [];
    assert.equal(loadWrapMatches.length, 2);
    const loadTableMatches = html.match(/<table class="load-table">/gu) ?? [];
    assert.equal(loadTableMatches.length, 2);

    const dashboardSearchRes = await fetch(`${baseUrl}/api/v1/dashboard/today?q=Focus`);
    assert.equal(dashboardSearchRes.status, 200);
    const dashboardSearch = await dashboardSearchRes.json();
    assert.equal(dashboardSearch.search.performed, true);
    assert.ok(dashboardSearch.search.totals.vehicles >= 1);

    const searchRes = await fetch(`${baseUrl}/api/v1/search?q=A123AA13`);
    assert.equal(searchRes.status, 200);
    const search = await searchRes.json();
    assert.equal(search.performed, true);
    assert.ok(search.totals.vehicles >= 1);
    assert.equal(search.vehicles.some((item) => item.id === "veh-1"), true);

    const workOrdersApiRes = await fetch(`${baseUrl}/api/v1/work-orders`);
    assert.equal(workOrdersApiRes.status, 200);
    const workOrdersApi = await workOrdersApiRes.json();
    assert.equal(Array.isArray(workOrdersApi.items), true);
    assert.ok(workOrdersApi.count >= 1);

    const workOrderApiDetail = await fetch(`${baseUrl}/api/v1/work-orders/wo-1005`);
    assert.equal(workOrderApiDetail.status, 200);
    const workOrderApiPayload = await workOrderApiDetail.json();
    assert.equal(workOrderApiPayload.item.id, "wo-1005");
    assert.equal(Array.isArray(workOrderApiPayload.item.statusHistory), true);
    assert.ok(workOrderApiPayload.item.statusHistory.length >= 1);

    const searchUiRes = await fetch(`${baseUrl}/?q=E321EE13`);
    assert.equal(searchUiRes.status, 200);
    const searchHtml = await searchUiRes.text();
    assert.match(searchHtml, /Всего совпадений/);
    assert.match(searchHtml, /Ford Focus/);

    const woRes = await fetch(`${baseUrl}/work-orders/wo-1005`);
    assert.equal(woRes.status, 200);
    const woHtml = await woRes.text();
    assert.match(woHtml, /Заказ-наряд WO-1005/);

    const bookingRes = await fetch(`${baseUrl}/appointments/new`);
    assert.equal(bookingRes.status, 200);
    const bookingHtml = await bookingRes.text();
    assert.match(bookingHtml, /Новая запись/);
    assert.match(bookingHtml, /Форма записи/);

    const walkInModeRes = await fetch(`${baseUrl}/appointments/new?mode=walkin`);
    assert.equal(walkInModeRes.status, 200);
    const walkInModeHtml = await walkInModeRes.text();
    assert.match(walkInModeHtml, /Форма приема/);
    assert.match(walkInModeHtml, /Принять без записи/);

    const picoAssetRes = await fetch(`${baseUrl}/assets/vendor/pico.min.css`);
    assert.equal(picoAssetRes.status, 200);
    assert.match(picoAssetRes.headers.get("content-type") ?? "", /text\/css/u);

    const appAssetRes = await fetch(`${baseUrl}/assets/css/app.css`);
    assert.equal(appAssetRes.status, 200);
    assert.match(appAssetRes.headers.get("content-type") ?? "", /text\/css/u);
  });
});

test("malformed JSON request body returns structured validation error", async () => {
  await withTestServer("auto-service-http-json-error-test", async ({ baseUrl }) => {

    const response = await fetch(`${baseUrl}/api/v1/appointments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer owner-dev-token",
      },
      body: "{\"plannedStartLocal\":\"2026-03-22 09:00\",}",
    });

    assert.equal(response.status, 400);
    assert.match(response.headers.get("content-type") ?? "", /application\/json/i);

    const payload = await response.json();
    assert.equal(payload?.error?.code, "validation_error");
    assert.equal(payload?.error?.message, "Request validation failed");
    assert.equal(Array.isArray(payload?.error?.details), true);
    assert.equal(payload.error.details.some((detail) => detail.field === "body"), true);

    const serialized = JSON.stringify(payload);
    assert.equal(serialized.includes("SyntaxError"), false);
    assert.equal(serialized.includes("/Users/"), false);
  });
});

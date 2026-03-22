import test from "node:test";
import assert from "node:assert/strict";
import { closeServer, createTempDatabase, makeServer, waitForServer } from "./helpers/httpHarness.js";

test("health and dashboard endpoints return successful responses", async () => {
  const tempDb = createTempDatabase("auto-service-http-test");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const healthRes = await fetch(`${baseUrl}/healthz`);
    assert.equal(healthRes.status, 200);
    const health = await healthRes.json();
    assert.equal(health.status, "ok");

    const dashboardRes = await fetch(`${baseUrl}/api/v1/dashboard/today`);
    assert.equal(dashboardRes.status, 200);
    const dashboard = await dashboardRes.json();
    assert.equal(dashboard.summary.appointmentsToday, 1);
    assert.equal(dashboard.summary.waitingPartsCount, 1);
    assert.equal(Array.isArray(dashboard.week.days), true);
    assert.equal(dashboard.week.days.length, 7);
    assert.equal(Array.isArray(dashboard.week.byBay), true);
    assert.equal(Array.isArray(dashboard.week.byAssignee), true);
    assert.equal(dashboard.search.performed, false);

    const uiRes = await fetch(baseUrl);
    assert.equal(uiRes.status, 200);
    const html = await uiRes.text();
    assert.match(html, /Диспетчер действий/);
    assert.match(html, /План недели: загрузка и перегруз/);
    assert.match(html, /Быстрый поиск клиента и авто/);
    assert.match(html, /Готово к выдаче, но не оплачено/);

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

    const searchUiRes = await fetch(`${baseUrl}/?q=E321EE13`);
    assert.equal(searchUiRes.status, 200);
    const searchHtml = await searchUiRes.text();
    assert.match(searchHtml, /Всего совпадений/);
    assert.match(searchHtml, /Ford Focus/);

    const woRes = await fetch(`${baseUrl}/work-orders/wo-1005`);
    assert.equal(woRes.status, 200);
    const woHtml = await woRes.text();
    assert.match(woHtml, /Заказ-наряд WO-1005/);

    const intakeRes = await fetch(`${baseUrl}/intake/walk-in`);
    assert.equal(intakeRes.status, 200);
    const intakeHtml = await intakeRes.text();
    assert.match(intakeHtml, /Прием walk-in/);
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

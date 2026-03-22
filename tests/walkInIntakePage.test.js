import test from "node:test";
import assert from "node:assert/strict";
import {
  closeServer,
  createTempDatabase,
  makeServer,
  requestJson,
  waitForServer,
} from "./helpers/httpHarness.js";

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

async function submitWalkInForm(url, payload, { redirect = "follow" } = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: toFormBody(payload),
    redirect,
  });

  const text = await response.text();
  return {
    status: response.status,
    text,
    location: response.headers.get("location"),
  };
}

function extractWorkOrderId(locationHeader) {
  const match = /^\/work-orders\/([^?]+)/u.exec(locationHeader ?? "");
  return match ? match[1] : null;
}

test("intake/walk-in renders production intake form and lookup results", async () => {
  const tempDb = createTempDatabase("auto-service-walkin-page-render");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const pageRes = await fetch(`${baseUrl}/intake/walk-in`);
    assert.equal(pageRes.status, 200);
    const html = await pageRes.text();
    assert.match(html, /Прием walk-in/u);
    assert.match(html, /Быстрый поиск клиента и авто/u);
    assert.match(html, /Форма intake/u);
    assert.doesNotMatch(html, /Экран будет реализован/u);

    const lookupRes = await fetch(`${baseUrl}/intake/walk-in?q=Kia`);
    assert.equal(lookupRes.status, 200);
    const lookupHtml = await lookupRes.text();
    assert.match(lookupHtml, /Клиенты/u);
    assert.match(lookupHtml, /Авто/u);
    assert.match(lookupHtml, /Kia Rio/u);
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

test("intake/walk-in returns actionable validation/domain errors without losing input", async () => {
  const tempDb = createTempDatabase("auto-service-walkin-page-errors");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const invalid = await submitWalkInForm(`${baseUrl}/intake/walk-in`, {
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "",
    });

    assert.equal(invalid.status, 400);
    assert.match(invalid.text, /Исправьте ошибки перед сохранением/u);
    assert.match(invalid.text, /Опишите жалобу или запрос клиента/u);

    const mismatch = await submitWalkInForm(`${baseUrl}/intake/walk-in`, {
      customerId: "cust-1",
      vehicleId: "veh-3",
      complaint: "Проверка несоответствия клиента и авто",
    });

    assert.equal(mismatch.status, 409);
    assert.match(mismatch.text, /Авто не принадлежит выбранному клиенту/u);
    assert.match(mismatch.text, /Проверка несоответствия клиента и авто/u);
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

test("intake/walk-in submits successfully and redirects to created work-order detail", async () => {
  const tempDb = createTempDatabase("auto-service-walkin-page-submit");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const beforeDashboard = await requestJson("GET", `${baseUrl}/api/v1/dashboard/today`);
    assert.equal(beforeDashboard.status, 200);

    const submit = await submitWalkInForm(
      `${baseUrl}/intake/walk-in`,
      {
        customerId: "cust-2",
        vehicleId: "veh-3",
        complaint: "Walk-in: нестабильная работа двигателя",
        bayId: "bay-2",
      },
      { redirect: "manual" },
    );

    assert.equal(submit.status, 303);
    assert.match(submit.location ?? "", /^\/work-orders\/[^?]+\?created=1/u);

    const workOrderId = extractWorkOrderId(submit.location);
    assert.equal(Boolean(workOrderId), true);

    const detailRes = await fetch(`${baseUrl}${submit.location}`);
    assert.equal(detailRes.status, 200);
    const detailHtml = await detailRes.text();
    assert.match(detailHtml, /Заказ-наряд WO-/u);

    const afterDashboard = await requestJson("GET", `${baseUrl}/api/v1/dashboard/today`);
    assert.equal(afterDashboard.status, 200);
    assert.equal(
      afterDashboard.json.summary.activeWorkOrders,
      beforeDashboard.json.summary.activeWorkOrders + 1,
    );
    assert.equal(
      afterDashboard.json.summary.appointmentsToday,
      beforeDashboard.json.summary.appointmentsToday,
    );
    assert.equal(afterDashboard.json.queues.active.some((item) => item.id === workOrderId), true);
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

test("intake/walk-in supports inline customer+vehicle creation in a single submit", async () => {
  const tempDb = createTempDatabase("auto-service-walkin-page-inline-create");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const token = `${Date.now()}`;

    const fullName = `WalkIn Клиент ${token}`;
    const phone = `+7 937 ${token.slice(-3)} ${token.slice(-3)} ${token.slice(-2)}`;
    const vehicleLabel = `WalkIn Авто ${token}`;

    const submit = await submitWalkInForm(
      `${baseUrl}/intake/walk-in`,
      {
        complaint: "Проблема после поездки",
        newCustomerFullName: fullName,
        newCustomerPhone: phone,
        newVehicleLabel: vehicleLabel,
        newVehiclePlateNumber: `WI${token.slice(-6)}`,
      },
      { redirect: "manual" },
    );

    assert.equal(submit.status, 303);
    const workOrderId = extractWorkOrderId(submit.location);
    assert.equal(Boolean(workOrderId), true);

    const detailRes = await fetch(`${baseUrl}${submit.location}`);
    assert.equal(detailRes.status, 200);
    const detailHtml = await detailRes.text();
    assert.match(detailHtml, new RegExp(fullName, "u"));
    assert.match(detailHtml, new RegExp(vehicleLabel, "u"));

    const customerSearch = await requestJson(
      "GET",
      `${baseUrl}/api/v1/customers?q=${encodeURIComponent(fullName)}`,
    );
    assert.equal(customerSearch.status, 200);
    assert.equal(customerSearch.json.items.some((item) => item.fullName === fullName), true);

    const vehicleSearch = await requestJson(
      "GET",
      `${baseUrl}/api/v1/vehicles?q=${encodeURIComponent(vehicleLabel)}`,
    );
    assert.equal(vehicleSearch.status, 200);
    assert.equal(vehicleSearch.json.items.some((item) => item.label === vehicleLabel), true);
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

test("intake/walk-in rolls back inline customer and vehicle when intake save fails", async () => {
  const tempDb = createTempDatabase("auto-service-walkin-page-inline-rollback");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const token = `${Date.now()}`;
    const beforeCustomers = await requestJson("GET", `${baseUrl}/api/v1/customers`);
    const beforeVehicles = await requestJson("GET", `${baseUrl}/api/v1/vehicles`);
    assert.equal(beforeCustomers.status, 200);
    assert.equal(beforeVehicles.status, 200);

    const submit = await submitWalkInForm(`${baseUrl}/intake/walk-in`, {
      complaint: "Проверка отката транзакции walk-in",
      bayId: "bay-missing",
      newCustomerFullName: `Rollback WalkIn Клиент ${token}`,
      newCustomerPhone: `+7 932 ${token.slice(-3)} ${token.slice(-3)} ${token.slice(-2)}`,
      newVehicleLabel: `Rollback WalkIn Авто ${token}`,
      newVehiclePlateNumber: `RW${token.slice(-6)}`,
    });

    assert.equal(submit.status, 404);
    assert.match(submit.text, /Пост не найден/u);

    const afterCustomers = await requestJson("GET", `${baseUrl}/api/v1/customers`);
    const afterVehicles = await requestJson("GET", `${baseUrl}/api/v1/vehicles`);
    assert.equal(afterCustomers.status, 200);
    assert.equal(afterVehicles.status, 200);
    assert.equal(afterCustomers.json.count, beforeCustomers.json.count);
    assert.equal(afterVehicles.json.count, beforeVehicles.json.count);
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

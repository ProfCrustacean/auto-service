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

async function submitAppointmentForm(url, payload, { redirect = "follow" } = {}) {
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
    redirectedUrl: response.url,
  };
}

function extractAppointmentId(locationHeader) {
  const match = /^\/appointments\/([^?]+)/u.exec(locationHeader ?? "");
  return match ? match[1] : null;
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

test("appointments/new renders production booking form and lookup results", async () => {
  const tempDb = createTempDatabase("auto-service-appointment-page-render");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const pageRes = await fetch(`${baseUrl}/appointments/new`);
    assert.equal(pageRes.status, 200);
    const html = await pageRes.text();
    assert.match(html, /Новая запись/u);
    assert.match(html, /Быстрый поиск клиента и авто/u);
    assert.match(html, /Форма записи/u);
    assert.doesNotMatch(html, /Экран будет реализован/u);

    const lookupRes = await fetch(`${baseUrl}/appointments/new?q=Kia`);
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

test("appointments/new returns actionable validation and conflict errors without losing input", async () => {
  const tempDb = createTempDatabase("auto-service-appointment-page-errors");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const invalid = await submitAppointmentForm(`${baseUrl}/appointments/new`, {
      plannedStartLocal: "2026-03-23 10:30",
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "",
    });

    assert.equal(invalid.status, 400);
    assert.match(invalid.text, /Исправьте ошибки перед сохранением/u);
    assert.match(invalid.text, /Опишите жалобу или запрос клиента/u);
    assert.match(invalid.text, /value="2026-03-23 10:30"/u);

    const conflict = await submitAppointmentForm(`${baseUrl}/appointments/new`, {
      plannedStartLocal: "2026-03-23 09:00",
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "Диагностика подвески",
      bayId: "bay-1",
    });

    assert.equal(conflict.status, 409);
    assert.match(conflict.text, /Конфликт загрузки в выбранном слоте/u);
    assert.match(conflict.text, /Пост уже занят на это время/u);
    assert.match(conflict.text, /value="2026-03-23 09:00"/u);
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

test("appointments/new submits successfully and redirects to created appointment detail", async () => {
  const tempDb = createTempDatabase("auto-service-appointment-page-submit");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const beforeDashboard = await requestJson("GET", `${baseUrl}/api/v1/dashboard/today`);
    assert.equal(beforeDashboard.status, 200);

    const uniqueToken = `${Date.now()}`;
    const submit = await submitAppointmentForm(
      `${baseUrl}/appointments/new`,
      {
        plannedStartLocal: buildUniqueSlot(uniqueToken, 12),
        customerId: "cust-2",
        vehicleId: "veh-3",
        complaint: "Проверка тормозной системы",
      },
      { redirect: "manual" },
    );

    assert.equal(submit.status, 303);
    assert.match(submit.location ?? "", /^\/appointments\/[^?]+\?created=1/u);

    const appointmentId = extractAppointmentId(submit.location);
    assert.equal(Boolean(appointmentId), true);

    const appointmentApi = await requestJson("GET", `${baseUrl}/api/v1/appointments/${appointmentId}`);
    assert.equal(appointmentApi.status, 200);
    assert.equal(appointmentApi.json.item.complaint, "Проверка тормозной системы");
    assert.equal(appointmentApi.json.item.customerId, "cust-2");
    assert.equal(appointmentApi.json.item.vehicleId, "veh-3");

    const detailRes = await fetch(`${baseUrl}${submit.location}`);
    assert.equal(detailRes.status, 200);
    const detailHtml = await detailRes.text();
    assert.match(detailHtml, /Запись APT-/u);

    const afterDashboard = await requestJson("GET", `${baseUrl}/api/v1/dashboard/today`);
    assert.equal(afterDashboard.status, 200);
    assert.equal(
      afterDashboard.json.summary.appointmentsToday,
      beforeDashboard.json.summary.appointmentsToday + 1,
    );
    assert.equal(afterDashboard.json.appointments.some((item) => item.id === appointmentId), true);
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

test("appointments/new supports inline customer+vehicle creation in a single submit", async () => {
  const tempDb = createTempDatabase("auto-service-appointment-page-inline-create");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const token = `${Date.now()}`;

    const fullName = `Тест Клиент ${token}`;
    const phone = `+7 927 ${token.slice(-3)} ${token.slice(-3)} ${token.slice(-2)}`;
    const vehicleLabel = `Тест Авто ${token}`;

    const submit = await submitAppointmentForm(
      `${baseUrl}/appointments/new`,
      {
        plannedStartLocal: buildUniqueSlot(token, 13),
        complaint: "Комплексная проверка",
        newCustomerFullName: fullName,
        newCustomerPhone: phone,
        newVehicleLabel: vehicleLabel,
        newVehiclePlateNumber: `UI${token.slice(-6)}`,
      },
      { redirect: "manual" },
    );

    assert.equal(submit.status, 303);
    const appointmentId = extractAppointmentId(submit.location);
    assert.equal(Boolean(appointmentId), true);

    const appointmentApi = await requestJson("GET", `${baseUrl}/api/v1/appointments/${appointmentId}`);
    assert.equal(appointmentApi.status, 200);

    const customerId = appointmentApi.json.item.customerId;
    const vehicleId = appointmentApi.json.item.vehicleId;
    assert.equal(typeof customerId, "string");
    assert.equal(typeof vehicleId, "string");

    const customerApi = await requestJson("GET", `${baseUrl}/api/v1/customers/${customerId}`);
    assert.equal(customerApi.status, 200);
    assert.equal(customerApi.json.item.fullName, fullName);
    assert.equal(customerApi.json.item.phone, phone);

    const vehicleApi = await requestJson("GET", `${baseUrl}/api/v1/vehicles/${vehicleId}`);
    assert.equal(vehicleApi.status, 200);
    assert.equal(vehicleApi.json.item.label, vehicleLabel);
    assert.equal(vehicleApi.json.item.customerId, customerId);
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

test("appointments/new rolls back inline customer and vehicle when appointment save conflicts", async () => {
  const tempDb = createTempDatabase("auto-service-appointment-page-inline-rollback");
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

    const submit = await submitAppointmentForm(`${baseUrl}/appointments/new`, {
      plannedStartLocal: "2026-03-23 09:00",
      complaint: "Проверка отката транзакции",
      bayId: "bay-1",
      newCustomerFullName: `Rollback Клиент ${token}`,
      newCustomerPhone: `+7 927 ${token.slice(-3)} ${token.slice(-3)} ${token.slice(-2)}`,
      newVehicleLabel: `Rollback Авто ${token}`,
      newVehiclePlateNumber: `RB${token.slice(-6)}`,
    });

    assert.equal(submit.status, 409);
    assert.match(submit.text, /Конфликт загрузки в выбранном слоте/u);

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

import test from "node:test";
import assert from "node:assert/strict";
import {
  buildUniqueSlot,
  extractRedirectId,
  requestJson,
  submitUrlEncodedForm,
  withTestServer,
} from "./helpers/httpHarness.js";

test("appointments/new renders booking form and lookup", async () => {
  await withTestServer("auto-service-appointment-page-render", async ({ baseUrl }) => {
    const pageRes = await fetch(`${baseUrl}/appointments/new`);
    assert.equal(pageRes.status, 200);
    const html = await pageRes.text();
    assert.match(html, /Новая запись/u);
    assert.match(html, /Форма записи/u);
    assert.doesNotMatch(html, /Экран будет реализован/u);

    const lookupRes = await fetch(`${baseUrl}/appointments/new?q=Kia`);
    assert.equal(lookupRes.status, 200);
    const lookupHtml = await lookupRes.text();
    assert.match(lookupHtml, /Клиенты/u);
    assert.match(lookupHtml, /Авто/u);
    assert.match(lookupHtml, /Kia Rio/u);
  });
});

test("appointments/new keeps validation and conflict feedback", async () => {
  await withTestServer("auto-service-appointment-page-errors", async ({ baseUrl }) => {
    const invalid = await submitUrlEncodedForm(`${baseUrl}/appointments/new`, {
      plannedStartLocal: "2026-03-23 10:30",
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "",
    });

    assert.equal(invalid.status, 400);
    assert.match(invalid.text, /Исправьте ошибки перед сохранением/u);
    assert.match(invalid.text, /Опишите жалобу или запрос клиента/u);

    const conflict = await submitUrlEncodedForm(`${baseUrl}/appointments/new`, {
      plannedStartLocal: "2026-03-23 09:00",
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "Диагностика",
      bayId: "bay-1",
    });

    assert.equal(conflict.status, 409);
    assert.match(conflict.text, /Конфликт загрузки в выбранном слоте/u);
    assert.match(conflict.text, /Пост уже занят на это время/u);
  });
});

test("appointments/new submits and redirects to detail", async () => {
  await withTestServer("auto-service-appointment-page-submit", async ({ baseUrl }) => {
    const beforeDashboard = await requestJson("GET", `${baseUrl}/api/v1/dashboard/today`);
    assert.equal(beforeDashboard.status, 200);

    const uniqueToken = `${Date.now()}`;
    const submit = await submitUrlEncodedForm(
      `${baseUrl}/appointments/new`,
      {
        plannedStartLocal: buildUniqueSlot(uniqueToken, 12),
        customerId: "cust-2",
        vehicleId: "veh-3",
        complaint: "ТО",
      },
      { redirect: "manual" },
    );

    assert.equal(submit.status, 303);
    assert.match(submit.location ?? "", /^\/appointments\/[^?]+\?created=1/u);

    const appointmentId = extractRedirectId(submit.location, "appointments");
    assert.equal(Boolean(appointmentId), true);

    const appointmentApi = await requestJson("GET", `${baseUrl}/api/v1/appointments/${appointmentId}`);
    assert.equal(appointmentApi.status, 200);
    assert.equal(appointmentApi.json.item.complaint, "ТО");

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
  });
});

test("appointments/new supports inline customer+vehicle create", async () => {
  await withTestServer("auto-service-appointment-page-inline-create", async ({ baseUrl }) => {
    const token = `${Date.now()}`;
    const fullName = `Клиент ${token}`;
    const phone = `+7 927 ${token.slice(-3)} ${token.slice(-3)} ${token.slice(-2)}`;
    const vehicleLabel = `Авто ${token}`;

    const submit = await submitUrlEncodedForm(
      `${baseUrl}/appointments/new`,
      {
        plannedStartLocal: buildUniqueSlot(token, 13),
        complaint: "Проверка",
        newCustomerFullName: fullName,
        newCustomerPhone: phone,
        newVehicleLabel: vehicleLabel,
        newVehiclePlateNumber: `UI${token.slice(-6)}`,
      },
      { redirect: "manual" },
    );

    assert.equal(submit.status, 303);
    const appointmentId = extractRedirectId(submit.location, "appointments");
    assert.equal(Boolean(appointmentId), true);

    const appointmentApi = await requestJson("GET", `${baseUrl}/api/v1/appointments/${appointmentId}`);
    assert.equal(appointmentApi.status, 200);

    const customerId = appointmentApi.json.item.customerId;
    const vehicleId = appointmentApi.json.item.vehicleId;
    const customerApi = await requestJson("GET", `${baseUrl}/api/v1/customers/${customerId}`);
    assert.equal(customerApi.status, 200);
    assert.equal(customerApi.json.item.fullName, fullName);
    assert.equal(customerApi.json.item.phone, phone);

    const vehicleApi = await requestJson("GET", `${baseUrl}/api/v1/vehicles/${vehicleId}`);
    assert.equal(vehicleApi.status, 200);
    assert.equal(vehicleApi.json.item.label, vehicleLabel);
    assert.equal(vehicleApi.json.item.customerId, customerId);
  });
});

test("appointments/new rolls back inline entities on conflict", async () => {
  await withTestServer("auto-service-appointment-page-inline-rollback", async ({ baseUrl }) => {
    const token = `${Date.now()}`;
    const beforeCustomers = await requestJson("GET", `${baseUrl}/api/v1/customers`);
    const beforeVehicles = await requestJson("GET", `${baseUrl}/api/v1/vehicles`);
    assert.equal(beforeCustomers.status, 200);
    assert.equal(beforeVehicles.status, 200);

    const submit = await submitUrlEncodedForm(`${baseUrl}/appointments/new`, {
      plannedStartLocal: "2026-03-23 09:00",
      complaint: "Откат",
      bayId: "bay-1",
      newCustomerFullName: `RB Клиент ${token}`,
      newCustomerPhone: `+7 927 ${token.slice(-3)} ${token.slice(-3)} ${token.slice(-2)}`,
      newVehicleLabel: `RB Авто ${token}`,
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
  });
});

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
    assert.match(html, /Запись по времени/u);
    assert.match(html, /Принять сейчас/u);
    assert.doesNotMatch(html, /<strong>Режим<\/strong>/u);
    assert.doesNotMatch(html, /Экран будет реализован/u);

    const lookupRes = await fetch(`${baseUrl}/appointments/new?q=Kia`);
    assert.equal(lookupRes.status, 200);
    const lookupHtml = await lookupRes.text();
    assert.match(lookupHtml, /Клиенты/u);
    assert.match(lookupHtml, /Авто/u);
    assert.match(lookupHtml, /Kia Rio/u);
  });
});

test("appointments/new supports walk-in mode UI without slot fields", async () => {
  await withTestServer("auto-service-appointment-page-walkin-render", async ({ baseUrl }) => {
    const response = await fetch(`${baseUrl}/appointments/new?mode=walkin`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Новая запись/u);
    assert.match(html, /Форма приема/u);
    assert.match(html, /Принять без записи/u);
    assert.doesNotMatch(html, /<strong>Режим<\/strong>/u);
    assert.doesNotMatch(html, /Плановый старт/u);
    assert.doesNotMatch(html, /Ожидаемая длительность/u);
  });
});

test("appointments/new keeps validation and non-blocking overlap feedback", async () => {
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

    const overlap = await submitUrlEncodedForm(
      `${baseUrl}/appointments/new`,
      {
        plannedStartLocal: "2026-03-23 09:00",
        customerId: "cust-2",
        vehicleId: "veh-3",
        complaint: "Диагностика",
        bayId: "bay-1",
      },
      { redirect: "manual" },
    );

    assert.equal(overlap.status, 303);
    assert.match(overlap.location ?? "", /^\/appointments\/[^?]+\?created=1/u);
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

test("appointments/new walk-in mode submits and redirects to work-order detail", async () => {
  await withTestServer("auto-service-appointment-page-walkin-submit", async ({ baseUrl }) => {
    const beforeDashboard = await requestJson("GET", `${baseUrl}/api/v1/dashboard/today`);
    assert.equal(beforeDashboard.status, 200);

    const submit = await submitUrlEncodedForm(
      `${baseUrl}/appointments/new`,
      {
        mode: "walkin",
        customerId: "cust-2",
        vehicleId: "veh-3",
        complaint: "Walk-in через unified page",
      },
      { redirect: "manual" },
    );

    assert.equal(submit.status, 303);
    assert.match(submit.location ?? "", /^\/work-orders\/[^?]+\?created=1/u);
    const workOrderId = extractRedirectId(submit.location, "work-orders");
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
  });
});

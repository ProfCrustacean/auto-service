import test from "node:test";
import assert from "node:assert/strict";
import {
  extractRedirectId,
  requestJson,
  submitUrlEncodedForm,
  withTestServer,
} from "./helpers/httpHarness.js";

test("intake/walk-in renders intake form and lookup", async () => {
  await withTestServer("auto-service-walkin-page-render", async ({ baseUrl }) => {
    const pageRes = await fetch(`${baseUrl}/intake/walk-in`);
    assert.equal(pageRes.status, 200);
    const html = await pageRes.text();
    assert.match(html, /Прием walk-in/u);
    assert.match(html, /Форма intake/u);
    assert.doesNotMatch(html, /Экран будет реализован/u);

    const lookupRes = await fetch(`${baseUrl}/intake/walk-in?q=Kia`);
    assert.equal(lookupRes.status, 200);
    const lookupHtml = await lookupRes.text();
    assert.match(lookupHtml, /Клиенты/u);
    assert.match(lookupHtml, /Авто/u);
    assert.match(lookupHtml, /Kia Rio/u);
  });
});

test("intake/walk-in keeps validation/domain feedback", async () => {
  await withTestServer("auto-service-walkin-page-errors", async ({ baseUrl }) => {
    const invalid = await submitUrlEncodedForm(`${baseUrl}/intake/walk-in`, {
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "",
    });

    assert.equal(invalid.status, 400);
    assert.match(invalid.text, /Исправьте ошибки перед сохранением/u);
    assert.match(invalid.text, /Опишите жалобу или запрос клиента/u);

    const mismatch = await submitUrlEncodedForm(`${baseUrl}/intake/walk-in`, {
      customerId: "cust-1",
      vehicleId: "veh-3",
      complaint: "Несовпадение",
    });

    assert.equal(mismatch.status, 409);
    assert.match(mismatch.text, /Авто не принадлежит выбранному клиенту/u);
    assert.match(mismatch.text, /Несовпадение/u);
  });
});

test("intake/walk-in submits and redirects to detail", async () => {
  await withTestServer("auto-service-walkin-page-submit", async ({ baseUrl }) => {
    const beforeDashboard = await requestJson("GET", `${baseUrl}/api/v1/dashboard/today`);
    assert.equal(beforeDashboard.status, 200);

    const submit = await submitUrlEncodedForm(
      `${baseUrl}/intake/walk-in`,
      {
        customerId: "cust-2",
        vehicleId: "veh-3",
        complaint: "Walk-in тест",
        bayId: "bay-2",
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

test("intake/walk-in supports inline customer+vehicle create", async () => {
  await withTestServer("auto-service-walkin-page-inline-create", async ({ baseUrl }) => {
    const token = `${Date.now()}`;

    const fullName = `WI Клиент ${token}`;
    const phone = `+7 937 ${token.slice(-3)} ${token.slice(-3)} ${token.slice(-2)}`;
    const vehicleLabel = `WI Авто ${token}`;

    const submit = await submitUrlEncodedForm(
      `${baseUrl}/intake/walk-in`,
      {
        complaint: "Проблема",
        newCustomerFullName: fullName,
        newCustomerPhone: phone,
        newVehicleLabel: vehicleLabel,
        newVehiclePlateNumber: `WI${token.slice(-6)}`,
      },
      { redirect: "manual" },
    );

    assert.equal(submit.status, 303);
    const workOrderId = extractRedirectId(submit.location, "work-orders");
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
  });
});

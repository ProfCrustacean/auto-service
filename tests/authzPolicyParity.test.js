import test from "node:test";
import assert from "node:assert/strict";
import {
  requestJson,
  submitUrlEncodedForm,
  withTestServer,
} from "./helpers/httpHarness.js";

function authHeader(token) {
  return {
    authorization: `Bearer ${token}`,
  };
}

test("UI mutation routes require token when implicit UI role is disabled", async () => {
  await withTestServer(
    "auto-service-authz-ui-token-required",
    async ({ baseUrl }) => {
      const withoutToken = await submitUrlEncodedForm(
        `${baseUrl}/appointments/new`,
        {
          plannedStartLocal: "2026-03-25 12:30",
          customerId: "cust-2",
          vehicleId: "veh-3",
          complaint: "Проверка доступа",
        },
        { redirect: "manual" },
      );

      assert.equal(withoutToken.status, 401);
      assert.match(withoutToken.text, /"code":"unauthorized"/u);
    },
    {
      authConfig: {
        implicitUiRole: null,
      },
    },
  );
});

test("appointment mutations keep API/page role parity for front_desk and technician", async () => {
  await withTestServer(
    "auto-service-authz-appointment-parity",
    async ({ baseUrl }) => {
      const pageFrontDesk = await submitUrlEncodedForm(
        `${baseUrl}/appointments/new`,
        {
          plannedStartLocal: "2026-03-25 13:30",
          customerId: "cust-2",
          vehicleId: "veh-3",
          complaint: "Плановая диагностика",
        },
        {
          redirect: "manual",
          headers: authHeader("frontdesk-dev-token"),
        },
      );
      assert.equal(pageFrontDesk.status, 303);

      const pageTechnician = await submitUrlEncodedForm(
        `${baseUrl}/appointments/new`,
        {
          plannedStartLocal: "2026-03-25 14:30",
          customerId: "cust-2",
          vehicleId: "veh-3",
          complaint: "Проверка роли",
        },
        {
          redirect: "manual",
          headers: authHeader("technician-dev-token"),
        },
      );
      assert.equal(pageTechnician.status, 403);
      assert.match(pageTechnician.text, /"code":"forbidden"/u);

      const apiFrontDesk = await requestJson(
        "POST",
        `${baseUrl}/api/v1/appointments`,
        {
          plannedStartLocal: "2026-03-25 15:30",
          customerId: "cust-2",
          vehicleId: "veh-3",
          complaint: "API front desk allowed",
        },
        {
          token: "frontdesk-dev-token",
        },
      );
      assert.equal(apiFrontDesk.status, 201);

      const apiTechnician = await requestJson(
        "POST",
        `${baseUrl}/api/v1/appointments`,
        {
          plannedStartLocal: "2026-03-25 16:30",
          customerId: "cust-2",
          vehicleId: "veh-3",
          complaint: "API technician denied",
        },
        {
          token: "technician-dev-token",
        },
      );
      assert.equal(apiTechnician.status, 403);
      assert.equal(apiTechnician.json.error.code, "forbidden");
    },
    {
      authConfig: {
        implicitUiRole: null,
      },
    },
  );
});

test("work-order mutations keep API/page role parity for technician", async () => {
  await withTestServer(
    "auto-service-authz-work-order-parity",
    async ({ baseUrl }) => {
      const pageTechnician = await submitUrlEncodedForm(
        `${baseUrl}/work-orders/wo-1004`,
        {
          status: "ready_pickup",
          balanceDueRub: 0,
          reason: "Техник завершил работу",
        },
        {
          redirect: "manual",
          headers: authHeader("technician-dev-token"),
        },
      );
      assert.equal(pageTechnician.status, 303);

      const apiTechnician = await requestJson(
        "PATCH",
        `${baseUrl}/api/v1/work-orders/wo-1002`,
        {
          status: "in_progress",
          reason: "Техник обновляет этап диагностики",
        },
        {
          token: "technician-dev-token",
        },
      );
      assert.equal(apiTechnician.status, 200);
      assert.equal(apiTechnician.json.item.status, "in_progress");

      const pagePaymentTechnician = await submitUrlEncodedForm(
        `${baseUrl}/work-orders/wo-1005/payments`,
        {
          paymentType: "partial",
          paymentMethod: "cash",
          amountRub: 500,
        },
        {
          redirect: "manual",
          headers: authHeader("technician-dev-token"),
        },
      );
      assert.equal(pagePaymentTechnician.status, 303);

      const apiPaymentTechnician = await requestJson(
        "POST",
        `${baseUrl}/api/v1/work-orders/wo-1005/payments`,
        {
          paymentType: "partial",
          paymentMethod: "cash",
          amountRub: 100,
        },
        {
          token: "technician-dev-token",
        },
      );
      assert.equal(apiPaymentTechnician.status, 201);
    },
    {
      authConfig: {
        implicitUiRole: null,
      },
    },
  );
});

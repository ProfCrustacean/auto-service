import test from "node:test";
import assert from "node:assert/strict";
import {
  closeServer,
  createTempDatabase,
  makeServer,
  waitForServer,
} from "./helpers/httpHarness.js";

async function postJson(url, body, token = null) {
  const headers = {
    "content-type": "application/json",
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

async function patchJson(url, body, token = null) {
  const headers = {
    "content-type": "application/json",
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  return { status: response.status, payload };
}

test("mutating API endpoints require auth and enforce role policies", async () => {
  const tempDb = createTempDatabase("auto-service-authz");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const anonymousCreateCustomer = await postJson(`${baseUrl}/api/v1/customers`, {
      fullName: "Аноним",
      phone: "+7 999 001-00-01",
    });
    assert.equal(anonymousCreateCustomer.status, 401);
    assert.equal(anonymousCreateCustomer.payload.error.code, "unauthorized");

    const technicianCreateCustomer = await postJson(`${baseUrl}/api/v1/customers`, {
      fullName: "Техник",
      phone: "+7 999 001-00-02",
    }, "technician-dev-token");
    assert.equal(technicianCreateCustomer.status, 403);
    assert.equal(technicianCreateCustomer.payload.error.code, "forbidden");

    const frontDeskCreateCustomer = await postJson(`${baseUrl}/api/v1/customers`, {
      fullName: "Фронт Деск",
      phone: "+7 999 001-00-03",
    }, "frontdesk-dev-token");
    assert.equal(frontDeskCreateCustomer.status, 201);
    assert.equal(frontDeskCreateCustomer.payload.item.fullName, "Фронт Деск");

    const frontDeskCreateEmployee = await postJson(`${baseUrl}/api/v1/employees`, {
      name: "Недопустимый ФД",
      roles: ["front_desk"],
    }, "frontdesk-dev-token");
    assert.equal(frontDeskCreateEmployee.status, 403);
    assert.equal(frontDeskCreateEmployee.payload.error.code, "forbidden");

    const ownerCreateEmployee = await postJson(`${baseUrl}/api/v1/employees`, {
      name: "Владелец Сотрудник",
      roles: ["owner"],
    }, "owner-dev-token");
    assert.equal(ownerCreateEmployee.status, 201);
    assert.equal(ownerCreateEmployee.payload.item.name, "Владелец Сотрудник");

    const technicianUpdateWorkOrder = await patchJson(`${baseUrl}/api/v1/work-orders/wo-1002`, {
      findings: "Проверка права техника на тех. обновление",
    }, "technician-dev-token");
    assert.equal(technicianUpdateWorkOrder.status, 200);
    assert.equal(technicianUpdateWorkOrder.payload.item.findings, "Проверка права техника на тех. обновление");

    const frontDeskCreatePartsRequest = await postJson(`${baseUrl}/api/v1/work-orders/wo-1002/parts-requests`, {
      partName: "Датчик ABS",
      requestedQty: 1,
      requestedUnitCostRub: 1700,
      salePriceRub: 2500,
      status: "requested",
      isBlocking: true,
    }, "frontdesk-dev-token");
    assert.equal(frontDeskCreatePartsRequest.status, 201);
    const createdPartsRequestId = frontDeskCreatePartsRequest.payload.item.id;

    const technicianCreatePurchaseAction = await postJson(
      `${baseUrl}/api/v1/work-orders/wo-1002/parts-requests/${createdPartsRequestId}/purchase-actions`,
      {
        supplierName: "Склад-13",
        orderedQty: 1,
        unitCostRub: 1700,
        status: "ordered",
      },
      "technician-dev-token",
    );
    assert.equal(technicianCreatePurchaseAction.status, 201);
    assert.equal(technicianCreatePurchaseAction.payload.item.status, "ordered");

    const createAppointment = await postJson(`${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: "2026-03-28 14:10",
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "Проверка прав на конвертацию",
      status: "booked",
    }, "owner-dev-token");
    assert.equal(createAppointment.status, 201);

    const technicianConvertAppointment = await postJson(
      `${baseUrl}/api/v1/appointments/${createAppointment.payload.item.id}/convert-to-work-order`,
      {},
      "technician-dev-token",
    );
    assert.equal(technicianConvertAppointment.status, 403);
    assert.equal(technicianConvertAppointment.payload.error.code, "forbidden");
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

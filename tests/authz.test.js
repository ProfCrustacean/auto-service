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
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});


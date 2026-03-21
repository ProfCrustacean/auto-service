import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bootstrapPersistence } from "../src/persistence/bootstrapPersistence.js";
import { DashboardService } from "../src/services/dashboardService.js";
import { ReferenceDataService } from "../src/services/referenceDataService.js";
import { CustomerVehicleService } from "../src/services/customerVehicleService.js";
import { createApp } from "../src/app.js";

function makeServer({ port = 0, databasePath }) {
  const logger = {
    info() {},
    warn() {},
    error() {},
  };
  const config = { appEnv: "test", port, seedPath: "./data/seed-fixtures.json", databasePath };
  const { repository, database } = bootstrapPersistence({ config, logger });
  const dashboardService = new DashboardService(repository);
  const referenceDataService = new ReferenceDataService(repository);
  const customerVehicleService = new CustomerVehicleService(repository);
  const app = createApp({ config, logger, dashboardService, referenceDataService, customerVehicleService });
  const server = app.listen(port);
  return { server, database };
}

async function requestJson(method, url, body = undefined) {
  const res = await fetch(url, {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const json = await res.json();
  return { status: res.status, json };
}

test("customer and vehicle CRUD APIs preserve ownership history and work-order snapshots", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "auto-service-customer-vehicle-test-"));
  const databasePath = path.join(tempDir, "test.sqlite");
  const { server, database } = makeServer({ databasePath });

  await new Promise((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const invalidCustomerCreate = await requestJson("POST", `${baseUrl}/api/v1/customers`, {
      phone: "+7 900 000 00 00",
    });
    assert.equal(invalidCustomerCreate.status, 400);
    assert.equal(invalidCustomerCreate.json.error.code, "validation_error");

    const initialCustomers = await requestJson("GET", `${baseUrl}/api/v1/customers`);
    assert.equal(initialCustomers.status, 200);
    assert.equal(initialCustomers.json.count, 4);

    const customerCreateA = await requestJson("POST", `${baseUrl}/api/v1/customers`, {
      fullName: "Тест Клиент Один",
      phone: "+7 900 111 22 33",
      messagingHandle: "@client1",
    });
    assert.equal(customerCreateA.status, 201);
    const customerA = customerCreateA.json.item;

    const customerCreateB = await requestJson("POST", `${baseUrl}/api/v1/customers`, {
      fullName: "Тест Клиент Два",
      phone: "+7 900 444 55 66",
    });
    assert.equal(customerCreateB.status, 201);
    const customerB = customerCreateB.json.item;

    const customerSearch = await requestJson("GET", `${baseUrl}/api/v1/customers?q=Клиент Два`);
    assert.equal(customerSearch.status, 200);
    assert.equal(customerSearch.json.count, 1);
    assert.equal(customerSearch.json.items[0].id, customerB.id);

    const vehicleCreate = await requestJson("POST", `${baseUrl}/api/v1/vehicles`, {
      customerId: customerA.id,
      label: "Skoda Octavia T123TT13",
      plateNumber: "T123TT13",
      vin: "XW8ZZZ5EZGG000001",
      make: "Skoda",
      model: "Octavia",
      productionYear: 2018,
      mileageKm: 142000,
    });
    assert.equal(vehicleCreate.status, 201);
    const createdVehicle = vehicleCreate.json.item;
    assert.equal(createdVehicle.customerId, customerA.id);

    const ownershipBefore = await requestJson(
      "GET",
      `${baseUrl}/api/v1/vehicles/${createdVehicle.id}/ownership-history`,
    );
    assert.equal(ownershipBefore.status, 200);
    assert.equal(ownershipBefore.json.count, 1);
    assert.equal(ownershipBefore.json.items[0].customerId, customerA.id);

    const vehicleOwnerChange = await requestJson("PATCH", `${baseUrl}/api/v1/vehicles/${createdVehicle.id}`, {
      customerId: customerB.id,
      mileageKm: 143500,
    });
    assert.equal(vehicleOwnerChange.status, 200);
    assert.equal(vehicleOwnerChange.json.item.customerId, customerB.id);

    const ownershipAfter = await requestJson(
      "GET",
      `${baseUrl}/api/v1/vehicles/${createdVehicle.id}/ownership-history`,
    );
    assert.equal(ownershipAfter.status, 200);
    assert.equal(ownershipAfter.json.count, 2);
    assert.equal(ownershipAfter.json.items[0].customerId, customerB.id);
    assert.equal(ownershipAfter.json.items[1].customerId, customerA.id);

    const missingOwnerVehicleCreate = await requestJson("POST", `${baseUrl}/api/v1/vehicles`, {
      customerId: "cust-missing",
      label: "Fake Car",
    });
    assert.equal(missingOwnerVehicleCreate.status, 404);
    assert.equal(missingOwnerVehicleCreate.json.error.code, "not_found");

    const dashboardBefore = await requestJson("GET", `${baseUrl}/api/v1/dashboard/today`);
    assert.equal(dashboardBefore.status, 200);
    const seededOrderBefore = dashboardBefore.json.queues.active.find((item) => item.id === "wo-1004");
    assert.ok(seededOrderBefore);
    assert.equal(seededOrderBefore.customerName, "Елена Смирнова");
    assert.equal(seededOrderBefore.vehicleLabel, "Kia Rio A123AA13");

    const customerUpdateSeeded = await requestJson("PATCH", `${baseUrl}/api/v1/customers/cust-1`, {
      fullName: "Елена Смирнова (обновлено)",
      notes: "Обновленная карточка",
    });
    assert.equal(customerUpdateSeeded.status, 200);

    const vehicleUpdateSeeded = await requestJson("PATCH", `${baseUrl}/api/v1/vehicles/veh-1`, {
      label: "Kia Rio NEW123",
      customerId: customerB.id,
    });
    assert.equal(vehicleUpdateSeeded.status, 200);

    const dashboardAfter = await requestJson("GET", `${baseUrl}/api/v1/dashboard/today`);
    assert.equal(dashboardAfter.status, 200);
    const seededOrderAfter = dashboardAfter.json.queues.active.find((item) => item.id === "wo-1004");
    assert.ok(seededOrderAfter);
    assert.equal(seededOrderAfter.customerName, "Елена Смирнова");
    assert.equal(seededOrderAfter.vehicleLabel, "Kia Rio A123AA13");

    const vehicleDelete = await requestJson("DELETE", `${baseUrl}/api/v1/vehicles/${createdVehicle.id}`);
    assert.equal(vehicleDelete.status, 200);
    assert.equal(vehicleDelete.json.item.isActive, false);

    const customerDelete = await requestJson("DELETE", `${baseUrl}/api/v1/customers/${customerA.id}`);
    assert.equal(customerDelete.status, 200);
    assert.equal(customerDelete.json.item.isActive, false);

    const activeVehicles = await requestJson("GET", `${baseUrl}/api/v1/vehicles`);
    assert.equal(activeVehicles.status, 200);
    assert.equal(activeVehicles.json.items.some((item) => item.id === createdVehicle.id), false);

    const allVehicles = await requestJson("GET", `${baseUrl}/api/v1/vehicles?includeInactive=true`);
    assert.equal(allVehicles.status, 200);
    assert.equal(allVehicles.json.items.some((item) => item.id === createdVehicle.id), true);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    database.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

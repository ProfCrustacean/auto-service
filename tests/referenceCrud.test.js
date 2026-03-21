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

test("employee and bay CRUD endpoints enforce validation and stable error contracts", async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "auto-service-reference-test-"));
  const databasePath = path.join(tempDir, "test.sqlite");
  const { server, database } = makeServer({ databasePath });

  await new Promise((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const invalidEmployeeCreate = await requestJson("POST", `${baseUrl}/api/v1/employees`, {
      roles: ["mechanic"],
    });
    assert.equal(invalidEmployeeCreate.status, 400);
    assert.equal(invalidEmployeeCreate.json.error.code, "validation_error");
    assert.match(JSON.stringify(invalidEmployeeCreate.json.error.details), /name/);

    const seededEmployees = await requestJson("GET", `${baseUrl}/api/v1/employees`);
    assert.equal(seededEmployees.status, 200);
    assert.equal(seededEmployees.json.count, 4);

    const employeeCreate = await requestJson("POST", `${baseUrl}/api/v1/employees`, {
      name: "Тестовый Механик",
      roles: ["mechanic", "mechanic"],
      isActive: true,
    });
    assert.equal(employeeCreate.status, 201);
    const createdEmployee = employeeCreate.json.item;
    assert.match(createdEmployee.id, /^emp-/);
    assert.equal(createdEmployee.name, "Тестовый Механик");
    assert.deepEqual(createdEmployee.roles, ["mechanic"]);
    assert.equal(createdEmployee.isActive, true);

    const employeeGet = await requestJson("GET", `${baseUrl}/api/v1/employees/${createdEmployee.id}`);
    assert.equal(employeeGet.status, 200);
    assert.equal(employeeGet.json.item.id, createdEmployee.id);

    const invalidEmployeePatch = await requestJson("PATCH", `${baseUrl}/api/v1/employees/${createdEmployee.id}`, {});
    assert.equal(invalidEmployeePatch.status, 400);
    assert.equal(invalidEmployeePatch.json.error.code, "validation_error");

    const employeePatch = await requestJson("PATCH", `${baseUrl}/api/v1/employees/${createdEmployee.id}`, {
      name: "Обновленный Механик",
      roles: ["electrician"],
    });
    assert.equal(employeePatch.status, 200);
    assert.equal(employeePatch.json.item.name, "Обновленный Механик");
    assert.deepEqual(employeePatch.json.item.roles, ["electrician"]);

    const employeeDelete = await requestJson("DELETE", `${baseUrl}/api/v1/employees/${createdEmployee.id}`);
    assert.equal(employeeDelete.status, 200);
    assert.equal(employeeDelete.json.item.isActive, false);

    const activeEmployees = await requestJson("GET", `${baseUrl}/api/v1/employees`);
    assert.equal(activeEmployees.status, 200);
    assert.equal(activeEmployees.json.items.some((item) => item.id === createdEmployee.id), false);

    const allEmployees = await requestJson("GET", `${baseUrl}/api/v1/employees?includeInactive=true`);
    assert.equal(allEmployees.status, 200);
    assert.equal(allEmployees.json.items.some((item) => item.id === createdEmployee.id), true);

    const invalidIncludeInactive = await requestJson("GET", `${baseUrl}/api/v1/employees?includeInactive=maybe`);
    assert.equal(invalidIncludeInactive.status, 400);
    assert.equal(invalidIncludeInactive.json.error.code, "validation_error");

    const missingEmployee = await requestJson("GET", `${baseUrl}/api/v1/employees/emp-missing`);
    assert.equal(missingEmployee.status, 404);
    assert.equal(missingEmployee.json.error.code, "not_found");

    const bayCreate = await requestJson("POST", `${baseUrl}/api/v1/bays`, {
      name: "Пост 3",
    });
    assert.equal(bayCreate.status, 201);
    const createdBay = bayCreate.json.item;
    assert.match(createdBay.id, /^bay-/);
    assert.equal(createdBay.name, "Пост 3");

    const bayDuplicate = await requestJson("POST", `${baseUrl}/api/v1/bays`, {
      name: "Пост 3",
    });
    assert.equal(bayDuplicate.status, 409);
    assert.equal(bayDuplicate.json.error.code, "conflict");

    const bayPatch = await requestJson("PATCH", `${baseUrl}/api/v1/bays/${createdBay.id}`, {
      name: "Пост 3A",
      isActive: true,
    });
    assert.equal(bayPatch.status, 200);
    assert.equal(bayPatch.json.item.name, "Пост 3A");

    const bayDelete = await requestJson("DELETE", `${baseUrl}/api/v1/bays/${createdBay.id}`);
    assert.equal(bayDelete.status, 200);
    assert.equal(bayDelete.json.item.isActive, false);

    const allBays = await requestJson("GET", `${baseUrl}/api/v1/bays?includeInactive=1`);
    assert.equal(allBays.status, 200);
    assert.equal(allBays.json.items.some((item) => item.id === createdBay.id), true);

    const missingBay = await requestJson("GET", `${baseUrl}/api/v1/bays/bay-missing`);
    assert.equal(missingBay.status, 404);
    assert.equal(missingBay.json.error.code, "not_found");
  } finally {
    await new Promise((resolve) => server.close(resolve));
    database.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

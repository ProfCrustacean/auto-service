import test from "node:test";
import assert from "node:assert/strict";
import {
  closeServer,
  createTempDatabase,
  makeServer,
  waitForServer,
} from "./helpers/httpHarness.js";

function parseCodeNumber(code, prefix) {
  const match = new RegExp(`^${prefix}(\\d+)$`, "u").exec(String(code ?? ""));
  assert.ok(match, `Unexpected code format: ${code}`);
  return Number.parseInt(match[1], 10);
}

function assertContiguous(numbers) {
  const sorted = [...numbers].sort((left, right) => left - right);
  for (let index = 1; index < sorted.length; index += 1) {
    assert.equal(sorted[index], sorted[index - 1] + 1);
  }
}

test("parallel appointment and walk-in creates produce unique monotonic sequence codes", async () => {
  const tempDb = createTempDatabase("auto-service-sequence-concurrency");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const appointmentResponses = await Promise.all(
      Array.from({ length: 10 }).map(async (_, index) => {
        const response = await fetch(`${baseUrl}/api/v1/appointments`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer owner-dev-token",
          },
          body: JSON.stringify({
            plannedStartLocal: `2026-03-30 ${String(9 + index).padStart(2, "0")}:00`,
            customerId: "cust-1",
            vehicleId: "veh-1",
            complaint: `parallel-appointment-${index}`,
          }),
        });
        const payload = await response.json();
        return {
          status: response.status,
          payload,
        };
      }),
    );

    assert.equal(appointmentResponses.every((entry) => entry.status === 201), true);
    const appointmentCodes = appointmentResponses.map((entry) => entry.payload?.item?.code);
    const appointmentCodeSet = new Set(appointmentCodes);
    assert.equal(appointmentCodeSet.size, appointmentCodes.length);
    assertContiguous(appointmentCodes.map((code) => parseCodeNumber(code, "APT-")));

    const walkInResponses = await Promise.all(
      Array.from({ length: 10 }).map(async (_, index) => {
        const response = await fetch(`${baseUrl}/api/v1/intake/walk-ins`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: "Bearer owner-dev-token",
          },
          body: JSON.stringify({
            customerId: "cust-1",
            vehicleId: "veh-1",
            complaint: `parallel-walkin-${index}`,
          }),
        });
        const payload = await response.json();
        return {
          status: response.status,
          payload,
        };
      }),
    );

    assert.equal(walkInResponses.every((entry) => entry.status === 201), true);
    const workOrderCodes = walkInResponses.map((entry) => entry.payload?.item?.workOrder?.code);
    const workOrderCodeSet = new Set(workOrderCodes);
    assert.equal(workOrderCodeSet.size, workOrderCodes.length);
    assertContiguous(workOrderCodes.map((code) => parseCodeNumber(code, "WO-")));
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

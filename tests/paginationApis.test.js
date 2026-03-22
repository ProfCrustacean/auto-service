import test from "node:test";
import assert from "node:assert/strict";
import {
  closeServer,
  createTempDatabase,
  makeServer,
  requestJson,
  waitForServer,
} from "./helpers/httpHarness.js";

async function assertPagedSlice(baseUrl, path, { limit, offset }) {
  const full = await requestJson("GET", `${baseUrl}${path}`);
  assert.equal(full.status, 200);

  const paged = await requestJson("GET", `${baseUrl}${path}${path.includes("?") ? "&" : "?"}limit=${limit}&offset=${offset}`);
  assert.equal(paged.status, 200);
  assert.equal(paged.json.pagination.limit, limit);
  assert.equal(paged.json.pagination.offset, offset);
  assert.equal(paged.json.pagination.returned, paged.json.items.length);

  const expectedIds = full.json.items.slice(offset, offset + limit).map((item) => item.id);
  const actualIds = paged.json.items.map((item) => item.id);
  assert.deepEqual(actualIds, expectedIds);
}

test("list APIs support deterministic limit/offset pagination", async () => {
  const tempDb = createTempDatabase("auto-service-pagination-apis");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    await assertPagedSlice(baseUrl, "/api/v1/customers", { limit: 2, offset: 1 });
    await assertPagedSlice(baseUrl, "/api/v1/vehicles", { limit: 2, offset: 1 });
    await assertPagedSlice(baseUrl, "/api/v1/appointments", { limit: 1, offset: 0 });
    await assertPagedSlice(baseUrl, "/api/v1/employees", { limit: 1, offset: 1 });
    await assertPagedSlice(baseUrl, "/api/v1/bays", { limit: 1, offset: 1 });

    const invalidLimit = await requestJson("GET", `${baseUrl}/api/v1/customers?limit=0`);
    assert.equal(invalidLimit.status, 400);
    assert.equal(invalidLimit.json.error.code, "validation_error");
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});


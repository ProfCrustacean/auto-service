import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import {
  closeServer,
  createTempDatabase,
  makeServer,
  waitForServer,
} from "./helpers/httpHarness.js";

test("write contention returns deterministic database_busy response", async () => {
  const tempDb = createTempDatabase("auto-service-sqlite-busy");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  const locker = new DatabaseSync(databasePath);
  locker.exec("PRAGMA journal_mode = WAL;");
  locker.exec("BEGIN IMMEDIATE;");
  locker.prepare("UPDATE customers SET updated_at = updated_at WHERE id = ?").run("cust-1");

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const startedAt = Date.now();

    const response = await fetch(`${baseUrl}/api/v1/customers`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer owner-dev-token",
      },
      body: JSON.stringify({
        fullName: "Контеншн Тест",
        phone: "+7 999 555-00-11",
      }),
    });

    const durationMs = Date.now() - startedAt;
    assert.equal(response.status, 503);
    assert.ok(durationMs < 2500);

    const payload = await response.json();
    assert.equal(payload?.error?.code, "database_busy");
    assert.match(payload?.error?.message ?? "", /Database is busy/i);
  } finally {
    locker.exec("ROLLBACK;");
    locker.close();
    await closeServer(server);
    database.close();
    cleanup();
  }
});

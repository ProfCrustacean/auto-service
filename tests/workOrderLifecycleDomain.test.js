import test from "node:test";
import assert from "node:assert/strict";
import {
  WORK_ORDER_STATUS_CODES,
  getWorkOrderStatusLabel,
  isKnownWorkOrderStatus,
  isWorkOrderTransitionAllowed,
  listAllowedWorkOrderTransitions,
} from "../src/domain/workOrderLifecycle.js";
import { bootstrapPersistence } from "../src/persistence/bootstrapPersistence.js";
import { WorkOrderService } from "../src/services/workOrderService.js";
import { createSilentLogger, createTempDatabase } from "./helpers/httpHarness.js";

test("work-order lifecycle domain exposes deterministic status catalog and transition map", () => {
  assert.equal(Array.isArray(WORK_ORDER_STATUS_CODES), true);
  assert.equal(WORK_ORDER_STATUS_CODES.length, 10);
  assert.equal(isKnownWorkOrderStatus("waiting_parts"), true);
  assert.equal(isKnownWorkOrderStatus("unknown"), false);
  assert.equal(getWorkOrderStatusLabel("ready_pickup"), "Готово к выдаче");
  assert.deepEqual(listAllowedWorkOrderTransitions("ready_pickup"), ["completed", "in_progress", "cancelled"]);

  assert.equal(isWorkOrderTransitionAllowed("in_progress", "ready_pickup"), true);
  assert.equal(isWorkOrderTransitionAllowed("completed", "in_progress"), false);
});

test("work-order service enforces transition invariants and writes status history", () => {
  const tempDb = createTempDatabase("auto-service-work-order-domain");
  const { databasePath, cleanup } = tempDb;
  const config = {
    appEnv: "test",
    port: 0,
    seedPath: "./data/seed-fixtures.json",
    databasePath,
  };
  const logger = createSilentLogger();
  const { repository, database } = bootstrapPersistence({ config, logger });
  const service = new WorkOrderService(repository);

  try {
    const before = service.getWorkOrderById("wo-1002");
    assert.equal(before.status, "waiting_diagnosis");
    assert.ok(before.statusHistory.length >= 1);

    const moved = service.updateWorkOrderById("wo-1002", {
      status: "waiting_approval",
      reason: "Ждем согласование клиента",
    }, {
      changedBy: "test-domain",
      source: "test_domain",
    });
    assert.equal(moved.status, "waiting_approval");
    assert.equal(moved.statusHistory[0].toStatus, "waiting_approval");
    assert.equal(moved.statusHistory[0].changedBy, "test-domain");
    assert.equal(moved.statusHistory[0].reason, "Ждем согласование клиента");

    assert.throws(
      () => service.updateWorkOrderById("wo-0091", { status: "in_progress" }),
      (error) => error?.code === "work_order_status_transition_invalid",
    );

    assert.throws(
      () => service.updateWorkOrderById("wo-1005", { status: "completed" }),
      (error) => error?.code === "work_order_balance_due_conflict",
    );
  } finally {
    database.close();
    cleanup();
  }
});

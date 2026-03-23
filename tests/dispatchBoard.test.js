import test from "node:test";
import assert from "node:assert/strict";
import {
  buildUniqueSlot,
  requestJson,
  withTestServer,
} from "./helpers/httpHarness.js";

test("dispatch board page and api render timeline payload", async () => {
  await withTestServer("auto-service-dispatch-board-render", async ({ baseUrl }) => {
    const pageRes = await fetch(`${baseUrl}/dispatch/board`);
    assert.equal(pageRes.status, 200);
    const html = await pageRes.text();
    assert.match(html, /Диспетчерская доска/u);
    assert.match(html, /Очередь переносов/u);
    assert.match(html, /Walk-in без слота/u);

    const boardApi = await requestJson("GET", `${baseUrl}/api/v1/dispatch/board`);
    assert.equal(boardApi.status, 200);
    assert.equal(Array.isArray(boardApi.json.lanes), true);
    assert.equal(Array.isArray(boardApi.json.appointments), true);
    assert.equal(Array.isArray(boardApi.json.timeline.slots), true);
    assert.equal(boardApi.json.timeline.stepMinutes, 15);
  });
});

test("dispatch board scheduling flow supports preview, commit, history, and walk-in queue scheduling", async () => {
  await withTestServer("auto-service-dispatch-board-flow", async ({ baseUrl }) => {
    const create = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: "2026-03-23 12:00",
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: "Проверка доски",
      bayId: "bay-2",
      primaryAssignee: "Сергей Кузнецов",
      expectedDurationMin: 60,
    });
    assert.equal(create.status, 201);
    const createdId = create.json.item.id;

    const overlapConflict = await requestJson("PATCH", `${baseUrl}/api/v1/appointments/${createdId}?preview=1`, {
      plannedStartLocal: "2026-03-23 09:30",
      bayId: "bay-1",
      expectedDurationMin: 45,
    });
    assert.equal(overlapConflict.status, 409);
    assert.equal(overlapConflict.json.error.code, "conflict");

    const preview = await requestJson("PATCH", `${baseUrl}/api/v1/appointments/${createdId}?preview=1`, {
      plannedStartLocal: "2026-03-23 13:30",
      bayId: "bay-2",
      expectedDurationMin: 90,
      reason: "Проверка preview",
    });
    assert.equal(preview.status, 200);
    assert.equal(preview.json.preview, true);
    assert.equal(preview.json.item.plannedStartLocal, "2026-03-23 13:30");
    assert.equal(preview.json.item.expectedDurationMin, 90);

    const stillUnchanged = await requestJson("GET", `${baseUrl}/api/v1/appointments/${createdId}`);
    assert.equal(stillUnchanged.status, 200);
    assert.equal(stillUnchanged.json.item.plannedStartLocal, "2026-03-23 12:00");

    const commit = await requestJson("PATCH", `${baseUrl}/api/v1/appointments/${createdId}`, {
      plannedStartLocal: "2026-03-23 13:30",
      bayId: "bay-2",
      expectedDurationMin: 90,
      reason: "Перенос через dispatch",
    });
    assert.equal(commit.status, 200);
    assert.equal(commit.json.item.plannedStartLocal, "2026-03-23 13:30");
    assert.equal(commit.json.item.expectedDurationMin, 90);

    const history = await requestJson("GET", `${baseUrl}/api/v1/appointments/${createdId}/schedule-history`);
    assert.equal(history.status, 200);
    assert.equal(history.json.count >= 1, true);
    assert.equal(history.json.items[0].toPlannedStartLocal, "2026-03-23 13:30");

    const appointmentsByDate = await requestJson("GET", `${baseUrl}/api/v1/appointments?dateFromLocal=2026-03-23&dateToLocal=2026-03-23`);
    assert.equal(appointmentsByDate.status, 200);
    assert.equal(appointmentsByDate.json.items.some((item) => item.id === createdId), true);

    const invalidRange = await requestJson("GET", `${baseUrl}/api/v1/appointments?dateFromLocal=2026-03-24&dateToLocal=2026-03-23`);
    assert.equal(invalidRange.status, 400);
    assert.equal(invalidRange.json.error.code, "validation_error");

    const today = new Date();
    const todayLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const workOrdersByDate = await requestJson("GET", `${baseUrl}/api/v1/work-orders?dateFromLocal=${todayLocal}&dateToLocal=${todayLocal}`);
    assert.equal(workOrdersByDate.status, 200);
    assert.equal(Array.isArray(workOrdersByDate.json.items), true);

    const boardPayload = await requestJson("GET", `${baseUrl}/api/v1/dispatch/board?day=2026-03-23&laneMode=bay`);
    assert.equal(boardPayload.status, 200);
    const walkInCandidate = boardPayload.json.queues.walkIn[0];
    assert.ok(walkInCandidate?.id);

    const walkInSlot = buildUniqueSlot(String(Date.now()), 15);
    const scheduleWalkIn = await requestJson("POST", `${baseUrl}/dispatch/board/walk-ins/${walkInCandidate.id}/schedule`, {
      plannedStartLocal: walkInSlot,
      bayId: "bay-2",
      expectedDurationMin: 45,
    });
    assert.equal(scheduleWalkIn.status, 201);
    assert.equal(scheduleWalkIn.json.createdFromWorkOrderId, walkInCandidate.id);
  });
});

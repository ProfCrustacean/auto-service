import test from "node:test";
import assert from "node:assert/strict";
import {
  requestJson,
  withTestServer,
} from "./helpers/httpHarness.js";

test("dispatch board page and api render EventCalendar payload", async () => {
  await withTestServer("auto-service-dispatch-board-render", async ({ baseUrl }) => {
    const pageRes = await fetch(`${baseUrl}/dispatch/board`);
    assert.equal(pageRes.status, 200);
    const html = await pageRes.text();
    assert.match(html, /Диспетчерская доска/u);
    assert.match(html, /Очередь переносов/u);
    assert.match(html, /Приемы без записи без слота/u);
    assert.match(html, /id="dispatch-calendar"/u);
    assert.match(html, /event-calendar\.min\.js/u);
    assert.match(html, /draggable="true"/u);
    assert.match(html, /dispatch-event-line primary/u);
    assert.match(html, /status-overlap/u);
    assert.doesNotMatch(html, /vis-timeline/u);
    assert.doesNotMatch(html, /Выбранный слот/u);
    assert.doesNotMatch(html, /Выбранная запись/u);
    assert.doesNotMatch(html, /Назначить в выбранный слот/u);
    assert.doesNotMatch(html, /Записей в дне/u);

    const boardApi = await requestJson("GET", `${baseUrl}/api/v1/dispatch/board`);
    assert.equal(boardApi.status, 200);
    assert.equal(boardApi.json.calendar.engine, "event_calendar");
    assert.equal(boardApi.json.calendar.view, "resourceTimeGridDay");
    assert.equal(Array.isArray(boardApi.json.resources), true);
    assert.equal(Array.isArray(boardApi.json.events), true);
    assert.equal(boardApi.json.timeline, undefined);
  });
});

test("dispatch board scheduling flow supports preview, commit, history, and queue scheduling via API-only routes", async () => {
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

    const createCarryOver = await requestJson("POST", `${baseUrl}/api/v1/appointments`, {
      plannedStartLocal: "2026-03-24 11:00",
      customerId: "cust-4",
      vehicleId: "veh-4",
      complaint: "Перенос из другой даты",
      bayId: "bay-1",
      expectedDurationMin: 45,
    });
    assert.equal(createCarryOver.status, 201);
    const carryOverId = createCarryOver.json.item.id;

    const boardPayload = await requestJson("GET", `${baseUrl}/api/v1/dispatch/board?day=2026-03-23&laneMode=bay`);
    assert.equal(boardPayload.status, 200);
    const targetResource = boardPayload.json.resources.find((entry) => entry.id !== "bay:bay-1") ?? boardPayload.json.resources[0];
    assert.ok(targetResource?.id);

    const preview = await requestJson("POST", `${baseUrl}/api/v1/dispatch/board/events/${createdId}/preview`, {
      start: "2026-03-23 13:30",
      end: "2026-03-23 15:00",
      resourceId: targetResource.id,
      laneMode: "bay",
      dayLocal: "2026-03-23",
      reason: "Проверка preview",
    });
    assert.equal(preview.status, 200);
    assert.equal(preview.json.preview, true);
    assert.equal(preview.json.item.plannedStartLocal, "2026-03-23 13:30");
    assert.equal(preview.json.item.expectedDurationMin, 90);
    assert.equal(Array.isArray(preview.json.warnings), false);

    const stillUnchanged = await requestJson("GET", `${baseUrl}/api/v1/appointments/${createdId}`);
    assert.equal(stillUnchanged.status, 200);
    assert.equal(stillUnchanged.json.item.plannedStartLocal, "2026-03-23 12:00");

    const commit = await requestJson("POST", `${baseUrl}/api/v1/dispatch/board/events/${createdId}/commit`, {
      start: "2026-03-23 13:30",
      end: "2026-03-23 15:00",
      resourceId: targetResource.id,
      laneMode: "bay",
      dayLocal: "2026-03-23",
      reason: "Перенос через dispatch",
    });
    assert.equal(commit.status, 200);
    assert.equal(commit.json.item.plannedStartLocal, "2026-03-23 13:30");
    assert.equal(commit.json.item.expectedDurationMin, 90);

    const history = await requestJson("GET", `${baseUrl}/api/v1/appointments/${createdId}/schedule-history`);
    assert.equal(history.status, 200);
    assert.equal(history.json.count >= 1, true);
    assert.equal(history.json.items[0].toPlannedStartLocal, "2026-03-23 13:30");

    const queueScheduleAppointment = await requestJson(
      "POST",
      `${baseUrl}/api/v1/dispatch/board/queue/appointments/${carryOverId}/schedule`,
      {
        start: "2026-03-23 16:00",
        end: "2026-03-23 17:00",
        resourceId: targetResource.id,
        laneMode: "bay",
        dayLocal: "2026-03-23",
      },
    );
    assert.equal(queueScheduleAppointment.status, 200);
    assert.equal(queueScheduleAppointment.json.scheduled, true);
    assert.equal(queueScheduleAppointment.json.item.plannedStartLocal, "2026-03-23 16:00");

    const walkInCandidate = boardPayload.json.queues.walkIn[0];
    assert.ok(walkInCandidate?.id);
    const conflictResource = boardPayload.json.resources.find((entry) => entry.id === "bay:bay-1") ?? targetResource;

    const scheduleWalkIn = await requestJson(
      "POST",
      `${baseUrl}/api/v1/dispatch/board/queue/walk-ins/${walkInCandidate.id}/schedule`,
      {
        start: "2026-03-23 09:00",
        end: "2026-03-23 09:45",
        resourceId: conflictResource.id,
        laneMode: "bay",
        dayLocal: "2026-03-23",
      },
    );
    assert.equal(scheduleWalkIn.status, 201);
    assert.equal(scheduleWalkIn.json.createdFromWorkOrderId, walkInCandidate.id);
    assert.equal(Array.isArray(scheduleWalkIn.json.warnings), true);

    const boardAfter = await requestJson("GET", `${baseUrl}/api/v1/dispatch/board?day=2026-03-23&laneMode=bay`);
    assert.equal(boardAfter.status, 200);
    assert.equal(boardAfter.json.events.some((entry) => entry.id === createdId), true);
    assert.equal(boardAfter.json.events.some((entry) => entry.id === carryOverId), true);
  });
});

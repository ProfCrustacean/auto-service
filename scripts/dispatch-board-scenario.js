import {
  assertHarness,
  buildFailurePayload,
  expectStatus,
} from "./harness-diagnostics.js";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";
import {
  buildScenarioIsolation,
  requestScenarioJson,
  runScenario,
  renderScenarioFailure,
} from "./scenario-runtime.js";

loadDotenvIntoProcessSync();

const baseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";

function formatLocalDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function parseLocalDateTime(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(?::\d{2})?$/u.test(trimmed)) {
    const normalized = trimmed.slice(0, 16);
    const [dayPart, timePart] = normalized.split(" ");
    const [year, month, day] = dayPart.split("-").map((token) => Number.parseInt(token, 10));
    const [hours, minutes] = timePart.split(":").map((token) => Number.parseInt(token, 10));
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function pickTargetMinute(events, fallback = 17 * 60) {
  const taken = new Set(
    events
      .map((item) => parseLocalDateTime(item.start))
      .filter(Boolean)
      .map((date) => (date.getHours() * 60) + date.getMinutes()),
  );
  for (let minute = 8 * 60; minute < 20 * 60; minute += 15) {
    if (!taken.has(minute)) {
      return minute;
    }
  }
  return fallback;
}

function buildRange(dayLocal, minuteOfDay, durationMin) {
  const startDate = new Date(`${dayLocal}T00:00:00`);
  startDate.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
  const endDate = new Date(startDate.getTime() + durationMin * 60 * 1000);
  return {
    start: formatLocalDateTime(startDate),
    end: formatLocalDateTime(endDate),
  };
}

async function loadBoard(step) {
  const board = await requestScenarioJson(baseUrl, "/api/v1/dispatch/board", { step });
  expectStatus(board, 200, step);
  assertHarness(Array.isArray(board.payload?.resources), "dispatch board resources must be an array", {
    step,
    responsePayload: board.payload,
  });
  assertHarness(Array.isArray(board.payload?.events), "dispatch board events must be an array", {
    step,
    responsePayload: board.payload,
  });
  return board.payload;
}

async function previewMove({ eventId, minute, resourceId, dayLocal, laneMode, durationMin = 60 }) {
  const range = buildRange(dayLocal, minute, durationMin);
  const payload = {
    start: range.start,
    end: range.end,
    resourceId,
    laneMode,
    dayLocal,
  };

  const preview = await requestScenarioJson(baseUrl, `/api/v1/dispatch/board/events/${eventId}/preview`, {
    step: "dispatch_preview_move",
    method: "POST",
    body: payload,
  });

  return { preview, payload };
}

async function runNonDestructive(mode) {
  const board = await loadBoard("dispatch_board_non_destructive_load");
  const event = board.events[0];
  assertHarness(Boolean(event?.id), "dispatch board must contain at least one event", {
    step: "dispatch_board_non_destructive_load",
    responsePayload: board,
  });

  const resource = board.resources.find((item) => item.id !== event.resourceId) ?? board.resources[0];
  const minute = pickTargetMinute(board.events);
  const { preview } = await previewMove({
    eventId: event.id,
    minute,
    resourceId: resource.id,
    dayLocal: board.dayLocal,
    laneMode: board.laneMode,
  });

  assertHarness(preview.status === 200, "preview should return 200", {
    step: "dispatch_preview_move",
    responseStatus: preview.status,
    responsePayload: preview.payload,
  });

  process.stdout.write(`${JSON.stringify({
    status: "dispatch_board_scenario_passed",
    mode: mode.name,
    modeSource: mode.source,
    modeReason: mode.reason,
    baseUrl,
    writesPerformed: false,
    isolation: buildScenarioIsolation(mode, false),
    checks: {
      events: board.events.length,
      resources: board.resources.length,
      previewStatus: preview.status,
    },
  }, null, 2)}\n`);
}

async function runDefault(mode) {
  const before = await loadBoard("dispatch_board_default_load_before");
  const event = before.events[0];
  assertHarness(Boolean(event?.id), "dispatch board must contain at least one event", {
    step: "dispatch_board_default_load_before",
    responsePayload: before,
  });

  const resource = before.resources.find((item) => item.id !== event.resourceId) ?? before.resources[0];
  const minute = pickTargetMinute(before.events);
  const { preview, payload } = await previewMove({
    eventId: event.id,
    minute,
    resourceId: resource.id,
    dayLocal: before.dayLocal,
    laneMode: before.laneMode,
  });
  expectStatus(preview, 200, "dispatch_preview_move");

  const commit = await requestScenarioJson(baseUrl, `/api/v1/dispatch/board/events/${event.id}/commit`, {
    step: "dispatch_commit_move",
    method: "POST",
    body: {
      ...payload,
      reason: "scenario_dispatch_move",
    },
  });
  expectStatus(commit, 200, "dispatch_commit_move");

  const moved = commit.payload?.item;
  assertHarness(Boolean(moved?.plannedStartLocal), "dispatch move must return updated item", {
    step: "dispatch_commit_move",
    responsePayload: commit.payload,
  });

  const movedStart = parseLocalDateTime(moved.plannedStartLocal);
  const movedMinute = movedStart ? (movedStart.getHours() * 60) + movedStart.getMinutes() : minute;
  const resizedRange = buildRange(before.dayLocal, movedMinute, 75);
  const resizePreview = await requestScenarioJson(baseUrl, `/api/v1/dispatch/board/events/${event.id}/preview`, {
    step: "dispatch_preview_resize",
    method: "POST",
    body: {
      start: resizedRange.start,
      end: resizedRange.end,
      resourceId: resource.id,
      laneMode: before.laneMode,
      dayLocal: before.dayLocal,
      reason: "scenario_dispatch_resize",
    },
  });
  expectStatus(resizePreview, 200, "dispatch_preview_resize");

  const resizeCommit = await requestScenarioJson(baseUrl, `/api/v1/dispatch/board/events/${event.id}/commit`, {
    step: "dispatch_commit_resize",
    method: "POST",
    body: {
      start: resizedRange.start,
      end: resizedRange.end,
      resourceId: resource.id,
      laneMode: before.laneMode,
      dayLocal: before.dayLocal,
      reason: "scenario_dispatch_resize",
    },
  });
  expectStatus(resizeCommit, 200, "dispatch_commit_resize");

  let walkInScheduled = false;
  const walkIn = before.queues?.walkIn?.[0];
  if (walkIn?.id) {
    const walkInRange = buildRange(before.dayLocal, 18 * 60, 60);
    const walkInCommit = await requestScenarioJson(baseUrl, `/api/v1/dispatch/board/queue/walk-ins/${walkIn.id}/schedule`, {
      step: "dispatch_schedule_walkin",
      method: "POST",
      body: {
        start: walkInRange.start,
        end: walkInRange.end,
        resourceId: resource.id,
        laneMode: before.laneMode,
        dayLocal: before.dayLocal,
        reason: "scenario_dispatch_walkin",
      },
    });
    if (walkInCommit.status === 201) {
      walkInScheduled = true;
    }
  }

  const after = await loadBoard("dispatch_board_default_load_after");
  process.stdout.write(`${JSON.stringify({
    status: "dispatch_board_scenario_passed",
    mode: mode.name,
    modeSource: mode.source,
    modeReason: mode.reason,
    baseUrl,
    writesPerformed: true,
    isolation: buildScenarioIsolation(mode, true),
    checks: {
      eventsBefore: before.events.length,
      eventsAfter: after.events.length,
      movedEventId: event.id,
      resizedDurationMin: 75,
      walkInScheduled,
    },
  }, null, 2)}\n`);
}

runScenario({
  baseUrl,
  runNonDestructive,
  runDefault,
}).catch((error) => {
  renderScenarioFailure("dispatch_board_scenario_failed", error);
  process.exit(1);
});

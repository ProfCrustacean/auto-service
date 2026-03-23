import {
  assertHarness,
  buildFailurePayload,
  expectStatus,
} from "./harness-diagnostics.js";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";
import {
  buildScenarioIsolation,
  requestScenarioJson,
  resolveScenarioMode,
  runScenario,
  renderScenarioFailure,
} from "./scenario-runtime.js";

loadDotenvIntoProcessSync();

const baseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";

function pickTargetMinute(appointments, fallback = 17 * 60) {
  const taken = new Set(appointments.map((item) => item.startMinute));
  for (let minute = 8 * 60; minute < 20 * 60; minute += 15) {
    if (!taken.has(minute)) {
      return minute;
    }
  }
  return fallback;
}

async function loadBoard(step) {
  const board = await requestScenarioJson(baseUrl, "/api/v1/dispatch/board", { step });
  expectStatus(board, 200, step);
  assertHarness(Array.isArray(board.payload?.lanes), "dispatch board lanes must be an array", {
    step,
    responsePayload: board.payload,
  });
  assertHarness(Array.isArray(board.payload?.appointments), "dispatch board appointments must be an array", {
    step,
    responsePayload: board.payload,
  });
  return board.payload;
}

async function previewMove({ appointmentId, minute, laneKey, day, laneMode }) {
  const lanePrefix = laneKey.startsWith("bay:") ? "bay" : "tech";
  const payload = {
    plannedStartLocal: `${day} ${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
    laneMode,
    day,
  };
  if (lanePrefix === "bay") {
    payload.bayId = laneKey === "bay:none" ? null : laneKey.slice(4);
  } else {
    payload.primaryAssignee = laneKey === "tech:none" ? null : laneKey.slice(5);
  }

  const preview = await requestScenarioJson(baseUrl, `/dispatch/board/appointments/${appointmentId}/preview`, {
    step: "dispatch_preview_move",
    method: "POST",
    body: payload,
  });

  return { preview, payload };
}

async function runNonDestructive(mode) {
  const board = await loadBoard("dispatch_board_non_destructive_load");
  const appointment = board.appointments[0];
  assertHarness(Boolean(appointment?.id), "dispatch board must contain at least one appointment", {
    step: "dispatch_board_non_destructive_load",
    responsePayload: board,
  });

  const lane = board.lanes.find((item) => item.key !== appointment.laneKey) ?? board.lanes[0];
  const minute = pickTargetMinute(board.appointments);
  const { preview } = await previewMove({
    appointmentId: appointment.id,
    minute,
    laneKey: lane.key,
    day: board.dayLocal,
    laneMode: board.laneMode,
  });

  assertHarness(preview.status === 200 || preview.status === 409, "preview should return 200 or 409", {
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
      appointments: board.appointments.length,
      lanes: board.lanes.length,
      previewStatus: preview.status,
    },
  }, null, 2)}\n`);
}

async function runDefault(mode) {
  const before = await loadBoard("dispatch_board_default_load_before");
  const appointment = before.appointments[0];
  assertHarness(Boolean(appointment?.id), "dispatch board must contain at least one appointment", {
    step: "dispatch_board_default_load_before",
    responsePayload: before,
  });

  const lane = before.lanes.find((item) => item.key !== appointment.laneKey) ?? before.lanes[0];
  const minute = pickTargetMinute(before.appointments);
  const { preview, payload } = await previewMove({
    appointmentId: appointment.id,
    minute,
    laneKey: lane.key,
    day: before.dayLocal,
    laneMode: before.laneMode,
  });
  expectStatus(preview, 200, "dispatch_preview_move");

  const commit = await requestScenarioJson(baseUrl, `/dispatch/board/appointments/${appointment.id}/commit`, {
    step: "dispatch_commit_move",
    method: "POST",
    body: {
      ...payload,
      reason: "scenario_dispatch_move",
    },
  });
  expectStatus(commit, 200, "dispatch_commit_move");

  const afterMove = await loadBoard("dispatch_board_default_load_after_move");
  const moved = afterMove.appointments.find((item) => item.id === appointment.id);
  assertHarness(Boolean(moved), "moved appointment must still be visible on board", {
    step: "dispatch_board_default_load_after_move",
    responsePayload: afterMove,
  });

  const resizePreview = await requestScenarioJson(baseUrl, `/dispatch/board/appointments/${appointment.id}/preview`, {
    step: "dispatch_preview_resize",
    method: "POST",
    body: {
      plannedStartLocal: moved.plannedStartLocal,
      expectedDurationMin: 75,
      reason: "scenario_dispatch_resize",
    },
  });
  expectStatus(resizePreview, 200, "dispatch_preview_resize");

  const resizeCommit = await requestScenarioJson(baseUrl, `/dispatch/board/appointments/${appointment.id}/commit`, {
    step: "dispatch_commit_resize",
    method: "POST",
    body: {
      plannedStartLocal: moved.plannedStartLocal,
      expectedDurationMin: 75,
      reason: "scenario_dispatch_resize",
    },
  });
  expectStatus(resizeCommit, 200, "dispatch_commit_resize");

  let walkInScheduled = false;
  const walkIn = before.queues?.walkIn?.[0];
  if (walkIn?.id) {
    const walkInCommit = await requestScenarioJson(baseUrl, `/dispatch/board/walk-ins/${walkIn.id}/schedule`, {
      step: "dispatch_schedule_walkin",
      method: "POST",
      body: {
        plannedStartLocal: `${before.dayLocal} 18:00`,
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
      appointmentsBefore: before.appointments.length,
      appointmentsAfter: after.appointments.length,
      movedAppointmentId: appointment.id,
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

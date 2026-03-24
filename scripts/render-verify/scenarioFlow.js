import process from "node:process";

export async function runScenarioWithRetries({
  step,
  baseUrl,
  skipDeploy,
  args,
  label,
  maxAttempts,
  retryDelayMs,
  runProcessWithRetries,
  logJson,
}) {
  logJson({
    status: "render_verify_step_started",
    step,
    baseUrl,
    skipDeploy,
  });

  await runProcessWithRetries({
    command: process.execPath,
    args,
    env: {
      ...process.env,
      APP_BASE_URL: baseUrl,
      SCENARIO_NON_DESTRUCTIVE: "1",
    },
    label,
    step,
    maxAttempts,
    retryDelayMs,
  });
}

export function buildNonDestructiveScenarios({
  includeScenario,
  includeIntakeBookingScenario,
  includeIntakeWalkInScenario,
  includePartsScenario,
  includeDispatchBoardScenario,
}) {
  return [
    {
      enabled: includeIntakeBookingScenario,
      step: "scenario_intake_page_booking_non_destructive",
      args: ["scripts/intake-page-scenario.js", "--mode", "booking", "--non-destructive"],
      label: "render scenario:intake-page:booking",
    },
    {
      enabled: includeIntakeWalkInScenario,
      step: "scenario_intake_page_walkin_non_destructive",
      args: ["scripts/intake-page-scenario.js", "--mode", "walkin", "--non-destructive"],
      label: "render scenario:intake-page:walkin",
    },
    {
      enabled: includeScenario,
      step: "scenario_scheduling_walkin_non_destructive",
      args: ["scripts/scheduling-walkin-scenario.js", "--non-destructive"],
      label: "render scenario:scheduling-walkin",
    },
    {
      enabled: includePartsScenario,
      step: "scenario_parts_flow_non_destructive",
      args: ["scripts/parts-flow-scenario.js", "--non-destructive"],
      label: "render scenario:parts-flow",
    },
    {
      enabled: includeDispatchBoardScenario,
      step: "scenario_dispatch_board_non_destructive",
      args: ["scripts/dispatch-board-scenario.js", "--non-destructive"],
      label: "render scenario:dispatch-board",
    },
  ];
}

import {
  assertHarness,
  expectStatus,
  failHarness,
} from "./harness-diagnostics.js";
import { loadDotenvIntoProcessSync } from "./dotenv-loader.js";
import {
  buildScenarioIsolation,
  renderScenarioFailure,
  requestScenarioJson,
  runScenario,
} from "./scenario-runtime.js";

loadDotenvIntoProcessSync();
const baseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";
const WRITE_COMPATIBLE_STATUSES = new Set(["scheduled", "in_progress", "paused", "waiting_approval", "waiting_parts"]);

async function request(path, { step, method = "GET", body } = {}) {
  return requestScenarioJson(baseUrl, path, { step, method, body });
}

async function listActiveWorkOrders(step = "list_work_orders") {
  const response = await request("/api/v1/work-orders?includeClosed=false&limit=50", { step });
  expectStatus(response, 200, step);
  assertHarness(Array.isArray(response.payload?.items), "work-order list must return items array", {
    step,
    responseStatus: response.status,
    responsePayload: response.payload,
  });
  return response.payload.items;
}

async function loadWorkOrderDetail(workOrderId, step = "work_order_detail") {
  const response = await request(`/api/v1/work-orders/${encodeURIComponent(workOrderId)}`, { step });
  expectStatus(response, 200, step);
  assertHarness(response.payload?.item?.id === workOrderId, "work-order detail payload mismatch", {
    step,
    workOrderId,
    responsePayload: response.payload,
  });
  return response.payload.item;
}

async function pickWriteTargetWorkOrder() {
  const preferredDetailResponse = await request("/api/v1/work-orders/wo-1004", { step: "work_order_detail_preferred" });
  if (preferredDetailResponse.status === 200) {
    const preferred = preferredDetailResponse.payload?.item;
    if (
      preferred
      && WRITE_COMPATIBLE_STATUSES.has(preferred.status)
      && (preferred.parts?.openBlockingRequestsCount ?? 0) === 0
    ) {
      return preferred;
    }
  }

  const activeOrders = await listActiveWorkOrders("list_work_orders_for_target");
  for (const order of activeOrders) {
    if (!WRITE_COMPATIBLE_STATUSES.has(order.status)) {
      continue;
    }
    const detail = await loadWorkOrderDetail(order.id, "work_order_detail_probe");
    if ((detail.parts?.openBlockingRequestsCount ?? 0) === 0) {
      return detail;
    }
  }

  failHarness("unable to resolve write-compatible work order without existing blocking parts", {
    step: "pick_write_target",
    candidateCount: activeOrders.length,
  });
}

async function runNonDestructiveScenario(mode) {
  const dashboard = await request("/api/v1/dashboard/today", { step: "dashboard_today" });
  expectStatus(dashboard, 200, "dashboard_today");
  assertHarness(Array.isArray(dashboard.payload?.queues?.waitingParts), "dashboard waitingParts queue must be array", {
    step: "dashboard_today",
    responsePayload: dashboard.payload,
  });

  const activeOrders = await listActiveWorkOrders("list_work_orders_non_destructive");
  assertHarness(activeOrders.length >= 1, "expected at least one active work order for read-only parts checks", {
    step: "list_work_orders_non_destructive",
    activeCount: activeOrders.length,
  });

  const candidate = activeOrders.find((item) => item.status === "waiting_parts") ?? activeOrders[0];
  const detail = await loadWorkOrderDetail(candidate.id, "work_order_detail_non_destructive");

  assertHarness(Array.isArray(detail.partsRequests), "work-order detail must include partsRequests array", {
    step: "work_order_detail_non_destructive",
    workOrderId: detail.id,
    responsePayload: detail,
  });
  assertHarness(Array.isArray(detail.partsHistory), "work-order detail must include partsHistory array", {
    step: "work_order_detail_non_destructive",
    workOrderId: detail.id,
    responsePayload: detail,
  });

  const partsList = await request(
    `/api/v1/work-orders/${encodeURIComponent(candidate.id)}/parts-requests?includeResolved=false`,
    { step: "parts_requests_list_non_destructive" },
  );
  expectStatus(partsList, 200, "parts_requests_list_non_destructive");
  assertHarness(Array.isArray(partsList.payload?.items), "parts requests list must include items array", {
    step: "parts_requests_list_non_destructive",
    responsePayload: partsList.payload,
  });

  process.stdout.write(
    `${JSON.stringify({
      status: "parts_flow_scenario_passed",
      mode: mode.name,
      modeSource: mode.source,
      modeReason: mode.reason,
      baseUrl,
      writesPerformed: false,
      isolation: buildScenarioIsolation(mode, false),
      checks: {
        waitingPartsQueueCount: dashboard.payload.queues.waitingParts.length,
        candidateWorkOrderId: candidate.id,
        candidateStatus: candidate.status,
        detailRequestsCount: detail.partsRequests.length,
        detailHistoryCount: detail.partsHistory.length,
        openPartsRequestsCount: partsList.payload.count,
      },
    }, null, 2)}\n`,
  );
}

async function runDefaultScenario(mode) {
  const targetWorkOrder = await pickWriteTargetWorkOrder();
  const uniqueToken = `${Date.now()}`;

  const createRequest = await request(`/api/v1/work-orders/${encodeURIComponent(targetWorkOrder.id)}/parts-requests`, {
    step: "parts_request_create",
    method: "POST",
    body: {
      partName: `Сценарий запчасть ${uniqueToken}`,
      requestedQty: 1,
      requestedUnitCostRub: 1400,
      salePriceRub: 2200,
      status: "requested",
      isBlocking: true,
      reason: "Harness parts-flow scenario create",
    },
  });
  expectStatus(createRequest, 201, "parts_request_create");
  const createdRequestId = createRequest.payload?.item?.id;
  assertHarness(Boolean(createdRequestId), "parts request create response missing item.id", {
    step: "parts_request_create",
    responsePayload: createRequest.payload,
  });
  assertHarness(
    createRequest.payload?.workOrder?.status === "waiting_parts",
    "blocking parts request should move work-order status to waiting_parts when transition is allowed",
    {
      step: "parts_request_create",
      targetWorkOrderId: targetWorkOrder.id,
      responsePayload: createRequest.payload,
    },
  );

  const blockedProgression = await request(`/api/v1/work-orders/${encodeURIComponent(targetWorkOrder.id)}`, {
    step: "work_order_progress_blocked",
    method: "PATCH",
    body: {
      status: "in_progress",
      reason: "Harness must fail while blocking part is open",
    },
  });
  expectStatus(blockedProgression, 409, "work_order_progress_blocked");

  const receivePurchase = await request(
    `/api/v1/work-orders/${encodeURIComponent(targetWorkOrder.id)}/parts-requests/${encodeURIComponent(createdRequestId)}/purchase-actions`,
    {
      step: "parts_purchase_received",
      method: "POST",
      body: {
        supplierName: "Склад сценария",
        supplierReference: `PO-${uniqueToken}`,
        orderedQty: 1,
        unitCostRub: 1400,
        status: "received",
        reason: "Harness parts-flow scenario receive",
      },
    },
  );
  expectStatus(receivePurchase, 201, "parts_purchase_received");
  assertHarness(receivePurchase.payload?.request?.status === "received", "purchase action must sync request status to received", {
    step: "parts_purchase_received",
    responsePayload: receivePurchase.payload,
  });
  assertHarness(receivePurchase.payload?.workOrder?.status === "scheduled", "work-order should resume to scheduled after blocking part resolved", {
    step: "parts_purchase_received",
    responsePayload: receivePurchase.payload,
  });

  const resumedProgression = await request(`/api/v1/work-orders/${encodeURIComponent(targetWorkOrder.id)}`, {
    step: "work_order_progress_resumed",
    method: "PATCH",
    body: {
      status: "in_progress",
      reason: "Harness resumes after part receipt",
    },
  });
  expectStatus(resumedProgression, 200, "work_order_progress_resumed");
  assertHarness(resumedProgression.payload?.item?.status === "in_progress", "work-order should move to in_progress after unblocking", {
    step: "work_order_progress_resumed",
    responsePayload: resumedProgression.payload,
  });

  const createSubstitutionSource = await request(`/api/v1/work-orders/${encodeURIComponent(targetWorkOrder.id)}/parts-requests`, {
    step: "parts_request_create_substitution_source",
    method: "POST",
    body: {
      partName: `Сценарий исходная деталь ${uniqueToken}`,
      requestedQty: 1,
      requestedUnitCostRub: 800,
      salePriceRub: 1500,
      status: "requested",
      isBlocking: false,
      reason: "Harness substitution source",
    },
  });
  expectStatus(createSubstitutionSource, 201, "parts_request_create_substitution_source");
  const sourceRequestId = createSubstitutionSource.payload?.item?.id;
  assertHarness(Boolean(sourceRequestId), "substitution source request id is required", {
    step: "parts_request_create_substitution_source",
    responsePayload: createSubstitutionSource.payload,
  });

  const substituteRequest = await request(
    `/api/v1/work-orders/${encodeURIComponent(targetWorkOrder.id)}/parts-requests/${encodeURIComponent(sourceRequestId)}`,
    {
      step: "parts_request_substitute",
      method: "PATCH",
      body: {
        status: "substituted",
        replacementPartName: `Сценарий заменяющая деталь ${uniqueToken}`,
        replacementRequestedQty: 1,
        replacementSupplierName: "Склад сценария",
        reason: "Harness substitution flow",
      },
    },
  );
  expectStatus(substituteRequest, 200, "parts_request_substitute");
  const replacementRequest = substituteRequest.payload?.workOrder?.partsRequests?.find((item) => item.replacementForRequestId === sourceRequestId);
  assertHarness(Boolean(replacementRequest?.id), "substitution should create replacement request", {
    step: "parts_request_substitute",
    sourceRequestId,
    responsePayload: substituteRequest.payload,
  });

  process.stdout.write(
    `${JSON.stringify({
      status: "parts_flow_scenario_passed",
      mode: mode.name,
      modeSource: mode.source,
      modeReason: mode.reason,
      baseUrl,
      writesPerformed: true,
      isolation: buildScenarioIsolation(mode, true),
      targetWorkOrderId: targetWorkOrder.id,
      checks: {
        createdRequestId,
        blockedProgressionStatus: blockedProgression.status,
        receivedPurchaseActionId: receivePurchase.payload?.item?.id ?? null,
        resumedStatus: resumedProgression.payload?.item?.status ?? null,
        substitutionSourceRequestId: sourceRequestId,
        substitutionReplacementRequestId: replacementRequest?.id ?? null,
      },
    }, null, 2)}\n`,
  );
}

runScenario({
  baseUrl,
  runNonDestructive: runNonDestructiveScenario,
  runDefault: runDefaultScenario,
}).catch((error) => {
  renderScenarioFailure("parts_flow_scenario_failed", error);
  process.exit(1);
});

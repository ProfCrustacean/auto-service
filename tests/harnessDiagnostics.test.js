import test from "node:test";
import assert from "node:assert/strict";
import {
  HarnessFailure,
  buildFailurePayload,
  isLocalBaseUrl,
  parseBooleanFlag,
} from "../scripts/harness-diagnostics.js";

test("parseBooleanFlag normalizes supported values", () => {
  assert.equal(parseBooleanFlag(undefined, "FLAG"), undefined);
  assert.equal(parseBooleanFlag("1", "FLAG"), true);
  assert.equal(parseBooleanFlag("true", "FLAG"), true);
  assert.equal(parseBooleanFlag("YES", "FLAG"), true);
  assert.equal(parseBooleanFlag("0", "FLAG"), false);
  assert.equal(parseBooleanFlag("false", "FLAG"), false);
  assert.equal(parseBooleanFlag("Off", "FLAG"), false);
});

test("parseBooleanFlag rejects invalid values with harness failure", () => {
  assert.throws(() => parseBooleanFlag("maybe", "FLAG"), (error) => {
    assert.equal(error instanceof HarnessFailure, true);
    assert.equal(error.details.field, "FLAG");
    return true;
  });
});

test("isLocalBaseUrl detects loopback targets", () => {
  assert.equal(isLocalBaseUrl("http://127.0.0.1:3000"), true);
  assert.equal(isLocalBaseUrl("http://localhost:3000"), true);
  assert.equal(isLocalBaseUrl("https://auto-service-foundation.onrender.com"), false);
  assert.equal(isLocalBaseUrl("not-a-valid-url"), false);
});

test("buildFailurePayload keeps structured details for machine parsing", () => {
  const error = new HarnessFailure("diagnostic failure", {
    step: "dashboard_api",
    method: "GET",
    path: "/api/v1/dashboard/today",
    responseStatus: 500,
    responsePayload: { error: { code: "internal_error" } },
  });

  const payload = buildFailurePayload("smoke_failed", error);
  assert.equal(payload.status, "smoke_failed");
  assert.equal(payload.errorType, "HarnessFailure");
  assert.equal(payload.step, "dashboard_api");
  assert.equal(payload.method, "GET");
  assert.equal(payload.path, "/api/v1/dashboard/today");
  assert.equal(payload.responseStatus, 500);
  assert.equal(payload.responsePayload.error.code, "internal_error");
  assert.equal(typeof payload.stack, "string");
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  isMutatingMethod,
  listMutationPolicies,
  resolveMutationPolicy,
} from "../src/http/mutationPolicy.js";

test("mutation policy resolves API and UI write routes deterministically", () => {
  assert.equal(resolveMutationPolicy({
    method: "POST",
    path: "/api/v1/customers",
  })?.id, "api.customers.write");

  assert.equal(resolveMutationPolicy({
    method: "POST",
    path: "/appointments/new",
  })?.id, "ui.appointments.new.submit");

  assert.equal(resolveMutationPolicy({
    method: "POST",
    path: "/work-orders/wo-1002/parts-requests/req-1/purchase-actions",
  })?.id, "ui.work_orders.write");

  assert.equal(resolveMutationPolicy({
    method: "POST",
    path: "/dispatch/board/appointments/apt-1/commit",
  })?.id, "ui.dispatch_board.write");

  assert.equal(resolveMutationPolicy({
    method: "PATCH",
    path: "/api/v1/unknown-resource/1",
  }), null);
});

test("mutation policy metadata remains explicit and machine-readable", () => {
  const policies = listMutationPolicies();
  assert.ok(Array.isArray(policies));
  assert.ok(policies.length >= 10);
  assert.equal(
    policies.some((policy) => policy.id === "ui.intake.walk_in.submit"),
    true,
  );
  assert.equal(
    policies.every((policy) => Array.isArray(policy.methods) && Array.isArray(policy.allowedRoles)),
    true,
  );
});

test("isMutatingMethod normalizes HTTP methods", () => {
  assert.equal(isMutatingMethod("post"), true);
  assert.equal(isMutatingMethod("PATCH"), true);
  assert.equal(isMutatingMethod("GET"), false);
});

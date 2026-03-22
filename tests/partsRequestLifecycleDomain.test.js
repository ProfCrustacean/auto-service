import test from "node:test";
import assert from "node:assert/strict";
import {
  PARTS_REQUEST_STATUS_CODES,
  PARTS_PURCHASE_ACTION_STATUS_CODES,
  getPartsRequestStatusLabel,
  isBlockingPartsRequestStatus,
  isKnownPartsPurchaseActionStatus,
  isKnownPartsRequestStatus,
  isPartsRequestTransitionAllowed,
  isTerminalPartsRequestStatus,
  listAllowedPartsRequestTransitions,
} from "../src/domain/partsRequestLifecycle.js";

test("parts request lifecycle exposes deterministic status catalog and transition map", () => {
  assert.equal(Array.isArray(PARTS_REQUEST_STATUS_CODES), true);
  assert.deepEqual(PARTS_REQUEST_STATUS_CODES, [
    "requested",
    "ordered",
    "received",
    "substituted",
    "cancelled",
    "returned",
  ]);

  assert.equal(getPartsRequestStatusLabel("requested"), "Запрошена");
  assert.equal(isKnownPartsRequestStatus("ordered"), true);
  assert.equal(isKnownPartsRequestStatus("unknown"), false);
  assert.equal(isBlockingPartsRequestStatus("ordered"), true);
  assert.equal(isBlockingPartsRequestStatus("received"), false);
  assert.equal(isTerminalPartsRequestStatus("requested"), false);
  assert.equal(isTerminalPartsRequestStatus("cancelled"), true);

  assert.deepEqual(listAllowedPartsRequestTransitions("requested"), ["ordered", "received", "substituted", "cancelled"]);
  assert.equal(isPartsRequestTransitionAllowed("requested", "ordered"), true);
  assert.equal(isPartsRequestTransitionAllowed("requested", "returned"), false);
  assert.equal(isPartsRequestTransitionAllowed("received", "returned"), true);
});

test("parts purchase action status catalog stays strict and stable", () => {
  assert.deepEqual(PARTS_PURCHASE_ACTION_STATUS_CODES, ["ordered", "received", "cancelled", "returned"]);
  assert.equal(isKnownPartsPurchaseActionStatus("ordered"), true);
  assert.equal(isKnownPartsPurchaseActionStatus("received"), true);
  assert.equal(isKnownPartsPurchaseActionStatus("draft"), false);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  mapAppointmentDomainApiError,
  mapSharedCustomerVehicleDomainApiError,
  mapWorkOrderDomainApiError,
} from "../src/http/domainApiErrorMapper.js";

function createMockResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test("shared mapper handles customer/vehicle mismatch with configurable message", () => {
  const res = createMockResponse();
  const handled = mapSharedCustomerVehicleDomainApiError(
    res,
    { code: "vehicle_customer_mismatch" },
    { vehicleCustomerMessage: "must match selected owner" },
  );

  assert.equal(handled, true);
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error.code, "conflict");
  assert.equal(res.body.error.message, "Vehicle does not belong to customer");
  assert.deepEqual(res.body.error.details, [
    { field: "vehicleId", message: "must match selected owner" },
  ]);
});

test("appointment mapper translates status transition and validation domain errors", () => {
  const conflictRes = createMockResponse();
  const conflictHandled = mapAppointmentDomainApiError(conflictRes, {
    code: "appointment_status_transition_invalid",
    details: {
      fromStatus: "booked",
      toStatus: "arrived",
    },
  });

  assert.equal(conflictHandled, true);
  assert.equal(conflictRes.statusCode, 409);
  assert.equal(conflictRes.body.error.code, "conflict");
  assert.match(conflictRes.body.error.details[0].message, /booked -> arrived/u);

  const validationRes = createMockResponse();
  const validationHandled = mapAppointmentDomainApiError(validationRes, {
    code: "appointment_status_invalid",
  });

  assert.equal(validationHandled, true);
  assert.equal(validationRes.statusCode, 400);
  assert.equal(validationRes.body.error.code, "validation_error");
});

test("work-order mapper covers domain validation and leaves unknown errors untouched", () => {
  const res = createMockResponse();
  const handled = mapWorkOrderDomainApiError(res, {
    code: "parts_request_requested_qty_invalid",
  });

  assert.equal(handled, true);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "validation_error");
  assert.equal(res.body.error.details[0].field, "requestedQty");

  const unknownRes = createMockResponse();
  const unknownHandled = mapWorkOrderDomainApiError(unknownRes, {
    code: "unknown_code",
  });

  assert.equal(unknownHandled, false);
  assert.equal(unknownRes.statusCode, null);
  assert.equal(unknownRes.body, null);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  respondItemOrNotFound,
  respondList,
  respondValidationFailure,
  withUnexpectedError,
} from "../src/http/routePrimitives.js";

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

test("respondValidationFailure emits stable validation_error payload", () => {
  const res = createMockResponse();
  respondValidationFailure(res, [{ field: "q", message: "invalid" }]);

  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, "validation_error");
  assert.equal(res.body.error.message, "Request validation failed");
  assert.deepEqual(res.body.error.details, [{ field: "q", message: "invalid" }]);
});

test("respondList keeps deterministic pagination shape", () => {
  const noPagination = createMockResponse();
  respondList(noPagination, { items: [{ id: "1" }] });
  assert.deepEqual(noPagination.body, {
    items: [{ id: "1" }],
    count: 1,
  });

  const withPagination = createMockResponse();
  respondList(withPagination, {
    items: [{ id: "1" }, { id: "2" }],
    limit: 20,
    offset: 10,
  });
  assert.deepEqual(withPagination.body, {
    items: [{ id: "1" }, { id: "2" }],
    count: 2,
    pagination: {
      limit: 20,
      offset: 10,
      returned: 2,
    },
  });
});

test("respondItemOrNotFound returns bool and emits not_found payload", () => {
  const missing = createMockResponse();
  const missingResult = respondItemOrNotFound(missing, {
    entityName: "Customer",
    item: null,
  });

  assert.equal(missingResult, false);
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.body.error.code, "not_found");
  assert.equal(missing.body.error.message, "Customer not found");

  const found = createMockResponse();
  const foundResult = respondItemOrNotFound(found, {
    entityName: "Customer",
    item: { id: "cust-1" },
  });

  assert.equal(foundResult, true);
  assert.equal(found.statusCode, 200);
  assert.deepEqual(found.body, { item: { id: "cust-1" } });
});

test("withUnexpectedError returns handler result and wraps thrown failures", () => {
  const req = { method: "GET", path: "/test", requestId: "req-1" };
  const logger = {
    errorCalls: 0,
    error() {
      this.errorCalls += 1;
    },
    warn() {},
  };

  const okRes = createMockResponse();
  const okValue = withUnexpectedError(logger, req, okRes, "ok_event", () => "ok");
  assert.equal(okValue, "ok");
  assert.equal(okRes.statusCode, null);

  const failRes = createMockResponse();
  const failValue = withUnexpectedError(logger, req, failRes, "fail_event", () => {
    throw new Error("boom");
  });

  assert.equal(failValue, undefined);
  assert.equal(logger.errorCalls, 1);
  assert.equal(failRes.statusCode, 500);
  assert.equal(failRes.body.error.code, "internal_error");
});

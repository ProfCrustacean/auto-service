import test from "node:test";
import assert from "node:assert/strict";
import { positionFromIndex, scanTextForSecrets } from "../scripts/secrets-scan-core.js";

test("scanTextForSecrets finds credential-like literals", () => {
  const linearToken = "lin_api_" + "123456789012345678901234567890";
  const sample = `
const headers = {
  authorization: "${linearToken}",
};
`;

  const findings = scanTextForSecrets(sample);
  assert.ok(findings.length > 0);
  assert.equal(findings.some((finding) => finding.pattern === "linear_api_key_token"), true);
});

test("scanTextForSecrets ignores placeholders and env references", () => {
  const sample = `
RENDER_API_KEY="<key>"
LINEAR_API_KEY=$LINEAR_API_KEY
Authorization: Bearer $RENDER_API_KEY
`;

  const findings = scanTextForSecrets(sample);
  assert.equal(findings.length, 0);
});

test("positionFromIndex returns stable line and column", () => {
  const sample = "a\nb\nc-token";
  const index = sample.indexOf("token");
  const position = positionFromIndex(sample, index);
  assert.deepEqual(position, { line: 3, column: 3 });
});

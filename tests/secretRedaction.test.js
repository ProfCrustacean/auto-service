import test from "node:test";
import assert from "node:assert/strict";
import { redactSecrets, redactSecretsInText, stringifyRedacted } from "../scripts/secret-redaction.js";

test("redactSecretsInText masks known token formats", () => {
  const renderToken = ["rnd_", "v54R3IZj3SLEu0N6HtBzosJEH5so"].join("");
  const linearToken = ["lin_api_", "FTdw8XeUgUHRjbKhvmtjyenGRkWUBZV3lOgwNcAG"].join("");
  const input = [
    `Authorization: Bearer ${renderToken}`,
    `line2 ${linearToken}`,
  ].join("\n");

  const output = redactSecretsInText(input);
  assert.equal(output.includes(renderToken), false);
  assert.equal(output.includes(linearToken), false);
  assert.equal(output.includes("Authorization: Bearer [REDACTED]"), true);
});

test("redactSecretsInText keeps explicit placeholders", () => {
  const input = 'RENDER_API_KEY="<key>"\nLINEAR_API_KEY=$LINEAR_API_KEY';
  const output = redactSecretsInText(input);
  assert.equal(output, input);
});

test("redactSecrets recursively masks sensitive object fields", () => {
  const linearToken = "lin_api_" + "12345678901234567890";
  const renderToken = "rnd_" + "12345678901234567890";
  const payload = {
    status: "ok",
    authorization: linearToken,
    nested: {
      renderApiKey: renderToken,
      token: "abc",
      message: "Authorization: Bearer " + renderToken,
    },
  };

  const redacted = redactSecrets(payload);
  assert.equal(redacted.authorization, "[REDACTED]");
  assert.equal(redacted.nested.renderApiKey, "[REDACTED]");
  assert.equal(redacted.nested.token, "[REDACTED]");
  assert.equal(redacted.nested.message.includes("Bearer [REDACTED]"), true);
});

test("stringifyRedacted never emits raw credential tokens", () => {
  const linearToken = "lin_api_" + "12345678901234567890";
  const renderToken = "rnd_" + "12345678901234567890";
  const text = stringifyRedacted({
    apiKey: linearToken,
    render: renderToken,
  });

  assert.equal(text.includes(linearToken), false);
  assert.equal(text.includes(renderToken), false);
  assert.equal(text.includes("[REDACTED]"), true);
});

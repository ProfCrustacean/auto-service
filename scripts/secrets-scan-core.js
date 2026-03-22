import { redactSecretsInText } from "./secret-redaction.js";

const SAFE_PLACEHOLDER_RE = /^(\$|\[redacted\]|<key>|\*\*\*|example|token|changeme|your_|xxxx|\.\.\.)/iu;

const SECRET_PATTERNS = [
  {
    name: "linear_api_key_token",
    regex: /\blin_api_[A-Za-z0-9]{20,}\b/gu,
    valueFromMatch(match) {
      return match[0];
    },
  },
  {
    name: "render_api_key_token",
    regex: /\brnd_[A-Za-z0-9]{20,}\b/gu,
    valueFromMatch(match) {
      return match[0];
    },
  },
  {
    name: "authorization_bearer_literal",
    regex: /Authorization\s*:\s*Bearer\s+(?!\$)([A-Za-z0-9._~-]{16,})/giu,
    valueFromMatch(match) {
      return match[1] ?? "";
    },
  },
  {
    name: "authorization_header_literal",
    regex: /\bauthorization\b\s*[:=]\s*["'](lin_api_[A-Za-z0-9]{20,}|rnd_[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._~-]{16,})["']/giu,
    valueFromMatch(match) {
      return match[1] ?? "";
    },
  },
  {
    name: "api_key_assignment_literal",
    regex: /\b([A-Z][A-Z0-9_]*API_KEY)\b\s*[=:]\s*["']?([^\s"']{8,})["']?/gu,
    valueFromMatch(match) {
      return match[2] ?? "";
    },
  },
];

function isSafePlaceholder(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized.length === 0) {
    return true;
  }
  if (SAFE_PLACEHOLDER_RE.test(normalized)) {
    return true;
  }
  return normalized.includes("placeholder");
}

export function positionFromIndex(text, index) {
  const prefix = text.slice(0, index);
  const lines = prefix.split("\n");
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
}

export function buildExcerpt(text, index, width = 120) {
  const start = Math.max(0, index - Math.floor(width / 2));
  const end = Math.min(text.length, start + width);
  const excerpt = text.slice(start, end).replace(/\s+/gu, " ").trim();
  return redactSecretsInText(excerpt);
}

export function scanTextForSecrets(text, { maxFindings = 100 } = {}) {
  const findings = [];

  for (const pattern of SECRET_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let match;
    while ((match = pattern.regex.exec(text)) !== null) {
      const rawValue = pattern.valueFromMatch(match);
      if (isSafePlaceholder(rawValue)) {
        continue;
      }

      findings.push({
        pattern: pattern.name,
        index: match.index,
        matchText: redactSecretsInText(match[0]),
      });

      if (findings.length >= maxFindings) {
        return findings;
      }
    }
  }

  return findings;
}


const SECRET_PLACEHOLDER = "[REDACTED]";

const TOKEN_PATTERNS = [
  {
    regex: /(Authorization\s*:\s*Bearer\s+)([A-Za-z0-9._~-]{8,})/giu,
    replace: `$1${SECRET_PLACEHOLDER}`,
  },
  {
    regex: /lin_api_[A-Za-z0-9]{8,}/gu,
    replace: `lin_api_${SECRET_PLACEHOLDER}`,
  },
  {
    regex: /rnd_[A-Za-z0-9]{8,}/gu,
    replace: `rnd_${SECRET_PLACEHOLDER}`,
  },
  {
    regex: /(["']authorization["']\s*:\s*["'])([^"']+)(["'])/giu,
    replace: `$1${SECRET_PLACEHOLDER}$3`,
  },
];

const SENSITIVE_KEY_RE = /(authorization|api[_-]?key|token|secret|password)/iu;
const API_KEY_ASSIGNMENT_RE = /(\b[A-Z][A-Z0-9_]*API_KEY\b\s*[=:]\s*)(["']?)([^\s"',]+)\2/gu;

function isPlaceholderValue(value) {
  const normalized = String(value).trim().toLowerCase();
  return (
    normalized.length === 0
    || normalized === SECRET_PLACEHOLDER.toLowerCase()
    || normalized === "<key>"
    || normalized === "***"
    || normalized === "token"
    || normalized === "example"
    || normalized.startsWith("$")
    || normalized.includes("your_")
    || normalized.includes("example")
    || normalized.includes("placeholder")
  );
}

export function redactSecretsInText(text) {
  if (typeof text !== "string" || text.length === 0) {
    return typeof text === "string" ? text : "";
  }

  let redacted = text;

  for (const pattern of TOKEN_PATTERNS) {
    redacted = redacted.replace(pattern.regex, pattern.replace);
  }

  redacted = redacted.replace(API_KEY_ASSIGNMENT_RE, (match, prefix, quote = "", value = "") => {
    if (isPlaceholderValue(value)) {
      return match;
    }
    return `${prefix}${quote}${SECRET_PLACEHOLDER}${quote}`;
  });

  return redacted;
}

function redactSensitiveObjectValue(key, value) {
  if (!SENSITIVE_KEY_RE.test(String(key))) {
    return redactSecrets(value);
  }

  if (typeof value === "string") {
    return SECRET_PLACEHOLDER;
  }

  return redactSecrets(value);
}

export function redactSecrets(value) {
  if (typeof value === "string") {
    return redactSecretsInText(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }

  if (value && typeof value === "object") {
    const out = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      out[key] = redactSensitiveObjectValue(key, nestedValue);
    }
    return out;
  }

  return value;
}

export function stringifyRedacted(value, spacing = 0) {
  return JSON.stringify(redactSecrets(value), null, spacing);
}

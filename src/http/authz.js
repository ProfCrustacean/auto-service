import { sendApiError } from "./apiErrors.js";

const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

const WRITE_POLICIES = [
  {
    pattern: /^\/api\/v1\/employees(?:\/[^/]+)?$/u,
    allowedRoles: new Set(["owner"]),
  },
  {
    pattern: /^\/api\/v1\/bays(?:\/[^/]+)?$/u,
    allowedRoles: new Set(["owner"]),
  },
  {
    pattern: /^\/api\/v1\/customers(?:\/[^/]+)?$/u,
    allowedRoles: new Set(["owner", "front_desk"]),
  },
  {
    pattern: /^\/api\/v1\/vehicles(?:\/[^/]+)?$/u,
    allowedRoles: new Set(["owner", "front_desk"]),
  },
  {
    pattern: /^\/api\/v1\/appointments(?:\/[^/]+)?$/u,
    allowedRoles: new Set(["owner", "front_desk"]),
  },
  {
    pattern: /^\/api\/v1\/appointments\/[^/]+\/convert-to-work-order$/u,
    allowedRoles: new Set(["owner", "front_desk"]),
  },
  {
    pattern: /^\/api\/v1\/intake\/walk-ins$/u,
    allowedRoles: new Set(["owner", "front_desk"]),
  },
  {
    pattern: /^\/api\/v1\/work-orders(?:\/[^/]+)?$/u,
    allowedRoles: new Set(["owner", "front_desk", "technician"]),
  },
];

function isMutatingApiRequest(req) {
  return req.path.startsWith("/api/v1/") && MUTATING_METHODS.has(req.method);
}

function extractBearerToken(req) {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string") {
    const match = /^Bearer\s+(.+)$/iu.exec(authHeader.trim());
    if (match) {
      return match[1].trim();
    }
  }

  const apiTokenHeader = req.headers["x-api-token"];
  if (typeof apiTokenHeader === "string" && apiTokenHeader.trim().length > 0) {
    return apiTokenHeader.trim();
  }

  return null;
}

function resolveAllowedRoles(path) {
  const policy = WRITE_POLICIES.find((entry) => entry.pattern.test(path));
  if (!policy) {
    return new Set(["owner"]);
  }
  return policy.allowedRoles;
}

export function createApiAuthMiddleware({ logger, authConfig }) {
  const roleByToken = new Map((authConfig?.tokens ?? []).map((entry) => [entry.token, entry.role]));

  return function apiAuthMiddleware(req, res, next) {
    if (!authConfig?.enabled || !isMutatingApiRequest(req)) {
      next();
      return;
    }

    const token = extractBearerToken(req);
    if (!token) {
      sendApiError(res, {
        status: 401,
        code: "unauthorized",
        message: "Authentication token is required for mutating API requests",
      });
      return;
    }

    const role = roleByToken.get(token);
    if (!role) {
      sendApiError(res, {
        status: 401,
        code: "unauthorized",
        message: "Authentication token is invalid",
      });
      return;
    }

    const allowedRoles = resolveAllowedRoles(req.path);
    if (!allowedRoles.has(role)) {
      logger.warn("auth_forbidden", {
        method: req.method,
        path: req.path,
        requestId: req.requestId ?? null,
        role,
      });
      sendApiError(res, {
        status: 403,
        code: "forbidden",
        message: "Role is not allowed to perform this mutation",
      });
      return;
    }

    req.auth = { role };
    next();
  };
}

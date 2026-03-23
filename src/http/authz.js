import { sendApiError } from "./apiErrors.js";
import { isMutatingMethod, resolveMutationPolicy } from "./mutationPolicy.js";

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

function resolveBodyToken(req) {
  if (!req.body || typeof req.body !== "object") {
    return null;
  }

  const bodyToken = req.body.authToken;
  if (typeof bodyToken === "string" && bodyToken.trim().length > 0) {
    return bodyToken.trim();
  }

  return null;
}

function resolveQueryToken(req) {
  const queryToken = req.query?.authToken;
  if (typeof queryToken === "string" && queryToken.trim().length > 0) {
    return queryToken.trim();
  }

  return null;
}

function resolveRequestToken(req) {
  return extractBearerToken(req) ?? resolveBodyToken(req) ?? resolveQueryToken(req);
}

function resolveActorRole({
  req,
  policy,
  roleByToken,
  implicitUiRole,
}) {
  const token = resolveRequestToken(req);
  if (token) {
    const role = roleByToken.get(token);
    if (!role) {
      return {
        error: {
          status: 401,
          code: "unauthorized",
          message: "Authentication token is invalid",
        },
      };
    }

    return {
      role,
      source: "token",
    };
  }

  if (policy.channel === "ui" && implicitUiRole) {
    return {
      role: implicitUiRole,
      source: "implicit_ui",
    };
  }

  return {
    error: {
      status: 401,
      code: "unauthorized",
      message: "Authentication token is required for this mutation",
    },
  };
}

export function createApiAuthMiddleware({ logger, authConfig }) {
  const roleByToken = new Map((authConfig?.tokens ?? []).map((entry) => [entry.token, entry.role]));
  const implicitUiRole = authConfig?.implicitUiRole ?? null;

  return function apiAuthMiddleware(req, res, next) {
    if (!authConfig?.enabled) {
      next();
      return;
    }

    const policy = resolveMutationPolicy({ method: req.method, path: req.path });
    if (!policy && !(req.path.startsWith("/api/v1/") && isMutatingMethod(req.method))) {
      next();
      return;
    }

    const effectivePolicy = policy ?? {
      id: "api.default_owner_fallback",
      channel: "api",
      allowedRoles: new Set(["owner"]),
    };

    const authResolution = resolveActorRole({
      req,
      policy: effectivePolicy,
      roleByToken,
      implicitUiRole,
    });
    if (authResolution.error) {
      sendApiError(res, authResolution.error);
      return;
    }

    if (!effectivePolicy.allowedRoles.has(authResolution.role)) {
      logger.warn("auth_forbidden", {
        method: req.method,
        path: req.path,
        requestId: req.requestId ?? null,
        role: authResolution.role,
        policyId: effectivePolicy.id,
        authSource: authResolution.source,
      });
      sendApiError(res, {
        status: 403,
        code: "forbidden",
        message: "Role is not allowed to perform this mutation",
      });
      return;
    }

    req.auth = {
      role: authResolution.role,
      source: authResolution.source,
      policyId: effectivePolicy.id,
    };
    next();
  };
}

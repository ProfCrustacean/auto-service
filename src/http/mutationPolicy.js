const MUTATING_METHODS = new Set(["POST", "PATCH", "PUT", "DELETE"]);

const MUTATION_POLICIES = [
  {
    id: "api.employees.write",
    channel: "api",
    methods: MUTATING_METHODS,
    pattern: /^\/api\/v1\/employees(?:\/[^/]+)?$/u,
    allowedRoles: new Set(["owner"]),
  },
  {
    id: "api.bays.write",
    channel: "api",
    methods: MUTATING_METHODS,
    pattern: /^\/api\/v1\/bays(?:\/[^/]+)?$/u,
    allowedRoles: new Set(["owner"]),
  },
  {
    id: "api.customers.write",
    channel: "api",
    methods: MUTATING_METHODS,
    pattern: /^\/api\/v1\/customers(?:\/[^/]+)?$/u,
    allowedRoles: new Set(["owner", "front_desk"]),
  },
  {
    id: "api.vehicles.write",
    channel: "api",
    methods: MUTATING_METHODS,
    pattern: /^\/api\/v1\/vehicles(?:\/[^/]+)?$/u,
    allowedRoles: new Set(["owner", "front_desk"]),
  },
  {
    id: "api.appointments.write",
    channel: "api",
    methods: MUTATING_METHODS,
    pattern: /^\/api\/v1\/appointments(?:\/[^/]+)?$/u,
    allowedRoles: new Set(["owner", "front_desk"]),
  },
  {
    id: "api.appointments.convert_to_work_order",
    channel: "api",
    methods: MUTATING_METHODS,
    pattern: /^\/api\/v1\/appointments\/[^/]+\/convert-to-work-order$/u,
    allowedRoles: new Set(["owner", "front_desk"]),
  },
  {
    id: "api.intake.walk_in.create",
    channel: "api",
    methods: MUTATING_METHODS,
    pattern: /^\/api\/v1\/intake\/walk-ins$/u,
    allowedRoles: new Set(["owner", "front_desk"]),
  },
  {
    id: "api.work_orders.write",
    channel: "api",
    methods: MUTATING_METHODS,
    pattern: /^\/api\/v1\/work-orders(?:\/.*)?$/u,
    allowedRoles: new Set(["owner", "front_desk", "technician"]),
  },
  {
    id: "ui.appointments.new.submit",
    channel: "ui",
    methods: new Set(["POST"]),
    pattern: /^\/appointments\/new$/u,
    allowedRoles: new Set(["owner", "front_desk"]),
  },
  {
    id: "ui.intake.walk_in.submit",
    channel: "ui",
    methods: new Set(["POST"]),
    pattern: /^\/intake\/walk-in$/u,
    allowedRoles: new Set(["owner", "front_desk"]),
  },
  {
    id: "ui.work_orders.write",
    channel: "ui",
    methods: new Set(["POST"]),
    pattern: /^\/work-orders\/[^/]+(?:\/(?:parts-requests(?:\/[^/]+(?:\/purchase-actions)?)?|payments))?$/u,
    allowedRoles: new Set(["owner", "front_desk", "technician"]),
  },
  {
    id: "api.dispatch_board.write",
    channel: "ui",
    methods: new Set(["POST"]),
    pattern: /^\/api\/v1\/dispatch\/board\/(?:events\/[^/]+\/(?:preview|commit)|queue\/(?:appointments|walk-ins)\/[^/]+\/schedule)$/u,
    allowedRoles: new Set(["owner", "front_desk"]),
  },
];

export function isMutatingMethod(method) {
  return MUTATING_METHODS.has(String(method ?? "").toUpperCase());
}

export function resolveMutationPolicy({ method, path }) {
  const normalizedMethod = String(method ?? "").toUpperCase();
  const normalizedPath = String(path ?? "");

  for (const policy of MUTATION_POLICIES) {
    if (!policy.methods.has(normalizedMethod)) {
      continue;
    }
    if (policy.pattern.test(normalizedPath)) {
      return policy;
    }
  }

  return null;
}

export function listMutationPolicies() {
  return MUTATION_POLICIES.map((policy) => ({
    id: policy.id,
    channel: policy.channel,
    methods: [...policy.methods],
    pattern: policy.pattern.source,
    allowedRoles: [...policy.allowedRoles],
  }));
}

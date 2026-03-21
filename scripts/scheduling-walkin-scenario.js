const baseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, { method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json();
  return { status: response.status, payload };
}

async function main() {
  const before = await request("/api/v1/dashboard/today");
  assert(before.status === 200, `dashboard before failed: ${before.status}`);

  const uniqueToken = `${Date.now()}`;
  const plannedStartLocal = `SCENARIO-${uniqueToken}`;

  const createAppointment = await request("/api/v1/appointments", {
    method: "POST",
    body: {
      plannedStartLocal,
      customerId: "cust-2",
      vehicleId: "veh-3",
      complaint: `Scenario scheduling ${uniqueToken}`,
      bayId: "bay-1",
      primaryAssignee: "Иван Петров",
      status: "booked",
    },
  });
  assert(createAppointment.status === 201, `appointment create failed: ${createAppointment.status}`);

  const appointmentId = createAppointment.payload.item.id;

  const confirmAppointment = await request(`/api/v1/appointments/${appointmentId}`, {
    method: "PATCH",
    body: { status: "confirmed" },
  });
  assert(confirmAppointment.status === 200, `appointment confirm failed: ${confirmAppointment.status}`);

  const createWalkIn = await request("/api/v1/intake/walk-ins", {
    method: "POST",
    body: {
      customerId: "cust-1",
      vehicleId: "veh-1",
      complaint: `Scenario walk-in ${uniqueToken}`,
      bayId: "bay-2",
      primaryAssignee: "Алексей Соколов",
    },
  });
  assert(createWalkIn.status === 201, `walk-in create failed: ${createWalkIn.status}`);

  const workOrderId = createWalkIn.payload.item.workOrder.id;

  const after = await request("/api/v1/dashboard/today");
  assert(after.status === 200, `dashboard after failed: ${after.status}`);

  assert(
    after.payload.summary.appointmentsToday === before.payload.summary.appointmentsToday + 1,
    "appointmentsToday did not increment by 1",
  );
  assert(
    after.payload.summary.activeWorkOrders === before.payload.summary.activeWorkOrders + 1,
    "activeWorkOrders did not increment by 1",
  );
  assert(after.payload.appointments.some((item) => item.id === appointmentId), "appointment not present on day board");
  assert(after.payload.queues.active.some((item) => item.id === workOrderId), "walk-in work order not present in active queue");

  const result = {
    status: "scheduling_walkin_scenario_passed",
    baseUrl,
    plannedStartLocal,
    appointmentId,
    appointmentCode: createAppointment.payload.item.code,
    workOrderId,
    workOrderCode: createWalkIn.payload.item.workOrder.code,
    checks: {
      appointmentsBefore: before.payload.summary.appointmentsToday,
      appointmentsAfter: after.payload.summary.appointmentsToday,
      activeBefore: before.payload.summary.activeWorkOrders,
      activeAfter: after.payload.summary.activeWorkOrders,
    },
  };

  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ status: "scheduling_walkin_scenario_failed", message: error.message })}\n`);
  process.exit(1);
});

const ACTIVE_STATUSES = new Set([
  "waiting_diagnosis",
  "waiting_approval",
  "waiting_parts",
  "scheduled",
  "in_progress",
  "paused",
  "ready_pickup",
]);

export class DashboardService {
  constructor(repository) {
    this.repository = repository;
  }

  getTodayDashboard() {
    const appointments = this.repository.listAppointments();
    const workOrders = this.repository.listWorkOrders();

    const activeWorkOrders = workOrders.filter((order) => ACTIVE_STATUSES.has(order.status));
    const waitingParts = activeWorkOrders.filter((order) => order.status === "waiting_parts");
    const readyPickup = activeWorkOrders.filter((order) => order.status === "ready_pickup");

    return {
      generatedAt: new Date().toISOString(),
      service: this.repository.getServiceMeta(),
      summary: {
        appointmentsToday: appointments.length,
        activeWorkOrders: activeWorkOrders.length,
        waitingPartsCount: waitingParts.length,
        readyForPickupCount: readyPickup.length,
      },
      appointments,
      queues: {
        waitingParts,
        readyPickup,
        active: activeWorkOrders,
      },
    };
  }
}

import test from "node:test";
import assert from "node:assert/strict";
import { bootstrapPersistence } from "../src/persistence/bootstrapPersistence.js";
import { DashboardService } from "../src/services/dashboardService.js";
import { createSilentLogger, createTempDatabase } from "./helpers/httpHarness.js";

function toDateKeyWithOffset(offsetDays) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

test("DashboardService returns expected queue counts from fixtures", () => {
  const tempDb = createTempDatabase("auto-service-dashboard-test");
  const { databasePath, cleanup } = tempDb;
  const config = {
    appEnv: "test",
    port: 0,
    seedPath: "./data/seed-fixtures.json",
    databasePath,
  };
  const logger = createSilentLogger();
  const { repository, database } = bootstrapPersistence({ config, logger });
  const service = new DashboardService(repository);

  try {
    const payload = service.getTodayDashboard();

    assert.equal(payload.summary.appointmentsToday, payload.appointments.length);
    assert.equal(payload.summary.waitingDiagnosisCount, 1);
    assert.equal(payload.summary.waitingApprovalCount, 0);
    assert.equal(payload.summary.waitingPartsCount, 1);
    assert.equal(payload.summary.pausedCount, 0);
    assert.equal(payload.summary.readyForPickupCount, 1);
    assert.ok(payload.summary.activeWorkOrders >= 4);
    assert.equal(payload.summary.unpaidReadyForPickupCount, 1);
    assert.equal(payload.summary.unpaidReadyForPickupAmountRub, 6500);
    assert.equal(payload.summary.totalOutstandingActiveRub, 27000);
    assert.ok(payload.load.byBay.length >= 2);
    assert.ok(payload.load.byAssignee.length >= 3);
    assert.equal(Array.isArray(payload.queues.waitingDiagnosis), true);
    assert.equal(Array.isArray(payload.queues.waitingApproval), true);
    assert.equal(Array.isArray(payload.queues.paused), true);
    assert.equal(payload.queues.waitingParts[0].pendingPartsCount, 1);
    assert.notEqual(payload.queues.waitingParts[0].oldestPendingPartsAgeLabel, "н/д");
    assert.equal(payload.queues.waitingParts[0].nextActionLabel, "Контроль поставки (1)");
    assert.equal(payload.week.days.length, 7);
    assert.ok(Array.isArray(payload.week.byBay));
    assert.ok(Array.isArray(payload.week.byAssignee));
    assert.equal(typeof payload.week.summary.unscheduledAppointmentsCount, "number");
    assert.equal(payload.search.performed, false);
    assert.equal(payload.search.totals.all, 0);
  } finally {
    database.close();
    cleanup();
  }
});

test("DashboardService today metrics include only current local-day appointments", () => {
  const tempDb = createTempDatabase("auto-service-dashboard-today-filter");
  const { databasePath, cleanup } = tempDb;
  const config = {
    appEnv: "test",
    port: 0,
    seedPath: "./data/seed-fixtures.json",
    databasePath,
  };
  const logger = createSilentLogger();
  const { repository, database } = bootstrapPersistence({ config, logger });
  const service = new DashboardService(repository);

  try {
    const before = service.getTodayDashboard();
    const yesterday = toDateKeyWithOffset(-1);
    const today = toDateKeyWithOffset(0);
    const tomorrow = toDateKeyWithOffset(1);

    repository.createAppointment({
      id: "apt-filter-yesterday",
      code: "APT-920",
      plannedStartLocal: `${yesterday} 09:00`,
      customerId: "cust-1",
      vehicleId: "veh-1",
      customerNameSnapshot: "Елена Смирнова",
      vehicleLabelSnapshot: "Kia Rio A123AA13",
      complaint: "Вчерашняя запись",
      status: "booked",
      bayId: null,
      bayNameSnapshot: null,
      primaryAssignee: null,
      source: "manual",
      expectedDurationMin: null,
      notes: null,
    });

    repository.createAppointment({
      id: "apt-filter-today",
      code: "APT-921",
      plannedStartLocal: `${today} 10:00`,
      customerId: "cust-2",
      vehicleId: "veh-3",
      customerNameSnapshot: "Павел Иванов",
      vehicleLabelSnapshot: "Lada Vesta C789CC13",
      complaint: "Сегодняшняя запись",
      status: "booked",
      bayId: null,
      bayNameSnapshot: null,
      primaryAssignee: null,
      source: "manual",
      expectedDurationMin: null,
      notes: null,
    });

    repository.createAppointment({
      id: "apt-filter-tomorrow",
      code: "APT-922",
      plannedStartLocal: `${tomorrow} 11:00`,
      customerId: "cust-3",
      vehicleId: "veh-2",
      customerNameSnapshot: "Ольга Кузьмина",
      vehicleLabelSnapshot: "Hyundai Solaris B456BB13",
      complaint: "Завтрашняя запись",
      status: "booked",
      bayId: null,
      bayNameSnapshot: null,
      primaryAssignee: null,
      source: "manual",
      expectedDurationMin: null,
      notes: null,
    });

    const after = service.getTodayDashboard();
    assert.equal(after.summary.appointmentsToday, before.summary.appointmentsToday + 1);
    assert.equal(after.appointments.some((item) => item.id === "apt-filter-today"), true);
    assert.equal(after.appointments.some((item) => item.id === "apt-filter-yesterday"), false);
    assert.equal(after.appointments.some((item) => item.id === "apt-filter-tomorrow"), false);
  } finally {
    database.close();
    cleanup();
  }
});

test("DashboardService week plan highlights overbooking and unscheduled appointments", () => {
  const tempDb = createTempDatabase("auto-service-dashboard-week-test");
  const { databasePath, cleanup } = tempDb;
  const config = {
    appEnv: "test",
    port: 0,
    seedPath: "./data/seed-fixtures.json",
    databasePath,
  };
  const logger = createSilentLogger();
  const { repository, database } = bootstrapPersistence({ config, logger });
  const service = new DashboardService(repository);

  try {
    const dayKey = toDateKeyWithOffset(2);

    repository.createAppointment({
      id: "apt-overbook-1",
      code: "APT-901",
      plannedStartLocal: `${dayKey} 10:00`,
      customerId: "cust-1",
      vehicleId: "veh-1",
      customerNameSnapshot: "Елена Смирнова",
      vehicleLabelSnapshot: "Kia Rio A123AA13",
      complaint: "Диагностика подвески",
      status: "booked",
      bayId: "bay-1",
      bayNameSnapshot: "Пост 1",
      primaryAssignee: "Алексей Соколов",
      source: "manual",
      expectedDurationMin: null,
      notes: null,
    });

    repository.createAppointment({
      id: "apt-overbook-2",
      code: "APT-902",
      plannedStartLocal: `${dayKey} 10:00`,
      customerId: "cust-2",
      vehicleId: "veh-3",
      customerNameSnapshot: "Павел Иванов",
      vehicleLabelSnapshot: "Lada Vesta C789CC13",
      complaint: "Проверка электрики",
      status: "booked",
      bayId: "bay-1",
      bayNameSnapshot: "Пост 1",
      primaryAssignee: "Алексей Соколов",
      source: "manual",
      expectedDurationMin: null,
      notes: null,
    });

    repository.createAppointment({
      id: "apt-unscheduled-1",
      code: "APT-903",
      plannedStartLocal: "SCENARIO-UNSCHEDULED",
      customerId: "cust-4",
      vehicleId: "veh-4",
      customerNameSnapshot: "Марина Козлова",
      vehicleLabelSnapshot: "Ford Focus E321EE13",
      complaint: "Без даты",
      status: "booked",
      bayId: null,
      bayNameSnapshot: null,
      primaryAssignee: null,
      source: "manual",
      expectedDurationMin: null,
      notes: null,
    });

    const payload = service.getTodayDashboard();

    assert.equal(payload.week.summary.unscheduledAppointmentsCount, 1);
    assert.ok(payload.week.summary.overbookedCellsByBay >= 1);
    assert.ok(payload.week.summary.overbookedCellsByAssignee >= 1);

    const bayRow = payload.week.byBay.find((item) => item.key === "Пост 1");
    assert.ok(bayRow);
    const bayDay = bayRow.days.find((item) => item.dayKey === dayKey);
    assert.ok(bayDay);
    assert.equal(bayDay.isOverbooked, true);
    assert.equal(bayDay.slotConflicts, 1);

    const assigneeRow = payload.week.byAssignee.find((item) => item.key === "Алексей Соколов");
    assert.ok(assigneeRow);
    const assigneeDay = assigneeRow.days.find((item) => item.dayKey === dayKey);
    assert.ok(assigneeDay);
    assert.equal(assigneeDay.isOverbooked, true);
    assert.equal(assigneeDay.slotConflicts, 1);
  } finally {
    database.close();
    cleanup();
  }
});

test("DashboardService search lookup supports customer, phone, plate, VIN and model", () => {
  const tempDb = createTempDatabase("auto-service-dashboard-search-test");
  const { databasePath, cleanup } = tempDb;
  const config = {
    appEnv: "test",
    port: 0,
    seedPath: "./data/seed-fixtures.json",
    databasePath,
  };
  const logger = createSilentLogger();
  const { repository, database } = bootstrapPersistence({ config, logger });
  const service = new DashboardService(repository);

  try {
    const byCustomer = service.searchLookup({ query: "Елена" });
    assert.ok(byCustomer.totals.customers >= 1);
    assert.equal(byCustomer.customers.some((item) => item.fullName === "Елена Смирнова"), true);

    const byPhone = service.searchLookup({ query: "79271001010" });
    assert.ok(byPhone.totals.customers >= 1);
    assert.equal(byPhone.customers.some((item) => item.id === "cust-1"), true);

    const byPlate = service.searchLookup({ query: "A123AA13" });
    assert.ok(byPlate.totals.vehicles >= 1);
    assert.equal(byPlate.vehicles.some((item) => item.id === "veh-1"), true);

    const byVin = service.searchLookup({ query: "xwehc512ba0000001" });
    assert.ok(byVin.totals.vehicles >= 1);
    assert.equal(byVin.vehicles.some((item) => item.id === "veh-1"), true);

    const byModel = service.searchLookup({ query: "Focus" });
    assert.ok(byModel.totals.vehicles >= 1);
    assert.equal(byModel.vehicles.some((item) => item.id === "veh-4"), true);

    assert.equal(typeof byModel.timing.durationMs, "number");
    assert.equal(typeof byModel.timing.withinBaseline, "boolean");
    assert.equal(byModel.timing.withinBaseline, true);
  } finally {
    database.close();
    cleanup();
  }
});

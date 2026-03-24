import { buildDispatchBoard } from "./dashboard/dispatchProjection.js";
import { buildSearchResults } from "./dashboard/searchProjection.js";
import { buildTodayDashboard } from "./dashboard/todayProjection.js";

export class DashboardService {
  constructor(repository) {
    this.repository = repository;
  }

  getTodayDashboard({ searchQuery = "" } = {}) {
    return buildTodayDashboard({
      repository: this.repository,
      searchQuery,
    });
  }

  getDispatchBoard({ day = null, laneMode = "bay" } = {}) {
    return buildDispatchBoard({
      repository: this.repository,
      day,
      laneMode,
    });
  }

  searchLookup({ query = "" } = {}) {
    return buildSearchResults({
      repository: this.repository,
      query,
    });
  }

  getWorkOrderById(id) {
    return this.repository.getWorkOrderRecordById(id);
  }

  getAppointmentById(id) {
    return this.repository.listAppointments().find((appointment) => appointment.id === id) ?? null;
  }
}

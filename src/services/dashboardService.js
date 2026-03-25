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

  searchLookup({ query = "" } = {}) {
    return buildSearchResults({
      repository: this.repository,
      query,
    });
  }

  getOperationsReport({ dateFromLocal = null, dateToLocal = null } = {}) {
    return this.repository.getOperationsReport({ dateFromLocal, dateToLocal });
  }

  getWorkOrderById(id) {
    return this.repository.getWorkOrderRecordById(id);
  }

  getAppointmentById(id) {
    return this.repository.listAppointments().find((appointment) => appointment.id === id) ?? null;
  }
}

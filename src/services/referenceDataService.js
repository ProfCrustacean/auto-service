import { randomUUID } from "node:crypto";

function toId(prefix) {
  return `${prefix}-${randomUUID().split("-")[0]}`;
}

export class ReferenceDataService {
  constructor(repository) {
    this.repository = repository;
  }

  listEmployees({ includeInactive = false, limit = null, offset = 0 } = {}) {
    return this.repository.listEmployees({ includeInactive, limit, offset });
  }

  getEmployeeById(id) {
    return this.repository.getEmployeeById(id);
  }

  createEmployee({ name, roles, isActive }) {
    return this.repository.createEmployee({
      id: toId("emp"),
      name,
      roles,
      isActive,
    });
  }

  updateEmployeeById(id, updates) {
    return this.repository.updateEmployeeById(id, updates);
  }

  deactivateEmployeeById(id) {
    return this.repository.deactivateEmployeeById(id);
  }

  listBays({ includeInactive = false, limit = null, offset = 0 } = {}) {
    return this.repository.listBays({ includeInactive, limit, offset });
  }

  getBayById(id) {
    return this.repository.getBayById(id);
  }

  createBay({ name, isActive }) {
    return this.repository.createBay({
      id: toId("bay"),
      name,
      isActive,
    });
  }

  updateBayById(id, updates) {
    return this.repository.updateBayById(id, updates);
  }

  deactivateBayById(id) {
    return this.repository.deactivateBayById(id);
  }
}

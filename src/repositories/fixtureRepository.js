import fs from "node:fs";

export class FixtureRepository {
  constructor(seedPath) {
    this.seedPath = seedPath;
    this.snapshot = null;
  }

  load() {
    if (this.snapshot) {
      return this.snapshot;
    }

    const raw = fs.readFileSync(this.seedPath, "utf8");
    const parsed = JSON.parse(raw);
    this.snapshot = Object.freeze(parsed);
    return this.snapshot;
  }

  getServiceMeta() {
    return this.load().service;
  }

  listAppointments() {
    return this.load().appointments;
  }

  listWorkOrders() {
    return this.load().workOrders;
  }

  listVehicles() {
    return this.load().vehicles;
  }

  listCustomers() {
    return this.load().customers;
  }
}

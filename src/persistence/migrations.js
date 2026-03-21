export const MIGRATIONS = [
  {
    version: "001",
    name: "phase1_schedule_intake_foundation",
    up: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS service_meta (
        id TEXT PRIMARY KEY,
        display_name_ru TEXT NOT NULL,
        city_ru TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS bays (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1))
      );

      CREATE TABLE IF NOT EXISTS employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        roles_json TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        messaging_handle TEXT,
        notes TEXT,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS vehicles (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        label TEXT NOT NULL,
        vin TEXT,
        plate_number TEXT,
        make TEXT,
        model TEXT,
        production_year INTEGER,
        engine_or_trim TEXT,
        mileage_km INTEGER,
        is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        planned_start_local TEXT NOT NULL,
        customer_id TEXT NOT NULL REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        customer_name_snapshot TEXT NOT NULL,
        vehicle_label_snapshot TEXT NOT NULL,
        complaint TEXT NOT NULL,
        status TEXT NOT NULL,
        bay_id TEXT REFERENCES bays(id) ON UPDATE CASCADE ON DELETE SET NULL,
        bay_name_snapshot TEXT,
        primary_assignee TEXT,
        source TEXT NOT NULL,
        expected_duration_min INTEGER,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS intake_events (
        id TEXT PRIMARY KEY,
        source TEXT NOT NULL CHECK (source IN ('appointment', 'walk_in')),
        source_appointment_id TEXT REFERENCES appointments(id) ON UPDATE CASCADE ON DELETE SET NULL,
        customer_id TEXT NOT NULL REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        complaint TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS work_orders (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        customer_id TEXT NOT NULL REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        customer_name_snapshot TEXT NOT NULL,
        vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        vehicle_label_snapshot TEXT NOT NULL,
        status TEXT NOT NULL,
        status_label_ru TEXT NOT NULL,
        bay_id TEXT REFERENCES bays(id) ON UPDATE CASCADE ON DELETE SET NULL,
        bay_name_snapshot TEXT,
        primary_assignee TEXT,
        complaint TEXT,
        findings TEXT,
        internal_notes TEXT,
        customer_notes TEXT,
        blocked_since_iso TEXT,
        balance_due_rub INTEGER NOT NULL DEFAULT 0 CHECK (balance_due_rub >= 0),
        created_at TEXT NOT NULL,
        closed_at TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
      CREATE INDEX IF NOT EXISTS idx_customers_full_name ON customers(full_name);
      CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate_number);
      CREATE INDEX IF NOT EXISTS idx_vehicles_vin ON vehicles(vin);
      CREATE INDEX IF NOT EXISTS idx_appointments_planned_start_local ON appointments(planned_start_local);
      CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
      CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
      CREATE INDEX IF NOT EXISTS idx_work_orders_code ON work_orders(code);
      CREATE INDEX IF NOT EXISTS idx_intake_events_status ON intake_events(status);
    `,
    down: `
      DROP INDEX IF EXISTS idx_intake_events_status;
      DROP INDEX IF EXISTS idx_work_orders_code;
      DROP INDEX IF EXISTS idx_work_orders_status;
      DROP INDEX IF EXISTS idx_appointments_status;
      DROP INDEX IF EXISTS idx_appointments_planned_start_local;
      DROP INDEX IF EXISTS idx_vehicles_vin;
      DROP INDEX IF EXISTS idx_vehicles_plate;
      DROP INDEX IF EXISTS idx_customers_full_name;
      DROP INDEX IF EXISTS idx_customers_phone;

      DROP TABLE IF EXISTS work_orders;
      DROP TABLE IF EXISTS intake_events;
      DROP TABLE IF EXISTS appointments;
      DROP TABLE IF EXISTS vehicles;
      DROP TABLE IF EXISTS customers;
      DROP TABLE IF EXISTS employees;
      DROP TABLE IF EXISTS bays;
      DROP TABLE IF EXISTS service_meta;
      DROP TABLE IF EXISTS schema_migrations;
    `,
  },
  {
    version: "002",
    name: "add_bay_timestamps",
    up: `
      ALTER TABLE bays ADD COLUMN created_at TEXT;
      ALTER TABLE bays ADD COLUMN updated_at TEXT;

      UPDATE bays
      SET
        created_at = COALESCE(created_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at = COALESCE(updated_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));
    `,
    down: `
      -- SQLite does not support DROP COLUMN in a straightforward reversible way for this table.
      -- Intentionally a no-op rollback for timestamp columns.
    `,
  },
];

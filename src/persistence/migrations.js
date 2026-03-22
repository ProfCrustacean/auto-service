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
  {
    version: "003",
    name: "add_vehicle_ownership_history",
    up: `
      CREATE TABLE IF NOT EXISTS vehicle_ownership_history (
        id TEXT PRIMARY KEY,
        vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        customer_id TEXT NOT NULL REFERENCES customers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        changed_at TEXT NOT NULL,
        change_reason TEXT NOT NULL,
        source TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_vehicle_ownership_history_vehicle_changed
      ON vehicle_ownership_history(vehicle_id, changed_at DESC);
    `,
    down: `
      DROP INDEX IF EXISTS idx_vehicle_ownership_history_vehicle_changed;
      DROP TABLE IF EXISTS vehicle_ownership_history;
    `,
  },
  {
    version: "004",
    name: "add_code_sequences",
    up: `
      CREATE TABLE IF NOT EXISTS code_sequences (
        entity TEXT PRIMARY KEY,
        next_value INTEGER NOT NULL CHECK (next_value > 0)
      );

      INSERT INTO code_sequences(entity, next_value)
      VALUES (
        'appointment',
        COALESCE((
          SELECT MAX(CAST(substr(code, 5) AS INTEGER)) + 1
          FROM appointments
          WHERE code GLOB 'APT-[0-9]*'
        ), 1)
      )
      ON CONFLICT(entity) DO NOTHING;

      INSERT INTO code_sequences(entity, next_value)
      VALUES (
        'work_order',
        COALESCE((
          SELECT MAX(CAST(substr(code, 4) AS INTEGER)) + 1
          FROM work_orders
          WHERE code GLOB 'WO-[0-9]*'
        ), 1)
      )
      ON CONFLICT(entity) DO NOTHING;
    `,
    down: `
      DROP TABLE IF EXISTS code_sequences;
    `,
  },
  {
    version: "005",
    name: "normalize_appointment_slots",
    up: `
      UPDATE appointments
      SET planned_start_local = replace(trim(planned_start_local), 'T', ' ')
      WHERE planned_start_local GLOB '____-__-__T__:__';

      UPDATE appointments
      SET planned_start_local = strftime('%Y-%m-%d', COALESCE(datetime(created_at), datetime('now'))) || ' ' || substr(planned_start_local, 9, 5)
      WHERE planned_start_local GLOB 'Сегодня __:__';

      UPDATE appointments
      SET planned_start_local = strftime('%Y-%m-%d', datetime(COALESCE(datetime(created_at), datetime('now')), '+1 day')) || ' ' || substr(planned_start_local, 8, 5)
      WHERE planned_start_local GLOB 'Завтра __:__';
    `,
    down: `
      -- Slot normalization is intentionally irreversible.
    `,
  },
  {
    version: "006",
    name: "add_search_indexes",
    up: `
      CREATE INDEX IF NOT EXISTS idx_vehicles_label ON vehicles(label);
      CREATE INDEX IF NOT EXISTS idx_vehicles_make ON vehicles(make);
      CREATE INDEX IF NOT EXISTS idx_vehicles_model ON vehicles(model);

      CREATE INDEX IF NOT EXISTS idx_appointments_code ON appointments(code);
      CREATE INDEX IF NOT EXISTS idx_appointments_customer_snapshot ON appointments(customer_name_snapshot);
      CREATE INDEX IF NOT EXISTS idx_appointments_vehicle_snapshot ON appointments(vehicle_label_snapshot);
      CREATE INDEX IF NOT EXISTS idx_appointments_assignee ON appointments(primary_assignee);

      CREATE INDEX IF NOT EXISTS idx_work_orders_customer_snapshot ON work_orders(customer_name_snapshot);
      CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle_snapshot ON work_orders(vehicle_label_snapshot);
      CREATE INDEX IF NOT EXISTS idx_work_orders_assignee ON work_orders(primary_assignee);
    `,
    down: `
      DROP INDEX IF EXISTS idx_work_orders_assignee;
      DROP INDEX IF EXISTS idx_work_orders_vehicle_snapshot;
      DROP INDEX IF EXISTS idx_work_orders_customer_snapshot;

      DROP INDEX IF EXISTS idx_appointments_assignee;
      DROP INDEX IF EXISTS idx_appointments_vehicle_snapshot;
      DROP INDEX IF EXISTS idx_appointments_customer_snapshot;
      DROP INDEX IF EXISTS idx_appointments_code;

      DROP INDEX IF EXISTS idx_vehicles_model;
      DROP INDEX IF EXISTS idx_vehicles_make;
      DROP INDEX IF EXISTS idx_vehicles_label;
    `,
  },
  {
    version: "007",
    name: "add_work_order_lifecycle_audit_tables",
    up: `
      CREATE TABLE IF NOT EXISTS work_order_status_history (
        id TEXT PRIMARY KEY,
        work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
        from_status TEXT,
        from_status_label_ru TEXT,
        to_status TEXT NOT NULL,
        to_status_label_ru TEXT NOT NULL,
        changed_at TEXT NOT NULL,
        changed_by TEXT,
        reason TEXT,
        source TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_work_order_status_history_order_changed
      ON work_order_status_history(work_order_id, changed_at DESC);

      CREATE TABLE IF NOT EXISTS appointment_work_order_links (
        appointment_id TEXT PRIMARY KEY REFERENCES appointments(id) ON UPDATE CASCADE ON DELETE CASCADE,
        work_order_id TEXT NOT NULL UNIQUE REFERENCES work_orders(id) ON UPDATE CASCADE ON DELETE RESTRICT,
        created_at TEXT NOT NULL
      );

      INSERT INTO work_order_status_history(
        id,
        work_order_id,
        from_status,
        from_status_label_ru,
        to_status,
        to_status_label_ru,
        changed_at,
        changed_by,
        reason,
        source
      )
      SELECT
        'woh-' || lower(hex(randomblob(8))),
        w.id,
        NULL,
        NULL,
        w.status,
        w.status_label_ru,
        COALESCE(w.created_at, w.updated_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        'migration',
        'Initial lifecycle history backfill',
        'migration_007_backfill'
      FROM work_orders w
      WHERE NOT EXISTS (
        SELECT 1
        FROM work_order_status_history h
        WHERE h.work_order_id = w.id
      );
    `,
    down: `
      DROP TABLE IF EXISTS appointment_work_order_links;
      DROP INDEX IF EXISTS idx_work_order_status_history_order_changed;
      DROP TABLE IF EXISTS work_order_status_history;
    `,
  },
  {
    version: "008",
    name: "add_work_order_parts_flow_tables",
    up: `
      CREATE TABLE IF NOT EXISTS work_order_parts_requests (
        id TEXT PRIMARY KEY,
        work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
        replacement_for_request_id TEXT REFERENCES work_order_parts_requests(id) ON UPDATE CASCADE ON DELETE SET NULL,
        part_name TEXT NOT NULL,
        supplier_name TEXT,
        expected_arrival_date_local TEXT,
        requested_qty INTEGER NOT NULL CHECK (requested_qty > 0),
        requested_unit_cost_rub INTEGER NOT NULL DEFAULT 0 CHECK (requested_unit_cost_rub >= 0),
        sale_price_rub INTEGER NOT NULL DEFAULT 0 CHECK (sale_price_rub >= 0),
        status TEXT NOT NULL,
        status_label_ru TEXT NOT NULL,
        is_blocking INTEGER NOT NULL DEFAULT 1 CHECK (is_blocking IN (0, 1)),
        notes TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_work_order_parts_requests_order_status
      ON work_order_parts_requests(work_order_id, status, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_work_order_parts_requests_blocking
      ON work_order_parts_requests(work_order_id, is_blocking, status, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_work_order_parts_requests_replacement
      ON work_order_parts_requests(replacement_for_request_id);

      CREATE TABLE IF NOT EXISTS parts_purchase_actions (
        id TEXT PRIMARY KEY,
        parts_request_id TEXT NOT NULL REFERENCES work_order_parts_requests(id) ON UPDATE CASCADE ON DELETE CASCADE,
        supplier_name TEXT,
        supplier_reference TEXT,
        ordered_qty INTEGER NOT NULL CHECK (ordered_qty > 0),
        unit_cost_rub INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_rub >= 0),
        status TEXT NOT NULL,
        ordered_at TEXT NOT NULL,
        received_at TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_parts_purchase_actions_request_created
      ON parts_purchase_actions(parts_request_id, created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_parts_purchase_actions_request_status
      ON parts_purchase_actions(parts_request_id, status, created_at DESC);

      CREATE TABLE IF NOT EXISTS work_order_parts_history (
        id TEXT PRIMARY KEY,
        work_order_id TEXT NOT NULL REFERENCES work_orders(id) ON UPDATE CASCADE ON DELETE CASCADE,
        parts_request_id TEXT REFERENCES work_order_parts_requests(id) ON UPDATE CASCADE ON DELETE SET NULL,
        purchase_action_id TEXT REFERENCES parts_purchase_actions(id) ON UPDATE CASCADE ON DELETE SET NULL,
        from_status TEXT,
        from_status_label_ru TEXT,
        to_status TEXT,
        to_status_label_ru TEXT,
        changed_at TEXT NOT NULL,
        changed_by TEXT,
        reason TEXT,
        source TEXT NOT NULL,
        details_json TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_work_order_parts_history_order_changed
      ON work_order_parts_history(work_order_id, changed_at DESC);
    `,
    down: `
      DROP INDEX IF EXISTS idx_work_order_parts_history_order_changed;
      DROP TABLE IF EXISTS work_order_parts_history;

      DROP INDEX IF EXISTS idx_parts_purchase_actions_request_status;
      DROP INDEX IF EXISTS idx_parts_purchase_actions_request_created;
      DROP TABLE IF EXISTS parts_purchase_actions;

      DROP INDEX IF EXISTS idx_work_order_parts_requests_replacement;
      DROP INDEX IF EXISTS idx_work_order_parts_requests_blocking;
      DROP INDEX IF EXISTS idx_work_order_parts_requests_order_status;
      DROP TABLE IF EXISTS work_order_parts_requests;
    `,
  },
];

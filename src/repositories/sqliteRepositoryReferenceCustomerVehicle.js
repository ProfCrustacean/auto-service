import { randomUUID } from "node:crypto";
import {
  mapBayRow,
  mapCustomerRecord,
  mapEmployeeRow,
  mapVehicleOwnershipHistoryRow,
  mapVehicleRecord,
} from "./sqliteRepositoryMappers.js";

export function listVehiclesRepository(repository) {
  return repository.database
    .prepare(
      `SELECT
        id,
        customer_id AS customerId,
        label,
        vin
       FROM vehicles
       WHERE is_active = 1
       ORDER BY label ASC`,
    )
    .all();
}

export function listCustomersRepository(repository) {
  return repository.database
    .prepare(
      `SELECT
        id,
        full_name AS name,
        phone
       FROM customers
       WHERE is_active = 1
       ORDER BY full_name ASC`,
    )
    .all();
}

export function listEmployeesRepository(repository, { includeInactive = false, limit = null, offset = 0 } = {}) {
  const whereClause = includeInactive ? "" : "WHERE is_active = 1";
  const hasLimit = Number.isInteger(limit);
  const hasOffsetOnly = !hasLimit && Number.isInteger(offset) && offset > 0;
  const paginationClause = hasLimit
    ? " LIMIT ? OFFSET ?"
    : hasOffsetOnly
      ? " LIMIT -1 OFFSET ?"
      : "";
  const paginationValues = hasLimit
    ? [limit, offset]
    : hasOffsetOnly
      ? [offset]
      : [];

  const rows = repository.database
    .prepare(
      `SELECT
        id,
        name,
        roles_json AS rolesJson,
        is_active AS isActive,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM employees
       ${whereClause}
       ORDER BY name ASC${paginationClause}`,
    )
    .all(...paginationValues);

  return rows.map(mapEmployeeRow);
}

export function getEmployeeByIdRepository(repository, id) {
  const row = repository.database
    .prepare(
      `SELECT
        id,
        name,
        roles_json AS rolesJson,
        is_active AS isActive,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM employees
       WHERE id = ?`,
    )
    .get(id);

  return mapEmployeeRow(row);
}

export function createEmployeeRepository(repository, { id, name, roles, isActive }) {
  const nowIso = new Date().toISOString();

  repository.database
    .prepare(
      `INSERT INTO employees(id, name, roles_json, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, name, JSON.stringify(roles), isActive ? 1 : 0, nowIso, nowIso);

  return getEmployeeByIdRepository(repository, id);
}

export function updateEmployeeByIdRepository(repository, id, updates) {
  const existing = getEmployeeByIdRepository(repository, id);
  if (!existing) {
    return null;
  }

  const assignments = [];
  const values = [];

  if (updates.name !== undefined) {
    assignments.push("name = ?");
    values.push(updates.name);
  }

  if (updates.roles !== undefined) {
    assignments.push("roles_json = ?");
    values.push(JSON.stringify(updates.roles));
  }

  if (updates.isActive !== undefined) {
    assignments.push("is_active = ?");
    values.push(updates.isActive ? 1 : 0);
  }

  if (assignments.length === 0) {
    return existing;
  }

  assignments.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  repository.database.prepare(`UPDATE employees SET ${assignments.join(", ")} WHERE id = ?`).run(...values);

  return getEmployeeByIdRepository(repository, id);
}

export function deactivateEmployeeByIdRepository(repository, id) {
  return updateEmployeeByIdRepository(repository, id, { isActive: false });
}

export function listBaysRepository(repository, { includeInactive = false, limit = null, offset = 0 } = {}) {
  const whereClause = includeInactive ? "" : "WHERE is_active = 1";
  const hasLimit = Number.isInteger(limit);
  const hasOffsetOnly = !hasLimit && Number.isInteger(offset) && offset > 0;
  const paginationClause = hasLimit
    ? " LIMIT ? OFFSET ?"
    : hasOffsetOnly
      ? " LIMIT -1 OFFSET ?"
      : "";
  const paginationValues = hasLimit
    ? [limit, offset]
    : hasOffsetOnly
      ? [offset]
      : [];

  const rows = repository.database
    .prepare(
      `SELECT
        id,
        name,
        is_active AS isActive,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM bays
       ${whereClause}
       ORDER BY name ASC${paginationClause}`,
    )
    .all(...paginationValues);

  return rows.map(mapBayRow);
}

export function getBayByIdRepository(repository, id) {
  const row = repository.database
    .prepare(
      `SELECT
        id,
        name,
        is_active AS isActive,
        created_at AS createdAt,
        updated_at AS updatedAt
       FROM bays
       WHERE id = ?`,
    )
    .get(id);

  return mapBayRow(row);
}

export function createBayRepository(repository, { id, name, isActive }) {
  const nowIso = new Date().toISOString();

  repository.database
    .prepare(
      `INSERT INTO bays(id, name, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(id, name, isActive ? 1 : 0, nowIso, nowIso);

  return getBayByIdRepository(repository, id);
}

export function updateBayByIdRepository(repository, id, updates) {
  const existing = getBayByIdRepository(repository, id);
  if (!existing) {
    return null;
  }

  const assignments = [];
  const values = [];

  if (updates.name !== undefined) {
    assignments.push("name = ?");
    values.push(updates.name);
  }

  if (updates.isActive !== undefined) {
    assignments.push("is_active = ?");
    values.push(updates.isActive ? 1 : 0);
  }

  if (assignments.length === 0) {
    return existing;
  }

  assignments.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  repository.database.prepare(`UPDATE bays SET ${assignments.join(", ")} WHERE id = ?`).run(...values);

  return getBayByIdRepository(repository, id);
}

export function deactivateBayByIdRepository(repository, id) {
  return updateBayByIdRepository(repository, id, { isActive: false });
}

export function listCustomerRecordsRepository(
  repository,
  { includeInactive = false, query = "", limit = null, offset = 0 } = {},
) {
  const conditions = [];
  const values = [];

  if (!includeInactive) {
    conditions.push("c.is_active = 1");
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length > 0) {
    conditions.push("(c.full_name LIKE ? OR c.phone LIKE ?)");
    const pattern = `%${trimmedQuery}%`;
    values.push(pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const hasLimit = Number.isInteger(limit);
  const hasOffsetOnly = !hasLimit && Number.isInteger(offset) && offset > 0;
  const paginationClause = hasLimit
    ? " LIMIT ? OFFSET ?"
    : hasOffsetOnly
      ? " LIMIT -1 OFFSET ?"
      : "";
  const paginationValues = hasLimit
    ? [limit, offset]
    : hasOffsetOnly
      ? [offset]
      : [];

  const rows = repository.database
    .prepare(
      `SELECT
        c.id,
        c.full_name AS fullName,
        c.phone,
        c.messaging_handle AS messagingHandle,
        c.notes,
        c.is_active AS isActive,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt
       FROM customers c
       ${whereClause}
       ORDER BY c.full_name ASC${paginationClause}`,
    )
    .all(...values, ...paginationValues);

  return rows.map(mapCustomerRecord);
}

export function searchCustomersRepository(repository, { query, limit }) {
  const trimmedQuery = query.trim();
  const pattern = `%${trimmedQuery}%`;
  const phoneDigits = trimmedQuery.replace(/\D/gu, "");
  const phonePattern = `%${phoneDigits}%`;

  const total = repository.database
    .prepare(
      `SELECT COUNT(1) AS count
       FROM customers c
       WHERE c.is_active = 1
         AND (
           c.full_name LIKE ?
           OR c.phone LIKE ?
           OR (? != '' AND replace(replace(replace(replace(replace(c.phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?)
         )`,
    )
    .get(pattern, pattern, phoneDigits, phonePattern)
    .count;

  const rows = repository.database
    .prepare(
      `SELECT
        c.id,
        c.full_name AS fullName,
        c.phone
       FROM customers c
       WHERE c.is_active = 1
         AND (
           c.full_name LIKE ?
           OR c.phone LIKE ?
           OR (? != '' AND replace(replace(replace(replace(replace(c.phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?)
         )
       ORDER BY c.full_name ASC
       LIMIT ?`,
    )
    .all(pattern, pattern, phoneDigits, phonePattern, limit);

  return { total, rows };
}

export function getCustomerByIdRepository(repository, id) {
  const row = repository.database
    .prepare(
      `SELECT
        c.id,
        c.full_name AS fullName,
        c.phone,
        c.messaging_handle AS messagingHandle,
        c.notes,
        c.is_active AS isActive,
        c.created_at AS createdAt,
        c.updated_at AS updatedAt
       FROM customers c
       WHERE c.id = ?`,
    )
    .get(id);

  return mapCustomerRecord(row);
}

export function createCustomerRepository(
  repository,
  { id, fullName, phone, messagingHandle, notes, isActive },
) {
  const nowIso = new Date().toISOString();

  repository.database
    .prepare(
      `INSERT INTO customers(
        id,
        full_name,
        phone,
        messaging_handle,
        notes,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, fullName, phone, messagingHandle, notes, isActive ? 1 : 0, nowIso, nowIso);

  return getCustomerByIdRepository(repository, id);
}

export function updateCustomerByIdRepository(repository, id, updates) {
  const existing = getCustomerByIdRepository(repository, id);
  if (!existing) {
    return null;
  }

  const assignments = [];
  const values = [];

  if (updates.fullName !== undefined) {
    assignments.push("full_name = ?");
    values.push(updates.fullName);
  }

  if (updates.phone !== undefined) {
    assignments.push("phone = ?");
    values.push(updates.phone);
  }

  if (updates.messagingHandle !== undefined) {
    assignments.push("messaging_handle = ?");
    values.push(updates.messagingHandle);
  }

  if (updates.notes !== undefined) {
    assignments.push("notes = ?");
    values.push(updates.notes);
  }

  if (updates.isActive !== undefined) {
    assignments.push("is_active = ?");
    values.push(updates.isActive ? 1 : 0);
  }

  if (assignments.length === 0) {
    return existing;
  }

  assignments.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(id);

  repository.database.prepare(`UPDATE customers SET ${assignments.join(", ")} WHERE id = ?`).run(...values);

  return getCustomerByIdRepository(repository, id);
}

export function deactivateCustomerByIdRepository(repository, id) {
  return updateCustomerByIdRepository(repository, id, { isActive: false });
}

export function listVehicleRecordsRepository(
  repository,
  { includeInactive = false, query = "", customerId = null, limit = null, offset = 0 } = {},
) {
  const conditions = [];
  const values = [];

  if (!includeInactive) {
    conditions.push("v.is_active = 1");
  }

  if (customerId) {
    conditions.push("v.customer_id = ?");
    values.push(customerId);
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length > 0) {
    conditions.push(
      "(v.label LIKE ? OR COALESCE(v.plate_number, '') LIKE ? OR COALESCE(v.vin, '') LIKE ? OR COALESCE(v.make, '') LIKE ? OR COALESCE(v.model, '') LIKE ?)",
    );
    const pattern = `%${trimmedQuery}%`;
    values.push(pattern, pattern, pattern, pattern, pattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const hasLimit = Number.isInteger(limit);
  const hasOffsetOnly = !hasLimit && Number.isInteger(offset) && offset > 0;
  const paginationClause = hasLimit
    ? " LIMIT ? OFFSET ?"
    : hasOffsetOnly
      ? " LIMIT -1 OFFSET ?"
      : "";
  const paginationValues = hasLimit
    ? [limit, offset]
    : hasOffsetOnly
      ? [offset]
      : [];

  const rows = repository.database
    .prepare(
      `SELECT
        v.id,
        v.customer_id AS customerId,
        c.full_name AS customerName,
        v.label,
        v.vin,
        v.plate_number AS plateNumber,
        v.make,
        v.model,
        v.production_year AS productionYear,
        v.engine_or_trim AS engineOrTrim,
        v.mileage_km AS mileageKm,
        v.is_active AS isActive,
        v.created_at AS createdAt,
        v.updated_at AS updatedAt
       FROM vehicles v
       JOIN customers c ON c.id = v.customer_id
       ${whereClause}
       ORDER BY v.label ASC${paginationClause}`,
    )
    .all(...values, ...paginationValues);

  return rows.map(mapVehicleRecord);
}

export function searchVehiclesRepository(repository, { query, limit }) {
  const trimmedQuery = query.trim();
  const pattern = `%${trimmedQuery}%`;

  const total = repository.database
    .prepare(
      `SELECT COUNT(1) AS count
       FROM vehicles v
       JOIN customers c ON c.id = v.customer_id
       WHERE v.is_active = 1
         AND (
           v.label LIKE ?
           OR COALESCE(v.plate_number, '') LIKE ?
           OR COALESCE(v.vin, '') LIKE ?
           OR COALESCE(v.make, '') LIKE ?
           OR COALESCE(v.model, '') LIKE ?
           OR c.full_name LIKE ?
         )`,
    )
    .get(pattern, pattern, pattern, pattern, pattern, pattern)
    .count;

  const rows = repository.database
    .prepare(
      `SELECT
        v.id,
        v.customer_id AS customerId,
        c.full_name AS customerName,
        v.label,
        v.plate_number AS plateNumber,
        v.vin,
        v.model
       FROM vehicles v
       JOIN customers c ON c.id = v.customer_id
       WHERE v.is_active = 1
         AND (
           v.label LIKE ?
           OR COALESCE(v.plate_number, '') LIKE ?
           OR COALESCE(v.vin, '') LIKE ?
           OR COALESCE(v.make, '') LIKE ?
           OR COALESCE(v.model, '') LIKE ?
           OR c.full_name LIKE ?
         )
       ORDER BY v.label ASC
       LIMIT ?`,
    )
    .all(pattern, pattern, pattern, pattern, pattern, pattern, limit);

  return { total, rows };
}

export function getVehicleByIdRepository(repository, id) {
  const row = repository.database
    .prepare(
      `SELECT
        v.id,
        v.customer_id AS customerId,
        c.full_name AS customerName,
        v.label,
        v.vin,
        v.plate_number AS plateNumber,
        v.make,
        v.model,
        v.production_year AS productionYear,
        v.engine_or_trim AS engineOrTrim,
        v.mileage_km AS mileageKm,
        v.is_active AS isActive,
        v.created_at AS createdAt,
        v.updated_at AS updatedAt
       FROM vehicles v
       JOIN customers c ON c.id = v.customer_id
       WHERE v.id = ?`,
    )
    .get(id);

  return mapVehicleRecord(row);
}

export function createVehicleRepository(repository, payload) {
  const {
    id,
    customerId,
    label,
    vin,
    plateNumber,
    make,
    model,
    productionYear,
    engineOrTrim,
    mileageKm,
    isActive,
  } = payload;
  const nowIso = new Date().toISOString();

  repository.runInTransaction(() => {
    repository.database
      .prepare(
        `INSERT INTO vehicles(
          id,
          customer_id,
          label,
          vin,
          plate_number,
          make,
          model,
          production_year,
          engine_or_trim,
          mileage_km,
          is_active,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        customerId,
        label,
        vin,
        plateNumber,
        make,
        model,
        productionYear,
        engineOrTrim,
        mileageKm,
        isActive ? 1 : 0,
        nowIso,
        nowIso,
      );

    repository.database
      .prepare(
        `INSERT INTO vehicle_ownership_history(
          id,
          vehicle_id,
          customer_id,
          changed_at,
          change_reason,
          source
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(`ownership-${randomUUID().split("-")[0]}`, id, customerId, nowIso, "vehicle_created", "api");
  });

  return getVehicleByIdRepository(repository, id);
}

export function updateVehicleByIdRepository(repository, id, updates) {
  const existing = getVehicleByIdRepository(repository, id);
  if (!existing) {
    return null;
  }

  const assignments = [];
  const values = [];

  if (updates.customerId !== undefined) {
    assignments.push("customer_id = ?");
    values.push(updates.customerId);
  }

  if (updates.label !== undefined) {
    assignments.push("label = ?");
    values.push(updates.label);
  }

  if (updates.vin !== undefined) {
    assignments.push("vin = ?");
    values.push(updates.vin);
  }

  if (updates.plateNumber !== undefined) {
    assignments.push("plate_number = ?");
    values.push(updates.plateNumber);
  }

  if (updates.make !== undefined) {
    assignments.push("make = ?");
    values.push(updates.make);
  }

  if (updates.model !== undefined) {
    assignments.push("model = ?");
    values.push(updates.model);
  }

  if (updates.productionYear !== undefined) {
    assignments.push("production_year = ?");
    values.push(updates.productionYear);
  }

  if (updates.engineOrTrim !== undefined) {
    assignments.push("engine_or_trim = ?");
    values.push(updates.engineOrTrim);
  }

  if (updates.mileageKm !== undefined) {
    assignments.push("mileage_km = ?");
    values.push(updates.mileageKm);
  }

  if (updates.isActive !== undefined) {
    assignments.push("is_active = ?");
    values.push(updates.isActive ? 1 : 0);
  }

  if (assignments.length === 0) {
    return existing;
  }

  const nowIso = new Date().toISOString();
  assignments.push("updated_at = ?");
  values.push(nowIso);
  values.push(id);

  const customerChanged = updates.customerId !== undefined && updates.customerId !== existing.customerId;

  repository.runInTransaction(() => {
    repository.database.prepare(`UPDATE vehicles SET ${assignments.join(", ")} WHERE id = ?`).run(...values);

    if (customerChanged) {
      repository.database
        .prepare(
          `INSERT INTO vehicle_ownership_history(
            id,
            vehicle_id,
            customer_id,
            changed_at,
            change_reason,
            source
          ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          `ownership-${randomUUID().split("-")[0]}`,
          id,
          updates.customerId,
          nowIso,
          "owner_reassigned",
          "api",
        );
    }
  });

  return getVehicleByIdRepository(repository, id);
}

export function deactivateVehicleByIdRepository(repository, id) {
  return updateVehicleByIdRepository(repository, id, { isActive: false });
}

export function listVehicleOwnershipHistoryRepository(repository, vehicleId) {
  const rows = repository.database
    .prepare(
      `SELECT
        h.id,
        h.vehicle_id AS vehicleId,
        h.customer_id AS customerId,
        c.full_name AS customerName,
        h.changed_at AS changedAt,
        h.change_reason AS changeReason,
        h.source
       FROM vehicle_ownership_history h
       JOIN customers c ON c.id = h.customer_id
       WHERE h.vehicle_id = ?
       ORDER BY h.changed_at DESC, h.id DESC`,
    )
    .all(vehicleId);

  return rows.map(mapVehicleOwnershipHistoryRow);
}

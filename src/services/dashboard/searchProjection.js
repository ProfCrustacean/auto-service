import {
  SEARCH_RESULTS_LIMIT,
  SEARCH_TIMING_BASELINE_MS,
} from "./constants.js";

function normalizeLookupText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^0-9a-zа-яё]/giu, "");
}

function buildEmptySearchPayload() {
  return {
    query: "",
    normalizedQuery: "",
    performed: false,
    limits: {
      perGroup: SEARCH_RESULTS_LIMIT,
    },
    timing: null,
    totals: {
      customers: 0,
      vehicles: 0,
      appointments: 0,
      workOrders: 0,
      all: 0,
    },
    truncated: {
      customers: false,
      vehicles: false,
      appointments: false,
      workOrders: false,
    },
    customers: [],
    vehicles: [],
    appointments: [],
    workOrders: [],
  };
}

export function buildSearchResults({ repository, query = "" }) {
  const queryText = String(query ?? "").trim();
  if (queryText.length === 0) {
    return buildEmptySearchPayload();
  }

  const startedAtMs = Date.now();
  const normalizedQuery = normalizeLookupText(queryText);
  const customerResult = repository.searchCustomers({
    query: queryText,
    limit: SEARCH_RESULTS_LIMIT,
  });
  const vehicleResult = repository.searchVehicles({
    query: queryText,
    limit: SEARCH_RESULTS_LIMIT,
  });
  const appointmentResult = repository.searchAppointmentRecords({
    query: queryText,
    limit: SEARCH_RESULTS_LIMIT,
  });
  const workOrderResult = repository.searchWorkOrders({
    query: queryText,
    limit: SEARCH_RESULTS_LIMIT,
  });

  const customers = {
    items: customerResult.rows.map((item) => ({
      id: item.id,
      fullName: item.fullName,
      phone: item.phone,
    })),
    total: customerResult.total,
    truncated: customerResult.total > SEARCH_RESULTS_LIMIT,
  };

  const vehicles = {
    items: vehicleResult.rows.map((item) => ({
      id: item.id,
      customerId: item.customerId,
      customerName: item.customerName,
      label: item.label,
      plateNumber: item.plateNumber,
      vin: item.vin,
      model: item.model,
    })),
    total: vehicleResult.total,
    truncated: vehicleResult.total > SEARCH_RESULTS_LIMIT,
  };

  const appointments = {
    items: appointmentResult.rows.map((item) => ({
      id: item.id,
      code: item.code,
      plannedStartLocal: item.plannedStartLocal,
      customerName: item.customerName,
      vehicleLabel: item.vehicleLabel,
      detailHref: `/appointments/${item.id}`,
    })),
    total: appointmentResult.total,
    truncated: appointmentResult.total > SEARCH_RESULTS_LIMIT,
  };

  const workOrders = {
    items: workOrderResult.rows.map((item) => ({
      id: item.id,
      code: item.code,
      customerName: item.customerName,
      vehicleLabel: item.vehicleLabel,
      statusLabelRu: item.statusLabelRu,
      detailHref: `/work-orders/${item.id}`,
    })),
    total: workOrderResult.total,
    truncated: workOrderResult.total > SEARCH_RESULTS_LIMIT,
  };

  const durationMs = Date.now() - startedAtMs;

  return {
    query: queryText,
    normalizedQuery,
    performed: true,
    limits: {
      perGroup: SEARCH_RESULTS_LIMIT,
    },
    timing: {
      durationMs,
      baselineMs: SEARCH_TIMING_BASELINE_MS,
      withinBaseline: durationMs <= SEARCH_TIMING_BASELINE_MS,
    },
    totals: {
      customers: customers.total,
      vehicles: vehicles.total,
      appointments: appointments.total,
      workOrders: workOrders.total,
      all: customers.total + vehicles.total + appointments.total + workOrders.total,
    },
    truncated: {
      customers: customers.truncated,
      vehicles: vehicles.truncated,
      appointments: appointments.truncated,
      workOrders: workOrders.truncated,
    },
    customers: customers.items,
    vehicles: vehicles.items,
    appointments: appointments.items,
    workOrders: workOrders.items,
  };
}

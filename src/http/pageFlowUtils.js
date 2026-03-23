import { validateCustomerCreate, validateVehicleCreate } from "./customerVehicleValidators.js";

export function normalizeScalar(value) {
  if (Array.isArray(value)) {
    return normalizeScalar(value[0]);
  }

  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

export function normalizeFormValuesByFields(input = {}, fieldNames = []) {
  const values = {};
  for (const fieldName of fieldNames) {
    values[fieldName] = normalizeScalar(input[fieldName]);
  }
  return values;
}

export function coerceIntegerOrRaw(value) {
  const text = normalizeScalar(value);
  if (text.length === 0) {
    return undefined;
  }

  if (/^-?\d+$/u.test(text)) {
    return Number.parseInt(text, 10);
  }

  return text;
}

export function hasAnyInput(values, fieldNames = []) {
  return fieldNames.some((fieldName) => normalizeScalar(values[fieldName]).length > 0);
}

export function buildCustomerVehicleFormHelpers({ formFields, inlineCustomerFields, inlineVehicleFields }) {
  return {
    normalizeFormValues(input = {}) {
      return normalizeFormValuesByFields(input, formFields);
    },
    hasInlineCustomerInput(values) {
      return hasAnyInput(values, inlineCustomerFields);
    },
    hasInlineVehicleInput(values) {
      return hasAnyInput(values, inlineVehicleFields);
    },
  };
}

export function createValidationLocalizer({ fieldLabels, exactTranslations }) {
  return (field, message) => {
    const normalizedMessage = String(message ?? "Неверное значение");
    const exact = exactTranslations.get(normalizedMessage);
    if (exact) {
      return exact;
    }

    const label = fieldLabels[field] ?? field ?? "Форма";

    if (normalizedMessage.includes("must be a non-empty string or null")) {
      return `${label}: укажите корректное текстовое значение`;
    }

    if (normalizedMessage.includes("is required and must be a non-empty string")) {
      return `${label}: заполните поле`;
    }

    if (normalizedMessage.includes("must be a non-empty string")) {
      return `${label}: укажите корректное текстовое значение`;
    }

    if (normalizedMessage.includes("must be string or null")) {
      return `${label}: значение должно быть строкой или пустым`;
    }

    if (normalizedMessage.includes("must be a string")) {
      return `${label}: значение должно быть строкой`;
    }

    if (normalizedMessage.includes("must be integer or null")) {
      return `${label}: значение должно быть целым числом или пустым`;
    }

    if (normalizedMessage.includes("must be between")) {
      return `${label}: значение вне допустимого диапазона`;
    }

    if (normalizedMessage === "unknown field") {
      return "Неподдерживаемое поле формы";
    }

    return normalizedMessage;
  };
}

export function mapValidationErrors(errors, localizeValidationMessage, fieldMap = {}) {
  return errors.map((error) => ({
    field: fieldMap[error.field] ?? error.field,
    message: localizeValidationMessage(fieldMap[error.field] ?? error.field, error.message),
  }));
}

export function resolveCustomerVehicleLookup(customerVehicleService, query, limit) {
  const lookupQuery = normalizeScalar(query);
  if (lookupQuery.length === 0) {
    return {
      query: "",
      performed: false,
      customers: [],
      vehicles: [],
    };
  }

  return {
    query: lookupQuery,
    performed: true,
    customers: customerVehicleService
      .listCustomers({ includeInactive: false, query: lookupQuery })
      .slice(0, limit),
    vehicles: customerVehicleService
      .listVehicles({ includeInactive: false, query: lookupQuery })
      .slice(0, limit),
  };
}

export function buildCustomerVehicleOptions(referenceDataService, customerVehicleService) {
  return {
    bays: referenceDataService
      .listBays({ includeInactive: false })
      .sort((left, right) => left.name.localeCompare(right.name, "ru-RU")),
    employees: referenceDataService
      .listEmployees({ includeInactive: false })
      .sort((left, right) => left.name.localeCompare(right.name, "ru-RU")),
    customers: customerVehicleService
      .listCustomers({ includeInactive: false })
      .sort((left, right) => left.fullName.localeCompare(right.fullName, "ru-RU")),
    vehicles: customerVehicleService
      .listVehicles({ includeInactive: false })
      .sort((left, right) => left.label.localeCompare(right.label, "ru-RU")),
  };
}

export function resolveSelectedCustomerVehicle(customerVehicleService, values) {
  return {
    customer: values.customerId.length > 0 ? customerVehicleService.getCustomerById(values.customerId) : null,
    vehicle: values.vehicleId.length > 0 ? customerVehicleService.getVehicleById(values.vehicleId) : null,
  };
}

export function appendCustomerVehicleSelectionWarnings(values, selected, warnings = []) {
  const nextWarnings = [...warnings];
  if (values.customerId.length > 0 && !selected.customer) {
    nextWarnings.push("Выбранный клиент не найден. Выберите клиента заново.");
  }

  if (values.vehicleId.length > 0 && !selected.vehicle) {
    nextWarnings.push("Выбранное авто не найдено. Выберите авто заново.");
  }

  if (
    selected.customer
    && selected.vehicle
    && selected.vehicle.customerId !== selected.customer.id
  ) {
    nextWarnings.push("Выбранное авто принадлежит другому клиенту. Проверьте выбор перед сохранением.");
  }

  return nextWarnings;
}

export function buildCustomerVehiclePageModel({
  referenceDataService,
  customerVehicleService,
  values,
  lookupResultsLimit,
  errors = [],
  warnings = [],
  messages = [],
  extra = {},
}) {
  const options = buildCustomerVehicleOptions(referenceDataService, customerVehicleService);
  const selected = resolveSelectedCustomerVehicle(customerVehicleService, values);
  const nextWarnings = appendCustomerVehicleSelectionWarnings(values, selected, warnings);
  const lookup = resolveCustomerVehicleLookup(customerVehicleService, values.q, lookupResultsLimit);

  return {
    values,
    options,
    selected,
    lookup,
    errors,
    warnings: nextWarnings,
    messages,
    ...extra,
  };
}

export function resolveInlineCustomerVehicleCreation({
  values,
  selectedCustomerId,
  selectedVehicleId,
  hasInlineCustomerInput,
  hasInlineVehicleInput,
  localizeValidationMessage,
}) {
  const errors = [];
  let customerId = selectedCustomerId;
  let vehicleId = selectedVehicleId;
  let inlineCustomerPayload = null;
  let inlineVehiclePayload = null;

  if (!customerId && hasInlineCustomerInput(values)) {
    const customerValidation = validateCustomerCreate({
      fullName: values.newCustomerFullName,
      phone: values.newCustomerPhone,
      messagingHandle: values.newCustomerMessagingHandle || null,
      notes: values.newCustomerNotes || null,
    });

    if (!customerValidation.ok) {
      errors.push(...mapValidationErrors(customerValidation.errors, localizeValidationMessage, {
        fullName: "newCustomerFullName",
        phone: "newCustomerPhone",
        messagingHandle: "newCustomerMessagingHandle",
        notes: "newCustomerNotes",
      }));
    } else {
      inlineCustomerPayload = customerValidation.value;
    }
  }

  if (errors.length === 0 && !vehicleId && hasInlineVehicleInput(values)) {
    if (!customerId && !inlineCustomerPayload) {
      errors.push({
        field: "vehicleId",
        message: "Сначала выберите или создайте клиента",
      });
    } else {
      const vehicleValidation = validateVehicleCreate({
        customerId: customerId || "cust-inline",
        label: values.newVehicleLabel,
        plateNumber: values.newVehiclePlateNumber || null,
        vin: values.newVehicleVin || null,
        make: values.newVehicleMake || null,
        model: values.newVehicleModel || null,
        productionYear: coerceIntegerOrRaw(values.newVehicleProductionYear) ?? null,
        mileageKm: coerceIntegerOrRaw(values.newVehicleMileageKm) ?? null,
        engineOrTrim: values.newVehicleEngineOrTrim || null,
      });

      if (!vehicleValidation.ok) {
        errors.push(...mapValidationErrors(vehicleValidation.errors, localizeValidationMessage, {
          label: "newVehicleLabel",
          plateNumber: "newVehiclePlateNumber",
          vin: "newVehicleVin",
          make: "newVehicleMake",
          model: "newVehicleModel",
          productionYear: "newVehicleProductionYear",
          mileageKm: "newVehicleMileageKm",
          engineOrTrim: "newVehicleEngineOrTrim",
        }));
      } else {
        inlineVehiclePayload = vehicleValidation.value;
      }
    }
  }

  return {
    errors,
    customerId,
    vehicleId,
    inlineCustomerPayload,
    inlineVehiclePayload,
  };
}

export function validateCustomerVehicleSubmission({
  values,
  buildPayload,
  validatePayload,
  hasInlineCustomerInput,
  hasInlineVehicleInput,
  localizeValidationMessage,
}) {
  const errors = [];

  const preliminaryPayload = buildPayload(values, {
    customerId: values.customerId || "cust-temporary",
    vehicleId: values.vehicleId || "veh-temporary",
  });
  const preliminaryValidation = validatePayload(preliminaryPayload);
  if (!preliminaryValidation.ok) {
    errors.push(
      ...mapValidationErrors(preliminaryValidation.errors.filter((error) => {
        return error.field !== "customerId" && error.field !== "vehicleId";
      }), localizeValidationMessage),
    );
  }

  let customerId = values.customerId;
  let vehicleId = values.vehicleId;
  let inlineCustomerPayload = null;
  let inlineVehiclePayload = null;
  if (errors.length === 0) {
    const inlineResolution = resolveInlineCustomerVehicleCreation({
      values,
      selectedCustomerId: customerId,
      selectedVehicleId: vehicleId,
      hasInlineCustomerInput,
      hasInlineVehicleInput,
      localizeValidationMessage,
    });
    errors.push(...inlineResolution.errors);
    customerId = inlineResolution.customerId;
    vehicleId = inlineResolution.vehicleId;
    inlineCustomerPayload = inlineResolution.inlineCustomerPayload;
    inlineVehiclePayload = inlineResolution.inlineVehiclePayload;
  }

  const payload = buildPayload(values, {
    customerId: customerId || (inlineCustomerPayload ? "cust-inline" : ""),
    vehicleId: vehicleId || (inlineVehiclePayload ? "veh-inline" : ""),
  });
  const validation = validatePayload(payload);
  if (!validation.ok) {
    errors.push(...mapValidationErrors(validation.errors, localizeValidationMessage));
  }

  return {
    errors,
    customerId,
    vehicleId,
    inlineCustomerPayload,
    inlineVehiclePayload,
    validation,
  };
}

export function renderPageUnexpectedError({
  logger,
  error,
  event,
  res,
  buildModel,
  renderPage,
  values,
}) {
  logger.error(event, { message: error.message });
  const model = buildModel({
    values,
    errors: [{ field: "form", message: "Не удалось выполнить операцию. Повторите попытку." }],
  });
  renderPage(res, { statusCode: 500, model });
}

export function mapSharedCustomerVehicleDomainError(error) {
  if (error.code === "customer_not_found") {
    return {
      statusCode: 404,
      errors: [{ field: "customerId", message: "Клиент не найден" }],
    };
  }

  if (error.code === "vehicle_not_found") {
    return {
      statusCode: 404,
      errors: [{ field: "vehicleId", message: "Авто не найдено" }],
    };
  }

  if (error.code === "bay_not_found") {
    return {
      statusCode: 404,
      errors: [{ field: "bayId", message: "Пост не найден" }],
    };
  }

  if (error.code === "vehicle_customer_mismatch") {
    return {
      statusCode: 409,
      errors: [{ field: "vehicleId", message: "Авто не принадлежит выбранному клиенту" }],
    };
  }

  return null;
}

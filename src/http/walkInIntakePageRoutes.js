import { validateWalkInCreate } from "./walkInIntakeValidators.js";
import { validateCustomerCreate, validateVehicleCreate } from "./customerVehicleValidators.js";
import { renderWalkInIntakePage } from "../ui/walkInIntakePage.js";

const LOOKUP_RESULTS_LIMIT = 8;
const FIELD_LABELS = {
  customerId: "Клиент",
  vehicleId: "Авто",
  complaint: "Жалоба/запрос",
  bayId: "Пост",
  primaryAssignee: "Ответственный",
  newCustomerFullName: "Новый клиент: ФИО",
  newCustomerPhone: "Новый клиент: телефон",
  newCustomerMessagingHandle: "Новый клиент: мессенджер",
  newCustomerNotes: "Новый клиент: заметка",
  newVehicleLabel: "Новое авто: название",
  newVehiclePlateNumber: "Новое авто: номер",
  newVehicleVin: "Новое авто: VIN",
  newVehicleMake: "Новое авто: марка",
  newVehicleModel: "Новое авто: модель",
  newVehicleProductionYear: "Новое авто: год",
  newVehicleMileageKm: "Новое авто: пробег",
  newVehicleEngineOrTrim: "Новое авто: двигатель/комплектация",
};
const EXACT_VALIDATION_MESSAGE_TRANSLATIONS = new Map([
  ["customerId is required and must be a non-empty string", "Выберите клиента или заполните блок нового клиента"],
  ["vehicleId is required and must be a non-empty string", "Выберите авто или заполните блок нового авто"],
  ["complaint is required and must be a non-empty string", "Опишите жалобу или запрос клиента"],
  ["unknown field", "Неподдерживаемое поле формы"],
]);

function normalizeScalar(value) {
  if (Array.isArray(value)) {
    return normalizeScalar(value[0]);
  }

  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function normalizeFormValues(input = {}) {
  return {
    q: normalizeScalar(input.q),
    customerId: normalizeScalar(input.customerId),
    vehicleId: normalizeScalar(input.vehicleId),
    complaint: normalizeScalar(input.complaint),
    bayId: normalizeScalar(input.bayId),
    primaryAssignee: normalizeScalar(input.primaryAssignee),
    newCustomerFullName: normalizeScalar(input.newCustomerFullName),
    newCustomerPhone: normalizeScalar(input.newCustomerPhone),
    newCustomerMessagingHandle: normalizeScalar(input.newCustomerMessagingHandle),
    newCustomerNotes: normalizeScalar(input.newCustomerNotes),
    newVehicleLabel: normalizeScalar(input.newVehicleLabel),
    newVehiclePlateNumber: normalizeScalar(input.newVehiclePlateNumber),
    newVehicleVin: normalizeScalar(input.newVehicleVin),
    newVehicleMake: normalizeScalar(input.newVehicleMake),
    newVehicleModel: normalizeScalar(input.newVehicleModel),
    newVehicleProductionYear: normalizeScalar(input.newVehicleProductionYear),
    newVehicleMileageKm: normalizeScalar(input.newVehicleMileageKm),
    newVehicleEngineOrTrim: normalizeScalar(input.newVehicleEngineOrTrim),
  };
}

function coerceIntegerOrRaw(value) {
  const text = normalizeScalar(value);
  if (text.length === 0) {
    return undefined;
  }

  if (/^-?\d+$/u.test(text)) {
    return Number.parseInt(text, 10);
  }

  return text;
}

function hasInlineCustomerInput(values) {
  return values.newCustomerFullName.length > 0
    || values.newCustomerPhone.length > 0
    || values.newCustomerMessagingHandle.length > 0
    || values.newCustomerNotes.length > 0;
}

function hasInlineVehicleInput(values) {
  return values.newVehicleLabel.length > 0
    || values.newVehiclePlateNumber.length > 0
    || values.newVehicleVin.length > 0
    || values.newVehicleMake.length > 0
    || values.newVehicleModel.length > 0
    || values.newVehicleProductionYear.length > 0
    || values.newVehicleMileageKm.length > 0
    || values.newVehicleEngineOrTrim.length > 0;
}

function localizeValidationMessage(field, message) {
  const normalizedMessage = String(message ?? "Неверное значение");
  const exact = EXACT_VALIDATION_MESSAGE_TRANSLATIONS.get(normalizedMessage);
  if (exact) {
    return exact;
  }

  const label = FIELD_LABELS[field] ?? field ?? "Форма";

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
}

function mapValidationErrors(errors, fieldMap = {}) {
  return errors.map((error) => ({
    field: fieldMap[error.field] ?? error.field,
    message: localizeValidationMessage(fieldMap[error.field] ?? error.field, error.message),
  }));
}

function buildIntakePayload(values, { customerId, vehicleId }) {
  const payload = {
    customerId,
    vehicleId,
    complaint: values.complaint,
  };

  if (values.bayId.length > 0) {
    payload.bayId = values.bayId;
  }

  if (values.primaryAssignee.length > 0) {
    payload.primaryAssignee = values.primaryAssignee;
  }

  return payload;
}

function resolveLookup(customerVehicleService, query) {
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
      .slice(0, LOOKUP_RESULTS_LIMIT),
    vehicles: customerVehicleService
      .listVehicles({ includeInactive: false, query: lookupQuery })
      .slice(0, LOOKUP_RESULTS_LIMIT),
  };
}

function buildWalkInPageModel({
  referenceDataService,
  customerVehicleService,
  values,
  errors = [],
  warnings = [],
  messages = [],
}) {
  const options = {
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

  const selected = {
    customer: values.customerId.length > 0 ? customerVehicleService.getCustomerById(values.customerId) : null,
    vehicle: values.vehicleId.length > 0 ? customerVehicleService.getVehicleById(values.vehicleId) : null,
  };

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

  const lookup = resolveLookup(customerVehicleService, values.q);

  return {
    values,
    options,
    selected,
    lookup,
    errors,
    warnings: nextWarnings,
    messages,
  };
}

function renderWalkInPage(res, { statusCode, model }) {
  res.status(statusCode).send(renderWalkInIntakePage(model));
}

function mapDomainError(error) {
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

function logAndRenderUnexpected({
  logger,
  error,
  event,
  res,
  referenceDataService,
  customerVehicleService,
  values,
}) {
  logger.error(event, { message: error.message });
  const model = buildWalkInPageModel({
    referenceDataService,
    customerVehicleService,
    values,
    errors: [{ field: "form", message: "Не удалось выполнить операцию. Повторите попытку." }],
  });
  renderWalkInPage(res, { statusCode: 500, model });
}

export function registerWalkInIntakePageRoutes(app, {
  logger,
  walkInIntakeService,
  customerVehicleService,
  referenceDataService,
}) {
  app.get("/intake/walk-in", (req, res) => {
    const values = normalizeFormValues(req.query ?? {});

    try {
      const model = buildWalkInPageModel({
        referenceDataService,
        customerVehicleService,
        values,
      });
      renderWalkInPage(res, { statusCode: 200, model });
    } catch (error) {
      logAndRenderUnexpected({
        logger,
        error,
        event: "walkin_page_load_failed",
        res,
        referenceDataService,
        customerVehicleService,
        values,
      });
    }
  });

  app.post("/intake/walk-in", (req, res) => {
    const values = normalizeFormValues(req.body ?? {});
    const errors = [];
    const messages = [];

    let customerId = values.customerId;
    let vehicleId = values.vehicleId;

    try {
      const preliminaryPayload = buildIntakePayload(values, {
        customerId: customerId || "cust-temporary",
        vehicleId: vehicleId || "veh-temporary",
      });
      const preliminaryValidation = validateWalkInCreate(preliminaryPayload);
      if (!preliminaryValidation.ok) {
        errors.push(
          ...mapValidationErrors(preliminaryValidation.errors.filter((error) => {
            return error.field !== "customerId" && error.field !== "vehicleId";
          })),
        );
      }

      if (errors.length === 0 && !customerId && hasInlineCustomerInput(values)) {
        const customerValidation = validateCustomerCreate({
          fullName: values.newCustomerFullName,
          phone: values.newCustomerPhone,
          messagingHandle: values.newCustomerMessagingHandle || null,
          notes: values.newCustomerNotes || null,
        });

        if (!customerValidation.ok) {
          errors.push(...mapValidationErrors(customerValidation.errors, {
            fullName: "newCustomerFullName",
            phone: "newCustomerPhone",
            messagingHandle: "newCustomerMessagingHandle",
            notes: "newCustomerNotes",
          }));
        } else {
          const createdCustomer = customerVehicleService.createCustomer(customerValidation.value);
          customerId = createdCustomer.id;
          values.customerId = createdCustomer.id;
          messages.push(`Создан клиент: ${createdCustomer.fullName}`);
        }
      }

      if (errors.length === 0 && !vehicleId && hasInlineVehicleInput(values)) {
        if (!customerId) {
          errors.push({
            field: "vehicleId",
            message: "Сначала выберите или создайте клиента",
          });
        } else {
          const vehicleValidation = validateVehicleCreate({
            customerId,
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
            errors.push(...mapValidationErrors(vehicleValidation.errors, {
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
            const createdVehicle = customerVehicleService.createVehicle(vehicleValidation.value);
            vehicleId = createdVehicle.id;
            values.vehicleId = createdVehicle.id;
            messages.push(`Создано авто: ${createdVehicle.label}`);
          }
        }
      }

      const intakePayload = buildIntakePayload(values, {
        customerId,
        vehicleId,
      });

      const intakeValidation = validateWalkInCreate(intakePayload);
      if (!intakeValidation.ok) {
        errors.push(...mapValidationErrors(intakeValidation.errors));
      }

      if (errors.length > 0) {
        const model = buildWalkInPageModel({
          referenceDataService,
          customerVehicleService,
          values,
          errors,
          messages,
        });
        renderWalkInPage(res, { statusCode: 400, model });
        return;
      }

      const createdBundle = walkInIntakeService.createWalkInIntake(intakeValidation.value);
      res.redirect(303, `/work-orders/${encodeURIComponent(createdBundle.workOrder.id)}?created=1`);
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) {
        const model = buildWalkInPageModel({
          referenceDataService,
          customerVehicleService,
          values,
          errors: [...errors, ...mapped.errors],
          messages,
        });
        renderWalkInPage(res, { statusCode: mapped.statusCode, model });
        return;
      }

      logAndRenderUnexpected({
        logger,
        error,
        event: "walkin_page_submit_failed",
        res,
        referenceDataService,
        customerVehicleService,
        values,
      });
    }
  });
}

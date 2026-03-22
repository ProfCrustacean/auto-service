import { validateAppointmentCreate } from "./appointmentValidators.js";
import { renderAppointmentBookingPage } from "../ui/appointmentBookingPage.js";
import {
  buildCustomerVehiclePageModel,
  coerceIntegerOrRaw,
  createValidationLocalizer,
  hasAnyInput,
  mapSharedCustomerVehicleDomainError,
  mapValidationErrors,
  normalizeFormValuesByFields,
  resolveInlineCustomerVehicleCreation,
} from "./pageFlowUtils.js";

const LOOKUP_RESULTS_LIMIT = 8;
const CONFLICT_MESSAGE_BY_FIELD = {
  bayId: "Пост уже занят на это время",
  primaryAssignee: "Сотрудник уже занят на это время",
};
const FIELD_LABELS = {
  plannedStartLocal: "Плановый старт",
  customerId: "Клиент",
  vehicleId: "Авто",
  complaint: "Жалоба/запрос",
  bayId: "Пост",
  primaryAssignee: "Ответственный",
  expectedDurationMin: "Длительность",
  notes: "Внутренние заметки",
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
  ["plannedStartLocal is required and must be a non-empty string", "Укажите плановый старт"],
  ["plannedStartLocal must match YYYY-MM-DD HH:mm", "Плановый старт укажите в формате ГГГГ-ММ-ДД ЧЧ:ММ"],
  ["customerId is required and must be a non-empty string", "Выберите клиента или заполните блок нового клиента"],
  ["vehicleId is required and must be a non-empty string", "Выберите авто или заполните блок нового авто"],
  ["complaint is required and must be a non-empty string", "Опишите жалобу или запрос клиента"],
  ["expectedDurationMin must be an integer or null", "Длительность должна быть целым числом минут"],
  ["expectedDurationMin must be between 5 and 720", "Длительность должна быть от 5 до 720 минут"],
  ["unknown field", "Неподдерживаемое поле формы"],
]);
const FORM_FIELDS = [
  "q",
  "customerId",
  "vehicleId",
  "plannedStartLocal",
  "complaint",
  "bayId",
  "primaryAssignee",
  "expectedDurationMin",
  "notes",
  "newCustomerFullName",
  "newCustomerPhone",
  "newCustomerMessagingHandle",
  "newCustomerNotes",
  "newVehicleLabel",
  "newVehiclePlateNumber",
  "newVehicleVin",
  "newVehicleMake",
  "newVehicleModel",
  "newVehicleProductionYear",
  "newVehicleMileageKm",
  "newVehicleEngineOrTrim",
];
const INLINE_CUSTOMER_FIELDS = [
  "newCustomerFullName",
  "newCustomerPhone",
  "newCustomerMessagingHandle",
  "newCustomerNotes",
];
const INLINE_VEHICLE_FIELDS = [
  "newVehicleLabel",
  "newVehiclePlateNumber",
  "newVehicleVin",
  "newVehicleMake",
  "newVehicleModel",
  "newVehicleProductionYear",
  "newVehicleMileageKm",
  "newVehicleEngineOrTrim",
];
const localizeValidationMessage = createValidationLocalizer({
  fieldLabels: FIELD_LABELS,
  exactTranslations: EXACT_VALIDATION_MESSAGE_TRANSLATIONS,
});

function normalizeFormValues(input = {}) {
  return normalizeFormValuesByFields(input, FORM_FIELDS);
}

function hasInlineCustomerInput(values) {
  return hasAnyInput(values, INLINE_CUSTOMER_FIELDS);
}

function hasInlineVehicleInput(values) {
  return hasAnyInput(values, INLINE_VEHICLE_FIELDS);
}

function localizeConflictDetails(details) {
  if (!Array.isArray(details)) {
    return [];
  }

  return details.map((detail) => {
    const field = String(detail?.field ?? "slot");
    const message = CONFLICT_MESSAGE_BY_FIELD[field] ?? String(detail?.message ?? "Конфликт загрузки");

    return {
      ...detail,
      field,
      message,
    };
  });
}

function buildAppointmentPayload(values, { customerId, vehicleId }) {
  const payload = {
    plannedStartLocal: values.plannedStartLocal,
    customerId,
    vehicleId,
    complaint: values.complaint,
    source: "manual_ui",
  };

  if (values.bayId.length > 0) {
    payload.bayId = values.bayId;
  }

  if (values.primaryAssignee.length > 0) {
    payload.primaryAssignee = values.primaryAssignee;
  }

  if (values.expectedDurationMin.length > 0) {
    payload.expectedDurationMin = coerceIntegerOrRaw(values.expectedDurationMin);
  }

  if (values.notes.length > 0) {
    payload.notes = values.notes;
  }

  return payload;
}

function resolveConflictPreview(appointmentService, values) {
  if (values.plannedStartLocal.length === 0) {
    return [];
  }

  if (values.bayId.length === 0 && values.primaryAssignee.length === 0) {
    return [];
  }

  try {
    appointmentService.ensureCapacityAvailable({
      plannedStartLocal: values.plannedStartLocal,
      bayId: values.bayId || null,
      primaryAssignee: values.primaryAssignee || null,
      status: "booked",
      excludeAppointmentId: null,
    });
    return [];
  } catch (error) {
    if (error.code === "appointment_capacity_conflict") {
      return localizeConflictDetails(error.details);
    }

    throw error;
  }
}

function buildBookingPageModel({
  referenceDataService,
  customerVehicleService,
  appointmentService,
  values,
  errors = [],
  warnings = [],
  messages = [],
  conflictDetails = null,
}) {
  const previewConflict = conflictDetails ?? resolveConflictPreview(appointmentService, values);
  return buildCustomerVehiclePageModel({
    referenceDataService,
    customerVehicleService,
    values,
    lookupResultsLimit: LOOKUP_RESULTS_LIMIT,
    errors,
    warnings,
    messages,
    extra: {
      conflictDetails: previewConflict,
    },
  });
}

function renderBookingPage(res, { statusCode, model }) {
  res.status(statusCode).send(renderAppointmentBookingPage(model));
}

function mapDomainError(error) {
  const shared = mapSharedCustomerVehicleDomainError(error);
  if (shared) {
    return {
      ...shared,
      conflictDetails: [],
    };
  }

  if (error.code === "appointment_capacity_conflict") {
    return {
      statusCode: 409,
      errors: [{ field: "plannedStartLocal", message: "Конфликт загрузки в выбранном слоте" }],
      conflictDetails: localizeConflictDetails(error.details),
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
  appointmentService,
  values,
}) {
  logger.error(event, { message: error.message });
  const model = buildBookingPageModel({
    referenceDataService,
    customerVehicleService,
    appointmentService,
    values,
    errors: [{ field: "form", message: "Не удалось выполнить операцию. Повторите попытку." }],
  });
  renderBookingPage(res, { statusCode: 500, model });
}

export function registerAppointmentPageRoutes(app, {
  logger,
  appointmentService,
  customerVehicleService,
  referenceDataService,
}) {
  app.get("/appointments/new", (req, res) => {
    const values = normalizeFormValues(req.query ?? {});

    try {
      const model = buildBookingPageModel({
        referenceDataService,
        customerVehicleService,
        appointmentService,
        values,
      });
      renderBookingPage(res, { statusCode: 200, model });
    } catch (error) {
      logAndRenderUnexpected({
        logger,
        error,
        event: "appointments_new_page_load_failed",
        res,
        referenceDataService,
        customerVehicleService,
        appointmentService,
        values,
      });
    }
  });

  app.post("/appointments/new", (req, res) => {
    const values = normalizeFormValues(req.body ?? {});
    const errors = [];
    const messages = [];
    let conflictDetails = [];

    try {
      // Fail fast on appointment-level shape errors before creating inline entities.
      const preliminaryPayload = buildAppointmentPayload(values, {
        customerId: values.customerId || "cust-temporary",
        vehicleId: values.vehicleId || "veh-temporary",
      });
      const preliminaryValidation = validateAppointmentCreate(preliminaryPayload);
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

      const appointmentPayload = buildAppointmentPayload(values, {
        customerId: customerId || (inlineCustomerPayload ? "cust-inline" : ""),
        vehicleId: vehicleId || (inlineVehiclePayload ? "veh-inline" : ""),
      });

      const appointmentValidation = validateAppointmentCreate(appointmentPayload);
      if (!appointmentValidation.ok) {
        errors.push(...mapValidationErrors(appointmentValidation.errors, localizeValidationMessage));
      }

      if (errors.length > 0) {
        const model = buildBookingPageModel({
          referenceDataService,
          customerVehicleService,
          appointmentService,
          values,
          errors,
          messages,
          conflictDetails,
        });
        renderBookingPage(res, { statusCode: 400, model });
        return;
      }

      try {
        appointmentService.ensureCapacityAvailable({
          plannedStartLocal: appointmentValidation.value.plannedStartLocal,
          bayId: appointmentValidation.value.bayId ?? null,
          primaryAssignee: appointmentValidation.value.primaryAssignee ?? null,
          status: appointmentValidation.value.status ?? "booked",
          excludeAppointmentId: null,
        });
      } catch (error) {
        if (error.code === "appointment_capacity_conflict") {
          conflictDetails = localizeConflictDetails(error.details);
          const model = buildBookingPageModel({
            referenceDataService,
            customerVehicleService,
            appointmentService,
            values,
            errors: [{ field: "plannedStartLocal", message: "Конфликт загрузки в выбранном слоте" }],
            messages,
            conflictDetails,
          });
          renderBookingPage(res, { statusCode: 409, model });
          return;
        }
        throw error;
      }

      const createdBundle = appointmentService.createAppointmentFromBookingForm({
        appointmentPayload: appointmentValidation.value,
        selectedCustomerId: customerId || null,
        selectedVehicleId: vehicleId || null,
        inlineCustomerPayload,
        inlineVehiclePayload,
      });

      if (createdBundle.customer) {
        messages.push(`Создан клиент: ${createdBundle.customer.fullName}`);
      }
      if (createdBundle.vehicle) {
        messages.push(`Создано авто: ${createdBundle.vehicle.label}`);
      }

      const createdAppointment = createdBundle.appointment;
      res.redirect(303, `/appointments/${encodeURIComponent(createdAppointment.id)}?created=1`);
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) {
        const model = buildBookingPageModel({
          referenceDataService,
          customerVehicleService,
          appointmentService,
          values,
          errors: [...errors, ...mapped.errors],
          messages,
          conflictDetails: mapped.conflictDetails,
        });
        renderBookingPage(res, { statusCode: mapped.statusCode, model });
        return;
      }

      logAndRenderUnexpected({
        logger,
        error,
        event: "appointments_new_submit_failed",
        res,
        referenceDataService,
        customerVehicleService,
        appointmentService,
        values,
      });
    }
  });
}

import { validateWalkInCreate } from "./walkInIntakeValidators.js";
import { renderWalkInIntakePage } from "../ui/walkInIntakePage.js";
import {
  buildCustomerVehiclePageModel,
  createValidationLocalizer,
  hasAnyInput,
  mapSharedCustomerVehicleDomainError,
  mapValidationErrors,
  normalizeFormValuesByFields,
  resolveInlineCustomerVehicleCreation,
} from "./pageFlowUtils.js";

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
const FORM_FIELDS = [
  "q",
  "customerId",
  "vehicleId",
  "complaint",
  "bayId",
  "primaryAssignee",
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

function buildWalkInPageModel({
  referenceDataService,
  customerVehicleService,
  values,
  errors = [],
  warnings = [],
  messages = [],
}) {
  return buildCustomerVehiclePageModel({
    referenceDataService,
    customerVehicleService,
    values,
    lookupResultsLimit: LOOKUP_RESULTS_LIMIT,
    errors,
    warnings,
    messages,
  });
}

function renderWalkInPage(res, { statusCode, model }) {
  res.status(statusCode).send(renderWalkInIntakePage(model));
}

function mapDomainError(error) {
  return mapSharedCustomerVehicleDomainError(error);
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

    try {
      const preliminaryPayload = buildIntakePayload(values, {
        customerId: values.customerId || "cust-temporary",
        vehicleId: values.vehicleId || "veh-temporary",
      });
      const preliminaryValidation = validateWalkInCreate(preliminaryPayload);
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

      const intakePayload = buildIntakePayload(values, {
        customerId: customerId || (inlineCustomerPayload ? "cust-inline" : ""),
        vehicleId: vehicleId || (inlineVehiclePayload ? "veh-inline" : ""),
      });

      const intakeValidation = validateWalkInCreate(intakePayload);
      if (!intakeValidation.ok) {
        errors.push(...mapValidationErrors(intakeValidation.errors, localizeValidationMessage));
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

      const createdResult = walkInIntakeService.createWalkInFromIntakeForm({
        intakePayload: intakeValidation.value,
        selectedCustomerId: customerId || null,
        selectedVehicleId: vehicleId || null,
        inlineCustomerPayload,
        inlineVehiclePayload,
      });

      if (createdResult.customer) {
        messages.push(`Создан клиент: ${createdResult.customer.fullName}`);
      }
      if (createdResult.vehicle) {
        messages.push(`Создано авто: ${createdResult.vehicle.label}`);
      }

      res.redirect(303, `/work-orders/${encodeURIComponent(createdResult.bundle.workOrder.id)}?created=1`);
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

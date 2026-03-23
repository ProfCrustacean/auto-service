import { validateWalkInCreate } from "./walkInIntakeValidators.js";
import { renderWalkInIntakePage } from "../ui/walkInIntakePage.js";
import {
  buildCustomerVehicleFormHelpers,
  buildCustomerVehiclePageModel,
  createValidationLocalizer,
  mapSharedCustomerVehicleDomainError,
  renderPageUnexpectedError,
  validateCustomerVehicleSubmission,
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
const {
  normalizeFormValues,
  hasInlineCustomerInput,
  hasInlineVehicleInput,
} = buildCustomerVehicleFormHelpers({
  formFields: FORM_FIELDS,
  inlineCustomerFields: INLINE_CUSTOMER_FIELDS,
  inlineVehicleFields: INLINE_VEHICLE_FIELDS,
});

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
      renderPageUnexpectedError({
        logger,
        error,
        event: "walkin_page_load_failed",
        res,
        buildModel: ({ values: currentValues, errors: currentErrors }) => buildWalkInPageModel({
          referenceDataService,
          customerVehicleService,
          values: currentValues,
          errors: currentErrors,
        }),
        renderPage: renderWalkInPage,
        values,
      });
    }
  });

  app.post("/intake/walk-in", (req, res) => {
    const values = normalizeFormValues(req.body ?? {});
    const errors = [];
    const messages = [];

    try {
      const validationState = validateCustomerVehicleSubmission({
        values,
        buildPayload: buildIntakePayload,
        validatePayload: validateWalkInCreate,
        hasInlineCustomerInput,
        hasInlineVehicleInput,
        localizeValidationMessage,
      });
      errors.push(...validationState.errors);
      const {
        customerId,
        vehicleId,
        inlineCustomerPayload,
        inlineVehiclePayload,
        validation: intakeValidation,
      } = validationState;

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

      renderPageUnexpectedError({
        logger,
        error,
        event: "walkin_page_submit_failed",
        res,
        buildModel: ({ values: currentValues, errors: currentErrors }) => buildWalkInPageModel({
          referenceDataService,
          customerVehicleService,
          values: currentValues,
          errors: currentErrors,
        }),
        renderPage: renderWalkInPage,
        values,
      });
    }
  });
}

import { renderSimpleDetailPage } from "../ui/detailPage.js";
import {
  renderActiveWorkOrderQueuePage,
  renderWorkOrderLifecyclePage,
} from "../ui/workOrderLifecyclePage.js";
import {
  validateCreateWorkOrderPayment,
  validateCreatePartsPurchaseAction,
  validateCreatePartsRequest,
  validateUpdatePartsRequest,
  validateWorkOrderUpdate,
} from "./workOrderValidators.js";

function normalizeFormValue(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

function parseIntegerOrRaw(value) {
  const normalized = normalizeFormValue(value);
  if (normalized.length === 0) {
    return undefined;
  }

  if (!/^\d+$/u.test(normalized)) {
    return normalized;
  }

  return Number.parseInt(normalized, 10);
}

function parseBalanceDueRub(value) {
  const parsed = parseIntegerOrRaw(value);
  if (parsed === undefined) {
    return 0;
  }
  return parsed;
}

function parseBooleanOrRaw(value, defaultValue) {
  const normalized = normalizeFormValue(value).toLowerCase();
  if (normalized.length === 0) {
    return defaultValue;
  }

  if (normalized === "1" || normalized === "true") {
    return true;
  }

  if (normalized === "0" || normalized === "false") {
    return false;
  }

  return normalized;
}

function normalizeOptionalValue(value) {
  const normalized = normalizeFormValue(value);
  return normalized.length > 0 ? normalized : undefined;
}

function assignOptionalStringField(target, field, value) {
  const normalized = normalizeOptionalValue(value);
  if (normalized !== undefined) {
    target[field] = normalized;
  }
}

function assignOptionalIntegerField(target, field, value) {
  const normalized = parseIntegerOrRaw(value);
  if (normalized !== undefined) {
    target[field] = normalized;
  }
}

function buildWorkOrderFormValues(body = {}, item = null) {
  const status = normalizeFormValue(body.status) || item?.status || "";
  const bayId = normalizeFormValue(body.bayId);
  const primaryAssignee = normalizeFormValue(body.primaryAssignee);
  const complaint = normalizeFormValue(body.complaint);
  const findings = normalizeFormValue(body.findings);
  const internalNotes = normalizeFormValue(body.internalNotes);
  const customerNotes = normalizeFormValue(body.customerNotes);
  const reason = normalizeFormValue(body.reason);
  const balanceDueRub = body.balanceDueRub !== undefined
    ? parseBalanceDueRub(body.balanceDueRub)
    : (item?.balanceDueRub ?? 0);
  const laborTotalRub = body.laborTotalRub !== undefined
    ? parseIntegerOrRaw(body.laborTotalRub)
    : (item?.laborTotalRub ?? 0);
  const outsideServiceCostRub = body.outsideServiceCostRub !== undefined
    ? parseIntegerOrRaw(body.outsideServiceCostRub)
    : (item?.outsideServiceCostRub ?? 0);

  return {
    status,
    bayId,
    primaryAssignee,
    complaint,
    findings,
    internalNotes,
    customerNotes,
    balanceDueRub,
    laborTotalRub,
    outsideServiceCostRub,
    reason,
  };
}

function normalizeWorkOrderFormPayload(values) {
  return {
    status: values.status,
    bayId: values.bayId.length > 0 ? values.bayId : null,
    primaryAssignee: values.primaryAssignee.length > 0 ? values.primaryAssignee : null,
    complaint: values.complaint.length > 0 ? values.complaint : null,
    findings: values.findings.length > 0 ? values.findings : null,
    internalNotes: values.internalNotes.length > 0 ? values.internalNotes : null,
    customerNotes: values.customerNotes.length > 0 ? values.customerNotes : null,
    balanceDueRub: values.balanceDueRub,
    laborTotalRub: values.laborTotalRub,
    outsideServiceCostRub: values.outsideServiceCostRub,
    reason: values.reason.length > 0 ? values.reason : null,
  };
}

function buildPartsCreateFormValues(body = {}) {
  return {
    partName: normalizeFormValue(body.partName),
    supplierName: normalizeFormValue(body.supplierName),
    expectedArrivalDateLocal: normalizeFormValue(body.expectedArrivalDateLocal),
    requestedQty: normalizeFormValue(body.requestedQty) || "1",
    requestedUnitCostRub: normalizeFormValue(body.requestedUnitCostRub) || "0",
    salePriceRub: normalizeFormValue(body.salePriceRub) || "0",
    status: normalizeFormValue(body.status) || "requested",
    isBlocking: normalizeFormValue(body.isBlocking) || "true",
    notes: normalizeFormValue(body.notes),
    reason: normalizeFormValue(body.reason),
    replacementForRequestId: normalizeFormValue(body.replacementForRequestId),
  };
}

function normalizePartsCreatePayload(values) {
  const payload = {
    partName: values.partName,
    requestedQty: parseIntegerOrRaw(values.requestedQty),
    requestedUnitCostRub: parseIntegerOrRaw(values.requestedUnitCostRub),
    salePriceRub: parseIntegerOrRaw(values.salePriceRub),
    status: values.status,
    isBlocking: parseBooleanOrRaw(values.isBlocking, true),
  };

  assignOptionalStringField(payload, "supplierName", values.supplierName);
  assignOptionalStringField(payload, "expectedArrivalDateLocal", values.expectedArrivalDateLocal);
  assignOptionalStringField(payload, "notes", values.notes);
  assignOptionalStringField(payload, "reason", values.reason);
  assignOptionalStringField(payload, "replacementForRequestId", values.replacementForRequestId);

  return payload;
}

function buildPartsUpdateFormValues(body = {}, request = null) {
  return {
    status: normalizeFormValue(body.status) || request?.status || "",
    notes: normalizeFormValue(body.notes),
    reason: normalizeFormValue(body.reason),
    replacementPartName: normalizeFormValue(body.replacementPartName),
    replacementRequestedQty: normalizeFormValue(body.replacementRequestedQty),
    replacementSupplierName: normalizeFormValue(body.replacementSupplierName),
  };
}

function normalizePartsUpdatePayload(values) {
  const payload = {
    status: values.status,
  };

  assignOptionalStringField(payload, "notes", values.notes);
  assignOptionalStringField(payload, "reason", values.reason);
  assignOptionalStringField(payload, "replacementPartName", values.replacementPartName);
  assignOptionalIntegerField(payload, "replacementRequestedQty", values.replacementRequestedQty);
  assignOptionalStringField(payload, "replacementSupplierName", values.replacementSupplierName);

  return payload;
}

function buildPurchaseActionFormValues(body = {}, request = null) {
  return {
    supplierName: normalizeFormValue(body.supplierName) || request?.supplierName || "",
    supplierReference: normalizeFormValue(body.supplierReference),
    orderedQty: normalizeFormValue(body.orderedQty) || String(request?.requestedQty ?? 1),
    unitCostRub: normalizeFormValue(body.unitCostRub) || String(request?.requestedUnitCostRub ?? 0),
    status: normalizeFormValue(body.status) || "ordered",
    notes: normalizeFormValue(body.notes),
    reason: normalizeFormValue(body.reason),
  };
}

function normalizePurchaseActionPayload(values) {
  const payload = {
    orderedQty: parseIntegerOrRaw(values.orderedQty),
    unitCostRub: parseIntegerOrRaw(values.unitCostRub),
    status: values.status,
  };

  assignOptionalStringField(payload, "supplierName", values.supplierName);
  assignOptionalStringField(payload, "supplierReference", values.supplierReference);
  assignOptionalStringField(payload, "notes", values.notes);
  assignOptionalStringField(payload, "reason", values.reason);

  return payload;
}

function buildPaymentFormValues(body = {}) {
  return {
    paymentType: normalizeFormValue(body.paymentType) || "partial",
    paymentMethod: normalizeFormValue(body.paymentMethod) || "cash",
    amountRub: normalizeFormValue(body.amountRub),
    note: normalizeFormValue(body.note),
    recordedAt: normalizeFormValue(body.recordedAt),
  };
}

function normalizePaymentPayload(values) {
  const payload = {
    paymentType: values.paymentType,
    paymentMethod: values.paymentMethod,
    amountRub: parseIntegerOrRaw(values.amountRub),
  };

  assignOptionalStringField(payload, "note", values.note);
  assignOptionalStringField(payload, "recordedAt", values.recordedAt);

  return payload;
}

function buildDefaultPartsUi() {
  return {
    errors: [],
    activeForm: null,
    createValues: {
      partName: "",
      supplierName: "",
      expectedArrivalDateLocal: "",
      requestedQty: "1",
      requestedUnitCostRub: "0",
      salePriceRub: "0",
      status: "requested",
      isBlocking: "true",
      notes: "",
      reason: "",
      replacementForRequestId: "",
    },
    updateValuesByRequestId: {},
    purchaseValuesByRequestId: {},
  };
}

function buildDefaultPaymentsUi() {
  return {
    errors: [],
    values: {
      paymentType: "partial",
      paymentMethod: "cash",
      amountRub: "",
      note: "",
      recordedAt: "",
    },
  };
}

function buildPageOptions(referenceDataService) {
  return {
    bays: referenceDataService
      .listBays({ includeInactive: false })
      .sort((left, right) => left.name.localeCompare(right.name, "ru-RU")),
    employees: referenceDataService
      .listEmployees({ includeInactive: false })
      .sort((left, right) => left.name.localeCompare(right.name, "ru-RU")),
  };
}

function mapLifecycleDomainError(error) {
  if (error.code === "bay_not_found") {
    return {
      statusCode: 404,
      errors: [{ field: "bayId", message: "Пост не найден" }],
    };
  }

  if (error.code === "work_order_status_transition_invalid") {
    return {
      statusCode: 409,
      errors: [{ field: "status", message: "Переход статуса недопустим для текущего этапа" }],
    };
  }

  if (error.code === "work_order_balance_due_conflict") {
    return {
      statusCode: 409,
      errors: [{ field: "balanceDueRub", message: "Перед закрытием долг должен быть равен 0" }],
    };
  }

  if (error.code === "work_order_parts_blocking_conflict") {
    return {
      statusCode: 409,
      errors: [{ field: "status", message: "Сначала закройте блокирующие запросы запчастей" }],
    };
  }

  return null;
}

function mapPartsDomainError(error) {
  if (error.code === "work_order_terminal") {
    return {
      statusCode: 409,
      errors: [{ field: "form", message: "Для завершенного/отмененного заказ-наряда операции по запчастям недоступны" }],
    };
  }

  if (error.code === "parts_request_not_found") {
    return {
      statusCode: 404,
      errors: [{ field: "form", message: "Запрос запчасти не найден" }],
    };
  }

  if (error.code === "parts_request_replacement_target_not_found") {
    return {
      statusCode: 404,
      errors: [{ field: "replacementForRequestId", message: "Запрос-источник для замены не найден" }],
    };
  }

  if (error.code === "parts_request_status_transition_invalid") {
    return {
      statusCode: 409,
      errors: [{ field: "status", message: "Переход статуса запроса запчасти недопустим" }],
    };
  }

  if (error.code === "parts_request_terminal_locked") {
    return {
      statusCode: 409,
      errors: [{ field: "status", message: "Терминальный запрос заблокирован для изменения количества/стоимости/поставщика" }],
    };
  }

  if (error.code === "parts_request_requested_qty_invalid") {
    return {
      statusCode: 400,
      errors: [{ field: "requestedQty", message: "Количество должно быть целым числом больше 0" }],
    };
  }

  if (error.code === "parts_request_requested_unit_cost_invalid") {
    return {
      statusCode: 400,
      errors: [{ field: "requestedUnitCostRub", message: "Закупочная цена должна быть целым числом >= 0" }],
    };
  }

  if (error.code === "parts_request_sale_price_invalid") {
    return {
      statusCode: 400,
      errors: [{ field: "salePriceRub", message: "Цена для клиента должна быть целым числом >= 0" }],
    };
  }

  if (error.code === "parts_purchase_action_ordered_qty_invalid") {
    return {
      statusCode: 400,
      errors: [{ field: "orderedQty", message: "Количество в поставке должно быть целым числом > 0" }],
    };
  }

  if (error.code === "parts_purchase_action_unit_cost_invalid") {
    return {
      statusCode: 400,
      errors: [{ field: "unitCostRub", message: "Цена закупки должна быть целым числом >= 0" }],
    };
  }

  return null;
}

function mapPaymentDomainError(error) {
  if (error.code === "work_order_payment_type_invalid") {
    return {
      statusCode: 400,
      errors: [{ field: "paymentType", message: "Некорректный тип платежа" }],
    };
  }

  if (error.code === "work_order_payment_method_invalid") {
    return {
      statusCode: 400,
      errors: [{ field: "paymentMethod", message: "Некорректный способ оплаты" }],
    };
  }

  if (error.code === "work_order_payment_amount_invalid") {
    return {
      statusCode: 400,
      errors: [{ field: "amountRub", message: "Сумма платежа должна быть целым числом > 0" }],
    };
  }

  if (error.code === "work_order_payment_balance_conflict" || error.code === "work_order_payment_final_amount_conflict") {
    return {
      statusCode: 409,
      errors: [{ field: "amountRub", message: "Сумма платежа конфликтует с текущим остатком долга" }],
    };
  }

  return null;
}

function collectMessages(query) {
  const messages = [];
  if (String(query.created ?? "") === "1") {
    messages.push("Заказ-наряд создан и добавлен в активную очередь.");
  }
  if (String(query.updated ?? "") === "1") {
    messages.push("Изменения сохранены.");
  }
  if (String(query.converted ?? "") === "1") {
    messages.push("Запись успешно конвертирована в заказ-наряд.");
  }
  if (String(query.existing ?? "") === "1") {
    messages.push("Для этой записи заказ-наряд уже существовал. Открыт текущий экземпляр.");
  }
  if (String(query.partsCreated ?? "") === "1") {
    messages.push("Запрос запчасти создан.");
  }
  if (String(query.partsUpdated ?? "") === "1") {
    messages.push("Запрос запчасти обновлен.");
  }
  if (String(query.partsPurchase ?? "") === "1") {
    messages.push("Событие поставки запчасти добавлено.");
  }
  if (String(query.paymentAdded ?? "") === "1") {
    messages.push("Платеж добавлен и баланс обновлен.");
  }
  return messages;
}

function renderNotFoundWorkOrder(res, id) {
  res.status(404).send(
    renderSimpleDetailPage({
      title: "Заказ-наряд не найден",
      backHref: "/",
      fields: [{ label: "Идентификатор", value: id }],
    }),
  );
}

function renderWorkOrderPage(res, {
  referenceDataService,
  item,
  statusCode = 200,
  errors = [],
  messages = [],
  values = null,
  partsUi = null,
  paymentsUi = null,
}) {
  const page = renderWorkOrderLifecyclePage({
    item,
    options: buildPageOptions(referenceDataService),
    errors,
    messages,
    values,
    partsUi: partsUi ?? buildDefaultPartsUi(),
    paymentsUi: paymentsUi ?? buildDefaultPaymentsUi(),
  });
  res.status(statusCode).send(page);
}

export function registerWorkOrderPageRoutes(app, {
  logger,
  workOrderService,
  referenceDataService,
}) {
  const resolveUiActor = (req) => req.auth?.role ?? "front_desk";

  app.get("/work-orders/active", (_req, res) => {
    try {
      const items = workOrderService.listWorkOrders({
        includeClosed: false,
      });
      res.status(200).send(renderActiveWorkOrderQueuePage({ items }));
    } catch (error) {
      logger.error("work_orders_active_page_failed", { message: error.message });
      res.status(500).send(
        renderSimpleDetailPage({
          title: "Не удалось открыть активную очередь",
          backHref: "/",
          fields: [{ label: "Ошибка", value: error.message }],
        }),
      );
    }
  });

  app.get("/work-orders/:id", (req, res) => {
    try {
      const item = workOrderService.getWorkOrderById(req.params.id);
      if (!item) {
        renderNotFoundWorkOrder(res, req.params.id);
        return;
      }

      renderWorkOrderPage(res, {
        referenceDataService,
        item,
        messages: collectMessages(req.query),
      });
    } catch (error) {
      logger.error("work_order_page_load_failed", {
        id: req.params.id,
        message: error.message,
      });
      res.status(500).send(
        renderSimpleDetailPage({
          title: "Не удалось открыть заказ-наряд",
          backHref: "/",
          fields: [{ label: "Ошибка", value: error.message }],
        }),
      );
    }
  });

  app.post("/work-orders/:id", (req, res) => {
    const item = workOrderService.getWorkOrderById(req.params.id);
    if (!item) {
      renderNotFoundWorkOrder(res, req.params.id);
      return;
    }

    const values = buildWorkOrderFormValues(req.body ?? {}, item);
    const normalizedPayload = normalizeWorkOrderFormPayload(values);
    const validation = validateWorkOrderUpdate(normalizedPayload);
    if (!validation.ok) {
      renderWorkOrderPage(res, {
        referenceDataService,
        item,
        statusCode: 400,
        errors: validation.errors,
        values,
      });
      return;
    }

    try {
      const actor = resolveUiActor(req);
      const updated = workOrderService.updateWorkOrderById(req.params.id, validation.value, {
        changedBy: `${actor}_ui`,
        source: "ui_work_order_page",
      });
      if (!updated) {
        renderNotFoundWorkOrder(res, req.params.id);
        return;
      }

      res.redirect(303, `/work-orders/${encodeURIComponent(req.params.id)}?updated=1`);
    } catch (error) {
      const mapped = mapLifecycleDomainError(error);
      if (mapped) {
        const freshItem = workOrderService.getWorkOrderById(req.params.id) ?? item;
        renderWorkOrderPage(res, {
          referenceDataService,
          item: freshItem,
          statusCode: mapped.statusCode,
          errors: mapped.errors,
          values,
        });
        return;
      }

      logger.error("work_order_page_update_failed", {
        id: req.params.id,
        message: error.message,
      });
      renderWorkOrderPage(res, {
        referenceDataService,
        item,
        statusCode: 500,
        errors: [{ field: "form", message: "Не удалось сохранить изменения. Повторите попытку." }],
        values,
      });
    }
  });

  app.post("/work-orders/:id/parts-requests", (req, res) => {
    const item = workOrderService.getWorkOrderById(req.params.id);
    if (!item) {
      renderNotFoundWorkOrder(res, req.params.id);
      return;
    }

    const createValues = buildPartsCreateFormValues(req.body ?? {});
    const normalizedPayload = normalizePartsCreatePayload(createValues);
    const validation = validateCreatePartsRequest(normalizedPayload);
    const partsUi = buildDefaultPartsUi();
    partsUi.activeForm = "create";
    partsUi.createValues = createValues;

    if (!validation.ok) {
      partsUi.errors = validation.errors;
      renderWorkOrderPage(res, {
        referenceDataService,
        item,
        statusCode: 400,
        partsUi,
      });
      return;
    }

    try {
      const actor = resolveUiActor(req);
      const result = workOrderService.createWorkOrderPartsRequest(req.params.id, validation.value, {
        changedBy: `${actor}_ui`,
        source: "ui_work_order_parts_create",
      });
      if (!result) {
        renderNotFoundWorkOrder(res, req.params.id);
        return;
      }

      res.redirect(303, `/work-orders/${encodeURIComponent(req.params.id)}?partsCreated=1`);
    } catch (error) {
      const mapped = mapPartsDomainError(error);
      if (mapped) {
        const freshItem = workOrderService.getWorkOrderById(req.params.id) ?? item;
        partsUi.errors = mapped.errors;
        renderWorkOrderPage(res, {
          referenceDataService,
          item: freshItem,
          statusCode: mapped.statusCode,
          partsUi,
        });
        return;
      }

      logger.error("work_order_parts_request_create_page_failed", {
        id: req.params.id,
        message: error.message,
      });
      partsUi.errors = [{ field: "form", message: "Не удалось создать запрос запчасти. Повторите попытку." }];
      renderWorkOrderPage(res, {
        referenceDataService,
        item,
        statusCode: 500,
        partsUi,
      });
    }
  });

  app.post("/work-orders/:id/parts-requests/:requestId", (req, res) => {
    const item = workOrderService.getWorkOrderById(req.params.id);
    if (!item) {
      renderNotFoundWorkOrder(res, req.params.id);
      return;
    }

    const request = item.partsRequests.find((candidate) => candidate.id === req.params.requestId) ?? null;
    const updateValues = buildPartsUpdateFormValues(req.body ?? {}, request);
    const normalizedPayload = normalizePartsUpdatePayload(updateValues);
    const validation = validateUpdatePartsRequest(normalizedPayload);
    const partsUi = buildDefaultPartsUi();
    partsUi.activeForm = `update:${req.params.requestId}`;
    partsUi.updateValuesByRequestId[req.params.requestId] = updateValues;

    if (!validation.ok) {
      partsUi.errors = validation.errors;
      renderWorkOrderPage(res, {
        referenceDataService,
        item,
        statusCode: 400,
        partsUi,
      });
      return;
    }

    try {
      const actor = resolveUiActor(req);
      const result = workOrderService.updateWorkOrderPartsRequest(
        req.params.id,
        req.params.requestId,
        validation.value,
        {
          changedBy: `${actor}_ui`,
          source: "ui_work_order_parts_update",
        },
      );

      if (!result) {
        renderNotFoundWorkOrder(res, req.params.id);
        return;
      }

      res.redirect(303, `/work-orders/${encodeURIComponent(req.params.id)}?partsUpdated=1`);
    } catch (error) {
      const mapped = mapPartsDomainError(error);
      if (mapped) {
        const freshItem = workOrderService.getWorkOrderById(req.params.id) ?? item;
        partsUi.errors = mapped.errors;
        renderWorkOrderPage(res, {
          referenceDataService,
          item: freshItem,
          statusCode: mapped.statusCode,
          partsUi,
        });
        return;
      }

      logger.error("work_order_parts_request_update_page_failed", {
        id: req.params.id,
        requestId: req.params.requestId,
        message: error.message,
      });
      partsUi.errors = [{ field: "form", message: "Не удалось обновить запрос запчасти. Повторите попытку." }];
      renderWorkOrderPage(res, {
        referenceDataService,
        item,
        statusCode: 500,
        partsUi,
      });
    }
  });

  app.post("/work-orders/:id/parts-requests/:requestId/purchase-actions", (req, res) => {
    const item = workOrderService.getWorkOrderById(req.params.id);
    if (!item) {
      renderNotFoundWorkOrder(res, req.params.id);
      return;
    }

    const request = item.partsRequests.find((candidate) => candidate.id === req.params.requestId) ?? null;
    const purchaseValues = buildPurchaseActionFormValues(req.body ?? {}, request);
    const normalizedPayload = normalizePurchaseActionPayload(purchaseValues);
    const validation = validateCreatePartsPurchaseAction(normalizedPayload);
    const partsUi = buildDefaultPartsUi();
    partsUi.activeForm = `purchase:${req.params.requestId}`;
    partsUi.purchaseValuesByRequestId[req.params.requestId] = purchaseValues;

    if (!validation.ok) {
      partsUi.errors = validation.errors;
      renderWorkOrderPage(res, {
        referenceDataService,
        item,
        statusCode: 400,
        partsUi,
      });
      return;
    }

    try {
      const actor = resolveUiActor(req);
      const result = workOrderService.createWorkOrderPartsPurchaseAction(
        req.params.id,
        req.params.requestId,
        validation.value,
        {
          changedBy: `${actor}_ui`,
          source: "ui_work_order_parts_purchase_action",
        },
      );

      if (!result) {
        renderNotFoundWorkOrder(res, req.params.id);
        return;
      }

      res.redirect(303, `/work-orders/${encodeURIComponent(req.params.id)}?partsPurchase=1`);
    } catch (error) {
      const mapped = mapPartsDomainError(error);
      if (mapped) {
        const freshItem = workOrderService.getWorkOrderById(req.params.id) ?? item;
        partsUi.errors = mapped.errors;
        renderWorkOrderPage(res, {
          referenceDataService,
          item: freshItem,
          statusCode: mapped.statusCode,
          partsUi,
        });
        return;
      }

      logger.error("work_order_parts_purchase_action_page_failed", {
        id: req.params.id,
        requestId: req.params.requestId,
        message: error.message,
      });
      partsUi.errors = [{ field: "form", message: "Не удалось записать событие поставки. Повторите попытку." }];
      renderWorkOrderPage(res, {
        referenceDataService,
        item,
        statusCode: 500,
        partsUi,
      });
    }
  });

  app.post("/work-orders/:id/payments", (req, res) => {
    const item = workOrderService.getWorkOrderById(req.params.id);
    if (!item) {
      renderNotFoundWorkOrder(res, req.params.id);
      return;
    }

    const paymentValues = buildPaymentFormValues(req.body ?? {});
    const normalizedPayload = normalizePaymentPayload(paymentValues);
    const validation = validateCreateWorkOrderPayment(normalizedPayload);
    const paymentsUi = {
      errors: [],
      values: paymentValues,
    };

    if (!validation.ok) {
      paymentsUi.errors = validation.errors;
      renderWorkOrderPage(res, {
        referenceDataService,
        item,
        statusCode: 400,
        paymentsUi,
      });
      return;
    }

    try {
      const actor = resolveUiActor(req);
      const result = workOrderService.createWorkOrderPayment(req.params.id, validation.value, {
        changedBy: `${actor}_ui`,
        source: "ui_work_order_payment_create",
      });
      if (!result) {
        renderNotFoundWorkOrder(res, req.params.id);
        return;
      }

      res.redirect(303, `/work-orders/${encodeURIComponent(req.params.id)}?paymentAdded=1`);
    } catch (error) {
      const mapped = mapPaymentDomainError(error);
      if (mapped) {
        const freshItem = workOrderService.getWorkOrderById(req.params.id) ?? item;
        paymentsUi.errors = mapped.errors;
        renderWorkOrderPage(res, {
          referenceDataService,
          item: freshItem,
          statusCode: mapped.statusCode,
          paymentsUi,
        });
        return;
      }

      logger.error("work_order_payment_create_page_failed", {
        id: req.params.id,
        message: error.message,
      });
      paymentsUi.errors = [{ field: "form", message: "Не удалось добавить платеж. Повторите попытку." }];
      renderWorkOrderPage(res, {
        referenceDataService,
        item,
        statusCode: 500,
        paymentsUi,
      });
    }
  });
}

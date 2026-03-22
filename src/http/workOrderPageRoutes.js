import { renderSimpleDetailPage } from "../ui/detailPage.js";
import {
  renderActiveWorkOrderQueuePage,
  renderWorkOrderLifecyclePage,
} from "../ui/workOrderLifecyclePage.js";
import { validateWorkOrderUpdate } from "./workOrderValidators.js";

function normalizeFormValue(value) {
  if (value === undefined || value === null) {
    return "";
  }
  return String(value).trim();
}

function parseBalanceDueRub(value) {
  const normalized = normalizeFormValue(value);
  if (normalized.length === 0) {
    return 0;
  }

  if (!/^\d+$/u.test(normalized)) {
    return normalized;
  }

  return Number.parseInt(normalized, 10);
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

  return {
    status,
    bayId,
    primaryAssignee,
    complaint,
    findings,
    internalNotes,
    customerNotes,
    balanceDueRub,
    reason,
  };
}

function normalizeFormPayload(values) {
  return {
    status: values.status,
    bayId: values.bayId.length > 0 ? values.bayId : null,
    primaryAssignee: values.primaryAssignee.length > 0 ? values.primaryAssignee : null,
    complaint: values.complaint.length > 0 ? values.complaint : null,
    findings: values.findings.length > 0 ? values.findings : null,
    internalNotes: values.internalNotes.length > 0 ? values.internalNotes : null,
    customerNotes: values.customerNotes.length > 0 ? values.customerNotes : null,
    balanceDueRub: values.balanceDueRub,
    reason: values.reason.length > 0 ? values.reason : null,
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

function mapDomainError(error) {
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
  return messages;
}

export function registerWorkOrderPageRoutes(app, {
  logger,
  workOrderService,
  referenceDataService,
}) {
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
        res.status(404).send(
          renderSimpleDetailPage({
            title: "Заказ-наряд не найден",
            backHref: "/",
            fields: [{ label: "Идентификатор", value: req.params.id }],
          }),
        );
        return;
      }

      const page = renderWorkOrderLifecyclePage({
        item,
        options: buildPageOptions(referenceDataService),
        messages: collectMessages(req.query),
      });
      res.status(200).send(page);
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
      res.status(404).send(
        renderSimpleDetailPage({
          title: "Заказ-наряд не найден",
          backHref: "/",
          fields: [{ label: "Идентификатор", value: req.params.id }],
        }),
      );
      return;
    }

    const values = buildWorkOrderFormValues(req.body ?? {}, item);
    const normalizedPayload = normalizeFormPayload(values);
    const validation = validateWorkOrderUpdate(normalizedPayload);
    if (!validation.ok) {
      const page = renderWorkOrderLifecyclePage({
        item,
        options: buildPageOptions(referenceDataService),
        errors: validation.errors,
        values,
      });
      res.status(400).send(page);
      return;
    }

    try {
      const updated = workOrderService.updateWorkOrderById(req.params.id, validation.value, {
        changedBy: "front_desk_ui",
        source: "ui_work_order_page",
      });
      if (!updated) {
        res.status(404).send(
          renderSimpleDetailPage({
            title: "Заказ-наряд не найден",
            backHref: "/",
            fields: [{ label: "Идентификатор", value: req.params.id }],
          }),
        );
        return;
      }

      res.redirect(303, `/work-orders/${encodeURIComponent(req.params.id)}?updated=1`);
    } catch (error) {
      const mapped = mapDomainError(error);
      if (mapped) {
        const freshItem = workOrderService.getWorkOrderById(req.params.id) ?? item;
        const page = renderWorkOrderLifecyclePage({
          item: freshItem,
          options: buildPageOptions(referenceDataService),
          errors: mapped.errors,
          values,
        });
        res.status(mapped.statusCode).send(page);
        return;
      }

      logger.error("work_order_page_update_failed", {
        id: req.params.id,
        message: error.message,
      });
      const page = renderWorkOrderLifecyclePage({
        item,
        options: buildPageOptions(referenceDataService),
        errors: [{ field: "form", message: "Не удалось сохранить изменения. Повторите попытку." }],
        values,
      });
      res.status(500).send(page);
    }
  });
}

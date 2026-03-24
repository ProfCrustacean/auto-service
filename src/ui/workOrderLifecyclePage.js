import {
  escapeHtml,
  renderFieldErrors,
  buildFieldErrorMap,
  renderFormPageDocument,
  formatGlobalError,
} from "./pageFormShared.js";
import { renderDocumentShell } from "./renderDocumentShell.js";
import { getWorkOrderStatusLabel, listAllowedWorkOrderTransitions } from "../domain/workOrderLifecycle.js";
import {
  getPartsPurchaseActionStatusLabel,
  getPartsRequestStatusLabel,
  PARTS_PURCHASE_ACTION_STATUS_CODES,
  PARTS_REQUEST_STATUS_CODES,
} from "../domain/partsRequestLifecycle.js";

const FIELD_LABELS = {
  status: "Статус",
  bayId: "Пост",
  primaryAssignee: "Ответственный",
  complaint: "Жалоба клиента",
  findings: "Диагностика и выводы",
  internalNotes: "Внутренние заметки",
  customerNotes: "Комментарий для клиента",
  balanceDueRub: "Долг, руб.",
  reason: "Причина изменения",
};

const PARTS_FIELD_LABELS = {
  form: "Форма запчастей",
  partName: "Наименование детали",
  supplierName: "Поставщик",
  expectedArrivalDateLocal: "Ожидаемая дата",
  requestedQty: "Количество",
  requestedUnitCostRub: "Себестоимость, руб.",
  salePriceRub: "Цена для клиента, руб.",
  replacementForRequestId: "Основание замены",
  status: "Статус",
  notes: "Заметки",
  reason: "Причина",
  replacementPartName: "Новая деталь",
  replacementRequestedQty: "Количество замены",
  replacementSupplierName: "Поставщик замены",
  supplierReference: "Номер поставки",
  orderedQty: "Кол-во поставки",
  unitCostRub: "Цена закупки, руб.",
};

const HISTORY_DATE_FORMATTER = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Moscow",
});

function dedupe(values) {
  const seen = new Set();
  const result = [];
  for (const value of values) {
    const key = String(value);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(value);
    }
  }
  return result;
}

function normalizeFormValue(values, field, fallback = "") {
  if (!values || !Object.hasOwn(values, field)) {
    return fallback;
  }
  const value = values[field];
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
}

function normalizePartsUi(partsUi) {
  return {
    errors: Array.isArray(partsUi?.errors) ? partsUi.errors : [],
    activeForm: typeof partsUi?.activeForm === "string" ? partsUi.activeForm : null,
    createValues: {
      partName: normalizeFormValue(partsUi?.createValues, "partName", ""),
      supplierName: normalizeFormValue(partsUi?.createValues, "supplierName", ""),
      expectedArrivalDateLocal: normalizeFormValue(partsUi?.createValues, "expectedArrivalDateLocal", ""),
      requestedQty: normalizeFormValue(partsUi?.createValues, "requestedQty", "1"),
      requestedUnitCostRub: normalizeFormValue(partsUi?.createValues, "requestedUnitCostRub", "0"),
      salePriceRub: normalizeFormValue(partsUi?.createValues, "salePriceRub", "0"),
      status: normalizeFormValue(partsUi?.createValues, "status", "requested"),
      isBlocking: normalizeFormValue(partsUi?.createValues, "isBlocking", "true"),
      notes: normalizeFormValue(partsUi?.createValues, "notes", ""),
      reason: normalizeFormValue(partsUi?.createValues, "reason", ""),
      replacementForRequestId: normalizeFormValue(partsUi?.createValues, "replacementForRequestId", ""),
    },
    updateValuesByRequestId: partsUi?.updateValuesByRequestId ?? {},
    purchaseValuesByRequestId: partsUi?.purchaseValuesByRequestId ?? {},
  };
}

function formatHistoryTimestamp(isoValue) {
  if (typeof isoValue !== "string" || isoValue.trim().length === 0) {
    return "н/д";
  }

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "н/д";
  }

  return HISTORY_DATE_FORMATTER.format(date);
}

function renderHistoryRows(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return '<tr><td colspan="5" class="muted">История переходов пока пустая</td></tr>';
  }

  return history
    .map((entry) => {
      const from = entry.fromStatusLabelRu ?? "Создание";
      const to = entry.toStatusLabelRu;
      const changedBy = entry.changedBy ?? "system";
      const reason = entry.reason ?? "Без комментария";
      const changedAtIso = typeof entry.changedAt === "string" ? entry.changedAt : "";
      const changedAtLabel = formatHistoryTimestamp(changedAtIso);
      const changedAtCell = changedAtIso.length > 0
        ? `<time datetime="${escapeHtml(changedAtIso)}" title="${escapeHtml(changedAtIso)}">${escapeHtml(changedAtLabel)}</time>`
        : escapeHtml(changedAtLabel);

      return `<tr>
        <td>${escapeHtml(from)} → ${escapeHtml(to)}</td>
        <td>${changedAtCell}</td>
        <td>${escapeHtml(changedBy)}</td>
        <td>${escapeHtml(reason)}</td>
        <td>${escapeHtml(entry.source ?? "manual")}</td>
      </tr>`;
    })
    .join("");
}

function renderPartsHistoryRows(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return '<tr><td colspan="8" class="muted">История по запчастям пока пустая</td></tr>';
  }

  return history.map((entry) => {
    const changedAtIso = typeof entry.changedAt === "string" ? entry.changedAt : "";
    const changedAtLabel = formatHistoryTimestamp(changedAtIso);
    const changedAtCell = changedAtIso.length > 0
      ? `<time datetime="${escapeHtml(changedAtIso)}" title="${escapeHtml(changedAtIso)}">${escapeHtml(changedAtLabel)}</time>`
      : escapeHtml(changedAtLabel);
    const transition = entry.fromStatusLabelRu
      ? `${entry.fromStatusLabelRu} → ${entry.toStatusLabelRu ?? entry.toStatus ?? "н/д"}`
      : (entry.toStatusLabelRu ?? entry.toStatus ?? "Событие");

    return `<tr>
      <td>${escapeHtml(transition)}</td>
      <td>${changedAtCell}</td>
      <td>${escapeHtml(entry.changedBy ?? "system")}</td>
      <td>${escapeHtml(entry.reason ?? "Без комментария")}</td>
      <td>${escapeHtml(entry.source ?? "manual")}</td>
      <td>${escapeHtml(entry.partsRequestId ?? "—")}</td>
      <td>${escapeHtml(entry.purchaseActionId ?? "—")}</td>
      <td><pre class="json-cell">${escapeHtml(entry.details ? JSON.stringify(entry.details, null, 2) : "—")}</pre></td>
    </tr>`;
  }).join("");
}

function renderPartsCreateForm(item, partsUi) {
  const errorMap = partsUi.activeForm === "create" ? buildFieldErrorMap(partsUi.errors) : new Map();
  const values = partsUi.createValues;

  return `<section class="panel row">
      <h2>Новый запрос запчасти</h2>
      <form method="post" action="/work-orders/${escapeHtml(item.id)}/parts-requests" data-work-order-parts-create-form>
        <div class="field-grid">
          <label>Наименование детали
            <input type="text" name="partName" value="${escapeHtml(values.partName)}" placeholder="Например: Стойка стабилизатора" />
            ${renderFieldErrors(errorMap, "partName")}
          </label>
          <label>Поставщик
            <input type="text" name="supplierName" value="${escapeHtml(values.supplierName)}" placeholder="Опционально" />
            ${renderFieldErrors(errorMap, "supplierName")}
          </label>
          <label>Ожидаемая дата
            <input type="text" name="expectedArrivalDateLocal" value="${escapeHtml(values.expectedArrivalDateLocal)}" placeholder="ГГГГ-ММ-ДД" />
            ${renderFieldErrors(errorMap, "expectedArrivalDateLocal")}
          </label>
          <label>Количество
            <input type="number" min="1" step="1" name="requestedQty" value="${escapeHtml(values.requestedQty)}" />
            ${renderFieldErrors(errorMap, "requestedQty")}
          </label>
          <label>Себестоимость, руб.
            <input type="number" min="0" step="1" name="requestedUnitCostRub" value="${escapeHtml(values.requestedUnitCostRub)}" />
            ${renderFieldErrors(errorMap, "requestedUnitCostRub")}
          </label>
          <label>Цена для клиента, руб.
            <input type="number" min="0" step="1" name="salePriceRub" value="${escapeHtml(values.salePriceRub)}" />
            ${renderFieldErrors(errorMap, "salePriceRub")}
          </label>
          <label>Стартовый статус
            <select name="status">
              ${PARTS_REQUEST_STATUS_CODES.map((status) => {
                const selected = values.status === status ? " selected" : "";
                return `<option value="${escapeHtml(status)}"${selected}>${escapeHtml(getPartsRequestStatusLabel(status) ?? status)}</option>`;
              }).join("")}
            </select>
            ${renderFieldErrors(errorMap, "status")}
          </label>
          <label>Блокирует работу
            <select name="isBlocking">
              <option value="true"${values.isBlocking === "true" ? " selected" : ""}>Да</option>
              <option value="false"${values.isBlocking === "false" ? " selected" : ""}>Нет</option>
            </select>
            ${renderFieldErrors(errorMap, "isBlocking")}
          </label>
          <label>Замена для запроса
            <select name="replacementForRequestId">
              <option value="">Без замены</option>
              ${(item.partsRequests ?? []).map((request) => {
                const selected = values.replacementForRequestId === request.id ? " selected" : "";
                return `<option value="${escapeHtml(request.id)}"${selected}>${escapeHtml(request.partName)} (${escapeHtml(request.statusLabelRu)})</option>`;
              }).join("")}
            </select>
            ${renderFieldErrors(errorMap, "replacementForRequestId")}
          </label>
        </div>

        <label>Комментарий
          <textarea name="notes" placeholder="Что важно по позиции">${escapeHtml(values.notes)}</textarea>
          ${renderFieldErrors(errorMap, "notes")}
        </label>

        <label>Причина (для истории)
          <input type="text" name="reason" value="${escapeHtml(values.reason)}" placeholder="Почему создается запрос" />
          ${renderFieldErrors(errorMap, "reason")}
        </label>

        <div class="row">
          <button class="btn primary" type="submit" data-submit>Создать запрос</button>
        </div>
      </form>
    </section>`;
}

function renderPartsRequestPurchaseRows(actions) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return '<tr><td colspan="7" class="muted">Событий поставки пока нет</td></tr>';
  }

  return actions.map((action) => `<tr>
      <td>${escapeHtml(getPartsPurchaseActionStatusLabel(action.status) ?? action.status)}</td>
      <td>${escapeHtml(action.supplierName ?? "—")}</td>
      <td>${escapeHtml(action.supplierReference ?? "—")}</td>
      <td>${escapeHtml(String(action.orderedQty ?? 0))}</td>
      <td>${escapeHtml(String(action.unitCostRub ?? 0))}</td>
      <td>${escapeHtml(formatHistoryTimestamp(action.orderedAt ?? action.createdAt ?? ""))}</td>
      <td>${escapeHtml(action.notes ?? "—")}</td>
    </tr>`).join("");
}

function renderPartsRequestCards(item, partsUi) {
  if (!Array.isArray(item.partsRequests) || item.partsRequests.length === 0) {
    return `<section class="panel row">
      <h2>Текущие запросы</h2>
      <p class="muted">Запросы запчастей пока не созданы.</p>
    </section>`;
  }

  return `<section class="panel row">
    <h2>Текущие запросы</h2>
    ${(item.partsRequests ?? []).map((request) => {
      const allowedStatuses = dedupe([request.status, ...(request.lifecycle?.allowedTransitions ?? [])]);
      const updateValues = {
        status: normalizeFormValue(partsUi.updateValuesByRequestId?.[request.id], "status", request.status),
        notes: normalizeFormValue(partsUi.updateValuesByRequestId?.[request.id], "notes", ""),
        reason: normalizeFormValue(partsUi.updateValuesByRequestId?.[request.id], "reason", ""),
        replacementPartName: normalizeFormValue(partsUi.updateValuesByRequestId?.[request.id], "replacementPartName", ""),
        replacementRequestedQty: normalizeFormValue(partsUi.updateValuesByRequestId?.[request.id], "replacementRequestedQty", ""),
        replacementSupplierName: normalizeFormValue(partsUi.updateValuesByRequestId?.[request.id], "replacementSupplierName", ""),
      };
      const purchaseValues = {
        supplierName: normalizeFormValue(partsUi.purchaseValuesByRequestId?.[request.id], "supplierName", request.supplierName ?? ""),
        supplierReference: normalizeFormValue(partsUi.purchaseValuesByRequestId?.[request.id], "supplierReference", ""),
        orderedQty: normalizeFormValue(partsUi.purchaseValuesByRequestId?.[request.id], "orderedQty", String(request.requestedQty ?? 1)),
        unitCostRub: normalizeFormValue(partsUi.purchaseValuesByRequestId?.[request.id], "unitCostRub", String(request.requestedUnitCostRub ?? 0)),
        status: normalizeFormValue(partsUi.purchaseValuesByRequestId?.[request.id], "status", "ordered"),
        notes: normalizeFormValue(partsUi.purchaseValuesByRequestId?.[request.id], "notes", ""),
        reason: normalizeFormValue(partsUi.purchaseValuesByRequestId?.[request.id], "reason", ""),
      };
      const updateErrorMap = partsUi.activeForm === `update:${request.id}`
        ? buildFieldErrorMap(partsUi.errors)
        : new Map();
      const purchaseErrorMap = partsUi.activeForm === `purchase:${request.id}`
        ? buildFieldErrorMap(partsUi.errors)
        : new Map();

      return `<article class="subpanel row">
        <div class="summary-grid">
          <div class="summary-card"><strong>Деталь</strong><span>${escapeHtml(request.partName)}</span></div>
          <div class="summary-card"><strong>Статус</strong><span>${escapeHtml(request.statusLabelRu)}</span></div>
          <div class="summary-card"><strong>Поставщик</strong><span>${escapeHtml(request.supplierName ?? "не задан")}</span></div>
          <div class="summary-card"><strong>Количество</strong><span>${escapeHtml(String(request.requestedQty ?? 0))}</span></div>
          <div class="summary-card"><strong>Поставка</strong><span>${escapeHtml(request.expectedArrivalDateLocal ?? "н/д")}</span></div>
          <div class="summary-card"><strong>Блокирующий</strong><span>${request.isBlocking ? "Да" : "Нет"}</span></div>
          <div class="summary-card"><strong>Закупка / продажа</strong><span>${escapeHtml(String(request.requestedUnitCostRub ?? 0))} / ${escapeHtml(String(request.salePriceRub ?? 0))} руб.</span></div>
          <div class="summary-card"><strong>Событий поставки</strong><span>${escapeHtml(String(request.purchaseActionCount ?? 0))}</span></div>
        </div>

        <form method="post" action="/work-orders/${escapeHtml(item.id)}/parts-requests/${escapeHtml(request.id)}" data-work-order-parts-update-form>
          <h3>Обновить запрос</h3>
          <div class="field-grid">
            <label>Статус
              <select name="status">
                ${allowedStatuses.map((status) => {
                  const selected = updateValues.status === status ? " selected" : "";
                  return `<option value="${escapeHtml(status)}"${selected}>${escapeHtml(getPartsRequestStatusLabel(status) ?? status)}</option>`;
                }).join("")}
              </select>
              ${renderFieldErrors(updateErrorMap, "status")}
            </label>
            <label>Причина
              <input type="text" name="reason" value="${escapeHtml(updateValues.reason)}" placeholder="Причина изменения статуса" />
              ${renderFieldErrors(updateErrorMap, "reason")}
            </label>
            <label>Замена: новая деталь
              <input type="text" name="replacementPartName" value="${escapeHtml(updateValues.replacementPartName)}" placeholder="Только при статусе «Заменена»" />
              ${renderFieldErrors(updateErrorMap, "replacementPartName")}
            </label>
            <label>Замена: количество
              <input type="number" min="1" step="1" name="replacementRequestedQty" value="${escapeHtml(updateValues.replacementRequestedQty)}" />
              ${renderFieldErrors(updateErrorMap, "replacementRequestedQty")}
            </label>
            <label>Замена: поставщик
              <input type="text" name="replacementSupplierName" value="${escapeHtml(updateValues.replacementSupplierName)}" />
              ${renderFieldErrors(updateErrorMap, "replacementSupplierName")}
            </label>
          </div>
          <label>Комментарий
            <textarea name="notes" placeholder="Комментарий по изменению">${escapeHtml(updateValues.notes)}</textarea>
            ${renderFieldErrors(updateErrorMap, "notes")}
          </label>
          <div class="row">
            <button class="btn" type="submit" data-submit>Обновить запрос</button>
          </div>
        </form>

        <form method="post" action="/work-orders/${escapeHtml(item.id)}/parts-requests/${escapeHtml(request.id)}/purchase-actions" data-work-order-parts-purchase-form>
          <h3>Добавить событие поставки</h3>
          <div class="field-grid">
            <label>Поставщик
              <input type="text" name="supplierName" value="${escapeHtml(purchaseValues.supplierName)}" />
              ${renderFieldErrors(purchaseErrorMap, "supplierName")}
            </label>
            <label>Номер поставки
              <input type="text" name="supplierReference" value="${escapeHtml(purchaseValues.supplierReference)}" />
              ${renderFieldErrors(purchaseErrorMap, "supplierReference")}
            </label>
            <label>Количество
              <input type="number" min="1" step="1" name="orderedQty" value="${escapeHtml(purchaseValues.orderedQty)}" />
              ${renderFieldErrors(purchaseErrorMap, "orderedQty")}
            </label>
            <label>Цена закупки, руб.
              <input type="number" min="0" step="1" name="unitCostRub" value="${escapeHtml(purchaseValues.unitCostRub)}" />
              ${renderFieldErrors(purchaseErrorMap, "unitCostRub")}
            </label>
            <label>Статус поставки
              <select name="status">
                ${PARTS_PURCHASE_ACTION_STATUS_CODES.map((status) => {
                  const selected = purchaseValues.status === status ? " selected" : "";
                  return `<option value="${escapeHtml(status)}"${selected}>${escapeHtml(getPartsPurchaseActionStatusLabel(status) ?? status)}</option>`;
                }).join("")}
              </select>
              ${renderFieldErrors(purchaseErrorMap, "status")}
            </label>
            <label>Причина
              <input type="text" name="reason" value="${escapeHtml(purchaseValues.reason)}" placeholder="Зачем фиксируем событие" />
              ${renderFieldErrors(purchaseErrorMap, "reason")}
            </label>
          </div>
          <label>Комментарий
            <textarea name="notes" placeholder="Комментарий к поставке">${escapeHtml(purchaseValues.notes)}</textarea>
            ${renderFieldErrors(purchaseErrorMap, "notes")}
          </label>
          <div class="row">
            <button class="btn" type="submit" data-submit>Добавить событие</button>
          </div>
        </form>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Статус</th>
                <th>Поставщик</th>
                <th>Номер</th>
                <th>Кол-во</th>
                <th>Цена, руб.</th>
                <th>Когда</th>
                <th>Комментарий</th>
              </tr>
            </thead>
            <tbody>
              ${renderPartsRequestPurchaseRows(request.purchaseActions)}
            </tbody>
          </table>
        </div>
      </article>`;
    }).join("")}
  </section>`;
}

function renderPartsSnapshot(item) {
  const openBlockingCount = item.parts?.openBlockingRequestsCount ?? 0;
  const totalRequests = item.parts?.totalRequests ?? 0;
  const resolvedCount = Math.max(totalRequests - openBlockingCount, 0);

  return `<section class="panel row">
    <h2>Состояние запчастей</h2>
    <div class="summary-grid">
      <div class="summary-card"><strong>Всего запросов</strong><span>${escapeHtml(String(totalRequests))}</span></div>
      <div class="summary-card ${openBlockingCount > 0 ? "warning" : ""}"><strong>Блокирующих открытых</strong><span>${escapeHtml(String(openBlockingCount))}</span></div>
      <div class="summary-card"><strong>Закрытых/неблокирующих</strong><span>${escapeHtml(String(resolvedCount))}</span></div>
      <div class="summary-card"><strong>Подсказка</strong><span>${openBlockingCount > 0 ? "Статус работ должен оставаться «Ожидает запчасти»" : "Блокировок по запчастям нет"}</span></div>
    </div>
  </section>`;
}

export function renderWorkOrderLifecyclePage({
  item,
  options,
  errors = [],
  messages = [],
  values = null,
  partsUi = null,
}) {
  const lifecycleFieldErrorMap = buildFieldErrorMap(errors);
  const normalizedPartsUi = normalizePartsUi(partsUi);
  const statusOptions = dedupe([item.status, ...listAllowedWorkOrderTransitions(item.status)]);
  const selectedStatus = normalizeFormValue(values, "status", item.status);
  const selectedBayId = normalizeFormValue(values, "bayId", item.bayId ?? "");
  const selectedAssignee = normalizeFormValue(values, "primaryAssignee", item.primaryAssignee ?? "");
  const complaint = normalizeFormValue(values, "complaint", item.complaint ?? "");
  const findings = normalizeFormValue(values, "findings", item.findings ?? "");
  const internalNotes = normalizeFormValue(values, "internalNotes", item.internalNotes ?? "");
  const customerNotes = normalizeFormValue(values, "customerNotes", item.customerNotes ?? "");
  const balanceDueRub = normalizeFormValue(values, "balanceDueRub", String(item.balanceDueRub ?? 0));
  const reason = normalizeFormValue(values, "reason", "");

  const body = `<div class="wrap">
    <section class="panel row">
      <a class="btn" href="/">← Назад на доску</a>
      <h1>Заказ-наряд ${escapeHtml(item.code)}</h1>
      <p class="muted small">Рабочее пространство жизненного цикла: статус, ответственность, заметки, операции с запчастями и прозрачная история переходов.</p>
      <div class="summary-grid">
        <div class="summary-card"><strong>Клиент</strong><span>${escapeHtml(item.customerName)}</span></div>
        <div class="summary-card"><strong>Авто</strong><span>${escapeHtml(item.vehicleLabel)}</span></div>
        <div class="summary-card"><strong>Текущий статус</strong><span>${escapeHtml(item.statusLabelRu)}</span></div>
        <div class="summary-card"><strong>Пост / ответственный</strong><span>${escapeHtml(item.bayName)} · ${escapeHtml(item.primaryAssignee)}</span></div>
        <div class="summary-card"><strong>Долг</strong><span>${escapeHtml(String(item.balanceDueRub ?? 0))} руб.</span></div>
      </div>
    </section>

    ${messages.map((message) => `<section class="panel callout">${escapeHtml(message)}</section>`).join("")}

    ${errors.length > 0 ? `
    <section class="panel callout error">
      <strong>Исправьте ошибки перед сохранением</strong>
      <ul>${errors.map((error) => `<li>${formatGlobalError(error, FIELD_LABELS)}</li>`).join("")}</ul>
    </section>` : ""}

    ${normalizedPartsUi.errors.length > 0 ? `
    <section class="panel callout error">
      <strong>Исправьте ошибки в операции по запчастям</strong>
      <ul>${normalizedPartsUi.errors.map((error) => `<li>${formatGlobalError(error, PARTS_FIELD_LABELS)}</li>`).join("")}</ul>
    </section>` : ""}

    <section class="panel row">
      <h2>Управление жизненным циклом</h2>
      <form method="post" action="/work-orders/${escapeHtml(item.id)}" data-work-order-form>
        <div class="field-grid">
          <label>Статус
            <select name="status">
              ${statusOptions.map((status) => {
                const selected = status === selectedStatus ? " selected" : "";
                const label = getWorkOrderStatusLabel(status) ?? status;
                return `<option value="${escapeHtml(status)}"${selected}>${escapeHtml(label)}</option>`;
              }).join("")}
            </select>
            ${renderFieldErrors(lifecycleFieldErrorMap, "status")}
          </label>

          <label>Пост
            <select name="bayId">
              <option value="">Без поста</option>
              ${(options.bays ?? []).map((bay) => {
                const selected = bay.id === selectedBayId ? " selected" : "";
                return `<option value="${escapeHtml(bay.id)}"${selected}>${escapeHtml(bay.name)}</option>`;
              }).join("")}
            </select>
            ${renderFieldErrors(lifecycleFieldErrorMap, "bayId")}
          </label>

          <label>Ответственный
            <select name="primaryAssignee">
              <option value="">Без ответственного</option>
              ${(options.employees ?? []).map((employee) => {
                const selected = employee.name === selectedAssignee ? " selected" : "";
                return `<option value="${escapeHtml(employee.name)}"${selected}>${escapeHtml(employee.name)}</option>`;
              }).join("")}
            </select>
            ${renderFieldErrors(lifecycleFieldErrorMap, "primaryAssignee")}
          </label>

          <label>Долг, руб.
            <input type="number" min="0" step="1" name="balanceDueRub" value="${escapeHtml(balanceDueRub)}" />
            ${renderFieldErrors(lifecycleFieldErrorMap, "balanceDueRub")}
          </label>
        </div>

        <label>Жалоба клиента
          <textarea name="complaint" placeholder="Исходный запрос клиента">${escapeHtml(complaint)}</textarea>
          ${renderFieldErrors(lifecycleFieldErrorMap, "complaint")}
        </label>

        <label>Диагностика и выводы
          <textarea name="findings" placeholder="Результаты диагностики">${escapeHtml(findings)}</textarea>
          ${renderFieldErrors(lifecycleFieldErrorMap, "findings")}
        </label>

        <label>Внутренние заметки
          <textarea name="internalNotes" placeholder="Тех. комментарии для команды">${escapeHtml(internalNotes)}</textarea>
          ${renderFieldErrors(lifecycleFieldErrorMap, "internalNotes")}
        </label>

        <label>Комментарий для клиента
          <textarea name="customerNotes" placeholder="Что сообщаем клиенту">${escapeHtml(customerNotes)}</textarea>
          ${renderFieldErrors(lifecycleFieldErrorMap, "customerNotes")}
        </label>

        <label>Причина изменения (для истории)
          <input type="text" name="reason" value="${escapeHtml(reason)}" placeholder="Коротко: что изменилось и почему" />
          ${renderFieldErrors(lifecycleFieldErrorMap, "reason")}
        </label>

        <div class="row">
          <button class="btn primary" type="submit" data-submit>Сохранить изменения</button>
        </div>
      </form>
    </section>

    ${renderPartsSnapshot(item)}
    ${renderPartsCreateForm(item, normalizedPartsUi)}
    ${renderPartsRequestCards(item, normalizedPartsUi)}

    <section class="panel row">
      <h2>История статусов</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Переход</th>
              <th>Когда</th>
              <th>Кем</th>
              <th>Причина</th>
              <th>Источник</th>
            </tr>
          </thead>
          <tbody>
            ${renderHistoryRows(item.statusHistory)}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel row">
      <h2>История по запчастям</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Событие</th>
              <th>Когда</th>
              <th>Кем</th>
              <th>Причина</th>
              <th>Источник</th>
              <th>Запрос</th>
              <th>Поставка</th>
              <th>Детали</th>
            </tr>
          </thead>
          <tbody>
            ${renderPartsHistoryRows(item.partsHistory)}
          </tbody>
        </table>
      </div>
    </section>
  </div>`;

  return renderFormPageDocument({
    title: `Заказ-наряд ${item.code}`,
    body,
    formSelector: "form[data-work-order-form], form[data-work-order-parts-create-form], form[data-work-order-parts-update-form], form[data-work-order-parts-purchase-form]",
    submitBusyText: "Сохраняем...",
  });
}

function renderActiveStatusRows(items) {
  if (items.length === 0) {
    return '<tr><td colspan="5">Активных заказ-нарядов нет</td></tr>';
  }

  return items
    .map((item) => {
      return `<tr>
        <td><a href="/work-orders/${escapeHtml(item.id)}">${escapeHtml(item.code)}</a></td>
        <td>${escapeHtml(item.statusLabelRu)}</td>
        <td>${escapeHtml(item.customerName)}</td>
        <td>${escapeHtml(item.vehicleLabel)}</td>
        <td>${escapeHtml(item.primaryAssignee)}</td>
      </tr>`;
    })
    .join("");
}

export function renderActiveWorkOrderQueuePage({ items }) {
  const body = `<main class="page-shell active-queue-page">
    <section class="panel row queue-table">
      <a class="btn" href="/">← Назад на доску</a>
      <h1>Активная очередь заказ-нарядов</h1>
      <p>Всего активных: <strong>${items.length}</strong></p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Код</th>
              <th>Статус</th>
              <th>Клиент</th>
              <th>Авто</th>
              <th>Ответственный</th>
            </tr>
          </thead>
          <tbody>
            ${renderActiveStatusRows(items)}
          </tbody>
        </table>
      </div>
    </section>
  </main>`;

  return renderDocumentShell({
    title: "Активная очередь заказ-нарядов",
    bodyClass: "active-queue-page",
    body,
  });
}

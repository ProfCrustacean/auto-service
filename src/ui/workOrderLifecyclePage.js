import {
  escapeHtml,
  renderFieldErrors,
  buildFieldErrorMap,
  renderFormPageDocument,
  formatGlobalError,
} from "./pageFormShared.js";
import { getWorkOrderStatusLabel, listAllowedWorkOrderTransitions } from "../domain/workOrderLifecycle.js";

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

export function renderWorkOrderLifecyclePage({
  item,
  options,
  errors = [],
  messages = [],
  values = null,
}) {
  const fieldErrorMap = buildFieldErrorMap(errors);
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
      <p class="muted small">Рабочее пространство жизненного цикла: статус, ответственность, заметки и прозрачная история переходов.</p>
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
            ${renderFieldErrors(fieldErrorMap, "status")}
          </label>

          <label>Пост
            <select name="bayId">
              <option value="">Без поста</option>
              ${(options.bays ?? []).map((bay) => {
                const selected = bay.id === selectedBayId ? " selected" : "";
                return `<option value="${escapeHtml(bay.id)}"${selected}>${escapeHtml(bay.name)}</option>`;
              }).join("")}
            </select>
            ${renderFieldErrors(fieldErrorMap, "bayId")}
          </label>

          <label>Ответственный
            <select name="primaryAssignee">
              <option value="">Без ответственного</option>
              ${(options.employees ?? []).map((employee) => {
                const selected = employee.name === selectedAssignee ? " selected" : "";
                return `<option value="${escapeHtml(employee.name)}"${selected}>${escapeHtml(employee.name)}</option>`;
              }).join("")}
            </select>
            ${renderFieldErrors(fieldErrorMap, "primaryAssignee")}
          </label>

          <label>Долг, руб.
            <input type="number" min="0" step="1" name="balanceDueRub" value="${escapeHtml(balanceDueRub)}" />
            ${renderFieldErrors(fieldErrorMap, "balanceDueRub")}
          </label>
        </div>

        <label>Жалоба клиента
          <textarea name="complaint" placeholder="Исходный запрос клиента">${escapeHtml(complaint)}</textarea>
          ${renderFieldErrors(fieldErrorMap, "complaint")}
        </label>

        <label>Диагностика и выводы
          <textarea name="findings" placeholder="Результаты диагностики">${escapeHtml(findings)}</textarea>
          ${renderFieldErrors(fieldErrorMap, "findings")}
        </label>

        <label>Внутренние заметки
          <textarea name="internalNotes" placeholder="Тех. комментарии для команды">${escapeHtml(internalNotes)}</textarea>
          ${renderFieldErrors(fieldErrorMap, "internalNotes")}
        </label>

        <label>Комментарий для клиента
          <textarea name="customerNotes" placeholder="Что сообщаем клиенту">${escapeHtml(customerNotes)}</textarea>
          ${renderFieldErrors(fieldErrorMap, "customerNotes")}
        </label>

        <label>Причина изменения (для истории)
          <input type="text" name="reason" value="${escapeHtml(reason)}" placeholder="Коротко: что изменилось и почему" />
          ${renderFieldErrors(fieldErrorMap, "reason")}
        </label>

        <div class="row">
          <button class="btn primary" type="submit" data-submit>Сохранить изменения</button>
        </div>
      </form>
    </section>

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
  </div>`;

  return renderFormPageDocument({
    title: `Заказ-наряд ${item.code}`,
    body,
    formSelector: "[data-work-order-form]",
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
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Активная очередь заказ-нарядов</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: "Manrope", "Segoe UI", sans-serif; background: #f4f7f3; color: #1d2c22; }
    .wrap { max-width: 1080px; margin: 0 auto; padding: 20px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 12px; }
    .panel { background: #fff; border: 1px solid #d3ddd4; border-radius: 14px; padding: 14px; min-width: 0; }
    .btn { text-decoration: none; border: 1px solid #d3ddd4; border-radius: 999px; padding: 6px 12px; color: #1d2c22; display: inline-block; }
    .table-wrap { overflow-x: auto; border: 1px solid #d3ddd4; border-radius: 10px; }
    table { width: 100%; border-collapse: collapse; min-width: 680px; }
    th, td { text-align: left; padding: 8px; border-top: 1px solid #d3ddd4; vertical-align: top; word-break: break-word; }
    th { border-top: none; background: #f8fbf8; color: #5b6d61; }
    td a { color: #1f7a55; text-decoration: none; font-weight: 600; }
    @media (max-width: 760px) {
      .wrap { padding: 12px; }
      table { min-width: 0; table-layout: fixed; }
      th:nth-child(4), td:nth-child(4),
      th:nth-child(5), td:nth-child(5) { display: none; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="panel">
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
  </main>
</body>
</html>`;
}

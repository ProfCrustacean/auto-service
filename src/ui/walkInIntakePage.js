import {
  buildFieldErrorMap,
  escapeHtml,
  formatGlobalError,
  renderEntitySelectionSection,
  renderFieldErrors,
  renderFormPageDocument,
  renderLookupSection,
  renderSummaryCard,
} from "./pageFormShared.js";

const PERSISTED_FORM_FIELDS = [
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
  q: "Поиск",
};

export function renderWalkInIntakePage(model) {
  const values = model.values ?? {};
  const options = model.options ?? {};
  const selected = model.selected ?? {};
  const lookup = model.lookup ?? { performed: false, query: "", customers: [], vehicles: [] };
  const errors = Array.isArray(model.errors) ? model.errors : [];
  const warnings = Array.isArray(model.warnings) ? model.warnings : [];
  const messages = Array.isArray(model.messages) ? model.messages : [];
  const fieldErrorMap = buildFieldErrorMap(errors);

  const customerSummary = selected.customer
    ? `${selected.customer.fullName} (${selected.customer.phone})`
    : "Клиент пока не выбран";

  const vehicleSummary = selected.vehicle
    ? `${selected.vehicle.label} — ${selected.vehicle.customerName}`
    : "Авто пока не выбрано";

  const body = `<div class="wrap">
    <section class="panel row">
      <a class="btn" href="/">← Назад на доску</a>
      <h1>Прием без записи</h1>
      <p class="muted small">Оформите клиента, который приехал без записи: выберите/создайте клиента и авто, заполните жалобу, направьте в активную очередь.</p>
      <div class="summary-grid">
        ${renderSummaryCard({ title: "Текущий клиент", content: customerSummary })}
        ${renderSummaryCard({ title: "Текущее авто", content: vehicleSummary })}
        ${renderSummaryCard({ title: "После сохранения", content: "Создается заказ-наряд в активной очереди" })}
      </div>
    </section>

    ${messages.map((message) => `<section class="panel callout">${escapeHtml(message)}</section>`).join("")}

    ${warnings.map((warning) => `<section class="panel callout warning">${escapeHtml(warning)}</section>`).join("")}

    ${errors.length > 0 ? `
    <section class="panel callout error">
      <strong>Исправьте ошибки перед сохранением</strong>
      <ul>${errors.map((error) => `<li>${formatGlobalError(error, FIELD_LABELS)}</li>`).join("")}</ul>
    </section>` : ""}

    ${renderLookupSection({
      basePath: "/intake/walk-in",
      values,
      lookup,
      model,
      persistedFields: PERSISTED_FORM_FIELDS,
    })}

    <section class="panel row">
      <h2>Форма приема</h2>
      <form method="post" action="/intake/walk-in" data-intake-form>
        <input type="hidden" name="q" value="${escapeHtml(values.q)}" />

        <div class="split">
          ${renderEntitySelectionSection({
            values,
            options,
            fieldErrorMap,
            vehicleMakeLabel: "Новое авто: Марка",
          })}

          <section class="row">
            <h3>2) Intake данные</h3>
            <label>Жалоба / запрос клиента
              <textarea name="complaint" placeholder="Что беспокоит клиента">${escapeHtml(values.complaint)}</textarea>
              ${renderFieldErrors(fieldErrorMap, "complaint")}
            </label>

            <div class="field-grid">
              <label>Пост
                <select name="bayId">
                  <option value="">Без поста</option>
                  ${(options.bays ?? []).map((bay) => {
                    const selectedAttr = bay.id === values.bayId ? " selected" : "";
                    return `<option value="${escapeHtml(bay.id)}"${selectedAttr}>${escapeHtml(bay.name)}</option>`;
                  }).join("")}
                </select>
                ${renderFieldErrors(fieldErrorMap, "bayId")}
              </label>

              <label>Ответственный
                <select name="primaryAssignee">
                  <option value="">Без ответственного</option>
                  ${(options.employees ?? []).map((employee) => {
                    const selectedAttr = employee.name === values.primaryAssignee ? " selected" : "";
                    return `<option value="${escapeHtml(employee.name)}"${selectedAttr}>${escapeHtml(employee.name)}</option>`;
                  }).join("")}
                </select>
                ${renderFieldErrors(fieldErrorMap, "primaryAssignee")}
              </label>
            </div>
          </section>
        </div>

        <div class="row">
          <button class="btn primary" type="submit" data-submit>Принять без записи</button>
          <p class="muted small">Если клиент или авто не выбраны, система создаст их из блоков «Новый клиент» / «Новое авто» и сразу оформит заказ-наряд.</p>
        </div>
      </form>
    </section>
  </div>`;

  return renderFormPageDocument({
    title: "Прием без записи",
    body,
    formSelector: "[data-intake-form]",
    submitBusyText: "Создаем...",
  });
}

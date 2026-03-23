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
  "mode",
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

const FIELD_LABELS = {
  plannedStartLocal: "Плановый старт",
  customerId: "Клиент",
  vehicleId: "Авто",
  complaint: "Жалоба/запрос",
  bayId: "Пост",
  primaryAssignee: "Ответственный",
  expectedDurationMin: "Длительность",
  notes: "Заметки",
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

export function renderAppointmentBookingPage(model) {
  const values = model.values ?? {};
  const options = model.options ?? {};
  const selected = model.selected ?? {};
  const mode = model.mode === "walkin" ? "walkin" : "booking";
  const isWalkInMode = mode === "walkin";
  const modeBasePath = isWalkInMode ? "/appointments/new?mode=walkin" : "/appointments/new?mode=booking";
  const lookup = model.lookup ?? { performed: false, query: "", customers: [], vehicles: [] };
  const errors = Array.isArray(model.errors) ? model.errors : [];
  const warnings = Array.isArray(model.warnings) ? model.warnings : [];
  const messages = Array.isArray(model.messages) ? model.messages : [];
  const conflictDetails = Array.isArray(model.conflictDetails) ? model.conflictDetails : [];
  const fieldErrorMap = buildFieldErrorMap(errors);

  const customerSummary = selected.customer
    ? `${selected.customer.fullName} (${selected.customer.phone})`
    : "Клиент пока не выбран";

  const vehicleSummary = selected.vehicle
    ? `${selected.vehicle.label} — ${selected.vehicle.customerName}`
    : "Авто пока не выбрано";

  const subtitle = isWalkInMode
    ? "Оформите прием без записи: выберите или создайте клиента и авто, заполните жалобу, сохраните."
    : "Создайте запись без перехода в API: выберите клиента/авто, задайте слот, проверьте конфликты, сохраните.";
  const submitButtonLabel = isWalkInMode ? "Принять без записи" : "Сохранить запись";
  const submitDescription = isWalkInMode
    ? "После сохранения создастся заказ-наряд в активной очереди без планового слота."
    : "Если клиент или авто не выбраны, система создаст их из полей «Новый клиент» / «Новое авто» в рамках этого же сохранения.";

  const body = `<div class="wrap">
    <section class="panel row">
      <a class="btn" href="/">← Назад на доску</a>
      <h1>Новая запись</h1>
      <div class="lookup-form">
        <a class="btn${isWalkInMode ? "" : " primary"}" href="/appointments/new?mode=booking">Запись по времени</a>
        <a class="btn${isWalkInMode ? " primary" : ""}" href="/appointments/new?mode=walkin">Принять сейчас</a>
      </div>
      <p class="muted small">${escapeHtml(subtitle)}</p>
      <div class="summary-grid">
        ${renderSummaryCard({ title: "Текущий клиент", content: customerSummary })}
        ${renderSummaryCard({ title: "Текущее авто", content: vehicleSummary })}
      </div>
    </section>

    ${messages.map((message) => `<section class="panel callout">${escapeHtml(message)}</section>`).join("")}

    ${warnings.map((warning) => `<section class="panel callout warning">${escapeHtml(warning)}</section>`).join("")}

    ${errors.length > 0 ? `
    <section class="panel callout error">
      <strong>Исправьте ошибки перед сохранением</strong>
      <ul>${errors.map((error) => `<li>${formatGlobalError(error, FIELD_LABELS)}</li>`).join("")}</ul>
    </section>` : ""}

    ${!isWalkInMode && conflictDetails.length > 0 ? `
    <section class="panel callout warning">
      <strong>Конфликт загрузки в выбранном слоте</strong>
      <ul>
        ${conflictDetails.map((detail) => `<li>${escapeHtml(detail.field ?? "slot")}: ${escapeHtml(detail.message ?? "Конфликт")}</li>`).join("")}
      </ul>
    </section>` : ""}

    ${renderLookupSection({
      basePath: modeBasePath,
      values,
      lookup,
      model,
      persistedFields: PERSISTED_FORM_FIELDS,
    })}

    <section class="panel row">
      <h2>${isWalkInMode ? "Форма приема" : "Форма записи"}</h2>
      <form method="post" action="/appointments/new" data-booking-form>
        <input type="hidden" name="mode" value="${escapeHtml(mode)}" />
        <input type="hidden" name="q" value="${escapeHtml(values.q)}" />

        <div class="split">
          ${renderEntitySelectionSection({
            values,
            options,
            fieldErrorMap,
            vehicleMakeLabel: "Новое авто: Марка / модель",
          })}

          ${isWalkInMode ? `<section class="row">
            <h3>2) Прием сейчас</h3>
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

            <label>Жалоба / запрос клиента
              <textarea name="complaint" placeholder="Что беспокоит клиента">${escapeHtml(values.complaint)}</textarea>
              ${renderFieldErrors(fieldErrorMap, "complaint")}
            </label>
          </section>` : `<section class="row">
            <h3>2) Слот и работы</h3>
            <div class="field-grid">
              <label>Плановый старт
                <input type="text" name="plannedStartLocal" value="${escapeHtml(values.plannedStartLocal)}" placeholder="2026-03-25 10:30" />
                ${renderFieldErrors(fieldErrorMap, "plannedStartLocal")}
              </label>

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

              <label>Ожидаемая длительность (мин)
                <input type="text" name="expectedDurationMin" value="${escapeHtml(values.expectedDurationMin)}" placeholder="60" />
                ${renderFieldErrors(fieldErrorMap, "expectedDurationMin")}
              </label>
            </div>

            <label>Жалоба / запрос клиента
              <textarea name="complaint" placeholder="Что нужно сделать">${escapeHtml(values.complaint)}</textarea>
              ${renderFieldErrors(fieldErrorMap, "complaint")}
            </label>

            <label>Внутренние заметки
              <textarea name="notes" placeholder="Опционально">${escapeHtml(values.notes)}</textarea>
              ${renderFieldErrors(fieldErrorMap, "notes")}
            </label>
          </section>`}
        </div>

        <div class="row">
          <button class="btn primary" type="submit" data-submit>${escapeHtml(submitButtonLabel)}</button>
          <p class="muted small">${escapeHtml(submitDescription)}</p>
        </div>
      </form>
    </section>
  </div>`;

  return renderFormPageDocument({
    title: "Новая запись",
    body,
    formSelector: "[data-booking-form]",
    submitBusyText: "Сохраняем...",
  });
}

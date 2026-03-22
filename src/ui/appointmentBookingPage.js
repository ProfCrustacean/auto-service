function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const PERSISTED_FORM_FIELDS = [
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

function buildFieldErrorMap(errors) {
  const map = new Map();

  for (const error of errors) {
    const field = String(error.field ?? "form");
    const next = map.get(field) ?? [];
    next.push(String(error.message ?? "Неверное значение"));
    map.set(field, next);
  }

  return map;
}

function renderFieldErrors(fieldErrorMap, field) {
  const errors = fieldErrorMap.get(field) ?? [];
  if (errors.length === 0) {
    return "";
  }

  return `<ul class="field-errors">${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`;
}

function formatGlobalError(error) {
  const field = String(error.field ?? "form");
  const message = String(error.message ?? "Проверьте данные формы");

  if (field === "form") {
    return escapeHtml(message);
  }

  const label = FIELD_LABELS[field] ?? field;
  return `${escapeHtml(label)}: ${escapeHtml(message)}`;
}

function buildPrefillHref(values, overrides = {}) {
  const params = new URLSearchParams();

  for (const field of PERSISTED_FORM_FIELDS) {
    const override = overrides[field];
    const value = override !== undefined ? override : values[field];
    const text = String(value ?? "").trim();
    if (text.length > 0) {
      params.set(field, text);
    }
  }

  const serialized = params.toString();
  return serialized.length > 0 ? `/appointments/new?${serialized}` : "/appointments/new";
}

function renderSelectOptions(items, { selectedValue, valueField, labelBuilder }) {
  const options = [
    `<option value="">${escapeHtml("Не выбрано")}</option>`,
    ...items.map((item) => {
      const value = String(item[valueField] ?? "");
      const label = labelBuilder(item);
      const selected = value === selectedValue ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    }),
  ];

  return options.join("");
}

function renderSummaryCard({ title, content, variant = "default" }) {
  return `<div class="summary-card ${escapeHtml(variant)}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(content)}</span></div>`;
}

function renderLookupCustomerRows(model) {
  const { values, lookup, selected } = model;

  if (lookup.customers.length === 0) {
    return "<tr><td colspan=\"3\" class=\"muted\">Совпадений не найдено</td></tr>";
  }

  return lookup.customers.map((customer) => {
    const shouldKeepVehicle = selected.vehicle && selected.vehicle.customerId === customer.id;
    const href = buildPrefillHref(values, {
      customerId: customer.id,
      vehicleId: shouldKeepVehicle ? values.vehicleId : "",
    });

    return `<tr>
      <td>${escapeHtml(customer.fullName)}</td>
      <td>${escapeHtml(customer.phone)}</td>
      <td><a class="btn" href="${escapeHtml(href)}">Выбрать</a></td>
    </tr>`;
  }).join("");
}

function renderLookupVehicleRows(model) {
  const { values, lookup } = model;

  if (lookup.vehicles.length === 0) {
    return "<tr><td colspan=\"4\" class=\"muted\">Совпадений не найдено</td></tr>";
  }

  return lookup.vehicles.map((vehicle) => {
    const href = buildPrefillHref(values, {
      customerId: vehicle.customerId,
      vehicleId: vehicle.id,
    });

    return `<tr>
      <td>${escapeHtml(vehicle.label)}</td>
      <td>${escapeHtml(vehicle.customerName)}</td>
      <td>${escapeHtml(vehicle.plateNumber ?? "н/д")}</td>
      <td><a class="btn" href="${escapeHtml(href)}">Выбрать</a></td>
    </tr>`;
  }).join("");
}

function renderHiddenPreservedValues(values, excludedFields) {
  return PERSISTED_FORM_FIELDS
    .filter((field) => !excludedFields.has(field))
    .map((field) => {
      const value = String(values[field] ?? "").trim();
      if (value.length === 0) {
        return "";
      }
      return `<input type="hidden" name="${escapeHtml(field)}" value="${escapeHtml(value)}" />`;
    })
    .join("");
}

export function renderAppointmentBookingPage(model) {
  const values = model.values ?? {};
  const options = model.options ?? {};
  const selected = model.selected ?? {};
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

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Новая запись</title>
  <style>
    :root {
      --bg: #f4f7f3;
      --surface: #ffffff;
      --line: #d3ddd4;
      --ink: #1d2c22;
      --muted: #5b6d61;
      --accent: #1f7a55;
      --accent-soft: #d9efe3;
      --danger-bg: #f9e6de;
      --danger-ink: #9a4020;
      --warn-bg: #fff2dc;
      --warn-ink: #8f5e00;
      --font: "Manrope", "Segoe UI", sans-serif;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--font);
      color: var(--ink);
      background: radial-gradient(circle at top right, #ebf6ef, var(--bg));
      line-height: 1.4;
    }
    .wrap {
      max-width: 1120px;
      margin: 0 auto;
      padding: 20px;
      display: grid;
      gap: 12px;
    }
    .panel {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 14px;
    }
    h1, h2, h3 {
      margin: 0;
    }
    h1 { font-size: 1.35rem; }
    h2 { font-size: 1.02rem; margin-bottom: 10px; }
    h3 { font-size: 0.9rem; margin-bottom: 8px; color: var(--muted); }
    .muted { color: var(--muted); }
    .small { font-size: 0.84rem; }
    .row { display: grid; gap: 10px; }
    .split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 8px;
    }
    .summary-card {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px;
      background: #fbfcfa;
      display: grid;
      gap: 3px;
    }
    .summary-card strong { font-size: 0.88rem; color: var(--muted); }
    .summary-card span { font-size: 0.94rem; }
    .summary-card.warning {
      background: var(--warn-bg);
      border-color: #e6cc99;
      color: var(--warn-ink);
    }
    .summary-card.error {
      background: var(--danger-bg);
      border-color: #e4b8a8;
      color: var(--danger-ink);
    }
    .btn {
      text-decoration: none;
      border-radius: 999px;
      border: 1px solid var(--line);
      padding: 6px 12px;
      font-size: 0.87rem;
      color: var(--ink);
      background: #fbfcfa;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .btn.primary {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }
    .btn:disabled {
      opacity: 0.6;
      cursor: progress;
    }
    .lookup-form {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .lookup-form input {
      flex: 1;
      min-width: 220px;
    }
    .field-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 10px;
    }
    label {
      display: grid;
      gap: 4px;
      font-size: 0.86rem;
      color: var(--muted);
    }
    input, textarea, select {
      border: 1px solid var(--line);
      border-radius: 9px;
      padding: 8px 10px;
      font: inherit;
      background: #fff;
      color: var(--ink);
      width: 100%;
    }
    textarea {
      min-height: 86px;
      resize: vertical;
    }
    .field-errors {
      margin: 4px 0 0;
      padding-left: 16px;
      color: var(--danger-ink);
      font-size: 0.8rem;
    }
    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 10px;
    }
    table {
      width: 100%;
      min-width: 520px;
      border-collapse: collapse;
      font-size: 0.88rem;
    }
    th, td {
      text-align: left;
      padding: 8px;
      border-top: 1px solid var(--line);
      vertical-align: top;
    }
    th {
      border-top: none;
      color: var(--muted);
      background: #f8fbf8;
      font-weight: 600;
    }
    .callout {
      border-radius: 10px;
      padding: 10px 12px;
      border: 1px solid var(--line);
      background: #fbfcfa;
    }
    .callout.warning {
      background: var(--warn-bg);
      border-color: #e6cc99;
      color: var(--warn-ink);
    }
    .callout.error {
      background: var(--danger-bg);
      border-color: #e4b8a8;
      color: var(--danger-ink);
    }
    .callout ul {
      margin: 8px 0 0;
      padding-left: 18px;
    }
    @media (max-width: 960px) {
      .split {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <section class="panel row">
      <a class="btn" href="/">← Назад на доску</a>
      <h1>Новая запись</h1>
      <p class="muted small">Создайте запись без перехода в API: выберите клиента/авто, задайте слот, проверьте конфликты, сохраните.</p>
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
      <ul>${errors.map((error) => `<li>${formatGlobalError(error)}</li>`).join("")}</ul>
    </section>` : ""}

    ${conflictDetails.length > 0 ? `
    <section class="panel callout warning">
      <strong>Конфликт загрузки в выбранном слоте</strong>
      <ul>
        ${conflictDetails.map((detail) => `<li>${escapeHtml(detail.field ?? "slot")}: ${escapeHtml(detail.message ?? "Конфликт")}</li>`).join("")}
      </ul>
    </section>` : ""}

    <section class="panel row">
      <h2>Быстрый поиск клиента и авто</h2>
      <form class="lookup-form" method="get" action="/appointments/new">
        <input type="text" name="q" value="${escapeHtml(values.q)}" placeholder="Имя, телефон, номер, VIN, модель" />
        ${renderHiddenPreservedValues(values, new Set(["q"]))}
        <button class="btn" type="submit">Искать</button>
        ${String(values.q).trim().length > 0 ? '<a class="btn" href="/appointments/new">Сбросить</a>' : ""}
      </form>

      ${lookup.performed ? `
      <div class="split">
        <section>
          <h3>Клиенты</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Клиент</th><th>Телефон</th><th>Действие</th></tr></thead>
              <tbody>
                ${renderLookupCustomerRows(model)}
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <h3>Авто</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Авто</th><th>Клиент</th><th>Номер</th><th>Действие</th></tr></thead>
              <tbody>
                ${renderLookupVehicleRows(model)}
              </tbody>
            </table>
          </div>
        </section>
      </div>` : ""}
    </section>

    <section class="panel row">
      <h2>Форма записи</h2>
      <form method="post" action="/appointments/new" data-booking-form>
        <input type="hidden" name="q" value="${escapeHtml(values.q)}" />

        <div class="split">
          <section class="row">
            <h3>1) Клиент и авто</h3>
            <div class="field-grid">
              <label>Клиент
                <select name="customerId">
                  ${renderSelectOptions(options.customers, {
                    selectedValue: values.customerId,
                    valueField: "id",
                    labelBuilder: (customer) => `${customer.fullName} (${customer.phone})`,
                  })}
                </select>
                ${renderFieldErrors(fieldErrorMap, "customerId")}
              </label>

              <label>Авто
                <select name="vehicleId">
                  ${renderSelectOptions(options.vehicles, {
                    selectedValue: values.vehicleId,
                    valueField: "id",
                    labelBuilder: (vehicle) => `${vehicle.label} — ${vehicle.customerName}`,
                  })}
                </select>
                ${renderFieldErrors(fieldErrorMap, "vehicleId")}
              </label>
            </div>

            <div class="field-grid">
              <label>Новый клиент: ФИО
                <input type="text" name="newCustomerFullName" value="${escapeHtml(values.newCustomerFullName)}" placeholder="Если клиента нет в базе" />
                ${renderFieldErrors(fieldErrorMap, "newCustomerFullName")}
              </label>
              <label>Новый клиент: Телефон
                <input type="text" name="newCustomerPhone" value="${escapeHtml(values.newCustomerPhone)}" placeholder="+7 ..." />
                ${renderFieldErrors(fieldErrorMap, "newCustomerPhone")}
              </label>
              <label>Новый клиент: Мессенджер
                <input type="text" name="newCustomerMessagingHandle" value="${escapeHtml(values.newCustomerMessagingHandle)}" placeholder="@handle (опционально)" />
                ${renderFieldErrors(fieldErrorMap, "newCustomerMessagingHandle")}
              </label>
              <label>Новый клиент: Примечание
                <input type="text" name="newCustomerNotes" value="${escapeHtml(values.newCustomerNotes)}" placeholder="Опционально" />
                ${renderFieldErrors(fieldErrorMap, "newCustomerNotes")}
              </label>
            </div>

            <div class="field-grid">
              <label>Новое авто: Название
                <input type="text" name="newVehicleLabel" value="${escapeHtml(values.newVehicleLabel)}" placeholder="Например: Lada Vesta A111AA13" />
                ${renderFieldErrors(fieldErrorMap, "newVehicleLabel")}
              </label>
              <label>Новое авто: Номер
                <input type="text" name="newVehiclePlateNumber" value="${escapeHtml(values.newVehiclePlateNumber)}" placeholder="A111AA13" />
                ${renderFieldErrors(fieldErrorMap, "newVehiclePlateNumber")}
              </label>
              <label>Новое авто: VIN
                <input type="text" name="newVehicleVin" value="${escapeHtml(values.newVehicleVin)}" placeholder="Опционально" />
                ${renderFieldErrors(fieldErrorMap, "newVehicleVin")}
              </label>
              <label>Новое авто: Марка / модель
                <input type="text" name="newVehicleMake" value="${escapeHtml(values.newVehicleMake)}" placeholder="Марка" />
                ${renderFieldErrors(fieldErrorMap, "newVehicleMake")}
              </label>
              <label>Новое авто: Модель
                <input type="text" name="newVehicleModel" value="${escapeHtml(values.newVehicleModel)}" placeholder="Модель" />
                ${renderFieldErrors(fieldErrorMap, "newVehicleModel")}
              </label>
              <label>Новое авто: Год
                <input type="text" name="newVehicleProductionYear" value="${escapeHtml(values.newVehicleProductionYear)}" placeholder="2008" />
                ${renderFieldErrors(fieldErrorMap, "newVehicleProductionYear")}
              </label>
              <label>Новое авто: Пробег, км
                <input type="text" name="newVehicleMileageKm" value="${escapeHtml(values.newVehicleMileageKm)}" placeholder="125000" />
                ${renderFieldErrors(fieldErrorMap, "newVehicleMileageKm")}
              </label>
              <label>Новое авто: Двигатель / комплектация
                <input type="text" name="newVehicleEngineOrTrim" value="${escapeHtml(values.newVehicleEngineOrTrim)}" placeholder="Опционально" />
                ${renderFieldErrors(fieldErrorMap, "newVehicleEngineOrTrim")}
              </label>
            </div>
          </section>

          <section class="row">
            <h3>2) Слот и работы</h3>
            <div class="field-grid">
              <label>Плановый старт
                <input type="text" name="plannedStartLocal" value="${escapeHtml(values.plannedStartLocal)}" placeholder="2026-03-25 10:30 или Завтра 10:30" />
                ${renderFieldErrors(fieldErrorMap, "plannedStartLocal")}
              </label>

              <label>Пост
                <select name="bayId">
                  <option value="">Без поста</option>
                  ${options.bays.map((bay) => {
                    const selectedAttr = bay.id === values.bayId ? " selected" : "";
                    return `<option value="${escapeHtml(bay.id)}"${selectedAttr}>${escapeHtml(bay.name)}</option>`;
                  }).join("")}
                </select>
                ${renderFieldErrors(fieldErrorMap, "bayId")}
              </label>

              <label>Ответственный
                <select name="primaryAssignee">
                  <option value="">Без ответственного</option>
                  ${options.employees.map((employee) => {
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
          </section>
        </div>

        <div class="row">
          <button class="btn primary" type="submit" data-submit>Сохранить запись</button>
          <p class="muted small">Если клиент или авто не выбраны, система создаст их из полей «Новый клиент» / «Новое авто» в рамках этого же сохранения.</p>
        </div>
      </form>
    </section>
  </div>

  <script>
    (() => {
      const form = document.querySelector('[data-booking-form]');
      if (!form) return;
      form.addEventListener('submit', () => {
        const submitButton = form.querySelector('[data-submit]');
        if (!submitButton || submitButton.disabled) return;
        submitButton.disabled = true;
        submitButton.textContent = 'Сохраняем...';
      });
    })();
  </script>
</body>
</html>`;
}

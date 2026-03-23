export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function buildFieldErrorMap(errors) {
  const map = new Map();

  for (const error of errors) {
    const field = String(error.field ?? "form");
    const next = map.get(field) ?? [];
    next.push(String(error.message ?? "Неверное значение"));
    map.set(field, next);
  }

  return map;
}

export function renderFieldErrors(fieldErrorMap, field) {
  const errors = fieldErrorMap.get(field) ?? [];
  if (errors.length === 0) {
    return "";
  }

  return `<ul class="field-errors">${errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`;
}

export function formatGlobalError(error, fieldLabels, fallback = "Проверьте данные формы") {
  const field = String(error.field ?? "form");
  const message = String(error.message ?? fallback);

  if (field === "form") {
    return escapeHtml(message);
  }

  const label = fieldLabels[field] ?? field;
  return `${escapeHtml(label)}: ${escapeHtml(message)}`;
}

export function buildPrefillHref({ basePath, values, persistedFields, overrides = {} }) {
  const params = new URLSearchParams();

  for (const field of persistedFields) {
    const override = overrides[field];
    const value = override !== undefined ? override : values[field];
    const text = String(value ?? "").trim();
    if (text.length > 0) {
      params.set(field, text);
    }
  }

  const serialized = params.toString();
  return serialized.length > 0 ? `${basePath}?${serialized}` : basePath;
}

export function renderSelectOptions(items, {
  selectedValue,
  valueField,
  labelBuilder,
  emptyLabel = "Не выбрано",
}) {
  const options = [
    `<option value="">${escapeHtml(emptyLabel)}</option>`,
    ...items.map((item) => {
      const value = String(item[valueField] ?? "");
      const label = labelBuilder(item);
      const selected = value === selectedValue ? " selected" : "";
      return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(label)}</option>`;
    }),
  ];

  return options.join("");
}

export function renderSummaryCard({ title, content, variant = "default" }) {
  return `<div class="summary-card ${escapeHtml(variant)}"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(content)}</span></div>`;
}

export function renderLookupCustomerRows({ model, basePath, persistedFields }) {
  const { values, lookup, selected } = model;

  if (lookup.customers.length === 0) {
    return '<tr><td colspan="3" class="muted">Совпадений не найдено</td></tr>';
  }

  return lookup.customers.map((customer) => {
    const shouldKeepVehicle = selected.vehicle && selected.vehicle.customerId === customer.id;
    const href = buildPrefillHref({
      basePath,
      values,
      persistedFields,
      overrides: {
        customerId: customer.id,
        vehicleId: shouldKeepVehicle ? values.vehicleId : "",
      },
    });

    return `<tr>
      <td>${escapeHtml(customer.fullName)}</td>
      <td>${escapeHtml(customer.phone)}</td>
      <td><a class="btn" href="${escapeHtml(href)}">Выбрать</a></td>
    </tr>`;
  }).join("");
}

export function renderLookupVehicleRows({ model, basePath, persistedFields }) {
  const { values, lookup } = model;

  if (lookup.vehicles.length === 0) {
    return '<tr><td colspan="4" class="muted">Совпадений не найдено</td></tr>';
  }

  return lookup.vehicles.map((vehicle) => {
    const href = buildPrefillHref({
      basePath,
      values,
      persistedFields,
      overrides: {
        customerId: vehicle.customerId,
        vehicleId: vehicle.id,
      },
    });

    return `<tr>
      <td>${escapeHtml(vehicle.label)}</td>
      <td>${escapeHtml(vehicle.customerName)}</td>
      <td>${escapeHtml(vehicle.plateNumber ?? "н/д")}</td>
      <td><a class="btn" href="${escapeHtml(href)}">Выбрать</a></td>
    </tr>`;
  }).join("");
}

export function renderHiddenPreservedValues({ values, persistedFields, excludedFields }) {
  return persistedFields
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

export function renderLookupSection({
  basePath,
  values,
  lookup,
  model,
  persistedFields,
}) {
  return `<section class="panel row">
      <h2>Быстрый поиск клиента и авто</h2>
      <form class="lookup-form" method="get" action="${escapeHtml(basePath)}">
        <input type="text" name="q" value="${escapeHtml(values.q)}" placeholder="Имя, телефон, номер, VIN, модель" />
        ${renderHiddenPreservedValues({ values, persistedFields, excludedFields: new Set(["q"]) })}
        <button class="btn" type="submit">Искать</button>
        ${String(values.q).trim().length > 0 ? `<a class="btn" href="${escapeHtml(basePath)}">Сбросить</a>` : ""}
      </form>

      ${lookup.performed ? `
      <div class="split">
        <section>
          <h3>Клиенты</h3>
          <div class="table-wrap">
            <table>
              <thead><tr><th>Клиент</th><th>Телефон</th><th>Действие</th></tr></thead>
              <tbody>
                ${renderLookupCustomerRows({ model, basePath, persistedFields })}
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
                ${renderLookupVehicleRows({ model, basePath, persistedFields })}
              </tbody>
            </table>
          </div>
        </section>
      </div>` : ""}
    </section>`;
}

export function renderEntitySelectionSection({
  values,
  options,
  fieldErrorMap,
  vehicleMakeLabel,
}) {
  const hasNewCustomerValues = [
    values.newCustomerFullName,
    values.newCustomerPhone,
    values.newCustomerMessagingHandle,
    values.newCustomerNotes,
  ].some((value) => String(value ?? "").trim().length > 0);

  const hasNewVehicleValues = [
    values.newVehicleLabel,
    values.newVehiclePlateNumber,
    values.newVehicleVin,
    values.newVehicleMake,
    values.newVehicleModel,
    values.newVehicleProductionYear,
    values.newVehicleMileageKm,
    values.newVehicleEngineOrTrim,
  ].some((value) => String(value ?? "").trim().length > 0);

  return `<section class="row">
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

            <details class="expander"${hasNewCustomerValues ? " open" : ""}>
              <summary>Новый клиент (если не найден в базе)</summary>
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
            </details>

            <details class="expander"${hasNewVehicleValues ? " open" : ""}>
              <summary>Новое авто (если не найдено в базе)</summary>
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
                <label>${escapeHtml(vehicleMakeLabel)}
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
            </details>
          </section>`;
}

export function renderFormPageDocument({
  title,
  body,
  formSelector,
  submitBusyText,
}) {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      --bg: #f4f7f3;
      --surface: #ffffff;
      --line: #d3ddd4;
      --ink: #1d2c22;
      --muted: #5b6d61;
      --accent: #1f7a55;
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
    .subpanel {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px;
      background: #fbfcfa;
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
    .expander {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: #fbfcfa;
      padding: 8px 10px;
    }
    .expander summary {
      cursor: pointer;
      font-size: 0.86rem;
      color: var(--muted);
      font-weight: 600;
      user-select: none;
    }
    .expander[open] summary {
      margin-bottom: 8px;
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
    .json-cell {
      margin: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 0.75rem;
      white-space: pre-wrap;
      word-break: break-word;
      max-width: 420px;
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
  ${body}
  <script>
    (() => {
      const forms = document.querySelectorAll(${JSON.stringify(formSelector)});
      if (!forms || forms.length === 0) return;
      forms.forEach((form) => {
        form.addEventListener('submit', () => {
          const submitButton = form.querySelector('[data-submit]');
          if (!submitButton || submitButton.disabled) return;
          submitButton.disabled = true;
          submitButton.textContent = ${JSON.stringify(submitBusyText)};
        });
      });
    })();
  </script>
</body>
</html>`;
}

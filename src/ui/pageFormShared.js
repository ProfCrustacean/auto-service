import { renderDocumentShell } from "./renderDocumentShell.js";

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
  if (serialized.length === 0) {
    return basePath;
  }

  const joiner = basePath.includes("?") ? "&" : "?";
  return `${basePath}${joiner}${serialized}`;
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
  return renderDocumentShell({
    title,
    bodyClass: "form-page",
    body,
    scriptsHtml: `<script>
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
  </script>`,
  });
}

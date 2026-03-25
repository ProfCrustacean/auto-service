import { renderDocumentShell } from "./renderDocumentShell.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTimestamp(value) {
  try {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "н/д";
  }
}

function formatTodayDateLabel(value) {
  try {
    const dateLabel = new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
    return `Сегодня: ${dateLabel}`;
  } catch {
    return "Сегодня: н/д";
  }
}

function renderLoadRows(rows) {
  if (rows.length === 0) {
    return '<tr><td colspan="4">Нет данных</td></tr>';
  }

  return rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.key)}</td>
        <td>${row.plannedCount}</td>
        <td>${row.activeCount}</td>
        <td>${row.blockedCount}</td>
      </tr>
    `,
    )
    .join("\n");
}

function renderAppointmentRows(rows) {
  if (rows.length === 0) {
    return '<tr><td colspan="6">Нет записей</td></tr>';
  }

  return rows
    .map(
      (row) => `
      <tr>
        <td><a href="${escapeHtml(row.detailHref)}">${escapeHtml(row.code)}</a></td>
        <td>${escapeHtml(row.plannedStartLocal)}</td>
        <td>${escapeHtml(row.customerName)}</td>
        <td>${escapeHtml(row.vehicleLabel)}</td>
        <td>${escapeHtml(row.bayName)}</td>
        <td>${escapeHtml(row.primaryAssignee)}</td>
      </tr>
    `,
    )
    .join("\n");
}

function renderUnifiedQueueSectionRows(title, rows, { showPartsMetrics = false } = {}) {
  const headerRow = `
    <tr class="queue-subsection">
      <th scope="colgroup" colspan="10">${escapeHtml(title)} (${rows.length})</th>
    </tr>
  `;

  if (rows.length === 0) {
    return `${headerRow}
    <tr class="queue-empty">
      <td colspan="10">Нет записей</td>
    </tr>`;
  }

  const bodyRows = rows
    .map(
      (row) => `
      <tr>
        <td><a href="${escapeHtml(row.detailHref)}">${escapeHtml(row.code)}</a></td>
        <td>
          <strong>${escapeHtml(row.customerName)}</strong>
          <div class="muted small">${escapeHtml(row.customerPhone)}</div>
        </td>
        <td>${escapeHtml(row.vehicleLabel)}</td>
        <td>${escapeHtml(row.bayName)}</td>
        <td>${escapeHtml(row.statusLabelRu)}</td>
        <td>${showPartsMetrics ? escapeHtml(String(row.pendingPartsCount ?? 0)) : "—"}</td>
        <td>${showPartsMetrics ? escapeHtml(row.oldestPendingPartsAgeLabel ?? "н/д") : "—"}</td>
        <td>${escapeHtml(row.blockedDurationLabel)}</td>
        <td class="money">${escapeHtml(row.balanceDueLabel)}</td>
        <td>${escapeHtml(row.nextActionLabel)}</td>
      </tr>
    `,
    )
    .join("\n");

  return `${headerRow}\n${bodyRows}`;
}

function renderUnifiedQueueRows(queues) {
  return [
    renderUnifiedQueueSectionRows("Ожидают диагностику", queues.waitingDiagnosis),
    renderUnifiedQueueSectionRows("Ожидают согласование", queues.waitingApproval),
    renderUnifiedQueueSectionRows("Ожидание запчастей", queues.waitingParts, { showPartsMetrics: true }),
    renderUnifiedQueueSectionRows("Пауза", queues.paused),
    renderUnifiedQueueSectionRows("Готово к выдаче", queues.readyPickup),
  ].join("\n");
}

function renderWeekHeaderCells(days) {
  return days
    .map(
      (day) => `
        <th class="week-day">${escapeHtml(day.dayLabel)}</th>
      `,
    )
    .join("\n");
}

function renderWeekRows(rows) {
  if (rows.length === 0) {
    return '<tr><td colspan="8">Нет данных</td></tr>';
  }

  return rows
    .map((row) => {
      const dayCells = row.days
        .map((day) => {
          const conflictLabel = day.slotConflicts > 0 ? ` · Дубль слота: ${day.slotConflicts}` : "";
          return `
            <td class="week-cell ${escapeHtml(day.status)}">
              <strong>${day.plannedCount}</strong>
              <div class="small week-cell-meta">${escapeHtml(day.statusLabel)}${escapeHtml(conflictLabel)}</div>
            </td>
          `;
        })
        .join("\n");

      return `
        <tr>
          <td class="week-resource">
            <strong>${escapeHtml(row.key)}</strong>
            <div class="small muted">План: ${row.totalPlanned} · Перегруз дней: ${row.overbookedCells}</div>
          </td>
          ${dayCells}
        </tr>
      `;
    })
    .join("\n");
}

function renderSearchCustomerRows(rows) {
  if (rows.length === 0) {
    return '<tr><td colspan="2">Нет совпадений</td></tr>';
  }

  return rows
    .map(
      (row) => `
      <tr>
        <td><strong>${escapeHtml(row.fullName)}</strong><div class="small muted">${escapeHtml(row.id)}</div></td>
        <td>${escapeHtml(row.phone)}</td>
      </tr>
    `,
    )
    .join("\n");
}

function renderSearchVehicleRows(rows) {
  if (rows.length === 0) {
    return '<tr><td colspan="4">Нет совпадений</td></tr>';
  }

  return rows
    .map(
      (row) => `
      <tr>
        <td><strong>${escapeHtml(row.label)}</strong><div class="small muted">${escapeHtml(row.customerName ?? "н/д")}</div></td>
        <td>${escapeHtml(row.plateNumber ?? "н/д")}</td>
        <td>${escapeHtml(row.vin ?? "н/д")}</td>
        <td>${escapeHtml(row.model ?? "н/д")}</td>
      </tr>
    `,
    )
    .join("\n");
}

function renderSearchAppointmentRows(rows) {
  if (rows.length === 0) {
    return '<tr><td colspan="4">Нет совпадений</td></tr>';
  }

  return rows
    .map(
      (row) => `
      <tr>
        <td><a href="${escapeHtml(row.detailHref)}">${escapeHtml(row.code)}</a></td>
        <td>${escapeHtml(row.plannedStartLocal)}</td>
        <td>${escapeHtml(row.customerName)}</td>
        <td>${escapeHtml(row.vehicleLabel)}</td>
      </tr>
    `,
    )
    .join("\n");
}

function renderSearchWorkOrderRows(rows) {
  if (rows.length === 0) {
    return '<tr><td colspan="4">Нет совпадений</td></tr>';
  }

  return rows
    .map(
      (row) => `
      <tr>
        <td><a href="${escapeHtml(row.detailHref)}">${escapeHtml(row.code)}</a></td>
        <td>${escapeHtml(row.statusLabelRu)}</td>
        <td>${escapeHtml(row.customerName)}</td>
        <td>${escapeHtml(row.vehicleLabel)}</td>
      </tr>
    `,
    )
    .join("\n");
}

export function renderDashboardPage(model) {
  const {
    service,
    summary,
    appointments,
    queues,
    load,
    week,
    reporting,
    search,
    actions,
    generatedAt,
  } = model;
  const title = `${service.displayNameRu} — Операционная доска`;
  const todayLabel = formatTodayDateLabel(generatedAt);
  const body = `
  <main class="page-shell dashboard-page">

    <section class="panel header">
      <div>
        <h1>${escapeHtml(service.displayNameRu)}</h1>
        <p class="muted">Город: ${escapeHtml(service.cityRu)} · Посты: ${escapeHtml(service.bays.length)} · Обновлено: ${escapeHtml(formatTimestamp(generatedAt))}</p>
      </div>
      <div class="action-bar">
        <a class="btn primary" href="${escapeHtml(actions.newAppointmentHref)}">Новая запись</a>
        <a class="btn" href="${escapeHtml(actions.openDispatchBoardHref ?? "/dispatch/board")}">Диспетчерская доска</a>
        <a class="btn" href="${escapeHtml(actions.openActiveQueueHref)}">Открыть активную очередь</a>
      </div>
    </section>

    <section class="panel">
      <h2>Быстрый поиск клиента и авто</h2>
      <form class="search-form" method="get" action="/">
        <input
          class="search-input"
          type="search"
          name="q"
          value="${escapeHtml(search.query)}"
          placeholder="Имя, телефон, номер, VIN, модель"
          autocomplete="off"
        />
        <button class="btn primary" type="submit">Найти</button>
        ${search.performed ? '<a class="btn" href="/">Сбросить</a>' : ""}
      </form>
      <p class="muted small">Поиск работает по клиенту, телефону, номеру авто, VIN и модели.</p>
      ${
        search.performed
          ? `
      <div class="triage-grid">
        <article class="triage-card">
          Всего совпадений
          <strong>${search.totals.all}</strong>
        </article>
        <article class="triage-card">
          Клиенты / авто
          <strong>${search.totals.customers} / ${search.totals.vehicles}</strong>
        </article>
        <article class="triage-card">
          Записи / заказ-наряды
          <strong>${search.totals.appointments} / ${search.totals.workOrders}</strong>
        </article>
        <article class="triage-card ${search.timing.withinBaseline ? "" : "warn"}">
          Время поиска
          <strong>${search.timing.durationMs} мс</strong>
          <div class="small">Цель: до ${search.timing.baselineMs} мс</div>
        </article>
      </div>
      ${
        search.totals.all === 0
          ? '<p class="muted small">По этому запросу совпадений не найдено.</p>'
          : `
      <div class="search-grid">
        <article class="search-panel">
          <h3>Клиенты (${search.customers.length}/${search.totals.customers})</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Клиент</th>
                  <th>Телефон</th>
                </tr>
              </thead>
              <tbody>
                ${renderSearchCustomerRows(search.customers)}
              </tbody>
            </table>
          </div>
        </article>
        <article class="search-panel">
          <h3>Авто (${search.vehicles.length}/${search.totals.vehicles})</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Авто / владелец</th>
                  <th>Номер</th>
                  <th>VIN</th>
                  <th>Модель</th>
                </tr>
              </thead>
              <tbody>
                ${renderSearchVehicleRows(search.vehicles)}
              </tbody>
            </table>
          </div>
        </article>
        <article class="search-panel">
          <h3>Записи (${search.appointments.length}/${search.totals.appointments})</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Время</th>
                  <th>Клиент</th>
                  <th>Авто</th>
                </tr>
              </thead>
              <tbody>
                ${renderSearchAppointmentRows(search.appointments)}
              </tbody>
            </table>
          </div>
        </article>
        <article class="search-panel">
          <h3>Заказ-наряды (${search.workOrders.length}/${search.totals.workOrders})</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Статус</th>
                  <th>Клиент</th>
                  <th>Авто</th>
                </tr>
              </thead>
              <tbody>
                ${renderSearchWorkOrderRows(search.workOrders)}
              </tbody>
            </table>
          </div>
        </article>
      </div>
      `
      }
      `
          : '<p class="muted small">Введите запрос, чтобы быстро найти клиента, авто, запись или заказ-наряд.</p>'
      }
    </section>

    <section class="panel">
      <h2>Диспетчер действий</h2>
      <div class="triage-grid">
        <article class="triage-card">
          Записи на сегодня
          <strong>${summary.appointmentsToday}</strong>
        </article>
        <article class="triage-card">
          Активные заказ-наряды
          <strong>${summary.activeWorkOrders}</strong>
        </article>
        <article class="triage-card">
          Ожидают диагностику
          <strong>${summary.waitingDiagnosisCount}</strong>
        </article>
        <article class="triage-card">
          Ожидают согласование
          <strong>${summary.waitingApprovalCount}</strong>
        </article>
        <article class="triage-card warn">
          Ожидают запчасти
          <strong>${summary.waitingPartsCount}</strong>
        </article>
        <article class="triage-card warn">
          На паузе
          <strong>${summary.pausedCount}</strong>
        </article>
        <article class="triage-card danger">
          Готово к выдаче, но не оплачено
          <strong>${summary.unpaidReadyForPickupCount}</strong>
          <div class="small">${escapeHtml(summary.unpaidReadyForPickupAmountLabel)}</div>
        </article>
        <article class="triage-card">
          Общая задолженность в активных
          <strong>${escapeHtml(summary.totalOutstandingActiveLabel)}</strong>
        </article>
        <article class="triage-card">
          Просроченные блокировки
          <strong>${summary.overdueItemsCount}</strong>
        </article>
      </div>
    </section>

    <section class="panel">
      <h2>Финансовый срез (месяц)</h2>
      <p class="muted small">Период: ${escapeHtml(reporting.period.dateFromLocal ?? "н/д")} → ${escapeHtml(reporting.period.dateToLocal ?? "н/д")}</p>
      <div class="triage-grid">
        <article class="triage-card">
          Завершенных заказ-нарядов
          <strong>${reporting.completedWorkOrdersCount}</strong>
        </article>
        <article class="triage-card">
          Выручка по работам
          <strong>${escapeHtml(reporting.laborRevenueLabel)}</strong>
        </article>
        <article class="triage-card">
          Выручка по запчастям
          <strong>${escapeHtml(reporting.partsRevenueLabel)}</strong>
        </article>
        <article class="triage-card">
          Общая выручка
          <strong>${escapeHtml(reporting.totalRevenueLabel)}</strong>
        </article>
        <article class="triage-card">
          Средний чек
          <strong>${escapeHtml(reporting.averageTicketLabel)}</strong>
        </article>
        <article class="triage-card">
          Валовая маржа
          <strong>${escapeHtml(reporting.grossMarginLabel)}</strong>
          <div class="small">Себестоимость: ${escapeHtml(reporting.partsCostLabel)} · Внешние услуги: ${escapeHtml(reporting.outsideServiceCostLabel)}</div>
        </article>
        <article class="triage-card danger">
          Открытые долги
          <strong>${reporting.openBalancesCount}</strong>
          <div class="small">${escapeHtml(reporting.openBalancesLabel)}</div>
        </article>
        <article class="triage-card ${reporting.waitingPartsCount > 0 ? "warn" : ""}">
          Ожидание запчастей
          <strong>${reporting.waitingPartsCount}</strong>
        </article>
      </div>
    </section>

    <section class="panel">
      <h2>План недели: загрузка и перегруз</h2>
      <p class="muted small">Перегруз отмечается при дубле слота или превышении целевой емкости.</p>
      <div class="triage-grid">
        <article class="triage-card ${week.summary.overbookedCellsByBay > 0 || week.summary.overbookedCellsByAssignee > 0 ? "danger" : ""}">
          Ячейки с перегрузом
          <strong>${week.summary.overbookedCellsByBay + week.summary.overbookedCellsByAssignee}</strong>
        </article>
        <article class="triage-card">
          Записей в окне 7 дней
          <strong>${week.summary.inWindowAppointmentsCount}</strong>
        </article>
        <article class="triage-card ${week.summary.unscheduledAppointmentsCount > 0 ? "warn" : ""}">
          Записи без даты недели
          <strong>${week.summary.unscheduledAppointmentsCount}</strong>
        </article>
      </div>
      <div class="legend">
        <span class="overbooked">Перегруз</span>
        <span class="high">Высокая загрузка</span>
        <span class="normal">Норма</span>
        <span class="underbooked">Недогруз</span>
      </div>
    </section>

    <section class="week-stack">
      <article class="panel">
        <h2>Неделя по постам</h2>
        <div class="week-table-wrap">
          <table class="week-table">
            <thead>
              <tr>
                <th>Пост</th>
                ${renderWeekHeaderCells(week.days)}
              </tr>
            </thead>
            <tbody>
              ${renderWeekRows(week.byBay)}
            </tbody>
          </table>
        </div>
      </article>

      <article class="panel">
        <h2>Неделя по сотрудникам</h2>
        <div class="week-table-wrap">
          <table class="week-table">
            <thead>
              <tr>
                <th>Сотрудник</th>
                ${renderWeekHeaderCells(week.days)}
              </tr>
            </thead>
            <tbody>
              ${renderWeekRows(week.byAssignee)}
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section class="split-grid">
      <article class="panel">
        <div class="panel-title-row">
          <h2>Нагрузка по постам (день)</h2>
          <span class="panel-date">${escapeHtml(todayLabel)}</span>
        </div>
        <div class="table-wrap load-table-wrap">
          <table class="load-table">
            <colgroup>
              <col class="load-col-label" />
              <col class="load-col-metric" />
              <col class="load-col-metric" />
              <col class="load-col-metric" />
            </colgroup>
            <thead>
              <tr>
                <th>Пост</th>
                <th>План</th>
                <th>Актив</th>
                <th>Блок</th>
              </tr>
            </thead>
            <tbody>
              ${renderLoadRows(load.byBay)}
            </tbody>
          </table>
        </div>
      </article>

      <article class="panel">
        <div class="panel-title-row">
          <h2>Нагрузка по сотрудникам (день)</h2>
          <span class="panel-date">${escapeHtml(todayLabel)}</span>
        </div>
        <div class="table-wrap load-table-wrap">
          <table class="load-table">
            <colgroup>
              <col class="load-col-label" />
              <col class="load-col-metric" />
              <col class="load-col-metric" />
              <col class="load-col-metric" />
            </colgroup>
            <thead>
              <tr>
                <th>Сотрудник</th>
                <th>План</th>
                <th>Актив</th>
                <th>Блок</th>
              </tr>
            </thead>
            <tbody>
              ${renderLoadRows(load.byAssignee)}
            </tbody>
          </table>
        </div>
      </article>
    </section>

    <section class="panel">
      <h2>Запланированные записи</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Код</th>
              <th>Время</th>
              <th>Клиент</th>
              <th>Авто</th>
              <th>Пост</th>
              <th>Ответственный</th>
            </tr>
          </thead>
          <tbody>
            ${renderAppointmentRows(appointments)}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel queue-table queue-unified-table">
      <h2>Операционные очереди заказ-нарядов</h2>
      <p class="muted small">Единая таблица очередей с подразделами по статусу.</p>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Код</th>
              <th>Клиент</th>
              <th>Авто</th>
              <th>Пост</th>
              <th>Статус</th>
              <th>Позиции</th>
              <th>Возраст запроса</th>
              <th>Блокировка</th>
              <th>Долг</th>
              <th>Следующий шаг</th>
            </tr>
          </thead>
          <tbody>
            ${renderUnifiedQueueRows(queues)}
          </tbody>
        </table>
      </div>
    </section>
  </main>
`;

  return renderDocumentShell({
    title,
    bodyClass: "dashboard-page",
    body,
  });
}

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

function renderQueueRows(rows) {
  if (rows.length === 0) {
    return '<tr><td colspan="8">Нет записей</td></tr>';
  }

  return rows
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
        <td>${escapeHtml(row.blockedDurationLabel)}</td>
        <td class="money">${escapeHtml(row.balanceDueLabel)}</td>
        <td>${escapeHtml(row.nextActionLabel)}</td>
      </tr>
    `,
    )
    .join("\n");
}

function renderWaitingPartsQueueRows(rows) {
  if (rows.length === 0) {
    return '<tr><td colspan="10">Нет записей</td></tr>';
  }

  return rows
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
        <td>${escapeHtml(String(row.pendingPartsCount ?? 0))}</td>
        <td>${escapeHtml(row.oldestPendingPartsAgeLabel ?? "н/д")}</td>
        <td>${escapeHtml(row.blockedDurationLabel)}</td>
        <td class="money">${escapeHtml(row.balanceDueLabel)}</td>
        <td>${escapeHtml(row.nextActionLabel)}</td>
      </tr>
    `,
    )
    .join("\n");
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
              <div class="small">${escapeHtml(day.statusLabel)}${escapeHtml(conflictLabel)}</div>
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
  const { service, summary, appointments, queues, load, week, search, actions, generatedAt } = model;

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(service.displayNameRu)} — Операционная доска</title>
  <style>
    :root {
      --bg: #f4f7f3;
      --surface: #ffffff;
      --ink: #1d2c22;
      --muted: #5b6d61;
      --accent: #1f7a55;
      --accent-soft: #d9efe3;
      --line: #d3ddd4;
      --warn-bg: #fff2dc;
      --warn-ink: #8f5e00;
      --danger-bg: #f9e6de;
      --danger-ink: #9a4020;
      --money: #8a2d17;
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
      max-width: 1180px;
      margin: 0 auto;
      padding: 20px;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 14px;
    }

    .panel {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 14px;
      min-width: 0;
    }

    .header {
      display: grid;
      gap: 10px;
    }

    h1, h2, h3 {
      margin: 0;
    }

    h1 { font-size: 1.45rem; }
    h2 { font-size: 1.05rem; margin-bottom: 10px; }
    h3 { font-size: 0.95rem; margin-bottom: 8px; }

    .muted { color: var(--muted); }
    .small { font-size: 0.82rem; }

    .action-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .search-form {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 6px;
    }

    .search-input {
      flex: 1;
      min-width: 240px;
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 8px 12px;
      font: inherit;
      background: #fff;
      color: var(--ink);
    }

    .search-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-top: 10px;
    }

    .search-panel {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px;
      background: #fbfcfa;
    }

    .btn {
      text-decoration: none;
      border-radius: 999px;
      border: 1px solid var(--line);
      padding: 6px 12px;
      font-size: 0.87rem;
      color: var(--ink);
      background: #fbfcfa;
    }

    .btn.primary {
      background: var(--accent);
      color: #fff;
      border-color: var(--accent);
    }

    .triage-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 10px;
    }

    .triage-card {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px;
      background: #fbfcfa;
    }

    .triage-card.warn {
      background: var(--warn-bg);
      border-color: #e6cc99;
      color: var(--warn-ink);
    }

    .triage-card.danger {
      background: var(--danger-bg);
      border-color: #e4b8a8;
      color: var(--danger-ink);
    }

    .triage-card strong {
      display: block;
      font-size: 1.35rem;
      margin-top: 4px;
    }

    .split-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }

    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--line);
      border-radius: 10px;
    }

    table {
      width: 100%;
      min-width: 640px;
      border-collapse: collapse;
      font-size: 0.9rem;
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

    td a {
      color: var(--accent);
      text-decoration: none;
      font-weight: 600;
    }

    .week-table {
      min-width: 780px;
    }

    .week-day {
      text-align: center;
      white-space: nowrap;
    }

    .week-resource {
      min-width: 180px;
    }

    .week-cell {
      text-align: center;
      font-variant-numeric: tabular-nums;
      border-left: 1px solid var(--line);
    }

    .week-cell strong {
      display: block;
      font-size: 1rem;
      margin-bottom: 2px;
    }

    .week-cell.overbooked {
      background: var(--danger-bg);
      color: var(--danger-ink);
    }

    .week-cell.high {
      background: var(--warn-bg);
      color: var(--warn-ink);
    }

    .week-cell.normal {
      background: var(--accent-soft);
      color: var(--ink);
    }

    .week-cell.underbooked {
      background: #f1f4f1;
      color: #546357;
    }

    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 8px;
      color: var(--muted);
      font-size: 0.8rem;
    }

    .legend span {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 3px 8px;
      background: #f8fbf8;
    }

    .legend .overbooked {
      border-color: #e4b8a8;
      background: var(--danger-bg);
      color: var(--danger-ink);
    }

    .legend .high {
      border-color: #e6cc99;
      background: var(--warn-bg);
      color: var(--warn-ink);
    }

    .legend .normal {
      border-color: #b5d5c4;
      background: var(--accent-soft);
      color: var(--ink);
    }

    .legend .underbooked {
      border-color: #d5ddd7;
      background: #f1f4f1;
      color: #546357;
    }

    .money {
      font-weight: 600;
      color: var(--money);
    }

    @media (max-width: 900px) {
      .wrap { padding: 12px; }
      .split-grid { grid-template-columns: 1fr; }
      .search-grid { grid-template-columns: 1fr; }
      table { min-width: 560px; }
    }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="panel header">
      <div>
        <h1>${escapeHtml(service.displayNameRu)}</h1>
        <p class="muted">Город: ${escapeHtml(service.cityRu)} · Посты: ${escapeHtml(service.bays.length)} · Обновлено: ${escapeHtml(formatTimestamp(generatedAt))}</p>
      </div>
      <div class="action-bar">
        <a class="btn primary" href="${escapeHtml(actions.newAppointmentHref)}">Новая запись</a>
        <a class="btn" href="${escapeHtml(actions.newWalkInHref)}">Принять walk-in</a>
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

    <section class="split-grid">
      <article class="panel">
        <h2>Неделя по постам</h2>
        <div class="table-wrap">
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
        <div class="table-wrap">
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
        <h2>Нагрузка по постам (день)</h2>
        <div class="table-wrap">
          <table>
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
        <h2>Нагрузка по сотрудникам</h2>
        <div class="table-wrap">
          <table>
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

    <section class="panel">
      <h2>Очередь: ожидают диагностику</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Код</th>
              <th>Клиент</th>
              <th>Авто</th>
              <th>Пост</th>
              <th>Статус</th>
              <th>Блокировка</th>
              <th>Долг</th>
              <th>Следующий шаг</th>
            </tr>
          </thead>
          <tbody>
            ${renderQueueRows(queues.waitingDiagnosis)}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h2>Очередь: ожидают согласование</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Код</th>
              <th>Клиент</th>
              <th>Авто</th>
              <th>Пост</th>
              <th>Статус</th>
              <th>Блокировка</th>
              <th>Долг</th>
              <th>Следующий шаг</th>
            </tr>
          </thead>
          <tbody>
            ${renderQueueRows(queues.waitingApproval)}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h2>Очередь: ожидание запчастей</h2>
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
            ${renderWaitingPartsQueueRows(queues.waitingParts)}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h2>Очередь: пауза</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Код</th>
              <th>Клиент</th>
              <th>Авто</th>
              <th>Пост</th>
              <th>Статус</th>
              <th>Блокировка</th>
              <th>Долг</th>
              <th>Следующий шаг</th>
            </tr>
          </thead>
          <tbody>
            ${renderQueueRows(queues.paused)}
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <h2>Очередь: готово к выдаче</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Код</th>
              <th>Клиент</th>
              <th>Авто</th>
              <th>Пост</th>
              <th>Статус</th>
              <th>Блокировка</th>
              <th>Долг</th>
              <th>Следующий шаг</th>
            </tr>
          </thead>
          <tbody>
            ${renderQueueRows(queues.readyPickup)}
          </tbody>
        </table>
      </div>
    </section>
  </main>
</body>
</html>`;
}

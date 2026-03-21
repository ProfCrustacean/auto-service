function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderWorkOrderRows(rows) {
  if (rows.length === 0) {
    return '<tr><td colspan="5">Нет записей</td></tr>';
  }

  return rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.code)}</td>
        <td>${escapeHtml(row.customerName)}</td>
        <td>${escapeHtml(row.vehicleLabel)}</td>
        <td>${escapeHtml(row.statusLabelRu)}</td>
        <td>${escapeHtml(row.primaryAssignee)}</td>
      </tr>
    `,
    )
    .join("\n");
}

function renderAppointmentRows(rows) {
  if (rows.length === 0) {
    return '<tr><td colspan="5">Нет записей</td></tr>';
  }

  return rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.code)}</td>
        <td>${escapeHtml(row.plannedStartLocal)}</td>
        <td>${escapeHtml(row.customerName)}</td>
        <td>${escapeHtml(row.vehicleLabel)}</td>
        <td>${escapeHtml(row.bayName)}</td>
      </tr>
    `,
    )
    .join("\n");
}

export function renderDashboardPage(model) {
  const { service, summary, appointments, queues } = model;

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(service.displayNameRu)} — Операционная доска</title>
  <style>
    :root {
      --bg: #f7f8f5;
      --surface: #ffffff;
      --ink: #1f2a1f;
      --muted: #5d6c5f;
      --accent: #2f7d5a;
      --accent-soft: #dff1e8;
      --line: #d8dfd9;
      --danger: #a14a2d;
      --warn: #9a6b00;
      --font: "Manrope", "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: var(--font);
      background: radial-gradient(circle at top right, #edf7f1, var(--bg));
      color: var(--ink);
    }
    .wrap {
      max-width: 1080px;
      margin: 0 auto;
      padding: 20px;
      display: grid;
      gap: 16px;
    }
    .panel {
      background: var(--surface);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 14px;
    }
    h1, h2 {
      margin: 0 0 8px;
    }
    h1 { font-size: 1.4rem; }
    h2 { font-size: 1.1rem; }
    .muted { color: var(--muted); font-size: 0.9rem; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
    }
    .kpi {
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 10px;
      background: #fcfdfb;
    }
    .kpi strong {
      display: block;
      font-size: 1.4rem;
      color: var(--accent);
      margin-top: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92rem;
    }
    th, td {
      border-top: 1px solid var(--line);
      text-align: left;
      padding: 8px 6px;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-weight: 600;
      border-top: none;
    }
    .queue-tags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 8px;
    }
    .tag {
      border-radius: 999px;
      padding: 4px 10px;
      font-size: 0.82rem;
      border: 1px solid transparent;
    }
    .tag.wait { background: #fff4df; border-color: #e8d2a0; color: var(--warn); }
    .tag.ready { background: #f6e8e3; border-color: #e6c0b3; color: var(--danger); }
    .tag.active { background: var(--accent-soft); border-color: #b8dec9; color: var(--accent); }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="panel">
      <h1>${escapeHtml(service.displayNameRu)}</h1>
      <p class="muted">Город: ${escapeHtml(service.cityRu)} · Посты: ${escapeHtml(service.bays.length)} · Язык интерфейса: только русский</p>
      <div class="kpi-grid">
        <article class="kpi">Записи на сегодня<strong>${summary.appointmentsToday}</strong></article>
        <article class="kpi">Активные заказ-наряды<strong>${summary.activeWorkOrders}</strong></article>
        <article class="kpi">Ожидают запчасти<strong>${summary.waitingPartsCount}</strong></article>
        <article class="kpi">Готовы к выдаче<strong>${summary.readyForPickupCount}</strong></article>
      </div>
      <div class="queue-tags">
        <span class="tag wait">Очередь: ожидание запчастей</span>
        <span class="tag ready">Очередь: готово к выдаче</span>
        <span class="tag active">Очередь: активные работы</span>
      </div>
    </section>

    <section class="panel">
      <h2>Запланированные записи</h2>
      <table>
        <thead>
          <tr>
            <th>Код</th>
            <th>Время</th>
            <th>Клиент</th>
            <th>Авто</th>
            <th>Пост</th>
          </tr>
        </thead>
        <tbody>
          ${renderAppointmentRows(appointments)}
        </tbody>
      </table>
    </section>

    <section class="panel">
      <h2>Ожидание запчастей</h2>
      <table>
        <thead>
          <tr>
            <th>Код</th>
            <th>Клиент</th>
            <th>Авто</th>
            <th>Статус</th>
            <th>Ответственный</th>
          </tr>
        </thead>
        <tbody>
          ${renderWorkOrderRows(queues.waitingParts)}
        </tbody>
      </table>
    </section>

    <section class="panel">
      <h2>Готово к выдаче</h2>
      <table>
        <thead>
          <tr>
            <th>Код</th>
            <th>Клиент</th>
            <th>Авто</th>
            <th>Статус</th>
            <th>Ответственный</th>
          </tr>
        </thead>
        <tbody>
          ${renderWorkOrderRows(queues.readyPickup)}
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
}

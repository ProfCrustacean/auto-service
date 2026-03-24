import { escapeHtml } from "./pageFormShared.js";
import { DISPATCH_BOARD_PAGE_STYLES } from "./dispatchBoardPageStyles.js";
import { DISPATCH_BOARD_PAGE_CLIENT_SCRIPT } from "./dispatchBoardPageClient.js";

function renderQueueItem(item, kind) {
  const statusLabel = kind === "walkin"
    ? item.statusLabelRu
    : `${item.plannedStartLocal} · ${item.status}`;
  const durationMin = Number.isInteger(item.expectedDurationMin) ? item.expectedDurationMin : 60;

  return `<li
    class="queue-item"
    draggable="true"
    data-queue-kind="${escapeHtml(kind)}"
    data-item-id="${escapeHtml(item.id)}"
    data-code="${escapeHtml(item.code)}"
    data-customer-name="${escapeHtml(item.customerName)}"
    data-vehicle-label="${escapeHtml(item.vehicleLabel)}"
    data-duration-min="${escapeHtml(String(durationMin))}"
  >
    <div class="queue-head">
      <strong>${escapeHtml(item.code)}</strong>
      <span>${escapeHtml(statusLabel)}</span>
    </div>
    <div class="queue-text">${escapeHtml(item.customerName)} · ${escapeHtml(item.vehicleLabel)}</div>
  </li>`;
}

function renderQueueList(items, kind) {
  if (items.length === 0) {
    return '<li class="queue-empty">Нет элементов</li>';
  }
  return items.map((item) => renderQueueItem(item, kind)).join("");
}

function renderQueuePanel(model) {
  return `<aside class="queue-panel">
    <section class="queue-block">
      <header>
        <h2>Очередь переносов</h2>
        <p>Перетащите карточку на календарь, чтобы назначить слот и ленту.</p>
      </header>
      <ul class="queue-list" id="dispatch-queue-appointments">
        ${renderQueueList(model.queues.unscheduledAppointments, "appointment")}
      </ul>
    </section>

    <section class="queue-block">
      <header>
        <h2>Приемы без записи без слота</h2>
        <p>Перетащите карточку на календарь, чтобы создать запись в выбранной ленте и времени.</p>
      </header>
      <ul class="queue-list" id="dispatch-queue-walkin">
        ${renderQueueList(model.queues.walkIn, "walkin")}
      </ul>
    </section>
  </aside>`;
}

function renderModeHref(mode, dayLocal) {
  return `/dispatch/board?day=${encodeURIComponent(dayLocal)}&laneMode=${encodeURIComponent(mode)}`;
}

function renderDayHref(dayLocal, offsetDays, laneMode) {
  const date = new Date(`${dayLocal}T00:00:00`);
  date.setDate(date.getDate() + offsetDays);
  const next = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `/dispatch/board?day=${encodeURIComponent(next)}&laneMode=${encodeURIComponent(laneMode)}`;
}

function renderShell(model) {
  return `<div class="topbar">
    <div class="title-cluster">
      <a class="btn ghost" href="${escapeHtml(model.actions.backHref)}">← Назад на доску</a>
      <h1>Диспетчерская доска</h1>
      <p class="subtitle">Календарный режим управления загрузкой: изменяйте слот и длительность только перетаскиванием в календаре.</p>
    </div>
    <div class="controls">
      <a class="btn" href="${escapeHtml(renderDayHref(model.dayLocal, -1, model.laneMode))}">← Предыдущий день</a>
      <span class="day-chip" id="dispatch-day-chip">${escapeHtml(model.dayLocal)}</span>
      <a class="btn" href="${escapeHtml(renderDayHref(model.dayLocal, 1, model.laneMode))}">Следующий день →</a>
      <a class="mode-btn ${model.laneMode === "bay" ? "active" : ""}" href="${escapeHtml(renderModeHref("bay", model.dayLocal))}">Посты</a>
      <a class="mode-btn ${model.laneMode === "technician" ? "active" : ""}" href="${escapeHtml(renderModeHref("technician", model.dayLocal))}">Ответственные</a>
      <a class="btn accent" href="${escapeHtml(model.actions.createAppointmentHref)}">Новая запись</a>
    </div>
  </div>`;
}

function renderRangeLabel(calendarModel) {
  return `${calendarModel.slotMinTime.slice(0, 5)}–${calendarModel.slotMaxTime.slice(0, 5)}, шаг ${calendarModel.slotDuration.slice(3, 5)} мин`;
}

export function renderDispatchBoardPageTemplate(model) {
  const pageModelJson = JSON.stringify(model).replaceAll("</script", "<\\/script");
  const rangeLabel = renderRangeLabel(model.calendar);

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Диспетчерская доска</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@event-calendar/build@5.5.1/dist/event-calendar.min.css" />
    <style>
${DISPATCH_BOARD_PAGE_STYLES}
    </style>
  </head>
  <body>
    <main class="shell">
      ${renderShell(model)}
      <section class="layout">
        ${renderQueuePanel(model)}
        <section class="board-frame">
          <div class="board-head">
            <div>
              <h2>Календарная загрузка лент</h2>
              <p>Перетаскивайте карточки внутри календаря и переносите карточки из очереди прямо в нужный слот.</p>
            </div>
            <div class="board-range" id="dispatch-board-range">${escapeHtml(rangeLabel)}</div>
          </div>
          <div id="dispatch-calendar" class="calendar-host" aria-label="Календарная доска"></div>
        </section>
      </section>
    </main>

    <div id="dispatch-toast" class="toast" role="status" aria-live="polite">
      <div class="toast-inner">
        <span id="dispatch-toast-text"></span>
        <button id="dispatch-toast-close" class="toast-close" type="button" aria-label="Закрыть уведомление">×</button>
      </div>
    </div>
    <script id="dispatch-board-model" type="application/json">${pageModelJson}</script>
    <script src="https://cdn.jsdelivr.net/npm/@event-calendar/build@5.5.1/dist/event-calendar.min.js"></script>
    <script>
${DISPATCH_BOARD_PAGE_CLIENT_SCRIPT}
    </script>
  </body>
</html>`;
}

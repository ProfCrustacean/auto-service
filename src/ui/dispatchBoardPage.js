import { escapeHtml } from "./pageFormShared.js";

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

export function renderDispatchBoardPage(model) {
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
      :root {
        --bg: #e9f0ea;
        --panel: #f8fbf8;
        --surface: #ffffff;
        --ink: #1f2f28;
        --ink-soft: #51675b;
        --line: #c4d4c8;
        --accent: #117a48;
        --danger-soft: #fee8e2;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        background:
          radial-gradient(circle at 15% 10%, #f6faf6 0%, transparent 45%),
          radial-gradient(circle at 80% 0%, #dce7de 0%, transparent 52%),
          var(--bg);
        color: var(--ink);
        font-family: "Manrope", "IBM Plex Sans", "Segoe UI", sans-serif;
      }

      .shell {
        max-width: 1440px;
        margin: 0 auto;
        padding: 20px 16px 32px;
      }

      .topbar {
        display: grid;
        gap: 14px;
      }

      .title-cluster h1 {
        margin: 6px 0 0;
        font-size: clamp(1.6rem, 2.6vw, 2.25rem);
      }

      .subtitle {
        margin: 8px 0 0;
        color: var(--ink-soft);
        max-width: 880px;
      }

      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }

      .day-chip {
        padding: 7px 12px;
        border: 1px solid var(--line);
        background: var(--surface);
        border-radius: 999px;
        font-weight: 700;
      }

      .btn,
      .mode-btn {
        border: 1px solid var(--line);
        background: var(--surface);
        color: var(--ink);
        border-radius: 999px;
        font-weight: 700;
        font-size: 0.9rem;
        line-height: 1;
        padding: 9px 13px;
        text-decoration: none;
        cursor: pointer;
      }

      .btn.accent {
        border-color: var(--accent);
        background: var(--accent);
        color: #fff;
      }

      .btn.ghost {
        background: transparent;
      }

      .mode-btn.active {
        border-color: var(--accent);
        background: var(--accent);
        color: #fff;
      }

      .layout {
        margin-top: 14px;
        display: grid;
        gap: 12px;
        grid-template-columns: 330px minmax(0, 1fr);
      }

      .queue-panel {
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 14px;
        padding: 12px;
        display: grid;
        gap: 12px;
        align-content: start;
      }

      .queue-block header h2 {
        margin: 0;
        font-size: 1.05rem;
      }

      .queue-block header p {
        margin: 4px 0 8px;
        color: var(--ink-soft);
        font-size: 0.86rem;
      }

      .queue-list {
        margin: 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 8px;
      }

      .queue-item {
        border: 1px solid var(--line);
        background: #fff;
        border-radius: 10px;
        padding: 10px;
        display: grid;
        gap: 8px;
        cursor: grab;
      }

      .queue-item.is-dragging {
        opacity: 0.6;
      }

      .queue-head {
        display: flex;
        gap: 8px;
        justify-content: space-between;
        align-items: baseline;
      }

      .queue-head strong {
        color: #156f44;
        font-size: 0.92rem;
      }

      .queue-head span {
        color: var(--ink-soft);
        font-size: 0.79rem;
      }

      .queue-text {
        font-size: 0.88rem;
      }

      .queue-empty {
        color: var(--ink-soft);
        font-size: 0.88rem;
        padding: 2px 0 0;
      }

      .board-frame {
        border: 1px solid var(--line);
        border-radius: 14px;
        background: var(--panel);
        padding: 12px;
      }

      .board-head {
        display: flex;
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }

      .board-head h2 {
        margin: 0;
        font-size: 1.1rem;
      }

      .board-head p {
        margin: 2px 0 0;
        color: var(--ink-soft);
        font-size: 0.86rem;
      }

      .board-range {
        padding: 6px 10px;
        border: 1px solid var(--line);
        border-radius: 999px;
        background: #fff;
        font-size: 0.83rem;
        font-weight: 700;
      }

      .calendar-host {
        border: 1px solid var(--line);
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
        min-height: 640px;
      }

      .calendar-host.drop-active {
        box-shadow: inset 0 0 0 2px rgba(17, 122, 72, 0.25);
      }

      .toast {
        position: fixed;
        right: 14px;
        bottom: 14px;
        max-width: 420px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fff;
        box-shadow: 0 10px 24px rgba(23, 47, 33, 0.16);
        font-size: 0.88rem;
        display: none;
        overflow: hidden;
      }

      .toast.show { display: block; }

      .toast-inner {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
      }

      .toast-close {
        border: 0;
        background: transparent;
        color: #53675c;
        font-size: 1rem;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
      }

      .toast.error {
        border-color: #dfb1a7;
        background: var(--danger-soft);
      }

      .toast.warning {
        border-color: #e3ca9f;
        background: #fff6e4;
      }

      .ec {
        border: 0;
        font-family: "Manrope", "IBM Plex Sans", "Segoe UI", sans-serif;
        --ec-event-text-color: #173026;
      }

      .ec .ec-event {
        color: #173026;
        border-width: 1px;
        border-style: solid;
        border-radius: 8px;
        box-shadow: 0 1px 2px rgba(15, 33, 25, 0.14);
        min-height: 42px;
      }

      .ec .ec-event-body {
        padding: 6px 8px;
      }

      .ec .ec-event *,
      .ec .ec-event .dispatch-event-line {
        color: #173026 !important;
        text-shadow: none;
      }

      .ec .ec-event-time,
      .ec .ec-event-title,
      .ec-event,
      .ec-event * {
        color: #173026 !important;
      }

      .ec-dragging .ec-event,
      .ec-resizing-y .ec-event,
      .ec-resizing-x .ec-event,
      .ec-dragging .ec-event *,
      .ec-resizing-y .ec-event *,
      .ec-resizing-x .ec-event * {
        color: #173026 !important;
      }

      .dispatch-event-content {
        display: grid;
        gap: 3px;
      }

      .dispatch-event-line {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .dispatch-event-line.primary {
        font-size: 0.8rem;
        font-weight: 800;
        letter-spacing: 0.01em;
        line-height: 1.2;
      }

      .dispatch-event-line.secondary {
        font-size: 0.88rem;
        font-weight: 700;
        line-height: 1.2;
      }

      .ec-event.status-confirmed,
      .ec-event.status-arrived {
        border-color: #77b18e;
        background: #e5f6eb;
      }

      .ec-event.status-booked {
        border-color: #7ea8c2;
        background: #e3edf7;
      }

      .ec-event.status-no-show,
      .ec-event.status-cancelled {
        border-color: #d5a7a0;
        background: #fce8e4;
      }

      .ec-event.status-overlap {
        border-color: #c48227;
        background: #fff4de;
      }

      .ec .ec-event.status-overlap {
        box-shadow: inset 3px 0 0 #c48227, 0 1px 2px rgba(15, 33, 25, 0.14);
      }

      .ec-resource {
        font-size: 0.9rem;
        font-weight: 700;
      }

      .ec-time,
      .ec-header {
        color: #64796d;
      }

      @media (max-width: 1180px) {
        .layout { grid-template-columns: 1fr; }
      }

      @media (max-width: 720px) {
        .shell { padding: 12px 10px 20px; }
        .controls { gap: 6px; }
        .btn, .mode-btn {
          font-size: 0.82rem;
          padding: 8px 10px;
        }
      }
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
      (() => {
        const toast = document.getElementById("dispatch-toast");
        const toastText = document.getElementById("dispatch-toast-text");
        const toastClose = document.getElementById("dispatch-toast-close");
        const calendarHost = document.getElementById("dispatch-calendar");
        const queueAppointments = document.getElementById("dispatch-queue-appointments");
        const queueWalkIn = document.getElementById("dispatch-queue-walkin");
        const dayChip = document.getElementById("dispatch-day-chip");
        const boardRange = document.getElementById("dispatch-board-range");
        const modelElement = document.getElementById("dispatch-board-model");
        let model = JSON.parse(modelElement.textContent);
        let calendar = null;
        let draggedQueuePayload = null;
        let pointerDragState = null;
        let nativeDragInProgress = false;
        let nativeDragMarkerAt = 0;
        let queueMutationInFlight = false;
        const pendingEventMutationIds = new Set();
        let recentHtmlDropAt = 0;
        let toastTimeout = null;

        function hideToast() {
          toast.className = "toast";
          if (toastTimeout) {
            window.clearTimeout(toastTimeout);
            toastTimeout = null;
          }
        }

        function showToast(message, kind = "ok") {
          if (toastText) {
            toastText.textContent = message;
          } else {
            toast.textContent = message;
          }
          toast.className = "toast show";
          if (kind === "error") {
            toast.classList.add("error");
          } else if (kind === "warning") {
            toast.classList.add("warning");
          }

          if (toastTimeout) {
            window.clearTimeout(toastTimeout);
          }
          const timeoutMs = kind === "error" ? 8000 : 3200;
          toastTimeout = window.setTimeout(() => {
            hideToast();
          }, timeoutMs);
        }

        function escapeText(value) {
          return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
        }

        function formatLocalDateTime(date) {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, "0");
          const day = String(date.getDate()).padStart(2, "0");
          const hour = String(date.getHours()).padStart(2, "0");
          const minute = String(date.getMinutes()).padStart(2, "0");
          return year + "-" + month + "-" + day + " " + hour + ":" + minute;
        }

        function parseErrorMessage(payload, fallback) {
          const errors = payload?.error?.details;
          if (Array.isArray(errors) && errors.length > 0) {
            const first = errors[0];
            if (first && typeof first.message === "string" && first.message.trim().length > 0) {
              return first.message;
            }
          }
          return fallback;
        }

        function parseWarningMessage(payload) {
          const warnings = payload?.warnings;
          if (!Array.isArray(warnings) || warnings.length === 0) {
            return null;
          }
          const first = warnings[0];
          if (first && typeof first.message === "string" && first.message.trim().length > 0) {
            return first.message;
          }
          return "Назначено с пересечением загрузки";
        }

        function parseTimeToMinutes(value, fallback) {
          const match = /^(\d{2}):(\d{2})/u.exec(String(value ?? ""));
          if (!match) {
            return fallback;
          }
          const hour = Number.parseInt(match[1], 10);
          const minute = Number.parseInt(match[2], 10);
          if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
            return fallback;
          }
          return (hour * 60) + minute;
        }

        function laneLabelById(resourceId) {
          const resource = (model.resources ?? []).find((entry) => entry.id === resourceId);
          return resource?.title ?? "Лента";
        }

        function formatTimeLabel(date) {
          if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return "--:--";
          }
          return String(date.getHours()).padStart(2, "0") + ":" + String(date.getMinutes()).padStart(2, "0");
        }

        function isPointInsideCalendar(clientX, clientY) {
          const rect = calendarHost.getBoundingClientRect();
          return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
        }

        function buildDropFallbackTarget(event) {
          const resources = Array.isArray(model.resources) ? model.resources : [];
          if (resources.length === 0) {
            return null;
          }
          const rect = calendarHost.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) {
            return null;
          }

          const slotMinMinute = parseTimeToMinutes(model.calendar.slotMinTime, 8 * 60);
          const slotMaxMinute = parseTimeToMinutes(model.calendar.slotMaxTime, 20 * 60);
          const stepMinute = Math.max(5, parseTimeToMinutes(model.calendar.snapDuration, 15));
          const totalRange = Math.max(stepMinute, slotMaxMinute - slotMinMinute);

          const relativeY = Math.min(rect.height, Math.max(0, event.clientY - rect.top));
          const minuteFloat = slotMinMinute + ((relativeY / rect.height) * totalRange);
          const snappedMinute = Math.round(minuteFloat / stepMinute) * stepMinute;
          const minuteOfDay = Math.max(slotMinMinute, Math.min(slotMaxMinute - stepMinute, snappedMinute));

          const relativeX = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
          const resourceIndex = Math.max(
            0,
            Math.min(resources.length - 1, Math.floor((relativeX / rect.width) * resources.length)),
          );
          const resource = resources[resourceIndex];
          if (!resource) {
            return null;
          }

          const date = new Date(model.dayLocal + "T00:00:00");
          date.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);

          return {
            date,
            resource: { id: resource.id },
          };
        }

        function resolveDropTargetInfo(event) {
          if (calendar && typeof calendar.dateFromPoint === "function") {
            const direct = calendar.dateFromPoint(event.clientX, event.clientY);
            if (direct?.date && direct?.resource?.id) {
              return direct;
            }
          }
          return buildDropFallbackTarget(event);
        }

        function parseTransferPayload(event) {
          const transfer = event?.dataTransfer;
          if (!transfer) {
            return null;
          }

          const rawJson = transfer.getData("application/x-auto-service-queue");
          if (rawJson) {
            try {
              const parsed = JSON.parse(rawJson);
              if (parsed?.kind && parsed?.id) {
                return {
                  kind: parsed.kind,
                  id: parsed.id,
                  code: parsed.code ?? "",
                  customerName: parsed.customerName ?? "",
                  vehicleLabel: parsed.vehicleLabel ?? "",
                  durationMin: Number.parseInt(parsed.durationMin, 10) || 60,
                };
              }
            } catch {
              // fall through to text/plain strategy
            }
          }

          const token = transfer.getData("text/plain");
          if (!token || !token.includes(":")) {
            return null;
          }

          const [kind, id] = token.split(":");
          if (!kind || !id) {
            return null;
          }
          const node = [...document.querySelectorAll(".queue-item")]
            .find((entry) => entry.dataset.queueKind === kind && entry.dataset.itemId === id);
          if (!node) {
            return null;
          }

          return {
            kind,
            id,
            code: node.dataset.code ?? "",
            customerName: node.dataset.customerName ?? "",
            vehicleLabel: node.dataset.vehicleLabel ?? "",
            durationMin: Number.parseInt(node.dataset.durationMin, 10) || 60,
          };
        }

        function rangeLabel(calendarModel) {
          return calendarModel.slotMinTime.slice(0, 5)
            + "–"
            + calendarModel.slotMaxTime.slice(0, 5)
            + ", шаг "
            + calendarModel.slotDuration.slice(3, 5)
            + " мин";
        }

        function toCalendarResource(entry) {
          return {
            id: entry.id,
            title: entry.title,
            extendedProps: entry.extendedProps ?? {},
          };
        }

        function toCalendarEvent(entry) {
          return {
            id: entry.id,
            start: entry.start,
            end: entry.end,
            resourceId: entry.resourceId,
            title: entry.title,
            classNames: entry.classNames ?? [],
            extendedProps: entry.extendedProps ?? {},
          };
        }

        function queueItemMarkup(item, kind) {
          const statusLabel = kind === "walkin"
            ? item.statusLabelRu
            : item.plannedStartLocal + " · " + item.status;
          const durationMin = Number.isInteger(item.expectedDurationMin) ? item.expectedDurationMin : 60;
          return "<li class='queue-item' draggable='true'"
            + " data-queue-kind='" + escapeText(kind) + "'"
            + " data-item-id='" + escapeText(item.id) + "'"
            + " data-code='" + escapeText(item.code) + "'"
            + " data-customer-name='" + escapeText(item.customerName) + "'"
            + " data-vehicle-label='" + escapeText(item.vehicleLabel) + "'"
            + " data-duration-min='" + escapeText(String(durationMin)) + "'>"
            + "<div class='queue-head'>"
            + "<strong>" + escapeText(item.code) + "</strong>"
            + "<span>" + escapeText(statusLabel) + "</span>"
            + "</div>"
            + "<div class='queue-text'>" + escapeText(item.customerName + " · " + item.vehicleLabel) + "</div>"
            + "</li>";
        }

        function renderQueueList(items, kind, target) {
          if (!target) {
            return;
          }
          if (!Array.isArray(items) || items.length === 0) {
            target.innerHTML = "<li class='queue-empty'>Нет элементов</li>";
            return;
          }
          target.innerHTML = items.map((item) => queueItemMarkup(item, kind)).join("");
        }

        function bindQueueDragHandlers() {
          document.querySelectorAll(".queue-item").forEach((itemNode) => {
            itemNode.addEventListener("dragstart", (event) => {
              nativeDragInProgress = true;
              nativeDragMarkerAt = Date.now();
              pointerDragState = null;
              draggedQueuePayload = {
                kind: itemNode.dataset.queueKind,
                id: itemNode.dataset.itemId,
                code: itemNode.dataset.code,
                customerName: itemNode.dataset.customerName,
                vehicleLabel: itemNode.dataset.vehicleLabel,
                durationMin: Number.parseInt(itemNode.dataset.durationMin, 10) || 60,
              };
              itemNode.classList.add("is-dragging");
              if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("application/x-auto-service-queue", JSON.stringify(draggedQueuePayload));
                event.dataTransfer.setData("text/plain", draggedQueuePayload.kind + ":" + draggedQueuePayload.id);
              }
            });

            itemNode.addEventListener("dragend", () => {
              nativeDragInProgress = false;
              nativeDragMarkerAt = Date.now();
              itemNode.classList.remove("is-dragging");
              draggedQueuePayload = null;
              calendarHost.classList.remove("drop-active");
            });

            itemNode.addEventListener("pointerdown", (event) => {
              if (event.button !== 0) {
                return;
              }
              pointerDragState = {
                payload: {
                  kind: itemNode.dataset.queueKind,
                  id: itemNode.dataset.itemId,
                  code: itemNode.dataset.code,
                  customerName: itemNode.dataset.customerName,
                  vehicleLabel: itemNode.dataset.vehicleLabel,
                  durationMin: Number.parseInt(itemNode.dataset.durationMin, 10) || 60,
                },
                startX: event.clientX,
                startY: event.clientY,
                active: false,
              };
            });
          });
        }

        document.addEventListener("pointermove", (event) => {
          if (!pointerDragState) {
            return;
          }
          const dx = event.clientX - pointerDragState.startX;
          const dy = event.clientY - pointerDragState.startY;
          const distance = Math.hypot(dx, dy);
          if (!pointerDragState.active && distance < 8) {
            return;
          }
          pointerDragState.active = true;
          if (isPointInsideCalendar(event.clientX, event.clientY)) {
            calendarHost.classList.add("drop-active");
          } else {
            calendarHost.classList.remove("drop-active");
          }
        });

        document.addEventListener("pointerup", async (event) => {
          if (!pointerDragState) {
            return;
          }
          const currentState = pointerDragState;
          pointerDragState = null;
          calendarHost.classList.remove("drop-active");

          if (nativeDragInProgress || Date.now() - nativeDragMarkerAt < 700) {
            return;
          }
          if (!currentState.active) {
            return;
          }
          if (Date.now() - recentHtmlDropAt < 500) {
            return;
          }
          if (!isPointInsideCalendar(event.clientX, event.clientY)) {
            return;
          }

          const targetInfo = resolveDropTargetInfo(event);
          await scheduleQueuePayload(targetInfo, currentState.payload);
        });

        async function postJson(url, body) {
          const response = await fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          });

          let payload = null;
          try {
            payload = await response.json();
          } catch {
            payload = null;
          }
          return { response, payload };
        }

        function resolveEventResourceId(event, fallbackResource) {
          if (fallbackResource?.id !== undefined && fallbackResource?.id !== null) {
            return String(fallbackResource.id);
          }
          if (Array.isArray(event?.resourceIds) && event.resourceIds.length > 0) {
            return String(event.resourceIds[0]);
          }
          if (event?.resourceId !== undefined && event?.resourceId !== null) {
            return String(event.resourceId);
          }
          if (event?.resources && Array.isArray(event.resources) && event.resources[0]?.id) {
            return String(event.resources[0].id);
          }
          return null;
        }

        function toMutationPayload({ startDate, endDate, resourceId, reason }) {
          return {
            start: formatLocalDateTime(startDate),
            end: formatLocalDateTime(endDate),
            resourceId,
            laneMode: model.laneMode,
            dayLocal: model.dayLocal,
            reason,
          };
        }

        async function refreshBoardModel() {
          const url = "/api/v1/dispatch/board?day="
            + encodeURIComponent(model.dayLocal)
            + "&laneMode="
            + encodeURIComponent(model.laneMode)
            + "&_ts="
            + Date.now();
          const response = await fetch(url, { method: "GET", cache: "no-store" });
          if (!response.ok) {
            throw new Error("Не удалось обновить модель диспетчерской доски");
          }

          const nextModel = await response.json();
          model = nextModel;
          if (dayChip) {
            dayChip.textContent = model.dayLocal;
          }
          if (boardRange) {
            boardRange.textContent = rangeLabel(model.calendar);
          }

          calendar.setOption("date", model.dayLocal + "T00:00:00");
          calendar.setOption("slotMinTime", model.calendar.slotMinTime);
          calendar.setOption("slotMaxTime", model.calendar.slotMaxTime);
          calendar.setOption("slotDuration", model.calendar.slotDuration);
          calendar.setOption("snapDuration", model.calendar.snapDuration);
          calendar.setOption("resources", model.resources.map((resource) => toCalendarResource(resource)));
          calendar.setOption("events", model.events.map((entry) => toCalendarEvent(entry)));

          renderQueueList(model.queues.unscheduledAppointments, "appointment", queueAppointments);
          renderQueueList(model.queues.walkIn, "walkin", queueWalkIn);
          bindQueueDragHandlers();
        }

        async function previewAndCommitEvent(info, reason) {
          if (!info?.event?.id) {
            return;
          }
          const eventId = String(info.event.id);
          if (pendingEventMutationIds.has(eventId)) {
            showToast("Сохранение уже выполняется, дождитесь завершения", "warning");
            info.revert();
            return;
          }
          pendingEventMutationIds.add(eventId);
          const resourceId = resolveEventResourceId(info.event, info.newResource);
          if (!resourceId) {
            showToast("Не удалось определить ленту для сохранения", "error");
            info.revert();
            pendingEventMutationIds.delete(eventId);
            return;
          }

          try {
            const startDate = info.event.start;
            const endDate = info.event.end ?? new Date(startDate.getTime() + 60 * 60000);
            const payload = toMutationPayload({
              startDate,
              endDate,
              resourceId,
              reason,
            });

            const preview = await postJson("/api/v1/dispatch/board/events/" + encodeURIComponent(info.event.id) + "/preview", payload);
            if (!preview.response.ok) {
              showToast(parseErrorMessage(preview.payload, "Не удалось проверить слот перед сохранением"), "error");
              info.revert();
              return;
            }

            const commit = await postJson("/api/v1/dispatch/board/events/" + encodeURIComponent(info.event.id) + "/commit", payload);
            if (!commit.response.ok) {
              showToast(parseErrorMessage(commit.payload, "Не удалось сохранить изменения"), "error");
              info.revert();
              return;
            }

            await refreshBoardModel();
            const warningMessage = parseWarningMessage(commit.payload);
            if (warningMessage) {
              showToast("Сохранено с пересечением: " + warningMessage, "warning");
              return;
            }
            showToast("Сохранено: " + formatTimeLabel(startDate) + " · " + laneLabelById(resourceId));
          } finally {
            pendingEventMutationIds.delete(eventId);
          }
        }

        async function scheduleQueuePayload(targetInfo, queuePayload) {
          if (!queuePayload) {
            return;
          }
          if (queueMutationInFlight) {
            return;
          }
          if (!targetInfo || !targetInfo.date || !targetInfo.resource?.id) {
            showToast("Не удалось определить слот календаря для назначения", "error");
            return;
          }

          queueMutationInFlight = true;
          try {
            const startDate = new Date(targetInfo.date);
            const endDate = new Date(startDate.getTime() + queuePayload.durationMin * 60000);
            const payload = toMutationPayload({
              startDate,
              endDate,
              resourceId: String(targetInfo.resource.id),
              reason: "Назначение из очереди на календарной доске",
            });

            let result;
            if (queuePayload.kind === "appointment") {
              result = await postJson(
                "/api/v1/dispatch/board/queue/appointments/" + encodeURIComponent(queuePayload.id) + "/schedule",
                payload,
              );
            } else {
              result = await postJson(
                "/api/v1/dispatch/board/queue/walk-ins/" + encodeURIComponent(queuePayload.id) + "/schedule",
                payload,
              );
            }

            if (!result.response.ok) {
              showToast(parseErrorMessage(result.payload, "Не удалось выполнить назначение"), "error");
              return;
            }

            await refreshBoardModel();
            const warningMessage = parseWarningMessage(result.payload);
            if (warningMessage) {
              showToast("Назначено с пересечением: " + warningMessage, "warning");
              return;
            }
            showToast("Назначено: " + queuePayload.code + " · " + formatTimeLabel(startDate) + " · " + laneLabelById(payload.resourceId));
          } finally {
            queueMutationInFlight = false;
          }
        }

        if (!window.EventCalendar || typeof window.EventCalendar.create !== "function") {
          showToast("Не удалось инициализировать календарь", "error");
          return;
        }

        calendar = window.EventCalendar.create(calendarHost, {
          view: model.calendar.view,
          date: model.dayLocal + "T00:00:00",
          locale: model.calendar.locale,
          allDaySlot: false,
          editable: true,
          eventStartEditable: true,
          eventDurationEditable: true,
          slotMinTime: model.calendar.slotMinTime,
          slotMaxTime: model.calendar.slotMaxTime,
          slotDuration: model.calendar.slotDuration,
          snapDuration: model.calendar.snapDuration,
          nowIndicator: true,
          resources: model.resources.map((entry) => toCalendarResource(entry)),
          events: model.events.map((entry) => toCalendarEvent(entry)),
          eventContent: (info) => {
            const wrapper = document.createElement("div");
            wrapper.className = "dispatch-event-content";

            const primaryLine = document.createElement("div");
            primaryLine.className = "dispatch-event-line primary";
            const code = String(info.event?.extendedProps?.code ?? info.event?.id ?? "");
            const timeLabel = String(info.timeText ?? "").trim();
            primaryLine.textContent = (timeLabel.length > 0 ? (timeLabel + " · ") : "") + code;

            const secondaryLine = document.createElement("div");
            secondaryLine.className = "dispatch-event-line secondary";
            const customer = String(info.event?.extendedProps?.customerName ?? "");
            const vehicle = String(info.event?.extendedProps?.vehicleLabel ?? "");
            const fallbackTitle = String(info.event?.title ?? "");
            secondaryLine.textContent = customer.length > 0 && vehicle.length > 0
              ? (customer + " · " + vehicle)
              : fallbackTitle;

            wrapper.append(primaryLine, secondaryLine);
            return { domNodes: [wrapper] };
          },
          eventDrop: (info) => {
            previewAndCommitEvent(info, "Перемещение на календарной доске");
          },
          eventResize: (info) => {
            previewAndCommitEvent(info, "Изменение длительности на календарной доске");
          },
        });

        function handleCalendarDragOver(event) {
          if (!draggedQueuePayload) {
            const transferPayload = parseTransferPayload(event);
            if (transferPayload) {
              draggedQueuePayload = transferPayload;
            }
          }
          if (!draggedQueuePayload) {
            return;
          }
          event.preventDefault();
          calendarHost.classList.add("drop-active");
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
          }
        }

        function handleCalendarDragLeave() {
          calendarHost.classList.remove("drop-active");
        }

        async function handleCalendarDrop(event) {
          if (!draggedQueuePayload) {
            draggedQueuePayload = parseTransferPayload(event);
          }
          if (!draggedQueuePayload) {
            return;
          }
          event.preventDefault();
          calendarHost.classList.remove("drop-active");
          const currentPayload = draggedQueuePayload;
          recentHtmlDropAt = Date.now();
          const targetInfo = resolveDropTargetInfo(event);
          await scheduleQueuePayload(targetInfo, currentPayload);
          draggedQueuePayload = null;
        }

        calendarHost.addEventListener("dragover", handleCalendarDragOver, true);
        calendarHost.addEventListener("dragleave", handleCalendarDragLeave, true);
        calendarHost.addEventListener("drop", (event) => {
          handleCalendarDrop(event);
        }, true);

        if (toastClose) {
          toastClose.addEventListener("click", () => {
            hideToast();
          });
        }

        bindQueueDragHandlers();
      })();
    </script>
  </body>
</html>`;
}

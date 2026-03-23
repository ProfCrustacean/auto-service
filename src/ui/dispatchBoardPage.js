import { escapeHtml } from "./pageFormShared.js";

function formatLaneLoad(load) {
  const percent = Math.round((load?.utilizationRatio ?? 0) * 100);
  return `${percent}% · ${load?.appointmentsCount ?? 0} записей`;
}

function formatMinutesLabel(minuteOfDay) {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function renderQueueList(items, kind) {
  if (items.length === 0) {
    return '<li class="queue-empty">Нет элементов</li>';
  }

  return items.map((item) => {
    const statusLabel = kind === "walkin"
      ? item.statusLabelRu
      : `${item.plannedStartLocal} · ${item.status}`;

    return `<li
      class="queue-item"
      draggable="true"
      data-queue-kind="${escapeHtml(kind)}"
      data-item-id="${escapeHtml(item.id)}"
      data-code="${escapeHtml(item.code)}"
      data-customer-name="${escapeHtml(item.customerName)}"
      data-vehicle-label="${escapeHtml(item.vehicleLabel)}"
      data-status-label="${escapeHtml(statusLabel)}"
    >
      <div class="queue-head">
        <strong>${escapeHtml(item.code)}</strong>
        <span>${escapeHtml(statusLabel)}</span>
      </div>
      <div class="queue-text">${escapeHtml(item.customerName)} · ${escapeHtml(item.vehicleLabel)}</div>
    </li>`;
  }).join("");
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
      <p class="subtitle">Управляйте расписанием только через календарь: перетаскивайте существующие записи и карточки из очереди.</p>
    </div>
    <div class="controls">
      <a class="btn" href="${escapeHtml(renderDayHref(model.dayLocal, -1, model.laneMode))}">← Предыдущий день</a>
      <span class="day-chip">${escapeHtml(model.dayLocal)}</span>
      <a class="btn" href="${escapeHtml(renderDayHref(model.dayLocal, 1, model.laneMode))}">Следующий день →</a>
      <a class="mode-btn ${model.laneMode === "bay" ? "active" : ""}" href="${escapeHtml(renderModeHref("bay", model.dayLocal))}">Посты</a>
      <a class="mode-btn ${model.laneMode === "technician" ? "active" : ""}" href="${escapeHtml(renderModeHref("technician", model.dayLocal))}">Ответственные</a>
      <a class="btn accent" href="${escapeHtml(model.actions.createAppointmentHref)}">Новая запись</a>
    </div>
  </div>`;
}

export function renderDispatchBoardPage(model) {
  const laneLoadByKey = new Map(model.laneLoad.map((entry) => [entry.laneKey, entry]));
  const pageModelJson = JSON.stringify(model).replaceAll("</script", "<\\/script");
  const timelineStartLabel = formatMinutesLabel(model.timeline.startMinute);
  const timelineEndLabel = formatMinutesLabel(model.timeline.endMinute);

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Диспетчерская доска</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/vis-timeline@7.7.4/styles/vis-timeline-graph2d.min.css" />
    <style>
      :root {
        --bg: #e9f0ea;
        --panel: #f8fbf8;
        --surface: #ffffff;
        --ink: #1f2f28;
        --ink-soft: #51675b;
        --line: #c4d4c8;
        --accent: #117a48;
        --warn-soft: #fff0dc;
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

      .timeline-host {
        border: 1px solid var(--line);
        border-radius: 12px;
        overflow: hidden;
        background: #fff;
      }

      .timeline-host.drop-active {
        box-shadow: inset 0 0 0 2px rgba(17, 122, 72, 0.25);
      }

      .toast {
        position: fixed;
        right: 14px;
        bottom: 14px;
        max-width: 360px;
        border: 1px solid var(--line);
        border-radius: 10px;
        background: #fff;
        box-shadow: 0 10px 24px rgba(23, 47, 33, 0.16);
        padding: 10px 12px;
        font-size: 0.88rem;
        display: none;
      }

      .toast.show { display: block; }

      .toast.error {
        border-color: #dfb1a7;
        background: var(--danger-soft);
      }

      .vis-timeline {
        border: 0;
        font-family: "Manrope", "IBM Plex Sans", "Segoe UI", sans-serif;
      }

      .vis-labelset .vis-label { border-color: #dce6de; }
      .vis-labelset .vis-label .vis-inner { padding: 8px 10px; }
      .vis-time-axis .vis-text { color: #64796d; }

      .vis-item {
        border-radius: 10px;
        border: 1px solid #9ec9ae;
        background: #e6f4ea;
        color: var(--ink);
        box-shadow: 0 2px 4px rgba(30, 55, 39, 0.08);
      }

      .vis-item.status-confirmed,
      .vis-item.status-arrived {
        border-color: #9cc7ae;
        background: #eaf6ee;
      }

      .vis-item.status-booked {
        border-color: #9bbfd3;
        background: #e7f0f8;
      }

      .vis-item.status-cancelled,
      .vis-item.status-no-show {
        border-color: #e0bbb2;
        background: #fff0ed;
      }

      .vis-item.vis-selected {
        border-color: var(--accent);
        box-shadow: 0 0 0 2px rgba(17, 122, 72, 0.18);
      }

      .event-card { line-height: 1.2; }

      .event-head {
        display: flex;
        justify-content: space-between;
        gap: 6px;
      }

      .event-code {
        font-size: 0.8rem;
        font-weight: 800;
      }

      .event-time {
        font-size: 0.74rem;
        color: #41584d;
      }

      .event-meta {
        margin-top: 4px;
        font-size: 0.76rem;
        color: #2c4137;
      }

      .lane-group {
        display: grid;
        gap: 2px;
      }

      .lane-group strong { font-size: 0.86rem; }

      .lane-group small {
        color: #667c70;
        font-size: 0.72rem;
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
        .timeline-host { min-height: 520px; }
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
              <p>Перетаскивайте карточки внутри календаря и переносите карточки из очереди прямо на таймлайн.</p>
            </div>
            <div class="board-range">${escapeHtml(timelineStartLabel)}–${escapeHtml(timelineEndLabel)}, шаг ${escapeHtml(String(model.timeline.stepMinutes))} мин</div>
          </div>
          <div id="dispatch-timeline" class="timeline-host" aria-label="Календарная доска"></div>
        </section>
      </section>
    </main>

    <div id="dispatch-toast" class="toast" role="status" aria-live="polite"></div>
    <script id="dispatch-board-model" type="application/json">${pageModelJson}</script>
    <script src="https://cdn.jsdelivr.net/npm/vis-timeline@7.7.4/standalone/umd/vis-timeline-graph2d.min.js"></script>
    <script>
      (() => {
        const model = JSON.parse(document.getElementById("dispatch-board-model").textContent);
        const toast = document.getElementById("dispatch-toast");
        const laneLoadByKey = new Map(model.laneLoad.map((entry) => [entry.laneKey, entry]));
        const laneByKey = new Map(model.lanes.map((lane) => [lane.key, lane]));
        const stepMinutes = Number.parseInt(model.timeline.stepMinutes, 10) || 15;
        const dayStart = Number.parseInt(model.timeline.startMinute, 10);
        const dayEnd = Number.parseInt(model.timeline.endMinute, 10);
        const timelineHost = document.getElementById("dispatch-timeline");

        let draggedQueuePayload = null;

        function showToast(message, kind = "ok") {
          toast.textContent = message;
          toast.className = "toast show" + (kind === "error" ? " error" : "");
          window.setTimeout(() => {
            toast.className = "toast";
          }, 2600);
        }

        function escapeText(value) {
          return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
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

        function buildDate(dayLocal, minuteOfDay) {
          const base = new Date(dayLocal + "T00:00:00");
          base.setHours(0, minuteOfDay, 0, 0);
          return base;
        }

        function clampMinute(minute) {
          const min = Math.max(dayStart, Number.parseInt(minute, 10));
          const max = Math.max(dayStart + stepMinutes, dayEnd);
          return Math.min(max, min);
        }

        function snapMinute(minute) {
          const ratio = Math.round(minute / stepMinutes);
          return clampMinute(ratio * stepMinutes);
        }

        function minuteFromDate(date) {
          return snapMinute((date.getHours() * 60) + date.getMinutes());
        }

        function minutesToLabel(minuteOfDay) {
          const hour = Math.floor(minuteOfDay / 60);
          const minute = minuteOfDay % 60;
          return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
        }

        function formatSlotLocal(dayLocal, minuteOfDay) {
          return dayLocal + " " + minutesToLabel(minuteOfDay);
        }

        function laneContextFromKey(laneKey) {
          if (laneKey.startsWith("bay:")) {
            return {
              bayId: laneKey === "bay:none" ? null : laneKey.slice(4),
              primaryAssignee: undefined,
            };
          }
          if (laneKey.startsWith("tech:")) {
            return {
              bayId: undefined,
              primaryAssignee: laneKey === "tech:none" ? null : laneKey.slice(5),
            };
          }
          return {
            bayId: undefined,
            primaryAssignee: undefined,
          };
        }

        function postJson(url, body) {
          return fetch(url, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          }).then(async (response) => {
            let payload = null;
            try {
              payload = await response.json();
            } catch {
              payload = null;
            }
            return { response, payload };
          });
        }

        async function previewAndCommitAppointment({ appointmentId, laneKey, minuteOfDay, durationMin, reason }) {
          const context = laneContextFromKey(laneKey);
          const body = {
            plannedStartLocal: formatSlotLocal(model.dayLocal, minuteOfDay),
            expectedDurationMin: durationMin,
            laneMode: model.laneMode,
            day: model.dayLocal,
            reason: reason ?? "Изменено на диспетчерской доске",
          };
          if (context.bayId !== undefined) {
            body.bayId = context.bayId;
          }
          if (context.primaryAssignee !== undefined) {
            body.primaryAssignee = context.primaryAssignee;
          }

          const preview = await postJson("/dispatch/board/appointments/" + encodeURIComponent(appointmentId) + "/preview", body);
          if (!preview.response.ok) {
            return {
              ok: false,
              message: parseErrorMessage(preview.payload, "Слот недоступен: есть конфликт по загрузке"),
            };
          }

          const commit = await postJson("/dispatch/board/appointments/" + encodeURIComponent(appointmentId) + "/commit", body);
          if (!commit.response.ok) {
            return {
              ok: false,
              message: parseErrorMessage(commit.payload, "Не удалось сохранить изменения"),
            };
          }

          return {
            ok: true,
            item: commit.payload?.item ?? null,
          };
        }

        function normalizeDuration(duration) {
          const parsed = Number.parseInt(duration, 10);
          if (!Number.isInteger(parsed)) {
            return 60;
          }
          const normalized = Math.max(stepMinutes, parsed);
          return Math.min(720, normalized);
        }

        function buildItemClass(status) {
          const safeStatus = String(status ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
          return safeStatus.length > 0 ? "status-" + safeStatus : "status-booked";
        }

        function toTimelineItem(card) {
          const startMinute = snapMinute(Number.parseInt(card.startMinute, 10));
          const durationMin = normalizeDuration(card.durationMin);
          const endMinute = Math.min(dayEnd, startMinute + durationMin);
          return {
            id: card.id,
            group: card.laneKey,
            start: buildDate(model.dayLocal, startMinute),
            end: buildDate(model.dayLocal, endMinute),
            code: card.code,
            customerName: card.customerName,
            vehicleLabel: card.vehicleLabel,
            status: card.status,
            primaryAssignee: card.primaryAssignee ?? "Без ответственного",
            durationMin,
            className: buildItemClass(card.status),
          };
        }

        if (!window.vis || !window.vis.DataSet || !window.vis.Timeline) {
          showToast("Не удалось инициализировать календарь", "error");
          return;
        }

        const groupDataset = new window.vis.DataSet(
          model.lanes.map((lane) => {
            const load = laneLoadByKey.get(lane.key);
            return {
              id: lane.key,
              content: "<div class='lane-group'><strong>" + escapeText(lane.label) + "</strong><small>" + escapeText(formatLaneLoad(load)) + "</small></div>",
            };
          }),
        );

        const itemDataset = new window.vis.DataSet(model.appointments.map((card) => toTimelineItem(card)));

        const timeline = new window.vis.Timeline(timelineHost, itemDataset, groupDataset, {
          start: buildDate(model.dayLocal, dayStart),
          end: buildDate(model.dayLocal, dayEnd),
          min: buildDate(model.dayLocal, dayStart),
          max: buildDate(model.dayLocal, dayEnd),
          stack: false,
          orientation: { axis: "top", item: "bottom" },
          zoomMin: (dayEnd - dayStart) * 60 * 1000,
          zoomMax: (dayEnd - dayStart) * 60 * 1000,
          horizontalScroll: false,
          verticalScroll: true,
          moveable: false,
          editable: {
            updateTime: true,
            updateGroup: true,
            add: false,
            remove: false,
          },
          snap(date) {
            const minute = (date.getHours() * 60) + date.getMinutes();
            return buildDate(model.dayLocal, snapMinute(minute));
          },
          margin: { item: 8, axis: 6 },
          template(item) {
            const startMinute = minuteFromDate(item.start);
            const endMinute = minuteFromDate(item.end);
            return "<div class='event-card'>"
              + "<div class='event-head'>"
              + "<span class='event-code'>" + escapeText(item.code) + "</span>"
              + "<span class='event-time'>" + escapeText(minutesToLabel(startMinute) + "-" + minutesToLabel(endMinute)) + "</span>"
              + "</div>"
              + "<div class='event-meta'>" + escapeText(item.customerName + " · " + item.vehicleLabel) + "</div>"
              + "</div>";
          },
          async onMove(item, callback) {
            const startMinute = minuteFromDate(item.start);
            const endMinute = minuteFromDate(item.end);
            const duration = normalizeDuration(Math.max(stepMinutes, endMinute - startMinute));
            const laneKey = item.group;
            const appointmentId = String(item.id);

            const commitResult = await previewAndCommitAppointment({
              appointmentId,
              laneKey,
              minuteOfDay: startMinute,
              durationMin: duration,
              reason: "Перемещение или изменение длительности на календарной доске",
            });

            if (!commitResult.ok) {
              showToast(commitResult.message, "error");
              callback(null);
              return;
            }

            const current = itemDataset.get(appointmentId);
            if (!current) {
              callback(null);
              return;
            }

            const updated = {
              ...current,
              group: laneKey,
              start: buildDate(model.dayLocal, startMinute),
              end: buildDate(model.dayLocal, Math.min(dayEnd, startMinute + duration)),
              durationMin: duration,
              status: commitResult.item?.status ?? current.status,
              className: buildItemClass(commitResult.item?.status ?? current.status),
            };

            callback(updated);
            itemDataset.update(updated);
            showToast("Изменения сохранены");
          },
        });

        function queueItemSelector(payload) {
          return '.queue-item[data-queue-kind="' + CSS.escape(payload.kind) + '"][data-item-id="' + CSS.escape(payload.id) + '"]';
        }

        function getDropTarget(event) {
          const properties = timeline.getEventProperties(event);
          if (!properties || !properties.group || !properties.time) {
            return null;
          }
          return {
            laneKey: String(properties.group),
            minuteOfDay: minuteFromDate(properties.time),
          };
        }

        async function dropQueueAppointment(payload, target) {
          const commitResult = await previewAndCommitAppointment({
            appointmentId: payload.id,
            laneKey: target.laneKey,
            minuteOfDay: target.minuteOfDay,
            durationMin: 60,
            reason: "Назначение из очереди переносов на календарной доске",
          });
          if (!commitResult.ok) {
            showToast(commitResult.message, "error");
            return false;
          }

          const existing = itemDataset.get(payload.id);
          const duration = normalizeDuration(commitResult.item?.expectedDurationMin ?? existing?.durationMin ?? 60);
          const nextItem = {
            ...(existing ?? {}),
            id: payload.id,
            group: target.laneKey,
            start: buildDate(model.dayLocal, target.minuteOfDay),
            end: buildDate(model.dayLocal, Math.min(dayEnd, target.minuteOfDay + duration)),
            durationMin: duration,
            code: existing?.code ?? payload.code,
            customerName: existing?.customerName ?? payload.customerName,
            vehicleLabel: existing?.vehicleLabel ?? payload.vehicleLabel,
            status: commitResult.item?.status ?? existing?.status ?? "booked",
            primaryAssignee: commitResult.item?.primaryAssignee ?? existing?.primaryAssignee ?? "Без ответственного",
            className: buildItemClass(commitResult.item?.status ?? existing?.status ?? "booked"),
          };

          if (existing) {
            itemDataset.update(nextItem);
          } else {
            itemDataset.add(nextItem);
          }
          showToast("Запись назначена в календаре");
          return true;
        }

        async function dropQueueWalkIn(payload, target) {
          const laneContext = laneContextFromKey(target.laneKey);
          const body = {
            plannedStartLocal: formatSlotLocal(model.dayLocal, target.minuteOfDay),
            day: model.dayLocal,
            laneMode: model.laneMode,
          };
          if (laneContext.bayId !== undefined) {
            body.bayId = laneContext.bayId;
          }
          if (laneContext.primaryAssignee !== undefined) {
            body.primaryAssignee = laneContext.primaryAssignee;
          }

          const scheduleResponse = await postJson("/dispatch/board/walk-ins/" + encodeURIComponent(payload.id) + "/schedule", body);
          if (!scheduleResponse.response.ok) {
            showToast(parseErrorMessage(scheduleResponse.payload, "Не удалось назначить прием без записи"), "error");
            return false;
          }

          showToast("Прием без записи назначен. Обновляю доску…");
          window.location.reload();
          return true;
        }

        timelineHost.addEventListener("dragover", (event) => {
          if (!draggedQueuePayload) {
            return;
          }
          const target = getDropTarget(event);
          if (!target) {
            return;
          }
          event.preventDefault();
          timelineHost.classList.add("drop-active");
          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
          }
        });

        timelineHost.addEventListener("dragleave", () => {
          timelineHost.classList.remove("drop-active");
        });

        timelineHost.addEventListener("drop", async (event) => {
          if (!draggedQueuePayload) {
            return;
          }
          event.preventDefault();
          timelineHost.classList.remove("drop-active");

          const payload = draggedQueuePayload;
          draggedQueuePayload = null;
          const target = getDropTarget(event);

          if (!target) {
            showToast("Не удалось определить слот календаря для назначения", "error");
            return;
          }

          let applied = false;
          if (payload.kind === "appointment") {
            applied = await dropQueueAppointment(payload, target);
          } else if (payload.kind === "walkin") {
            applied = await dropQueueWalkIn(payload, target);
          }

          if (applied) {
            const source = document.querySelector(queueItemSelector(payload));
            if (source) {
              source.remove();
            }
          }
        });

        document.querySelectorAll(".queue-item").forEach((itemNode) => {
          itemNode.addEventListener("dragstart", (event) => {
            draggedQueuePayload = {
              kind: itemNode.dataset.queueKind,
              id: itemNode.dataset.itemId,
              code: itemNode.dataset.code,
              customerName: itemNode.dataset.customerName,
              vehicleLabel: itemNode.dataset.vehicleLabel,
            };
            itemNode.classList.add("is-dragging");
            if (event.dataTransfer) {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", draggedQueuePayload.kind + ":" + draggedQueuePayload.id);
            }
          });

          itemNode.addEventListener("dragend", () => {
            itemNode.classList.remove("is-dragging");
            draggedQueuePayload = null;
            timelineHost.classList.remove("drop-active");
          });
        });
      })();
    </script>
  </body>
</html>`;
}

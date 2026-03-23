import { escapeHtml } from "./pageFormShared.js";

function formatLaneLoad(load) {
  const percent = Math.round((load.utilizationRatio ?? 0) * 100);
  return `${percent}% · ${load.appointmentsCount} записей`;
}

function formatTimeLabel(minuteOfDay) {
  const hour = Math.floor(minuteOfDay / 60);
  const minute = minuteOfDay % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function renderLane({ lane, load, cards, timeline }) {
  const dayMinutes = timeline.endMinute - timeline.startMinute;
  const levelClass = load.isOverloaded ? "overloaded" : "normal";
  const timeRows = timeline.slots.map((slot) => {
    const shortLabel = slot.minuteOfDay % 60 === 0
      ? `<span class="slot-label">${escapeHtml(slot.label)}</span>`
      : "";
    return `<div class="slot-row" data-minute="${slot.minuteOfDay}" data-lane-key="${escapeHtml(lane.key)}">${shortLabel}</div>`;
  }).join("");

  const renderedCards = cards.map((card) => {
    const top = ((card.startMinute - timeline.startMinute) / dayMinutes) * 100;
    const height = Math.max(8, ((card.endMinute - card.startMinute) / dayMinutes) * 100);
    return `<article
      class="appt-card status-${escapeHtml(card.status)}"
      draggable="true"
      data-appointment-id="${escapeHtml(card.id)}"
      data-lane-key="${escapeHtml(lane.key)}"
      data-start-minute="${card.startMinute}"
      data-duration-min="${card.durationMin}"
      style="top:${top.toFixed(2)}%;height:${height.toFixed(2)}%;"
    >
      <header>
        <strong>${escapeHtml(card.code)}</strong>
        <span>${escapeHtml(formatTimeLabel(card.startMinute))} · ${escapeHtml(String(card.durationMin))} мин</span>
      </header>
      <div class="appt-meta">
        <div>${escapeHtml(card.customerName)}</div>
        <div>${escapeHtml(card.vehicleLabel)}</div>
      </div>
      <div class="appt-foot">
        <span>${escapeHtml(card.primaryAssignee ?? "Без ответственного")}</span>
        <div class="duration-actions">
          <button type="button" class="small-btn" data-duration-action="-15" data-appointment-id="${escapeHtml(card.id)}">-15</button>
          <button type="button" class="small-btn" data-duration-action="+15" data-appointment-id="${escapeHtml(card.id)}">+15</button>
        </div>
      </div>
    </article>`;
  }).join("");

  return `<section class="lane ${levelClass}" data-lane-key="${escapeHtml(lane.key)}" data-lane-type="${escapeHtml(lane.type)}" data-lane-value="${escapeHtml(lane.value ?? "")}">
    <header class="lane-head">
      <h3>${escapeHtml(lane.label)}</h3>
      <div class="lane-load ${levelClass}">${escapeHtml(formatLaneLoad(load))}</div>
    </header>
    <div class="lane-body">
      <div class="slot-grid">${timeRows}</div>
      <div class="card-layer">${renderedCards}</div>
    </div>
  </section>`;
}

function renderQueueSection(model) {
  const appointmentRows = model.queues.unscheduledAppointments.map((item) => `<li class="queue-item" draggable="true" data-queue-kind="appointment" data-item-id="${escapeHtml(item.id)}">
    <div class="queue-code">${escapeHtml(item.code)}</div>
    <div class="queue-text">${escapeHtml(item.customerName)} · ${escapeHtml(item.vehicleLabel)}</div>
    <div class="queue-sub">${escapeHtml(item.plannedStartLocal)} · ${escapeHtml(item.status)}</div>
  </li>`).join("");

  const walkInRows = model.queues.walkIn.map((item) => `<li class="queue-item walkin" draggable="true" data-queue-kind="walkin" data-item-id="${escapeHtml(item.id)}" data-customer-id="${escapeHtml(item.customerId)}" data-vehicle-id="${escapeHtml(item.vehicleId)}">
    <div class="queue-code">${escapeHtml(item.code)}</div>
    <div class="queue-text">${escapeHtml(item.customerName)} · ${escapeHtml(item.vehicleLabel)}</div>
    <div class="queue-sub">${escapeHtml(item.statusLabelRu)}</div>
  </li>`).join("");

  return `<aside class="queue-panel">
    <section class="queue-block">
      <h3>Очередь переносов</h3>
      <p>Перетащите запись на слот таймлайна, чтобы перепланировать.</p>
      <ul class="queue-list">${appointmentRows || '<li class="queue-empty">Нет элементов</li>'}</ul>
    </section>
    <section class="queue-block">
      <h3>Walk-in без слота</h3>
      <p>Перетащите элемент на таймлайн, чтобы создать запись из очереди.</p>
      <ul class="queue-list">${walkInRows || '<li class="queue-empty">Нет элементов</li>'}</ul>
    </section>
  </aside>`;
}

function renderSummary(model) {
  return `<section class="summary-strip">
    <article><strong>${model.summary.scheduledAppointmentsCount}</strong><span>Записей в дне</span></article>
    <article><strong>${model.summary.carryOverQueueCount}</strong><span>Перенос из других дней</span></article>
    <article><strong>${model.summary.walkInQueueCount}</strong><span>Walk-in в очереди</span></article>
    <article class="${model.summary.overloadedLanesCount > 0 ? "warn" : ""}"><strong>${model.summary.overloadedLanesCount}</strong><span>Перегружено лент</span></article>
  </section>`;
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

export function renderDispatchBoardPage(model) {
  const laneCards = new Map(model.lanes.map((lane) => [lane.key, []]));
  for (const card of model.appointments) {
    const list = laneCards.get(card.laneKey);
    if (list) {
      list.push(card);
    }
  }

  const lanesHtml = model.lanes.map((lane) => {
    const load = model.laneLoad.find((entry) => entry.laneKey === lane.key) ?? {
      appointmentsCount: 0,
      utilizationRatio: 0,
      isOverloaded: false,
    };
    return renderLane({
      lane,
      load,
      cards: laneCards.get(lane.key) ?? [],
      timeline: model.timeline,
    });
  }).join("");

  const pageModelJson = escapeHtml(JSON.stringify(model));

  return `<!doctype html>
<html lang="ru">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Диспетчерская доска</title>
    <style>
      :root {
        --bg: #eff4ef;
        --panel: #f8faf8;
        --ink: #1f2f28;
        --ink-soft: #52665b;
        --line: #c8d7cc;
        --accent: #0f8a4a;
        --accent-soft: #dff3e6;
        --warn: #b46918;
        --warn-soft: #fff0da;
        --danger: #a43f2b;
        --danger-soft: #ffe8e1;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Noto Sans", sans-serif;
        color: var(--ink);
        background: radial-gradient(circle at 20% 10%, #f6fbf6 0%, var(--bg) 45%, #e4ece6 100%);
      }
      .shell {
        max-width: 1380px;
        margin: 0 auto;
        padding: 20px 16px 28px;
      }
      .topbar {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
      }
      .topbar h1 {
        margin: 0;
        font-size: clamp(1.5rem, 2.4vw, 2rem);
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
      }
      .btn, .mode-btn {
        border: 1px solid var(--line);
        background: white;
        color: var(--ink);
        text-decoration: none;
        border-radius: 999px;
        padding: 8px 14px;
        font-size: 0.92rem;
        font-weight: 600;
      }
      .mode-btn.active {
        background: var(--accent);
        border-color: var(--accent);
        color: white;
      }
      .summary-strip {
        margin-top: 16px;
        display: grid;
        gap: 10px;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
      }
      .summary-strip article {
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 12px;
        padding: 12px 14px;
      }
      .summary-strip article.warn {
        border-color: #e0bc89;
        background: var(--warn-soft);
      }
      .summary-strip strong { display: block; font-size: 1.35rem; }
      .summary-strip span { color: var(--ink-soft); font-size: 0.88rem; }
      .layout {
        margin-top: 16px;
        display: grid;
        gap: 12px;
        grid-template-columns: 300px 1fr;
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
      .queue-block h3 {
        margin: 0 0 4px;
        font-size: 1rem;
      }
      .queue-block p {
        margin: 0 0 8px;
        color: var(--ink-soft);
        font-size: 0.85rem;
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
        background: white;
        border-radius: 10px;
        padding: 8px 10px;
        cursor: grab;
      }
      .queue-item.walkin {
        border-color: #e0bc89;
        background: #fff8ee;
      }
      .queue-code { font-weight: 700; color: #1a7b4b; font-size: 0.85rem; }
      .queue-text { font-size: 0.9rem; margin-top: 2px; }
      .queue-sub { color: var(--ink-soft); font-size: 0.8rem; margin-top: 2px; }
      .queue-empty { color: var(--ink-soft); font-size: 0.88rem; padding: 4px 0; }
      .board {
        border: 1px solid var(--line);
        background: var(--panel);
        border-radius: 14px;
        padding: 10px;
        overflow: auto;
      }
      .lanes {
        display: grid;
        gap: 12px;
        min-width: 760px;
      }
      .lane {
        border: 1px solid var(--line);
        border-radius: 12px;
        overflow: hidden;
        background: white;
      }
      .lane.overloaded { border-color: #dfb07b; }
      .lane-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-bottom: 1px solid var(--line);
        background: linear-gradient(90deg, #f7fbf8, #f5f8f6);
      }
      .lane-head h3 { margin: 0; font-size: 1rem; }
      .lane-load {
        font-size: 0.82rem;
        color: var(--ink-soft);
        border-radius: 999px;
        border: 1px solid var(--line);
        padding: 4px 10px;
      }
      .lane-load.overloaded {
        color: var(--warn);
        border-color: #e0bc89;
        background: var(--warn-soft);
      }
      .lane-body {
        position: relative;
        min-height: 540px;
      }
      .slot-grid {
        position: absolute;
        inset: 0;
      }
      .slot-row {
        position: relative;
        height: calc(100% / 48);
        border-top: 1px solid rgba(200, 215, 204, 0.4);
        transition: background 120ms ease;
      }
      .slot-row .slot-label {
        position: absolute;
        left: 8px;
        top: 1px;
        color: #7a8e82;
        font-size: 0.72rem;
      }
      .slot-row.drop-ready { background: var(--accent-soft); }
      .slot-row.drop-reject { background: var(--danger-soft); }
      .card-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .appt-card {
        position: absolute;
        left: 64px;
        right: 8px;
        min-height: 36px;
        border-radius: 10px;
        border: 1px solid #b6d7c2;
        background: #ebf7ef;
        padding: 6px 8px;
        box-shadow: 0 2px 5px rgba(24, 51, 35, 0.08);
        pointer-events: auto;
        cursor: grab;
      }
      .appt-card header {
        display: flex;
        justify-content: space-between;
        gap: 8px;
        font-size: 0.8rem;
        line-height: 1.25;
      }
      .appt-meta {
        margin-top: 4px;
        font-size: 0.82rem;
        line-height: 1.2;
      }
      .appt-foot {
        margin-top: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        font-size: 0.76rem;
        color: var(--ink-soft);
      }
      .duration-actions { display: inline-flex; gap: 4px; }
      .small-btn {
        border: 1px solid #a2c9b0;
        border-radius: 8px;
        background: white;
        color: #1c6b44;
        font-size: 0.72rem;
        line-height: 1;
        padding: 4px 6px;
        cursor: pointer;
      }
      .appt-card.status-cancelled, .appt-card.status-no-show {
        border-color: #e4c2b8;
        background: #fff0eb;
      }
      .toast {
        position: fixed;
        right: 14px;
        bottom: 14px;
        max-width: 340px;
        border-radius: 10px;
        padding: 10px 12px;
        border: 1px solid var(--line);
        background: white;
        box-shadow: 0 8px 24px rgba(28, 45, 35, 0.18);
        font-size: 0.86rem;
        display: none;
      }
      .toast.show { display: block; }
      .toast.error { border-color: #e2aaa0; background: var(--danger-soft); }
      @media (max-width: 980px) {
        .layout { grid-template-columns: 1fr; }
        .queue-panel { order: 2; }
        .board { order: 1; }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <div class="topbar">
        <div>
          <a class="btn" href="${escapeHtml(model.actions.backHref)}">← Назад на доску</a>
          <h1>Диспетчерская доска</h1>
        </div>
        <div class="controls">
          <a class="btn" href="${escapeHtml(renderDayHref(model.dayLocal, -1, model.laneMode))}">← Предыдущий день</a>
          <strong>${escapeHtml(model.dayLocal)}</strong>
          <a class="btn" href="${escapeHtml(renderDayHref(model.dayLocal, 1, model.laneMode))}">Следующий день →</a>
          <a class="mode-btn ${model.laneMode === "bay" ? "active" : ""}" href="${escapeHtml(renderModeHref("bay", model.dayLocal))}">Посты</a>
          <a class="mode-btn ${model.laneMode === "technician" ? "active" : ""}" href="${escapeHtml(renderModeHref("technician", model.dayLocal))}">Ответственные</a>
          <a class="btn" href="${escapeHtml(model.actions.createAppointmentHref)}">Новая запись</a>
        </div>
      </div>
      ${renderSummary(model)}
      <section class="layout">
        ${renderQueueSection(model)}
        <section class="board">
          <div class="lanes">${lanesHtml}</div>
        </section>
      </section>
    </main>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
    <script id="dispatch-board-model" type="application/json">${pageModelJson}</script>
    <script>
      (() => {
        const model = JSON.parse(document.getElementById("dispatch-board-model").textContent);
        const toast = document.getElementById("toast");
        let dragPayload = null;

        function showToast(message, kind = "ok") {
          toast.textContent = message;
          toast.className = "toast show" + (kind === "error" ? " error" : "");
          window.setTimeout(() => {
            toast.className = "toast";
          }, 2200);
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
          return { bayId: undefined, primaryAssignee: undefined };
        }

        async function requestJson(url, body) {
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

        function clearSlotHighlights() {
          document.querySelectorAll(".slot-row.drop-ready, .slot-row.drop-reject").forEach((node) => {
            node.classList.remove("drop-ready", "drop-reject");
          });
        }

        async function applyAppointmentMove(appointmentId, minuteOfDay, laneKey, mode = "commit") {
          const laneCtx = laneContextFromKey(laneKey);
          const hour = String(Math.floor(minuteOfDay / 60)).padStart(2, "0");
          const minute = String(minuteOfDay % 60).padStart(2, "0");
          const plannedStartLocal = model.dayLocal + " " + hour + ":" + minute;
          const body = {
            plannedStartLocal,
            day: model.dayLocal,
            laneMode: model.laneMode,
          };

          if (laneCtx.bayId !== undefined) {
            body.bayId = laneCtx.bayId;
          }
          if (laneCtx.primaryAssignee !== undefined) {
            body.primaryAssignee = laneCtx.primaryAssignee;
          }

          const endpoint = mode === "preview"
            ? "/dispatch/board/appointments/" + encodeURIComponent(appointmentId) + "/preview"
            : "/dispatch/board/appointments/" + encodeURIComponent(appointmentId) + "/commit";
          return requestJson(endpoint, body);
        }

        function moveCardNode(cardId, laneKey, minuteOfDay, durationMin) {
          const lane = document.querySelector('.lane[data-lane-key="' + CSS.escape(laneKey) + '"]');
          if (!lane) {
            return;
          }
          const layer = lane.querySelector(".card-layer");
          const card = document.querySelector('.appt-card[data-appointment-id="' + CSS.escape(cardId) + '"]');
          if (!card || !layer) {
            return;
          }
          const daySpan = model.timeline.endMinute - model.timeline.startMinute;
          const top = ((minuteOfDay - model.timeline.startMinute) / daySpan) * 100;
          const height = Math.max(8, (durationMin / daySpan) * 100);

          card.dataset.laneKey = laneKey;
          card.dataset.startMinute = String(minuteOfDay);
          card.dataset.durationMin = String(durationMin);
          card.style.top = top.toFixed(2) + "%";
          card.style.height = height.toFixed(2) + "%";
          layer.appendChild(card);
        }

        async function handleDropToSlot(slotNode) {
          if (!dragPayload) {
            return;
          }
          const minute = Number.parseInt(slotNode.dataset.minute, 10);
          const laneKey = slotNode.dataset.laneKey;

          if (dragPayload.kind === "appointment") {
            const preview = await applyAppointmentMove(dragPayload.id, minute, laneKey, "preview");
            if (!preview.response.ok) {
              showToast("Конфликт: выбранный слот недоступен", "error");
              return;
            }
            const commit = await applyAppointmentMove(dragPayload.id, minute, laneKey, "commit");
            if (!commit.response.ok) {
              showToast("Не удалось сохранить изменения", "error");
              return;
            }
            const updated = commit.payload && commit.payload.item ? commit.payload.item : null;
            if (updated) {
              moveCardNode(updated.id, laneKey, minute, Number.parseInt(updated.expectedDurationMin ?? 60, 10));
            }
            showToast("Изменения сохранены");
            return;
          }

          if (dragPayload.kind === "walkin") {
            const laneCtx = laneContextFromKey(laneKey);
            const hour = String(Math.floor(minute / 60)).padStart(2, "0");
            const min = String(minute % 60).padStart(2, "0");
            const payload = {
              plannedStartLocal: model.dayLocal + " " + hour + ":" + min,
              day: model.dayLocal,
              laneMode: model.laneMode,
            };
            if (laneCtx.bayId !== undefined) {
              payload.bayId = laneCtx.bayId;
            }
            if (laneCtx.primaryAssignee !== undefined) {
              payload.primaryAssignee = laneCtx.primaryAssignee;
            }

            const commit = await requestJson("/dispatch/board/walk-ins/" + encodeURIComponent(dragPayload.id) + "/schedule", payload);
            if (!commit.response.ok) {
              showToast("Не удалось создать запись из walk-in", "error");
              return;
            }
            showToast("Запись из walk-in создана");
            window.location.reload();
          }
        }

        document.querySelectorAll(".appt-card").forEach((card) => {
          card.addEventListener("dragstart", () => {
            dragPayload = { kind: "appointment", id: card.dataset.appointmentId };
          });
          card.addEventListener("dragend", () => {
            dragPayload = null;
            clearSlotHighlights();
          });
        });

        document.querySelectorAll(".queue-item").forEach((item) => {
          item.addEventListener("dragstart", () => {
            dragPayload = {
              kind: item.dataset.queueKind,
              id: item.dataset.itemId,
            };
          });
          item.addEventListener("dragend", () => {
            dragPayload = null;
            clearSlotHighlights();
          });
        });

        document.querySelectorAll(".slot-row").forEach((slot) => {
          slot.addEventListener("dragover", (event) => {
            if (!dragPayload) {
              return;
            }
            event.preventDefault();
            slot.classList.add("drop-ready");
          });
          slot.addEventListener("dragleave", () => {
            slot.classList.remove("drop-ready");
          });
          slot.addEventListener("drop", async (event) => {
            event.preventDefault();
            clearSlotHighlights();
            await handleDropToSlot(slot);
          });
        });

        document.querySelectorAll("[data-duration-action]").forEach((button) => {
          button.addEventListener("click", async () => {
            const appointmentId = button.dataset.appointmentId;
            const delta = Number.parseInt(button.dataset.durationAction, 10);
            const card = document.querySelector('.appt-card[data-appointment-id="' + CSS.escape(appointmentId) + '"]');
            if (!card) {
              return;
            }

            const currentDuration = Number.parseInt(card.dataset.durationMin, 10);
            const nextDuration = Math.max(15, Math.min(720, currentDuration + delta));
            const laneKey = card.dataset.laneKey;
            const minute = Number.parseInt(card.dataset.startMinute, 10);

            const laneCtx = laneContextFromKey(laneKey);
            const hour = String(Math.floor(minute / 60)).padStart(2, "0");
            const min = String(minute % 60).padStart(2, "0");
            const body = {
              plannedStartLocal: model.dayLocal + " " + hour + ":" + min,
              expectedDurationMin: nextDuration,
            };
            if (laneCtx.bayId !== undefined) {
              body.bayId = laneCtx.bayId;
            }
            if (laneCtx.primaryAssignee !== undefined) {
              body.primaryAssignee = laneCtx.primaryAssignee;
            }

            const preview = await requestJson("/dispatch/board/appointments/" + encodeURIComponent(appointmentId) + "/preview", body);
            if (!preview.response.ok) {
              showToast("Нельзя изменить длительность: конфликт", "error");
              return;
            }

            const commit = await requestJson("/dispatch/board/appointments/" + encodeURIComponent(appointmentId) + "/commit", body);
            if (!commit.response.ok) {
              showToast("Не удалось сохранить длительность", "error");
              return;
            }

            moveCardNode(appointmentId, laneKey, minute, nextDuration);
            showToast("Длительность обновлена");
          });
        });
      })();
    </script>
  </body>
</html>`;
}

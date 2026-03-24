import { renderDocumentShell } from "./renderDocumentShell.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderField(label, value) {
  return `<li><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value ?? "н/д")}</li>`;
}

export function renderSimpleDetailPage({ title, backHref, fields }) {
  const fieldRows = fields.map((field) => renderField(field.label, field.value)).join("\n");
  const isNotFound = /не найден/u.test(String(title ?? ""));
  const body = `
  <main class="page-shell narrow detail-page">
    <section class="panel row">
      <a href="${escapeHtml(backHref)}">← Назад на доску</a>
      <h1>${escapeHtml(title)}</h1>
      ${isNotFound ? '<p class="muted">Проверьте идентификатор в адресе или вернитесь к списку активных заказ-нарядов.</p>' : ""}
      <ul>
        ${fieldRows}
      </ul>
      <div class="action-bar">
        <a class="btn" href="/">На главную</a>
        <a class="btn" href="/work-orders/active">Активная очередь заказ-нарядов</a>
      </div>
    </section>
  </main>`;

  return renderDocumentShell({
    title,
    bodyClass: "detail-page",
    body,
  });
}

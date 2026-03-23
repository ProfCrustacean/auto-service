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

  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      font-family: "Manrope", "Segoe UI", sans-serif;
      background: #f5f7f4;
      color: #1f2b20;
    }
    main {
      max-width: 760px;
      margin: 24px auto;
      padding: 16px;
      background: #fff;
      border: 1px solid #d5ddd6;
      border-radius: 12px;
    }
    .actions {
      margin-top: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .btn {
      text-decoration: none;
      border-radius: 999px;
      border: 1px solid #d5ddd6;
      padding: 6px 12px;
      color: #1f2b20;
      display: inline-block;
      background: #f8fbf8;
      font-size: 0.9rem;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 1.3rem;
    }
    a {
      color: #1f7a55;
      text-decoration: none;
      font-weight: 600;
    }
    ul {
      margin: 14px 0 0;
      padding-left: 18px;
      display: grid;
      gap: 6px;
    }
  </style>
</head>
<body>
  <main>
    <a href="${escapeHtml(backHref)}">← Назад на доску</a>
    <h1>${escapeHtml(title)}</h1>
    ${isNotFound ? '<p>Проверьте идентификатор в адресе или вернитесь к списку активных заказ-нарядов.</p>' : ""}
    <ul>
      ${fieldRows}
    </ul>
    <div class="actions">
      <a class="btn" href="/">На главную</a>
      <a class="btn" href="/work-orders/active">Активная очередь заказ-нарядов</a>
    </div>
  </main>
</body>
</html>`;
}

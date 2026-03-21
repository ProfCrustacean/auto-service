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
    <ul>
      ${fieldRows}
    </ul>
  </main>
</body>
</html>`;
}

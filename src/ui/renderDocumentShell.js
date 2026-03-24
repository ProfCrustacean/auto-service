function escapeHtmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export const DEFAULT_DOCUMENT_STYLESHEETS = [
  "/assets/vendor/pico.min.css",
  "/assets/css/tokens.css",
  "/assets/css/app.css",
];

export function renderDocumentShell({
  title,
  body,
  lang = "ru",
  bodyClass,
  stylesheets = DEFAULT_DOCUMENT_STYLESHEETS,
  headHtml = "",
  scriptsHtml = "",
}) {
  const bodyClassAttribute = bodyClass ? ` class="${escapeHtmlAttribute(bodyClass)}"` : "";
  const stylesheetLinks = stylesheets
    .map((href) => `<link rel="stylesheet" href="${escapeHtmlAttribute(href)}" />`)
    .join("\n");

  return `<!doctype html>
<html lang="${escapeHtmlAttribute(lang)}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtmlAttribute(title)}</title>
  ${stylesheetLinks}
  ${headHtml}
</head>
<body${bodyClassAttribute}>
  ${body}
  ${scriptsHtml}
</body>
</html>`;
}

export function registerWalkInIntakePageRoutes(app) {
  const respondGone = (_req, res) => {
    res
      .status(410)
      .type("text/html; charset=utf-8")
      .send(`<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Страница перенесена</title>
  <style>
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #f4f7f3;
      color: #21312a;
    }
    .card {
      max-width: 760px;
      margin: 40px auto;
      background: #fff;
      border: 1px solid #cad8ce;
      border-radius: 14px;
      padding: 20px;
      display: grid;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #cad8ce;
      border-radius: 999px;
      padding: 7px 14px;
      text-decoration: none;
      color: #21312a;
      background: #f8fbf8;
      width: fit-content;
    }
  </style>
</head>
<body>
  <main class="card">
    <h1>Страница перенесена</h1>
    <p>UI приемки без записи теперь доступен на единой странице «Новая запись».</p>
    <p>Используйте режим <strong>«Принять сейчас»</strong>.</p>
    <a class="btn" href="/appointments/new?mode=walkin">Открыть новый адрес</a>
  </main>
</body>
</html>`);
  };

  app.get("/intake/walk-in", respondGone);
  app.post("/intake/walk-in", respondGone);
}

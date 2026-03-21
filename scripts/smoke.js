const baseUrl = process.env.APP_BASE_URL ?? "http://127.0.0.1:3000";

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const healthRes = await fetch(`${baseUrl}/healthz`);
  assert(healthRes.ok, "healthz endpoint failed");
  const healthJson = await healthRes.json();
  assert(healthJson.status === "ok", "healthz status must be ok");

  const dashRes = await fetch(`${baseUrl}/api/v1/dashboard/today`);
  assert(dashRes.ok, "dashboard endpoint failed");
  const dashJson = await dashRes.json();

  assert(dashJson.summary.appointmentsToday >= 1, "expected seeded appointment");
  assert(dashJson.summary.waitingPartsCount >= 1, "expected waiting parts queue");
  assert(dashJson.summary.readyForPickupCount >= 1, "expected ready pickup queue");

  const uiRes = await fetch(baseUrl);
  assert(uiRes.ok, "dashboard UI endpoint failed");
  const html = await uiRes.text();
  assert(html.includes("Операционная доска") || html.includes("Автосервис"), "Russian UI content missing");

  process.stdout.write(
    `${JSON.stringify({
      status: "smoke_passed",
      baseUrl,
      checks: ["healthz", "dashboard_api", "dashboard_ui"],
    })}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({ status: "smoke_failed", message: error.message })}\n`);
  process.exit(1);
});

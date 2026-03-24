import test from "node:test";
import assert from "node:assert/strict";
import {
  closeServer,
  createTempDatabase,
  makeServer,
  waitForServer,
} from "./helpers/httpHarness.js";

function toFormBody(payload) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) {
      continue;
    }
    params.set(key, String(value));
  }
  return params.toString();
}

async function submitWorkOrderForm(url, payload, { redirect = "follow" } = {}) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: toFormBody(payload),
    redirect,
  });

  const text = await response.text();
  return {
    status: response.status,
    location: response.headers.get("location"),
    text,
  };
}

test("work-order workspace page renders lifecycle controls and history", async () => {
  const tempDb = createTempDatabase("auto-service-work-order-page-render");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const detailRes = await fetch(`${baseUrl}/work-orders/wo-1004`);
    assert.equal(detailRes.status, 200);
    const detailHtml = await detailRes.text();
    assert.match(detailHtml, /Заказ-наряд WO-1004/u);
    assert.match(detailHtml, /Управление жизненным циклом/u);
    assert.match(detailHtml, /История статусов/u);
    assert.match(detailHtml, /<time datetime="[^"]+T[^"]+Z" title="[^"]+T[^"]+Z">\d{2}\.\d{2}\.\d{4}, \d{2}:\d{2}<\/time>/u);

    const queueRes = await fetch(`${baseUrl}/work-orders/active`);
    assert.equal(queueRes.status, 200);
    const queueHtml = await queueRes.text();
    assert.match(queueHtml, /Активная очередь заказ-нарядов/u);
    assert.match(queueHtml, /WO-1004/u);
    assert.match(queueHtml, /\/assets\/vendor\/pico\.min\.css/u);
    assert.match(queueHtml, /\/assets\/css\/app\.css/u);
    assert.doesNotMatch(queueHtml, /<style>/u);
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

test("work-order workspace updates lifecycle state and keeps validation feedback actionable", async () => {
  const tempDb = createTempDatabase("auto-service-work-order-page-update");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const invalidSubmit = await submitWorkOrderForm(`${baseUrl}/work-orders/wo-1004`, {
      status: "ready_pickup",
      balanceDueRub: "abc",
      reason: "Проверка формы",
    });
    assert.equal(invalidSubmit.status, 400);
    assert.match(invalidSubmit.text, /Исправьте ошибки перед сохранением/u);
    assert.match(invalidSubmit.text, /balanceDueRub must be an integer/u);

    const validSubmit = await submitWorkOrderForm(
      `${baseUrl}/work-orders/wo-1004`,
      {
        status: "ready_pickup",
        balanceDueRub: 0,
        reason: "Работа завершена, ждем выдачу",
        findings: "Проблема устранена",
      },
      { redirect: "manual" },
    );
    assert.equal(validSubmit.status, 303);
    assert.equal(validSubmit.location, "/work-orders/wo-1004?updated=1");

    const afterRes = await fetch(`${baseUrl}${validSubmit.location}`);
    assert.equal(afterRes.status, 200);
    const afterHtml = await afterRes.text();
    assert.match(afterHtml, /Изменения сохранены/u);
    assert.match(afterHtml, /Готово к выдаче/u);
    assert.match(afterHtml, /Работа завершена, ждем выдачу/u);
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

test("work-order workspace allows parts request and purchase actions from the same page", async () => {
  const tempDb = createTempDatabase("auto-service-work-order-page-parts");
  const { databasePath, cleanup } = tempDb;
  const { server, database } = makeServer({ databasePath });

  await waitForServer(server);

  try {
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    const createRequest = await submitWorkOrderForm(
      `${baseUrl}/work-orders/wo-1002/parts-requests`,
      {
        partName: "Катушка зажигания тест",
        supplierName: "Склад-Тест",
        requestedQty: 1,
        requestedUnitCostRub: 1800,
        salePriceRub: 2800,
        status: "requested",
        isBlocking: "true",
        reason: "Добавляем позицию в работе диспетчера",
      },
      { redirect: "manual" },
    );
    assert.equal(createRequest.status, 303);
    assert.equal(createRequest.location, "/work-orders/wo-1002?partsCreated=1");

    const afterCreatePage = await fetch(`${baseUrl}${createRequest.location}`);
    assert.equal(afterCreatePage.status, 200);
    const afterCreateHtml = await afterCreatePage.text();
    assert.match(afterCreateHtml, /Запрос запчасти создан/u);
    assert.match(afterCreateHtml, /Катушка зажигания тест/u);

    const detailRes = await fetch(`${baseUrl}/api/v1/work-orders/wo-1002`);
    assert.equal(detailRes.status, 200);
    const detailPayload = await detailRes.json();
    const createdRequest = detailPayload.item.partsRequests.find((item) => item.partName === "Катушка зажигания тест");
    assert.ok(createdRequest);

    const updateRequest = await submitWorkOrderForm(
      `${baseUrl}/work-orders/wo-1002/parts-requests/${createdRequest.id}`,
      {
        status: "ordered",
        reason: "Передано поставщику",
      },
      { redirect: "manual" },
    );
    assert.equal(updateRequest.status, 303);
    assert.equal(updateRequest.location, "/work-orders/wo-1002?partsUpdated=1");

    const createPurchaseAction = await submitWorkOrderForm(
      `${baseUrl}/work-orders/wo-1002/parts-requests/${createdRequest.id}/purchase-actions`,
      {
        supplierName: "Склад-Тест",
        supplierReference: "PO-TEST-1",
        orderedQty: 1,
        unitCostRub: 1800,
        status: "ordered",
        reason: "Фиксируем заказ поставщику",
      },
      { redirect: "manual" },
    );
    assert.equal(createPurchaseAction.status, 303);
    assert.equal(createPurchaseAction.location, "/work-orders/wo-1002?partsPurchase=1");

    const afterPurchasePage = await fetch(`${baseUrl}${createPurchaseAction.location}`);
    assert.equal(afterPurchasePage.status, 200);
    const afterPurchaseHtml = await afterPurchasePage.text();
    assert.match(afterPurchaseHtml, /Событие поставки запчасти добавлено/u);
    assert.match(afterPurchaseHtml, /PO-TEST-1/u);
  } finally {
    await closeServer(server);
    database.close();
    cleanup();
  }
});

import fs from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  amountMinorToYooKassaValue,
  createYooKassaPayment,
  createYooKassaRefund,
  yookassaAmountValueToMinor,
} from "@/modules/commerce/infrastructure/yookassa-client.server";

const originalEnv = { ...process.env };

function read(path: string): string {
  return fs.readFileSync(path, "utf8");
}

function configureYooKassa(extra: Record<string, string> = {}) {
  Object.assign(process.env, {
    NODE_ENV: "test",
    YOOKASSA_API_BASE_URL: "https://api.yookassa.test/v3",
    YOOKASSA_SHOP_ID: "shop-test",
    YOOKASSA_SECRET_KEY: "test-secret",
    NEXT_PUBLIC_APP_URL: "https://eternaltime.shop",
    ...extra,
  });
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  Object.assign(process.env, originalEnv);
});

describe("YooKassa provider payload", () => {
  it("formats RUB minor units exactly for YooKassa amount values", () => {
    expect(amountMinorToYooKassaValue(1)).toBe("0.01");
    expect(amountMinorToYooKassaValue(31_000_00)).toBe("31000.00");
    expect(yookassaAmountValueToMinor("31000.00")).toBe(31_000_00);
  });

  it("creates redirect payments with stable server idempotency and safe metadata", async () => {
    configureYooKassa();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "pay_123",
          status: "pending",
          paid: false,
          amount: { value: "10499.00", currency: "RUB" },
          confirmation: { type: "redirect", confirmation_url: "https://yookassa.test/confirm" },
        }),
        { status: 200 },
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await createYooKassaPayment({
      amountMinor: 1_049_900,
      orderNumber: "ET-20260815-000001",
      orderId: "order-id",
      paymentAttemptId: "attempt-id",
      customerEmail: "buyer@example.com",
      customerPhone: "+79990000000",
      items: [{ description: "Tissot PRX T137", quantity: 1, amountMinor: 999_900 }],
      returnUrl: "https://eternaltime.shop/checkout/return?order=ET-20260815-000001",
      idempotencyKey: "attempt-idempotency-key",
    });

    const [url, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = new Headers(request?.headers as HeadersInit);
    const body = JSON.parse(String(request?.body));

    expect(url).toBe("https://api.yookassa.test/v3/payments");
    expect(headers.get("Idempotence-Key")).toBe("attempt-idempotency-key");
    expect(headers.get("Authorization")).toMatch(/^Basic /);
    expect(body.amount).toEqual({ value: "10499.00", currency: "RUB" });
    expect(body.capture).toBe(true);
    expect(body.confirmation).toEqual({
      type: "redirect",
      return_url: "https://eternaltime.shop/checkout/return?order=ET-20260815-000001",
    });
    expect(body.metadata).toEqual({
      order_id: "order-id",
      order_number: "ET-20260815-000001",
      payment_attempt_id: "attempt-id",
    });
    expect(JSON.stringify(body)).not.toContain("test-secret");
    expect(JSON.stringify(body)).not.toContain("user_id");
    expect(body.receipt).toBeUndefined();
  });

  it("fails closed when receipts are enabled without confirmed fiscal settings", async () => {
    configureYooKassa({ YOOKASSA_RECEIPTS_ENABLED: "true" });
    globalThis.fetch = vi.fn() as unknown as typeof fetch;

    await expect(
      createYooKassaPayment({
        amountMinor: 1_000_00,
        orderNumber: "ET-1",
        orderId: "order-id",
        paymentAttemptId: "attempt-id",
        customerEmail: "buyer@example.com",
        customerPhone: "+79990000000",
        items: [{ description: "Watch", quantity: 1, amountMinor: 1_000_00 }],
        returnUrl: "https://eternaltime.shop/checkout/return?order=ET-1",
        idempotencyKey: "key",
      }),
    ).rejects.toThrow(/receipts are enabled/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("creates payment receipts from server-side order snapshot fiscal settings", async () => {
    configureYooKassa({
      YOOKASSA_RECEIPTS_ENABLED: "true",
      YOOKASSA_RECEIPT_TAX_SYSTEM_CODE: "2",
      YOOKASSA_RECEIPT_VAT_CODE: "1",
      YOOKASSA_RECEIPT_PAYMENT_SUBJECT: "commodity",
      YOOKASSA_RECEIPT_PAYMENT_MODE: "full_prepayment",
    });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "pay_123",
          status: "pending",
          paid: false,
          amount: { value: "10499.00", currency: "RUB" },
          confirmation: { type: "redirect", confirmation_url: "https://yookassa.test/confirm" },
        }),
        { status: 200 },
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await createYooKassaPayment({
      amountMinor: 1_049_900,
      orderNumber: "ET-20260815-000001",
      orderId: "order-id",
      paymentAttemptId: "attempt-id",
      customerEmail: "buyer@example.com",
      customerPhone: "+79990000000",
      items: [
        { description: "Tissot PRX T137", quantity: 1, amountMinor: 999_900 },
        { description: "Доставка заказа Eternal Time", quantity: 1, amountMinor: 50_000, paymentSubject: "service" },
      ],
      returnUrl: "https://eternaltime.shop/checkout/return?order=ET-20260815-000001",
      idempotencyKey: "attempt-idempotency-key",
    });

    const [, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const body = JSON.parse(String(request?.body));

    expect(body.receipt.tax_system_code).toBe(2);
    expect(body.receipt.customer).toEqual({ email: "buyer@example.com", phone: "79990000000" });
    expect(body.receipt.items).toEqual([
      {
        description: "Tissot PRX T137",
        quantity: "1",
        amount: { value: "9999.00", currency: "RUB" },
        vat_code: 1,
        payment_subject: "commodity",
        payment_mode: "full_prepayment",
      },
      {
        description: "Доставка заказа Eternal Time",
        quantity: "1",
        amount: { value: "500.00", currency: "RUB" },
        vat_code: 1,
        payment_subject: "service",
        payment_mode: "full_prepayment",
      },
    ]);
  });

  it("creates refunds with a dedicated refund idempotency key and safe metadata", async () => {
    configureYooKassa();
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "refund_123",
          payment_id: "pay_123",
          status: "pending",
          amount: { value: "1500.00", currency: "RUB" },
        }),
        { status: 200 },
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await createYooKassaRefund({
      paymentId: "pay_123",
      amountMinor: 150_000,
      idempotencyKey: "refund-key",
      reason: "Partial refund",
      metadata: { refund_id: "refund-row-id", order_number: "ET-1" },
    });

    const [url, request] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const headers = new Headers(request?.headers as HeadersInit);
    const body = JSON.parse(String(request?.body));

    expect(url).toBe("https://api.yookassa.test/v3/refunds");
    expect(headers.get("Idempotence-Key")).toBe("refund-key");
    expect(body).toMatchObject({
      payment_id: "pay_123",
      amount: { value: "1500.00", currency: "RUB" },
      metadata: { refund_id: "refund-row-id", order_number: "ET-1" },
    });
    expect(JSON.stringify(body)).not.toContain("test-secret");
  });

  it("creates partial refund receipts only for returned lines and omits receipts for full refunds", async () => {
    configureYooKassa({
      YOOKASSA_RECEIPTS_ENABLED: "true",
      YOOKASSA_RECEIPT_TAX_SYSTEM_CODE: "2",
      YOOKASSA_RECEIPT_VAT_CODE: "1",
      YOOKASSA_RECEIPT_PAYMENT_SUBJECT: "commodity",
      YOOKASSA_RECEIPT_PAYMENT_MODE: "full_prepayment",
    });
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: "refund_123",
          payment_id: "pay_123",
          status: "pending",
          amount: { value: "1500.00", currency: "RUB" },
        }),
        { status: 200 },
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    await createYooKassaRefund({
      paymentId: "pay_123",
      amountMinor: 150_000,
      idempotencyKey: "partial-refund-key",
      customerEmail: "buyer@example.com",
      customerPhone: "+79990000000",
      items: [{ description: "Tissot PRX T137", quantity: 1, amountMinor: 150_000 }],
    });
    await createYooKassaRefund({
      paymentId: "pay_123",
      amountMinor: 1_049_900,
      idempotencyKey: "full-refund-key",
    });

    const partialBody = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1]?.body));
    const fullBody = JSON.parse(String((fetchMock.mock.calls[1] as unknown as [string, RequestInit])[1]?.body));

    expect(partialBody.receipt.items).toEqual([
      {
        description: "Tissot PRX T137",
        quantity: "1",
        amount: { value: "1500.00", currency: "RUB" },
        vat_code: 1,
        payment_subject: "commodity",
        payment_mode: "full_prepayment",
      },
    ]);
    expect(fullBody.receipt).toBeUndefined();
  });
});

describe("payment architecture integration invariants", () => {
  it("creates orders before provider payments and calculates payment amount from stored order total", () => {
    const repository = read("src/modules/commerce/infrastructure/commerce-repository.server.ts");

    expect(repository.indexOf(".from(\"orders\")\n    .insert(orderPayload)")).toBeLessThan(
      repository.indexOf("const payment = await createYooKassaPayment"),
    );
    expect(repository).toContain("amountMinor: orderRow.total_amount_minor");
    expect(repository).toContain("amountMinor: detail.order.total_amount_minor");
    expect(repository).not.toContain("amountMinor: input");
  });

  it("uses payment_attempt idempotency and reuses pending confirmation URLs", () => {
    const repository = read("src/modules/commerce/infrastructure/commerce-repository.server.ts");

    expect(repository).toContain("idempotency_key: idempotencyKey");
    expect(repository).toContain("paymentAttemptId: String(attempt.id)");
    expect(repository).toContain("reusableAttempt");
    expect(repository).toContain("attempt.confirmation_url");
  });

  it("does not let a return page mark orders paid without provider verification", () => {
    const returnPage = read("src/app/(shop)/checkout/return/page.tsx");

    expect(returnPage).toContain("reconcileYooKassaPayment(currentPayment)");
    expect(returnPage).not.toContain("markOrderPaid");
    expect(returnPage).not.toContain("payment_status: \"succeeded\"");
  });

  it("webhook verifies payment/refund status through YooKassa API and is idempotent", () => {
    const webhook = read("src/app/api/payments/yookassa/webhook/route.ts");
    const alias = read("src/app/api/webhooks/yookassa/route.ts");

    expect(webhook).toContain("reconcileYooKassaPayment(event.object.id)");
    expect(webhook).toContain("reconcileYooKassaRefund(event.object.id)");
    expect(webhook).toContain("existingEvent?.processing_result === \"processed\"");
    expect(alias).toContain("export { POST }");
  });

  it("mismatched provider amount cannot mark the order paid", () => {
    const repository = read("src/modules/commerce/infrastructure/commerce-repository.server.ts");

    expect(repository).toContain("YooKassa payment amount does not match the order");
    expect(repository.indexOf("YooKassa payment amount does not match the order")).toBeLessThan(
      repository.indexOf("await markOrderPaid"),
    );
    expect(repository).toContain("YooKassa refund amount does not match the stored refund");
  });

  it("full and partial refunds are admin-only, validated server-side, and idempotent per request", () => {
    const route = read("src/app/api/admin/orders/[orderNumber]/refund/route.ts");
    const repository = read("src/modules/commerce/infrastructure/commerce-repository.server.ts");
    const ui = read("src/components/commerce/order-actions.tsx");

    expect(route).toContain("await requireAdminAccess()");
    expect(route).toContain("refundRequestKey");
    expect(repository).toContain("amountMinor > refundableAmountMinor");
    expect(repository).toContain("idempotencyKey = input.refundRequestKey");
    expect(repository).toContain("buildPartialRefundReceiptItems");
    expect(repository).toContain("amountMinor === detail.order.total_amount_minor");
    expect(repository).toContain("partially_refunded");
    expect(repository).toContain("refunded");
    expect(ui).toContain("Полный возврат");
    expect(ui).toContain("Частичный возврат");
    expect(ui).toContain("window.confirm");
  });

  it("customer account shows payment/refund status but no customer refund button", () => {
    const ordersView = read("src/components/commerce/orders-view.tsx");

    expect(ordersView).toContain("detail.refunds");
    expect(ordersView).toContain("paymentStatusLabels");
    expect(ordersView).toContain("admin && detail.refunds.length");
    expect(ordersView).not.toContain("Запросить возврат");
  });

  it("YooKassa secret remains server-only and absent from client files", () => {
    const clientFiles = [
      "src/components/commerce/checkout-experience.tsx",
      "src/components/commerce/order-actions.tsx",
      "src/components/commerce/orders-view.tsx",
      "src/app/(shop)/checkout/page.tsx",
      "src/app/(shop)/checkout/return/page.tsx",
    ];

    for (const file of clientFiles) {
      expect(read(file)).not.toContain("YOOKASSA_SECRET_KEY");
      expect(read(file)).not.toContain("secretKey");
    }
    expect(read("src/modules/commerce/infrastructure/yookassa-client.server.ts")).toContain("server-only");
  });
});

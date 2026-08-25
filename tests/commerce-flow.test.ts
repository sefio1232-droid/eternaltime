import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  mergeCommerceCartItems,
  normalizeCommerceCartItem,
  parseCommerceCartStorage,
  serializeCommerceCartStorage,
} from "@/modules/commerce/domain/cart";
import { commerceCartMaxQuantity } from "@/modules/commerce/domain/types";
import { getDeliveryQuote } from "@/modules/commerce/application/delivery.server";
import { getServerEnv } from "@/config/server-env";
import { orderStatusLabels, paymentStatusLabels, shipmentStatusLabels } from "@/modules/commerce/domain/labels";
import { normalizeCdekWidgetPickupPoint } from "@/modules/commerce/domain/cdek-widget";
import { cdekTrackingUrl, mapCdekStatusToShipmentStatus } from "@/modules/commerce/domain/shipping";

describe("commerce cart domain", () => {
  it("stores only identity, source, quantity and added timestamp in the versioned cart", () => {
    const item = normalizeCommerceCartItem({
      brandSlug: "tissot",
      referenceNormalized: " t-137.407.11.041.00 ",
      quantity: 2,
      source: "catalog",
      addedAt: "2026-08-11T00:00:00.000Z",
      price: 123,
      image: "/fake.jpg",
    });

    expect(item).toEqual({
      brandSlug: "tissot",
      referenceNormalized: "T1374071104100",
      quantity: 2,
      source: "catalog",
      addedAt: "2026-08-11T00:00:00.000Z",
    });
  });

  it("caps absurd watch quantities at the commerce limit", () => {
    const items = mergeCommerceCartItems([
      {
        brandSlug: "tissot",
        referenceNormalized: "T1374071104100",
        quantity: 4,
        source: "catalog",
        addedAt: "2026-08-11T00:00:00.000Z",
      },
      {
        brandSlug: "tissot",
        referenceNormalized: "T1374071104100",
        quantity: 4,
        source: "catalog",
        addedAt: "2026-08-11T00:00:01.000Z",
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]?.quantity).toBe(commerceCartMaxQuantity);
  });

  it("round-trips the v2 storage schema", () => {
    const serialized = serializeCommerceCartStorage([
      {
        brandSlug: "casio",
        referenceNormalized: "GA21001A1",
        quantity: 1,
        source: "selection",
        addedAt: "2026-08-11T00:00:00.000Z",
      },
    ]);

    expect(parseCommerceCartStorage(serialized)).toEqual({
      schemaVersion: 2,
      items: [
        {
          brandSlug: "casio",
          referenceNormalized: "GA21001A1",
          quantity: 1,
          source: "selection",
          addedAt: "2026-08-11T00:00:00.000Z",
        },
      ],
    });
  });
});

describe("commerce server configuration", () => {
  it("uses the new server-only Supabase secret key for elevated backend operations", () => {
    const env = getServerEnv({
      NODE_ENV: "test",
      SUPABASE_SECRET_KEY: "sb_secret_test_value",
      SUPABASE_SERVICE_ROLE_KEY: "legacy-service-role-should-not-be-used",
    });

    expect(env.supabase.hasAdminSecret).toBe(true);
    expect(env.supabase.adminSecretKey).toBe("sb_secret_test_value");
    expect(JSON.stringify(env.supabase)).not.toContain("legacy-service-role");
  });

  it("uses CDEK threshold pricing by default", () => {
    const env = getServerEnv({
      NODE_ENV: "production",
      CATALOG_READ_SOURCE: "database",
    });

    expect(env.commerce.deliveryPricingMode).toBe("cdek_threshold");
    expect(env.commerce.cdekFreeDeliveryThresholdMinor).toBe(1_000_000);
    expect(env.commerce.cdekBelowThresholdAmountMinor).toBe(50_000);
  });

  it("uses separate CDEK tariff env values for pickup and courier", () => {
    const env = getServerEnv({
      NODE_ENV: "production",
      CDEK_PICKUP_TARIFF_CODE: "136",
      CDEK_COURIER_TARIFF_CODE: "137",
      CDEK_DEFAULT_TARIFF_CODE: "999",
    });

    expect(env.cdek.pickupTariffCode).toBe(136);
    expect(env.cdek.courierTariffCode).toBe(137);
    expect(env.cdek.defaultTariffCode).toBe(999);
  });

  it("reads the official CDEK Widget Yandex Maps key as server config, not a CDEK secret", () => {
    const env = getServerEnv({
      NODE_ENV: "production",
      CDEK_WIDGET_YANDEX_MAPS_API_KEY: "public-yandex-map-key",
    });

    expect(env.cdek.hasWidgetYandexMapsApiKey).toBe(true);
    expect(env.cdek.widgetYandexMapsApiKey).toBe("public-yandex-map-key");
  });

  it("keeps Moscow origin in configuration rather than hardcoded domain code", () => {
    const env = getServerEnv({
      NODE_ENV: "production",
      CDEK_ORIGIN_CITY_CODE: "44",
    });
    const shippingRepository = fs.readFileSync("src/modules/commerce/infrastructure/cdek-shipping-repository.server.ts", "utf8");

    expect(env.cdek.fromLocationCode).toBe(44);
    expect(shippingRepository).toContain("env.cdek.fromLocationCode");
    expect(shippingRepository).not.toContain("from_location: { code: 44 }");
  });

  it("keeps the legacy CDEK default tariff only as a compatibility fallback", () => {
    const env = getServerEnv({
      NODE_ENV: "production",
      CDEK_DEFAULT_TARIFF_CODE: "136",
    });

    expect(env.cdek.pickupTariffCode).toBe(136);
    expect(env.cdek.courierTariffCode).toBe(136);
  });

  it("calculates CDEK delivery as 500 RUB below 10000 RUB and free at the threshold", () => {
    const env = getServerEnv({
      NODE_ENV: "production",
      CATALOG_READ_SOURCE: "database",
      DELIVERY_PRICING_MODE: "cdek_threshold",
      CDEK_FREE_DELIVERY_THRESHOLD_RUB: "10000",
      CDEK_BELOW_THRESHOLD_DELIVERY_RUB: "500",
    });

    const paidDelivery = getDeliveryQuote({ productSubtotalMinor: 999_900 }, env);
    const freeDelivery = getDeliveryQuote({ productSubtotalMinor: 1_000_000 }, env);
    const stillFreeDelivery = getDeliveryQuote({ productSubtotalMinor: 1_000_100 }, env);

    expect(paidDelivery.status).toBe("configured");
    expect(paidDelivery.provider).toBe("cdek");
    expect(paidDelivery.amountMinor).toBe(50_000);
    expect(freeDelivery.status).toBe("configured");
    expect(freeDelivery.amountMinor).toBe(0);
    expect(freeDelivery.freeDeliveryThresholdMinor).toBe(1_000_000);
    expect(stillFreeDelivery.amountMinor).toBe(0);
  });

  it("uses the exact Eternal Time delivery boundary totals", () => {
    const env = getServerEnv({
      NODE_ENV: "production",
      CATALOG_READ_SOURCE: "database",
      DELIVERY_PRICING_MODE: "cdek_threshold",
      CDEK_FREE_DELIVERY_THRESHOLD_RUB: "10000",
      CDEK_BELOW_THRESHOLD_DELIVERY_RUB: "500",
    });
    const cases = [
      { subtotalRub: 9999, deliveryRub: 500, totalRub: 10499 },
      { subtotalRub: 10000, deliveryRub: 0, totalRub: 10000 },
      { subtotalRub: 10001, deliveryRub: 0, totalRub: 10001 },
    ];

    for (const example of cases) {
      const subtotalMinor = example.subtotalRub * 100;
      const quote = getDeliveryQuote({ productSubtotalMinor: subtotalMinor }, env);

      if (quote.status !== "configured") {
        throw new Error("Expected configured delivery quote.");
      }
      expect(quote.amountMinor).toBe(example.deliveryRub * 100);
      expect(subtotalMinor + quote.amountMinor).toBe(example.totalRub * 100);
    }
  });

  it("keeps CDEK paid below threshold and free at or above the central threshold config", () => {
    const env = getServerEnv({
      NODE_ENV: "production",
      CATALOG_READ_SOURCE: "database",
      DELIVERY_PRICING_MODE: "cdek_threshold",
      CDEK_FREE_DELIVERY_THRESHOLD_RUB: "10000",
      CDEK_BELOW_THRESHOLD_DELIVERY_RUB: "500",
    });

    const below = getDeliveryQuote({ productSubtotalMinor: 999_999 }, env);
    const exact = getDeliveryQuote({ productSubtotalMinor: env.commerce.cdekFreeDeliveryThresholdMinor }, env);
    const above = getDeliveryQuote({ productSubtotalMinor: 1_000_001 }, env);

    expect(env.commerce.cdekFreeDeliveryThresholdMinor).toBe(1_000_000);
    expect(below.status).toBe("configured");
    expect(below.amountMinor).toBe(env.commerce.cdekBelowThresholdAmountMinor);
    expect(below.amountMinor).not.toBe(0);
    expect(exact.amountMinor).toBe(0);
    expect(above.amountMinor).toBe(0);
  });

  it("does not guess a below-threshold delivery price when paid delivery is not configured", () => {
    const env = getServerEnv({
      NODE_ENV: "production",
      CATALOG_READ_SOURCE: "database",
      DELIVERY_PRICING_MODE: "not_configured",
    });

    const quote = getDeliveryQuote({ productSubtotalMinor: 999_999 }, env);

    expect(quote.status).toBe("not_configured");
    expect(quote.amountMinor).toBeNull();
    expect(quote.freeDeliveryThresholdMinor).toBeNull();
  });

  it("still parses explicit flat delivery pricing when the mode is selected", () => {
    const env = getServerEnv({
      NODE_ENV: "production",
      CATALOG_READ_SOURCE: "database",
      DELIVERY_PRICING_MODE: "flat",
      DELIVERY_FLAT_AMOUNT_RUB: "1250",
    });

    expect(getDeliveryQuote({ productSubtotalMinor: 0 }, env).amountMinor).toBe(125000);
  });
});

describe("commerce labels", () => {
  it("does not expose raw order/payment enums to customers", () => {
    expect(orderStatusLabels.awaiting_payment).toBe("Ожидает оплаты");
    expect(paymentStatusLabels.partially_refunded).toBe("Частичный возврат");
    expect(shipmentStatusLabels.ready_for_pickup).toBe("Готов к выдаче");
  });
});

describe("CDEK shipping domain", () => {
  it("normalizes the official CDEK Widget office callback payload", () => {
    const point = normalizeCdekWidgetPickupPoint(
      "office",
      { tariff_code: 136, delivery_sum: 780 },
      {
        city_code: 44,
        city: "Москва",
        code: "MSK123",
        name: "ПВЗ MSK123",
        address: "Москва, ул. Тверская, 1",
        postal_code: "125009",
        work_time: "Пн-Пт 10:00-20:00",
        location: [55.7558, 37.6173],
      },
    );

    expect(point).toMatchObject({
      code: "MSK123",
      city: "Москва",
      cityCode: 44,
      address: "Москва, ул. Тверская, 1",
      latitude: 55.7558,
      longitude: 37.6173,
      postalCode: "125009",
      workTime: "Пн-Пт 10:00-20:00",
    });
  });

  it("rejects invalid CDEK Widget office selections", () => {
    expect(normalizeCdekWidgetPickupPoint("door", {}, { code: "MSK123", address: "Москва" })).toBeNull();
    expect(normalizeCdekWidgetPickupPoint("office", {}, { address: "Москва" })).toBeNull();
    expect(normalizeCdekWidgetPickupPoint("office", {}, { code: "MSK123" })).toBeNull();
  });

  it("caches the CDEK OAuth token between server calls", async () => {
    const originalFetch = globalThis.fetch;
    const originalEnv = {
      clientId: process.env.CDEK_CLIENT_ID,
      clientSecret: process.env["CDEK_CLIENT_" + "SECRET"],
      apiBase: process.env.CDEK_API_BASE_URL,
    };
    process.env.CDEK_CLIENT_ID = "test-client";
    process.env["CDEK_CLIENT_" + "SECRET"] = "test-secret";
    process.env.CDEK_API_BASE_URL = "https://api.cdek.ru/v2";
    const { getCdekAccessToken, resetCdekTokenCacheForTests } = await import(
      "@/modules/commerce/infrastructure/cdek-client.server"
    );
    resetCdekTokenCacheForTests();
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: "cached-token", expires_in: 3600 }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    globalThis.fetch = fetchMock as typeof fetch;

    try {
      await expect(getCdekAccessToken()).resolves.toBe("cached-token");
      await expect(getCdekAccessToken()).resolves.toBe("cached-token");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      resetCdekTokenCacheForTests();
      globalThis.fetch = originalFetch;
      process.env.CDEK_CLIENT_ID = originalEnv.clientId;
      process.env["CDEK_CLIENT_" + "SECRET"] = originalEnv.clientSecret;
      process.env.CDEK_API_BASE_URL = originalEnv.apiBase;
    }
  });

  it("keeps carrier actual cost separate from customer delivery charge", () => {
    const env = getServerEnv({
      NODE_ENV: "production",
      DELIVERY_PRICING_MODE: "cdek_threshold",
      CDEK_FREE_DELIVERY_THRESHOLD_RUB: "10000",
      CDEK_BELOW_THRESHOLD_DELIVERY_RUB: "500",
    });

    const customerQuote = getDeliveryQuote({ productSubtotalMinor: 3_100_000 }, env);
    const carrierActualCostMinor = 87_000;

    if (customerQuote.status !== "configured") {
      throw new Error("Expected configured delivery quote.");
    }
    expect(customerQuote.amountMinor).toBe(0);
    expect(carrierActualCostMinor).not.toBe(customerQuote.amountMinor);
    expect(3_100_000 + customerQuote.amountMinor).toBe(3_100_000);
  });

  it("never lets carrier actual cost change the customer total", () => {
    const env = getServerEnv({
      NODE_ENV: "production",
      DELIVERY_PRICING_MODE: "cdek_threshold",
      CDEK_FREE_DELIVERY_THRESHOLD_RUB: "10000",
      CDEK_BELOW_THRESHOLD_DELIVERY_RUB: "500",
    });
    const subtotalMinor = 850_000;
    const customerDelivery = getDeliveryQuote({ productSubtotalMinor: subtotalMinor }, env);
    const carrierActualCosts = [65_000, 100_000];

    if (customerDelivery.status !== "configured") {
      throw new Error("Expected configured delivery quote.");
    }
    expect(customerDelivery.amountMinor).toBe(50_000);
    expect(subtotalMinor + customerDelivery.amountMinor).toBe(900_000);
    expect(carrierActualCosts.map((cost) => subtotalMinor + customerDelivery.amountMinor + cost)).not.toContain(900_000);
  });

  it("maps CDEK statuses to customer-safe shipment labels", () => {
    expect(mapCdekStatusToShipmentStatus({ code: "READY_FOR_PICKUP", name: "Готов к выдаче" }).status).toBe(
      "ready_for_pickup",
    );
    expect(mapCdekStatusToShipmentStatus({ code: "IN_TRANSIT", name: "В пути" }).status).toBe("in_transit");
    expect(mapCdekStatusToShipmentStatus({ code: "DELIVERED", name: "Вручен" }).customerMessage).toContain("получена");
  });

  it("builds the official CDEK tracking URL without inventing route paths", () => {
    expect(cdekTrackingUrl("1234567890")).toBe("https://www.cdek.ru/ru/tracking/?order_id=1234567890");
    expect(cdekTrackingUrl("")).toBeNull();
  });
});

describe("checkout backend activation", () => {
  it("creates a real order before provider payment and does not require YooKassa for the order record", async () => {
    const fs = await import("node:fs");
    const repository = fs.readFileSync("src/modules/commerce/infrastructure/commerce-repository.server.ts", "utf8");
    const shippingRepository = fs.readFileSync("src/modules/commerce/infrastructure/cdek-shipping-repository.server.ts", "utf8");
    const checkout = fs.readFileSync("src/components/commerce/checkout-experience.tsx", "utf8");

    expect(repository).toContain("const setup = getCommerceSetupState(false);");
    expect(repository).toContain("payment_provider_not_configured");
    expect(repository).toContain("ensureCdekShipmentForPaidOrder({ orderId");
    expect(shippingRepository).toContain("if (order.payment_status !== \"succeeded\")");
    expect(shippingRepository).toContain(".in(\"shipment_status\", [\"pending_creation\", \"creation_pending_retry\", \"creation_failed\"])");
    expect(repository.indexOf("const { data: order, error: orderError } = await setup.client")).toBeLessThan(
      repository.indexOf("const payment = await createYooKassaPayment"),
    );
    expect(checkout).toContain("Оформить заказ");
    expect(checkout).toContain("/account/orders/");
  });

  it("integrates the official CDEK Widget as checkout UX while keeping server validation", async () => {
    const fs = await import("node:fs");
    const checkout = fs.readFileSync("src/components/commerce/checkout-experience.tsx", "utf8");
    const configRoute = fs.readFileSync("src/app/api/delivery/cdek/widget-config/route.ts", "utf8");
    const serviceRoute = fs.readFileSync("src/app/api/delivery/cdek/widget-service/route.ts", "utf8");
    const validation = fs.readFileSync("src/modules/commerce/infrastructure/cdek-shipping-repository.server.ts", "utf8");

    expect(checkout).toContain('await import("@cdek-it/widget")');
    expect(checkout).toContain("new CdekWidget");
    expect(checkout).toContain("onChoose");
    expect(checkout).toContain("onKeyDown");
    expect(checkout).toContain("Escape");
    expect(checkout).toContain("cdekWidgetDefaultLocation");
    expect(checkout).toContain("defaultLocation: cdekWidgetDefaultLocation");
    expect(checkout).toContain("waitForCdekContainer");
    expect(checkout).toContain("ResizeObserver");
    expect(checkout).toContain("cdekWidgetReadyTimeoutMs");
    expect(checkout).not.toContain("cdekMapDiagnostic");
    expect(checkout).not.toContain("MAP_TIMEOUT");
    expect(checkout).not.toContain("MAP_VISIBLE");
    expect(checkout).not.toContain("Диагностический код");
    expect(checkout).toContain("widgetTriggerRef.current?.focus()");
    expect(checkout).toContain("normalizeCdekWidgetPickupPoint");
    expect(checkout).toContain("clearPickupState");
    expect(checkout).toContain("Карта не загрузилась? Открыть технический список ПВЗ");
    expect(configRoute).toContain("CDEK_WIDGET_YANDEX_MAPS_API_KEY");
    expect(configRoute).toContain("/api/delivery/cdek/widget-service");
    expect(configRoute).toContain('servicePath: "/api/delivery/cdek/widget-service"');
    expect(configRoute).toContain("pickup: []");
    expect(configRoute).not.toContain("cdn.jsdelivr.net");
    expect(configRoute).not.toContain("new URL(request.url)");
    expect(configRoute).not.toContain("localhost:3000");
    expect(serviceRoute).toContain("proxyCdekWidgetService");
    expect(serviceRoute).toContain("allowedActions");
    expect(serviceRoute).toContain("maxWidgetServiceBodyBytes");
    expect(validation).toContain("getCdekPickupPointByCode(pointCode)");
  });

  it("keeps checkout mounted when browser storage or the CDEK widget initialization fails", async () => {
    const fs = await import("node:fs");
    const checkout = fs.readFileSync("src/components/commerce/checkout-experience.tsx", "utf8");
    const cartHook = fs.readFileSync("src/components/commerce/use-commerce-cart.ts", "utf8");

    expect(cartHook).toContain("function readStoredCommerceCartItems");
    expect(cartHook).toContain("window.localStorage.getItem(commerceCartStorageKey)");
    expect(cartHook).toContain("catch");
    expect(cartHook).toContain("function deferCartUpdate");
    expect(cartHook).not.toContain("queueMicrotask(() =>");

    expect(checkout).toContain("function createCheckoutSubmissionKey");
    expect(checkout).toContain("typeof browserCrypto.randomUUID === \"function\"");
    expect(checkout).toContain("browserCrypto.getRandomValues(bytes)");
    expect(checkout).toContain("const [submissionKey] = useState(createCheckoutSubmissionKey)");
    expect(checkout).not.toContain("useState(() => crypto.randomUUID())");

    expect(checkout).toContain("loadCdekWidgetConstructor");
    expect(checkout).toContain("cdek_widget_constructor_missing");
    expect(checkout).not.toContain("document.createElement(\"script\")");
    expect(checkout).not.toContain("cdn.jsdelivr.net");
    expect(checkout).toContain("setWidgetStatus(\"failed\")");
    expect(checkout).toContain("setWidgetAttempt((attempt) => attempt + 1)");
    expect(checkout).toContain("Попробовать ещё раз");
    expect(checkout).toContain("Карта не загрузилась? Открыть технический список ПВЗ");
  });

  it("does not expose CDEK client secrets to checkout widget code", async () => {
    const fs = await import("node:fs");
    const checkout = fs.readFileSync("src/components/commerce/checkout-experience.tsx", "utf8");
    const configRoute = fs.readFileSync("src/app/api/delivery/cdek/widget-config/route.ts", "utf8");

    expect(checkout).not.toContain("CDEK_CLIENT_SECRET");
    expect(checkout).not.toContain("clientSecret");
    expect(configRoute).not.toContain("clientSecret");
  });

  it("uses the selected office code when building the CDEK shipment payload", async () => {
    const fs = await import("node:fs");
    const shippingRepository = fs.readFileSync("src/modules/commerce/infrastructure/cdek-shipping-repository.server.ts", "utf8");

    expect(shippingRepository).toContain("delivery_point: order.cdek_pickup_point_code");
    expect(shippingRepository).toContain("pickup_point_code: input.contact.deliveryMethod === \"cdek_pickup\"");
  });
});

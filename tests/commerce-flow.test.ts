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
import { orderStatusLabels, paymentStatusLabels } from "@/modules/commerce/domain/labels";

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
  it("uses CDEK threshold pricing by default", () => {
    const env = getServerEnv({
      NODE_ENV: "production",
      CATALOG_READ_SOURCE: "database",
    });

    expect(env.commerce.deliveryPricingMode).toBe("cdek_threshold");
    expect(env.commerce.cdekFreeDeliveryThresholdMinor).toBe(1_000_000);
    expect(env.commerce.cdekBelowThresholdAmountMinor).toBe(50_000);
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

    expect(paidDelivery.status).toBe("configured");
    expect(paidDelivery.provider).toBe("cdek");
    expect(paidDelivery.amountMinor).toBe(50_000);
    expect(freeDelivery.status).toBe("configured");
    expect(freeDelivery.amountMinor).toBe(0);
    expect(freeDelivery.freeDeliveryThresholdMinor).toBe(1_000_000);
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
  });
});

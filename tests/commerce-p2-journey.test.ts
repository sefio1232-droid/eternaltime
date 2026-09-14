import fs from "node:fs";
import { describe, expect, it } from "vitest";

import { createMoney } from "@/modules/catalog/domain/money";
import { getPublicCommerceState } from "@/modules/commerce/domain/public-commerce-state";

function read(path: string): string {
  return fs.readFileSync(path, "utf8");
}

describe("P2 public commerce state", () => {
  it("allows purchase only for a visible active orderable RUB offer", () => {
    const state = getPublicCommerceState({
      publicPrice: createMoney(120_000, "RUB"),
      offer: {
        status: "active",
        isVisible: true,
        currentPriceMinor: 120_000,
        currencyCode: "RUB",
        inventoryIsOrderable: true,
      },
    });

    expect(state.kind).toBe("purchasable");
    expect(state.priceVisible).toBe(true);
    expect(state.buyNowAllowed).toBe(true);
    expect(state.publicLabel).toBe("Можно заказать");
  });

  it("does not make a watch purchasable from price alone", () => {
    const state = getPublicCommerceState({
      publicPrice: createMoney(120_000, "RUB"),
    });

    expect(state.kind).toBe("catalog_only");
    expect(state.priceVisible).toBe(false);
    expect(state.buyNowAllowed).toBe(false);
  });

  it("keeps unavailable offers visible without purchase CTAs or fake price", () => {
    const state = getPublicCommerceState({
      publicPrice: createMoney(120_000, "RUB"),
      offer: {
        status: "active",
        isVisible: true,
        currentPriceMinor: 120_000,
        currencyCode: "RUB",
        inventoryIsOrderable: false,
      },
    });

    expect(state.kind).toBe("temporarily_unavailable");
    expect(state.priceVisible).toBe(false);
    expect(state.buyNowAllowed).toBe(false);
    expect(state.publicLabel).toBe("Сейчас недоступно для заказа");
  });

  it("preserves the explicit legacy public read-model bridge without turning raw price into a rule", () => {
    const state = getPublicCommerceState({
      publicPrice: createMoney(120_000, "RUB"),
      publicReadModelPurchasable: true,
    });

    expect(state.kind).toBe("purchasable");
    expect(state.reason).toBe("legacy_public_read_model");
  });
});

describe("P2 cross-surface commerce consistency", () => {
  it("routes catalog/detail/selection/compare/cart/checkout through the shared commerce state", () => {
    expect(read("src/components/catalog/catalog-watch-card.tsx")).toContain("getPublicCommerceState");
    expect(read("src/components/catalog/catalog-watch-detail-page.tsx")).toContain("getPublicCommerceState");
    expect(read("src/modules/selection/application/selection-service.ts")).toContain("commerceRank");
    expect(read("src/components/selection/selection-page.tsx")).toContain("getPublicCommerceState");
    expect(read("src/modules/comparison/application/comparison-presentation.ts")).toContain("commerce-state");
    expect(read("src/modules/commerce/application/catalog-product-resolver.server.ts")).toContain("publicCommerceState.purchaseAllowed");
    expect(read("src/components/commerce/checkout-experience.tsx")).toContain("Некоторые позиции сейчас нельзя оформить");
  });

  it("prevents stale purchase buttons and fake structured-data offers", () => {
    const card = read("src/components/catalog/catalog-watch-card.tsx");
    const detail = read("src/components/catalog/catalog-watch-detail-page.tsx");
    const productPage = read("src/app/(shop)/watches/[brandSlug]/[referenceSlug]/page.tsx");
    const databaseAdapter = read("src/modules/catalog/infrastructure/database-catalog-adapter.server.ts");

    expect(card).not.toContain("Boolean(watch.publicPrice)");
    expect(detail).not.toContain("Boolean(watch.publicPrice)");
    expect(productPage).toContain("commerceState.kind === \"purchasable\"");
    expect(productPage).toContain("https://schema.org/PreOrder");
    expect(databaseAdapter).toContain("const chunkSize = 100");
    expect(databaseAdapter).toContain('.eq("is_visible", true)');
    expect(databaseAdapter).toContain("allowLegacyReadModelPurchasable = offersByReference.size === 0");
  });

  it("keeps checkout/cart errors customer-safe", () => {
    const route = read("src/app/api/checkout/orders/route.ts");
    const cart = read("src/components/cart/cart-experience.tsx");

    expect(route).toContain("checkout_order_failed");
    expect(route).toContain("Не удалось оформить заказ");
    expect(route).not.toContain("message,");
    expect(cart).toContain("Эта модель сейчас недоступна для заказа");
    expect(cart).not.toContain("aria-disabled={!summary?.purchasable}");
  });
});

describe("P2 guest claim and purchase-to-collection invariants", () => {
  it("requires authenticated user plus valid guest authorization for claim", () => {
    const route = read("src/app/api/orders/[orderNumber]/claim/route.ts");
    const repository = read("src/modules/commerce/infrastructure/commerce-repository.server.ts");

    expect(route).toContain("auth.status !== \"authenticated\"");
    expect(route).toContain("guestOrderAccessCookieName");
    expect(repository).toContain("getOrderDetailByNumber(input.orderNumber, { guestAccessCookie");
    expect(repository).toContain(".is(\"user_id\", null)");
    expect(repository).not.toContain("contact_email ===");
    expect(repository).not.toContain("eq(\"contact_email\"");
  });

  it("is idempotent and denies already claimed orders owned by another user", () => {
    const repository = read("src/modules/commerce/infrastructure/commerce-repository.server.ts");

    expect(repository).toContain("ownedDetail?.order.user_id === input.userId");
    expect(repository).toContain("alreadyClaimed: true");
    expect(repository).toContain("throw new Error(\"order_claim_denied\")");
    expect(repository).toContain("source_order_item_id");
  });

  it("creates collection watches only for delivered linked orders and only once", () => {
    const repository = read("src/modules/commerce/infrastructure/commerce-repository.server.ts");

    expect(repository).toContain("detail.order.status === \"completed\"");
    expect(repository).toContain("shipment.shipment_status === \"delivered\"");
    expect(repository).toContain("if (!detail || detail.order.user_id !== input.userId)");
    expect(repository).toContain("return { created: 0, existing: 0, skipped: detail.items.length }");
    expect(repository).toContain(".eq(\"source_order_item_id\", item.id)");
    expect(repository).toContain("acquisition_source: \"purchase\"");
    expect(repository).toContain("source_kind: \"catalog\"");
  });

  it("syncs delivered purchase ownership from both admin completion and later guest claim", () => {
    const repository = read("src/modules/commerce/infrastructure/commerce-repository.server.ts");

    expect(repository).toContain("input.nextStatus === \"completed\" && detail.order.user_id");
    expect(repository).toContain("ownership: await ensureDeliveredOrderItemsInCollection");
  });
});

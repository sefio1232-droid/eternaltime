import { afterEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import React from "react";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import type { CommerceProductSnapshot, CommerceResolvedLine, CommerceResolvedSummary } from "@/modules/commerce/domain/types";
import { commerceCartStorageKey } from "@/modules/commerce/domain/types";

const routerPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; children: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
}));

function installDom() {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", {
    url: "https://eternaltime.shop/checkout",
  });

  Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
  Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  Object.defineProperty(globalThis, "localStorage", { value: dom.window.localStorage, configurable: true });
  Object.defineProperty(globalThis, "Event", { value: dom.window.Event, configurable: true });
  Object.defineProperty(globalThis, "HTMLButtonElement", { value: dom.window.HTMLButtonElement, configurable: true });
  Object.defineProperty(globalThis, "HTMLElement", { value: dom.window.HTMLElement, configurable: true });
}

function product(overrides: Record<string, unknown> = {}): CommerceProductSnapshot {
  const base: CommerceProductSnapshot = {
    brandSlug: "casio",
    referenceNormalized: "a168wa1w",
    referenceDisplay: "A168WA-1W",
    referenceSlug: "a168wa1w",
    brandName: "Casio",
    displayName: "Casio A168WA-1W",
    canonicalHref: "/watches/casio/a168wa1w",
    image: {
      kind: "none",
      alt: "Casio A168WA-1W",
    },
    publicPrice: {
      amountMinor: 1_200_000,
      currencyCode: "RUB",
    },
    purchasable: true,
  };

  return { ...base, ...overrides } as CommerceProductSnapshot;
}

function cartLine(overrides: Partial<CommerceResolvedLine> = {}): CommerceResolvedLine {
  const lineProduct = product();
  return {
    input: {
      brandSlug: "casio",
      referenceNormalized: "a168wa1w",
      quantity: 1,
      source: "catalog",
      addedAt: "2026-08-24T00:00:00.000Z",
    },
    product: lineProduct,
    quantity: 1,
    unitPrice: lineProduct.publicPrice,
    lineTotalMinor: 1_200_000,
    issue: null,
    ...overrides,
  };
}

function summary(overrides: Partial<CommerceResolvedSummary> = {}): CommerceResolvedSummary {
  return {
    lines: [cartLine()],
    productSubtotalMinor: 1_200_000,
    delivery: {
      status: "configured",
      provider: "cdek",
      method: "courier",
      label: "Доставка СДЭК",
      amountMinor: 0,
      currencyCode: "RUB",
      tariffCode: "137",
      freeDeliveryThresholdMinor: 1_000_000,
      snapshot: {},
    },
    totalAmountMinor: 1_200_000,
    currencyCode: "RUB",
    itemCount: 1,
    purchasable: true,
    issues: [],
    ...overrides,
  };
}

async function renderCheckout(options: {
  source?: "cart" | "buy_now";
  storage?: string;
  summaryPayload?: CommerceResolvedSummary;
  widgetConfig?: Record<string, unknown>;
} = {}) {
  installDom();
  window.CDEKWidget = class {
    constructor(options: { onReady?: () => void }) {
      options.onReady?.();
    }
  };
  window.localStorage.setItem(
    commerceCartStorageKey,
    options.storage ??
      JSON.stringify({
        schemaVersion: 2,
        items: [
          {
            brandSlug: "casio",
            referenceNormalized: "A168WA-1W",
            quantity: 1,
            source: "catalog",
            addedAt: "2026-08-24T00:00:00.000Z",
          },
        ],
      }),
  );

  const responseSummary = options.summaryPayload ?? summary();
  const widgetConfig =
    options.widgetConfig ?? {
      ready: true,
      apiKey: "public-test-key",
      servicePath: "/api/delivery/cdek/widget-service",
      from: { country_code: "RU", code: 44 },
      tariffs: { office: [136], door: [137] },
      goods: [{ width: 18, height: 12, length: 25, weight: 700 }],
    };

  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/api/cart/resolve")) {
      return Response.json({ summary: responseSummary });
    }
    if (url.includes("/api/delivery/cdek/widget-config")) {
      return Response.json(widgetConfig);
    }
    return Response.json({}, { status: 404 });
  }) as typeof fetch;

  const { CheckoutExperience } = await import("@/components/commerce/checkout-experience");
  const source =
    options.source === "buy_now"
      ? {
          type: "buy_now" as const,
          item: {
            brandSlug: "casio",
            referenceNormalized: "a168wa1w",
            quantity: 1,
            source: "buy_now" as const,
            addedAt: "2026-08-24T00:00:00.000Z",
          },
        }
      : { type: "cart" as const, items: [] };

  return render(React.createElement(CheckoutExperience, { source, userEmail: "buyer@example.com" }));
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  routerPush.mockReset();
});

describe("checkout client render", () => {
  it("renders the authenticated checkout with a valid restored cart", async () => {
    const view = await renderCheckout();

    await waitFor(() => expect(view.getByText("Casio A168WA-1W")).toBeTruthy());
    expect(view.getByRole("button", { name: "Оформить заказ" })).toBeTruthy();
  });

  it("does not crash on an empty or malformed legacy cart", async () => {
    const view = await renderCheckout({
      storage: JSON.stringify({
        schemaVersion: 1,
        items: [{ bad: true }, null, { brandSlug: "", referenceNormalized: null }],
      }),
      summaryPayload: summary({ lines: [], productSubtotalMinor: 0, totalAmountMinor: null, itemCount: 0, purchasable: false }),
    });

    expect(view.getByRole("button", { name: "Оформить заказ" })).toBeTruthy();
  });

  it("does not crash when the resolved product is unavailable", async () => {
    const view = await renderCheckout({
      summaryPayload: summary({
        lines: [
          cartLine({
            input: {
              brandSlug: "casio",
              referenceNormalized: "deleted",
              quantity: 1,
              source: "catalog",
              addedAt: "2026-08-24T00:00:00.000Z",
            },
            product: null,
            unitPrice: null,
            lineTotalMinor: null,
            issue: "not_found",
          }),
        ],
        productSubtotalMinor: 0,
        totalAmountMinor: null,
        itemCount: 1,
        purchasable: false,
        issues: ["Модель не найдена."],
      }),
    });

    await waitFor(() => expect(view.getByText("Модель не найдена.")).toBeTruthy());
  });

  it("does not crash when optional product media is missing from the resolved cart", async () => {
    const view = await renderCheckout({
      summaryPayload: summary({
        lines: [cartLine({ product: product({ image: undefined }) })],
      }),
    });

    await waitFor(() => expect(view.getByText("Casio A168WA-1W")).toBeTruthy());
    expect(view.getByRole("img", { name: "Изображение часов недоступно" })).toBeTruthy();
  });

  it("isolates CDEK widget config failure from the checkout", async () => {
    const view = await renderCheckout({
      widgetConfig: {
        ready: false,
        reason: "not_configured",
        message: "Не удалось загрузить карту пунктов выдачи. Попробуйте ещё раз.",
      },
    });

    fireEvent.click(await view.findByRole("button", { name: "Пункт выдачи СДЭК" }));
    fireEvent.click(view.getByRole("button", { name: "Выбрать пункт на карте" }));

    await waitFor(() => expect(view.getByText("Не удалось загрузить карту пунктов выдачи. Попробуйте ещё раз.")).toBeTruthy());
    expect(view.getByRole("button", { name: "Оформить заказ" })).toBeTruthy();
  });

  it("isolates CDEK widget constructor exceptions from the checkout", async () => {
    const view = await renderCheckout();
    window.CDEKWidget = class {
      constructor() {
        throw new Error("widget exploded");
      }
    };

    fireEvent.click(await view.findByRole("button", { name: "Пункт выдачи СДЭК" }));
    fireEvent.click(view.getByRole("button", { name: "Выбрать пункт на карте" }));

    await waitFor(() => expect(view.getByText(/Не удалось загрузить карту СДЭК/)).toBeTruthy());
    expect(view.getByRole("button", { name: "Оформить заказ" })).toBeTruthy();
  });

  it("uses the bundled CDEK widget constructor without injecting a third-party script", async () => {
    const view = await renderCheckout();
    const appendChild = vi.spyOn(document.head, "appendChild");

    fireEvent.click(await view.findByRole("button", { name: "Пункт выдачи СДЭК" }));
    fireEvent.click(view.getByRole("button", { name: "Выбрать пункт на карте" }));

    await waitFor(() => expect(view.queryByText(/Не удалось загрузить карту СДЭК/)).toBeNull());
    expect(view.getByRole("button", { name: "Оформить заказ" })).toBeTruthy();
    expect(appendChild).not.toHaveBeenCalled();
  });
});

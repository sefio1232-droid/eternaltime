import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  AnalyticsEventValidationError,
  analyticsEventNames,
  validateAnalyticsEvent,
} from "@/modules/analytics/domain/events";

function read(path: string): string {
  return readFileSync(path, "utf8");
}

const sessionId = "11111111-1111-4111-8111-111111111111";

describe("P4 first-party analytics validation", () => {
  it("accepts a valid typed funnel event", () => {
    expect(validateAnalyticsEvent({
      eventName: "watch_view",
      sessionId,
      pathname: "/watches/tissot/t1374073305100",
      properties: {
        brand: "Tissot",
        reference: "T137.407.33.051.00",
        commerce_state: "purchasable",
      },
    })).toMatchObject({
      eventName: "watch_view",
      sessionId,
      pathname: "/watches/tissot/t1374073305100",
    });
  });

  it("rejects unknown events and invalid sessions", () => {
    expect(() => validateAnalyticsEvent({ eventName: "purchase", sessionId, properties: {} }))
      .toThrowError(AnalyticsEventValidationError);
    expect(() => validateAnalyticsEvent({ eventName: "home_view", sessionId: "not-a-uuid", properties: {} }))
      .toThrowError(AnalyticsEventValidationError);
  });

  it("rejects oversized properties and PII", () => {
    expect(() => validateAnalyticsEvent({
      eventName: "catalog_view",
      sessionId,
      properties: { query: "x".repeat(5000) },
    })).toThrowError(AnalyticsEventValidationError);

    expect(() => validateAnalyticsEvent({
      eventName: "journal_article_view",
      sessionId,
      properties: { article_slug: "safe-slug", email: "buyer@example.com" },
    })).toThrowError(AnalyticsEventValidationError);

    expect(() => validateAnalyticsEvent({
      eventName: "checkout_validation_failed",
      sessionId,
      properties: { phone: "+7 938 477-52-53" },
    })).toThrowError(AnalyticsEventValidationError);
  });

  it("uses a closed event vocabulary without fake purchase", () => {
    expect(analyticsEventNames).toContain("order_created");
    expect(analyticsEventNames).toContain("journal_product_click");
    expect(analyticsEventNames).not.toContain("purchase");
  });

  it("keeps P5 catalog filter instrumentation inside the existing DB-safe event vocabulary", () => {
    expect(validateAnalyticsEvent({
      eventName: "catalog_filter_changed",
      sessionId,
      pathname: "/watches",
      properties: { action: "applied", filter: "panel", value: "4" },
    })).toMatchObject({ eventName: "catalog_filter_changed" });
    expect(validateAnalyticsEvent({
      eventName: "catalog_filter_changed",
      sessionId,
      pathname: "/watches",
      properties: { action: "changed", filter: "availability", value: "1" },
    })).toMatchObject({ eventName: "catalog_filter_changed" });
  });
});

describe("P4 analytics integration", () => {
  it("stores analytics through server-only infrastructure and keeps browser reads closed", () => {
    const migration = read("supabase/migrations/20260915120000_first_party_analytics.sql");
    const route = read("src/app/api/analytics/events/route.ts");
    const adminPage = read("src/app/(admin)/admin/analytics/page.tsx");
    const adminLayout = read("src/app/(admin)/admin/layout.tsx");

    expect(migration).toContain("create table if not exists public.analytics_events");
    expect(migration).toContain("alter table public.analytics_events enable row level security");
    expect(migration).toContain("revoke all on table public.analytics_events from anon");
    expect(migration).toContain("revoke all on table public.analytics_events from authenticated");
    expect(route).toContain("validateAnalyticsEvent");
    expect(route).toContain("recordAnalyticsEvent");
    expect(adminLayout).toContain("requireAdminAccess");
    expect(adminPage).toContain("buildAnalyticsReport");
    expect(adminPage).toContain("Недостаточно данных");
  });

  it("tracks required funnel events without blocking commerce UX", () => {
    expect(read("src/app/(shop)/watches/[brandSlug]/[referenceSlug]/page.tsx")).toContain("eventName=\"watch_view\"");
    expect(read("src/components/candidates/candidate-action.tsx")).toContain("analyticsSessionId");
    expect(read("src/components/commerce/commerce-actions.tsx")).toContain("trackAnalyticsEvent(\"add_to_cart\"");
    expect(read("src/components/commerce/checkout-experience.tsx")).toContain("trackAnalyticsEvent(\"checkout_started\"");
    expect(read("src/app/api/checkout/orders/route.ts")).toContain("eventName: \"order_created\"");
    expect(read("src/app/(public)/journal/[slug]/page.tsx")).toContain("eventName=\"journal_article_view\"");
    expect(read("src/components/journal/editorial-watch-plate.tsx")).toContain("eventName=\"journal_product_click\"");
  });
});

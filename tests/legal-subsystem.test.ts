import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCheckoutOrderSchema } from "@/modules/commerce/application/checkout-validation";
import { legalDocuments, legalRoutes } from "@/content/legal";

const projectRoot = path.resolve(__dirname, "..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

const expectedSlugs = [
  "privacy",
  "personal-data-consent",
  "cookies",
  "terms",
  "returns",
  "delivery-and-payment",
  "marketing-consent",
  "seller-details",
  "public-offer",
];

describe("legal subsystem", () => {
  it("publishes the complete canonical legal registry with unique slugs and titles", () => {
    expect(legalDocuments).toHaveLength(9);
    expect(new Set(legalDocuments.map((document) => document.slug)).size).toBe(legalDocuments.length);
    expect(legalDocuments.map((document) => document.slug).sort()).toEqual([...expectedSlugs].sort());

    for (const document of legalDocuments) {
      expect(document.title).toBeTruthy();
      expect(document.sourceFileName).toContain("EternalTime_");
      expect(document.sourceFileName).toMatch(/\.docx$/);
      expect(document.route).toBe(`/legal/${document.slug}`);
      expect(document.blocks.length).toBeGreaterThan(0);
      expect(document.contentText).toContain(document.documentTitle);
    }
  });

  it("has real public app routes for the legal center and each document", () => {
    expect(existsSync(path.join(projectRoot, "src/app/(public)/legal/page.tsx"))).toBe(true);
    expect(existsSync(path.join(projectRoot, "src/app/(public)/legal/[slug]/page.tsx"))).toBe(true);
    expect(legalRoutes).toEqual(legalDocuments.map((document) => document.route));
  });

  it("integrates canonical legal links into footer, login, profile and checkout surfaces", () => {
    const footer = readSrc("src/components/shell/public-shell.tsx");
    const checkout = readSrc("src/components/commerce/checkout-experience.tsx");
    const login = readSrc("src/app/(public)/login/page.tsx");
    const loginAction = readSrc("src/app/(public)/login/actions.ts");
    const profile = readSrc("src/components/account/account-foundation.tsx");

    expect(footer).toContain('href="/legal"');
    expect(footer).toContain("legalDocuments");
    for (const slug of ["seller-details", "public-offer", "privacy", "terms", "returns", "delivery-and-payment"]) {
      expect(footer).toContain(slug);
    }
    for (const href of ["/legal/public-offer", "/legal/personal-data-consent", "/legal/privacy", "/legal/marketing-consent"]) {
      expect(checkout).toContain(href);
    }
    expect(login).toContain("/legal/personal-data-consent");
    expect(login).toContain("/legal/privacy");
    expect(loginAction).toContain("personalDataConsentAccepted");
    expect(profile).toContain("/legal/privacy");
    expect(profile).toContain("/legal/personal-data-consent");
  });

  it("requires checkout legal consents server-side and keeps marketing opt-in optional", () => {
    const validPayload = {
      checkoutSubmissionKey: "11111111-1111-4111-8111-111111111111",
      source: {
        type: "cart",
        items: [{ brandSlug: "tissot", referenceNormalized: "abc", quantity: 1, source: "catalog", addedAt: "2026-08-15T00:00:00.000Z" }],
      },
      contact: {
        recipientName: "Иван Иванов",
        phone: "+79999999999",
        email: "buyer@example.com",
        deliveryMethod: "cdek_courier",
        city: "Москва",
        postalCode: "101000",
        street: "Тверская",
        house: "1",
        legalOfferAccepted: true,
        personalDataConsentAccepted: true,
      },
    };

    expect(createCheckoutOrderSchema.safeParse(validPayload).success).toBe(true);
    expect(createCheckoutOrderSchema.safeParse({
      ...validPayload,
      contact: { ...validPayload.contact, legalOfferAccepted: false },
    }).success).toBe(false);
    expect(createCheckoutOrderSchema.safeParse({
      ...validPayload,
      contact: { ...validPayload.contact, personalDataConsentAccepted: false },
    }).success).toBe(false);
  });

  it("adds legal routes to sitemap and avoids localhost, filesystem and placeholder legal links", () => {
    const sitemap = readSrc("src/app/sitemap.ts");
    const generated = readSrc("src/content/legal/legal-documents.generated.json");
    const legalPages = [
      readSrc("src/app/(public)/legal/page.tsx"),
      readSrc("src/app/(public)/legal/[slug]/page.tsx"),
      readSrc("src/app/(public)/legal/legal.module.css"),
    ].join("\n");

    expect(sitemap).toContain("legalRoutes");
    expect(sitemap).toContain("changeFrequency: \"yearly\"");
    expect(`${generated}\n${legalPages}`).not.toMatch(/localhost|127\.0\.0\.1|C:\\\\Users|href=["']#|file:\/\//i);
  });
});

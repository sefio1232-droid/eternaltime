import { describe, expect, it } from "vitest";
import { createMoney } from "@/modules/catalog/domain/money";
import { assertScoreRange } from "@/modules/catalog/domain/score";
import { isCatalogSlug, slugifyCatalogText } from "@/modules/catalog/domain/slug";

describe("catalog domain invariants", () => {
  it("validates integer minor-unit money", () => {
    expect(createMoney(125000, "RUB")).toEqual({ amountMinor: 125000, currencyCode: "RUB" });
    expect(() => createMoney(12.5, "RUB")).toThrow("Money amount must be a non-negative integer");
    expect(() => createMoney(100, "rub")).toThrow("Currency code must be an uppercase");
  });

  it("validates score ranges", () => {
    expect(assertScoreRange(0, "style score")).toBe(0);
    expect(assertScoreRange(1, "style score")).toBe(1);
    expect(() => assertScoreRange(1.1, "style score")).toThrow("style score must be between 0 and 1.");
  });

  it("validates catalog slug shape", () => {
    expect(isCatalogSlug("tissot-prx")).toBe(true);
    expect(isCatalogSlug("Tissot")).toBe(false);
    expect(isCatalogSlug("bad--slug")).toBe(false);
    expect(slugifyCatalogText("Tissot PRX Powermatic 80")).toBe("tissot-prx-powermatic-80");
    expect(slugifyCatalogText("!!!")).toBeNull();
  });
});

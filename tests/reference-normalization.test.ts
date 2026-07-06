import { describe, expect, it } from "vitest";
import {
  normalizeManufacturerReference,
  referenceSlugFromDisplay,
} from "@/modules/catalog/domain/reference-normalization";

describe("manufacturer reference normalization", () => {
  it("normalizes formatting, separators, and case deterministically", () => {
    expect(normalizeManufacturerReference("T137.407.11.041.00")).toBe("T1374071104100");
    expect(normalizeManufacturerReference(" t137 407-11/041 00 ")).toBe("T1374071104100");
    expect(normalizeManufacturerReference("T137_407_11_041_00")).toBe("T1374071104100");
  });

  it("preserves meaningful alphanumeric characters", () => {
    expect(normalizeManufacturerReference("126610LN")).toBe("126610LN");
    expect(normalizeManufacturerReference("abc-123")).toBe("ABC123");
  });

  it("fails when normalization would be empty", () => {
    expect(() => normalizeManufacturerReference(" -- ... ")).toThrow(
      "Manufacturer reference normalization produced an empty value.",
    );
  });

  it("builds a canonical reference slug from normalized reference identity", () => {
    expect(referenceSlugFromDisplay("T137.407.11.041.00")).toBe("t1374071104100");
  });
});

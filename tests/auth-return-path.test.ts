import { describe, expect, it } from "vitest";
import { safeReturnPath } from "@/modules/auth/return-path";

describe("safe auth return path", () => {
  it("accepts local paths and rejects external or malformed redirects", () => {
    expect(safeReturnPath("/watches/casio/ref?tab=details")).toBe("/watches/casio/ref?tab=details");
    expect(safeReturnPath("https://example.com", "/collection")).toBe("/collection");
    expect(safeReturnPath("//example.com", "/collection")).toBe("/collection");
    expect(safeReturnPath("/\\example.com", "/collection")).toBe("/collection");
  });
});

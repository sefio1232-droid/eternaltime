import { describe, expect, it } from "vitest";
import {
  displayWatchSeoTitle,
  sanitizeCatalogSpecificationValue,
} from "@/modules/catalog/application/catalog-display";

describe("final pre-launch semantic hardening", () => {
  it("keeps product SEO titles unique without repeating the manufacturer reference", () => {
    expect(
      displayWatchSeoTitle({
        brandName: "Casio",
        title: "Casio A130WE-7ADF",
        referenceDisplay: "A130WE-7ADF",
      }),
    ).toBe("Casio A130WE-7ADF");

    expect(
      displayWatchSeoTitle({
        brandName: "Citizen",
        title: "Citizen Eco-Drive",
        referenceDisplay: "AW1818-59L",
      }),
    ).toBe("Citizen Eco-Drive AW1818-59L");
  });

  it("sanitizes generated public specification copy without inventing missing specs", () => {
    expect(
      sanitizeCatalogSpecificationValue({
        key: "crystal_type_raw",
        label: "Стекло",
        value: "Стекло: акриловое / полимерное стекло",
      }),
    ).toBe("акриловое / полимерное");

    expect(
      sanitizeCatalogSpecificationValue({
        key: "crystal_type_raw",
        label: "Стекло",
        value: "Полимерное сферическое стекло (полимерное )",
      }),
    ).toBe("Полимерное сферическое");

    expect(
      sanitizeCatalogSpecificationValue({
        key: "strap_material_raw",
        label: "Ремешок",
        value: "Кожаный ремешокный ремешок",
      }),
    ).toBe("Кожаный ремешок");

    expect(
      sanitizeCatalogSpecificationValue({
        key: "dial_raw",
        label: "Циферблат",
        value: "циферблат с открытым элементом механизма",
      }),
    ).toBe("с открытым элементом механизма");
  });
});

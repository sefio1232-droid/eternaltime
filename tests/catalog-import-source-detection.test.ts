import { describe, expect, it } from "vitest";
import { detectCatalogSource } from "@/modules/imports/catalog/domain/source-detection";
import type { SourceSignature, WorkbookSummary } from "@/modules/imports/catalog/domain/types";

function workbook(workbookName: string, sheetNames: string[], headers: string[]): WorkbookSummary {
  return {
    workbookName,
    sheets: sheetNames.map((name) => ({
      name,
      headers,
      rowCount: 1,
    })),
  };
}

describe("catalog source detection", () => {
  it("detects main workbook by sheet/header structure, independent of filename", () => {
    const signature: SourceSignature = {
      filename: "renamed-source.xlsx",
      extension: ".xlsx",
      workbooks: [
        workbook("renamed-source.xlsx", ["Casio", "Tissot", "Orient", "Citizen"], ["Бренд", "Артикул", "Цена ₽"]),
      ],
    };

    expect(detectCatalogSource(signature).sourceType).toBe("main_catalog_workbook");
  });

  it("detects Casio package by nested workbook sheets and image structure", () => {
    const signature: SourceSignature = {
      filename: "anything.zip",
      extension: ".zip",
      zipEntries: ["images/Casio/A158WA-1DF/A158WA-1DF_1.webp", "nested.xlsx"],
      workbooks: [workbook("nested.xlsx", ["Сводка", "Casio_для_IT", "Проверка_моделей"], ["Бренд", "Артикул", "Характеристики"])],
    };

    expect(detectCatalogSource(signature).sourceType).toBe("casio_package");
  });

  it("detects Tissot package by nested workbook sheets", () => {
    const signature: SourceSignature = {
      filename: "renamed.zip",
      extension: ".zip",
      zipEntries: ["photos.xlsx"],
      workbooks: [workbook("photos.xlsx", ["Tissot_для_IT", "Фото_сводка", "Источники_фото"], ["Бренд", "Артикул", "Характеристики"])],
    };

    expect(detectCatalogSource(signature).sourceType).toBe("tissot_package");
  });

  it("detects Orient package by nested workbook sheets", () => {
    const signature: SourceSignature = {
      filename: "another-name.zip",
      extension: ".zip",
      zipEntries: ["orient.xlsx"],
      workbooks: [workbook("orient.xlsx", ["Orient_для_IT", "Фото_сводка", "Источники_фото"], ["Бренд", "Артикул", "Характеристики"])],
    };

    expect(detectCatalogSource(signature).sourceType).toBe("orient_package");
  });

  it("does not guess ambiguous or unsupported sources", () => {
    const signature: SourceSignature = {
      filename: "unknown.zip",
      extension: ".zip",
      workbooks: [workbook("unknown.xlsx", ["Data"], ["Name", "Price"])],
    };

    expect(detectCatalogSource(signature).sourceType).toBe("unknown");
  });
});

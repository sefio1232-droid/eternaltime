import type { CatalogSourceType, SourceDetection, SourceSignature } from "./types";
import { normalizeHeader } from "./headers";

const mainWorkbookSheets = ["casio", "tissot", "orient", "citizen"];
const packageCommonSheets = ["сводка", "фото_сводка", "источники_фото"];

function normalizeSheetName(input: string): string {
  return input.normalize("NFKC").trim().toLowerCase();
}

function allSheetNames(signature: SourceSignature): string[] {
  return signature.workbooks.flatMap((workbook) => workbook.sheets.map((sheet) => normalizeSheetName(sheet.name)));
}

function allHeaders(signature: SourceSignature): string[] {
  return signature.workbooks.flatMap((workbook) =>
    workbook.sheets.flatMap((sheet) => sheet.headers.map((header) => normalizeHeader(header))),
  );
}

function hasAllSheets(signature: SourceSignature, expectedSheets: string[]): boolean {
  const sheetNames = new Set(allSheetNames(signature));
  return expectedSheets.every((sheet) => sheetNames.has(sheet));
}

function packageDetection(signature: SourceSignature, brand: "casio" | "tissot" | "orient"): SourceDetection | null {
  const sheetNames = allSheetNames(signature);
  const headers = allHeaders(signature);
  const brandSheet = `${brand}_для_it`;
  const hasBrandSheet = sheetNames.includes(brandSheet);
  const hasCommonPackageSheets = packageCommonSheets.some((sheet) => sheetNames.includes(sheet));
  const hasReferenceHeader = headers.includes("артикул");
  const hasCharacteristicsHeader = headers.includes("характеристики");
  const hasBrandImages = (signature.zipEntries ?? []).some((entry) =>
    entry.normalize("NFKC").toLowerCase().replace(/\\/g, "/").includes(`images/${brand}/`),
  );

  if (!hasBrandSheet || !hasReferenceHeader) {
    return null;
  }

  const reasons = [`workbook has ${brandSheet} sheet`, "reference header detected"];

  if (hasCommonPackageSheets) {
    reasons.push("package support sheets detected");
  }

  if (hasCharacteristicsHeader) {
    reasons.push("characteristics header detected");
  }

  if (hasBrandImages) {
    reasons.push(`ZIP contains images/${brand} entries`);
  }

  return {
    sourceType: `${brand}_package` as CatalogSourceType,
    confidence: hasCharacteristicsHeader || hasBrandImages ? "high" : "medium",
    reasons,
    workbookSheets: sheetNames,
  };
}

export function detectCatalogSource(signature: SourceSignature): SourceDetection {
  const extension = signature.extension.toLowerCase();
  const sheetNames = allSheetNames(signature);
  const headers = allHeaders(signature);

  if (extension === ".xlsx" && hasAllSheets(signature, mainWorkbookSheets)) {
    const hasCatalogHeaders =
      headers.includes("бренд") &&
      headers.includes("артикул") &&
      (headers.some((header) => header.includes("цена")) || headers.includes("ценанасайте"));

    if (hasCatalogHeaders) {
      return {
        sourceType: "main_catalog_workbook",
        confidence: "high",
        reasons: ["workbook has Casio/Tissot/Orient/Citizen sheets", "catalog identity and price headers detected"],
        workbookSheets: sheetNames,
      };
    }
  }

  if (extension === ".zip") {
    const detections = (["casio", "tissot", "orient"] as const)
      .map((brand) => packageDetection(signature, brand))
      .filter((detection): detection is SourceDetection => detection !== null);

    if (detections.length === 1) {
      return detections[0];
    }

    if (detections.length > 1) {
      return {
        sourceType: "unknown",
        confidence: "low",
        reasons: ["multiple package signatures detected; manual review required"],
        workbookSheets: sheetNames,
      };
    }
  }

  return {
    sourceType: "unknown",
    confidence: "low",
    reasons: ["source signature did not match a known catalog source"],
    workbookSheets: sheetNames,
  };
}

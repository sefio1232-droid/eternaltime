import * as XLSX from "xlsx";
import { mapCatalogHeader } from "../domain/headers";
import type { RawCatalogRow, WorkbookSheetSummary, WorkbookSummary } from "../domain/types";

export type LoadedWorkbook = {
  workbookName: string;
  nestedEntry?: string;
  workbook: XLSX.WorkBook;
};

function cellToString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return String(value).normalize("NFKC").trim();
}

function worksheetRows(sheet: XLSX.WorkSheet): string[][] {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  });

  return rows.map((row) => row.map(cellToString));
}

function findHeaderRowIndex(rows: string[][]): number | null {
  let bestIndex: number | null = null;
  let bestScore = 0;

  rows.slice(0, 12).forEach((row, index) => {
    const score = row.filter((cell) => mapCatalogHeader(cell) !== null).length;

    if (score > bestScore) {
      bestScore = score;
      bestIndex = index;
    }
  });

  return bestScore >= 2 ? bestIndex : null;
}

export function summarizeWorkbook(workbookName: string, workbook: XLSX.WorkBook, nestedEntry?: string): WorkbookSummary {
  return {
    workbookName,
    nestedEntry,
    sheets: workbook.SheetNames.map((sheetName) => {
      const rows = worksheetRows(workbook.Sheets[sheetName]);
      const headerRowIndex = findHeaderRowIndex(rows);
      const headers = headerRowIndex === null ? [] : rows[headerRowIndex].filter(Boolean);

      return {
        name: sheetName,
        headers,
        rowCount: headerRowIndex === null ? 0 : Math.max(0, rows.length - headerRowIndex - 1),
      } satisfies WorkbookSheetSummary;
    }),
  };
}

function shouldParseProductSheet(sheetName: string): boolean {
  const normalized = sheetName.normalize("NFKC").toLowerCase();
  return ["casio", "tissot", "orient", "citizen"].includes(normalized) || normalized.endsWith("_для_it");
}

function shouldParseImageSheet(sheetName: string): boolean {
  const normalized = sheetName.normalize("NFKC").toLowerCase();
  return normalized.includes("фото") || normalized.includes("источники");
}

function rowsFromWorkbookSheets(input: {
  workbookName: string;
  workbook: XLSX.WorkBook;
  sourceFile: string;
  sourceType: RawCatalogRow["sourceType"];
  includeSheet: (sheetName: string) => boolean;
}): RawCatalogRow[] {
  const rows: RawCatalogRow[] = [];

  for (const sheetName of input.workbook.SheetNames) {
    if (!input.includeSheet(sheetName)) {
      continue;
    }

    const sheetRows = worksheetRows(input.workbook.Sheets[sheetName]);
    const headerRowIndex = findHeaderRowIndex(sheetRows);

    if (headerRowIndex === null) {
      continue;
    }

    const headers = sheetRows[headerRowIndex];

    sheetRows.slice(headerRowIndex + 1).forEach((row, rowOffset) => {
      const values: Record<string, string> = {};

      headers.forEach((header, index) => {
        const headerText = header.trim();
        if (!headerText) {
          return;
        }

        values[headerText] = row[index] ?? "";
      });

      const hasUsefulValue = Object.values(values).some((value) => value.trim());

      if (!hasUsefulValue) {
        return;
      }

      rows.push({
        sourceFile: input.sourceFile,
        sourceType: input.sourceType,
        workbook: input.workbookName,
        sheet: sheetName,
        rowNumber: headerRowIndex + rowOffset + 2,
        values,
      });
    });
  }

  return rows;
}

export function rowsFromWorkbook(input: {
  workbookName: string;
  workbook: XLSX.WorkBook;
  sourceFile: string;
  sourceType: RawCatalogRow["sourceType"];
}): RawCatalogRow[] {
  return rowsFromWorkbookSheets({ ...input, includeSheet: shouldParseProductSheet });
}

export function imageRowsFromWorkbook(input: {
  workbookName: string;
  workbook: XLSX.WorkBook;
  sourceFile: string;
  sourceType: RawCatalogRow["sourceType"];
}): RawCatalogRow[] {
  return rowsFromWorkbookSheets({ ...input, includeSheet: shouldParseImageSheet });
}

export function readWorkbookFromBuffer(workbookName: string, buffer: Buffer, nestedEntry?: string): LoadedWorkbook {
  return {
    workbookName,
    nestedEntry,
    workbook: XLSX.read(buffer, {
      type: "buffer",
      cellDates: false,
    }),
  };
}

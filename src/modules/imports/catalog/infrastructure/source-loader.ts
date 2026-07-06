import { readFile } from "node:fs/promises";
import path from "node:path";
import { detectCatalogSource } from "../domain/source-detection";
import type { ParsedCatalogSource, SourceSignature } from "../domain/types";
import type { CatalogRawSourceFile } from "./source-discovery";
import { loadZipCatalogSource } from "./zip-reader";
import {
  imageRowsFromWorkbook,
  readWorkbookFromBuffer,
  rowsFromWorkbook,
  summarizeWorkbook,
  type LoadedWorkbook,
} from "./xlsx-reader";

async function loadWorkbooks(file: CatalogRawSourceFile): Promise<{
  zipEntries: string[];
  imageEntryCount: number;
  workbooks: LoadedWorkbook[];
}> {
  if (file.extension === ".xlsx") {
    const buffer = await readFile(file.filePath);
    return {
      zipEntries: [],
      imageEntryCount: 0,
      workbooks: [readWorkbookFromBuffer(file.filename, buffer)],
    };
  }

  const zip = await loadZipCatalogSource(file.filePath);
  return {
    zipEntries: zip.entries,
    imageEntryCount: zip.imageEntries.length,
    workbooks: zip.workbooks,
  };
}

export async function loadParsedCatalogSource(file: CatalogRawSourceFile): Promise<ParsedCatalogSource> {
  const loaded = await loadWorkbooks(file);
  const signature: SourceSignature = {
    filename: file.filename,
    extension: path.extname(file.filename).toLowerCase(),
    sizeBytes: file.sizeBytes,
    zipEntries: loaded.zipEntries,
    imageEntryCount: loaded.imageEntryCount,
    workbooks: loaded.workbooks.map((workbook) =>
      summarizeWorkbook(workbook.workbookName, workbook.workbook, workbook.nestedEntry),
    ),
  };
  const detection = detectCatalogSource(signature);
  const sourceType = detection.sourceType;
  const rows =
    sourceType === "unknown"
      ? []
      : loaded.workbooks.flatMap((workbook) =>
          rowsFromWorkbook({
            workbookName: workbook.workbookName,
            workbook: workbook.workbook,
            sourceFile: file.filename,
            sourceType,
          }),
        );
  const imageRows =
    sourceType === "unknown"
      ? []
      : loaded.workbooks.flatMap((workbook) =>
          imageRowsFromWorkbook({
            workbookName: workbook.workbookName,
            workbook: workbook.workbook,
            sourceFile: file.filename,
            sourceType,
          }),
        );

  return {
    sourceFile: file.filename,
    sourceType,
    detection,
    signature,
    zipEntries: loaded.zipEntries,
    rows,
    imageRows,
  };
}

import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export type CatalogRawSourceFile = {
  filePath: string;
  filename: string;
  extension: string;
  sizeBytes: number;
};

export class CatalogImportInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogImportInputError";
  }
}

export async function discoverCatalogRawSourceFiles(rawDir: string): Promise<CatalogRawSourceFile[]> {
  let entries: string[];

  try {
    entries = await readdir(rawDir);
  } catch {
    throw new CatalogImportInputError(
      `Catalog raw source directory was not found: ${rawDir}. Put XLSX/ZIP source files there before running import audit.`,
    );
  }

  const files: CatalogRawSourceFile[] = [];

  for (const entry of entries) {
    const filePath = path.join(rawDir, entry);
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      continue;
    }

    const extension = path.extname(entry).toLowerCase();

    if (extension !== ".xlsx" && extension !== ".zip") {
      continue;
    }

    files.push({
      filePath,
      filename: entry,
      extension,
      sizeBytes: fileStat.size,
    });
  }

  if (files.length === 0) {
    throw new CatalogImportInputError(`No XLSX or ZIP catalog source files were found in ${rawDir}.`);
  }

  return files.sort((left, right) => left.filename.localeCompare(right.filename));
}

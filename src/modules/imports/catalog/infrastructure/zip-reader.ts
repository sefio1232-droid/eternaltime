import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { readWorkbookFromBuffer, type LoadedWorkbook } from "./xlsx-reader";

export type LoadedZipCatalogSource = {
  entries: string[];
  imageEntries: string[];
  workbooks: LoadedWorkbook[];
};

export async function loadZipCatalogSource(filePath: string): Promise<LoadedZipCatalogSource> {
  const buffer = await readFile(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.keys(zip.files).filter((entry) => !zip.files[entry].dir);
  const imageEntries = entries.filter((entry) => /\.(?:jpg|jpeg|png|webp)$/i.test(entry));
  const workbooks: LoadedWorkbook[] = [];

  for (const entry of entries.filter((candidate) => /\.xlsx$/i.test(candidate))) {
    const nestedBuffer = await zip.files[entry].async("nodebuffer");
    workbooks.push(readWorkbookFromBuffer(entry.split("/").pop() ?? entry, nestedBuffer, entry));
  }

  return { entries, imageEntries, workbooks };
}

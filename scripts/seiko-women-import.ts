import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import XLSX from "xlsx";
import { normalizeManufacturerReference } from "@/modules/catalog/domain/reference-normalization";
import { readImageDimensions } from "@/modules/catalog/infrastructure/image-dimensions";
import {
  SEIKO_OFFICIAL_PHOTO_MANIFEST_PATH,
  SEIKO_OFFICIAL_PUBLIC_ASSET_DIR,
  SEIKO_OFFICIAL_PUBLIC_ASSET_ROOT,
  type SeikoOfficialPhotoManifest,
  type SeikoOfficialPhotoManifestEntry,
  type SeikoOfficialPhotoManifestModel,
  type SeikoWomenImportStatus,
} from "@/modules/catalog/infrastructure/seiko-official-photo-types";
import {
  buildControlledCatalogApplyPlan,
  writeCatalogImageUploadPlan,
} from "@/modules/imports/catalog/application/database-apply-plan";
import { buildStagedPricing, parseMoneyToMinorUnits } from "@/modules/imports/catalog/domain/pricing";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type {
  CatalogImportPreview,
  ImageCandidate,
  MergedCatalogCandidate,
  PriceSource,
  RawCatalogRow,
  SourceProvenance,
} from "@/modules/imports/catalog/domain/types";

const execFileAsync = promisify(execFile);
const workbookPath =
  process.env.SEIKO_WOMEN_WORKBOOK ??
  "c:/Users/Sergey/Downloads/Seiko_Women_73_characteristics_for_Codex.xlsx";
const priceWorkbookPath =
  process.env.SEIKO_WOMEN_PRICE_WORKBOOK ??
  "c:/Users/Sergey/Downloads/Seiko_Women_73_prices_RUB.xlsx";
const rootDir = process.cwd();
const apply = process.argv.includes("--apply");
const artifactsDir = path.join(rootDir, "artifacts", "seiko-women-import");
const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36 EternalTimeSeikoImport/1.0";

type SeikoRow = {
  rowNumber: number;
  reference: string;
  brand: string;
  gender: string;
  collection: string;
  seriesLine: string;
  movement: string;
  caliber: string;
  caseSize: string;
  crystal: string;
  waterResistance: string;
  bandStrap: string;
  dialColor: string;
  sellerCardPriceCny: string;
  priceBasis: string;
  couponShownCny: string;
  sellerSalesShown: string;
  leadTimeDays: string;
  sellerShipSource: string;
  catalogTier: string;
  officialStatus: string;
  importNote: string;
  officialUrl: string;
};

type SeikoPriceRow = {
  rowNumber: number;
  reference: string;
  priceCny: string;
  purchaseRub: string;
  publicRub: string;
  differenceRub: string;
};

type ExtractedImage = {
  sourcePageUrl: string;
  sourceAssetUrl: string;
  view: SeikoOfficialPhotoManifestEntry["view"];
};

type ResolvedModel = {
  row: SeikoRow;
  status: SeikoWomenImportStatus;
  resolvedOfficialUrl: string | null;
  images: ExtractedImage[];
  notes: string[];
};

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\\u002F/g, "/")
    .replace(/\\\//g, "/");
}

function normalizeUrl(value: string, baseUrl: string): string | null {
  const decoded = decodeHtml(value).trim();
  if (!decoded || decoded.startsWith("data:")) return null;
  try {
    if (decoded.startsWith("//")) return `https:${decoded}`;
    return new URL(decoded, baseUrl).toString();
  } catch {
    return null;
  }
}

function rootReference(reference: string): string {
  return normalizeManufacturerReference(reference).replace(/(J1|K1|P1)$/u, "");
}

function sourceCandidates(row: SeikoRow): string[] {
  const reference = normalizeManufacturerReference(row.reference).toLowerCase();
  const root = rootReference(row.reference).toLowerCase();
  const collection = row.collection.toLowerCase().replace(/\s+/g, "");
  const candidates = [
    row.officialUrl,
    root ? `https://www.seikowatches.com/us-en/products/${collection || "discovermore"}/${root}` : "",
    root ? `https://www.seikowatches.com/us-en/products/${collection || "discovermore"}/${reference}` : "",
    root ? `https://www.seikowatches.com/jp-ja/products/${collection || "seikoselection"}/${root}` : "",
    root ? `https://www.seikowatches.com/jp-ja/products/${collection || "seikoselection"}/${reference}` : "",
    root ? `https://store.seikowatches.com/products/${root}` : "",
  ].filter((value) => value && !value.includes("NO_CONFIRMED_LIVE_URL"));
  return [...new Set(candidates)];
}

async function fetchOfficialPage(url: string): Promise<{ status: number | null; finalUrl: string; body: string; error: string | null }> {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": userAgent,
        accept: "text/html,application/xhtml+xml,application/pdf;q=0.8",
      },
      signal: AbortSignal.timeout(18_000),
    });
    const contentType = response.headers.get("content-type") ?? "";
    return {
      status: response.status,
      finalUrl: response.url,
      body: contentType.includes("pdf") ? "" : await response.text(),
      error: null,
    };
  } catch (error) {
    return {
      status: null,
      finalUrl: url,
      body: "",
      error: error instanceof Error ? error.message : "fetch_failed",
    };
  }
}

function referenceVerified(html: string, finalUrl: string, reference: string): boolean {
  const normalizedBody = normalizeManufacturerReference(html);
  const normalizedUrl = normalizeManufacturerReference(finalUrl);
  const full = normalizeManufacturerReference(reference);
  const root = rootReference(reference);
  return normalizedBody.includes(full) || normalizedBody.includes(root) || normalizedUrl.includes(full) || normalizedUrl.includes(root);
}

function classifyView(url: string, index: number): SeikoOfficialPhotoManifestEntry["view"] {
  const text = decodeURIComponent(url).toLowerCase();
  if (/(caseback|back|rear)/.test(text)) return "caseback";
  if (/(side|crown)/.test(text)) return "side";
  if (/(detail|macro|clasp|band|strap|bracelet)/.test(text)) return "detail";
  if (/(wrist|lifestyle|model)/.test(text)) return "lifestyle";
  if (index === 0) return "front";
  return "alternate";
}

function isSeikoProductAsset(url: string, reference: string): boolean {
  const comparable = normalizeManufacturerReference(decodeURIComponent(url));
  const full = normalizeManufacturerReference(reference);
  const root = rootReference(reference);
  if (!comparable.includes(full) && !comparable.includes(root)) return false;
  return !/logo|favicon|icon|category|megamenu|brand|banner|campaign|pickup|special/iu.test(url);
}

function extractImageUrls(html: string, reference: string, sourcePageUrl: string): ExtractedImage[] {
  const patterns = [
    /(?:src|data-src|data-zoom|data-image|href|content)=["']([^"']+\.(?:png|jpe?g|webp)(?:\?[^"']*)?)["']/giu,
    /["']([^"']+\.(?:png|jpe?g|webp)(?:\?[^"']*)?)["']/giu,
    /(https?:\\\/\\\/[^"'<>]+\.(?:png|jpe?g|webp)(?:\?[^"'<>]*)?)/giu,
  ];
  const urls = new Set<string>();

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const normalized = normalizeUrl(match[1] ?? match[0] ?? "", sourcePageUrl);
      if (!normalized) continue;
      if (!isSeikoProductAsset(normalized, reference)) continue;
      urls.add(normalized);
    }
  }

  return [...urls].map((url, index) => ({ sourcePageUrl, sourceAssetUrl: url, view: classifyView(url, index) }));
}

function uniqueImages(images: ExtractedImage[]): ExtractedImage[] {
  const seen = new Set<string>();
  const result: ExtractedImage[] = [];
  for (const image of images) {
    const url = new URL(image.sourceAssetUrl);
    url.search = "";
    const key = url.toString();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(image);
  }
  return result;
}

function orderImagesForCover(images: ExtractedImage[]): ExtractedImage[] {
  const rank: Record<SeikoOfficialPhotoManifestEntry["view"], number> = {
    front: 0,
    alternate: 1,
    angle: 2,
    side: 3,
    detail: 4,
    caseback: 5,
    lifestyle: 6,
    unknown: 7,
  };
  return [...images].sort((left, right) => rank[left.view] - rank[right.view]);
}

async function resolveModel(row: SeikoRow): Promise<ResolvedModel> {
  const notes: string[] = [];
  if (!row.officialUrl || row.officialUrl.includes("NO_CONFIRMED_LIVE_URL")) {
    return { row, status: "manual_review", resolvedOfficialUrl: null, images: [], notes: ["No confirmed live official URL in source map."] };
  }

  for (const url of sourceCandidates(row)) {
    const fetched = await fetchOfficialPage(url);
    if (fetched.error || !fetched.status || fetched.status >= 400) {
      notes.push(`${url}: ${fetched.status ?? "ERR"} ${fetched.error ?? ""}`.trim());
      continue;
    }
    if (!referenceVerified(fetched.body, fetched.finalUrl, row.reference)) {
      notes.push(`${fetched.finalUrl}: exact reference/root reference not verified`);
      continue;
    }
    const extractedImages = orderImagesForCover(uniqueImages(extractImageUrls(fetched.body, row.reference, fetched.finalUrl)));
    if (row.reference === "SSQW094" && extractedImages.length > 8) {
      notes.push(`${fetched.finalUrl}: SSQW094 gallery is too broad (${extractedImages.length} assets); prompt warns about multi-model/editorial imagery, manual review required`);
      continue;
    }
    const images = extractedImages.slice(0, 8);
    if (extractedImages.length > images.length) {
      notes.push(`${fetched.finalUrl}: capped official gallery from ${extractedImages.length} to ${images.length} reasonable unique assets`);
    }
    if (images.length === 0) {
      notes.push(`${fetched.finalUrl}: exact official page verified, but no reference-scoped product images extracted`);
      continue;
    }
    return {
      row,
      status: images.length >= 3 ? "success" : "success_with_limited_images",
      resolvedOfficialUrl: fetched.finalUrl,
      images,
      notes,
    };
  }

  return { row, status: "official_source_not_found", resolvedOfficialUrl: null, images: [], notes };
}

function readRows(): SeikoRow[] {
  const workbook = XLSX.readFile(workbookPath);
  for (const required of ["Seiko Women 73", "Summary", "Method & exclusions"]) {
    if (!workbook.SheetNames.includes(required)) {
      throw new Error(`Workbook is missing required sheet: ${required}`);
    }
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets["Seiko Women 73"]!, {
    defval: "",
    raw: false,
  });
  return rows.map((row, index) => ({
    rowNumber: index + 2,
    reference: String(row.Reference ?? "").trim(),
    brand: String(row.Brand ?? "Seiko").trim() || "Seiko",
    gender: String(row.Gender ?? "").trim(),
    collection: String(row.Collection ?? "").trim(),
    seriesLine: String(row["Series / Line"] ?? "").trim(),
    movement: String(row.Movement ?? "").trim(),
    caliber: String(row.Caliber ?? "").trim(),
    caseSize: String(row["Case size (mm)"] ?? "").trim(),
    crystal: String(row.Crystal ?? "").trim(),
    waterResistance: String(row["Water resistance"] ?? "").trim(),
    bandStrap: String(row["Band / strap"] ?? "").trim(),
    dialColor: String(row["Dial / color"] ?? "").trim(),
    sellerCardPriceCny: String(row["Seller card price (CNY)"] ?? "").trim(),
    priceBasis: String(row["Price basis"] ?? "").trim(),
    couponShownCny: String(row["Coupon shown (CNY)"] ?? "").trim(),
    sellerSalesShown: String(row["Seller sales shown"] ?? "").trim(),
    leadTimeDays: String(row["Lead time (days)"] ?? "").trim(),
    sellerShipSource: String(row["Seller ship/source"] ?? "").trim(),
    catalogTier: String(row["Catalog tier"] ?? "").trim(),
    officialStatus: String(row["Official status"] ?? "").trim(),
    importNote: String(row["Verification / import note"] ?? "").trim(),
    officialUrl: String(row["Official Seiko URL"] ?? "").trim(),
  })).filter((row) => row.reference);
}

function readPriceRows(): SeikoPriceRow[] {
  const workbook = XLSX.readFile(priceWorkbookPath);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName || !workbook.Sheets[sheetName]) {
    throw new Error(`Seiko price workbook has no readable sheets: ${priceWorkbookPath}`);
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets[sheetName]!, {
    defval: "",
    raw: false,
  });

  return rows.map((row, index) => ({
    rowNumber: index + 2,
    reference: String(row["Артикул"] ?? "").trim(),
    priceCny: String(row["Цена в юанях (CNY)"] ?? "").trim(),
    purchaseRub: String(row["Закуп в рублях"] ?? "").trim(),
    publicRub: String(row["Моя цена в рублях"] ?? "").trim(),
    differenceRub: String(row["Разница, руб."] ?? "").trim(),
  })).filter((row) => row.reference);
}

function assertPriceCoverage(rows: SeikoRow[], priceRows: SeikoPriceRow[]): void {
  const catalogRefs = new Set(rows.map((row) => normalizeManufacturerReference(row.reference)));
  const priceRefs = new Set(priceRows.map((row) => normalizeManufacturerReference(row.reference)));
  const missing = [...catalogRefs].filter((reference) => !priceRefs.has(reference)).sort();
  const extra = [...priceRefs].filter((reference) => !catalogRefs.has(reference)).sort();
  const invalidPublicPrices = priceRows
    .filter((row) => parseMoneyToMinorUnits(row.publicRub) === null)
    .map((row) => row.reference)
    .sort();

  if (missing.length > 0 || extra.length > 0 || invalidPublicPrices.length > 0) {
    throw new Error(
      [
        "Seiko price workbook does not exactly match the staged Seiko catalog.",
        missing.length ? `Missing prices: ${missing.join(", ")}` : null,
        extra.length ? `Extra price rows: ${extra.join(", ")}` : null,
        invalidPublicPrices.length ? `Invalid public RUB prices: ${invalidPublicPrices.join(", ")}` : null,
      ].filter(Boolean).join(" "),
    );
  }
}

async function downloadBytes(url: string): Promise<Buffer> {
  const { stdout } = await execFileAsync("curl.exe", [
    "-L",
    "--fail",
    "--silent",
    "--show-error",
    "--connect-timeout",
    "8",
    "--max-time",
    "25",
    "--speed-time",
    "10",
    "--speed-limit",
    "1024",
    "-A",
    userAgent,
    "-H",
    "Accept: image/avif,image/webp,image/png,image/jpeg,*/*",
    url,
  ], { encoding: "buffer", maxBuffer: 35 * 1024 * 1024 });
  return Buffer.from(stdout);
}

function detectContentType(bytes: Buffer): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
  return null;
}

function extensionFor(contentType: string | null, url: string): string {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  const ext = path.extname(new URL(url).pathname).toLowerCase().replace(".", "");
  return ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext.replace("jpeg", "jpg") : "jpg";
}

async function cleanTargetAssetDirectories(rows: SeikoRow[]): Promise<void> {
  const assetRoot = path.resolve(rootDir, SEIKO_OFFICIAL_PUBLIC_ASSET_DIR);
  await mkdir(assetRoot, { recursive: true });
  for (const row of rows) {
    const referenceDir = path.resolve(assetRoot, normalizeManufacturerReference(row.reference).toLowerCase());
    if (!referenceDir.startsWith(`${assetRoot}${path.sep}`)) {
      throw new Error(`Refusing to clean unexpected Seiko asset path: ${referenceDir}`);
    }
    await rm(referenceDir, { recursive: true, force: true });
  }
}

async function applyDownloads(models: ResolvedModel[]): Promise<SeikoOfficialPhotoManifestEntry[]> {
  const entries: SeikoOfficialPhotoManifestEntry[] = [];
  for (const model of models) {
    const referenceNormalized = normalizeManufacturerReference(model.row.reference);
    if (!model.images.length) continue;
    const referenceDir = path.join(rootDir, SEIKO_OFFICIAL_PUBLIC_ASSET_DIR, referenceNormalized.toLowerCase());
    await mkdir(referenceDir, { recursive: true });
    const seenHashes = new Set<string>();

    for (const [index, image] of model.images.entries()) {
      try {
        console.log(`download ${model.row.reference} ${index + 1}/${model.images.length}`);
        const bytes = await downloadBytes(image.sourceAssetUrl);
        const hash = createHash("sha256").update(bytes).digest("hex");
        if (seenHashes.has(hash)) continue;
        seenHashes.add(hash);
        const contentType = detectContentType(bytes) ?? "image/jpeg";
        const ext = extensionFor(contentType, image.sourceAssetUrl);
        const filename = `${String(entries.filter((entry) => entry.referenceNormalized === referenceNormalized).length + 1).padStart(2, "0")}-${hash.slice(0, 16)}.${ext}`;
        const storedRelativePath = `${SEIKO_OFFICIAL_PUBLIC_ASSET_DIR}/${referenceNormalized.toLowerCase()}/${filename}`;
        await writeFile(path.join(rootDir, storedRelativePath), bytes);
        const dimensions = readImageDimensions(bytes);
        const order = entries.filter((entry) => entry.referenceNormalized === referenceNormalized).length + 1;
        entries.push({
          catalogReference: model.row.reference,
          referenceNormalized,
          brandSlug: "seiko",
          sourcePageUrl: image.sourcePageUrl,
          sourceAssetUrl: image.sourceAssetUrl,
          publicPath: `${SEIKO_OFFICIAL_PUBLIC_ASSET_ROOT}/${referenceNormalized.toLowerCase()}/${filename}`,
          storedRelativePath,
          width: dimensions?.width ?? null,
          height: dimensions?.height ?? null,
          contentType,
          sha256: hash,
          imageOrder: order,
          isCover: order === 1,
          view: image.view,
          officialSource: "Seiko",
        });
      } catch (error) {
        model.notes.push(`download failed: ${image.sourceAssetUrl}: ${error instanceof Error ? error.message : "unknown"}`);
      }
    }
  }
  return entries;
}

function modelManifest(model: ResolvedModel, entries: SeikoOfficialPhotoManifestEntry[]): SeikoOfficialPhotoManifestModel {
  const modelEntries = entries.filter((entry) => entry.referenceNormalized === normalizeManufacturerReference(model.row.reference));
  const status: SeikoWomenImportStatus =
    apply
      ? modelEntries.length > 0 ? modelEntries.length >= 3 ? "success" : "success_with_limited_images" : model.images.length > 0 ? "download_failed" : model.status
      : model.status;
  const uniqueProductImages = apply ? modelEntries.length : model.images.length;
  return {
    reference: model.row.reference,
    referenceNormalized: normalizeManufacturerReference(model.row.reference),
    status,
    collection: model.row.collection || null,
    seriesLine: model.row.seriesLine || null,
    initialUrl: model.row.officialUrl || null,
    resolvedOfficialUrl: model.resolvedOfficialUrl,
    galleryEntries: model.images.length,
    uniqueProductImages,
    coverPublicPath: apply ? modelEntries.find((entry) => entry.isCover)?.publicPath ?? null : model.images[0]?.sourceAssetUrl ?? null,
    storagePath: apply && modelEntries.length ? `${SEIKO_OFFICIAL_PUBLIC_ASSET_DIR}/${normalizeManufacturerReference(model.row.reference).toLowerCase()}` : null,
    notes: model.notes,
  };
}

function priceProvenance(row: SeikoPriceRow, rawColumn?: string, rawValue?: string): SourceProvenance {
  return {
    sourceFile: path.basename(priceWorkbookPath),
    sourceType: "main_catalog_workbook",
    workbook: path.basename(priceWorkbookPath),
    sheet: "Seiko Women — цены",
    rowNumber: row.rowNumber,
    rawColumn,
    rawValue,
  };
}

function provenance(row: SeikoRow, rawColumn?: string, rawValue?: string): SourceProvenance {
  return {
    sourceFile: path.basename(workbookPath),
    sourceType: "main_catalog_workbook",
    workbook: path.basename(workbookPath),
    sheet: "Seiko Women 73",
    rowNumber: row.rowNumber,
    rawColumn,
    rawValue,
  };
}

function priceSources(row: SeikoPriceRow): PriceSource[] {
  const publicRubMinor = parseMoneyToMinorUnits(row.publicRub);
  const purchaseRubMinor = parseMoneyToMinorUnits(row.purchaseRub);
  const differenceMinor = parseMoneyToMinorUnits(row.differenceRub);
  const priceCnyMinor = parseMoneyToMinorUnits(row.priceCny);

  return [
    {
      rawFieldName: "Моя цена в рублях",
      sourcePackage: path.basename(priceWorkbookPath),
      currency: "RUB",
      rawValue: row.publicRub,
      normalizedAmountMinor: publicRubMinor,
      intendedVisibility: "public_candidate",
      validationState: publicRubMinor === null ? "invalid" : "valid",
      reason: "User-provided Seiko selling price in RUB; selected as the only public website price.",
      provenance: priceProvenance(row, "Моя цена в рублях", row.publicRub),
    },
    {
      rawFieldName: "Закуп в рублях",
      sourcePackage: path.basename(priceWorkbookPath),
      currency: "RUB",
      rawValue: row.purchaseRub,
      normalizedAmountMinor: purchaseRubMinor,
      intendedVisibility: "internal",
      validationState: purchaseRubMinor === null ? "invalid" : "valid",
      reason: "Purchase cost is internal provenance and must never be displayed as a public price.",
      provenance: priceProvenance(row, "Закуп в рублях", row.purchaseRub),
    },
    {
      rawFieldName: "Разница, руб.",
      sourcePackage: path.basename(priceWorkbookPath),
      currency: "RUB",
      rawValue: row.differenceRub,
      normalizedAmountMinor: differenceMinor,
      intendedVisibility: "excluded_from_public",
      validationState: "not_a_price",
      reason: "Difference is analytical source data, not a product price.",
      provenance: priceProvenance(row, "Разница, руб.", row.differenceRub),
    },
    {
      rawFieldName: "Цена в юанях (CNY)",
      sourcePackage: path.basename(priceWorkbookPath),
      currency: "CNY",
      rawValue: row.priceCny,
      normalizedAmountMinor: priceCnyMinor,
      intendedVisibility: "internal",
      validationState: priceCnyMinor === null ? "invalid" : "valid",
      reason: "CNY source value is internal provenance only; public catalog uses RUB selling price.",
      provenance: priceProvenance(row, "Цена в юанях (CNY)", row.priceCny),
    },
  ];
}

function rawRow(row: SeikoRow): RawCatalogRow {
  return {
    sourceFile: path.basename(workbookPath),
    sourceType: "main_catalog_workbook",
    workbook: path.basename(workbookPath),
    sheet: "Seiko Women 73",
    rowNumber: row.rowNumber,
    values: {
      Reference: row.reference,
      Brand: row.brand,
      Gender: row.gender,
      Collection: row.collection,
      "Series / Line": row.seriesLine,
      Movement: row.movement,
      Caliber: row.caliber,
      "Case size (mm)": row.caseSize,
      Crystal: row.crystal,
      "Water resistance": row.waterResistance,
      "Band / strap": row.bandStrap,
      "Dial / color": row.dialColor,
      "Official Seiko URL": row.officialUrl,
      "Seller card price (CNY)": row.sellerCardPriceCny,
      "Price basis": row.priceBasis,
      "Lead time (days)": row.leadTimeDays,
    },
  };
}

function imageCandidate(row: SeikoRow, entry: SeikoOfficialPhotoManifestEntry): ImageCandidate {
  return {
    sourcePackage: path.basename(workbookPath),
    sourceType: "main_catalog_workbook",
    excelImagePath: null,
    actualZipEntry: null,
    remoteImageUrl: entry.publicPath,
    ordering: entry.imageOrder,
    isPrimaryCandidate: entry.isCover,
    status: "valid",
    provenance: provenance(row, "Official Seiko URL", entry.sourcePageUrl),
  };
}

function candidateFromModel(
  model: SeikoOfficialPhotoManifestModel,
  row: SeikoRow,
  priceRow: SeikoPriceRow,
  entries: SeikoOfficialPhotoManifestEntry[],
): MergedCatalogCandidate {
  const referenceNormalized = normalizeManufacturerReference(row.reference);
  const collection = row.collection || null;
  const line = row.seriesLine || null;
  const modelName = line || collection || "Women";
  const titleParts = ["Seiko", collection, line, row.reference].filter(Boolean);
  const images = entries.filter((entry) => entry.referenceNormalized === referenceNormalized).map((entry) => imageCandidate(row, entry));
  const specifications: Record<string, string> = {
    ...(row.movement ? { movement_type_raw: row.movement } : {}),
    ...(row.movement ? { movement_raw: row.movement } : {}),
    ...(row.caliber ? { caliber_raw: row.caliber } : {}),
    ...(row.caseSize ? { case_diameter_raw: `${row.caseSize} mm` } : {}),
    ...(row.crystal ? { crystal_type_raw: row.crystal } : {}),
    ...(row.waterResistance ? { water_resistance_raw: row.waterResistance } : {}),
    ...(row.bandStrap ? { attachment_material_raw: row.bandStrap } : {}),
    ...(row.dialColor ? { dial_color_raw: row.dialColor } : {}),
    ...(row.officialStatus ? { lifecycle_status_raw: row.officialStatus } : {}),
    ...(row.catalogTier ? { catalog_tier_raw: row.catalogTier } : {}),
  };
  const pricing = buildStagedPricing(priceSources(priceRow));

  return {
    candidateId: `seiko-women:${referenceNormalized}`,
    identity: {
      brand: "Seiko",
      brandNormalized: "SEIKO",
      title: titleParts.join(" "),
      officialName: titleParts.join(" "),
      referenceRaw: row.reference,
      referenceNormalized,
    },
    hierarchy: {
      brandCollection: collection,
      brandLine: line,
      watchModelCandidate: modelName,
    },
    specifications: {
      firstClass: specifications,
      controlledAttributes: {},
      unresolvedAttributes: {},
    },
    traits: {
      gender: ["women"],
      source: ["official_seiko_women_73"],
    },
    pricing,
    contentDrafts: {
      seoDescription: null,
    },
    images: {
      candidates: images,
      primaryImageCandidate: images.find((image) => image.isPrimaryCandidate) ?? images[0] ?? null,
    },
    sourceProvenance: [provenance(row)],
    sourceRows: [rawRow(row)],
    sourceRowClassification: {
      kind: "product_candidate",
      indicators: ["seiko_women_73_official_source_map"],
      action: "allow_public_read_and_apply",
    },
    validationIssues: [
      ...(model.status === "manual_review" || model.status === "official_source_not_found" || model.status === "download_failed"
        ? [{
            severity: "warning" as const,
            code: "seiko_official_images_incomplete",
            message: `Seiko image status: ${model.status}`,
            source: provenance(row, "Official Seiko URL", row.officialUrl),
            field: "images",
          }]
        : []),
      ...(pricing.publicPriceCandidate
        ? []
        : [{
            severity: "error" as const,
            code: "seiko_public_rub_price_missing",
            message: "Seiko public RUB selling price is missing or invalid in the user-provided price workbook.",
            source: priceProvenance(priceRow, "Моя цена в рублях", priceRow.publicRub),
            field: "pricing.publicPriceCandidate",
          }]),
    ],
    applyEligibility: {
      status: "eligible",
      referenceApplyEligible: true,
      commercialApplyEligible: Boolean(pricing.publicPriceCandidate),
      reasons: ["Seiko women 73 staged import with user-provided RUB selling prices."],
    },
  };
}

async function writePreviewSupplement(
  models: SeikoOfficialPhotoManifestModel[],
  rows: SeikoRow[],
  priceRows: SeikoPriceRow[],
  entries: SeikoOfficialPhotoManifestEntry[],
) {
  const previewPath = path.join(rootDir, "imports/generated/catalog-import-preview.json");
  const imagePlanPath = path.join(rootDir, "imports/generated/catalog-image-upload-plan.json");
  const preview = JSON.parse(await readFile(previewPath, "utf8")) as CatalogImportPreview;
  const byRef = new Map(rows.map((row) => [normalizeManufacturerReference(row.reference), row]));
  const priceByRef = new Map(priceRows.map((row) => [normalizeManufacturerReference(row.reference), row]));
  const candidates = models.map((model) => candidateFromModel(model, byRef.get(model.referenceNormalized)!, priceByRef.get(model.referenceNormalized)!, entries));
  preview.records = [
    ...preview.records.filter((record) => !record.candidateId.startsWith("seiko-women:")),
    ...candidates,
  ];
  preview.sources = [
    ...preview.sources.filter((source) => source.filename !== path.basename(workbookPath) && source.filename !== path.basename(priceWorkbookPath)),
    {
      filename: path.basename(workbookPath),
      sourceType: "main_catalog_workbook",
      reasons: ["Seiko Women 73 staged import from user-provided official source map."],
      workbookSheets: ["Seiko Women 73", "Summary", "Method & exclusions"],
      rawRowCount: rows.length,
    },
    {
      filename: path.basename(priceWorkbookPath),
      sourceType: "main_catalog_workbook",
      reasons: ["Seiko Women 73 public RUB selling prices from user-provided price workbook."],
      workbookSheets: ["Seiko Women — цены", "Параметры"],
      rawRowCount: priceRows.length,
    },
  ];
  preview.generatedAt = new Date().toISOString();
  const plan = buildControlledCatalogApplyPlan({ preview, previewPath, generatedAt: preview.generatedAt });
  preview.applyPlan = {
    proposedBrandChanges: plan.eligibleRecords.some((record) => record.brandSlug === "seiko") ? [{ brand: "Seiko", sourceCandidates: candidates.map((candidate) => candidate.candidateId) }] : [],
    proposedBrandCollectionChanges: [],
    proposedWatchModelChanges: [],
    proposedWatchReferenceChanges: [],
    proposedCatalogOfferChanges: [],
    proposedPublicPriceChanges: [],
    proposedImageUploadCandidates: [],
  };
  await writeFile(previewPath, `${JSON.stringify(preview, null, 2)}\n`, "utf8");
  await writeCatalogImageUploadPlan({ imagePlanPath, imageUploadPlan: plan.imageUploadPlan as CatalogImageUploadPlan });
}

async function writeReports(models: SeikoOfficialPhotoManifestModel[], entries: SeikoOfficialPhotoManifestEntry[]) {
  await mkdir(artifactsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const counts = models.reduce<Record<string, number>>((acc, model) => {
    acc[model.status] = (acc[model.status] ?? 0) + 1;
    return acc;
  }, {});
  const summary = {
    mode: apply ? "apply" : "dry-run",
    targetModels: models.length,
    totalOfficialImages: apply ? entries.length : models.reduce((sum, model) => sum + model.galleryEntries, 0),
    modelsWithAtLeast3UniqueImages: models.filter((model) => model.uniqueProductImages >= 3 || (!apply && model.galleryEntries >= 3)).length,
    modelsWith1To2UniqueImages: models.filter((model) => {
      const count = apply ? model.uniqueProductImages : model.galleryEntries;
      return count >= 1 && count <= 2;
    }).length,
    statusCounts: counts,
    thirdPartyImagesUsed: 0,
    rubPricesConfigured: models.length,
  };
  const report = { generatedAt: new Date().toISOString(), summary, models, entries };
  const jsonPath = path.join(artifactsDir, `seiko-women-import-${timestamp}.json`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const mdPath = path.join(artifactsDir, `seiko-women-import-${timestamp}.md`);
  await writeFile(mdPath, [
    `# Seiko Women 73 ${apply ? "apply" : "dry-run"}`,
    "",
    `- Target models: ${summary.targetModels}`,
    `- Official images ${apply ? "stored" : "planned"}: ${summary.totalOfficialImages}`,
    `- Status counts: ${JSON.stringify(summary.statusCounts)}`,
    `- RUB prices configured: ${summary.rubPricesConfigured}`,
    `- Third-party images used: 0`,
    "",
    "| Reference | Status | Official source | Unique images | Cover | Notes |",
    "|---|---|---|---:|---|---|",
    ...models.map((model) =>
      `| ${model.reference} | ${model.status} | ${model.resolvedOfficialUrl ?? model.initialUrl ?? ""} | ${apply ? model.uniqueProductImages : model.galleryEntries} | ${model.coverPublicPath ?? ""} | ${model.notes.join("<br>")} |`,
    ),
  ].join("\n"), "utf8");
  console.log(`SEIKO_WOMEN_IMPORT_JSON=${jsonPath}`);
  console.log(`SEIKO_WOMEN_IMPORT_MD=${mdPath}`);
  console.log(`TARGET_MODELS=${summary.targetModels}`);
  console.log(`OFFICIAL_IMAGES_${apply ? "STORED" : "PLANNED"}=${summary.totalOfficialImages}`);
  console.log(`STATUS_COUNTS=${JSON.stringify(summary.statusCounts)}`);
  console.log(`RUB_PRICES_CONFIGURED=${summary.rubPricesConfigured}`);
  console.log("THIRD_PARTY_IMAGES_USED=0");
}

async function main() {
  const rows = readRows();
  const priceRows = readPriceRows();
  if (rows.length !== 73) {
    throw new Error(`Expected exactly 73 Seiko rows, got ${rows.length}`);
  }
  if (priceRows.length !== 73) {
    throw new Error(`Expected exactly 73 Seiko price rows, got ${priceRows.length}`);
  }
  assertPriceCoverage(rows, priceRows);
  const resolved: ResolvedModel[] = [];
  for (const row of rows) {
    const model = await resolveModel(row);
    resolved.push(model);
    console.log(`${row.reference}: ${model.status}; images=${model.images.length}; resolved=${model.resolvedOfficialUrl ?? "none"}`);
  }

  let entries: SeikoOfficialPhotoManifestEntry[] = [];
  if (apply) {
    await cleanTargetAssetDirectories(rows);
    entries = await applyDownloads(resolved);
  }
  const models = resolved.map((model) => modelManifest(model, entries));

  if (apply) {
    const manifest: SeikoOfficialPhotoManifest = {
      generatedAt: new Date().toISOString(),
      sourceWorkbook: workbookPath,
      officialSource: "Seiko",
      targetModels: 73,
      entries,
      models,
    };
    const manifestPath = path.join(rootDir, SEIKO_OFFICIAL_PHOTO_MANIFEST_PATH);
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    await writePreviewSupplement(models, rows, priceRows, entries);
    console.log(`SEIKO_OFFICIAL_PHOTO_MANIFEST=${manifestPath}`);
  }

  await writeReports(models, entries);
}

main().catch((error: unknown) => {
  console.error(`Seiko Women import failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});

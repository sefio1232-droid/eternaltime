import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import * as XLSX from "xlsx";
import { normalizeManufacturerReference } from "@/modules/catalog/domain/reference-normalization";
import { catalogReadDatasetFromPreview } from "@/modules/catalog/infrastructure/preview-catalog-adapter";
import { readImageDimensions } from "@/modules/catalog/infrastructure/image-dimensions";
import {
  CITIZEN_OFFICIAL_PHOTO_MANIFEST_PATH,
  CITIZEN_OFFICIAL_PUBLIC_ASSET_DIR,
  CITIZEN_OFFICIAL_PUBLIC_ASSET_ROOT,
  type CitizenOfficialPhotoImportStatus,
  type CitizenOfficialPhotoManifest,
  type CitizenOfficialPhotoManifestEntry,
  type CitizenOfficialPhotoManifestModel,
} from "@/modules/catalog/infrastructure/citizen-official-photo-types";
import type { CatalogImageUploadPlan } from "@/modules/imports/catalog/domain/database-apply-types";
import type { CatalogImportPreview } from "@/modules/imports/catalog/domain/types";

const execFileAsync = promisify(execFile);

const workbookPath =
  process.env.CITIZEN_SOURCE_WORKBOOK ??
  "c:/Users/Sergey/Downloads/Citizen_Official_Sources_for_Codex.xlsx";
const apply = process.argv.includes("--apply");
const rootDir = process.cwd();
const artifactsDir = path.join(rootDir, "artifacts", "citizen-official-photo-import");

type SourceRow = {
  reference: string;
  initialUrl: string;
  sourceStatus: string;
  importMode: string;
  exactConfirmed: string;
};

type ExtractedImage = {
  sourcePageUrl: string;
  sourceAssetUrl: string;
  view: CitizenOfficialPhotoManifestEntry["view"];
};

type ResolvedModel = {
  row: SourceRow;
  internalId: string | null;
  resolvedOfficialUrl: string | null;
  verification: CitizenOfficialPhotoManifestModel["sourceVerificationStatus"];
  status: CitizenOfficialPhotoImportStatus;
  galleryEntries: number;
  uniqueProductImages: number;
  coverAssetUrl: string | null;
  plannedStoragePaths: string[];
  notes: string[];
  images: ExtractedImage[];
};

const userAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36 EternalTimeCitizenImport/1.0";

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function normalizeUrl(value: string, baseUrl: string): string | null {
  const decoded = decodeHtml(value).replace(/\\u002F/g, "/").replace(/\\\//g, "/").trim();
  if (!decoded || decoded.startsWith("data:")) return null;
  try {
    if (decoded.startsWith("//")) return `https:${decoded}`;
    return new URL(decoded, baseUrl).toString();
  } catch {
    return null;
  }
}

function allowedSourceUrlCandidates(row: SourceRow): string[] {
  const reference = row.reference.toUpperCase();
  const lower = reference.toLowerCase();
  const candidates = [
    row.initialUrl,
    `https://citizenwatch.eu/en/p/${lower}/`,
    `https://citizen-me.com/productinfo/product_info/${reference}`,
    `https://www.citizenwatch.com/us/en/product/${reference}`,
    `https://www.citizen.com.cn/products/${reference}.aspx`,
    `https://citizen.jp/shop/citizen_l/g/g${reference}/`,
  ];
  return [...new Set(candidates.filter(Boolean))];
}

async function fetchTextWithCurl(url: string, timeoutSeconds = 18): Promise<{ status: number | null; finalUrl: string; body: string; error: string | null }> {
  try {
    const { stdout } = await execFileAsync("curl.exe", [
      "-L",
      "--silent",
      "--show-error",
      "--max-time",
      String(timeoutSeconds),
      "-A",
      userAgent,
      "-H",
      "Accept: text/html,application/xhtml+xml",
      "-w",
      "\n__CITIZEN_HTTP_STATUS__:%{http_code}\n__CITIZEN_EFFECTIVE_URL__:%{url_effective}\n",
      url,
    ], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
    const statusMatch = stdout.match(/\n__CITIZEN_HTTP_STATUS__:(\d+)\n/);
    const urlMatch = stdout.match(/\n__CITIZEN_EFFECTIVE_URL__:(.+)\n?$/);
    const marker = stdout.indexOf("\n__CITIZEN_HTTP_STATUS__:");
    return {
      status: statusMatch ? Number(statusMatch[1]) : null,
      finalUrl: urlMatch?.[1]?.trim() || url,
      body: marker >= 0 ? stdout.slice(0, marker) : stdout,
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

async function fetchTextWithNative(url: string, timeoutSeconds = 18): Promise<{ status: number | null; finalUrl: string; body: string; error: string | null }> {
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": userAgent,
        accept: "text/html,application/xhtml+xml",
        "accept-language": "en-US,en;q=0.9,ja;q=0.8,zh;q=0.7",
      },
      signal: AbortSignal.timeout(timeoutSeconds * 1000),
    });
    return {
      status: response.status,
      finalUrl: response.url,
      body: await response.text(),
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

async function fetchOfficialPage(url: string) {
  const timeout = url.includes("citizen.com.cn") ? 8 : 18;
  const attempts = url.includes("citizen.com.cn") ? 1 : 2;
  let last = await fetchTextWithNative(url, timeout);
  if (last.error || !last.status || last.status >= 400) {
    last = await fetchTextWithCurl(url, timeout);
  }
  for (let attempt = 1; attempt < attempts && (last.error || !last.status || last.status >= 500); attempt += 1) {
    last = await fetchTextWithNative(url, timeout);
    if (last.error || !last.status || last.status >= 400) {
      last = await fetchTextWithCurl(url, timeout);
    }
  }
  return last;
}

async function downloadBytes(url: string): Promise<{ bytes: Buffer; contentType: string | null }> {
  const { stdout } = await execFileAsync("curl.exe", [
    "-L",
    "--fail",
    "--silent",
    "--show-error",
    "--connect-timeout",
    "8",
    "--max-time",
    "20",
    "--speed-time",
    "8",
    "--speed-limit",
    "1024",
    "-A",
    userAgent,
    "-H",
    "Accept: image/avif,image/webp,image/png,image/jpeg,*/*",
    url,
  ], { encoding: "buffer", maxBuffer: 30 * 1024 * 1024 });
  return { bytes: Buffer.from(stdout), contentType: null };
}

function extractJsonLdProductImages(html: string, reference: string, sourcePageUrl: string): ExtractedImage[] {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const result: ExtractedImage[] = [];

  const visit = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const record = value as Record<string, unknown>;
    const type = Array.isArray(record["@type"]) ? record["@type"].join(" ") : String(record["@type"] ?? "");
    const sku = String(record.sku ?? record.name ?? record["@id"] ?? "");
    if (!/Product/i.test(type) || !normalizeManufacturerReference(sku).includes(normalizeManufacturerReference(reference))) {
      return;
    }
    const images = Array.isArray(record.image) ? record.image : record.image ? [record.image] : [];
    for (const image of images) {
      if (typeof image !== "string") continue;
      const url = normalizeUrl(image, sourcePageUrl);
      if (url) result.push({ sourcePageUrl, sourceAssetUrl: url, view: classifyView(url, result.length) });
    }
  };

  for (const script of scripts) {
    try {
      visit(JSON.parse(decodeHtml(script[1] ?? "")));
    } catch {
      // Ignore non-product or malformed analytics JSON-LD blocks.
    }
  }

  return result;
}

function classifyView(url: string, index: number): CitizenOfficialPhotoManifestEntry["view"] {
  const text = decodeURIComponent(url).toLowerCase();
  if (/(caseback|_b_|_b-shot|b_shot|back|rear)/.test(text)) return "caseback";
  if (/(_s_|_s-shot|s_shot|side)/.test(text)) return "side";
  if (/(detail|macro|close)/.test(text)) return "detail";
  if (/(wrist|lifestyle|model)/.test(text)) return "lifestyle";
  if (index === 0) return "front";
  return "angle";
}

function explicitReferenceTokens(value: string): string[] {
  const decoded = decodeURIComponent(value).toUpperCase();
  const matches = decoded.match(/[A-Z]{1,3}\d{3,4}-?\d{2}[A-Z0-9]/g) ?? [];
  return [...new Set(matches.map((match) => normalizeManufacturerReference(match)))];
}

function isReferenceScopedImageSafe(imageUrl: string, reference: string): boolean {
  const target = normalizeManufacturerReference(reference);
  const tokens = explicitReferenceTokens(imageUrl);
  if (tokens.length > 0) return tokens.includes(target);

  const lowerUrl = imageUrl.toLowerCase();
  if (lowerUrl.includes("citizen-me.com/assets/upload/product/")) {
    return normalizeManufacturerReference(lowerUrl).includes(target);
  }

  return true;
}

function orderImagesForCover(images: ExtractedImage[]): ExtractedImage[] {
  const rank: Record<CitizenOfficialPhotoManifestEntry["view"], number> = {
    front: 0,
    alternate: 1,
    angle: 1,
    detail: 2,
    side: 3,
    caseback: 4,
    lifestyle: 5,
    unknown: 6,
  };
  return [...images].sort((left, right) => rank[left.view] - rank[right.view]);
}

function extractUsWidenImages(html: string, reference: string, sourcePageUrl: string): ExtractedImage[] {
  if (!html.includes(`"id":"${reference}"`) && !html.includes(reference)) return [];
  const imageGroupIndex = html.indexOf("imageGroups");
  if (imageGroupIndex < 0) return [];
  const slice = html.slice(Math.max(0, imageGroupIndex - 5000), imageGroupIndex + 80_000);
  const urls = [
    ...slice.matchAll(/https?:\\u002F\\u002Fcitizenwatch\.widen\.net\\u002Fcontent\\u002F[a-z0-9]+/gi),
    ...slice.matchAll(/https?:\/\/citizenwatch\.widen\.net\/content\/[a-z0-9]+/gi),
  ]
    .map((match) => normalizeUrl(match[0], sourcePageUrl))
    .filter((url): url is string => Boolean(url));
  return [...new Set(urls)]
    .filter((url) => isReferenceScopedImageSafe(url, reference))
    .map((url, index) => ({ sourcePageUrl, sourceAssetUrl: url, view: classifyView(url, index) }));
}

function extractProductAreaImages(html: string, reference: string, sourcePageUrl: string): ExtractedImage[] {
  if (!normalizeManufacturerReference(html).includes(normalizeManufacturerReference(reference))) return [];

  const anchors = [
    "product_imageLeft",
    "left-image-area",
    "product_image",
    "product-slider",
    "product-detail",
  ];
  const urls = new Set<string>();

  for (const anchor of anchors) {
    let index = html.indexOf(anchor);
    while (index >= 0) {
      const slice = html.slice(Math.max(0, index - 1500), index + 12000);
      if (!normalizeManufacturerReference(slice).includes(normalizeManufacturerReference(reference))) {
        index = html.indexOf(anchor, index + anchor.length);
        continue;
      }
      for (const match of slice.matchAll(/(?:src|data-src|data-large|href)=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi)) {
        const url = normalizeUrl(match[1] ?? "", sourcePageUrl);
        if (!url) continue;
        if (/favicon|logo|icon|sns|youtube|category|banner|megadrop|facebook|twitter|linebutton/i.test(url)) continue;
        if (!isReferenceScopedImageSafe(url, reference)) continue;
        urls.add(url);
      }
      index = html.indexOf(anchor, index + anchor.length);
    }
  }

  return [...urls].map((url, index) => ({ sourcePageUrl, sourceAssetUrl: url, view: classifyView(url, index) }));
}

function extractReferenceNamedImages(html: string, reference: string, sourcePageUrl: string): ExtractedImage[] {
  const normalizedReference = normalizeManufacturerReference(reference);
  const urls = new Set<string>();
  const patterns = [
    /(?:src|data-src|data-large|href|content)=["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi,
    /["']([^"']+\.(?:jpe?g|png|webp)(?:\?[^"']*)?)["']/gi,
  ];

  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) {
      const url = normalizeUrl(match[1] ?? "", sourcePageUrl);
      if (!url) continue;
      const comparable = normalizeManufacturerReference(decodeURIComponent(url));
      if (!comparable.includes(normalizedReference)) continue;
      if (!isReferenceScopedImageSafe(url, reference)) continue;
      if (/favicon|apple-touch|android-chrome|logo|icon/i.test(url)) continue;
      urls.add(url);
    }
  }

  return [...urls].map((url, index) => ({ sourcePageUrl, sourceAssetUrl: url, view: classifyView(url, index) }));
}

function uniqueImages(images: ExtractedImage[]): ExtractedImage[] {
  const seen = new Set<string>();
  const result: ExtractedImage[] = [];
  for (const image of images) {
    const key = image.sourceAssetUrl.replace(/([?&])(?:width|height|w|h|q|fm)=[^&]+/gi, "$1");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(image);
  }
  return result;
}

async function cleanTargetAssetDirectories(rows: SourceRow[]): Promise<void> {
  const assetRoot = path.resolve(rootDir, CITIZEN_OFFICIAL_PUBLIC_ASSET_DIR);
  await mkdir(assetRoot, { recursive: true });

  for (const row of rows) {
    const referenceDir = path.resolve(assetRoot, normalizeManufacturerReference(row.reference).toLowerCase());
    if (!referenceDir.startsWith(`${assetRoot}${path.sep}`)) {
      throw new Error(`Refusing to clean unexpected Citizen asset path: ${referenceDir}`);
    }
    await rm(referenceDir, { recursive: true, force: true });
  }
}

function readSourceRows(): SourceRow[] {
  const workbook = XLSX.readFile(workbookPath);
  for (const required of ["Citizen Source Map", "Summary", "Read Me"]) {
    if (!workbook.SheetNames.includes(required)) {
      throw new Error(`Workbook is missing required sheet: ${required}`);
    }
  }
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets["Citizen Source Map"]!, {
    defval: "",
    raw: false,
  });
  return rows.map((row) => ({
    reference: String(row.Reference ?? "").trim(),
    initialUrl: String(row["Primary official Citizen URL"] ?? "").trim(),
    sourceStatus: String(row["Source status"] ?? "").trim(),
    importMode: String(row["Codex import mode"] ?? "").trim(),
    exactConfirmed: String(row["Exact reference confirmed"] ?? "").trim(),
  })).filter((row) => row.reference && row.initialUrl);
}

async function loadCatalogByReference() {
  const preview = JSON.parse(await readFile(path.join(rootDir, "imports/generated/catalog-import-preview.json"), "utf8")) as CatalogImportPreview;
  const imagePlan = JSON.parse(await readFile(path.join(rootDir, "imports/generated/catalog-image-upload-plan.json"), "utf8")) as CatalogImageUploadPlan;
  const dataset = catalogReadDatasetFromPreview({ preview, imagePlan });
  return new Map(
    dataset.watches
      .filter((watch) => watch.brandSlug === "citizen")
      .map((watch) => [watch.referenceNormalized, watch]),
  );
}

async function resolveModel(row: SourceRow, internalId: string | null): Promise<ResolvedModel> {
  if (!internalId) {
    return {
      row,
      internalId,
      resolvedOfficialUrl: null,
      verification: "not_found",
      status: "model_not_found_in_database",
      galleryEntries: 0,
      uniqueProductImages: 0,
      coverAssetUrl: null,
      plannedStoragePaths: [],
      notes: ["Target reference was not found in EternalTime catalog."],
      images: [],
    };
  }

  const notes: string[] = [];
  for (const url of allowedSourceUrlCandidates(row)) {
    const fetched = await fetchOfficialPage(url);
    if (fetched.error || !fetched.status || fetched.status >= 400) {
      notes.push(`${url}: ${fetched.status ?? "ERR"} ${fetched.error ?? ""}`.trim());
      continue;
    }
    if (!normalizeManufacturerReference(fetched.body).includes(normalizeManufacturerReference(row.reference))) {
      notes.push(`${fetched.finalUrl}: exact reference not found in official page response`);
      continue;
    }

    const images = orderImagesForCover(uniqueImages([
      ...extractJsonLdProductImages(fetched.body, row.reference, fetched.finalUrl),
      ...extractUsWidenImages(fetched.body, row.reference, fetched.finalUrl),
      ...extractProductAreaImages(fetched.body, row.reference, fetched.finalUrl),
      ...extractReferenceNamedImages(fetched.body, row.reference, fetched.finalUrl),
    ].filter((image) => isReferenceScopedImageSafe(image.sourceAssetUrl, row.reference))));

    if (images.length === 0) {
      notes.push(`${fetched.finalUrl}: exact reference verified, but no product image assets extracted`);
      continue;
    }

    return {
      row,
      internalId,
      resolvedOfficialUrl: fetched.finalUrl,
      verification: row.sourceStatus.includes("CANDIDATE") ? "candidate_verified_exact" : "verified_exact",
      status: images.length >= 3 ? "success" : "success_with_limited_images",
      galleryEntries: images.length,
      uniqueProductImages: images.length,
      coverAssetUrl: images[0]?.sourceAssetUrl ?? null,
      plannedStoragePaths: images.map((_, index) => plannedStoragePath(row.reference, index + 1)),
      notes,
      images,
    };
  }

  return {
    row,
    internalId,
    resolvedOfficialUrl: null,
    verification: "not_resolved",
    status: row.sourceStatus.includes("CANDIDATE") ? "manual_review" : "official_source_not_resolved",
    galleryEntries: 0,
    uniqueProductImages: 0,
    coverAssetUrl: null,
    plannedStoragePaths: [],
    notes,
    images: [],
  };
}

function plannedStoragePath(reference: string, order: number, hash = "pending", ext = "img"): string {
  return `${CITIZEN_OFFICIAL_PUBLIC_ASSET_DIR}/${normalizeManufacturerReference(reference).toLowerCase()}/${order.toString().padStart(2, "0")}-${hash}.${ext}`;
}

function extensionFor(contentType: string | null, url: string): string {
  const lowerType = (contentType ?? "").toLowerCase();
  if (lowerType.includes("png")) return "png";
  if (lowerType.includes("webp")) return "webp";
  if (lowerType.includes("jpeg") || lowerType.includes("jpg")) return "jpg";
  const ext = path.extname(new URL(url).pathname).toLowerCase().replace(".", "");
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
  return "jpg";
}

async function applyDownloads(models: ResolvedModel[]): Promise<CitizenOfficialPhotoManifestEntry[]> {
  const entries: CitizenOfficialPhotoManifestEntry[] = [];
  const seenHashes = new Map<string, string>();

  for (const model of models) {
    if (!model.images.length) continue;
    const referenceDir = path.join(rootDir, CITIZEN_OFFICIAL_PUBLIC_ASSET_DIR, normalizeManufacturerReference(model.row.reference).toLowerCase());
    await mkdir(referenceDir, { recursive: true });

    let order = 0;
    for (const image of model.images) {
      order += 1;
      try {
        console.log(`download ${model.row.reference} ${order}/${model.images.length}`);
        const downloaded = await downloadBytes(image.sourceAssetUrl);
        const hash = createHash("sha256").update(downloaded.bytes).digest("hex");
        if (seenHashes.get(`${model.row.reference}:${hash}`)) {
          continue;
        }
        seenHashes.set(`${model.row.reference}:${hash}`, image.sourceAssetUrl);
        const contentType = downloaded.contentType ?? detectContentType(downloaded.bytes);
        const ext = extensionFor(contentType, image.sourceAssetUrl);
        const filename = `${order.toString().padStart(2, "0")}-${hash.slice(0, 16)}.${ext}`;
        const storedRelativePath = `${CITIZEN_OFFICIAL_PUBLIC_ASSET_DIR}/${normalizeManufacturerReference(model.row.reference).toLowerCase()}/${filename}`;
        const outputPath = path.join(rootDir, storedRelativePath);
        await writeFile(outputPath, downloaded.bytes);
        const dimensions = readImageDimensions(downloaded.bytes);
        entries.push({
          catalogReference: model.row.reference,
          referenceNormalized: normalizeManufacturerReference(model.row.reference),
          brandSlug: "citizen",
          sourcePageUrl: image.sourcePageUrl,
          sourceAssetUrl: image.sourceAssetUrl,
          publicPath: `${CITIZEN_OFFICIAL_PUBLIC_ASSET_ROOT}/${normalizeManufacturerReference(model.row.reference).toLowerCase()}/${filename}`,
          storedRelativePath,
          width: dimensions?.width ?? null,
          height: dimensions?.height ?? null,
          contentType: contentType ?? `image/${ext}`,
          sha256: hash,
          imageOrder: entries.filter((entry) => entry.referenceNormalized === normalizeManufacturerReference(model.row.reference)).length + 1,
          isCover: entries.every((entry) => entry.referenceNormalized !== normalizeManufacturerReference(model.row.reference)),
          view: image.view,
          officialSource: "Citizen",
        });
      } catch (error) {
        model.status = "download_failed";
        model.notes.push(`download failed: ${image.sourceAssetUrl}: ${error instanceof Error ? error.message : "unknown"}`);
      }
    }
  }

  return entries;
}

function detectContentType(bytes: Buffer): string | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45) return "image/webp";
  return null;
}

function modelToManifestModel(model: ResolvedModel, entries: CitizenOfficialPhotoManifestEntry[]): CitizenOfficialPhotoManifestModel {
  const modelEntries = entries.filter((entry) => entry.referenceNormalized === normalizeManufacturerReference(model.row.reference));
  const finalStatus = modelEntries.length > 0
    ? modelEntries.length >= 3 ? "success" : "success_with_limited_images"
    : model.status;
  return {
    reference: model.row.reference,
    referenceNormalized: normalizeManufacturerReference(model.row.reference),
    internalId: model.internalId,
    status: modelEntries.length === 0 && model.images.length > 0 ? "download_failed" : finalStatus,
    initialUrl: model.row.initialUrl,
    resolvedOfficialUrl: model.resolvedOfficialUrl,
    sourceVerificationStatus: model.verification,
    galleryEntries: model.galleryEntries,
    uniqueProductImages: modelEntries.length > 0 ? modelEntries.length : apply ? 0 : model.uniqueProductImages,
    coverPublicPath: modelEntries.find((entry) => entry.isCover)?.publicPath ?? null,
    storagePath: modelEntries.length > 0 ? `${CITIZEN_OFFICIAL_PUBLIC_ASSET_DIR}/${normalizeManufacturerReference(model.row.reference).toLowerCase()}` : null,
    notes: model.notes,
  };
}

async function writeReports(models: ResolvedModel[], entries: CitizenOfficialPhotoManifestEntry[]) {
  await mkdir(artifactsDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const manifestModels = models.map((model) => modelToManifestModel(model, entries));
  const summary = {
    mode: apply ? "apply" : "dry-run",
    targetModels: models.length,
    foundInCatalog: models.filter((model) => model.internalId).length,
    verifiedOfficialSourcesResolved: models.filter((model) => model.verification === "verified_exact" || model.verification === "candidate_verified_exact").length,
    successfulModels: apply
      ? manifestModels.filter((model) => model.status === "success" || model.status === "success_with_limited_images").length
      : models.filter((model) => model.status === "success" || model.status === "success_with_limited_images").length,
    officialImages: apply ? entries.length : models.reduce((sum, model) => sum + model.uniqueProductImages, 0),
    modelsWithAtLeast3UniqueImages: apply
      ? manifestModels.filter((model) => model.uniqueProductImages >= 3).length
      : models.filter((model) => model.uniqueProductImages >= 3).length,
    modelsWith1To2UniqueImages: apply
      ? manifestModels.filter((model) => model.uniqueProductImages >= 1 && model.uniqueProductImages <= 2).length
      : models.filter((model) => model.uniqueProductImages >= 1 && model.uniqueProductImages <= 2).length,
    manualReview: apply
      ? manifestModels.filter((model) => model.status === "manual_review" || model.status === "official_source_not_resolved").length
      : models.filter((model) => model.status === "manual_review" || model.status === "official_source_not_resolved").length,
    thirdPartyImagesUsed: 0,
  };
  const rows = models.map((model) => {
    const manifestModel = manifestModels.find((entry) => entry.referenceNormalized === normalizeManufacturerReference(model.row.reference));
    return {
    reference: model.row.reference,
    status: manifestModel?.status ?? model.status,
    initialUrl: model.row.initialUrl,
    resolvedOfficialUrl: model.resolvedOfficialUrl,
    uniqueImages: manifestModel?.uniqueProductImages ?? model.uniqueProductImages,
    coverSelected: manifestModel?.coverPublicPath ?? model.coverAssetUrl,
    plannedStoragePath: manifestModel?.storagePath ?? model.plannedStoragePaths[0] ?? null,
    notes: model.notes,
    };
  });
  const report = { generatedAt: new Date().toISOString(), summary, rows };
  const jsonPath = path.join(artifactsDir, `citizen-photo-import-${timestamp}.json`);
  await writeFile(jsonPath, JSON.stringify(report, null, 2), "utf8");
  const lines = [
    `# Citizen official photo import ${apply ? "apply" : "dry-run"}`,
    "",
    `- Target Citizen models: ${summary.targetModels}`,
    `- Found in EternalTime catalog: ${summary.foundInCatalog}`,
    `- Verified official sources resolved: ${summary.verifiedOfficialSourcesResolved}`,
    `- Successful models: ${summary.successfulModels}`,
    `- Official images ${apply ? "stored" : "planned"}: ${summary.officialImages}`,
    `- Manual review / unresolved: ${summary.manualReview}`,
    `- Third-party images used: 0`,
    "",
    "| Reference | Status | Resolved official URL | Unique images | Cover | Notes |",
    "|---|---|---|---:|---|---|",
    ...rows.map((row) =>
      `| ${row.reference} | ${row.status} | ${row.resolvedOfficialUrl ?? ""} | ${row.uniqueImages} | ${row.coverSelected ?? ""} | ${row.notes.join("<br>")} |`,
    ),
  ];
  const mdPath = path.join(artifactsDir, `citizen-photo-import-${timestamp}.md`);
  await writeFile(mdPath, lines.join("\n"), "utf8");
  console.log(`CITIZEN_PHOTO_IMPORT_JSON=${jsonPath}`);
  console.log(`CITIZEN_PHOTO_IMPORT_MD=${mdPath}`);
  console.log(`TARGET_MODELS=${summary.targetModels}`);
  console.log(`FOUND_IN_CATALOG=${summary.foundInCatalog}`);
  console.log(`VERIFIED_OFFICIAL_SOURCES_RESOLVED=${summary.verifiedOfficialSourcesResolved}`);
  console.log(`SUCCESSFUL_MODELS=${summary.successfulModels}`);
  console.log(`OFFICIAL_IMAGES_${apply ? "STORED" : "PLANNED"}=${summary.officialImages}`);
  console.log(`MANUAL_REVIEW_OR_UNRESOLVED=${summary.manualReview}`);
  console.log("THIRD_PARTY_IMAGES_USED=0");
}

async function main() {
  const rows = readSourceRows();
  const catalogByReference = await loadCatalogByReference();
  const models: ResolvedModel[] = [];

  for (const row of rows) {
    const internal = catalogByReference.get(normalizeManufacturerReference(row.reference));
    const resolved = await resolveModel(row, internal?.id ?? null);
    models.push(resolved);
    console.log(`${row.reference}: ${resolved.status}; images=${resolved.uniqueProductImages}; resolved=${resolved.resolvedOfficialUrl ?? "none"}`);
  }

  if (apply) {
    await cleanTargetAssetDirectories(rows);
  }

  const entries = apply ? await applyDownloads(models) : [];
  if (apply) {
    const manifest: CitizenOfficialPhotoManifest = {
      generatedAt: new Date().toISOString(),
      sourceWorkbook: workbookPath,
      officialSource: "Citizen",
      entries,
      models: models.map((model) => modelToManifestModel(model, entries)),
    };
    const manifestPath = path.join(rootDir, CITIZEN_OFFICIAL_PHOTO_MANIFEST_PATH);
    await mkdir(path.dirname(manifestPath), { recursive: true });
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    console.log(`CITIZEN_OFFICIAL_PHOTO_MANIFEST=${manifestPath}`);
  }

  await writeReports(models, entries);
}

main().catch((error: unknown) => {
  console.error(`Citizen official photo import failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
});

import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modelPath = path.join(root, "src/components/home/home-scenario-model.ts");
const publicRoot = path.join(root, "public");
const sourcePrefix = "/generated/home-hero/";
const normalizedPrefix = "/generated/home-hero/orbit-normalized/";
const outputRoot = path.join(publicRoot, "generated/home-hero/orbit-normalized");
const manifestPath = path.join(outputRoot, "orbit-normalized-assets-manifest.json");

function normalizeReference(value) {
  return value.replace(/[^a-z0-9]+/gi, "").toUpperCase();
}

function publicPathToFile(publicPath) {
  return path.join(publicRoot, publicPath.replace(/^\//, ""));
}

function normalizedPublicPath(originalPath) {
  return originalPath.replace(sourcePrefix, normalizedPrefix);
}

function alphaBounds(data, width, height) {
  let left = width;
  let right = -1;
  let top = height;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha <= 8) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) return { left: 0, top: 0, width, height };
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

function paddedCrop(bounds, imageWidth, imageHeight) {
  const padding = Math.max(8, Math.round(Math.max(bounds.width, bounds.height) * 0.035));
  const left = Math.max(0, bounds.left - padding);
  const top = Math.max(0, bounds.top - padding);
  const right = Math.min(imageWidth - 1, bounds.left + bounds.width - 1 + padding);
  const bottom = Math.min(imageHeight - 1, bounds.top + bounds.height - 1 + padding);
  return { left, top, width: right - left + 1, height: bottom - top + 1, padding };
}

function extractAssetEntries(source) {
  const entries = [];
  const slotRegex = /reference:\s*"([^"]+)"[\s\S]*?asset:\s*(candidateAsset|finalAsset)\(([\s\S]*?)\),\s*specs:/g;
  for (const match of source.matchAll(slotRegex)) {
    const reference = match[1];
    const factory = match[2];
    const args = match[3];
    if (factory === "candidateAsset") {
      const pathMatch = args.match(/"([^"]*\/generated\/home-hero\/[^"]+\.png)"/);
      if (pathMatch) entries.push({ reference, originalPath: pathMatch[1] });
      continue;
    }
    const finalMatch = args.match(/"([^"]+)"\s*,\s*"([^"]+\.png)"/);
    if (finalMatch) entries.push({ reference, originalPath: `/generated/home-hero/final/${finalMatch[1]}/${finalMatch[2]}` });
  }

  const unique = new Map();
  for (const entry of entries) unique.set(`${normalizeReference(entry.reference)}|${entry.originalPath}`, entry);
  return Array.from(unique.values()).sort((left, right) => `${left.reference}${left.originalPath}`.localeCompare(`${right.reference}${right.originalPath}`));
}

function opticalScaleForBounds(bounds, sourceWidth, sourceHeight) {
  const visibleHeightRatio = bounds.height / Math.max(1, sourceHeight);
  const visibleWidthRatio = bounds.width / Math.max(1, sourceWidth);
  const whitespaceBoost = 1 + Math.max(0, 0.82 - visibleHeightRatio) * 0.18;
  const widthBalance = visibleWidthRatio > 0.78 ? 0.98 : 1.02;
  return Math.min(1.08, Math.max(0.94, whitespaceBoost * widthBalance));
}

async function normalizeAsset(entry) {
  const originalFile = publicPathToFile(entry.originalPath);
  const normalizedPath = normalizedPublicPath(entry.originalPath);
  const normalizedFile = publicPathToFile(normalizedPath);
  await mkdir(path.dirname(normalizedFile), { recursive: true });

  const image = sharp(originalFile, { animated: false }).ensureAlpha();
  const metadata = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const bounds = alphaBounds(data, info.width, info.height);
  const crop = paddedCrop(bounds, info.width, info.height);

  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(crop)
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(normalizedFile);

  const normalizedMetadata = await sharp(normalizedFile).metadata();
  const normalizedStat = await stat(normalizedFile);
  const visibleAreaRatio = (bounds.width * bounds.height) / Math.max(1, info.width * info.height);
  const opticalScale = opticalScaleForBounds(bounds, info.width, info.height);
  const safeMaxRenderHeight = Math.min(560, Math.max(420, Math.round((normalizedMetadata.height ?? crop.height) * 0.92)));

  return {
    reference: entry.reference,
    normalizedReference: normalizeReference(entry.reference),
    originalPath: entry.originalPath,
    normalizedPath,
    sourceWidth: metadata.width ?? info.width,
    sourceHeight: metadata.height ?? info.height,
    visibleBounds: bounds,
    transparentMargins: {
      top: bounds.top,
      right: info.width - bounds.left - bounds.width,
      bottom: info.height - bounds.top - bounds.height,
      left: bounds.left,
    },
    visibleAreaRatio: Number(visibleAreaRatio.toFixed(4)),
    crop,
    normalizedWidth: normalizedMetadata.width ?? crop.width,
    normalizedHeight: normalizedMetadata.height ?? crop.height,
    safeMaxRenderHeight,
    opticalScale: Number(opticalScale.toFixed(4)),
    qualityClass: "orbit_normalized_exact_reference",
    outputBytes: normalizedStat.size,
    noArtificialUpscale: true,
  };
}

const source = await readFile(modelPath, "utf8");
const entries = extractAssetEntries(source);
const records = [];

for (const entry of entries) {
  records.push(await normalizeAsset(entry));
}

await mkdir(outputRoot, { recursive: true });
await writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      sourceModel: "src/components/home/home-scenario-model.ts",
      count: records.length,
      records,
    },
    null,
    2,
  )}\n`,
);

console.log(`Prepared ${records.length} orbit-normalized hero assets`);
console.log(path.relative(root, manifestPath).replaceAll("\\", "/"));

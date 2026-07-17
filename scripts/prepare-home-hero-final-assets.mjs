import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = process.env.HOME_HERO_FINAL_SOURCE_DIR
  ? path.resolve(process.env.HOME_HERO_FINAL_SOURCE_DIR)
  : path.join(root, "imports/raw/home-hero/final");
const outputRoot = path.join(root, "public/generated/home-hero/final");
const manifestPath = path.join(outputRoot, "final-home-hero-assets-manifest.json");
const contactSheetPath = path.join(outputRoot, "final-home-hero-assets-contact-sheet.jpg");
const canvasWidth = 1700;
const canvasHeight = 1800;

const targetReferences = [
  "T150.417.11.041.00",
  "T129.410.11.053.00",
  "EFK-100D-2A",
  "T150.210.11.041.00",
  "T150.410.16.051.00",
  "RA-AC0M03S10B",
  "T120.417.11.041.03",
  "GBD-H1000-1A4",
  "RA-AC0Q03S10B",
  "T120.417.17.051.02",
  "T137.407.11.041.00",
  "T120.807.33.051.00",
  "MTG-B3000DN-1A",
  "T137.407.33.051.00",
];

function normalizeReference(value) {
  return value.replace(/[^a-z0-9]+/gi, "").toUpperCase();
}

function referenceSlug(value) {
  return normalizeReference(value).toLowerCase();
}

function toPublicPath(filePath) {
  return path.relative(root, filePath).replaceAll("\\", "/");
}

function isImageEntry(entryName) {
  return /\.(webp|png|jpe?g)$/i.test(entryName);
}

function isEdgeBackgroundPixel(data, offset, threshold = 244, spreadTolerance = 24) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const alpha = data[offset + 3];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return alpha > 0 && red >= threshold && green >= threshold && blue >= threshold && max - min <= spreadTolerance;
}

function removeEdgeConnectedBackground(input, width, height) {
  const output = Buffer.from(input);
  const background = new Uint8Array(width * height);
  const queue = [];

  function enqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = y * width + x;
    if (background[index]) return;
    if (!isEdgeBackgroundPixel(input, index * 4)) return;
    background[index] = 1;
    queue.push(index);
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const index = queue[cursor];
    const x = index % width;
    const y = Math.floor(index / width);
    output[index * 4 + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  return { output, removedPixelCount: queue.length };
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
  const padding = Math.round(Math.max(bounds.width, bounds.height) * 0.06);
  const left = Math.max(0, bounds.left - padding);
  const top = Math.max(0, bounds.top - padding);
  const right = Math.min(imageWidth - 1, bounds.left + bounds.width - 1 + padding);
  const bottom = Math.min(imageHeight - 1, bounds.top + bounds.height - 1 + padding);
  return { left, top, width: right - left + 1, height: bottom - top + 1, padding };
}

async function loadZipSources() {
  const sources = new Map();
  const ignoredNestedEntries = [];
  const zipFiles = (await import("node:fs/promises")).readdir(sourceDir);
  const names = (await zipFiles).filter((name) => name.toLowerCase().endsWith(".zip")).sort();
  const dedicatedZipRefs = new Set(names.map((name) => normalizeReference(path.basename(name, ".zip"))));

  for (const zipName of names) {
    const zipRef = normalizeReference(path.basename(zipName, ".zip"));
    const zip = await JSZip.loadAsync(await readFile(path.join(sourceDir, zipName)));
    for (const entry of Object.values(zip.files)) {
      if (entry.dir || !isImageEntry(entry.name)) continue;
      const normalizedEntry = entry.name.replaceAll("\\", "/");
      const entryRef = normalizeReference(normalizedEntry.split("/")[0] ?? "");
      if (!targetReferences.map(normalizeReference).includes(entryRef)) continue;
      if (dedicatedZipRefs.has(entryRef) && entryRef !== zipRef) {
        ignoredNestedEntries.push({ zipName, entryName: normalizedEntry, reason: "dedicated_zip_exists_for_reference" });
        continue;
      }
      const list = sources.get(entryRef) ?? [];
      list.push({
        zipName,
        entryName: normalizedEntry,
        buffer: await entry.async("nodebuffer"),
      });
      sources.set(entryRef, list);
    }
  }

  return { sources, ignoredNestedEntries };
}

async function prepareFrame(source, reference, index) {
  const slug = referenceSlug(reference);
  const outputDir = path.join(outputRoot, slug);
  await mkdir(outputDir, { recursive: true });

  const image = sharp(source.buffer, { animated: false }).ensureAlpha();
  const metadata = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const background = removeEdgeConnectedBackground(data, info.width, info.height);
  const bounds = alphaBounds(background.output, info.width, info.height);
  const crop = paddedCrop(bounds, info.width, info.height);
  const cropped = sharp(background.output, { raw: { width: info.width, height: info.height, channels: 4 } }).extract(crop);
  const croppedMetadata = await cropped.metadata();
  const targetWidth = canvasWidth * 0.82;
  const targetHeight = canvasHeight * 0.82;
  const resizeRatio = Math.min(1, targetWidth / croppedMetadata.width, targetHeight / croppedMetadata.height);
  const resizedWidth = Math.max(1, Math.round(croppedMetadata.width * resizeRatio));
  const resizedHeight = Math.max(1, Math.round(croppedMetadata.height * resizeRatio));
  const objectBuffer = await cropped.resize(resizedWidth, resizedHeight, { fit: "inside", withoutEnlargement: true }).png().toBuffer();
  const outputPath = path.join(outputDir, `frame-${String(index + 1).padStart(2, "0")}.png`);

  await sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: objectBuffer, left: Math.round((canvasWidth - resizedWidth) / 2), top: Math.round((canvasHeight - resizedHeight) / 2) }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);

  const outputStat = await stat(outputPath);
  const longSide = Math.max(metadata.width ?? 0, metadata.height ?? 0);

  return {
    frameIndex: index + 1,
    sourceZipName: source.zipName,
    sourceEntryName: source.entryName,
    sourceDimensions: { width: metadata.width ?? null, height: metadata.height ?? null },
    sourceLongSidePx: longSide || null,
    sourceFormat: metadata.format ?? null,
    removedBackgroundPixels: background.removedPixelCount,
    cropBounds: crop,
    outputPath: toPublicPath(outputPath),
    outputDimensions: { width: canvasWidth, height: canvasHeight },
    outputBytes: outputStat.size,
    noArtificialUpscale: resizeRatio <= 1,
    readiness:
      longSide >= 1200
        ? "source_ready_for_motion_review"
        : "low_resolution_motion_candidate",
  };
}

function labelSvg(record, frame, width, height) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#fbfaf7"/>
      <text x="18" y="30" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#101316">${record.reference}</text>
      <text x="18" y="56" font-family="Arial, sans-serif" font-size="13" fill="#6f6b63">frame ${frame.frameIndex} · ${frame.sourceDimensions.width}x${frame.sourceDimensions.height}</text>
      <text x="18" y="78" font-family="Arial, sans-serif" font-size="12" fill="#8a8378">${frame.readiness}</text>
    </svg>
  `);
}

async function createContactSheet(records) {
  const frames = records.flatMap((record) => record.frames.map((frame) => ({ record, frame })));
  const columns = 5;
  const cellWidth = 340;
  const cellHeight = 430;
  const rows = Math.max(1, Math.ceil(frames.length / columns));
  const composites = [];

  for (const [index, item] of frames.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = column * cellWidth;
    const top = row * cellHeight;
    const image = await sharp(path.join(root, item.frame.outputPath)).resize(230, 265, { fit: "inside" }).png().toBuffer();
    composites.push({ input: labelSvg(item.record, item.frame, cellWidth, cellHeight), left, top });
    composites.push({ input: image, left: left + 55, top: top + 118 });
  }

  const background = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${cellWidth * columns}" height="${cellHeight * rows}">
      <rect width="100%" height="100%" fill="#f4f1ec"/>
    </svg>
  `);
  await sharp(background).composite(composites).jpeg({ quality: 92 }).toFile(contactSheetPath);
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const { sources, ignoredNestedEntries } = await loadZipSources();
  const records = [];

  for (const reference of targetReferences) {
    const key = normalizeReference(reference);
    const frames = [];
    for (const [index, source] of (sources.get(key) ?? []).entries()) {
      frames.push(await prepareFrame(source, reference, index));
    }
    records.push({
      reference,
      referenceSlug: referenceSlug(reference),
      sourceFrameCount: frames.length,
      motionIntent: "orbit_frame_set",
      motionNotes:
        "Use these frames as product states for a restrained circular/orbital transition. Do not fake perspective by skewing a single frame.",
      frames,
      readiness:
        frames.length === 0
          ? "missing_user_supplied_zip_frames"
          : frames.some((frame) => frame.readiness === "source_ready_for_motion_review")
            ? "has_motion_frames"
            : "low_resolution_only",
    });
  }

  await createContactSheet(records);
  const contactSheetStat = await stat(contactSheetPath);
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceDir: toPublicPath(sourceDir),
    outputRoot: toPublicPath(outputRoot),
    contactSheetPath: toPublicPath(contactSheetPath),
    contactSheetBytes: contactSheetStat.size,
    ignoredNestedEntries,
    references: records,
  };
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

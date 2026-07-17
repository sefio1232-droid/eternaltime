import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imagePlanPath = path.join(root, "imports/generated/catalog-image-upload-plan.json");
const rawCatalogDir = path.join(root, "imports/raw/catalog");
const outputDir = path.join(root, "public/generated/home-hero");
const previewPath = path.join(outputDir, "home-hero-assets-preview.jpg");
const manifestPath = path.join(outputDir, "home-hero-assets-report.json");
const premiumOutputDir = path.join(outputDir, "premium");
const premiumPreviewPath = path.join(premiumOutputDir, "home-hero-premium-preview.jpg");
const premiumManifestPath = path.join(premiumOutputDir, "home-hero-premium-assets-report.json");
const angleComparisonPath = path.join(premiumOutputDir, "main-watch-angle-comparison.jpg");
const remoteFetchTimeoutMs = 15_000;

const heroAssetConfigs = [
  {
    scenario: "01 На каждый день",
    model: "Casio A158WA-1DF",
    referenceSlug: "a158wa1df",
    outputName: "casio-a158wa-1df.png",
    sourceImageIndex: 1,
    removeBackground: true,
    backgroundThreshold: 242,
    channelSpreadTolerance: 22,
    cropPaddingPercent: 0.06,
    outputCanvasWidth: 1600,
    outputCanvasHeight: 1600,
    targetObjectHeightRatio: 0.78,
    objectScale: 0.9,
    objectTranslateX: -22,
    objectTranslateY: 4,
    selectionReason: "Primary product angle has the most readable dial; controlled scale keeps the angled bracelet from filling the canvas.",
  },
  {
    scenario: "02 Под рубашку",
    model: "Tissot PR 100 34mm",
    referenceSlug: "t1502101104100",
    outputName: "tissot-pr100-34mm.png",
    sourceImageIndex: 1,
    removeBackground: true,
    backgroundThreshold: 244,
    channelSpreadTolerance: 18,
    cropPaddingPercent: 0.055,
    outputCanvasWidth: 1600,
    outputCanvasHeight: 1600,
    targetObjectHeightRatio: 0.78,
    objectScale: 0.92,
    objectTranslateX: -8,
    objectTranslateY: 0,
    selectionReason: "Primary front image keeps the compact case and crown readable without using a technical angle.",
  },
  {
    scenario: "03 Для путешествий",
    model: "Casio AE-1200WH-1AV",
    referenceSlug: "ae1200wh1av",
    outputName: "casio-ae1200wh-1av.png",
    sourceImageIndex: 1,
    removeBackground: true,
    backgroundThreshold: 242,
    channelSpreadTolerance: 24,
    cropPaddingPercent: 0.065,
    outputCanvasWidth: 1600,
    outputCanvasHeight: 1600,
    targetObjectHeightRatio: 0.7,
    objectScale: 0.86,
    objectTranslateX: -12,
    objectTranslateY: 0,
    selectionReason: "Primary image shows the full rectangular case; lower scale avoids turning the digital model into a close-up.",
  },
  {
    scenario: "04 Первая механика",
    model: "Orient Bambino 38 RA-AC0M03S30B",
    referenceSlug: "raac0m03s30b",
    outputName: "orient-bambino-38.png",
    sourceImageIndex: 1,
    removeBackground: true,
    backgroundThreshold: 246,
    channelSpreadTolerance: 16,
    cropPaddingPercent: 0.07,
    outputCanvasWidth: 1600,
    outputCanvasHeight: 1600,
    targetObjectHeightRatio: 0.76,
    objectScale: 0.9,
    objectTranslateX: -8,
    objectTranslateY: 4,
    selectionReason: "Primary product image preserves the round case and crown; white-dial protection relies on edge-connected background detection.",
  },
  {
    scenario: "05 Для спорта",
    model: "Casio GBD-H1000-1A4",
    referenceSlug: "gbdh10001a4",
    outputName: "casio-gbd-h1000-1a4.png",
    sourceImageIndex: 1,
    removeBackground: true,
    backgroundThreshold: 240,
    channelSpreadTolerance: 24,
    cropPaddingPercent: 0.08,
    outputCanvasWidth: 1600,
    outputCanvasHeight: 1800,
    targetObjectHeightRatio: 0.68,
    objectScale: 0.84,
    objectTranslateX: -4,
    objectTranslateY: 20,
    selectionReason: "Primary front image is kept smaller so the protective case protrusions do not press against the hero canvas.",
  },
  {
    scenario: "06 Следующее дополнение",
    model: "Tissot PRX Powermatic 80 40mm",
    referenceSlug: "t1374073305100",
    outputName: "tissot-prx-powermatic-80.png",
    sourceImageIndex: 1,
    removeBackground: true,
    backgroundThreshold: 244,
    channelSpreadTolerance: 18,
    cropPaddingPercent: 0.055,
    outputCanvasWidth: 1600,
    outputCanvasHeight: 1700,
    targetObjectHeightRatio: 0.78,
    objectScale: 0.9,
    objectTranslateX: -6,
    objectTranslateY: 0,
    selectionReason: "Primary front image keeps the PRX case visible while allowing the integrated bracelet to breathe.",
  },
];

const labAssetConfig = {
  scenario: "Lab static frame",
  model: "Tissot PR 100 40mm Chronograph",
  referenceSlug: "t1504171104100",
  outputName: "tissot-pr100-chronograph.png",
  sourceImageIndex: 1,
  removeBackground: true,
  backgroundThreshold: 244,
  channelSpreadTolerance: 18,
  cropPaddingPercent: 0.055,
  outputCanvasWidth: 1600,
  outputCanvasHeight: 1700,
  targetObjectHeightRatio: 0.8,
  objectScale: 0.92,
  objectTranslateX: -8,
  objectTranslateY: 0,
  selectionReason: "Static design-lab frame uses the requested T150.417.11.041.00 primary front image.",
  includeInContactSheet: false,
};

const allConfigs = [...heroAssetConfigs.filter((config) => config.referenceSlug !== "raac0m03s30b"), labAssetConfig];

const premiumAssetConfigs = [
  {
    scenario: "01 Каждый день",
    role: "main",
    model: "Tissot Classic Dream 40mm",
    referenceSlug: "t1584071105100",
    outputName: "tissot-classic-dream-40mm-main.png",
    sourceImageIndex: 1,
    removeBackground: true,
    backgroundThreshold: 246,
    channelSpreadTolerance: 18,
    cropPaddingPercent: 0.055,
    outputCanvasWidth: 1800,
    outputCanvasHeight: 1900,
    targetObjectHeightRatio: 0.82,
    objectScale: 0.94,
    objectTranslateX: -10,
    objectTranslateY: 4,
    selectionReason:
      "Clean 1680px frontal Tissot image, calm black dial, full case visibility, and a 58 000 RUB public price make it stronger for a premium everyday hero than low-price Casio options.",
  },
  {
    scenario: "01 Каждый день",
    role: "secondary",
    model: "Tissot PR 100 40mm Chronograph",
    referenceSlug: "t1504171104100",
    outputName: "tissot-pr100-chronograph-secondary.png",
    sourceImageIndex: 1,
    removeBackground: true,
    backgroundThreshold: 244,
    channelSpreadTolerance: 18,
    cropPaddingPercent: 0.055,
    outputCanvasWidth: 1600,
    outputCanvasHeight: 1700,
    targetObjectHeightRatio: 0.8,
    objectScale: 0.92,
    objectTranslateX: -8,
    objectTranslateY: 0,
    selectionReason:
      "Three local images, readable blue chronograph dial, and a 45 678 RUB price make it a useful supporting daily watch without becoming the hero center.",
  },
  {
    scenario: "02 Под рубашку",
    role: "main",
    model: "Tissot PR 100 40mm",
    referenceSlug: "t1504101605100",
    outputName: "tissot-pr100-40mm-leather-main.png",
    sourceImageIndex: 1,
    removeBackground: true,
    backgroundThreshold: 246,
    channelSpreadTolerance: 18,
    cropPaddingPercent: 0.055,
    outputCanvasWidth: 1700,
    outputCanvasHeight: 1800,
    targetObjectHeightRatio: 0.8,
    objectScale: 0.93,
    objectTranslateX: -6,
    objectTranslateY: 0,
    selectionReason:
      "Leather strap, black dial, sapphire crystal data, and 1680px source quality give the shirt scenario a clean dress-watch read.",
  },
  {
    scenario: "02 Под рубашку",
    role: "secondary",
    model: "Tissot PR 100 34mm",
    referenceSlug: "t1502101104100",
    outputName: "tissot-pr100-34mm-secondary.png",
    sourceImageIndex: 1,
    removeBackground: true,
    backgroundThreshold: 244,
    channelSpreadTolerance: 18,
    cropPaddingPercent: 0.055,
    outputCanvasWidth: 1600,
    outputCanvasHeight: 1700,
    targetObjectHeightRatio: 0.78,
    objectScale: 0.92,
    objectTranslateX: -8,
    objectTranslateY: 0,
    selectionReason:
      "A compact Tissot with a clean 1680px frontal source supports the dress scenario without relying on unstable low-resolution Orient remote imagery.",
  },
  {
    scenario: "03 Путешествия",
    role: "main",
    model: "Tissot Seastar 1000 Chronograph 45.5mm",
    referenceSlug: "t1204171104101",
    outputName: "tissot-seastar-1000-chrono-main.png",
    sourceImageIndex: 2,
    removeBackground: true,
    backgroundThreshold: 246,
    channelSpreadTolerance: 18,
    cropPaddingPercent: 0.055,
    outputCanvasWidth: 1800,
    outputCanvasHeight: 1900,
    targetObjectHeightRatio: 0.82,
    objectScale: 0.94,
    objectTranslateX: -8,
    objectTranslateY: 0,
    selectionReason:
      "The 1680px frontal Seastar source has stronger source quality than the 800px shadow image and matches travel through water resistance and chronograph utility.",
  },
  {
    scenario: "03 Путешествия",
    role: "secondary",
    model: "Casio GBD-H1000-1A4",
    referenceSlug: "gbdh10001a4",
    outputName: "casio-gbd-h1000-1a4-secondary.png",
    sourceImageIndex: 2,
    removeBackground: true,
    backgroundThreshold: 238,
    channelSpreadTolerance: 28,
    cropPaddingPercent: 0.08,
    outputCanvasWidth: 1500,
    outputCanvasHeight: 1700,
    targetObjectHeightRatio: 0.74,
    objectScale: 0.9,
    objectTranslateX: 0,
    objectTranslateY: 10,
    selectionReason:
      "A mid-segment G-Shock with real 60 000 RUB price and travel/sport functions; source is lower resolution, so it is not promoted to the main hero asset.",
  },
  {
    scenario: "05 Спорт",
    role: "main",
    model: "Casio MTG-B3000DN-1A",
    referenceSlug: "mtgb3000dn1a",
    outputName: "casio-mtg-b3000dn-1a-main.png",
    sourceImageIndex: 1,
    removeBackground: true,
    backgroundThreshold: 238,
    channelSpreadTolerance: 30,
    cropPaddingPercent: 0.065,
    outputCanvasWidth: 1800,
    outputCanvasHeight: 1900,
    targetObjectHeightRatio: 0.82,
    objectScale: 0.94,
    objectTranslateX: -6,
    objectTranslateY: 0,
    selectionReason:
      "Premium 100 000 RUB G-Shock MT-G with 2000px imagery, strong case architecture, and a clear sport character; not a low-price digital Casio.",
  },
  {
    scenario: "05 Спорт",
    role: "secondary",
    model: "Tissot Seastar 1000 38mm",
    referenceSlug: "t1202173306100",
    outputName: "tissot-seastar-1000-38mm-secondary.png",
    sourceImageIndex: 1,
    removeBackground: true,
    backgroundThreshold: 246,
    channelSpreadTolerance: 18,
    cropPaddingPercent: 0.055,
    outputCanvasWidth: 1600,
    outputCanvasHeight: 1700,
    targetObjectHeightRatio: 0.78,
    objectScale: 0.92,
    objectTranslateX: -6,
    objectTranslateY: 0,
    selectionReason:
      "Compact Seastar gives sport a calmer Swiss alternative while keeping strong Tissot image quality.",
  },
  {
    scenario: "06 В коллекцию",
    role: "main",
    model: "Tissot PRX Powermatic 80 40mm",
    referenceSlug: "t1374073305100",
    outputName: "tissot-prx-powermatic-80-main.png",
    sourceImageIndex: 1,
    removeBackground: true,
    backgroundThreshold: 244,
    channelSpreadTolerance: 18,
    cropPaddingPercent: 0.055,
    outputCanvasWidth: 1800,
    outputCanvasHeight: 1900,
    targetObjectHeightRatio: 0.82,
    objectScale: 0.94,
    objectTranslateX: -4,
    objectTranslateY: 0,
    selectionReason:
      "The 101 010 RUB PRX Powermatic is the strongest collection-upgrade signal: recognizable integrated case, mechanical movement, and distinctive gold/black visual.",
  },
  {
    scenario: "06 В коллекцию",
    role: "secondary",
    model: "Tissot Seastar 1000 Chronograph 45.5mm",
    referenceSlug: "t1204171705103",
    outputName: "tissot-seastar-black-chrono-secondary.png",
    sourceImageIndex: 1,
    removeBackground: true,
    backgroundThreshold: 244,
    channelSpreadTolerance: 18,
    cropPaddingPercent: 0.055,
    outputCanvasWidth: 1700,
    outputCanvasHeight: 1800,
    targetObjectHeightRatio: 0.78,
    objectScale: 0.92,
    objectTranslateX: -6,
    objectTranslateY: 0,
    selectionReason:
      "A black Seastar chronograph adds a robust collection-counterpoint with high-quality Tissot source imagery.",
  },
];

const selectedPerspectiveAssetConfig = {
  scenario: "Angle selected",
  role: "selected-perspective",
  model: "Casio MTG-B3000DN-1A",
  referenceSlug: "mtgb3000dn1a",
  outputName: "casio-mtg-b3000dn-1a-perspective.png",
  sourceImageIndex: 1,
  removeBackground: true,
  backgroundThreshold: 238,
  channelSpreadTolerance: 30,
  cropPaddingPercent: 0.055,
  outputCanvasWidth: 1900,
  outputCanvasHeight: 1900,
  targetObjectHeightRatio: 0.84,
  objectScale: 0.94,
  objectTranslateX: -18,
  objectTranslateY: 0,
  selectionReason:
    "T150.417.11.041.00 has only front, side, and back images; available Tissot fallback sources remain too frontal. This premium MT-G source is the strongest real perspective product shot in the requested price band.",
};

const premiumGenerationConfigs = [...premiumAssetConfigs, selectedPerspectiveAssetConfig];

const pr100AngleReview = {
  referenceSlug: "t1504171104100",
  imageClassifications: [
    {
      sourceImageIndex: 1,
      view: "front view",
      heroSuitability: "usable only as a flat catalogue/front asset",
      notes: "Dial, bezel, crown and pushers are readable, but the watch is strictly frontal and lacks product-scene movement.",
    },
    {
      sourceImageIndex: 2,
      view: "side view",
      heroSuitability: "not suitable",
      notes: "Shows case thickness and crown/pushers, but the dial is not readable enough for a homepage hero.",
    },
    {
      sourceImageIndex: 3,
      view: "back view",
      heroSuitability: "not suitable",
      notes: "Back/caseback source; useful for detail pages, not for the homepage hero center.",
    },
  ],
  selectedMainReferenceSlug: selectedPerspectiveAssetConfig.referenceSlug,
  selectedMainReason:
    "No high-quality three-quarter PR 100 Chronograph source exists in the current manifest, and the Tissot fallback sources remain too frontal. The hero uses the best real perspective product shot from the approved priority list.",
};

function isTechnicalCandidate(candidate) {
  const text = [
    candidate.actualZipEntry,
    candidate.sourceImageCandidate?.excelImagePath,
    candidate.proposedStorageObjectPath,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return /(caseback|back|clasp|buckle|side|задн|крышк|заст[её]ж|profil|profile)/i.test(text) || Number(candidate.intendedOrder) >= 4;
}

function normalizeZipEntry(entry) {
  return entry.replaceAll("\\", "/");
}

async function loadSourceBuffer(candidate) {
  if (!candidate.actualZipEntry && candidate.remoteImageUrl) {
    let response;
    try {
      response = await fetch(candidate.remoteImageUrl, { signal: AbortSignal.timeout(remoteFetchTimeoutMs) });
    } catch (error) {
      throw new Error(
        `Remote image fetch failed for ${candidate.referenceSlug ?? candidate.candidateId}: ${candidate.remoteImageUrl} (${error instanceof Error ? error.message : String(error)})`,
      );
    }
    if (!response.ok) {
      throw new Error(`Remote image fetch failed (${response.status}) for ${candidate.remoteImageUrl}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  const zipPath = path.join(rawCatalogDir, candidate.sourcePackage);
  const zip = await JSZip.loadAsync(await readFile(zipPath));
  const entryPath = normalizeZipEntry(candidate.actualZipEntry);
  const entry = zip.file(entryPath);
  if (!entry) {
    throw new Error(`Missing ZIP entry ${entryPath} in ${candidate.sourcePackage}`);
  }
  return entry.async("nodebuffer");
}

// Edge-connected near-white background detection protects internal white/silver watch details.
function isEdgeBackgroundPixel(data, offset, threshold, spreadTolerance) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const alpha = data[offset + 3];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return alpha > 0 && red >= threshold && green >= threshold && blue >= threshold && max - min <= spreadTolerance;
}

function removeEdgeConnectedBackground(input, width, height, threshold, spreadTolerance) {
  const output = Buffer.from(input);
  const background = new Uint8Array(width * height);
  const queue = [];

  function enqueue(x, y) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const index = y * width + x;
    if (background[index]) return;
    if (!isEdgeBackgroundPixel(input, index * 4, threshold, spreadTolerance)) return;
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

  // Small edge feather only next to removed background pixels.
  for (let index = 0; index < background.length; index += 1) {
    if (background[index]) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    const touchesBackground =
      (x > 0 && background[index - 1]) ||
      (x < width - 1 && background[index + 1]) ||
      (y > 0 && background[index - width]) ||
      (y < height - 1 && background[index + width]);
    if (!touchesBackground) continue;
    const alphaOffset = index * 4 + 3;
    output[alphaOffset] = Math.max(0, Math.min(output[alphaOffset], 218));
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

function paddedCrop(bounds, imageWidth, imageHeight, paddingPercent) {
  const padding = Math.round(Math.max(bounds.width, bounds.height) * paddingPercent);
  const left = Math.max(0, bounds.left - padding);
  const top = Math.max(0, bounds.top - padding);
  const right = Math.min(imageWidth - 1, bounds.left + bounds.width - 1 + padding);
  const bottom = Math.min(imageHeight - 1, bounds.top + bounds.height - 1 + padding);
  return {
    left,
    top,
    width: right - left + 1,
    height: bottom - top + 1,
    padding,
  };
}

async function analyzeCandidate(candidate, config) {
  const sourceBuffer = await loadSourceBuffer(candidate);
  const image = sharp(sourceBuffer, { animated: false }).ensureAlpha();
  const metadata = await image.metadata();
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });
  const transparentPixelCount = Array.from({ length: info.width * info.height }, (_, index) => data[index * 4 + 3]).filter((alpha) => alpha === 0).length;
  const background = removeEdgeConnectedBackground(
    data,
    info.width,
    info.height,
    config.backgroundThreshold,
    config.channelSpreadTolerance,
  );
  const whiteSpacePercent = Number(((background.removedPixelCount / (info.width * info.height)) * 100).toFixed(2));
  const bounds = alphaBounds(background.output, info.width, info.height);
  const objectAreaPercent = Number(((bounds.width * bounds.height) / (info.width * info.height) * 100).toFixed(2));

  return {
    candidate,
    sourceBuffer,
    dimensions: { width: metadata.width, height: metadata.height },
    orientation: metadata.width === metadata.height ? "square" : metadata.width > metadata.height ? "horizontal" : "vertical",
    whiteSpacePercent,
    objectAreaPercent,
    hasTransparency: transparentPixelCount > 0,
    transparentPixelPercent: Number(((transparentPixelCount / (info.width * info.height)) * 100).toFixed(2)),
    isTechnical: isTechnicalCandidate(candidate),
    isFrontCandidate: !isTechnicalCandidate(candidate) && Number(candidate.intendedOrder) <= 3,
    ordering: Number(candidate.intendedOrder),
  };
}

async function prepareAsset(config, candidates, targetOutputDir = outputDir) {
  const candidate = candidates.find((item) => Number(item.intendedOrder) === config.sourceImageIndex);
  if (!candidate) {
    throw new Error(`Source image index ${config.sourceImageIndex} not found for ${config.referenceSlug}`);
  }

  const analyses = [];
  for (const item of candidates) {
    analyses.push(await analyzeCandidate(item, config));
  }

  const selectedAnalysis = analyses.find((analysis) => analysis.candidate === candidate);
  const sourceImage = sharp(selectedAnalysis.sourceBuffer, { animated: false }).ensureAlpha();
  const { data, info } = await sourceImage.raw().toBuffer({ resolveWithObject: true });
  const backgroundResult = config.removeBackground
    ? removeEdgeConnectedBackground(data, info.width, info.height, config.backgroundThreshold, config.channelSpreadTolerance)
    : { output: Buffer.from(data), removedPixelCount: 0 };
  const bounds = alphaBounds(backgroundResult.output, info.width, info.height);
  const crop = paddedCrop(bounds, info.width, info.height, config.cropPaddingPercent);
  const cropped = sharp(backgroundResult.output, { raw: { width: info.width, height: info.height, channels: 4 } }).extract(crop);
  const croppedMetadata = await cropped.metadata();
  const targetObjectHeight = config.outputCanvasHeight * config.targetObjectHeightRatio * config.objectScale;
  const targetObjectWidth = config.outputCanvasWidth * 0.82 * config.objectScale;
  const resizeRatio = Math.min(targetObjectHeight / croppedMetadata.height, targetObjectWidth / croppedMetadata.width);
  const resizedWidth = Math.round(croppedMetadata.width * resizeRatio);
  const resizedHeight = Math.round(croppedMetadata.height * resizeRatio);
  const resizedBuffer = await cropped.resize(resizedWidth, resizedHeight, { fit: "inside", withoutEnlargement: false }).png().toBuffer();
  const left = Math.round((config.outputCanvasWidth - resizedWidth) / 2 + config.objectTranslateX);
  const top = Math.round((config.outputCanvasHeight - resizedHeight) / 2 + config.objectTranslateY);
  await mkdir(targetOutputDir, { recursive: true });
  const outputPath = path.join(targetOutputDir, config.outputName);

  await sharp({
    create: {
      width: config.outputCanvasWidth,
      height: config.outputCanvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: resizedBuffer, left, top }])
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(outputPath);

  const outputMetadata = await sharp(outputPath).metadata();
  const outputStat = await stat(outputPath);

  return {
    scenario: config.scenario,
    role: config.role ?? "asset",
    model: config.model,
    referenceSlug: config.referenceSlug,
    selectedSourceImageIndex: config.sourceImageIndex,
    sourcePackage: candidate.sourcePackage,
    sourceZipEntry: candidate.actualZipEntry,
    remoteImageUrl: candidate.remoteImageUrl,
    sourceDimensions: selectedAnalysis.dimensions,
    sourceAnalyses: analyses.map((analysis) => ({
      sourceImageIndex: analysis.ordering,
      sourceZipEntry: analysis.candidate.actualZipEntry,
      remoteImageUrl: analysis.candidate.remoteImageUrl,
      dimensions: analysis.dimensions,
      orientation: analysis.orientation,
      whiteSpacePercent: analysis.whiteSpacePercent,
      objectAreaPercent: analysis.objectAreaPercent,
      isFrontCandidate: analysis.isFrontCandidate,
      isTechnical: analysis.isTechnical,
      hasTransparency: analysis.hasTransparency,
      transparentPixelPercent: analysis.transparentPixelPercent,
      suitableForHero: analysis.isFrontCandidate,
    })),
    outputPath: path.relative(root, outputPath).replaceAll("\\", "/"),
    outputDimensions: { width: outputMetadata.width, height: outputMetadata.height },
    outputBytes: outputStat.size,
    removeBackground: config.removeBackground,
    backgroundThreshold: config.backgroundThreshold,
    channelSpreadTolerance: config.channelSpreadTolerance,
    removedPixelCount: backgroundResult.removedPixelCount,
    cropBounds: crop,
    wasCropped: crop.left !== 0 || crop.top !== 0 || crop.width !== info.width || crop.height !== info.height,
    normalizedPlacement: {
      objectScale: config.objectScale,
      targetObjectHeightRatio: config.targetObjectHeightRatio,
      resizedWidth,
      resizedHeight,
      left,
      top,
      outputCanvasWidth: config.outputCanvasWidth,
      outputCanvasHeight: config.outputCanvasHeight,
    },
    selectionReason: config.selectionReason,
    includeInContactSheet: config.includeInContactSheet !== false,
  };
}

async function readPreviousReports(paths) {
  const reports = new Map();
  for (const reportPath of paths) {
    try {
      const manifest = JSON.parse(await readFile(reportPath, "utf8"));
      for (const asset of manifest.assets ?? []) {
        if (asset.outputPath) {
          reports.set(asset.outputPath, asset);
        }
      }
    } catch {
      // Previous manifests are a convenience cache, not a source of truth.
    }
  }
  return reports;
}

async function prepareAssetWithFallback(config, candidates, targetOutputDir, previousReports) {
  try {
    return await prepareAsset(config, candidates, targetOutputDir);
  } catch (error) {
    const outputPath = path.relative(root, path.join(targetOutputDir, config.outputName)).replaceAll("\\", "/");
    const previousReport = previousReports.get(outputPath);
    if (!previousReport) {
      throw error;
    }

    try {
      await stat(path.join(root, outputPath));
    } catch {
      throw error;
    }

    return {
      ...previousReport,
      reusedExistingOutput: true,
      reuseReason: `Existing generated output reused because source image could not be fetched during this run: ${
        error instanceof Error ? error.message : String(error)
      }`,
      selectionReason: config.selectionReason,
    };
  }
}

function escapeSvg(text) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function labelSvg(asset, width, height) {
  const price = asset.publicPriceRub ? `${asset.publicPriceRub.toLocaleString("ru-RU")} RUB` : "price n/a";
  const role = asset.role ? `${asset.role} · ` : "";
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="rgba(251,250,247,0.92)" />
      <text x="20" y="30" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#101316">${escapeSvg(asset.scenario)}</text>
      <text x="20" y="56" font-family="Arial, sans-serif" font-size="15" fill="#51514d">${escapeSvg(asset.model)}</text>
      <text x="20" y="80" font-family="Arial, sans-serif" font-size="13" fill="#76716a">${escapeSvg(role)}${escapeSvg(asset.referenceSlug)} · source ${asset.selectedSourceImageIndex}</text>
      <text x="20" y="102" font-family="Arial, sans-serif" font-size="13" fill="#76716a">${escapeSvg(price)} · ${asset.outputDimensions.width}×${asset.outputDimensions.height}</text>
    </svg>
  `);
}

async function createPreviewSheet(assets, destinationPath = previewPath, columns = 3) {
  const cellWidth = 430;
  const cellHeight = 548;
  const rows = Math.max(1, Math.ceil(assets.length / columns));
  const sheetWidth = cellWidth * columns;
  const sheetHeight = cellHeight * rows;
  const composites = [];

  for (const [index, asset] of assets.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = column * cellWidth;
    const top = row * cellHeight;
    const assetBuffer = await sharp(path.join(root, asset.outputPath))
      .resize(300, 360, { fit: "inside" })
      .png()
      .toBuffer();
    composites.push({ input: labelSvg(asset, cellWidth, cellHeight), left, top });
    composites.push({ input: assetBuffer, left: left + 65, top: top + 112 });
  }

  const checkerSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${sheetHeight}">
      <defs>
        <pattern id="checker" width="28" height="28" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#e6e2dc"/>
          <rect x="14" y="14" width="14" height="14" fill="#e6e2dc"/>
          <rect x="14" width="14" height="14" fill="#f7f5f1"/>
          <rect y="14" width="14" height="14" fill="#f7f5f1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#checker)"/>
    </svg>
  `);

  await sharp(checkerSvg)
    .composite(composites)
    .jpeg({ quality: 92 })
    .toFile(destinationPath);
}

function angleComparisonLabelSvg(asset, width, height) {
  const source = asset.sourceDimensions ? `${asset.sourceDimensions.width}x${asset.sourceDimensions.height}` : "source n/a";
  const output = asset.outputDimensions ? `${asset.outputDimensions.width}x${asset.outputDimensions.height}` : "output n/a";
  const price = asset.publicPriceRub ? `${asset.publicPriceRub.toLocaleString("ru-RU")} RUB` : "price n/a";
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="rgba(251,250,247,0.95)" />
      <text x="22" y="32" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#101316">${escapeSvg(asset.angleLabel)}</text>
      <text x="22" y="61" font-family="Arial, sans-serif" font-size="15" font-weight="700" fill="#343434">${escapeSvg(asset.model)}</text>
      <text x="22" y="87" font-family="Arial, sans-serif" font-size="13" fill="#6f6b63">${escapeSvg(asset.referenceNormalized ?? asset.referenceSlug)} · ${price}</text>
      <text x="22" y="111" font-family="Arial, sans-serif" font-size="13" fill="#6f6b63">source ${asset.selectedSourceImageIndex} · ${source} → ${output}</text>
      <text x="22" y="135" font-family="Arial, sans-serif" font-size="12" fill="#8a8378">${escapeSvg(asset.angleNotes)}</text>
    </svg>
  `);
}

async function createAngleComparisonSheet(assets) {
  const cellWidth = 470;
  const cellHeight = 610;
  const columns = 2;
  const rows = 2;
  const composites = [];

  for (const [index, asset] of assets.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = column * cellWidth;
    const top = row * cellHeight;
    const assetBuffer = await sharp(path.join(root, asset.outputPath))
      .resize(350, 390, { fit: "inside" })
      .png()
      .toBuffer();
    composites.push({ input: angleComparisonLabelSvg(asset, cellWidth, cellHeight), left, top });
    composites.push({ input: assetBuffer, left: left + 60, top: top + 176 });
  }

  const sheetWidth = cellWidth * columns;
  const sheetHeight = cellHeight * rows;
  const backgroundSvg = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${sheetWidth}" height="${sheetHeight}">
      <defs>
        <pattern id="checker" width="28" height="28" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#e4dfd7"/>
          <rect x="14" y="14" width="14" height="14" fill="#e4dfd7"/>
          <rect x="14" width="14" height="14" fill="#f8f5ef"/>
          <rect y="14" width="14" height="14" fill="#f8f5ef"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#checker)"/>
    </svg>
  `);

  await sharp(backgroundSvg).composite(composites).jpeg({ quality: 92 }).toFile(angleComparisonPath);
}

function catalogMetadataByReference(preview) {
  const result = new Map();
  for (const record of preview.records ?? []) {
    const referenceSlug = record.identity?.referenceNormalized
      ?.toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
    if (!referenceSlug) {
      continue;
    }

    result.set(referenceSlug, {
      candidateId: record.candidateId,
      brand: record.identity?.brand ?? null,
      title: record.identity?.title ?? null,
      referenceNormalized: record.identity?.referenceNormalized ?? null,
      publicPriceRub: record.pricing?.publicPriceCandidate?.amountMinor
        ? record.pricing.publicPriceCandidate.amountMinor / 100
        : null,
      applyEligibility: record.applyEligibility?.status ?? null,
    });
  }

  return result;
}

async function main() {
  const preview = JSON.parse(await readFile(path.join(root, "imports/generated/catalog-import-preview.json"), "utf8"));
  const imagePlan = JSON.parse(await readFile(imagePlanPath, "utf8"));
  const previousReports = await readPreviousReports([manifestPath, premiumManifestPath]);
  const items = imagePlan.items ?? [];
  const grouped = new Map();
  const catalogMetadata = catalogMetadataByReference(preview);
  for (const item of items) {
    if (!item.referenceSlug || (!item.actualZipEntry && !item.remoteImageUrl) || !item.sourcePackage) continue;
    const list = grouped.get(item.referenceSlug) ?? [];
    list.push(item);
    grouped.set(item.referenceSlug, list);
  }

  await mkdir(outputDir, { recursive: true });

  const reports = [];
  for (const config of allConfigs) {
    const candidates = (grouped.get(config.referenceSlug) ?? []).sort((left, right) => Number(left.intendedOrder) - Number(right.intendedOrder));
    if (candidates.length === 0) {
      throw new Error(`No source images found for ${config.referenceSlug}`);
    }
    const report = await prepareAssetWithFallback(config, candidates, outputDir, previousReports);
    reports.push({ ...catalogMetadata.get(config.referenceSlug), ...report });
  }

  const contactSheetAssets = reports.filter((report) => report.includeInContactSheet);
  await createPreviewSheet(contactSheetAssets, previewPath, 3);

  const previewStat = await stat(previewPath);
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourcePlanPath: path.relative(root, imagePlanPath).replaceAll("\\", "/"),
    outputDir: path.relative(root, outputDir).replaceAll("\\", "/"),
    previewPath: path.relative(root, previewPath).replaceAll("\\", "/"),
    previewBytes: previewStat.size,
    assets: reports,
  };

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  await mkdir(premiumOutputDir, { recursive: true });
  const premiumReports = [];
  for (const config of premiumGenerationConfigs) {
    const candidates = (grouped.get(config.referenceSlug) ?? []).sort((left, right) => Number(left.intendedOrder) - Number(right.intendedOrder));
    if (candidates.length === 0) {
      throw new Error(`No source images found for premium asset ${config.referenceSlug}`);
    }
    const report = await prepareAssetWithFallback(config, candidates, premiumOutputDir, previousReports);
    premiumReports.push({ ...catalogMetadata.get(config.referenceSlug), ...report });
  }

  await createPreviewSheet(premiumReports, premiumPreviewPath, 4);
  const angleComparisonAssets = [
    {
      ...premiumReports.find(
        (report) => report.referenceSlug === "t1504171104100" && report.selectedSourceImageIndex === 1,
      ),
      angleLabel: "Current front asset",
      angleNotes: "PR 100 source 1: front view, readable but flat.",
    },
    {
      ...premiumReports.find((report) => report.outputPath.endsWith("casio-mtg-b3000dn-1a-perspective.png")),
      angleLabel: "Selected perspective asset",
      angleNotes: "MT-G source 1: strongest real perspective shot in the current set.",
    },
    {
      ...premiumReports.find((report) => report.referenceSlug === "t1374073305100" && report.role === "main"),
      angleLabel: "Alternative: PRX",
      angleNotes: "PRX source 1: expressive but visually specific gold model.",
    },
    {
      ...premiumReports.find((report) => report.referenceSlug === "mtgb3000dn1a" && report.role === "main"),
      angleLabel: "Alternative: MT-G",
      angleNotes: "MT-G source 1: strong angle, sportier than the daily Tissot scene.",
    },
  ];
  if (angleComparisonAssets.some((asset) => !asset.outputPath)) {
    throw new Error("Angle comparison assets could not be resolved.");
  }
  await createAngleComparisonSheet(angleComparisonAssets);
  const premiumPreviewStat = await stat(premiumPreviewPath);
  const angleComparisonStat = await stat(angleComparisonPath);
  const premiumManifest = {
    generatedAt: new Date().toISOString(),
    sourcePlanPath: path.relative(root, imagePlanPath).replaceAll("\\", "/"),
    outputDir: path.relative(root, premiumOutputDir).replaceAll("\\", "/"),
    previewPath: path.relative(root, premiumPreviewPath).replaceAll("\\", "/"),
    previewBytes: premiumPreviewStat.size,
    angleComparisonPath: path.relative(root, angleComparisonPath).replaceAll("\\", "/"),
    angleComparisonBytes: angleComparisonStat.size,
    pr100AngleReview,
    assets: premiumReports,
  };

  await writeFile(premiumManifestPath, `${JSON.stringify(premiumManifest, null, 2)}\n`, "utf8");

  console.log(JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify(premiumManifest, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

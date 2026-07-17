import { copyFile, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rawCatalogDir = path.join(root, "imports/raw/catalog");
const previewPath = path.join(root, "imports/generated/catalog-import-preview.json");
const imagePlanPath = path.join(root, "imports/generated/catalog-image-upload-plan.json");
const generatedRoot = path.join(root, "public/generated/home-hero");
const outputRoot = path.join(generatedRoot, "candidates");
const docsShortlistPath = path.join(root, "docs/HOME_HERO_WATCH_SHORTLIST.md");
const docsSourcesPath = path.join(root, "docs/HOME_HERO_IMAGE_SOURCES.md");
const manifestPath = path.join(outputRoot, "home-hero-candidate-manifest.json");
const contactSheetPath = path.join(outputRoot, "home-hero-candidates-contact-sheet.jpg");
const remoteFetchTimeoutMs = 12_000;

const scenarios = [
  {
    id: "01",
    slug: "01-everyday",
    title: "Everyday",
    titleRu: "На каждый день",
    decision:
      "Gentleman is absent from the current catalog/image plan, so Classic Dream is the calm premium main. PR 100 Chronograph stays secondary because its local source is readable but too flat for main hero use.",
    candidates: [
      {
        role: "main",
        outputName: "main-01.png",
        referenceSlug: "t1584071105100",
        sourceImageIndex: 1,
        existingAssetPath: "public/generated/home-hero/premium/tissot-classic-dream-40mm-main.png",
        reason: "Calm Swiss everyday signal, clean black dial, 58k RUB positioning, does not feel like a cheap catalog object.",
        photoView: "front",
        sourceQuality: "strong 1680px official Tissot image; clean, but frontal",
        useAsHeroMain: true,
        useAsSecondary: true,
      },
      {
        role: "secondary",
        outputName: "secondary-01.png",
        referenceSlug: "t1504171104100",
        sourceImageIndex: 1,
        existingAssetPath: "public/generated/home-hero/premium/tissot-pr100-chronograph-secondary.png",
        reason: "Useful everyday chronograph with local source stability; stronger as support than as center.",
        photoView: "front",
        sourceQuality: "usable local 800px Tissot image; readable but flat",
        useAsHeroMain: false,
        useAsSecondary: true,
      },
      {
        role: "alt",
        outputName: "alt-01.png",
        referenceSlug: "t1502101104100",
        sourceImageIndex: 1,
        existingAssetPath: "public/generated/home-hero/premium/tissot-pr100-34mm-secondary.png",
        reason: "Clean compact PR 100 backup; good transparent source, but weaker case presence.",
        photoView: "front",
        sourceQuality: "strong local 1680px Tissot image",
        useAsHeroMain: false,
        useAsSecondary: true,
      },
    ],
  },
  {
    id: "02",
    slug: "02-under-shirt",
    title: "Under Shirt",
    titleRu: "Под рубашку",
    decision:
      "PR 100 leather is the best confirmed shirt candidate: quiet silhouette and local Tissot image. Bambino fits the meaning better, but its official source is below hero-grade resolution.",
    candidates: [
      {
        role: "main",
        outputName: "main-01.png",
        referenceSlug: "t1504101605100",
        sourceImageIndex: 1,
        existingAssetPath: "public/generated/home-hero/premium/tissot-pr100-40mm-leather-main.png",
        reason: "Leather strap, black dial and restrained PR 100 case match a business/shirt scenario without sport aggression.",
        photoView: "front",
        sourceQuality: "strong local 1680px Tissot image",
        useAsHeroMain: true,
        useAsSecondary: true,
      },
      {
        role: "secondary",
        outputName: "secondary-01.png",
        referenceSlug: "t1502101104100",
        sourceImageIndex: 1,
        existingAssetPath: "public/generated/home-hero/premium/tissot-pr100-34mm-secondary.png",
        reason: "Compact and quiet support model; does not compete with the leather main.",
        photoView: "front",
        sourceQuality: "strong local 1680px Tissot image",
        useAsHeroMain: false,
        useAsSecondary: true,
      },
      {
        role: "alt",
        outputName: "alt-01.png",
        referenceSlug: "raac0m03s30b",
        sourceImageIndex: 1,
        existingAssetPath: "public/generated/home-hero/orient-bambino-38.png",
        reason: "Best semantic dress-watch candidate, kept as backup because source image is too small for a confident main hero.",
        photoView: "front",
        sourceQuality: "weak official Orient source, 328x492 in import metadata",
        useAsHeroMain: false,
        useAsSecondary: true,
      },
    ],
  },
  {
    id: "03",
    slug: "03-travel",
    title: "Travel",
    titleRu: "Для путешествий",
    decision:
      "Blue Seastar Chronograph is the most coherent travel main. Black Seastar supports it; GBD-H1000 remains backup because it is functional but visually rougher and lower resolution.",
    candidates: [
      {
        role: "main",
        outputName: "main-01.png",
        referenceSlug: "t1204171104101",
        sourceImageIndex: 2,
        existingAssetPath: "public/generated/home-hero/premium/tissot-seastar-1000-chrono-main.png",
        reason: "Water-ready Tissot chronograph, blue dial, reliable travel character, 65k RUB price.",
        photoView: "front",
        sourceQuality: "strong 1680px official Tissot image; not deep 3/4, but editorial-clean",
        useAsHeroMain: true,
        useAsSecondary: true,
      },
      {
        role: "secondary",
        outputName: "secondary-01.png",
        referenceSlug: "t1204171705103",
        sourceImageIndex: 1,
        existingAssetPath: "public/generated/home-hero/premium/tissot-seastar-black-chrono-secondary.png",
        reason: "Black Seastar variation keeps the travel scene robust without introducing a different visual language.",
        photoView: "front",
        sourceQuality: "strong 1680px official Tissot image",
        useAsHeroMain: true,
        useAsSecondary: true,
      },
      {
        role: "alt",
        outputName: "alt-01.png",
        referenceSlug: "gbdh10001a4",
        sourceImageIndex: 2,
        existingAssetPath: "public/generated/home-hero/premium/casio-gbd-h1000-1a4-secondary.png",
        reason: "Functional travel/sport backup, but too rugged and low-res for main editorial hero.",
        photoView: "front",
        sourceQuality: "medium local Casio image, 408px source family",
        useAsHeroMain: false,
        useAsSecondary: true,
      },
    ],
  },
  {
    id: "04",
    slug: "04-first-mechanical",
    title: "First Mechanical",
    titleRu: "Первая механика",
    decision:
      "Bambino is the best semantic first-mechanical candidate, but current official image resolution is weak. The practical main is Casio Edifice EFK-100D-2A: confirmed automatic, clean local photo, not a cheap digital Casio.",
    candidates: [
      {
        role: "main",
        outputName: "main-01.png",
        referenceSlug: "efk100d2a",
        sourceImageIndex: 1,
        reason: "Automatic movement, blue textured dial, stainless bracelet, good local package image and clear first-mechanical story.",
        photoView: "front/perspective",
        sourceQuality: "good local Casio image, 920x1500; cleaner than Orient source",
        useAsHeroMain: true,
        useAsSecondary: true,
      },
      {
        role: "secondary",
        outputName: "secondary-01.png",
        referenceSlug: "raac0m03s30b",
        sourceImageIndex: 1,
        existingAssetPath: "public/generated/home-hero/orient-bambino-38.png",
        reason: "Classic first mechanical idea, kept secondary because source quality is not homepage-grade.",
        photoView: "front",
        sourceQuality: "weak official Orient source, 328x492 in import metadata",
        useAsHeroMain: false,
        useAsSecondary: true,
      },
      {
        role: "alt",
        outputName: "alt-01.png",
        referenceSlug: "t1374073305100",
        sourceImageIndex: 1,
        existingAssetPath: "public/generated/home-hero/premium/tissot-prx-powermatic-80-main.png",
        reason: "Aspirational mechanical backup; stronger price and design, but too much of a collection-upgrade signal for first entry.",
        photoView: "front",
        sourceQuality: "strong official Tissot image, 800px source with clean alpha",
        useAsHeroMain: false,
        useAsSecondary: true,
      },
    ],
  },
  {
    id: "05",
    slug: "05-sport",
    title: "Sport",
    titleRu: "Для спорта",
    decision:
      "Seastar 40 green is main because the requested Seastar 38 sources read too dark at hero scale. GBD-H1000 is the functional secondary. MT-G is saved as alt/manual decision only: its photo is strong, but it can overpower the editorial tone.",
    candidates: [
      {
        role: "main",
        outputName: "main-01.png",
        referenceSlug: "t1204103309100",
        sourceImageIndex: 1,
        reason:
          "Calmer Seastar sport choice with readable green dial, 58k RUB price and local Tissot source. Selected over the 38mm black version because that source reads as a dark blob in hero scale.",
        photoView: "front",
        sourceQuality: "good local Tissot image; more legible than the dark Seastar 38mm source",
        useAsHeroMain: true,
        useAsSecondary: true,
      },
      {
        role: "secondary",
        outputName: "secondary-01.png",
        referenceSlug: "gbdh10001a4",
        sourceImageIndex: 2,
        existingAssetPath: "public/generated/home-hero/premium/casio-gbd-h1000-1a4-secondary.png",
        reason: "Functional training watch; useful as support but too bulky/technical for the main tone.",
        photoView: "front",
        sourceQuality: "medium local Casio image, low source dimensions",
        useAsHeroMain: false,
        useAsSecondary: true,
      },
      {
        role: "alt",
        outputName: "alt-01.png",
        referenceSlug: "mtgb3000dn1a",
        sourceImageIndex: 1,
        existingAssetPath: "public/generated/home-hero/premium/casio-mtg-b3000dn-1a-main.png",
        reason: "Best sport perspective and premium price, but visually aggressive; needs manual art-direction approval.",
        photoView: "perspective",
        sourceQuality: "very strong local 2000px Casio image",
        useAsHeroMain: false,
        useAsSecondary: true,
      },
    ],
  },
  {
    id: "06",
    slug: "06-collection",
    title: "Collection Upgrade",
    titleRu: "В коллекцию",
    decision:
      "PRX Powermatic 80 is the clearest next-step watch: recognizable integrated design, mechanical positioning, 101k RUB. Black Seastar works as the tougher secondary.",
    candidates: [
      {
        role: "main",
        outputName: "main-01.png",
        referenceSlug: "t1374073305100",
        sourceImageIndex: 1,
        existingAssetPath: "public/generated/home-hero/premium/tissot-prx-powermatic-80-main.png",
        reason: "Mechanical, visually distinct, aspirational without being absurdly luxury.",
        photoView: "front",
        sourceQuality: "strong official Tissot image, 800px source with alpha; frontal but expressive",
        useAsHeroMain: true,
        useAsSecondary: true,
      },
      {
        role: "secondary",
        outputName: "secondary-01.png",
        referenceSlug: "t1204171705103",
        sourceImageIndex: 1,
        existingAssetPath: "public/generated/home-hero/premium/tissot-seastar-black-chrono-secondary.png",
        reason: "Robust counterpoint to PRX, stronger collection role than a simple daily watch.",
        photoView: "front",
        sourceQuality: "strong 1680px official Tissot image",
        useAsHeroMain: true,
        useAsSecondary: true,
      },
      {
        role: "alt",
        outputName: "alt-01.png",
        referenceSlug: "mtgb3000dn1a",
        sourceImageIndex: 1,
        existingAssetPath: "public/generated/home-hero/premium/casio-mtg-b3000dn-1a-perspective.png",
        reason: "Strong visual presence and premium price, but too loud unless the final composition intentionally needs contrast.",
        photoView: "perspective",
        sourceQuality: "very strong local 2000px Casio image",
        useAsHeroMain: false,
        useAsSecondary: true,
      },
    ],
  },
];

function referenceSlug(reference) {
  return reference?.toLowerCase().replace(/[^a-z0-9]+/g, "") ?? "";
}

function formatRub(amount) {
  if (!amount) return "price not confirmed";
  return `${amount.toLocaleString("ru-RU").replace(/\s/g, " ")} RUB`;
}

function displayModel(brand, model) {
  if (!brand || !model) return model ?? brand ?? "";
  const shortModel = stripBrandPrefix(brand, model);
  return shortModel.toLowerCase().startsWith(brand.toLowerCase()) ? shortModel : `${brand} ${shortModel}`;
}

function stripBrandPrefix(brand, model) {
  if (!brand || !model) return model ?? "";
  return model.toLowerCase().startsWith(brand.toLowerCase()) ? model.slice(brand.length).trim() : model;
}

function normalizeZipEntry(entry) {
  return entry.replaceAll("\\", "/");
}

function findSourcePage(record) {
  const rows = record?.sourceRows ?? [];
  for (const row of rows) {
    const value = row.values?.["Страница источника фото"];
    if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  }
  for (const row of rows) {
    const values = row.values ?? {};
    for (const [key, value] of Object.entries(values)) {
      if (typeof value !== "string") continue;
      const lowerKey = key.toLowerCase();
      if ((lowerKey.includes("официаль") || lowerKey.includes("страница источника")) && /^https?:\/\//i.test(value)) {
        return value;
      }
    }
  }
  return null;
}

function findSourceImageUrl(record, selectedItem) {
  if (selectedItem?.remoteImageUrl) return selectedItem.remoteImageUrl;
  if (selectedItem?.actualZipEntry) return `local ZIP: ${selectedItem.sourcePackage} :: ${selectedItem.actualZipEntry}`;
  const rows = record?.sourceRows ?? [];
  for (const row of rows) {
    const values = row.values ?? {};
    for (const [key, value] of Object.entries(values)) {
      if (typeof value === "string" && key.toLowerCase().includes("фото") && /^https?:\/\//i.test(value)) return value;
    }
  }
  return null;
}

async function loadSourceBuffer(item) {
  if (item.actualZipEntry) {
    const zipPath = path.join(rawCatalogDir, item.sourcePackage);
    const zip = await JSZip.loadAsync(await readFile(zipPath));
    const entryPath = normalizeZipEntry(item.actualZipEntry);
    const entry = zip.file(entryPath);
    if (!entry) throw new Error(`Missing ZIP entry ${entryPath} in ${item.sourcePackage}`);
    return entry.async("nodebuffer");
  }

  if (!item.remoteImageUrl) throw new Error(`No image source for ${item.referenceSlug}`);
  const response = await fetch(item.remoteImageUrl, { signal: AbortSignal.timeout(remoteFetchTimeoutMs) });
  if (!response.ok) throw new Error(`Remote image fetch failed (${response.status}) for ${item.remoteImageUrl}`);
  return Buffer.from(await response.arrayBuffer());
}

function isEdgeBackgroundPixel(data, offset, threshold, spreadTolerance) {
  const red = data[offset];
  const green = data[offset + 1];
  const blue = data[offset + 2];
  const alpha = data[offset + 3];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  return alpha > 0 && red >= threshold && green >= threshold && blue >= threshold && max - min <= spreadTolerance;
}

function removeEdgeConnectedBackground(input, width, height, threshold = 244, spreadTolerance = 24) {
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
  return output;
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

async function createPreparedAsset(item, destinationPath) {
  const sourceBuffer = await loadSourceBuffer(item);
  const sourceImage = sharp(sourceBuffer, { animated: false }).ensureAlpha();
  const metadata = await sourceImage.metadata();
  const { data, info } = await sourceImage.raw().toBuffer({ resolveWithObject: true });
  const backgroundRemoved = removeEdgeConnectedBackground(data, info.width, info.height);
  const bounds = alphaBounds(backgroundRemoved, info.width, info.height);
  const padding = Math.round(Math.max(bounds.width, bounds.height) * 0.06);
  const left = Math.max(0, bounds.left - padding);
  const top = Math.max(0, bounds.top - padding);
  const right = Math.min(info.width - 1, bounds.left + bounds.width - 1 + padding);
  const bottom = Math.min(info.height - 1, bounds.top + bounds.height - 1 + padding);
  const crop = { left, top, width: right - left + 1, height: bottom - top + 1 };
  const object = await sharp(backgroundRemoved, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract(crop)
    .resize(1320, 1500, { fit: "inside" })
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: 1700,
      height: 1800,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    },
  })
    .composite([{ input: object, gravity: "center" }])
    .png()
    .toFile(destinationPath);
  const outputMetadata = await sharp(destinationPath).metadata();
  return {
    sourceDimensions: { width: metadata.width, height: metadata.height },
    outputDimensions: { width: outputMetadata.width, height: outputMetadata.height },
  };
}

async function copyOrCreateAsset(config, selectedItem, destinationPath) {
  if (config.existingAssetPath) {
    const absoluteExisting = path.join(root, config.existingAssetPath);
    try {
      await stat(absoluteExisting);
      await copyFile(absoluteExisting, destinationPath);
      const outputMetadata = await sharp(destinationPath).metadata();
      return {
        outputDimensions: { width: outputMetadata.width, height: outputMetadata.height },
        reusedExistingAsset: true,
      };
    } catch {
      // Fall through to source generation when the cached generated asset is not present.
    }
  }
  return createPreparedAsset(selectedItem, destinationPath);
}

function escapeSvg(text) {
  return String(text ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function labelSvg(item, width, height) {
  return Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#fbfaf7"/>
      <text x="18" y="30" font-family="Arial, sans-serif" font-size="17" font-weight="700" fill="#101316">${escapeSvg(item.scenarioId)} ${escapeSvg(item.scenarioTitle)}</text>
      <text x="18" y="58" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#343434">${escapeSvg(item.role.toUpperCase())}: ${escapeSvg(displayModel(item.brand, item.model))}</text>
      <text x="18" y="82" font-family="Arial, sans-serif" font-size="12" fill="#6f6b63">${escapeSvg(item.reference)} - ${escapeSvg(formatRub(item.priceRub))}</text>
      <text x="18" y="105" font-family="Arial, sans-serif" font-size="12" fill="#8a8378">${escapeSvg(item.photoView)} - ${escapeSvg(item.sourceQuality)}</text>
    </svg>
  `);
}

async function createContactSheet(items, destinationPath, columns = 4) {
  const cellWidth = 420;
  const cellHeight = 520;
  const rows = Math.max(1, Math.ceil(items.length / columns));
  const composites = [];
  for (const [index, item] of items.entries()) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const left = column * cellWidth;
    const top = row * cellHeight;
    const image = await sharp(path.join(root, item.localPath)).resize(285, 330, { fit: "inside" }).png().toBuffer();
    composites.push({ input: labelSvg(item, cellWidth, cellHeight), left, top });
    composites.push({ input: image, left: left + 67, top: top + 135 });
  }
  const background = Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${cellWidth * columns}" height="${cellHeight * rows}">
      <rect width="100%" height="100%" fill="#f4f1ec"/>
    </svg>
  `);
  await sharp(background).composite(composites).jpeg({ quality: 92 }).toFile(destinationPath);
}

function buildShortlistDoc(manifest) {
  const lines = [
    "# Home Hero Watch Shortlist",
    "",
    "Preparation-only shortlist for the future Eternal Time homepage hero. This pass does not change the production homepage, Catalog UI, Supabase, or catalog data.",
    "",
    "Selection rule: scenario fit first, then image quality/character, model level, price positioning, and only then layout convenience.",
    "",
    "Confirmed limitation: Tissot Gentleman is not present in the current catalog preview or image upload plan, so it is not selected.",
    "",
  ];
  for (const scenario of manifest.scenarios) {
    lines.push(`## ${scenario.id}. ${scenario.titleRu}`);
    lines.push("");
    lines.push(`Decision: ${scenario.decision}`);
    lines.push("");
    for (const item of scenario.items) {
      lines.push(`### ${item.role}: ${displayModel(item.brand, item.model)}`);
      lines.push(`- Reference: ${item.reference}`);
      lines.push(`- Catalog price: ${formatRub(item.priceRub)}`);
      lines.push(`- Why it fits: ${item.reason}`);
      lines.push(`- Photo: ${item.photoView}; ${item.sourceQuality}`);
      lines.push(`- Use as hero main: ${item.useAsHeroMain ? "yes" : "no"}`);
      lines.push(`- Use as secondary: ${item.useAsSecondary ? "yes" : "no"}`);
      lines.push(`- Local file: \`${item.localPath}\``);
      lines.push("");
    }
  }
  lines.push("## Ready / Needs Review");
  lines.push("");
  lines.push("- Ready for hero composition: 01 Everyday, 02 Under Shirt, 03 Travel, 05 Sport, 06 Collection.");
  lines.push("- Needs manual art-direction decision: 04 First Mechanical, because Bambino is semantically best but current official image is too low-resolution; EFK is visually stronger but slightly lower-positioned.");
  lines.push("- MT-G is kept as a visual alternate only. It should not become a universal hero main without explicit art-direction approval.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

function buildSourcesDoc(manifest) {
  const lines = [
    "# Home Hero Image Sources",
    "",
    "Image source audit for the six homepage hero scenarios. Local ZIP entries come from the staged catalog import packages; remote URLs are official brand URLs already present in import provenance.",
    "",
    "| Scenario | Role | Model | Ref | Source page | Source image | Local file | Quality |",
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const scenario of manifest.scenarios) {
    for (const item of scenario.items) {
      lines.push(
        `| ${scenario.id} ${scenario.titleRu} | ${item.role} | ${displayModel(item.brand, item.model)} | ${item.reference} | ${item.sourcePageUrl ?? "not in source data"} | ${item.sourceImageUrl ?? "not in source data"} | \`${item.localPath}\` | ${item.sourceQuality} |`,
      );
    }
  }
  lines.push("");
  lines.push("## Weak Sources");
  lines.push("");
  lines.push("- Orient Bambino 38: correct official source page and image URL exist, but current image metadata is only 328x492. It is not a safe main hero asset.");
  lines.push("- Casio GBD-H1000-1A4: functional fit is good, but source dimensions are low compared with Tissot/MT-G assets; use as secondary/alternate.");
  lines.push("- Tissot PR 100 Chronograph: local source is stable and readable, but source 1 is frontal and flat; source 2/3 are side/back and not hero-main material.");
  lines.push("");
  lines.push("## Strong Sources");
  lines.push("");
  lines.push("- Tissot Classic Dream 40mm, PR 100 leather, Seastar Chronograph, Seastar 40mm, PRX Powermatic 80: clean official/product sources suitable for editorial preparation.");
  lines.push("- Casio MTG-B3000DN-1A: strongest perspective/product source, but visually aggressive; kept as alternate/manual decision.");
  lines.push("- Casio EFK-100D-2A: useful first-mechanical main candidate because local source quality is better than current Bambino imagery.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

async function main() {
  const preview = JSON.parse(await readFile(previewPath, "utf8"));
  const imagePlan = JSON.parse(await readFile(imagePlanPath, "utf8"));
  const recordsBySlug = new Map();
  for (const record of preview.records ?? []) {
    const slug = referenceSlug(record.identity?.referenceNormalized);
    if (slug) recordsBySlug.set(slug, record);
  }
  const imageItemsBySlug = new Map();
  for (const item of imagePlan.items ?? []) {
    if (!item.referenceSlug) continue;
    const list = imageItemsBySlug.get(item.referenceSlug) ?? [];
    list.push(item);
    imageItemsBySlug.set(item.referenceSlug, list);
  }

  await mkdir(outputRoot, { recursive: true });
  const manifest = {
    generatedAt: new Date().toISOString(),
    sourcePreviewPath: path.relative(root, previewPath).replaceAll("\\", "/"),
    sourceImagePlanPath: path.relative(root, imagePlanPath).replaceAll("\\", "/"),
    contactSheetPath: path.relative(root, contactSheetPath).replaceAll("\\", "/"),
    scenarios: [],
  };
  const allItems = [];

  for (const scenario of scenarios) {
    const scenarioDir = path.join(outputRoot, scenario.slug);
    await mkdir(scenarioDir, { recursive: true });
    const scenarioResult = {
      id: scenario.id,
      slug: scenario.slug,
      title: scenario.title,
      titleRu: scenario.titleRu,
      decision: scenario.decision,
      comparisonSheetPath: path.relative(root, path.join(scenarioDir, "comparison.jpg")).replaceAll("\\", "/"),
      items: [],
    };

    for (const config of scenario.candidates) {
      const record = recordsBySlug.get(config.referenceSlug);
      if (!record) throw new Error(`Catalog preview record not found for ${config.referenceSlug}`);
      const selectedItem = (imageItemsBySlug.get(config.referenceSlug) ?? []).find(
        (item) => Number(item.intendedOrder) === Number(config.sourceImageIndex),
      );
      if (!selectedItem) throw new Error(`Image source index ${config.sourceImageIndex} not found for ${config.referenceSlug}`);

      const destinationPath = path.join(scenarioDir, config.outputName);
      const prepared = await copyOrCreateAsset(config, selectedItem, destinationPath);
      const localPath = path.relative(root, destinationPath).replaceAll("\\", "/");
      const result = {
        scenarioId: scenario.id,
        scenarioTitle: scenario.titleRu,
        role: config.role,
        brand: record.identity?.brand,
        model: stripBrandPrefix(record.identity?.brand, record.identity?.title),
        reference: record.identity?.referenceNormalized,
        referenceSlug: config.referenceSlug,
        priceRub: record.pricing?.publicPriceCandidate?.amountMinor
          ? record.pricing.publicPriceCandidate.amountMinor / 100
          : null,
        reason: config.reason,
        sourcePageUrl: findSourcePage(record),
        sourceImageUrl: findSourceImageUrl(record, selectedItem),
        selectedSourceImageIndex: config.sourceImageIndex,
        sourcePackage: selectedItem.sourcePackage,
        actualZipEntry: selectedItem.actualZipEntry,
        remoteImageUrl: selectedItem.remoteImageUrl,
        localPath,
        photoView: config.photoView,
        sourceQuality: config.sourceQuality,
        useAsHeroMain: config.useAsHeroMain,
        useAsSecondary: config.useAsSecondary,
        reusedExistingAsset: Boolean(prepared.reusedExistingAsset),
        sourceDimensions: prepared.sourceDimensions ?? null,
        outputDimensions: prepared.outputDimensions,
      };
      scenarioResult.items.push(result);
      allItems.push(result);
    }

    await createContactSheet(scenarioResult.items, path.join(scenarioDir, "comparison.jpg"), 3);
    manifest.scenarios.push(scenarioResult);
  }

  await createContactSheet(allItems, contactSheetPath, 4);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(docsShortlistPath, buildShortlistDoc(manifest), "utf8");
  await writeFile(docsSourcesPath, buildSourcesDoc(manifest), "utf8");
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicDir = join(root, "public");
const outDir = join(publicDir, "generated", "homepage-premium-assets");

const approved = [
  {
    reference: "T150.410.16.051.00",
    slug: "t1504101605100",
    title: "Tissot PR 100 40mm",
    decision: "APPROVED_HERO",
    sourcePath: "/generated/home-hero/orbit-normalized/candidates/02-under-shirt/main-01.png",
    notes: "Front-facing, clean transparent asset, strong enough for hero center.",
  },
  {
    reference: "T120.417.11.041.03",
    slug: "t1204171104103",
    title: "Tissot Seastar 1000 Chronograph",
    decision: "APPROVED_HERO",
    sourcePath: "/generated/home-hero/orbit-normalized/final/t1204171104103/frame-03.png",
    notes: "High-resolution front asset from final user-supplied set.",
  },
  {
    reference: "T137.407.33.051.00",
    slug: "t1374073305100",
    title: "Tissot PRX Powermatic Gold",
    decision: "APPROVED_HERO",
    sourcePath: "/generated/home-hero/orbit-normalized/final/t1374073305100/frame-02.png",
    notes: "High-resolution front asset with full bracelet silhouette.",
  },
  {
    reference: "EFK-100D-2A",
    slug: "efk100d2a",
    title: "Casio Edifice Automatic",
    decision: "APPROVED_HERO",
    sourcePath: "/generated/home-hero/orbit-normalized/candidates/04-first-mechanical/main-01.png",
    notes: "Confirmed front asset, sharp enough for hero and supporting scenes.",
  },
  {
    reference: "T150.210.11.041.00",
    slug: "t1502101104100",
    title: "Tissot PR 100 34mm",
    decision: "APPROVED_LARGE_SECTION",
    sourcePath: "/generated/home-hero/orbit-normalized/candidates/01-everyday/alt-01.png",
    notes: "Good clean front asset, kept slightly smaller than hero-center watches.",
  },
  {
    reference: "T150.417.11.041.00",
    slug: "t1504171104100",
    title: "Tissot PR 100 Chronograph",
    decision: "APPROVED_LARGE_SECTION",
    sourcePath: "/generated/home-hero/orbit-normalized/candidates/01-everyday/secondary-01.png",
    notes: "Clean product image for large sections and orbit alternatives.",
  },
  {
    reference: "MTG-B3000DN-1A",
    slug: "mtgb3000dn1a",
    title: "Casio G-Shock MT-G",
    decision: "APPROVED_LARGE_SECTION",
    sourcePath: "/generated/home-hero/orbit-normalized/candidates/05-sport/alt-01.png",
    notes: "Strong sport visual; used as supporting hero/orbit alternative.",
  },
];

const rejected = [
  {
    reference: "T129.410.11.053.00",
    sourcePath: "/generated/home-hero/orbit-normalized/final/t1294101105300/frame-02.png",
    decision: "REJECTED_LOW_RESOLUTION",
    notes: "228x341 source is not safe for production homepage enlargement.",
  },
  {
    reference: "RA-AC0M03S10B",
    sourcePath: "/generated/home-hero/orbit-normalized/final/raac0m03s10b/frame-01.png",
    decision: "REJECTED_LOW_RESOLUTION",
    notes: "229x342 source remains thumbnail-only until a better Bambino asset is available.",
  },
  {
    reference: "RA-AC0Q03S10B",
    sourcePath: "/generated/home-hero/orbit-normalized/final/raac0q03s10b/frame-01.png",
    decision: "REJECTED_LOW_RESOLUTION",
    notes: "Source is too small for premium homepage use.",
  },
  {
    reference: "GBD-H1000-1A4",
    sourcePath: "/generated/home-hero/orbit-normalized/final/gbdh10001a4/frame-01.png",
    decision: "REJECTED_LOW_RESOLUTION",
    notes: "342x338 source reads as a thumbnail, not a hero/watch-led asset.",
  },
  {
    reference: "T120.807.33.051.00",
    sourcePath: "/generated/home-hero/orbit-normalized/final/t1208073305100/frame-01.png",
    decision: "REJECTED_LOW_RESOLUTION",
    notes: "202x342 source would be visibly degraded in the production hero.",
  },
  {
    reference: "T137.407.11.041.00",
    sourcePath: "/generated/home-hero/orbit-normalized/final/t1374071104100/frame-01.png",
    decision: "REJECTED_WRONG_ANGLE",
    notes: "Angled/side frame conflicts with the front-only production hero art direction.",
  },
  {
    reference: "debug-contact-sheets",
    sourcePath: "/generated/home-hero/**/comparison.jpg",
    decision: "REJECTED_DEBUG_ASSET",
    notes: "Comparison/contact/debug images are never production homepage art.",
  },
];

function publicPath(path) {
  return join(publicDir, path.replace(/^\//, ""));
}

async function normalize(record) {
  const source = publicPath(record.sourcePath);
  const input = sharp(source, { failOn: "error" });
  const metadata = await input.metadata();
  const trimmed = await input
    .ensureAlpha()
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 2 })
    .extend({ top: 26, right: 26, bottom: 26, left: 26, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer({ resolveWithObject: true });
  const outputName = `${record.slug}.png`;
  const outputPath = join(outDir, outputName);
  await sharp(trimmed.data).png().toFile(outputPath);
  return {
    ...record,
    generatedPath: `/generated/homepage-premium-assets/${outputName}`,
    sourceWidth: metadata.width ?? 0,
    sourceHeight: metadata.height ?? 0,
    generatedWidth: trimmed.info.width,
    generatedHeight: trimmed.info.height,
    hasAlpha: Boolean(metadata.hasAlpha),
    noArtificialUpscale: true,
  };
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function checkerboardSvg(width, height) {
  return Buffer.from(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="checker" width="32" height="32" patternUnits="userSpaceOnUse">
          <rect width="16" height="16" fill="#8d9498"/>
          <rect x="16" y="16" width="16" height="16" fill="#8d9498"/>
          <rect x="16" width="16" height="16" fill="#747b80"/>
          <rect y="16" width="16" height="16" fill="#747b80"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#checker)"/>
    </svg>
  `);
}

async function makeContactSheet(records) {
  const width = 1800;
  const height = 1120;
  const cellW = 420;
  const cellH = 500;
  const composites = [{ input: checkerboardSvg(width, height), top: 0, left: 0 }];

  for (const [index, record] of records.entries()) {
    const col = index % 4;
    const row = Math.floor(index / 4);
    const left = 54 + col * 430;
    const top = 54 + row * 520;
    const image = await sharp(publicPath(record.generatedPath)).resize({ width: 260, height: 340, fit: "inside", withoutEnlargement: true }).png().toBuffer();
    const label = Buffer.from(`
      <svg width="${cellW}" height="${cellH}" xmlns="http://www.w3.org/2000/svg">
        <rect x="0" y="0" width="${cellW}" height="${cellH}" rx="0" fill="rgba(245,242,235,.72)" stroke="rgba(16,22,26,.35)"/>
        <text x="24" y="38" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#10161A">${escapeXml(record.reference)}</text>
        <text x="24" y="64" font-family="Arial, sans-serif" font-size="14" fill="#273139">${escapeXml(record.title)}</text>
        <text x="24" y="90" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#B47A35">${escapeXml(record.decision)}</text>
        <text x="24" y="468" font-family="Arial, sans-serif" font-size="12" fill="#273139">${record.generatedWidth}x${record.generatedHeight} from ${record.sourceWidth}x${record.sourceHeight}</text>
      </svg>
    `);
    composites.push({ input: label, left, top });
    composites.push({ input: image, left: left + 80, top: top + 112 });
  }

  await sharp({ create: { width, height, channels: 3, background: "#7c8387" } })
    .composite(composites)
    .jpeg({ quality: 88 })
    .toFile(join(outDir, "homepage-premium-assets-contact-sheet.jpg"));
}

mkdirSync(outDir, { recursive: true });

const approvedRecords = [];
for (const record of approved) {
  approvedRecords.push(await normalize(record));
}

const manifest = {
  generatedAt: new Date().toISOString(),
  policy: "Homepage production uses only approved homepage-premium-assets; rejected/debug/contact images are excluded from production render paths.",
  approved: approvedRecords,
  rejected,
};

writeFileSync(join(outDir, "homepage-premium-assets-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
await makeContactSheet(approvedRecords);

console.log(`Prepared ${approvedRecords.length} homepage premium assets in ${outDir}`);

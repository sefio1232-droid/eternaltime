import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const projectRoot = process.cwd();
const defaultSourceDir = path.resolve(
  projectRoot,
  "..",
  "docs",
  "EternalTime_9_документов_ФИНАЛ_15-08-2026",
);
const sourceDir = path.resolve(process.env.LEGAL_DOCS_SOURCE_DIR ?? defaultSourceDir);
const outputPath = path.join(projectRoot, "src", "content", "legal", "legal-documents.generated.json");

const documentRegistry = [
  {
    slug: "seller-details",
    title: "Реквизиты продавца и обязательная информация о продавце",
    purpose: "Публичные сведения о продавце и каналах обращений.",
    fileName: "EternalTime_Реквизиты_и_обязательная_информация_о_продавце_ФИНАЛЬНАЯ_15-08-2026.docx",
  },
  {
    slug: "public-offer",
    title: "Публичная оферта",
    purpose: "Условия дистанционной розничной купли-продажи часов.",
    fileName: "EternalTime_Публичная_оферта_ФИНАЛЬНАЯ_15-08-2026.docx",
  },
  {
    slug: "delivery-and-payment",
    title: "Политика доставки и оплаты",
    purpose: "Правила оплаты, доставки, передачи и получения заказа.",
    fileName: "EternalTime_Политика_доставки_и_оплаты_ФИНАЛЬНАЯ_15-08-2026.docx",
  },
  {
    slug: "returns",
    title: "Правила возврата и обмена",
    purpose: "Порядок отказа от товара, возврата, обмена и требований по недостаткам.",
    fileName: "EternalTime_Правила_возврата_и_обмена_ФИНАЛЬНЫЕ_15-08-2026.docx",
  },
  {
    slug: "terms",
    title: "Пользовательское соглашение",
    purpose: "Условия использования сайта, аккаунта и персонализированных функций.",
    fileName: "EternalTime_Пользовательское_соглашение_ФИНАЛЬНОЕ_15-08-2026.docx",
  },
  {
    slug: "privacy",
    title: "Политика обработки персональных данных",
    purpose: "Правила обработки персональных данных пользователей и покупателей.",
    fileName: "EternalTime_Политика_обработки_персональных_данных_ФИНАЛЬНАЯ_15-08-2026.docx",
  },
  {
    slug: "personal-data-consent",
    title: "Согласие на обработку персональных данных",
    purpose: "Текст согласия пользователя на обработку персональных данных.",
    fileName: "EternalTime_Согласие_на_обработку_персональных_данных_ПЕРЕРАБОТАННОЕ_15-08-2026.docx",
  },
  {
    slug: "cookies",
    title: "Политика использования cookies",
    purpose: "Описание cookies, аналогичных технологий и управления ими.",
    fileName: "EternalTime_Политика_использования_cookies_ФИНАЛЬНАЯ_15-08-2026.docx",
  },
  {
    slug: "marketing-consent",
    title: "Согласие на получение рекламных сообщений",
    purpose: "Добровольное согласие на рекламные сообщения и порядок отказа от них.",
    fileName: "EternalTime_Согласие_на_получение_рекламных_сообщений_ФИНАЛЬНОЕ_15-08-2026.docx",
  },
];

function decodeXmlEntities(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function normalizeText(value) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function textFromXmlFragment(fragment) {
  const tokens = [];
  const tokenPattern = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/>|<w:br\b[^>]*\/>/g;
  let match;

  while ((match = tokenPattern.exec(fragment)) !== null) {
    if (match[1] !== undefined) {
      tokens.push(decodeXmlEntities(match[1]));
      continue;
    }
    if (match[0].startsWith("<w:tab")) tokens.push("\t");
    else if (match[0].startsWith("<w:br")) tokens.push("\n");
  }

  return normalizeText(tokens.join(""));
}

function extractBlocks(documentXml) {
  const body = documentXml.match(/<w:body[^>]*>([\s\S]*?)<\/w:body>/)?.[1];
  if (!body) {
    throw new Error("DOCX document.xml has no w:body");
  }

  const blocks = [];
  const blockPattern = /<w:(p|tbl)\b[\s\S]*?<\/w:\1>/g;
  let blockMatch;

  while ((blockMatch = blockPattern.exec(body)) !== null) {
    const [fragment, kind] = blockMatch;
    if (kind === "p") {
      const text = textFromXmlFragment(fragment);
      if (text) blocks.push({ type: "paragraph", text });
      continue;
    }

    const rows = [];
    const rowPattern = /<w:tr\b[\s\S]*?<\/w:tr>/g;
    let rowMatch;
    while ((rowMatch = rowPattern.exec(fragment)) !== null) {
      const cells = [];
      const cellPattern = /<w:tc\b[\s\S]*?<\/w:tc>/g;
      let cellMatch;
      while ((cellMatch = cellPattern.exec(rowMatch[0])) !== null) {
        cells.push(textFromXmlFragment(cellMatch[0]));
      }
      if (cells.some(Boolean)) rows.push(cells);
    }
    if (rows.length > 0) blocks.push({ type: "table", rows });
  }

  return blocks;
}

async function readDocxBlocks(filePath) {
  const zip = await JSZip.loadAsync(await readFile(filePath));
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) {
    throw new Error(`DOCX has no word/document.xml: ${filePath}`);
  }
  return extractBlocks(documentXml);
}

function contentTextFromBlocks(blocks) {
  return blocks
    .map((block) => {
      if (block.type === "paragraph") return block.text;
      return block.rows.map((row) => row.join(" | ")).join("\n");
    })
    .join("\n");
}

const documents = [];

for (const item of documentRegistry) {
  const filePath = path.join(sourceDir, item.fileName);
  const blocks = await readDocxBlocks(filePath);
  const documentTitle = blocks.find((block) => block.type === "paragraph")?.text;
  if (!documentTitle) {
    throw new Error(`Document has no title paragraph: ${item.fileName}`);
  }

  documents.push({
    slug: item.slug,
    title: item.title,
    purpose: item.purpose,
    route: `/legal/${item.slug}`,
    sourceFileName: item.fileName,
    sourceArchive: path.basename(sourceDir),
    documentTitle,
    blockCount: blocks.length,
    contentText: contentTextFromBlocks(blocks),
    blocks,
  });
}

await writeFile(outputPath, `${JSON.stringify(documents, null, 2)}\n`, "utf8");

console.log(`Generated ${documents.length} legal documents from ${sourceDir}`);
for (const document of documents) {
  console.log(`${document.slug}: ${document.blockCount} blocks`);
}

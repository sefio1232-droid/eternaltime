import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const baseUrl = process.env.INTEGRATION_AUDIT_URL ?? "http://127.0.0.1:3004";
const outputDirectory = process.env.INTEGRATION_AUDIT_OUTPUT ?? join(process.cwd(), ".tmp", "runtime-qa", "screenshots");
const focusedInteractions = process.env.INTEGRATION_AUDIT_FOCUSED === "1";
const debugPort = 9800 + Math.floor(Math.random() * 100);
const userDataDirectory = await mkdtemp(join(tmpdir(), "eternal-time-integration-chrome-"));
const browserMessages = [];

await mkdir(outputDirectory, { recursive: true });

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-extensions",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-allow-origins=*",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDirectory}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForJson(pathname, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}${pathname}`);
      if (response.ok) return response.json();
    } catch {
      // Chrome is still starting.
    }
    await delay(200);
  }
  throw new Error(`Chrome debugging endpoint did not become ready: ${pathname}`);
}

class CdpClient {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", async (event) => {
      const raw = typeof event.data === "string" ? event.data : await event.data.text();
      const message = JSON.parse(raw);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      if (message.method === "Runtime.exceptionThrown") {
        browserMessages.push({
          type: "exception",
          url: message.params?.exceptionDetails?.url ?? "",
          text: message.params?.exceptionDetails?.exception?.description ?? message.params?.exceptionDetails?.text ?? "Runtime exception",
        });
      }
      if (message.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(message.params?.type)) {
        browserMessages.push({
          type: message.params.type,
          url: "",
          text: (message.params.args ?? []).map((argument) => argument.value ?? argument.description ?? "").join(" "),
        });
      }
      if (message.method === "Log.entryAdded" && ["error", "warning"].includes(message.params?.entry?.level)) {
        browserMessages.push({
          type: message.params.entry.level,
          url: message.params.entry.url ?? "",
          text: message.params.entry.text ?? "",
        });
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text ?? "Runtime evaluation failed");
  }
  return result.result.value;
}

async function setViewport(client, width, height) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile: width < 768,
  });
}

async function navigate(client, pathname, readySelector = "main") {
  const targetUrl = pathname.startsWith("http") ? pathname : `${baseUrl}${pathname}`;
  await client.send("Page.navigate", { url: targetUrl });
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const ready = await evaluate(
      client,
      `document.readyState !== "loading" && Boolean(document.querySelector(${JSON.stringify(readySelector)}))`,
    ).catch(() => false);
    if (ready) break;
    await delay(200);
  }
  await evaluate(
    client,
    "Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 3000))]).then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))",
  );
  await delay(250);
}

async function waitFor(client, expression, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await evaluate(client, expression).catch(() => false)) return true;
    await delay(200);
  }
  return false;
}

async function waitForHydration(client, selector) {
  return waitFor(
    client,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      return Boolean(element && Object.keys(element).some((key) => key.startsWith('__reactProps$')));
    })()`,
    100,
  );
}

async function capture(client, name) {
  const metrics = await client.send("Page.getLayoutMetrics");
  const content = metrics.cssContentSize ?? metrics.contentSize;
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: {
      x: 0,
      y: 0,
      width: Math.max(1, Math.ceil(content.width)),
      height: Math.max(1, Math.ceil(content.height)),
      scale: 1,
    },
  });
  const filePath = join(outputDirectory, `${name}.png`);
  await writeFile(filePath, Buffer.from(screenshot.data, "base64"));
  return filePath;
}

const pageAuditExpression = `(() => {
  const visible = (element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  };
  const images = [...document.images].filter(visible);
  const unnamedButtons = [...document.querySelectorAll('button')].filter((button) => visible(button) && !(button.innerText || button.getAttribute('aria-label') || button.title).trim());
  const unnamedLinks = [...document.querySelectorAll('a[href]')].filter((link) => visible(link) && !(link.innerText || link.getAttribute('aria-label') || link.title || link.querySelector('img[alt]')?.alt || '').trim());
  return {
    url: location.href,
    title: document.title,
    h1Count: document.querySelectorAll('h1').length,
    mainCount: document.querySelectorAll('main').length,
    imageCount: images.length,
    imageFailures: images.filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src).slice(0, 8),
    missingAltCount: images.filter((image) => !image.hasAttribute('alt')).length,
    unnamedButtonCount: unnamedButtons.length,
    unnamedLinkCount: unnamedLinks.length,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  };
})()`;

async function auditPage(client, pathname, viewport) {
  await setViewport(client, viewport.width, viewport.height);
  await navigate(client, pathname);
  return { pathname, viewport: viewport.name, ...(await evaluate(client, pageAuditExpression)) };
}

const desktop = { name: "desktop", width: 1440, height: 900 };
const mobile = { name: "mobile", width: 390, height: 844 };
const publicPaths = [
  "/",
  "/watches",
  "/brands",
  "/watches/casio",
  "/watches/orient",
  "/watches/tissot",
  "/watches/citizen",
  "/journal",
  "/journal/pochemu-mekhanicheskie-chasy-populyarny",
  "/journal/kak-vybrat-brend-chasov",
  "/journal/chasy-kak-investitsiya",
  "/faq",
  "/selection",
  "/collection",
  "/compare",
  "/cart",
  "/account",
  "/account/profile",
  "/account/orders",
];

let client;
try {
  const targets = await waitForJson("/json/list");
  const target = targets.find((candidate) => candidate.type === "page");
  if (!target?.webSocketDebuggerUrl) throw new Error("Chrome page target was not found");
  client = new CdpClient(target.webSocketDebuggerUrl);
  await client.connect();
  await client.send("Page.enable");
  await client.send("Runtime.enable");
  await client.send("Log.enable");

  const http = [];
  for (const pathname of [...publicPaths, "/sitemap.xml", "/robots.txt"]) {
    const response = await fetch(`${baseUrl}${pathname}`, { redirect: "manual" });
    http.push({ pathname, status: response.status, location: response.headers.get("location") });
  }

  const pages = [];
  const auditedPaths = focusedInteractions ? ["/watches", "/watches/tissot", "/compare"] : publicPaths;
  for (const pathname of auditedPaths) pages.push(await auditPage(client, pathname, desktop));
  if (!focusedInteractions) {
    for (const pathname of ["/", "/watches", "/journal", "/compare"]) pages.push(await auditPage(client, pathname, mobile));
  }

  await setViewport(client, desktop.width, desktop.height);
  await navigate(client, "/watches");
  const catalogHydrated = await waitForHydration(client, 'button[aria-controls="catalog-filters-panel"]');
  const catalogInitial = await evaluate(client, `({
    cards: document.querySelectorAll('a[href^="/watches/"]').length,
    compareButtons: document.querySelectorAll('button[aria-pressed][data-variant="card"]').length,
    filterTriggers: document.querySelectorAll('button[aria-haspopup="dialog"]').length,
    sortControls: document.querySelectorAll('select[name="sort"]').length,
    searchControls: document.querySelectorAll('input[name="q"]').length,
  })`);

  await evaluate(client, `document.querySelector('button[aria-controls="catalog-filters-panel"]')?.click()`);
  const filterDialogOpened = await waitFor(client, `Boolean(document.querySelector('[role="dialog"]#catalog-filters-panel'))`);
  const filterDialogState = await evaluate(client, `({
    opened: Boolean(document.querySelector('[role="dialog"]#catalog-filters-panel')),
    bodyLocked: document.body.style.overflow === 'hidden',
    movementChoices: document.querySelectorAll('#catalog-filters-panel input[name="movement"]').length,
    positioningChoices: document.querySelectorAll('#catalog-filters-panel input[name="positioning"]').length,
  })`);
  await evaluate(client, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  const filterDialogClosed = await waitFor(client, `!document.querySelector('[role="dialog"]#catalog-filters-panel')`);

  await evaluate(client, `(() => {
    const input = document.querySelector('input[name="q"]');
    if (!input) return false;
    input.value = 'PRX';
    input.form?.requestSubmit();
    return true;
  })()`);
  const searchApplied = await waitFor(
    client,
    `new URL(location.href).searchParams.get('q') === 'PRX' && document.querySelector('input[name="q"]')?.value === 'PRX'`,
    100,
  );
  await waitForHydration(client, 'select[name="sort"]');
  const searchState = await evaluate(client, `({
    url: location.href,
    value: document.querySelector('input[name="q"]')?.value ?? '',
    resultLinks: document.querySelectorAll('a[href^="/watches/tissot/"]').length,
  })`);

  await evaluate(client, `(() => {
    const select = document.querySelector('select[name="sort"]');
    if (!select) return false;
    select.value = 'price_desc';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  const sortApplied = await waitFor(
    client,
    `new URL(location.href).searchParams.get('sort') === 'price_desc' && document.querySelector('select[name="sort"]')?.value === 'price_desc'`,
    100,
  );
  const sortState = await evaluate(client, `({ url: location.href, value: document.querySelector('select[name="sort"]')?.value ?? '' })`);

  await navigate(client, "/watches");
  await waitFor(client, `document.querySelectorAll('button[aria-pressed][data-variant="card"]').length >= 2`);
  const compareHydrated = await waitForHydration(client, 'button[aria-pressed][data-variant="card"]');
  const compareSelection = await evaluate(client, `(() => {
    const buttons = [...document.querySelectorAll('button[aria-pressed][data-variant="card"]')];
    buttons[0]?.click();
    return buttons.length;
  })()`);
  await waitFor(client, `document.querySelectorAll('button[aria-pressed="true"][data-variant="card"]').length === 1`);
  await evaluate(client, `(() => {
    const nextButton = [...document.querySelectorAll('button[aria-pressed="false"][data-variant="card"]')][0];
    nextButton?.click();
    return Boolean(nextButton);
  })()`);
  await waitFor(client, `document.querySelectorAll('button[aria-pressed="true"][data-variant="card"]').length === 2`);
  const compareTrayState = await evaluate(client, `({
    active: document.querySelectorAll('button[aria-pressed="true"][data-variant="card"]').length,
    tray: Boolean(document.querySelector('aside[aria-label]')),
    href: document.querySelector('aside[aria-label] a[href^="/compare"]')?.getAttribute('href') ?? null,
  })`);
  const catalogScreenshot = await capture(client, "catalog-desktop");
  if (compareTrayState.href) await navigate(client, compareTrayState.href);
  const compareState = await evaluate(client, `({
    url: location.href,
    h1: document.querySelector('h1')?.innerText ?? '',
    chapters: document.querySelectorAll('section').length,
    tables: document.querySelectorAll('table').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  })`);
  const compareScreenshot = await capture(client, "compare-desktop");

  await navigate(client, "/watches/tissot");
  const detailHref = await evaluate(client, `(() => {
    const links = [...document.querySelectorAll('a[href^="/watches/tissot/"]')];
    return links.find((link) => link.querySelector('img'))?.getAttribute('href') ?? links[0]?.getAttribute('href') ?? null;
  })()`);
  if (!detailHref) throw new Error("No Tissot detail link was available for gallery QA.");
  await navigate(client, detailHref);
  const galleryHydrated = await waitForHydration(client, 'button[aria-label*="фото"]');
  const detailBefore = await evaluate(client, `({
    url: location.href,
    compareButtons: document.querySelectorAll('button[aria-pressed][data-variant="detail"]').length,
    stageButtons: [...document.querySelectorAll('button')].filter((button) => button.getAttribute('aria-label')?.includes('фото')).length,
    thumbnails: document.querySelectorAll('[role="group"] button').length,
    imageFailures: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
  })`);
  await evaluate(client, `(() => {
    const button = [...document.querySelectorAll('button')].find((candidate) => candidate.getAttribute('aria-label')?.includes('фото'));
    button?.click();
    return Boolean(button);
  })()`);
  const galleryOpened = await waitFor(client, `Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'))`);
  const galleryOpenState = await evaluate(client, `({
    dialog: Boolean(document.querySelector('[role="dialog"][aria-modal="true"]')),
    bodyLocked: document.body.style.overflow === 'hidden',
    imageFailures: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).length,
  })`);
  const galleryScreenshot = await capture(client, "tissot-gallery-fullscreen");
  await evaluate(client, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))`);
  await delay(150);
  await evaluate(client, `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))`);
  const galleryClosed = await waitFor(client, `!document.querySelector('[role="dialog"][aria-modal="true"]')`);

  await setViewport(client, mobile.width, mobile.height);
  await navigate(client, "/journal");
  const journalMobileScreenshot = await capture(client, "journal-mobile");

  const ignoredMessages = browserMessages.filter((message) => message.url.endsWith("/favicon.ico") || message.text.includes("webpack-hmr"));
  const applicationMessages = browserMessages.filter((message) => !ignoredMessages.includes(message));
  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    outputDirectory,
    http,
    pages,
    interactions: {
      catalogInitial,
      catalogHydrated,
      filterDialogOpened,
      filterDialogClosed,
      filterDialogState,
      searchApplied,
      searchState,
      sortApplied,
      sortState,
      compareSelection,
      compareHydrated,
      compareTrayState,
      compareState,
      detailHref,
      detailBefore,
      galleryHydrated,
      galleryOpened,
      galleryOpenState,
      galleryClosed,
    },
    screenshots: [catalogScreenshot, compareScreenshot, galleryScreenshot, journalMobileScreenshot],
    console: { applicationMessages, ignoredMessages },
  };
  const reportPath = join(outputDirectory, "runtime-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ reportPath, ...report }, null, 2));
} finally {
  client?.close();
  chrome.kill();
  await delay(300);
  await rm(userDataDirectory, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 }).catch(() => undefined);
}

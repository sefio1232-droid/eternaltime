import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join, resolve } from "node:path";
import sharp from "sharp";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const debugPort = 9400 + Math.floor(Math.random() * 400);
const auditUrl = process.env.HOMEPAGE_AUDIT_URL ?? "http://127.0.0.1:3000/";
const outputDirectory = join(tmpdir(), "eternal-time-homepage-final-alignment");
const userDataDirectory = await mkdtemp(join(tmpdir(), "eternal-time-chrome-"));
const runtimeMessages = [];
const requestedViewports = (process.env.HOMEPAGE_AUDIT_VIEWPORT ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const captureScreenshots = process.env.HOMEPAGE_AUDIT_SCREENSHOTS !== "0";
const viewports = [
  { name: "desktop-1536", width: 1536, height: 960 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1280", width: 1280, height: 800 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "mobile-390", width: 390, height: 844 },
].filter((viewport) => requestedViewports.length === 0 || requestedViewports.includes(viewport.name));

await mkdir(outputDirectory, { recursive: true });

function isIgnoredBrowserInfrastructureError(message) {
  return (
    message.text.includes("/_next/webpack-hmr") ||
    (message.url ?? "").endsWith("/favicon.ico")
  );
}

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-software-rasterizer",
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

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

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
    this.waiters = new Map();
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });
    this.socket.addEventListener("message", async (event) => {
      const raw =
        typeof event.data === "string"
          ? event.data
          : event.data instanceof Blob
            ? await event.data.text()
            : event.data instanceof ArrayBuffer
              ? new TextDecoder().decode(event.data)
              : ArrayBuffer.isView(event.data)
                ? new TextDecoder().decode(event.data)
                : String(event.data);
      const message = JSON.parse(raw);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
        return;
      }
      if (message.method === "Log.entryAdded") {
        runtimeMessages.push({
          level: message.params?.entry?.level ?? "log",
          text: message.params?.entry?.text ?? "",
          url: message.params?.entry?.url ?? "",
        });
      }
      if (message.method === "Runtime.exceptionThrown") {
        runtimeMessages.push({
          level: "error",
          text: message.params?.exceptionDetails?.exception?.description ?? message.params?.exceptionDetails?.text ?? "Runtime exception",
        });
      }
      if (message.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(message.params?.type)) {
        runtimeMessages.push({
          level: message.params.type,
          text: (message.params.args ?? []).map((argument) => argument.value ?? argument.description ?? "").join(" "),
        });
      }
      const waiters = this.waiters.get(message.method) ?? [];
      this.waiters.delete(message.method);
      for (const resolve of waiters) resolve(message.params);
    });
    this.socket.addEventListener("close", () => {
      for (const pending of this.pending.values()) pending.reject(new Error("Chrome debugging socket closed"));
      this.pending.clear();
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

  waitFor(method, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeoutMs);
      const waiters = this.waiters.get(method) ?? [];
      waiters.push((params) => {
        clearTimeout(timeout);
        resolve(params);
      });
      this.waiters.set(method, waiters);
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(client, expression) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? "Runtime evaluation failed");
  return result.result.value;
}

async function navigate(client, url) {
  await client.send("Page.navigate", { url });
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = await evaluate(
      client,
      "document.readyState !== 'loading' && Boolean(document.querySelector('[data-home-section]'))",
    ).catch(() => false);
    if (ready) break;
    await delay(250);
  }
  await client.send("Page.bringToFront");
  await client.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  await evaluate(
    client,
    "Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 3000))]).then(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))",
  );
}

async function loadLocalSectionImages(client) {
  const sources = await evaluate(
    client,
    `[...document.querySelectorAll('[data-home-section] img')].map((image, index) => ({
      index,
      source: image.currentSrc || image.src || '',
    }))`,
  );
  const publicRoot = resolve("public");
  const replacements = [];
  for (const item of sources) {
    try {
      const sourceUrl = new URL(item.source, auditUrl);
      const assetPath = sourceUrl.pathname === "/_next/image"
        ? sourceUrl.searchParams.get("url")
        : sourceUrl.pathname;
      if (!assetPath?.startsWith("/")) continue;
      const filePath = resolve(publicRoot, assetPath.slice(1));
      if (!filePath.startsWith(publicRoot)) continue;
      const extension = extname(filePath).toLowerCase();
      const mimeType = extension === ".png" ? "image/png" : extension === ".webp" ? "image/webp" : "image/jpeg";
      replacements.push({
        index: item.index,
        source: `data:${mimeType};base64,${(await readFile(filePath)).toString("base64")}`,
      });
    } catch {
      // Non-local images remain on their original source and are covered by runtime metrics.
    }
  }
  await evaluate(
    client,
    `(async () => {
      const images = [...document.querySelectorAll('[data-home-section] img')];
      const replacements = ${JSON.stringify(replacements)};
      await Promise.all(replacements.map(async ({ index, source }) => {
        const image = images[index];
        if (!image) return;
        image.removeAttribute('srcset');
        image.loading = 'eager';
        image.src = source;
        await image.decode().catch(() => undefined);
      }));
    })()`,
  );
}

const metricExpression = `(() => {
  const viewportWidth = document.documentElement.clientWidth;
  const sections = [document.querySelector('[data-testid="homepage-hero"]'), ...document.querySelectorAll('[data-home-section]')].filter(Boolean);
  const sectionHeights = sections.map((section) => ({
    name: section.dataset.homeSection || 'hero',
    height: Math.round(section.getBoundingClientRect().height),
    top: Math.round(section.getBoundingClientRect().top + window.scrollY),
  }));
  const overflow = [...document.body.querySelectorAll('*')].filter((element) => {
    const style = getComputedStyle(element);
    if (style.position === 'fixed' || style.display === 'none') return false;
    const rect = element.getBoundingClientRect();
    return rect.width > 1 && (rect.left < -1 || rect.right > viewportWidth + 1);
  });
  const lowerOverflow = overflow.filter((element) => !element.closest('[data-testid="homepage-hero"]'));
  const revealTargets = [...document.querySelectorAll('[data-home-reveal]')];
  const lateContent = revealTargets.filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.top < innerHeight && rect.bottom > 0 && Number.parseFloat(getComputedStyle(element).opacity) < 0.5;
  });
  const invisibleReserved = revealTargets.filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.height > 300 && Number.parseFloat(getComputedStyle(element).opacity) < 0.5;
  });
  const orbitSlots = [...document.querySelectorAll('[data-home-orbit-slot]')].map((element) => ({
    distance: Math.abs(Number(element.dataset.homeOrbitDistance || 99)),
    opacity: Number.parseFloat(getComputedStyle(element).opacity),
  }));
  const centerOpacity = Math.max(0, ...orbitSlots.filter((slot) => slot.distance <= 0.65).map((slot) => slot.opacity));
  const annotation = document.querySelector('[data-home-product-meta]');
  const images = [...document.images].filter((image) => !image.closest('[data-home-reference-overlay]'));
  const watchLinks = [...document.querySelectorAll('[data-home-watch-link]')];
  const watchHrefs = watchLinks.map((link) => link.href).filter(Boolean);
  const boundedContent = [...document.querySelectorAll(
    '[data-home-section] img, [data-home-section] h2, [data-home-section] p, [data-home-section] dl, [data-home-section] figcaption, [data-home-section] a, [data-home-section] button'
  )];
  const sectionBoundsFailures = boundedContent.filter((element) => {
    const section = element.closest('[data-home-section]');
    if (!section || getComputedStyle(element).display === 'none') return false;
    const rect = element.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    return rect.top < sectionRect.top - 2 || rect.bottom > sectionRect.bottom + 2 || rect.left < -2 || rect.right > viewportWidth + 2;
  });
  const watchCaptionOverlaps = [...document.querySelectorAll('[data-home-section] figure')].filter((figure) => {
    const image = figure.querySelector('img');
    const caption = figure.querySelector('figcaption');
    if (!image || !caption || getComputedStyle(caption).display === 'none') return false;
    const imageRect = image.getBoundingClientRect();
    const captionRect = caption.getBoundingClientRect();
    return imageRect.left < captionRect.right && imageRect.right > captionRect.left && imageRect.top < captionRect.bottom && imageRect.bottom > captionRect.top;
  });
  const sectionSequenceOverlaps = sections.slice(0, -1).filter((section, index) => {
    const next = sections[index + 1];
    return section.getBoundingClientRect().bottom > next.getBoundingClientRect().top + 1;
  });
  const shortlistCount = [...document.querySelectorAll('[data-home-section] *')].filter((element) => {
    const value = [element.className, element.id, element.textContent].join(' ');
    return /shortlist|остаются четыре|финалист и три альтернативы/i.test(value);
  }).length;
  return {
    url: location.href,
    viewport: { width: innerWidth, height: innerHeight },
    documentHeight: document.documentElement.scrollHeight,
    viewportCount: Number((document.documentElement.scrollHeight / innerHeight).toFixed(2)),
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    horizontalOverflowCount: overflow.length,
    lowerSectionOverflowCount: lowerOverflow.length,
    overflowExamples: overflow.slice(0, 8).map((element) => element.dataset.homePlacementId || element.className || element.tagName),
    lowerOverflowExamples: lowerOverflow.slice(0, 8).map((element) => ({
      element: element.dataset.homePlacementId || element.className || element.tagName,
      section: element.closest('[data-home-section]')?.dataset.homeSection || 'unknown',
      left: Math.round(element.getBoundingClientRect().left),
      right: Math.round(element.getBoundingClientRect().right),
    })),
    sectionHeights,
    highestSection: sectionHeights.reduce((highest, section) => section.height > highest.height ? section : highest, { name: 'none', height: 0 }),
    lateContentCount: lateContent.length,
    invisibleReservedCount: invisibleReserved.length,
    centerOpacity,
    annotationOpacity: annotation ? Number.parseFloat(getComputedStyle(annotation).opacity) : 0,
    annotationMuted: annotation?.dataset.homeMetaMuted || 'missing',
    visibilityState: document.visibilityState,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    autoCycleEnabled: document.querySelector('[data-testid="homepage-hero"]')?.dataset.homeAutoCycleEnabled || 'missing',
    cyclePaused: document.querySelector('[data-testid="homepage-hero"]')?.dataset.homeCyclePaused || 'missing',
    activeOrbitIndex: Number(document.querySelector('[data-testid="homepage-hero"]')?.dataset.homeActiveOrbitIndex || -1),
    orbitPosition: Number(document.querySelector('[data-testid="homepage-hero"]')?.dataset.homeOrbitPosition || -1),
    h1Count: document.querySelectorAll('h1').length,
    h2: [...document.querySelectorAll('[data-home-section] h2')].map((heading) => heading.innerText.replace(/\\s+/g, ' ').trim()),
    imageFailures: images.filter((image) => image.complete && image.naturalWidth === 0).length,
    lowerWatchImageStates: [...document.querySelectorAll('[data-home-section] [data-home-watch-reference] img')].slice(0, 16).map((image) => {
      const style = getComputedStyle(image);
      return {
        reference: image.closest('[data-home-watch-reference]')?.dataset.homeWatchReference || '',
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        opacity: style.opacity,
        visibility: style.visibility,
        display: style.display,
        transform: style.transform,
      };
    }),
    watchLinkCount: watchLinks.length,
    uniqueWatchHrefCount: new Set(watchHrefs).size,
    missingWatchHrefCount: watchLinks.filter((link) => !link.getAttribute('href')).length,
    missingWatchFigureCount: document.querySelectorAll('[data-home-missing-href="true"]').length,
    nestedInteractiveCount: document.querySelectorAll('a a, a button, button a, button button').length,
    sectionBoundsFailureCount: sectionBoundsFailures.length,
    sectionBoundsFailureExamples: sectionBoundsFailures.slice(0, 8).map((element) => ({
      element: element.dataset.homePlacementId || element.className || element.tagName,
      section: element.closest('[data-home-section]')?.dataset.homeSection || 'unknown',
      reference: element.closest('[data-home-watch-reference]')?.dataset.homeWatchReference || '',
      top: Math.round(element.getBoundingClientRect().top + scrollY),
      bottom: Math.round(element.getBoundingClientRect().bottom + scrollY),
      sectionTop: Math.round(element.closest('[data-home-section]')?.getBoundingClientRect().top + scrollY),
      sectionBottom: Math.round(element.closest('[data-home-section]')?.getBoundingClientRect().bottom + scrollY),
    })),
    watchCaptionOverlapCount: watchCaptionOverlaps.length,
    watchCaptionOverlapExamples: watchCaptionOverlaps.slice(0, 8).map((figure) => ({
      reference: figure.dataset.homeWatchReference || '',
      section: figure.closest('[data-home-section]')?.dataset.homeSection || 'unknown',
      imageBottom: Math.round(figure.querySelector('img')?.getBoundingClientRect().bottom + scrollY),
      captionTop: Math.round(figure.querySelector('figcaption')?.getBoundingClientRect().top + scrollY),
    })),
    sectionSequenceOverlapCount: sectionSequenceOverlaps.length,
    shortlistCount,
    watchLinks: watchLinks.map((link) => ({
      reference: link.dataset.homeWatchLinkReference || '',
      href: link.getAttribute('href') || '',
      section: link.closest('[data-home-section]')?.dataset.homeSection || (link.closest('[data-testid="homepage-hero"]') ? 'hero' : 'unknown'),
    })),
  };
})()`;

async function saveSelectorScreenshot(client, selector, name) {
  const rect = await evaluate(
    client,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      const x = Math.max(0, bounds.left + scrollX - 16);
      return {
        x,
        y: Math.max(0, bounds.top + scrollY),
        width: Math.min(document.documentElement.scrollWidth - x, Math.ceil(bounds.width + 32)),
        height: Math.ceil(bounds.height),
      };
    })()`,
  );
  if (!rect) throw new Error(`Screenshot selector was not found: ${selector}`);
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { ...rect, scale: 1 },
  });
  const path = join(outputDirectory, `${name}.png`);
  await writeFile(path, Buffer.from(screenshot.data, "base64"));
  return path;
}

async function saveFullScreenshot(client, name) {
  const dimensions = await evaluate(
    client,
    `({
      width: document.documentElement.clientWidth,
      height: document.documentElement.scrollHeight,
    })`,
  );
  const screenshot = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, ...dimensions, scale: 1 },
  });
  const path = join(outputDirectory, `${name}.png`);
  await writeFile(path, Buffer.from(screenshot.data, "base64"));
  return path;
}

async function saveStitchedRangeScreenshot(client, startSelector, endSelector, name) {
  const range = await evaluate(
    client,
    `(() => {
      const start = document.querySelector(${JSON.stringify(startSelector)});
      const end = document.querySelector(${JSON.stringify(endSelector)});
      if (!start || !end) return null;
      const startRect = start.getBoundingClientRect();
      const endRect = end.getBoundingClientRect();
      const top = startRect.top + scrollY;
      const bottom = endRect.bottom + scrollY;
      return { top, bottom, width: document.documentElement.clientWidth, viewportHeight: innerHeight };
    })()`,
  );
  if (!range) throw new Error(`Screenshot range was not found: ${startSelector} -> ${endSelector}`);

  await evaluate(
    client,
    `[...document.querySelectorAll('*')].filter((element) => ['fixed', 'sticky'].includes(getComputedStyle(element).position)).forEach((element) => {
      element.dataset.homeAuditFixedVisibility = element.style.visibility || '';
      element.style.visibility = 'hidden';
    })`,
  );

  const parts = [];
  let cursor = range.top;
  while (cursor < range.bottom) {
    await evaluate(client, `window.scrollTo({ top: ${Math.round(cursor)}, behavior: 'instant' })`);
    await delay(260);
    const scrollTop = await evaluate(client, "scrollY");
    const segmentTop = Math.max(range.top, scrollTop);
    const segmentBottom = Math.min(range.bottom, scrollTop + range.viewportHeight);
    const segmentHeight = Math.max(1, Math.round(segmentBottom - segmentTop));
    const screenshot = await client.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
      clip: {
        x: 0,
        y: scrollTop,
        width: range.width,
        height: range.viewportHeight,
        scale: 1,
      },
    });
    const input = Buffer.from(screenshot.data, "base64");
    const cropped = await sharp(input)
      .extract({
        left: 0,
        top: Math.max(0, Math.round(segmentTop - scrollTop)),
        width: Math.round(range.width),
        height: segmentHeight,
      })
      .png()
      .toBuffer();
    parts.push({ input: cropped, left: 0, top: Math.round(segmentTop - range.top) });
    cursor = segmentBottom;
    if (scrollTop + range.viewportHeight >= range.bottom) break;
  }

  await evaluate(
    client,
    `[...document.querySelectorAll('[data-home-audit-fixed-visibility]')].forEach((element) => {
      element.style.visibility = element.dataset.homeAuditFixedVisibility;
      delete element.dataset.homeAuditFixedVisibility;
    })`,
  );

  const path = join(outputDirectory, `${name}.png`);
  await sharp({
    create: {
      width: Math.round(range.width),
      height: Math.round(range.bottom - range.top),
      channels: 4,
      background: { r: 246, g: 244, b: 239, alpha: 1 },
    },
  })
    .composite(parts)
    .png()
    .toFile(path);
  return path;
}

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
  await client.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
  });

  const results = [];
  for (const viewport of viewports) {
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.width < 768,
    });
    await navigate(client, auditUrl);
    await delay(1400);
    await loadLocalSectionImages(client);
    const initial = await evaluate(client, metricExpression);
    const scrollStep = Math.max(320, viewport.height * 0.64);
    const scrollStops = Array.from(
      { length: Math.ceil(initial.documentHeight / scrollStep) + 1 },
      (_, index) => Math.min(initial.documentHeight - viewport.height, index * scrollStep),
    );
    let maxLateContent = 0;
    let maxInvisibleReserved = 0;
    for (const top of scrollStops) {
      await evaluate(client, `window.scrollTo({ top: ${Math.round(top)}, behavior: 'instant' })`);
      await delay(450);
      const state = await evaluate(client, metricExpression);
      maxLateContent = Math.max(maxLateContent, state.lateContentCount);
      maxInvisibleReserved = Math.max(maxInvisibleReserved, state.invisibleReservedCount);
    }
    await evaluate(client, "window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })");
    await delay(700);
    const fastScroll = await evaluate(client, metricExpression);
    await evaluate(client, "window.scrollTo({ top: 0, behavior: 'instant' })");
    await delay(600);
    results.push({ ...viewport, ...initial, maxLateContent, maxInvisibleReserved, fastScrollLateContent: fastScroll.lateContentCount });

    if (captureScreenshots && viewport.name === "desktop-1536") {
      await saveFullScreenshot(client, "01-full-desktop-1536");
    }
    if (captureScreenshots && viewport.name === "desktop-1440") {
      await saveFullScreenshot(client, "02-full-desktop-1440");
      await saveStitchedRangeScreenshot(client, '[data-home-section="selection"]', '[data-home-section="comparison-purchase"]', "05-selection-comparison-desktop");
      await saveStitchedRangeScreenshot(client, '[data-home-section="collection-intelligence"]', '[data-home-composition="journal"]', "06-collection-journal-desktop");
      await saveSelectorScreenshot(client, '[data-home-composition="final-cta"]', "07-final-cta-desktop");
    }
    if (captureScreenshots && viewport.name === "tablet-1024") {
      await saveFullScreenshot(client, "03-full-tablet-1024");
    }
    if (captureScreenshots && viewport.name === "mobile-390") {
      await saveFullScreenshot(client, "04-full-mobile-390");
    }
  }

  const applicationErrors = runtimeMessages.filter(
    (message) => message.level === "error" && !isIgnoredBrowserInfrastructureError(message),
  );
  const ignoredBrowserInfrastructureErrors = runtimeMessages.filter(
    (message) => message.level === "error" && isIgnoredBrowserInfrastructureError(message),
  );
  const report = {
    generatedAt: new Date().toISOString(),
    outputDirectory,
    auditUrl,
    results,
    console: {
      errors: applicationErrors,
      ignoredBrowserInfrastructureErrors,
      warnings: runtimeMessages.filter((message) => message.level === "warning"),
      hydrationWarnings: runtimeMessages.filter((message) => /hydrat|server rendered/i.test(message.text)),
    },
  };
  const reportPath = join(outputDirectory, "runtime-report.json");
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    reportPath,
    screenshots: [
      join(outputDirectory, "01-full-desktop-1536.png"),
      join(outputDirectory, "02-full-desktop-1440.png"),
      join(outputDirectory, "03-full-tablet-1024.png"),
      join(outputDirectory, "04-full-mobile-390.png"),
      join(outputDirectory, "05-selection-comparison-desktop.png"),
      join(outputDirectory, "06-collection-journal-desktop.png"),
      join(outputDirectory, "07-final-cta-desktop.png"),
    ],
    ...report,
  }, null, 2));
} finally {
  client?.close();
  chrome.kill();
  await delay(500);
  try {
    await rm(userDataDirectory, { recursive: true, force: true, maxRetries: 4, retryDelay: 250 });
  } catch (error) {
    console.warn(`Could not remove temporary Chrome profile: ${error instanceof Error ? error.message : String(error)}`);
  }
}

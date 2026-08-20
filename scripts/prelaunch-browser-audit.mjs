import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const baseUrl = process.env.PRELAUNCH_AUDIT_BASE_URL ?? "https://eternaltime.shop";
const outputRoot = path.resolve(process.env.PRELAUNCH_AUDIT_OUTPUT ?? "artifacts/prelaunch-browser-audit");
const chromePath =
  process.env.CHROME_PATH ??
  [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  ].find((candidate) => existsSync(candidate));

if (!chromePath) {
  throw new Error("Chrome or Edge executable was not found. Set CHROME_PATH to run the browser audit.");
}

function csvFilter(value) {
  const items = (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return items.length > 0 ? new Set(items) : null;
}

const viewportFilter = csvFilter(process.env.PRELAUNCH_AUDIT_VIEWPORTS);
const routeFilter = csvFilter(process.env.PRELAUNCH_AUDIT_ROUTES);

const viewports = [
  { name: "mobile-320", width: 320, height: 568, mobile: true },
  { name: "mobile-360", width: 360, height: 800, mobile: true },
  { name: "mobile-375", width: 375, height: 667, mobile: true },
  { name: "mobile-390", width: 390, height: 844, mobile: true },
  { name: "mobile-430", width: 430, height: 932, mobile: true },
  { name: "tablet-768", width: 768, height: 1024, mobile: true },
  { name: "tablet-820", width: 820, height: 1180, mobile: true },
  { name: "desktop-1440", width: 1440, height: 900, mobile: false },
  { name: "desktop-1920", width: 1920, height: 1080, mobile: false },
].filter((viewport) => !viewportFilter || viewportFilter.has(viewport.name));

const routes = [
  { label: "home", path: "/" },
  { label: "catalog", path: "/watches" },
  { label: "catalog-casio", path: "/watches/casio" },
  { label: "catalog-tissot", path: "/watches/tissot" },
  { label: "catalog-orient", path: "/watches/orient" },
  { label: "watch-casio", path: "/watches/casio/a158wa1df" },
  { label: "watch-tissot", path: "/watches/tissot/t0062071103601" },
  { label: "watch-orient", path: "/watches/orient/faa02002d9" },
  { label: "journal", path: "/journal" },
  { label: "article", path: "/journal/pochemu-mekhanicheskie-chasy-populyarny" },
  { label: "collection", path: "/collection" },
  { label: "recommendations-travel", path: "/collection/recommendations/travel" },
  { label: "compare", path: "/compare" },
  { label: "cart", path: "/cart" },
  { label: "checkout", path: "/checkout" },
  { label: "login", path: "/login" },
  { label: "account", path: "/account" },
  { label: "selection", path: "/selection" },
  { label: "legal", path: "/legal" },
  { label: "legal-privacy", path: "/legal/privacy" },
  { label: "legal-terms", path: "/legal/terms" },
  { label: "admin", path: "/admin" },
  { label: "admin-orders", path: "/admin/orders" },
  { label: "admin-users", path: "/admin/users" },
].filter((route) => !routeFilter || routeFilter.has(route.label));

const screenshotPlan = new Map(
  [
    ["home-mobile", ["home", "mobile-390"]],
    ["catalog-mobile", ["catalog", "mobile-390"]],
    ["watch-mobile", ["watch-tissot", "mobile-390"]],
    ["journal-mobile", ["journal", "mobile-390"]],
    ["collection-mobile", ["collection", "mobile-390"]],
    ["cart-mobile", ["cart", "mobile-390"]],
    ["checkout-mobile", ["checkout", "mobile-390"]],
    ["account-mobile", ["account", "mobile-390"]],
    ["admin-mobile", ["admin", "mobile-390"]],
    ["admin-orders-mobile", ["admin-orders", "mobile-390"]],
    ["legal-mobile", ["legal", "mobile-390"]],
    ["home-desktop", ["home", "desktop-1440"]],
    ["catalog-desktop", ["catalog", "desktop-1440"]],
    ["watch-desktop", ["watch-tissot", "desktop-1440"]],
    ["admin-desktop", ["admin", "desktop-1440"]],
  ].map(([name, [routeLabel, viewportName]]) => [`${routeLabel}:${viewportName}`, name]),
);

mkdirSync(outputRoot, { recursive: true });
const runId = new Date().toISOString().replace(/[:.]/g, "-");
const runDir = path.join(outputRoot, runId);
const screenshotDir = path.join(runDir, "screenshots");
mkdirSync(screenshotDir, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForJson(url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(200);
  }
  throw lastError ?? new Error(`Timed out waiting for ${url}`);
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.callbacks = new Map();
    this.listeners = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      this.ws.addEventListener("open", resolve, { once: true });
      this.ws.addEventListener("error", reject, { once: true });
    });
    this.ws.addEventListener("message", (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id && this.callbacks.has(message.id)) {
        const { resolve, reject } = this.callbacks.get(message.id);
        this.callbacks.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }
      const handlers = this.listeners.get(message.method) ?? [];
      for (const handler of handlers) handler(message.params ?? {});
    });
  }

  on(method, handler) {
    const handlers = this.listeners.get(method) ?? [];
    handlers.push(handler);
    this.listeners.set(method, handlers);
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.callbacks.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.callbacks.has(id)) {
          this.callbacks.delete(id);
          reject(new Error(`CDP ${method} timed out`));
        }
      }, 20_000);
    });
  }

  close() {
    this.ws?.close();
  }
}

async function newTarget(port) {
  let response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  if (!response.ok) {
    response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`);
  }
  if (!response.ok) {
    throw new Error(`Could not create Chrome target: HTTP ${response.status}`);
  }
  return response.json();
}

function absoluteUrl(routePath) {
  return new URL(routePath, baseUrl).toString();
}

function safeName(value) {
  return value.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
}

async function auditOne(cdp, route, viewport) {
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];
  const httpErrors = [];
  const loadEvents = [];
  const requests = new Map();

  cdp.listeners.clear();
  cdp.on("Runtime.consoleAPICalled", (event) => {
    if (event.type === "error") {
      consoleErrors.push(event.args?.map((arg) => arg.value ?? arg.description ?? "").join(" ") ?? "console error");
    }
  });
  cdp.on("Runtime.exceptionThrown", (event) => {
    pageErrors.push(event.exceptionDetails?.text ?? event.exceptionDetails?.exception?.description ?? "page exception");
  });
  cdp.on("Network.requestWillBeSent", (event) => {
    requests.set(event.requestId, {
      url: event.request?.url ?? "",
      type: event.type,
    });
  });
  cdp.on("Network.loadingFailed", (event) => {
    const request = requests.get(event.requestId);
    if (event.errorText !== "net::ERR_ABORTED" || event.type === "Image") {
      failedRequests.push({ url: request?.url ?? event.requestId, errorText: event.errorText, type: event.type });
    }
  });
  cdp.on("Network.responseReceived", (event) => {
    const status = event.response?.status ?? 0;
    const url = event.response?.url ?? "";
    if (status >= 400 && !url.includes("/favicon")) {
      httpErrors.push({ status, url });
    }
  });
  cdp.on("Page.loadEventFired", () => loadEvents.push(Date.now()));

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.mobile ? 2 : 1,
    mobile: viewport.mobile,
  });
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: viewport.mobile });

  const requestedUrl = absoluteUrl(route.path);
  const nav = await cdp.send("Page.navigate", { url: requestedUrl });
  const started = Date.now();
  while (loadEvents.length === 0 && Date.now() - started < 15_000) {
    await sleep(150);
  }
  await sleep(1_200);

  const page = await cdp.send("Runtime.evaluate", {
    returnByValue: true,
    expression: `(() => {
      const doc = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(doc?.scrollWidth || 0, body?.scrollWidth || 0);
      const clientWidth = window.innerWidth;
      const brokenImages = Array.from(document.images)
        .filter((image) => {
          const rect = image.getBoundingClientRect();
          const visibleInViewport =
            rect.width > 0 &&
            rect.height > 0 &&
            rect.top < window.innerHeight + 80 &&
            rect.bottom > -80 &&
            rect.left < window.innerWidth + 80 &&
            rect.right > -80;
          return visibleInViewport && (!image.complete || image.naturalWidth === 0 || image.naturalHeight === 0);
        })
        .slice(0, 25)
        .map((image) => ({
          src: image.currentSrc || image.src,
          alt: image.alt || "",
          width: image.naturalWidth,
          height: image.naturalHeight,
        }));
      const h1 = Array.from(document.querySelectorAll("h1")).map((node) => node.textContent?.trim()).filter(Boolean);
      const title = document.title;
      const canonical = document.querySelector('link[rel="canonical"]')?.href || null;
      const metaDescription = document.querySelector('meta[name="description"]')?.content || null;
      const main = Boolean(document.querySelector("main"));
      const buttons = Array.from(document.querySelectorAll("button,a"))
        .filter((node) => {
          const rect = node.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
        }).length;
      return {
        url: location.href,
        title,
        canonical,
        metaDescription,
        h1,
        main,
        statusText: document.body?.innerText?.slice(0, 500) ?? "",
        scrollWidth,
        clientWidth,
        overflowX: scrollWidth > clientWidth + 1,
        imageCount: document.images.length,
        brokenImages,
        visibleInteractiveCount: buttons,
      };
    })()`,
  });

  const key = `${route.label}:${viewport.name}`;
  const screenshotLabel = screenshotPlan.get(key);
  let screenshotPath = null;
  if (screenshotLabel) {
    const screenshot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
      fromSurface: true,
    });
    screenshotPath = path.join(screenshotDir, `${safeName(screenshotLabel)}.png`);
    writeFileSync(screenshotPath, Buffer.from(screenshot.data, "base64"));
  }

  return {
    route: route.label,
    path: route.path,
    requestedUrl,
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    navigationErrorText: nav.errorText ?? null,
    screenshotPath,
    consoleErrors,
    pageErrors,
    failedRequests,
    httpErrors,
    ...page.result.value,
  };
}

async function main() {
  const port = 9223 + Math.floor(Math.random() * 1000);
  const userDataDir = mkdtempSync(path.join(tmpdir(), "eternal-time-chrome-"));
  const chrome = spawn(chromePath, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ], { stdio: ["ignore", "pipe", "pipe"] });

  try {
    await waitForJson(`http://127.0.0.1:${port}/json/version`);
    const target = await newTarget(port);
    const cdp = new CdpClient(target.webSocketDebuggerUrl);
    await cdp.connect();
    await Promise.all([
      cdp.send("Page.enable"),
      cdp.send("Runtime.enable"),
      cdp.send("Network.enable"),
      cdp.send("Log.enable"),
    ]);

    const results = [];
    for (const viewport of viewports) {
      for (const route of routes) {
        process.stdout.write(`audit ${route.label} ${viewport.name}\n`);
        try {
          results.push(await auditOne(cdp, route, viewport));
        } catch (error) {
          results.push({
            route: route.label,
            path: route.path,
            requestedUrl: absoluteUrl(route.path),
            viewport: viewport.name,
            width: viewport.width,
            height: viewport.height,
            fatal: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    cdp.close();
    const summary = {
      generatedAt: new Date().toISOString(),
      baseUrl,
      runDir,
      routesTested: routes.length,
      viewportsTested: viewports.length,
      totalChecks: results.length,
      horizontalOverflowFailures: results.filter((result) => result.overflowX).length,
      brokenImages: results.reduce((sum, result) => sum + (result.brokenImages?.length ?? 0), 0),
      consoleErrors: results.reduce((sum, result) => sum + (result.consoleErrors?.length ?? 0), 0),
      pageErrors: results.reduce((sum, result) => sum + (result.pageErrors?.length ?? 0), 0),
      failedNetworkRequests: results.reduce(
        (sum, result) => sum + (result.failedRequests?.length ?? 0) + (result.httpErrors?.length ?? 0),
        0,
      ),
      screenshots: results.filter((result) => result.screenshotPath).map((result) => result.screenshotPath),
      results,
    };

    writeFileSync(path.join(runDir, "summary.json"), JSON.stringify(summary, null, 2));
    writeFileSync(
      path.join(runDir, "summary.txt"),
      [
        `BASE_URL=${baseUrl}`,
        `ROUTES_TESTED=${summary.routesTested}`,
        `VIEWPORTS_TESTED=${summary.viewportsTested}`,
        `TOTAL_PAGE_VISUAL_CHECKS=${summary.totalChecks}`,
        `HORIZONTAL_OVERFLOW_FAILURES=${summary.horizontalOverflowFailures}`,
        `BROKEN_IMAGES=${summary.brokenImages}`,
        `CONSOLE_ERRORS=${summary.consoleErrors}`,
        `PAGE_ERRORS=${summary.pageErrors}`,
        `FAILED_NETWORK_REQUESTS=${summary.failedNetworkRequests}`,
        `RUN_DIR=${runDir}`,
      ].join("\n") + "\n",
    );
    process.stdout.write(readFileSync(path.join(runDir, "summary.txt"), "utf8"));
  } finally {
    chrome.kill();
    try {
      rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      process.stderr.write(`Could not remove temporary Chrome profile: ${userDataDir}\n`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

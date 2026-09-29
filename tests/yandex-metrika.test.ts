import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function source(path: string): string {
  return readFileSync(path, "utf8");
}

describe("Yandex.Metrika integration", () => {
  it("initializes the configured counter once with production options and ecommerce dataLayer", () => {
    const metrika = source("src/components/analytics/yandex-metrika.tsx");

    expect(metrika).toContain("const yandexMetrikaCounterId = 113122613");
    expect(metrika).toContain("https://mc.yandex.ru/metrika/tag.js?id=${yandexMetrikaCounterId}");
    expect(metrika).toContain("document.scripts[j].src === r");
    expect(metrika).toContain("window.dataLayer = window.dataLayer || []");
    expect(metrika).toContain("webvisor: true");
    expect(metrika).toContain("clickmap: true");
    expect(metrika).toContain("accurateTrackBounce: true");
    expect(metrika).toContain("trackLinks: true");
    expect(metrika).toContain("ecommerce: 'dataLayer'");
    expect(metrika).toContain("ym(${yandexMetrikaCounterId}, 'init'");
  });

  it("tracks App Router SPA navigations with hit instead of reinitializing the counter", () => {
    const metrika = source("src/components/analytics/yandex-metrika.tsx");

    expect(metrika).toContain("usePathname");
    expect(metrika).toContain("useSearchParams");
    expect(metrika).toContain('window.ym?.(yandexMetrikaCounterId, "hit", url');
    expect(metrika.match(/'init'/g)).toHaveLength(1);
  });

  it("is mounted globally from the root layout and keeps the noscript fallback", () => {
    const layout = source("src/app/layout.tsx");
    const metrika = source("src/components/analytics/yandex-metrika.tsx");

    expect(layout).toContain("YandexMetrika");
    expect(layout).toContain("YandexMetrikaNoScript");
    expect(layout).toContain("<Suspense fallback={null}>");
    expect(metrika).toContain("https://mc.yandex.ru/watch/${yandexMetrikaCounterId}");
  });
});

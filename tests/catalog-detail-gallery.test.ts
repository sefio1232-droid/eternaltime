import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveCatalogImagePresentation,
  sequenceCatalogGalleryImages,
} from "@/modules/catalog/application/catalog-image-presentation-policy";
import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";

/**
 * Watch detail page gallery rebuild (docs/CATALOG_SHOWROOM_RECOVERY.md "Gallery rebuild, second
 * pass") — one interactive workspace (main stage + thumbnails + fullscreen viewer) instead of a
 * static hero plus a disconnected wall of extra photos further down the page. The interactive
 * parts (CatalogDetailGallery) are a Client Component exercising real browser APIs (focus,
 * keyboard events, scroll lock) that this project's test setup doesn't render — these tests cover
 * everything that can be verified without a DOM: source structure, ordering, and duplication.
 */

const projectRoot = path.resolve(__dirname, "..");

function readSrc(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function remoteImage(id: string): CatalogImagePresentation {
  return { kind: "remote", url: `https://example.com/${id}.jpg`, src: `https://example.com/${id}.jpg`, alt: `Watch ${id}` };
}

describe("watch detail gallery", () => {
  describe("page structure", () => {
    it("1. the detail page renders exactly one gallery workspace, never a second wall of the same photos below it", () => {
      const detail = readSrc("src/components/catalog/catalog-watch-detail-page.tsx");
      const galleryUsages = detail.match(/<CatalogDetailGallery/g) ?? [];
      expect(galleryUsages).toHaveLength(1);
      expect(detail).not.toContain('id="fit"');
      expect(detail).not.toContain("На запястье");
    });

    it("2. the hero composition slot is still used on the detail page (compositionSlot=\"detail-hero\")", () => {
      const detail = readSrc("src/components/catalog/catalog-watch-detail-page.tsx");
      expect(detail).toContain('compositionSlot="detail-hero"');
    });

    it("3. the gallery component is a Client Component (needs browser state: active image, viewer open)", () => {
      const gallery = readSrc("src/components/catalog/catalog-detail-gallery.tsx");
      expect(gallery.trimStart().startsWith('"use client"')).toBe(true);
    });

    it("4. thumbnails are real <button> elements, never <a> links or nested inside another interactive control", () => {
      const gallery = readSrc("src/components/catalog/catalog-detail-gallery.tsx");
      expect(gallery).toContain('type="button"');
      expect(gallery).not.toMatch(/<a\s+href/);
    });

    it("5. the thumbnail strip only renders when there is more than one image", () => {
      const gallery = readSrc("src/components/catalog/catalog-detail-gallery.tsx");
      expect(gallery).toMatch(/count > 1 \? \(/);
    });
  });

  describe("fullscreen viewer accessibility", () => {
    it("6. the viewer is a labeled, modal dialog", () => {
      const gallery = readSrc("src/components/catalog/catalog-detail-gallery.tsx");
      expect(gallery).toContain('role="dialog"');
      expect(gallery).toContain('aria-modal="true"');
    });

    it("7. Escape closes the viewer", () => {
      const gallery = readSrc("src/components/catalog/catalog-detail-gallery.tsx");
      expect(gallery).toContain('"Escape"');
      expect(gallery).toContain("closeViewer");
    });

    it("8. ArrowLeft/ArrowRight navigate within the viewer", () => {
      const gallery = readSrc("src/components/catalog/catalog-detail-gallery.tsx");
      expect(gallery).toContain('"ArrowRight"');
      expect(gallery).toContain('"ArrowLeft"');
    });

    it("9. focus is trapped (Tab wraps within the dialog) and restored to the trigger on close", () => {
      const gallery = readSrc("src/components/catalog/catalog-detail-gallery.tsx");
      expect(gallery).toContain('"Tab"');
      expect(gallery).toContain("previouslyFocused ?? stageButton");
    });

    it("10. body scroll is locked while the viewer is open", () => {
      const gallery = readSrc("src/components/catalog/catalog-detail-gallery.tsx");
      expect(gallery).toContain('document.body.style.overflow = "hidden"');
    });

    it("11. the viewer image uses object-fit: contain sizing, never cover/crop", () => {
      const css = readSrc("src/components/catalog/catalog-detail-gallery.module.css");
      expect(css).not.toMatch(/\.viewerStage[\s\S]{0,200}object-fit:\s*cover/);
    });
  });

  describe("keyboard roving-tabindex on thumbnails", () => {
    it("12. only the active thumbnail is in the tab order; the rest are reachable via arrow keys", () => {
      const gallery = readSrc("src/components/catalog/catalog-detail-gallery.tsx");
      expect(gallery).toContain("tabIndex={index === activeIndex ? 0 : -1}");
      expect(gallery).toContain("handleThumbKeyDown");
    });

    it("13. Home/End jump to the first/last thumbnail", () => {
      const gallery = readSrc("src/components/catalog/catalog-detail-gallery.tsx");
      expect(gallery).toContain('"Home"');
      expect(gallery).toContain('"End"');
    });
  });

  describe("gallery ordering and taxonomy (shared with the presentation policy)", () => {
    it("14. the chosen hero image always sorts first", () => {
      const hero = remoteImage("hero");
      const rest = [remoteImage("b"), remoteImage("c")];
      const sequenced = sequenceCatalogGalleryImages([hero, ...rest], hero);
      expect(sequenced[0]).toBe(hero);
    });

    it("15. a technical angle (caseback/clasp/side) never sorts ahead of a clean image", () => {
      const hero = remoteImage("front");
      const technical: CatalogImagePresentation = { kind: "remote", url: "https://example.com/back.jpg", src: "https://example.com/back.jpg", alt: "caseback view" };
      const clean = remoteImage("clean");
      const sequenced = sequenceCatalogGalleryImages([technical, clean], hero);
      expect(sequenced).toEqual([hero, clean, technical]);
    });

    it("16. the hero image is never duplicated later in the sequenced gallery", () => {
      const hero = remoteImage("dup");
      const sequenced = sequenceCatalogGalleryImages([hero, remoteImage("other")], hero);
      const heroOccurrences = sequenced.filter((image) => image === hero);
      expect(heroOccurrences).toHaveLength(1);
    });

    it("17. detail-gallery presentation never applies a compounding scale beyond 1 (the bug real user feedback caught)", () => {
      const image = remoteImage("scale-check");
      const first = resolveCatalogImagePresentation({ image, slot: "detail-gallery", imageIndex: 0, galleryCount: 3 });
      const later = resolveCatalogImagePresentation({ image, slot: "detail-gallery", imageIndex: 1, galleryCount: 3 });
      expect(first.scale).toBe(1);
      expect(later.scale).toBe(1);
    });

  });

  describe("fallback behavior", () => {
    it("18. an empty gallery falls back to the watch's own primary image rather than rendering nothing", () => {
      const detail = readSrc("src/components/catalog/catalog-watch-detail-page.tsx");
      expect(detail).toContain("sequencedGallery.length > 0 ? sequencedGallery : [heroImage]");
    });
  });
});

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CatalogImage } from "@/components/catalog/catalog-image";
import { resolveCatalogImagePresentation, type CatalogImageCompositionSlot } from "@/modules/catalog/application/catalog-image-presentation-policy";
import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";
import styles from "@/components/catalog/catalog-detail-gallery.module.css";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function imageCaption(image: CatalogImagePresentation, index: number, count: number): string | null {
  if (image.kind === "none") {
    return null;
  }
  return resolveCatalogImagePresentation({ image, slot: "detail-gallery", imageIndex: index, galleryCount: count }).caption;
}

/**
 * The watch detail page's entire photo workspace — one real, clean-image gallery instead of a
 * main hero image plus a disconnected "На запястье" wall of extra photos below it (real user
 * feedback: additional photos were "arranged carelessly, too big, going in a long wall,
 * duplicated, no clear order" — docs/CATALOG_SHOWROOM_RECOVERY.md "Gallery rebuild, second pass").
 * A single main stage, a thumbnail strip (only when there's more than one image), and an
 * accessible fullscreen viewer — nothing below this component duplicates the same photos again.
 * Client Component: the only part of the detail page that needs browser state (which image is
 * active, whether the viewer is open).
 */
export function CatalogDetailGallery({
  images,
  compositionSlot,
  title,
  referenceDisplay,
  stageClassName = "",
}: Readonly<{
  images: CatalogImagePresentation[];
  compositionSlot: CatalogImageCompositionSlot;
  title: string;
  referenceDisplay: string;
  /** Merged onto the main stage button — carries the shared `.product-stage`/`.product-stage-
   * detail` sizing and white-background classes so the fixed aspect-ratio box stays exactly where
   * it was, without the thumbnail strip below it having to live inside that same fixed box. */
  stageClassName?: string;
}>) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const thumbRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const stageButtonRef = useRef<HTMLButtonElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const viewerCloseRef = useRef<HTMLButtonElement | null>(null);

  const count = images.length;
  const active = images[activeIndex] ?? images[0] ?? { kind: "none" as const, alt: title };

  const goTo = useCallback(
    (index: number) => {
      if (count === 0) return;
      setActiveIndex(((index % count) + count) % count);
    },
    [count],
  );

  const openViewer = useCallback(() => setIsViewerOpen(true), []);
  const closeViewer = useCallback(() => setIsViewerOpen(false), []);

  // Focus trap, Escape-to-close, body scroll lock, focus return, and Left/Right navigation for
  // the fullscreen viewer — same pattern already trusted for the filter dialog (catalog-filter-
  // dialog.tsx), plus arrow-key prev/next since a photo viewer needs it and a filter panel doesn't.
  useEffect(() => {
    if (!isViewerOpen) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousBodyOverflow = document.body.style.overflow;
    const dialog = viewerRef.current;
    const stageButton = stageButtonRef.current;

    viewerCloseRef.current?.focus();
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeViewer();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goTo(activeIndex + 1);
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goTo(activeIndex - 1);
        return;
      }

      if (event.key !== "Tab" || !dialog) {
        return;
      }

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.offsetParent !== null,
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      (previouslyFocused ?? stageButton)?.focus();
    };
  }, [isViewerOpen, activeIndex, goTo, closeViewer]);

  function handleThumbKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % count;
    else if (event.key === "ArrowLeft") nextIndex = (index - 1 + count) % count;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = count - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    goTo(nextIndex);
    thumbRefs.current[nextIndex]?.focus();
  }

  return (
    <div className={styles.workspace}>
      <button
        type="button"
        ref={stageButtonRef}
        className={`${styles.stage} ${stageClassName}`}
        onClick={openViewer}
        aria-label={`Увеличить фото: ${title}, ${referenceDisplay}, фото ${activeIndex + 1} из ${count}`}
      >
        <CatalogImage image={active} priority={activeIndex === 0} presentation="full" compositionSlot={compositionSlot} galleryCount={count} />
        {active.kind !== "none" ? (
          <span className={styles.zoomHint} aria-hidden="true">
            <span className={styles.zoomIcon} />
            Увеличить
          </span>
        ) : null}
      </button>

      {count > 1 ? (
        <div className={styles.thumbRow} role="group" aria-label="Другие фотографии">
          {images.map((image, index) => {
            const caption = imageCaption(image, index, count);
            return (
              <button
                key={`${image.kind}-${index}`}
                ref={(element) => {
                  thumbRefs.current[index] = element;
                }}
                type="button"
                className={`${styles.thumb} ${index === activeIndex ? styles.thumbActive : ""}`}
                aria-current={index === activeIndex}
                aria-label={`Фото ${index + 1} из ${count}${caption ? `, ${caption}` : ""}`}
                tabIndex={index === activeIndex ? 0 : -1}
                onClick={() => goTo(index)}
                onKeyDown={(event) => handleThumbKeyDown(event, index)}
              >
                <CatalogImage image={image} presentation="card" priority={index < 10} />
              </button>
            );
          })}
        </div>
      ) : null}

      {isViewerOpen ? (
        <div className={styles.viewerOverlay} role="presentation" onClick={closeViewer}>
          <div
            ref={viewerRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${title}, ${referenceDisplay} — просмотр фотографий`}
            className={styles.viewerPanel}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.viewerHead}>
              <span className={styles.viewerIndex} aria-live="polite">
                {activeIndex + 1} / {count}
              </span>
              <button type="button" ref={viewerCloseRef} className={styles.viewerClose} onClick={closeViewer} aria-label="Закрыть просмотр">
                <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className={styles.viewerStage}>
              {count > 1 ? (
                <button type="button" className={`${styles.viewerNav} ${styles.viewerPrev}`} onClick={() => goTo(activeIndex - 1)} aria-label="Предыдущее фото">
                  <span aria-hidden="true">‹</span>
                </button>
              ) : null}

              <CatalogImage image={active} presentation="guarded" priority />

              {count > 1 ? (
                <button type="button" className={`${styles.viewerNav} ${styles.viewerNext}`} onClick={() => goTo(activeIndex + 1)} aria-label="Следующее фото">
                  <span aria-hidden="true">›</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

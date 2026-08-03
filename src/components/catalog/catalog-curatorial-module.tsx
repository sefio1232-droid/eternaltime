"use client";

import Link from "next/link";
import { useState } from "react";
import { CatalogImage } from "@/components/catalog/catalog-image";
import type { CatalogCuratorialPath } from "@/modules/catalog/application/catalog-read-service";
import styles from "@/components/catalog/catalog-curatorial-module.module.css";

/**
 * "Кураторский маршрут" — replaces the old single-watch dark editorial banner (Phase 4 "radical
 * rebuild"). Helps pick a starting point rather than advertising one model: three short, real
 * paths (see `pickCatalogCuratorialPaths`), each backed by an actual clean-image watch. Hovering
 * or focusing a path swaps the displayed model (opacity + a few px of translate, never rotation or
 * a fast carousel); every row is also a real link to that watch's canonical route. Renders nothing
 * if the catalog has no qualifying watch for any path — never invents a placeholder.
 */
export function CatalogCuratorialModule({ paths }: Readonly<{ paths: CatalogCuratorialPath[] }>) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (paths.length === 0) {
    return null;
  }

  const boundedIndex = Math.min(activeIndex, paths.length - 1);

  return (
    <section className={styles.module} aria-label="Кураторский маршрут">
      <div className={styles.stage}>
        {paths.map((path, index) => (
          <Link
            key={path.watch.id}
            href={path.watch.href}
            className={`${styles.stageImage} ${index === boundedIndex ? styles.stageImageActive : ""}`}
            aria-hidden={index === boundedIndex ? undefined : true}
            tabIndex={index === boundedIndex ? undefined : -1}
          >
            <CatalogImage image={path.watch.primaryImage} presentation="guarded" compositionSlot="catalog-feature" />
          </Link>
        ))}
      </div>

      <div className={styles.copy}>
        <p className={styles.eyebrow}>Кураторский маршрут</p>
        <h2 className={styles.title}>С чего начать коллекцию</h2>
        <p className={styles.lead}>
          Три понятных направления: универсальные часы на каждый день, первая механика и модель для путешествий.
        </p>

        <ul className={styles.pathList}>
          {paths.map((path, index) => (
            <li key={path.key}>
              <Link
                href={path.watch.href}
                className={`${styles.pathRow} ${index === boundedIndex ? styles.pathRowActive : ""}`}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
              >
                <span className={styles.pathNumber}>{path.number}</span>
                <span className={styles.pathText}>
                  <span className={styles.pathLabel}>{path.label}</span>
                  <span className={styles.pathDescription}>{path.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Link href="/selection" className={styles.cta}>
          Пройти подбор <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}

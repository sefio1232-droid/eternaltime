"use client";

import Link from "next/link";
import { buildComparisonHref, emptyLocalComparison } from "@/modules/comparison/domain/local-comparison";
import { useLocalComparison } from "./use-local-comparison";
import styles from "./comparison-controls.module.css";

export function CompareTray() {
  const { comparison, ready, setComparison } = useLocalComparison();
  if (!ready || comparison.items.length === 0) return null;

  return (
    <aside className={styles.tray} aria-label="Панель сравнения" aria-live="polite">
      <div className={styles.trayCopy}>
        <span className={styles.trayCount}>{comparison.items.length} / 4</span>
        <div>
          <strong>Сравнение</strong>
          <p>{comparison.items.map((item) => `${item.brandName} ${item.displayName}`).join(" · ")}</p>
        </div>
      </div>
      <div className={styles.trayActions}>
        <button type="button" onClick={() => setComparison(emptyLocalComparison)}>Очистить</button>
        <Link href={buildComparisonHref(comparison.items)}>Открыть сравнение →</Link>
      </div>
    </aside>
  );
}

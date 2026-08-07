"use client";

import {
  comparisonMaximumItems,
  toggleLocalComparisonItem,
  type LocalComparisonItem,
} from "@/modules/comparison/domain/local-comparison";
import { useLocalComparison } from "./use-local-comparison";
import styles from "./comparison-controls.module.css";

export function CompareToggle({
  item,
  variant = "card",
}: Readonly<{
  item: Omit<LocalComparisonItem, "addedAt">;
  variant?: "card" | "detail";
}>) {
  const { comparison, ready, setComparison } = useLocalComparison();
  const active = ready && comparison.items.some((candidate) => candidate.identity === item.identity);
  const limitReached = ready && !active && comparison.items.length >= comparisonMaximumItems;
  const label = active ? "В сравнении" : "Сравнить";

  return (
    <button
      type="button"
      className={styles.toggle}
      data-variant={variant}
      data-active={active ? "true" : "false"}
      aria-pressed={active}
      disabled={limitReached}
      title={limitReached ? "Можно сравнить до четырёх моделей" : label}
      onClick={() => {
        const result = toggleLocalComparisonItem(comparison, { ...item, addedAt: new Date().toISOString() });
        if (result.outcome !== "limit_reached") setComparison(result.comparison);
      }}
    >
      <span aria-hidden="true">{active ? "✓" : "+"}</span>
      {label}
    </button>
  );
}

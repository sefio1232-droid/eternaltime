"use client";

import {
  comparisonMaximumItems,
  toggleLocalComparisonItem,
  type LocalComparisonItem,
} from "@/modules/comparison/domain/local-comparison";
import { trackAnalyticsEvent } from "@/components/analytics/analytics-client";
import type { PublicCommerceStateKind } from "@/modules/commerce/domain/public-commerce-state";
import { useLocalComparison } from "./use-local-comparison";
import styles from "./comparison-controls.module.css";

export function CompareToggle({
  item,
  variant = "card",
  commerceState,
}: Readonly<{
  item: Omit<LocalComparisonItem, "addedAt">;
  variant?: "card" | "detail";
  commerceState?: PublicCommerceStateKind;
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
        if (result.outcome !== "limit_reached") {
          setComparison(result.comparison);
          if (result.outcome === "added") {
            trackAnalyticsEvent("compare_added", {
              brand: item.brandName,
              reference: item.referenceDisplay,
              commerce_state: commerceState,
              source_surface: variant === "detail" ? "watch_detail" : "catalog",
            });
          }
        }
      }}
    >
      <span aria-hidden="true">{active ? "✓" : "+"}</span>
      {label}
    </button>
  );
}

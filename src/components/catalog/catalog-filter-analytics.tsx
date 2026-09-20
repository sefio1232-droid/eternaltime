"use client";

import { useEffect, useRef } from "react";
import { trackAnalyticsEvent } from "@/components/analytics/analytics-client";

const filterNames: Record<string, "brand" | "price" | "movement" | "style" | "water_resistance" | "sort" | "search" | "availability"> = {
  brand: "brand",
  collection: "style",
  gender: "style",
  size: "style",
  movement: "movement",
  dialColor: "style",
  strap: "style",
  water: "water_resistance",
  caseMaterial: "style",
  crystal: "style",
  priceMin: "price",
  priceMax: "price",
  sort: "sort",
  q: "search",
  available: "availability",
};

export function CatalogFilterAnalytics() {
  const markerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const form = markerRef.current?.closest("form");
    if (!form) return;

    function handleChange(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

      const filter = filterNames[target.name];
      if (!filter) return;

      void trackAnalyticsEvent("catalog_filter_changed", {
        action: filter === "sort" ? "sort_changed" : "changed",
        filter,
        value: target instanceof HTMLInputElement && target.type === "checkbox"
          ? target.checked ? "1" : "0"
          : target.value.slice(0, 120),
      });
    }

    form.addEventListener("change", handleChange);
    return () => form.removeEventListener("change", handleChange);
  }, []);

  return <span ref={markerRef} hidden aria-hidden="true" />;
}

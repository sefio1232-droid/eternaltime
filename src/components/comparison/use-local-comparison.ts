"use client";

import { useCallback, useEffect, useState } from "react";
import {
  emptyLocalComparison,
  localComparisonStorageKey,
  parseLocalComparison,
  serializeLocalComparison,
  type LocalComparison,
} from "@/modules/comparison/domain/local-comparison";

const comparisonChangeEvent = "eternal-time:comparison-change";

export function useLocalComparison() {
  const [comparison, setComparisonState] = useState<LocalComparison>(emptyLocalComparison);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => setComparisonState(parseLocalComparison(window.localStorage.getItem(localComparisonStorageKey)));
    const handleStorage = (event: StorageEvent) => {
      if (event.key === localComparisonStorageKey) read();
    };
    const handleLocalChange = () => read();
    const timer = window.setTimeout(() => {
      read();
      setReady(true);
    }, 0);
    window.addEventListener("storage", handleStorage);
    window.addEventListener(comparisonChangeEvent, handleLocalChange);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(comparisonChangeEvent, handleLocalChange);
    };
  }, []);

  const setComparison = useCallback((next: LocalComparison) => {
    setComparisonState(next);
    try {
      window.localStorage.setItem(localComparisonStorageKey, serializeLocalComparison(next));
      window.dispatchEvent(new Event(comparisonChangeEvent));
    } catch {
      // The current component remains usable when browser storage is unavailable.
    }
  }, []);

  return { comparison, ready, setComparison };
}

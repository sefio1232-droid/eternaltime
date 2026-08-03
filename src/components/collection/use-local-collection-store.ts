"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CollectionRecommendationCandidate } from "@/modules/collection-intelligence/domain/types";
import {
  createDemoLocalCollection,
  createEmptyLocalCollection,
  localCollectionDemoStorageKeyFor,
  localCollectionLegacyDemoStorageKey,
  localCollectionLegacyStorageKey,
  localCollectionNoticeStorageKey,
  localCollectionStorageKey,
  parseLocalCollection,
  serializeLocalCollection,
  type LocalCollectionDemoScenario,
  type LocalCollectionWatch,
} from "@/modules/user-watch-collection/application/local-collection";
import { resolveLocalCollectionWatchImages } from "@/modules/user-watch-collection/application/local-collection-images";

export function useLocalCollectionStore(input: {
  demoScenario: LocalCollectionDemoScenario | null;
  catalogCandidates: CollectionRecommendationCandidate[];
}) {
  const { demoScenario, catalogCandidates } = input;
  const demoMode = demoScenario !== null;
  const [watches, setWatches] = useState<LocalCollectionWatch[]>(
    demoScenario ? createDemoLocalCollection(catalogCandidates, undefined, demoScenario) : createEmptyLocalCollection(),
  );
  const [ready, setReady] = useState(false);
  const [storageMessage, setStorageMessage] = useState(
    demoMode ? "Демо-режим хранится отдельно и не изменяет вашу локальную коллекцию." : "",
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const storage = demoMode ? window.sessionStorage : window.localStorage;
      const storageKey = demoScenario ? localCollectionDemoStorageKeyFor(demoScenario) : localCollectionStorageKey;
      const legacyKey =
        demoScenario === "many"
          ? localCollectionLegacyDemoStorageKey
          : demoScenario
            ? null
            : localCollectionLegacyStorageKey;
      const currentRaw = storage.getItem(storageKey);
      const legacyRaw = currentRaw || !legacyKey ? null : storage.getItem(legacyKey);
      const raw = currentRaw ?? legacyRaw;
      const stored = parseLocalCollection(raw);
      const notice = window.sessionStorage.getItem(localCollectionNoticeStorageKey);

      if (stored) {
        setWatches(stored);
        if (legacyRaw) {
          storage.setItem(storageKey, serializeLocalCollection(stored));
          setStorageMessage("Локальная коллекция обновлена до нового безопасного формата.");
        }
      } else if (raw) {
        setStorageMessage(
          demoMode
            ? "Поврежденное демо-состояние удалено; загружена исходная демонстрация."
            : "Поврежденные локальные данные не загружены. Создана безопасная пустая коллекция.",
        );
      }
      if (notice) {
        setStorageMessage(notice);
        window.sessionStorage.removeItem(localCollectionNoticeStorageKey);
      }
      setReady(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [demoMode, demoScenario]);

  useEffect(() => {
    if (!ready) return;
    const storage = demoMode ? window.sessionStorage : window.localStorage;
    const storageKey = demoScenario ? localCollectionDemoStorageKeyFor(demoScenario) : localCollectionStorageKey;
    storage.setItem(storageKey, serializeLocalCollection(watches));
  }, [demoMode, demoScenario, ready, watches]);

  const commitWatches = useCallback(
    (next: LocalCollectionWatch[]) => {
      setWatches(next);
      if (!ready) return;
      const storage = demoMode ? window.sessionStorage : window.localStorage;
      const storageKey = demoScenario ? localCollectionDemoStorageKeyFor(demoScenario) : localCollectionStorageKey;
      storage.setItem(storageKey, serializeLocalCollection(next));
    },
    [demoMode, demoScenario, ready],
  );
  const resolvedWatches = useMemo(
    () => resolveLocalCollectionWatchImages(watches, catalogCandidates),
    [catalogCandidates, watches],
  );

  return {
    watches: resolvedWatches,
    ready,
    storageMessage,
    setStorageMessage,
    commitWatches,
  };
}

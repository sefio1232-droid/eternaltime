"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  CollectionSubnavigation,
  RecommendationCard,
} from "@/components/collection/local-collection-core-experience";
import { useCollectionMotion } from "@/components/collection/use-collection-motion";
import { useLocalCollectionStore } from "@/components/collection/use-local-collection-store";
import {
  buildCollectionRecommendationSet,
  collectionRecommendationIntentTitle,
} from "@/modules/collection-intelligence/domain/recommendations";
import type {
  CollectionRecommendationCandidate,
  CollectionRecommendationIntent,
} from "@/modules/collection-intelligence/domain/types";
import type { LocalCollectionDemoScenario } from "@/modules/user-watch-collection/application/local-collection";
import { compareCollectionText } from "@/modules/user-watch-collection/application/local-collection-picker";
import { russianPluralForm } from "@/modules/user-watch-collection/application/local-collection-presentation";
import styles from "./collection-experience.module.css";

type RecommendationSort = "score" | "price_asc" | "price_desc";

export function LocalCollectionRecommendations({
  intent,
  demoMode,
  demoScenario = null,
  catalogCandidates,
}: Readonly<{
  intent: CollectionRecommendationIntent;
  demoMode: boolean;
  demoScenario?: LocalCollectionDemoScenario | null;
  catalogCandidates: CollectionRecommendationCandidate[];
}>) {
  const motionRef = useCollectionMotion<HTMLElement>();
  const { watches, ready, storageMessage } = useLocalCollectionStore({
    demoScenario: demoMode ? demoScenario ?? "many" : null,
    catalogCandidates,
  });
  const [brand, setBrand] = useState("all");
  const [sort, setSort] = useState<RecommendationSort>("score");
  const collectionHref = demoMode
    ? `/collection?demo=${encodeURIComponent(demoScenario ?? "many")}`
    : "/collection";
  const recommendationSet = useMemo(
    () => buildCollectionRecommendationSet(watches, catalogCandidates, intent, 12),
    [catalogCandidates, intent, watches],
  );
  const brands = [...new Set(recommendationSet.candidates.map((entry) => entry.candidate.brandName))]
    .sort(compareCollectionText);
  const recommendationOrder = new Map(
    recommendationSet.candidates.map((entry, index) => [entry.candidate.catalogReferenceId, index]),
  );
  const visible = recommendationSet.candidates
    .filter((entry) => brand === "all" || entry.candidate.brandName === brand)
    .sort((left, right) => {
      if (sort === "price_asc") {
        return (left.candidate.publicPriceMinor ?? 0) - (right.candidate.publicPriceMinor ?? 0);
      }
      if (sort === "price_desc") {
        return (right.candidate.publicPriceMinor ?? 0) - (left.candidate.publicPriceMinor ?? 0);
      }
      return (
        (recommendationOrder.get(left.candidate.catalogReferenceId) ?? Number.MAX_SAFE_INTEGER) -
          (recommendationOrder.get(right.candidate.catalogReferenceId) ?? Number.MAX_SAFE_INTEGER) ||
        compareCollectionText(left.candidate.displayName, right.candidate.displayName)
      );
    });

  return (
    <div className={styles.experience}>
      <CollectionSubnavigation active="recommendations" demoScenario={demoMode ? demoScenario ?? "many" : null} />
      <header className={styles.addHeader}>
        <nav className={styles.breadcrumb}>
          <Link href={collectionHref}>Коллекция</Link>
          <span>/</span>
          Подборка
        </nav>
        <p className={styles.eyebrow}>Следующее направление</p>
        <h1>{collectionRecommendationIntentTitle(intent)}</h1>
        <p>Подборка учитывает характер коллекции, подтвержденные характеристики и доступный ценовой диапазон.</p>
      </header>

      <section
        ref={motionRef}
        className={`${styles.catalogPanel} ${styles.motionSection}`}
        data-motion-state="idle"
        aria-labelledby="recommendation-results-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={`${styles.eyebrow} ${styles.motionEyebrow}`}>Персональный результат</p>
            <h2 id="recommendation-results-title" className={styles.motionHeading}>
              {visible.length > 0
                ? `${visible.length} ${russianPluralForm(visible.length, { one: "модель", few: "модели", many: "моделей" })} с пояснениями`
                : "Точных моделей пока нет"}
            </h2>
          </div>
          <Link href={collectionHref} className={styles.textAction}>
            Назад в коллекцию →
          </Link>
        </div>
        <div className={styles.catalogTools}>
          <label className={styles.field}>
            <span>Бренд</span>
            <select value={brand} onChange={(event) => setBrand(event.target.value)}>
              <option value="all">Все бренды</option>
              {brands.map((entry) => <option key={entry}>{entry}</option>)}
            </select>
          </label>
          <label className={styles.field}>
            <span>Сортировка</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as RecommendationSort)}>
              <option value="score">По соответствию</option>
              <option value="price_asc">Сначала доступнее</option>
              <option value="price_desc">Сначала дороже</option>
            </select>
          </label>
          <span>Минимальная цена: 15 000 ₽</span>
        </div>
        {!ready && watches.length === 0 ? (
          <div className={styles.loading}>Сверяем подборку с вашей коллекцией…</div>
        ) : visible.length > 0 ? (
          <div className={styles.recommendationGrid}>
            {visible.map((entry) => <RecommendationCard key={entry.candidate.catalogReferenceId} entry={entry} />)}
          </div>
        ) : (
          <p className={styles.noMatch}>
            В каталоге пока нет моделей, которые одновременно соответствуют ценовому диапазону и имеют подтвержденные
            характеристики и подходящее изображение.
          </p>
        )}
      </section>
      <p className={styles.serviceText} aria-live="polite">{storageMessage}</p>
    </div>
  );
}

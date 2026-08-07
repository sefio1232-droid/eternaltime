"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CatalogImage } from "@/components/catalog/catalog-image";
import type { ComparisonPresentation } from "@/modules/comparison/application/comparison-presentation";
import {
  buildComparisonHref,
  comparisonMaximumItems,
  mergeLocalComparisonItems,
  removeLocalComparisonItem,
} from "@/modules/comparison/domain/local-comparison";
import { useLocalComparison } from "./use-local-comparison";
import styles from "./compare-workspace.module.css";

const groupLabels: Record<ComparisonPresentation["rows"][number]["group"], string> = {
  commercial: "Предложение",
  mechanism: "Механизм",
  case: "Корпус",
  dimensions: "Размеры",
  glass: "Стекло",
  wear: "Посадка и использование",
  functions: "Дополнительно",
};

const groupOrder: Array<ComparisonPresentation["rows"][number]["group"]> = [
  "commercial",
  "mechanism",
  "case",
  "dimensions",
  "glass",
  "wear",
  "functions",
];

export function CompareWorkspace({
  presentation,
  requestedCount,
  unavailableCount,
}: Readonly<{
  presentation: ComparisonPresentation;
  requestedCount: number;
  unavailableCount: number;
}>) {
  const router = useRouter();
  const { comparison, ready, setComparison } = useLocalComparison();
  const [differencesOnly, setDifferencesOnly] = useState(presentation.watches.length >= 2);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "unavailable">("idle");

  useEffect(() => {
    if (!ready) return;
    if (presentation.watches.length === 0) {
      if (requestedCount === 0 && comparison.items.length > 0) {
        router.replace(buildComparisonHref(comparison.items));
      }
      return;
    }

    const incoming = presentation.watches.map((watch) => ({ ...watch.localItem, addedAt: new Date().toISOString() }));
    const merged = mergeLocalComparisonItems(comparison, incoming);
    if (merged.items.length !== comparison.items.length) setComparison(merged);
  }, [comparison, presentation.watches, ready, requestedCount, router, setComparison]);

  const visibleRows = useMemo(
    () => presentation.rows.filter((row) => !differencesOnly || row.different),
    [differencesOnly, presentation.rows],
  );
  const hiddenIdenticalCount = presentation.rows.length - visibleRows.length;
  const visibleGroups = groupOrder
    .map((group) => ({ group, rows: visibleRows.filter((row) => row.group === group) }))
    .filter((section) => section.rows.length > 0);
  const differenceCount = presentation.rows.filter((row) => row.different).length;
  const valueCount = presentation.rows.reduce((total, row) => total + row.values.length, 0);
  const knownValueCount = presentation.rows.reduce(
    (total, row) => total + row.values.filter((value) => !value.unknown).length,
    0,
  );
  const completeness = valueCount > 0 ? Math.round((knownValueCount / valueCount) * 100) : 0;

  function remove(identity: string) {
    const nextLocal = removeLocalComparisonItem(comparison, identity);
    setComparison(nextLocal);
    const remaining = presentation.watches.filter((watch) => watch.identity !== identity);
    router.replace(buildComparisonHref(remaining.map((watch) => watch.localItem)));
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
    } catch {
      setCopyState("unavailable");
    }
  }

  if (presentation.watches.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.eyebrow}>СРАВНЕНИЕ / 0 ИЗ 4</p>
        <h1>Соберите модели для сравнения</h1>
        <p>Добавьте часы из каталога или со страницы модели. Здесь можно сопоставить от двух до четырёх точных артикулов.</p>
        {unavailableCount > 0 ? <p className={styles.notice}>Некоторые переданные модели не найдены в текущем публичном каталоге.</p> : null}
        <Link href="/watches" className={styles.primaryAction}>Открыть каталог →</Link>
      </div>
    );
  }

  return (
    <div className={styles.workspace} style={{ "--compare-count": presentation.watches.length } as React.CSSProperties}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>СРАВНЕНИЕ / {presentation.watches.length} ИЗ 4</p>
          <h1>Сравнение часов</h1>
          <p>Различия показаны по подтверждённым данным каталога. Отсутствующие характеристики отмечены явно.</p>
        </div>
        <div className={styles.headerAside}>
          <div className={styles.comparisonSummary}>
            <strong>{differenceCount}</strong>
            <span>различий<br />в характеристиках</span>
          </div>
          <p>Заполненность подтверждённых данных — {completeness}%</p>
          <div className={styles.headerActions}>
            {presentation.watches.length < comparisonMaximumItems ? <Link href="/watches">Добавить модель</Link> : null}
            <button type="button" onClick={copyLink}>{copyState === "copied" ? "Ссылка скопирована" : copyState === "unavailable" ? "Копирование недоступно" : "Скопировать ссылку"}</button>
          </div>
        </div>
      </header>

      {unavailableCount > 0 ? <p className={styles.notice}>Не удалось открыть {unavailableCount} из переданных моделей: неизвестные ссылки исключены.</p> : null}

      <section className={styles.watchRail} aria-label="Выбранные модели">
        {presentation.watches.map((watch, index) => (
          <article key={watch.identity} className={styles.watchCard}>
            <Link href={watch.href} className={styles.watchMedia}>
              <span className={styles.watchIndex} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              <CatalogImage image={watch.image} presentation="guarded" />
            </Link>
            <div className={styles.watchIdentity}>
              <span>{watch.brandName}</span>
              <h2>{watch.displayName}</h2>
              <p>{watch.referenceDisplay}</p>
            </div>
            <button type="button" onClick={() => remove(watch.identity)} aria-label={`Убрать ${watch.brandName} ${watch.displayName} из сравнения`}>Убрать</button>
          </article>
        ))}
      </section>

      {presentation.watches.length === 1 ? (
        <section className={styles.oneWatch}>
          <h2>Добавьте ещё одну модель</h2>
          <p>Сравнение различий станет доступно, когда в списке будет минимум двое часов.</p>
          <Link href="/watches">Выбрать вторую модель →</Link>
        </section>
      ) : null}

      <div className={styles.tableToolbar}>
        <div className={styles.tableIntro}>
          <span>Детали различий</span>
          <p>{visibleRows.length} из {presentation.rows.length} параметров показано</p>
        </div>
        <div className={styles.tableFilter}>
          <label>
            <input type="checkbox" checked={differencesOnly} onChange={(event) => setDifferencesOnly(event.target.checked)} />
            <span>Только различия</span>
          </label>
          {differencesOnly && hiddenIdenticalCount > 0 ? <p>Скрыто одинаковых: {hiddenIdenticalCount}</p> : null}
        </div>
      </div>

      <section className={styles.comparisonDetails} aria-label="Сравнение характеристик выбранных моделей">
        <div className={styles.modelLegend} aria-label="Порядок моделей в сравнении">
          {presentation.watches.map((watch, index) => (
            <div key={watch.identity}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{watch.brandName}</strong>
              <small>{watch.referenceDisplay}</small>
            </div>
          ))}
        </div>

        <div className={styles.detailChapters}>
          {visibleGroups.map((section, sectionIndex) => (
            <section className={styles.detailChapter} key={section.group} aria-labelledby={`compare-group-${section.group}`}>
              <header className={styles.chapterHeader}>
                <span aria-hidden="true">{String(sectionIndex + 1).padStart(2, "0")}</span>
                <div>
                  <p>Глава</p>
                  <h3 id={`compare-group-${section.group}`}>{groupLabels[section.group]}</h3>
                  <small>{section.rows.length} {section.rows.length === 1 ? "параметр" : "параметра"}</small>
                </div>
              </header>

              <div className={styles.chapterRows}>
                {section.rows.map((row) => (
                  <article
                    className={styles.detailRow}
                    data-different={row.different ? "true" : "false"}
                    data-featured={row.key === "price" ? "true" : "false"}
                    key={row.key}
                  >
                    <h4>{row.label}</h4>
                    <div className={styles.detailValues}>
                      {row.values.map((value, index) => (
                        <div
                          className={styles.detailValue}
                          data-unknown={value.unknown ? "true" : "false"}
                          key={`${row.key}-${presentation.watches[index]?.identity}`}
                        >
                          <span>{presentation.watches[index]?.brandName}</span>
                          <p>{value.value}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </div>
  );
}

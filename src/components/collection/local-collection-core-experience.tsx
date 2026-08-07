"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CollectionWatchStage } from "@/components/collection/collection-watch-stage";
import { useCollectionMotion } from "@/components/collection/use-collection-motion";
import { useLocalCollectionStore } from "@/components/collection/use-local-collection-store";
import { Button } from "@/components/ui/button";
import { analyzeCollection } from "@/modules/collection-intelligence/domain/analyze";
import type {
  CollectionAttachmentType,
  CollectionCandidateScore,
  CollectionCondition,
  CollectionDialColorFamily,
  CollectionMaterialFamily,
  CollectionMovementType,
  CollectionRecommendationCandidate,
  CollectionRole,
  CollectionSizeBand,
  CollectionWearFrequency,
} from "@/modules/collection-intelligence/domain/types";
import {
  archiveLocalCollectionWatch,
  createLocalCatalogWatch,
  createLocalManualWatch,
  deleteLocalCollectionWatch,
  localCollectionNoticeStorageKey,
  parseLocalPriceToMinor,
  updateLocalCollectionWatch,
  validateLocalPhotoMetadata,
  type LocalCollectionWatch,
  type LocalCollectionDemoScenario,
  type LocalCurrencyCode,
} from "@/modules/user-watch-collection/application/local-collection";
import {
  compareCollectionText,
  listLocalCollectionPickerPage,
  type LocalCollectionPickerSort,
} from "@/modules/user-watch-collection/application/local-collection-picker";
import {
  buildCollectionProfileMatrix,
  collectionCandidateMediaPresentation,
  collectionShelfLayoutForCount,
  collectionWatchMediaPresentation,
  russianPluralForm,
} from "@/modules/user-watch-collection/application/local-collection-presentation";
import styles from "./collection-experience.module.css";

type LocalCollectionCoreExperienceProps = Readonly<{
  initialMode?: "empty" | "demo";
  initialDemoScenario?: LocalCollectionDemoScenario | null;
  initialPanel?: "overview" | "add";
  initialSelectedId?: string | null;
  initialCatalogReference?: string | null;
  initialAddMode?: AddMode;
  catalogCandidates?: CollectionRecommendationCandidate[];
}>;

type CollectionFilter = "all" | "owned" | "previously_owned" | "manual";
type AddMode = "manual" | "catalog";

const roleOptions: Array<{ value: CollectionRole; label: string }> = [
  { value: "daily", label: "На каждый день" },
  { value: "business", label: "Для работы" },
  { value: "formal", label: "Для особых случаев" },
  { value: "travel", label: "Для путешествий" },
  { value: "sport", label: "Для спорта" },
  { value: "outdoor", label: "Для активного отдыха" },
  { value: "weekend", label: "На выходные" },
];

const movementOptions: Array<{ value: CollectionMovementType; label: string }> = [
  { value: "unknown", label: "Не указано" },
  { value: "automatic", label: "Автоматический" },
  { value: "manual", label: "С ручным заводом" },
  { value: "quartz", label: "Кварцевый" },
  { value: "solar", label: "Солнечный" },
  { value: "smart", label: "Цифровой / смарт" },
];

const dialOptions: Array<{ value: CollectionDialColorFamily; label: string }> = [
  { value: "unknown", label: "Не указано" },
  { value: "black", label: "Черный" },
  { value: "blue", label: "Синий" },
  { value: "white", label: "Белый" },
  { value: "silver", label: "Серебристый" },
  { value: "green", label: "Зеленый" },
  { value: "grey", label: "Серый" },
  { value: "champagne", label: "Шампань" },
  { value: "other", label: "Яркий / другой" },
];

const materialOptions: Array<{ value: CollectionMaterialFamily; label: string }> = [
  { value: "unknown", label: "Не указано" },
  { value: "steel", label: "Сталь" },
  { value: "titanium", label: "Титан" },
  { value: "ceramic", label: "Керамика" },
  { value: "resin", label: "Полимер" },
  { value: "leather", label: "Кожа" },
  { value: "rubber", label: "Каучук" },
  { value: "textile", label: "Текстиль" },
  { value: "gold", label: "Золото" },
];

const sizeOptions: Array<{ value: CollectionSizeBand; label: string }> = [
  { value: "unknown", label: "Не указано" },
  { value: "small", label: "Компактные, до 36 мм" },
  { value: "medium", label: "Средние, 37–41 мм" },
  { value: "large", label: "Крупные, 42–44 мм" },
  { value: "oversized", label: "Очень крупные, от 45 мм" },
];

const attachmentOptions: Array<{ value: CollectionAttachmentType; label: string }> = [
  { value: "unknown", label: "Не указано" },
  { value: "steel_bracelet", label: "Стальной браслет" },
  { value: "leather_strap", label: "Кожаный ремень" },
  { value: "rubber_strap", label: "Каучуковый ремень" },
  { value: "textile_strap", label: "Текстильный ремень" },
  { value: "other", label: "Другой" },
];

const frequencyOptions: Array<{ value: CollectionWearFrequency; label: string }> = [
  { value: "unknown", label: "Не указано" },
  { value: "daily", label: "Часто" },
  { value: "weekly", label: "Несколько раз в неделю" },
  { value: "occasionally", label: "Иногда" },
  { value: "rarely", label: "Редко / не ношу" },
];

const conditionOptions: Array<{ value: CollectionCondition; label: string }> = [
  { value: "unknown", label: "Не указано" },
  { value: "new", label: "Новое" },
  { value: "excellent", label: "Отличное" },
  { value: "good", label: "Хорошее" },
  { value: "worn", label: "Со следами ношения" },
  { value: "needs_service", label: "Требует обслуживания" },
];

const filterOptions: Array<{ value: CollectionFilter; label: string }> = [
  { value: "all", label: "Все" },
  { value: "owned", label: "В коллекции" },
  { value: "previously_owned", label: "История" },
  { value: "manual", label: "Вручную" },
];

function optionLabel<T extends string>(options: Array<{ value: T; label: string }>, value: T): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function roleLabel(role: CollectionRole): string {
  return optionLabel(roleOptions, role);
}

function formatMoney(amountMinor: number | null, currencyCode: string | null): string | null {
  if (amountMinor === null || !currencyCode) return null;
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);
}

function demoSuffix(demoScenario: LocalCollectionDemoScenario | null): string {
  return demoScenario ? `?demo=${encodeURIComponent(demoScenario)}` : "";
}

function detailHref(id: string, demoScenario: LocalCollectionDemoScenario | null): string {
  return `/collection/${encodeURIComponent(id)}${demoSuffix(demoScenario)}`;
}

function collectionHref(demoScenario: LocalCollectionDemoScenario | null): string {
  return `/collection${demoSuffix(demoScenario)}`;
}

type CollectionNavigationItem = "overview" | "watches" | "recommendations" | "add";

function collectionSectionHref(
  demoScenario: LocalCollectionDemoScenario | null,
  section: "collection-shelf" | "collection-recommendations",
): string {
  return `${collectionHref(demoScenario)}#${section}`;
}

function collectionAddHref(
  demoScenario: LocalCollectionDemoScenario | null,
  mode?: AddMode,
): string {
  const query = new URLSearchParams();
  if (demoScenario) query.set("demo", demoScenario);
  if (mode) query.set("mode", mode);
  const suffix = query.toString();
  return `/collection/new${suffix ? `?${suffix}` : ""}`;
}

export function CollectionSubnavigation({
  active,
  demoScenario,
}: Readonly<{
  active: CollectionNavigationItem;
  demoScenario: LocalCollectionDemoScenario | null;
}>) {
  const [current, setCurrent] = useState<CollectionNavigationItem>(active);
  const items: Array<{ id: CollectionNavigationItem; label: string; href: string }> = [
    { id: "overview", label: "Обзор", href: collectionHref(demoScenario) },
    {
      id: "watches",
      label: "Мои часы",
      href: collectionSectionHref(demoScenario, "collection-shelf"),
    },
    {
      id: "recommendations",
      label: "Рекомендации",
      href: collectionSectionHref(demoScenario, "collection-recommendations"),
    },
    { id: "add", label: "Добавить часы", href: collectionAddHref(demoScenario) },
  ];

  return (
    <nav className={styles.collectionSubnav} aria-label="Разделы личной коллекции">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.href}
          aria-current={current === item.id ? "page" : undefined}
          onClick={() => setCurrent(item.id)}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function effectiveImage(watch: LocalCollectionWatch): string | null {
  return watch.sourceKind === "manual" ? watch.photoDataUrl : watch.imageUrl;
}

function collectionCandidateImagesForWatch(
  watch: LocalCollectionWatch,
  candidates: CollectionRecommendationCandidate[],
): string[] {
  if (watch.sourceKind === "manual") return [];
  const candidate = candidates.find((entry) =>
    (watch.catalogReferenceId !== null && entry.catalogReferenceId === watch.catalogReferenceId) ||
    (watch.catalogHref !== null && entry.href === watch.catalogHref),
  );
  return candidate?.imageCandidates ?? [];
}

function CollectionWatchActionMenu({
  watch,
  demoScenario,
  onArchive,
  onDeleteRequest,
}: Readonly<{
  watch: LocalCollectionWatch;
  demoScenario: LocalCollectionDemoScenario | null;
  onArchive: () => void;
  onDeleteRequest: (trigger: HTMLElement) => void;
}>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLAnchorElement | HTMLButtonElement | null>>([]);
  const href = detailHref(watch.id, demoScenario);

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function focusItem(index: number): void {
    const items = itemRefs.current.filter(
      (item): item is HTMLAnchorElement | HTMLButtonElement =>
        item !== null && (!(item instanceof HTMLButtonElement) || !item.disabled),
    );
    items[(index + items.length) % items.length]?.focus();
  }

  function handleMenuKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const items = itemRefs.current.filter(
      (item): item is HTMLAnchorElement | HTMLButtonElement =>
        item !== null && (!(item instanceof HTMLButtonElement) || !item.disabled),
    );
    const current = items.findIndex((item) => item === document.activeElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      focusItem(current + 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusItem(current - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusItem(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusItem(items.length - 1);
    }
  }

  return (
    <div className={styles.watchActionMenu} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.watchActionTrigger}
        aria-label={`Действия для ${watch.displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => {
            const next = !value;
            if (next) window.setTimeout(() => itemRefs.current[0]?.focus(), 0);
            return next;
          });
        }}
      >
        <span aria-hidden="true">•••</span>
      </button>
      {open ? (
        <div className={styles.watchActionPopover} role="menu" onKeyDown={handleMenuKeyDown}>
          <Link ref={(node) => { itemRefs.current[0] = node; }} role="menuitem" href={`${href}#edit-watch`} onClick={() => setOpen(false)}>
            Редактировать
          </Link>
          <Link ref={(node) => { itemRefs.current[1] = node; }} role="menuitem" href={`${href}#watch-status`} onClick={() => setOpen(false)}>
            Изменить статус
          </Link>
          <button
            ref={(node) => { itemRefs.current[2] = node; }}
            type="button"
            role="menuitem"
            disabled={watch.ownershipStatus === "previously_owned"}
            onClick={() => {
              onArchive();
              setOpen(false);
              triggerRef.current?.focus();
            }}
          >
            Архивировать
          </button>
          <button
            ref={(node) => { itemRefs.current[3] = node; }}
            type="button"
            role="menuitem"
            className={styles.watchActionDelete}
            onClick={(event) => {
              setOpen(false);
              onDeleteRequest(triggerRef.current ?? event.currentTarget);
            }}
          >
            Удалить
          </button>
        </div>
      ) : null}
    </div>
  );
}

function DeleteWatchDialog({
  watch,
  returnFocus,
  onCancel,
  onConfirm,
}: Readonly<{
  watch: LocalCollectionWatch | null;
  returnFocus: HTMLElement | null;
  onCancel: () => void;
  onConfirm: () => void;
}>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!watch || !dialog) return;
    if (!dialog.open) dialog.showModal();
    cancelRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, [watch]);

  if (!watch) return null;

  return (
    <dialog
      ref={dialogRef}
      className={styles.deleteDialog}
      aria-labelledby="delete-watch-title"
      aria-describedby="delete-watch-description"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
        window.setTimeout(() => returnFocus?.focus(), 0);
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        onCancel();
        window.setTimeout(() => returnFocus?.focus(), 0);
      }}
    >
      <div>
        <p className={styles.eyebrow}>Удаление</p>
        <h2 id="delete-watch-title">Удалить «{watch.displayName}»?</h2>
        <p id="delete-watch-description">
          Локальная запись будет удалена из коллекции. Каталог часов не изменится.
        </p>
        <div className={styles.dialogActions}>
          <button ref={cancelRef} type="button" className={styles.secondaryAction} onClick={() => {
            onCancel();
            window.setTimeout(() => returnFocus?.focus(), 0);
          }}>
            Отмена
          </button>
          <button type="button" className={styles.destructiveAction} onClick={onConfirm}>
            Удалить
          </button>
        </div>
      </div>
    </dialog>
  );
}

async function readLocalPhoto(file: File): Promise<{ dataUrl: string | null; error: string | null }> {
  const validation = validateLocalPhotoMetadata({ type: file.type, size: file.size });
  if (!validation.valid) return { dataUrl: null, error: validation.message };
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve({ dataUrl: null, error: "Не удалось прочитать изображение." });
    reader.onload = () =>
      resolve(
        typeof reader.result === "string"
          ? { dataUrl: reader.result, error: null }
          : { dataUrl: null, error: "Не удалось прочитать изображение." },
      );
    reader.readAsDataURL(file);
  });
}

export function LocalCollectionCoreExperience({
  initialMode = "empty",
  initialDemoScenario = null,
  initialPanel = "overview",
  initialSelectedId = null,
  initialCatalogReference = null,
  initialAddMode = "catalog",
  catalogCandidates = [],
}: LocalCollectionCoreExperienceProps) {
  const router = useRouter();
  const demoMode = initialMode === "demo";
  const demoScenario = demoMode ? initialDemoScenario ?? "many" : null;
  const { watches, ready, storageMessage, setStorageMessage, commitWatches } = useLocalCollectionStore({
    demoScenario,
    catalogCandidates,
  });
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<CollectionFilter>("all");
  const analysis = useMemo(() => analyzeCollection(watches, catalogCandidates), [catalogCandidates, watches]);
  const selectedWatch = initialSelectedId
    ? watches.find((watch) => watch.id === initialSelectedId) ?? null
    : null;
  const orderedCandidates = useMemo(() => {
    if (!initialCatalogReference) return catalogCandidates;
    const normalize = (value: string) => value.toLocaleUpperCase("ru").replace(/[^A-ZА-Я0-9]/g, "");
    const target = normalize(initialCatalogReference);
    return [...catalogCandidates].sort((left, right) => {
      const leftMatch =
        left.catalogReferenceId === initialCatalogReference || normalize(left.referenceDisplay) === target;
      const rightMatch =
        right.catalogReferenceId === initialCatalogReference || normalize(right.referenceDisplay) === target;
      return Number(rightMatch) - Number(leftMatch);
    });
  }, [catalogCandidates, initialCatalogReference]);

  function announce(value: string): void {
    setMessage(value);
    setStorageMessage("");
  }

  function handleArchiveWatch(id: string): void {
    commitWatches(archiveLocalCollectionWatch(watches, id));
    announce("Часы перенесены в историю.");
  }

  function handleDeleteWatch(id: string): void {
    commitWatches(deleteLocalCollectionWatch(watches, id));
    announce("Часы удалены из коллекции");
  }

  function handleCatalogAdd(catalogReferenceId: string): void {
    const candidate = catalogCandidates.find((entry) => entry.catalogReferenceId === catalogReferenceId);
    if (!candidate) {
      announce("Каталожная модель сейчас недоступна.");
      return;
    }
    if (
      watches.some(
        (watch) => watch.catalogReferenceId === candidate.catalogReferenceId && watch.ownershipStatus === "owned",
      )
    ) {
      announce("Эта модель уже есть в активной коллекции.");
      return;
    }
    const watch = createLocalCatalogWatch(candidate);
    commitWatches([watch, ...watches]);
    router.push(detailHref(watch.id, demoScenario));
  }

  function handleManualSubmit(formData: FormData, photoDataUrl: string | null): void {
    const displayName = String(formData.get("displayName") ?? "").trim();
    const brandName = String(formData.get("brandName") ?? "").trim();
    const withoutBrand = formData.get("withoutBrand") === "on";
    const role = String(formData.get("role") ?? "") as CollectionRole;
    if (!displayName) return announce("Укажите название часов.");
    if (!brandName && !withoutBrand) return announce("Укажите бренд или отметьте «Без бренда».");
    if (!roleOptions.some((option) => option.value === role)) return announce("Выберите основную роль часов.");

    const priceRaw = String(formData.get("acquisitionPrice") ?? "");
    const acquisitionPriceMinor = parseLocalPriceToMinor(priceRaw);
    if (priceRaw.trim() && acquisitionPriceMinor === null) {
      return announce("Проверьте цену покупки: используйте положительное число.");
    }

    const additionalRoles = roleOptions
      .filter((option) => formData.get(`additional-role-${option.value}`) === "on")
      .map((option) => option.value)
      .filter((value) => value !== role);
    const watch = createLocalManualWatch({
      displayName,
      brandName,
      withoutBrand,
      modelName: String(formData.get("modelName") ?? ""),
      referenceDisplay: String(formData.get("referenceDisplay") ?? ""),
      personalNote: String(formData.get("personalNote") ?? ""),
      role,
      additionalRoles,
      movementType: String(formData.get("movementType") ?? "unknown") as CollectionMovementType,
      sizeBand: String(formData.get("sizeBand") ?? "unknown") as CollectionSizeBand,
      dialColorFamily: String(formData.get("dialColorFamily") ?? "unknown") as CollectionDialColorFamily,
      attachmentType: String(formData.get("attachmentType") ?? "unknown") as CollectionAttachmentType,
      wearFrequency: String(formData.get("wearFrequency") ?? "unknown") as CollectionWearFrequency,
      condition: String(formData.get("condition") ?? "unknown") as CollectionCondition,
      ownershipStatus: formData.get("ownershipStatus") === "previously_owned" ? "previously_owned" : "owned",
      acquiredAt: String(formData.get("acquiredAt") ?? ""),
      acquisitionSource: String(formData.get("acquisitionSource") ?? ""),
      acquisitionPriceMinor,
      acquisitionCurrencyCode:
        acquisitionPriceMinor === null
          ? null
          : (String(formData.get("acquisitionCurrencyCode") ?? "RUB") as LocalCurrencyCode),
      photoDataUrl,
    });
    commitWatches([watch, ...watches]);
    router.push(detailHref(watch.id, demoScenario));
  }

  function handleDetailSubmit(formData: FormData): void {
    if (!selectedWatch) return;
    const selectedRoles = roleOptions
      .filter((option) => formData.get(`role-${option.value}`) === "on")
      .map((option) => option.value);
    if (selectedRoles.length === 0) return announce("Оставьте хотя бы одну роль часов.");

    const priceRaw = String(formData.get("acquisitionPrice") ?? "");
    const acquisitionPriceMinor = parseLocalPriceToMinor(priceRaw);
    if (priceRaw.trim() && acquisitionPriceMinor === null) {
      return announce("Проверьте цену покупки: используйте положительное число.");
    }
    commitWatches(
      updateLocalCollectionWatch(watches, selectedWatch.id, (watch) => ({
        ...watch,
        displayName: String(formData.get("displayName") ?? "").trim() || watch.displayName,
        userTitle: String(formData.get("displayName") ?? "").trim() || watch.userTitle,
        brandName: String(formData.get("brandName") ?? "").trim() || null,
        modelName: String(formData.get("modelName") ?? "").trim() || null,
        referenceDisplay: String(formData.get("referenceDisplay") ?? "").trim() || null,
        ownershipStatus:
          formData.get("ownershipStatus") === "previously_owned" ? "previously_owned" : "owned",
        roles: selectedRoles,
        movementType: String(formData.get("movementType") ?? "unknown") as CollectionMovementType,
        dialColorFamily: String(formData.get("dialColorFamily") ?? "unknown") as CollectionDialColorFamily,
        materialFamily: String(formData.get("materialFamily") ?? "unknown") as CollectionMaterialFamily,
        sizeBand: String(formData.get("sizeBand") ?? "unknown") as CollectionSizeBand,
        attachmentType: String(formData.get("attachmentType") ?? "unknown") as CollectionAttachmentType,
        wearFrequency: String(formData.get("wearFrequency") ?? "unknown") as CollectionWearFrequency,
        condition: String(formData.get("condition") ?? "unknown") as CollectionCondition,
        waterReady:
          formData.get("waterReady") === "true"
            ? true
            : formData.get("waterReady") === "false"
              ? false
              : null,
        acquiredAt: String(formData.get("acquiredAt") ?? "").trim() || null,
        acquisitionSource: String(formData.get("acquisitionSource") ?? "").trim() || null,
        acquisitionPriceMinor,
        acquisitionCurrencyCode:
          acquisitionPriceMinor === null
            ? null
            : (String(formData.get("acquisitionCurrencyCode") ?? "RUB") as LocalCurrencyCode),
        personalNote: String(formData.get("personalNote") ?? "").trim() || null,
        updatedAt: new Date().toISOString(),
      })),
    );
    announce("Данные часов сохранены.");
  }

  async function handleDetailPhoto(file: File): Promise<void> {
    if (!selectedWatch) return;
    const result = await readLocalPhoto(file);
    if (result.error || !result.dataUrl) return announce(result.error ?? "Не удалось добавить фотографию.");
    commitWatches(
      updateLocalCollectionWatch(watches, selectedWatch.id, (watch) => ({
        ...watch,
        photoDataUrl: result.dataUrl,
        updatedAt: new Date().toISOString(),
      })),
    );
    announce("Личная фотография сохранена локально.");
  }

  if (initialSelectedId) {
    return (
      <CollectionDetail
        ready={ready}
        watch={selectedWatch}
        catalogCandidates={catalogCandidates}
        demoScenario={demoScenario}
        message={message || storageMessage}
        onSubmit={handleDetailSubmit}
        onPhoto={handleDetailPhoto}
        onArchive={() => {
          if (!selectedWatch) return;
          handleArchiveWatch(selectedWatch.id);
        }}
        onDelete={() => {
          if (!selectedWatch) return;
          handleDeleteWatch(selectedWatch.id);
          window.sessionStorage.setItem(localCollectionNoticeStorageKey, "Часы удалены из коллекции");
          router.push(collectionHref(demoScenario));
        }}
      />
    );
  }

  if (initialPanel === "add") {
    return (
      <CollectionAddExperience
        candidates={orderedCandidates}
        demoScenario={demoScenario}
        initialMode={initialAddMode}
        message={message || storageMessage}
        onManualSubmit={handleManualSubmit}
        onCatalogAdd={handleCatalogAdd}
        onMessage={announce}
      />
    );
  }

  return (
      <CollectionOverviewExperience
      watches={watches}
      catalogCandidates={catalogCandidates}
      ready={ready}
      demoScenario={demoScenario}
      filter={filter}
        onFilter={setFilter}
        analysis={analysis}
        serviceMessage={message || storageMessage}
      onArchive={handleArchiveWatch}
      onDelete={handleDeleteWatch}
    />
  );
}

function CollectionOverviewExperience({
  watches,
  catalogCandidates,
  ready,
  demoScenario,
  filter,
  onFilter,
  analysis,
  serviceMessage,
  onArchive,
  onDelete,
}: Readonly<{
  watches: LocalCollectionWatch[];
  catalogCandidates: CollectionRecommendationCandidate[];
  ready: boolean;
  demoScenario: LocalCollectionDemoScenario | null;
  filter: CollectionFilter;
  onFilter: (filter: CollectionFilter) => void;
  analysis: ReturnType<typeof analyzeCollection>;
  serviceMessage: string;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}>) {
  const [deleteTarget, setDeleteTarget] = useState<LocalCollectionWatch | null>(null);
  const [deleteReturnFocus, setDeleteReturnFocus] = useState<HTMLElement | null>(null);
  const filtered = watches.filter((watch) => {
    if (filter === "owned") return watch.ownershipStatus === "owned";
    if (filter === "previously_owned") return watch.ownershipStatus === "previously_owned";
    if (filter === "manual") return watch.sourceKind === "manual";
    return true;
  });
  const shelfLayout = collectionShelfLayoutForCount(filtered.length);
  const activeWatchCount = analysis.profile.activeCount;
  const brandCount = Object.keys(analysis.profile.brandDistribution).length;
  const scenarioCount = Object.values(analysis.profile.roleDistribution).filter((count) => count > 0).length;
  const completenessPercent = Math.round(analysis.profile.profileCompleteness * 100);
  return (
    <div className={styles.experience}>
      <CollectionSubnavigation active="overview" demoScenario={demoScenario} />
      <header className={styles.masthead}>
        <div className={styles.mastheadCopy}>
          <p className={styles.eyebrow}>Личная коллекция</p>
          <h1>Ваши часы. Ваш следующий шаг.</h1>
          <p>Добавьте часы, которыми владеете. Eternal Time покажет характер коллекции и подскажет, чем ее дополнить.</p>
          {watches.length > 0 ? (
            <div className={styles.actions}>
              <Link href={collectionAddHref(demoScenario)} className={styles.primaryAction}>
                Добавить часы <span aria-hidden="true">→</span>
              </Link>
              <Link href="/watches" className={styles.secondaryAction}>
                Открыть каталог
              </Link>
            </div>
          ) : null}
        </div>
        {watches.length > 0 ? (
          <dl className={styles.mastheadMetrics} aria-label="Состав коллекции">
            <div>
              <dt>{activeWatchCount}</dt>
              <dd>{russianPluralForm(activeWatchCount, { one: "час", few: "часа", many: "часов" })}</dd>
            </div>
            <div>
              <dt>{brandCount}</dt>
              <dd>{russianPluralForm(brandCount, { one: "бренд", few: "бренда", many: "брендов" })}</dd>
            </div>
            <div>
              <dt>{scenarioCount}</dt>
              <dd>{russianPluralForm(scenarioCount, { one: "сценарий", few: "сценария", many: "сценариев" })}</dd>
            </div>
            <div>
              <dt>{completenessPercent}%</dt>
              <dd>данных заполнено</dd>
            </div>
          </dl>
        ) : null}
      </header>

      {!ready && watches.length === 0 ? (
        <div className={styles.loading} aria-live="polite">Собираем вашу полку…</div>
      ) : watches.length === 0 ? (
        <CollectionEmptyStage demoScenario={demoScenario} />
      ) : (
        <>
          <section
            id="collection-shelf"
            className={styles.shelfSection}
            aria-labelledby="collection-shelf-title"
          >
            <div className={styles.sectionHeading}>
              <div>
                <p className={styles.eyebrow}>Коллекционная полка</p>
                <h2 id="collection-shelf-title">Часы в вашей коллекции</h2>
              </div>
              <div className={styles.filterRow} aria-label="Фильтры коллекции">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={styles.filter}
                    aria-pressed={filter === option.value}
                    onClick={() => onFilter(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            {filtered.length > 0 ? (
              <div className={styles.shelfGrid} data-layout={shelfLayout}>
                {filtered.map((watch) => (
                  <article
                    key={watch.id}
                    className={styles.shelfWatch}
                  >
                    <Link href={detailHref(watch.id, demoScenario)} className={styles.shelfWatchLink}>
                      <CollectionWatchStage
                        className={styles.watchStage}
                        variant="shelf"
                        imageUrl={effectiveImage(watch)}
                        imageCandidates={collectionCandidateImagesForWatch(watch, catalogCandidates)}
                        alt={watch.displayName}
                        presentation={collectionWatchMediaPresentation(watch)}
                      />
                      <div className={styles.watchMeta}>
                        <span>{watch.brandName ?? "Без бренда"}</span>
                        <strong>{watch.displayName}</strong>
                        {watch.referenceDisplay ? <small>{watch.referenceDisplay}</small> : null}
                        <div>
                          <em>{roleLabel(watch.roles[0] ?? "daily")}</em>
                          <em>{watch.sourceKind === "catalog" ? "Из каталога" : "Вручную"}</em>
                          {watch.ownershipStatus === "previously_owned" ? <em>Ранее в коллекции</em> : null}
                        </div>
                        {shelfLayout === "single" ? (
                          <p className={styles.singleInsight}>Первая точка личной коллекции</p>
                        ) : null}
                      </div>
                    </Link>
                    <CollectionWatchActionMenu
                      watch={watch}
                      demoScenario={demoScenario}
                      onArchive={() => onArchive(watch.id)}
                      onDeleteRequest={(trigger) => {
                        setDeleteReturnFocus(trigger);
                        setDeleteTarget(watch);
                      }}
                    />
                  </article>
                ))}
                {shelfLayout === "single" ? (
                  <aside className={styles.nextSlot}>
                    <span aria-hidden="true">+</span>
                    <p className={styles.eyebrow}>Новое место в коллекции</p>
                    <h3>Добавьте новую роль</h3>
                    <p className={styles.nextSlotCopy}>Выберите часы для сценария, которого еще нет в коллекции.</p>
                    <div className={styles.nextSlotActions}>
                      <Link href={collectionAddHref(demoScenario)}>Добавить часы</Link>
                      {analysis.direction ? (
                        <Link href={`/collection/recommendations/${analysis.direction.intent}${demoSuffix(demoScenario)}`}>
                          Открыть подборку
                        </Link>
                      ) : null}
                    </div>
                  </aside>
                ) : null}
              </div>
            ) : (
              <p className={styles.filterEmpty}>В этом разделе пока нет часов.</p>
            )}
          </section>

          <CollectionProfileSection analysis={analysis} />
          <RecommendationSetSection analysis={analysis} demoScenario={demoScenario} />
          <PracticalRecords
            watches={watches}
            demoScenario={demoScenario}
            onArchive={onArchive}
            onDeleteRequest={(watch, trigger) => {
              setDeleteReturnFocus(trigger);
              setDeleteTarget(watch);
            }}
          />
          <footer className={styles.secondaryActions}>
            <div>
              <p className={styles.eyebrow}>Дальше</p>
              <h2>Коллекция меняется вместе с вами</h2>
            </div>
            <div className={styles.actions}>
              <Link href={collectionAddHref(demoScenario)} className={styles.secondaryAction}>
                Добавить еще часы
              </Link>
              <Link href="/watches" className={styles.textAction}>Вернуться к каталогу →</Link>
            </div>
          </footer>
        </>
      )}
      <DeleteWatchDialog
        watch={deleteTarget}
        returnFocus={deleteReturnFocus}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          onDelete(deleteTarget.id);
          setDeleteTarget(null);
        }}
      />
      <p className={styles.serviceText} aria-live="polite">{serviceMessage}</p>
    </div>
  );
}

function CollectionEmptyStage({
  demoScenario,
}: Readonly<{
  demoScenario: LocalCollectionDemoScenario | null;
}>) {
  return (
    <section className={styles.emptyStage} aria-labelledby="empty-collection-title">
      <div className={styles.emptyCopy}>
        <p className={styles.eyebrow}>Ваша первая полка</p>
        <h2 id="empty-collection-title">Добавьте первые часы</h2>
        <p>
          Сохраните модель из каталога или создайте личную запись. Eternal Time покажет характер коллекции и предложит следующий шаг.
        </p>
        <div className={styles.actions}>
          <Link href={collectionAddHref(demoScenario)} className={styles.lightAction}>
            Выбрать из каталога
          </Link>
          <Link
            href={collectionAddHref(demoScenario, "manual")}
            className={styles.lightSecondaryAction}
          >
            Добавить вручную
          </Link>
        </div>
        <Link href="/selection" className={styles.lightTextAction}>
          Не знаете, с чего начать? Пройти подбор →
        </Link>
      </div>
      <ol className={styles.emptyProcess} aria-label="Как работает личная коллекция">
        <li><span>01</span><strong>Добавьте часы</strong></li>
        <li><span>02</span><strong>Получите профиль коллекции</strong></li>
        <li><span>03</span><strong>Найдите следующее дополнение</strong></li>
      </ol>
    </section>
  );
}

function CollectionProfileSection({ analysis }: Readonly<{ analysis: ReturnType<typeof analyzeCollection> }>) {
  const motionRef = useCollectionMotion<HTMLElement>();
  const matrix = buildCollectionProfileMatrix(analysis.profile);
  const completenessPercent = Math.round(analysis.profile.profileCompleteness * 100);

  return (
    <section
      ref={motionRef}
      className={`${styles.profileSection} ${styles.motionSection}`}
      data-motion-state="idle"
      aria-labelledby="collection-profile-title"
    >
      <div className={`${styles.profileIntro} ${styles.motionContent}`}>
        <p className={`${styles.eyebrow} ${styles.motionEyebrow}`}>Характер коллекции</p>
        <h2 id="collection-profile-title" className={styles.motionHeading}>Характер вашей коллекции</h2>
        <p>
          {analysis.profile.activeCount === 1
            ? "Начальный профиль построен по одной модели."
            : analysis.summary?.text ?? analysis.statusMessage}
        </p>
        <div className={styles.profileCompleteness}>
          <strong>{completenessPercent}%</strong>
          <span>данных заполнено</span>
        </div>
        <a href="#collection-records" className={styles.contextAction}>Уточнить характеристики →</a>
      </div>
      <div className={styles.profileMatrix}>
        {matrix.map((group) => (
          <div key={group.code} className={styles.profileMatrixGroup}>
            <h3>{group.label}</h3>
            <p>{group.values.join(" · ")}</p>
          </div>
        ))}
        {analysis.profile.lowConfidenceDimensions.length > 0 ? (
          <p className={styles.unknownNote}>Некоторые характеристики пока не заполнены</p>
        ) : null}
      </div>
    </section>
  );
}

function RecommendationSetSection({
  analysis,
  demoScenario,
}: Readonly<{
  analysis: ReturnType<typeof analyzeCollection>;
  demoScenario: LocalCollectionDemoScenario | null;
}>) {
  const motionRef = useCollectionMotion<HTMLElement>();
  const set = analysis.recommendationSet;
  if (!analysis.direction || !set) return null;
  return (
    <section
      ref={motionRef}
      id="collection-recommendations"
      className={`${styles.recommendationSection} ${styles.motionSection}`}
      data-motion-state="idle"
      aria-labelledby="recommendation-title"
    >
      <div className={styles.sectionHeading}>
        <div>
          <p className={`${styles.eyebrow} ${styles.motionEyebrow}`}>Персональная подборка</p>
          <h2 id="recommendation-title" className={styles.motionHeading}>Что добавить дальше</h2>
          <p className={styles.sectionIntro}>
            {set.confidence === "initial"
              ? "Начальная подборка по известным характеристикам одной модели."
              : "Два точных дополнения и два новых направления для коллекции."}
          </p>
          {set.confidence === "initial" ? (
            <Link href={collectionAddHref(demoScenario)} className={styles.contextAction}>
              Уточнить характеристики
            </Link>
          ) : null}
        </div>
        <Link
          href={`/collection/recommendations/${analysis.direction.intent}${demoSuffix(demoScenario)}`}
          className={styles.textAction}
        >
          Открыть всю подборку →
        </Link>
      </div>
      {set.state === "ready" ? (
        <div className={`${styles.recommendationGrid} ${styles.embeddedRecommendationGrid}`}>
          {set.candidates.map((entry) => (
            <RecommendationCard
              key={entry.candidate.catalogReferenceId}
              entry={entry}
              positionLabel={entry.position === "exact" ? "Точное дополнение" : "Новое направление"}
            />
          ))}
        </div>
      ) : (
        <p className={styles.noMatch}>
          В каталоге пока нет достаточно подходящих моделей для этого направления. Случайные варианты в подборку не добавляются.
        </p>
      )}
    </section>
  );
}

export function RecommendationCard({
  entry,
  positionLabel,
}: Readonly<{ entry: CollectionCandidateScore; positionLabel?: string }>) {
  const segmentLabels = {
    rational: "В доступном диапазоне",
    balanced: "В среднем диапазоне",
    upper: "Выше текущего диапазона",
  };
  const traits = [
    entry.candidate.movementType !== "unknown"
      ? optionLabel(movementOptions, entry.candidate.movementType)
      : null,
    entry.candidate.attachmentType !== "unknown"
      ? optionLabel(attachmentOptions, entry.candidate.attachmentType)
      : null,
    entry.candidate.dialColorFamily !== "unknown"
      ? optionLabel(dialOptions, entry.candidate.dialColorFamily)
      : null,
  ].filter((trait): trait is string => trait !== null).slice(0, 2);
  return (
    <article className={styles.recommendationCard}>
      <Link href={entry.candidate.href} className={styles.recommendationMedia} tabIndex={-1} aria-hidden="true">
        <CollectionWatchStage
          variant="recommendation"
          className={styles.recommendationStage}
          imageUrl={entry.candidate.imageUrl}
          imageCandidates={entry.candidate.imageCandidates}
          alt=""
          presentation={collectionCandidateMediaPresentation(entry.candidate)}
        />
      </Link>
      <div className={styles.recommendationCopy}>
        {positionLabel ? <p className={styles.recommendationPosition}>{positionLabel}</p> : null}
        <p className={styles.segment}>{segmentLabels[entry.priceSegment]}</p>
        <span>{entry.candidate.brandName}</span>
        <h3>{entry.candidate.displayName}</h3>
        <strong>{formatMoney(entry.candidate.publicPriceMinor, entry.candidate.currencyCode)}</strong>
        {traits.length > 0 ? (
          <div className={styles.recommendationTraits}>
            {traits.map((trait) => <span key={trait}>{trait}</span>)}
          </div>
        ) : null}
        <ul>{entry.reasons.slice(0, 2).map((reason) => <li key={reason}>{reason}</li>)}</ul>
        <Link href={entry.candidate.href} className={styles.textAction}>Смотреть модель →</Link>
      </div>
    </article>
  );
}

function PracticalRecords({
  watches,
  demoScenario,
  onArchive,
  onDeleteRequest,
}: Readonly<{
  watches: LocalCollectionWatch[];
  demoScenario: LocalCollectionDemoScenario | null;
  onArchive: (id: string) => void;
  onDeleteRequest: (watch: LocalCollectionWatch, trigger: HTMLElement) => void;
}>) {
  return (
    <section id="collection-records" className={styles.recordsSection} aria-labelledby="records-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>Личные записи</p>
          <h2 id="records-title">Записи коллекции</h2>
        </div>
      </div>
      <div className={styles.recordsList}>
        <div className={styles.recordsHeader} aria-hidden="true">
          <span>Модель</span><span>Статус</span><span>Ношение</span><span>Дата</span><span>Действия</span>
        </div>
        {watches.map((watch) => (
          <article key={watch.id} className={styles.recordRow}>
            <Link href={detailHref(watch.id, demoScenario)}><strong>{watch.displayName}</strong></Link>
            <span>{watch.ownershipStatus === "owned" ? "В коллекции" : "Ранее в коллекции"}</span>
            <span>{optionLabel(frequencyOptions, watch.wearFrequency)}</span>
            <span>{watch.acquiredAt ?? "Не указана"}</span>
            <CollectionWatchActionMenu
              watch={watch}
              demoScenario={demoScenario}
              onArchive={() => onArchive(watch.id)}
              onDeleteRequest={(trigger) => onDeleteRequest(watch, trigger)}
            />
          </article>
        ))}
      </div>
    </section>
  );
}

function CollectionAddExperience({
  candidates,
  demoScenario,
  initialMode,
  message,
  onManualSubmit,
  onCatalogAdd,
  onMessage,
}: Readonly<{
  candidates: CollectionRecommendationCandidate[];
  demoScenario: LocalCollectionDemoScenario | null;
  initialMode: AddMode;
  message: string;
  onManualSubmit: (formData: FormData, photoDataUrl: string | null) => void;
  onCatalogAdd: (catalogReferenceId: string) => void;
  onMessage: (message: string) => void;
}>) {
  const [mode, setMode] = useState<AddMode>(initialMode);
  const [displayName, setDisplayName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [role, setRole] = useState<CollectionRole>("daily");
  const [movement, setMovement] = useState<CollectionMovementType>("unknown");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("all");
  const [pickerMovement, setPickerMovement] = useState<"all" | CollectionMovementType>("all");
  const [pickerSort, setPickerSort] = useState<LocalCollectionPickerSort>("quality");
  const [pickerPage, setPickerPage] = useState(1);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const brands = useMemo(
    () => [...new Set(candidates.map((candidate) => candidate.brandName))].sort(compareCollectionText),
    [candidates],
  );
  const catalogPage = useMemo(
    () =>
      listLocalCollectionPickerPage(candidates, {
        search,
        brand,
        movement: pickerMovement,
        sort: pickerSort,
        page: pickerPage,
      }),
    [brand, candidates, pickerMovement, pickerPage, pickerSort, search],
  );

  function switchTab(next: AddMode): void {
    setMode(next);
  }

  function handleTabKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, index: number): void {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home" ? 0 : event.key === "End" ? 1 : event.key === "ArrowRight" ? (index + 1) % 2 : (index + 1) % 2;
    const nextMode: AddMode = nextIndex === 0 ? "catalog" : "manual";
    switchTab(nextMode);
    tabRefs.current[nextIndex]?.focus();
  }

  async function handlePhoto(file: File | undefined): Promise<void> {
    if (!file) return;
    const result = await readLocalPhoto(file);
    if (result.error) return onMessage(result.error);
    setPhotoDataUrl(result.dataUrl);
    onMessage("Фотография готова к сохранению.");
  }

  return (
    <div className={styles.experience}>
      <CollectionSubnavigation active="add" demoScenario={demoScenario} />
      <header className={styles.addHeader}>
        <nav className={styles.breadcrumb}><Link href={collectionHref(demoScenario)}>Коллекция</Link><span>/</span>Добавить часы</nav>
        <p className={styles.eyebrow}>Новая запись</p>
        <h1>Добавить часы</h1>
        <p>Начните с каталога. Если нужной модели нет, создайте личную запись вручную.</p>
      </header>
      <div className={styles.tabs} role="tablist" aria-label="Способ добавления часов">
        {(["catalog", "manual"] as const).map((value, index) => (
          <button
            key={value}
            ref={(node) => { tabRefs.current[index] = node; }}
            type="button"
            role="tab"
            id={`add-tab-${value}`}
            aria-selected={mode === value}
            aria-controls={`add-panel-${value}`}
            tabIndex={mode === value ? 0 : -1}
            onClick={() => switchTab(value)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
          >
            {value === "catalog" ? "Выбрать из каталога" : "Добавить вручную"}
          </button>
        ))}
      </div>
      {mode === "manual" ? (
        <section id="add-panel-manual" role="tabpanel" aria-labelledby="add-tab-manual" className={styles.addLayout}>
          <aside className={styles.addPreview}>
            <CollectionWatchStage
              className={styles.previewStage}
              variant="preview"
              imageUrl={photoDataUrl}
              alt={displayName || "Предпросмотр часов"}
            />
            <p className={styles.eyebrow}>Предпросмотр</p>
            <h2>{displayName || "Название ваших часов"}</h2>
            <p>{brandName || "Бренд или «Без бренда»"}</p>
            <div className={styles.previewTraits}>
              <span>{roleLabel(role)}</span>
              {movement !== "unknown" ? <span>{optionLabel(movementOptions, movement)}</span> : null}
            </div>
          </aside>
          <form
            className={styles.form}
            action={(formData) => onManualSubmit(formData, photoDataUrl)}
            noValidate
          >
            <p className={styles.manualIntro}>
              Для начала достаточно названия и основной роли. Характеристики можно заполнить позже —
              они сделают рекомендации точнее.
            </p>
            <FormSection title="Основное">
              <Field label="Название" wide>
                <input name="displayName" required maxLength={160} value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
              </Field>
              <Field label="Бренд">
                <input name="brandName" maxLength={120} value={brandName} onChange={(event) => setBrandName(event.target.value)} />
              </Field>
              <label className={styles.checkField}><input name="withoutBrand" type="checkbox" />Без бренда</label>
              <Field label="Модель"><input name="modelName" maxLength={160} /></Field>
              <Field label="Артикул"><input name="referenceDisplay" maxLength={120} /></Field>
              <Field label="Основная роль">
                <select name="role" value={role} onChange={(event) => setRole(event.target.value as CollectionRole)}>
                  {roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>
              <fieldset className={styles.fieldset}>
                <legend>Дополнительные роли</legend>
                <div className={styles.checkGrid}>
                  {roleOptions.filter((option) => option.value !== role).map((option) => (
                    <label key={option.value}><input name={`additional-role-${option.value}`} type="checkbox" />{option.label}</label>
                  ))}
                </div>
              </fieldset>
            </FormSection>
            <FormSection title="Характеристики — необязательно" collapsible>
              <SelectField label="Механизм" name="movementType" value={movement} options={movementOptions} onChange={(value) => setMovement(value)} />
              <SelectField label="Размер" name="sizeBand" defaultValue="unknown" options={sizeOptions} />
              <SelectField label="Цвет циферблата" name="dialColorFamily" defaultValue="unknown" options={dialOptions} />
              <SelectField label="Ремень или браслет" name="attachmentType" defaultValue="unknown" options={attachmentOptions} />
            </FormSection>
            <FormSection title="Владение — необязательно" collapsible>
              <Field label="Статус">
                <select name="ownershipStatus" defaultValue="owned"><option value="owned">В коллекции</option><option value="previously_owned">Ранее в коллекции</option></select>
              </Field>
              <Field label="Дата покупки"><input name="acquiredAt" type="date" /></Field>
              <Field label="Цена покупки"><input name="acquisitionPrice" inputMode="decimal" /></Field>
              <Field label="Валюта">
                <select name="acquisitionCurrencyCode" defaultValue="RUB">
                  {(["RUB", "CNY", "USD", "EUR", "JPY"] satisfies LocalCurrencyCode[]).map((currency) => <option key={currency}>{currency}</option>)}
                </select>
              </Field>
              <SelectField label="Состояние" name="condition" defaultValue="unknown" options={conditionOptions} />
              <SelectField label="Частота ношения" name="wearFrequency" defaultValue="unknown" options={frequencyOptions} />
              <Field label="Источник приобретения" wide><input name="acquisitionSource" maxLength={240} /></Field>
            </FormSection>
            <FormSection title="Личное — необязательно" collapsible>
              <Field label="Заметка" wide><textarea name="personalNote" rows={4} maxLength={5000} /></Field>
              <div className={styles.uploadField}>
                <input
                  id="collection-watch-photo"
                  className={styles.uploadInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  aria-describedby="collection-watch-photo-hint"
                  onChange={(event) => void handlePhoto(event.target.files?.[0])}
                />
                <label htmlFor="collection-watch-photo" className={styles.uploadArea}>
                  <span aria-hidden="true">+</span>
                  <strong>{photoDataUrl ? "Заменить фотографию" : "Добавить фотографию"}</strong>
                  <small id="collection-watch-photo-hint">JPEG, PNG или WebP · до 1 МБ</small>
                </label>
                {photoDataUrl ? (
                  <button
                    type="button"
                    className={styles.removePhotoAction}
                    onClick={() => {
                      setPhotoDataUrl(null);
                      onMessage("Фотография удалена.");
                    }}
                  >
                    Удалить изображение
                  </button>
                ) : null}
              </div>
            </FormSection>
            <div className={styles.formActions}>
              <Button type="submit">Сохранить часы</Button>
              <Link href={collectionHref(demoScenario)} className={styles.textAction}>Отмена</Link>
            </div>
          </form>
        </section>
      ) : (
        <section id="add-panel-catalog" role="tabpanel" aria-labelledby="add-tab-catalog" className={styles.catalogPanel}>
          <div className={styles.catalogTools}>
            <Field label="Поиск по модели или артикулу">
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPickerPage(1);
                }}
              />
            </Field>
            <Field label="Бренд">
              <select value={brand} onChange={(event) => {
                setBrand(event.target.value);
                setPickerPage(1);
              }}>
                <option value="all">Все бренды</option>
                {brands.map((entry) => <option key={entry}>{entry}</option>)}
              </select>
            </Field>
            <Field label="Механизм">
              <select value={pickerMovement} onChange={(event) => {
                setPickerMovement(event.target.value as "all" | CollectionMovementType);
                setPickerPage(1);
              }}>
                <option value="all">Все механизмы</option>
                {movementOptions
                  .filter((option) => option.value !== "unknown")
                  .map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            <Field label="Сортировка">
              <select value={pickerSort} onChange={(event) => {
                setPickerSort(event.target.value as LocalCollectionPickerSort);
                setPickerPage(1);
              }}>
                <option value="quality">Сначала лучшие данные</option>
                <option value="name">По названию</option>
                <option value="price_asc">Сначала доступнее</option>
                <option value="price_desc">Сначала дороже</option>
              </select>
            </Field>
            <span className={styles.pickerCount}>
              Показаны {catalogPage.from}–{catalogPage.to} из {catalogPage.total}
            </span>
          </div>
          <div className={styles.catalogResults}>
            {catalogPage.items.map((candidate) => (
              <article key={candidate.catalogReferenceId} className={styles.catalogResult}>
                <Link href={candidate.href} className={styles.catalogResultMedia}>
                  <CollectionWatchStage
                    variant="picker"
                    className={styles.catalogResultStage}
                    imageUrl={candidate.imageUrl}
                    imageCandidates={candidate.imageCandidates}
                    alt={candidate.displayName}
                    presentation={collectionCandidateMediaPresentation(candidate)}
                  />
                </Link>
                <div className={styles.catalogResultCopy}>
                  <span>{candidate.brandName}</span>
                  <h2>{candidate.displayName}</h2>
                  <p>{candidate.referenceDisplay}</p>
                  <strong>{formatMoney(candidate.publicPriceMinor, candidate.currencyCode) ?? "Цена не указана"}</strong>
                  <div className={styles.catalogTraits}>
                    {candidate.movementType !== "unknown" ? <span>{optionLabel(movementOptions, candidate.movementType)}</span> : null}
                    {candidate.attachmentType !== "unknown" ? <span>{optionLabel(attachmentOptions, candidate.attachmentType)}</span> : null}
                  </div>
                </div>
                <Button type="button" variant="secondary" onClick={() => onCatalogAdd(candidate.catalogReferenceId)}>Добавить</Button>
              </article>
            ))}
          </div>
          {catalogPage.total === 0 ? <p className={styles.noMatch}>По этому запросу моделей не найдено.</p> : null}
          {catalogPage.total > 0 ? (
            <nav className={styles.pickerPagination} aria-label="Страницы каталога">
              <button
                type="button"
                disabled={catalogPage.page === 1}
                onClick={() => setPickerPage((page) => Math.max(1, page - 1))}
              >
                Назад
              </button>
              <span>{catalogPage.page} / {catalogPage.pageCount}</span>
              <button
                type="button"
                disabled={catalogPage.page === catalogPage.pageCount}
                onClick={() => setPickerPage((page) => Math.min(catalogPage.pageCount, page + 1))}
              >
                Вперед
              </button>
            </nav>
          ) : null}
          <p className={styles.catalogManualHint}>
            Не нашли модель?
            <button type="button" onClick={() => switchTab("manual")}>Добавьте часы вручную</button>
          </p>
        </section>
      )}
      <p className={styles.serviceText} aria-live="polite">{message}</p>
    </div>
  );
}

function CollectionDetail({
  ready,
  watch,
  catalogCandidates,
  demoScenario,
  message,
  onSubmit,
  onPhoto,
  onArchive,
  onDelete,
}: Readonly<{
  ready: boolean;
  watch: LocalCollectionWatch | null;
  catalogCandidates: CollectionRecommendationCandidate[];
  demoScenario: LocalCollectionDemoScenario | null;
  message: string;
  onSubmit: (formData: FormData) => void;
  onPhoto: (file: File) => Promise<void>;
  onArchive: () => void;
  onDelete: () => void;
}>) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteReturnFocus, setDeleteReturnFocus] = useState<HTMLElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTarget, setEditTarget] = useState<"edit-watch" | "watch-status">("edit-watch");

  useEffect(() => {
    const hash = window.location.hash;
    if (hash !== "#edit-watch" && hash !== "#watch-status") return;
    const timer = window.setTimeout(() => {
      setEditTarget(hash.slice(1) as "edit-watch" | "watch-status");
      setEditing(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!editing) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(editTarget);
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (editTarget === "watch-status" && target instanceof HTMLSelectElement) target.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [editing, editTarget]);

  const openEditor = (target: "edit-watch" | "watch-status" = "edit-watch") => {
    setEditTarget(target);
    setEditing(true);
  };

  if (!ready && !watch) return <div className={styles.loading}>Загружаем личную запись…</div>;
  if (!watch) {
    return (
      <section className={styles.notFound}>
        <p className={styles.eyebrow}>Запись не найдена</p>
        <h1>Этих часов нет в локальной коллекции</h1>
        <Link href={collectionHref(demoScenario)} className={styles.primaryAction}>Вернуться в коллекцию</Link>
      </section>
    );
  }

  const knownTraits = [
    watch.movementType !== "unknown"
      ? { label: "Механизм", value: optionLabel(movementOptions, watch.movementType) }
      : null,
    watch.sizeBand !== "unknown"
      ? { label: "Размер корпуса", value: optionLabel(sizeOptions, watch.sizeBand) }
      : null,
    watch.dialColorFamily !== "unknown"
      ? { label: "Цвет циферблата", value: optionLabel(dialOptions, watch.dialColorFamily) }
      : null,
    watch.attachmentType !== "unknown"
      ? { label: "Браслет или ремень", value: optionLabel(attachmentOptions, watch.attachmentType) }
      : null,
  ].filter((trait): trait is { label: string; value: string } => trait !== null);
  const contribution = [
    ...watch.roles.map((role) => `Подходит для сценария «${roleLabel(role)}»`),
    watch.movementType === "automatic" || watch.movementType === "manual" ? "Механический принцип работы" : null,
    watch.wearFrequency === "daily" ? "Подходит для частого ношения" : null,
    watch.dialColorFamily !== "unknown" ? `Циферблат: ${optionLabel(dialOptions, watch.dialColorFamily).toLocaleLowerCase("ru")}` : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <div className={styles.experience}>
      <CollectionSubnavigation active="watches" demoScenario={demoScenario} />
      <nav className={styles.breadcrumb}><Link href={collectionHref(demoScenario)}>Коллекция</Link><span>/</span>{watch.displayName}</nav>
      <section className={styles.detailHero}>
        <CollectionWatchStage
          className={styles.detailStage}
          variant="detail"
          imageUrl={effectiveImage(watch)}
          imageCandidates={collectionCandidateImagesForWatch(watch, catalogCandidates)}
          alt={watch.displayName}
          presentation={collectionWatchMediaPresentation(watch)}
        />
        <div className={styles.detailCopy}>
          <p className={styles.eyebrow}>{watch.sourceKind === "catalog" ? "Из каталога" : "Личная запись"}</p>
          <h1>{watch.displayName}</h1>
          {watch.brandName || watch.modelName ? <p>{[watch.brandName, watch.modelName].filter(Boolean).join(" · ")}</p> : null}
          {watch.referenceDisplay ? <span className={styles.reference}>Артикул {watch.referenceDisplay}</span> : null}
          <div className={styles.detailRoles}>{watch.roles.map((role) => <span key={role}>{roleLabel(role)}</span>)}</div>
          <dl className={styles.detailFacts}>
            <div><dt>Статус</dt><dd>{watch.ownershipStatus === "owned" ? "В коллекции" : "Ранее в коллекции"}</dd></div>
            {knownTraits.map((trait) => <div key={trait.label}><dt>{trait.label}</dt><dd>{trait.value}</dd></div>)}
            {watch.wearFrequency !== "unknown" ? <div><dt>Ношение</dt><dd>{optionLabel(frequencyOptions, watch.wearFrequency)}</dd></div> : null}
            {watch.condition !== "unknown" ? <div><dt>Состояние</dt><dd>{optionLabel(conditionOptions, watch.condition)}</dd></div> : null}
            {watch.acquiredAt ? <div><dt>Дата покупки</dt><dd>{watch.acquiredAt}</dd></div> : null}
            {watch.acquisitionPriceMinor !== null ? <div><dt>Цена покупки</dt><dd>{formatMoney(watch.acquisitionPriceMinor, watch.acquisitionCurrencyCode)}</dd></div> : null}
          </dl>
          {watch.personalNote ? <blockquote>{watch.personalNote}</blockquote> : null}
          <div className={styles.actions}>
            {watch.catalogHref ? (
              <Link href={watch.catalogHref} className={styles.primaryAction}>Открыть модель</Link>
            ) : null}
            <button
              type="button"
              className={watch.catalogHref ? styles.secondaryAction : styles.primaryAction}
              onClick={() => openEditor()}
            >
              Редактировать
            </button>
          </div>
        </div>
      </section>

      <section className={styles.detailManagement} aria-labelledby="watch-actions-title">
        <div>
          <p className={styles.eyebrow}>Управление записью</p>
          <h2 id="watch-actions-title">Статус записи</h2>
        </div>
        <div className={styles.detailManagementActions}>
          <button type="button" className={styles.secondaryAction} onClick={() => openEditor("watch-status")}>
            Изменить статус
          </button>
          {watch.ownershipStatus === "owned" ? (
            <Button type="button" variant="secondary" onClick={onArchive}>Перенести в историю</Button>
          ) : null}
          <button
            type="button"
            className={styles.destructiveSecondaryAction}
            onClick={(event) => {
              setDeleteReturnFocus(event.currentTarget);
              setConfirmDelete(true);
            }}
          >
            Удалить из коллекции
          </button>
        </div>
      </section>

      <section className={styles.contributionSection}>
        <div>
          <p className={styles.eyebrow}>Роль в вашей коллекции</p>
          <h2>Что меняют эти часы</h2>
        </div>
        <ul>{contribution.map((entry) => <li key={entry}>{entry}</li>)}</ul>
      </section>

      {editing ? (
        <section id="edit-watch" className={styles.editSection}>
          <div className={styles.editIntro}>
            <p className={styles.eyebrow}>Личные данные</p>
            <h2>Уточнить запись</h2>
            <p>Неуказанные характеристики остаются неизвестными и не влияют на оценку коллекции.</p>
            <label className={styles.photoButton}>
              Добавить личную фотографию
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void onPhoto(file);
              }} />
            </label>
          </div>
          <form
            action={(formData) => {
              onSubmit(formData);
              setEditing(false);
            }}
            className={styles.form}
          >
            <FormSection title="Основное">
              <Field label="Название" wide><input name="displayName" defaultValue={watch.displayName} required /></Field>
              <Field label="Бренд"><input name="brandName" defaultValue={watch.brandName ?? ""} /></Field>
              <Field label="Модель"><input name="modelName" defaultValue={watch.modelName ?? ""} /></Field>
              <Field label="Артикул"><input name="referenceDisplay" defaultValue={watch.referenceDisplay ?? ""} /></Field>
              <Field label="Статус">
                <select id="watch-status" name="ownershipStatus" defaultValue={watch.ownershipStatus}><option value="owned">В коллекции</option><option value="previously_owned">Ранее в коллекции</option></select>
              </Field>
              <fieldset className={styles.fieldset}>
                <legend>Роли</legend>
                <div className={styles.checkGrid}>{roleOptions.map((option) => <label key={option.value}><input name={`role-${option.value}`} type="checkbox" defaultChecked={watch.roles.includes(option.value)} />{option.label}</label>)}</div>
              </fieldset>
            </FormSection>
            <FormSection title="Характеристики">
              <SelectField label="Механизм" name="movementType" defaultValue={watch.movementType} options={movementOptions} />
              <SelectField label="Размер" name="sizeBand" defaultValue={watch.sizeBand} options={sizeOptions} />
              <SelectField label="Цвет" name="dialColorFamily" defaultValue={watch.dialColorFamily} options={dialOptions} />
              <SelectField label="Материал" name="materialFamily" defaultValue={watch.materialFamily} options={materialOptions} />
              <SelectField label="Ремень / браслет" name="attachmentType" defaultValue={watch.attachmentType} options={attachmentOptions} />
              <SelectField label="Ношение" name="wearFrequency" defaultValue={watch.wearFrequency} options={frequencyOptions} />
              <SelectField label="Состояние" name="condition" defaultValue={watch.condition} options={conditionOptions} />
              <Field label="Подходят для воды">
                <select name="waterReady" defaultValue={watch.waterReady === null ? "unknown" : String(watch.waterReady)}>
                  <option value="unknown">Не указано</option><option value="true">Да</option><option value="false">Нет</option>
                </select>
              </Field>
            </FormSection>
            <FormSection title="Владение и заметки">
              <Field label="Дата покупки"><input name="acquiredAt" type="date" defaultValue={watch.acquiredAt ?? ""} /></Field>
              <Field label="Цена покупки"><input name="acquisitionPrice" inputMode="decimal" defaultValue={watch.acquisitionPriceMinor === null ? "" : String(watch.acquisitionPriceMinor / 100)} /></Field>
              <Field label="Валюта">
                <select name="acquisitionCurrencyCode" defaultValue={watch.acquisitionCurrencyCode ?? "RUB"}>
                  {(["RUB", "CNY", "USD", "EUR", "JPY"] satisfies LocalCurrencyCode[]).map((currency) => <option key={currency}>{currency}</option>)}
                </select>
              </Field>
              <Field label="Источник"><input name="acquisitionSource" defaultValue={watch.acquisitionSource ?? ""} /></Field>
              <Field label="Личная заметка" wide><textarea name="personalNote" rows={4} defaultValue={watch.personalNote ?? ""} /></Field>
            </FormSection>
            <div className={styles.formActions}>
              <Button type="submit">Сохранить изменения</Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(false)}>Отмена</Button>
            </div>
          </form>
        </section>
      ) : null}
      <DeleteWatchDialog
        watch={confirmDelete ? watch : null}
        returnFocus={deleteReturnFocus}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={onDelete}
      />
      <p className={styles.serviceText} aria-live="polite">{message}</p>
    </div>
  );
}

function FormSection({
  title,
  children,
  collapsible = false,
}: Readonly<{ title: string; children: React.ReactNode; collapsible?: boolean }>) {
  if (collapsible) {
    return (
      <details className={styles.formDisclosure}>
        <summary>{title}</summary>
        <fieldset className={styles.formSection} aria-label={title}>
          <div className={styles.formGrid}>{children}</div>
        </fieldset>
      </details>
    );
  }
  return (
    <fieldset className={styles.formSection}>
      <legend>{title}</legend>
      <div className={styles.formGrid}>{children}</div>
    </fieldset>
  );
}

function Field({
  label,
  wide = false,
  children,
}: Readonly<{ label: string; wide?: boolean; children: React.ReactNode }>) {
  return <label className={`${styles.field} ${wide ? styles.fieldWide : ""}`}><span>{label}</span>{children}</label>;
}

function SelectField<T extends string>({
  label,
  name,
  defaultValue,
  value,
  options,
  onChange,
}: Readonly<{
  label: string;
  name: string;
  defaultValue?: T;
  value?: T;
  options: Array<{ value: T; label: string }>;
  onChange?: (value: T) => void;
}>) {
  return (
    <Field label={label}>
      <select
        name={name}
        defaultValue={value === undefined ? defaultValue : undefined}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value as T) : undefined}
      >
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </Field>
  );
}

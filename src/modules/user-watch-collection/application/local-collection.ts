import type {
  CollectionAnalysisItem,
  CollectionAttachmentType,
  CollectionCondition,
  CollectionCaseStyle,
  CollectionDialColorFamily,
  CollectionDisplayType,
  CollectionMaterialFamily,
  CollectionMovementType,
  CollectionRecommendationCandidate,
  CollectionRole,
  CollectionSizeBand,
  CollectionWearFrequency,
} from "@/modules/collection-intelligence/domain/types";
import type { CatalogWatchDetail } from "@/modules/catalog/domain/read-models";
import { collectionImageCandidateUrls } from "@/modules/user-watch-collection/application/local-collection-images";
import { compareCollectionText } from "@/modules/user-watch-collection/application/local-collection-picker";

export const localCollectionStorageKey = "eternal-time.local-user-watch-collection.v2";
export const localCollectionLegacyStorageKey = "eternal-time.local-user-watch-collection.v1";
export const localCollectionDemoStorageKey = "eternal-time.demo-user-watch-collection.v2";
export const localCollectionLegacyDemoStorageKey = "eternal-time.demo-user-watch-collection.v1";
export const localCollectionNoticeStorageKey = "eternal-time.collection.notice";
export const localCollectionStorageVersion = 2;
export const localCollectionPhotoMaxBytes = 1_000_000;

export type LocalCollectionDemoScenario =
  | "empty"
  | "one"
  | "two"
  | "three"
  | "four"
  | "many"
  | "mixed"
  | "archived";

const localCollectionDemoScenarios: LocalCollectionDemoScenario[] = [
  "empty",
  "one",
  "two",
  "three",
  "four",
  "many",
  "mixed",
  "archived",
];

export function parseLocalCollectionDemoScenario(value: unknown): LocalCollectionDemoScenario | null {
  if (value === "1") return "many";
  return typeof value === "string" && localCollectionDemoScenarios.includes(value as LocalCollectionDemoScenario)
    ? (value as LocalCollectionDemoScenario)
    : null;
}

export function localCollectionDemoStorageKeyFor(scenario: LocalCollectionDemoScenario): string {
  return scenario === "many" ? localCollectionDemoStorageKey : `${localCollectionDemoStorageKey}.${scenario}`;
}

export type LocalCurrencyCode = "RUB" | "CNY" | "USD" | "EUR" | "JPY";

export type LocalCollectionWatch = CollectionAnalysisItem & {
  userTitle: string;
  photoDataUrl: string | null;
  acquisitionSource: string | null;
  acquisitionPriceMinor: number | null;
  acquisitionCurrencyCode: LocalCurrencyCode | null;
  personalNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LocalCollectionInput = {
  displayName: string;
  brandName?: string;
  withoutBrand?: boolean;
  modelName?: string;
  referenceDisplay?: string;
  personalNote?: string;
  role: CollectionRole;
  additionalRoles?: CollectionRole[];
  movementType?: CollectionMovementType;
  sizeBand?: CollectionSizeBand;
  dialColorFamily?: CollectionDialColorFamily;
  attachmentType?: CollectionAttachmentType;
  wearFrequency?: CollectionWearFrequency;
  condition?: CollectionCondition;
  ownershipStatus?: "owned" | "previously_owned";
  acquiredAt?: string;
  acquisitionSource?: string;
  acquisitionPriceMinor?: number | null;
  acquisitionCurrencyCode?: LocalCurrencyCode | null;
  photoDataUrl?: string | null;
};

type LocalCollectionStorageEnvelope = {
  version: 1 | typeof localCollectionStorageVersion;
  watches: LocalCollectionWatch[];
};

const roles: CollectionRole[] = ["daily", "business", "formal", "travel", "sport", "outdoor", "weekend"];
const movements: CollectionMovementType[] = ["automatic", "manual", "quartz", "solar", "smart", "unknown"];
const dialColors: CollectionDialColorFamily[] = [
  "black",
  "blue",
  "white",
  "silver",
  "green",
  "grey",
  "champagne",
  "other",
  "unknown",
];
const materials: CollectionMaterialFamily[] = [
  "steel",
  "titanium",
  "ceramic",
  "resin",
  "leather",
  "rubber",
  "textile",
  "gold",
  "unknown",
];
const sizes: CollectionSizeBand[] = ["small", "medium", "large", "oversized", "unknown"];
const attachments: CollectionAttachmentType[] = [
  "steel_bracelet",
  "leather_strap",
  "rubber_strap",
  "textile_strap",
  "other",
  "unknown",
];
const wearFrequencies: CollectionWearFrequency[] = ["daily", "weekly", "occasionally", "rarely", "unknown"];
const conditions: CollectionCondition[] = ["new", "excellent", "good", "worn", "needs_service", "unknown"];
const currencies: LocalCurrencyCode[] = ["RUB", "CNY", "USD", "EUR", "JPY"];

function isOneOf<T extends string>(value: unknown, values: readonly T[]): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function finiteNonNegativeInteger(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function specificationValue(watch: CatalogWatchDetail, keys: readonly string[]): string | null {
  return (
    keys
      .map((key) => watch.specifications.find((specification) => specification.key === key)?.value)
      .find((value) => value?.trim())?.trim() ?? null
  );
}

function specificationText(watch: CatalogWatchDetail): string {
  return [
    watch.title,
    watch.watchModelName,
    watch.brandCollectionName,
    ...watch.specifications.map((specification) => specification.value),
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("ru");
}

function movementFromWatch(watch: CatalogWatchDetail): CollectionMovementType {
  const value = (
    specificationValue(watch, ["movement_type_raw", "movement_raw", "power_source_raw"]) ?? ""
  ).toLocaleLowerCase("ru");

  if (/автоподзавод|automatic|powermatic/.test(value)) return "automatic";
  if (/ручн|manual/.test(value)) return "manual";
  if (/solar|солнеч|tough solar/.test(value)) return "solar";
  if (/smart|умн/.test(value)) return "smart";
  if (/кварц|quartz|cr\\d{3,4}|sr\\d{3,4}/.test(value)) return "quartz";
  return "unknown";
}

function dialFromWatch(watch: CatalogWatchDetail): CollectionDialColorFamily {
  const value = (specificationValue(watch, ["dial_raw"]) ?? "").toLocaleLowerCase("ru");
  if (/черн|black/.test(value)) return "black";
  if (/син|голуб|blue/.test(value)) return "blue";
  if (/бел|white/.test(value)) return "white";
  if (/сереб|silver/.test(value)) return "silver";
  if (/зел|green/.test(value)) return "green";
  if (/сер|grey|gray/.test(value)) return "grey";
  if (/шампан|champagne/.test(value)) return "champagne";
  return value ? "other" : "unknown";
}

function attachmentFromWatch(watch: CatalogWatchDetail): CollectionAttachmentType {
  const value = (
    specificationValue(watch, ["attachment_material_raw", "strap_material_raw", "bracelet_material_raw"]) ?? ""
  ).toLocaleLowerCase("ru");
  if (/кож|leather/.test(value)) return "leather_strap";
  if (/кауч|резин|rubber|silicon|силикон|polyurethane|полиуретан|resin band/.test(value)) return "rubber_strap";
  if (/ткан|textile|nylon|нейлон/.test(value)) return "textile_strap";
  if (/сталь|steel|браслет/.test(value)) return "steel_bracelet";
  return value ? "other" : "unknown";
}

function materialFromWatch(
  watch: CatalogWatchDetail,
  attachmentType: CollectionAttachmentType,
): CollectionMaterialFamily {
  const value = (
    specificationValue(watch, ["case_material_raw", "attachment_material_raw", "strap_material_raw"]) ?? ""
  ).toLocaleLowerCase("ru");
  if (/титан|titanium/.test(value)) return "titanium";
  if (/керами|ceramic/.test(value)) return "ceramic";
  if (/золот|gold/.test(value)) return "gold";
  if (/сталь|steel/.test(value)) return "steel";
  if (/полимер|пластик|смол|resin/.test(value)) return "resin";
  if (attachmentType === "leather_strap") return "leather";
  if (attachmentType === "rubber_strap") return "rubber";
  if (attachmentType === "textile_strap") return "textile";
  return "unknown";
}

function sizeFromWatch(watch: CatalogWatchDetail): CollectionSizeBand {
  const value = specificationValue(watch, ["case_diameter_raw"]);
  const diameter = value ? Number(value.replace(",", ".").match(/\d+(?:\.\d+)?/)?.[0]) : Number.NaN;
  if (!Number.isFinite(diameter)) return "unknown";
  if (diameter <= 36) return "small";
  if (diameter <= 41) return "medium";
  if (diameter <= 44) return "large";
  return "oversized";
}

function waterReadyFromWatch(watch: CatalogWatchDetail): boolean | null {
  const value = (specificationValue(watch, ["water_resistance_raw"]) ?? "").toLocaleLowerCase("ru");
  if (!value) return null;

  const metres = value.match(/(\d+(?:[.,]\d+)?)\s*(?:м(?:етр(?:ов|а)?)?|m)\b/);
  if (metres) return Number(metres[1]?.replace(",", ".")) >= 100;

  const atmospheres = value.match(/(\d+(?:[.,]\d+)?)\s*(?:atm|bar)/);
  if (atmospheres) return Number(atmospheres[1]?.replace(",", ".")) >= 10;
  return null;
}

function rolesFromWatch(
  watch: CatalogWatchDetail,
  attachmentType: CollectionAttachmentType,
  waterReady: boolean | null,
): CollectionRole[] {
  const text = specificationText(watch);
  const result = new Set<CollectionRole>();

  if (/gmt|world.?time|мировое время|multi time/.test(text)) result.add("travel");
  if (waterReady === true || /g-shock|дайв|diver|seastar|спорт/.test(text)) result.add("sport");
  if (/field|поход|outdoor|pro trek/.test(text)) result.add("outdoor");
  if (
    (attachmentType === "leather_strap" && !result.has("sport")) ||
    /bambino|classic dream|dress|классич/.test(text)
  ) {
    result.add("business");
    result.add("formal");
  }
  if (result.size === 0 || (!result.has("outdoor") && !/oversized/.test(text))) result.add("daily");
  if (result.has("sport") && !result.has("travel")) result.add("weekend");

  return [...result];
}

function displayTypeFromWatch(
  watch: CatalogWatchDetail,
  movementType: CollectionMovementType,
): CollectionDisplayType {
  const text = specificationText(watch);
  if (movementType === "smart") return "smart";
  if (/ana.?digi|analog.?digital|стрелочн.{0,8}цифров|гибрид/.test(text)) return "hybrid";
  if (/digital|цифров|lcd|жк.?дисплей|ae-\d|gbd-h|pro trek/.test(text)) return "digital";
  return "analog";
}

function caseStyleFromWatch(watch: CatalogWatchDetail, displayType: CollectionDisplayType): CollectionCaseStyle {
  const text = specificationText(watch);
  if (/seastar|mako|diver|дайв/.test(text)) return "diver";
  if (/chronograph|хронограф|chrono/.test(text)) return "chronograph";
  if (/field|outdoor|pro trek|поход/.test(text)) return "field";
  if (displayType === "digital" || /g-shock/.test(text)) return "digital_sport";
  if (/prx|edifice|интегрирован/.test(text)) return "integrated_sport";
  if (/bambino|classic dream|dress|классич/.test(text)) return "classic";
  return "other";
}

function candidateCompleteness(input: {
  movementType: CollectionMovementType;
  dialColorFamily: CollectionDialColorFamily;
  materialFamily: CollectionMaterialFamily;
  sizeBand: CollectionSizeBand;
  attachmentType: CollectionAttachmentType;
  waterReady: boolean | null;
}): number {
  const known = [
    input.movementType !== "unknown",
    input.dialColorFamily !== "unknown",
    input.materialFamily !== "unknown",
    input.sizeBand !== "unknown",
    input.attachmentType !== "unknown",
    input.waterReady !== null,
  ].filter(Boolean).length;
  return Number((known / 6).toFixed(2));
}

function familyKey(brandName: string, modelName: string, referenceDisplay: string): string {
  const normalize = (value: string) =>
    value
      .toLocaleLowerCase("ru")
      .normalize("NFKC")
      .replace(/[^a-zа-я0-9]+/g, "");
  const withoutReference = modelName
    .replace(referenceDisplay, " ")
    .replace(brandName, " ")
    .replace(/\s+/g, " ")
    .trim();
  return `${normalize(brandName)}:${normalize(withoutReference || modelName)}`;
}

export function buildLocalCollectionCatalogCandidates(
  watches: CatalogWatchDetail[],
  limit?: number,
): CollectionRecommendationCandidate[] {
  const locallyBackedImageIds = new Set(
    watches
      .filter((watch) => watch.primaryImage.kind === "development_zip")
      .map((watch) => watch.id),
  );
  const candidates = watches
    .map((watch) => {
      const attachmentType = attachmentFromWatch(watch);
      const waterReady = waterReadyFromWatch(watch);
      const movementType = movementFromWatch(watch);
      const dialColorFamily = dialFromWatch(watch);
      const materialFamily = materialFromWatch(watch, attachmentType);
      const sizeBand = sizeFromWatch(watch);
      const displayType = displayTypeFromWatch(watch, movementType);
      const caseStyle = caseStyleFromWatch(watch, displayType);
      const imageCandidates = collectionImageCandidateUrls(watch);
      return {
        catalogReferenceId: watch.id,
        href: watch.href,
        displayName: watch.title,
        modelName: watch.watchModelName,
        familyKey: familyKey(watch.brandName, watch.watchModelName, watch.referenceDisplay),
        brandName: watch.brandName,
        referenceDisplay: watch.referenceDisplay,
        imageUrl: imageCandidates[0] ?? null,
        imageCandidates,
        publicPriceMinor: watch.publicPrice?.amountMinor ?? null,
        currencyCode: watch.publicPrice?.currencyCode ?? null,
        roles: rolesFromWatch(watch, attachmentType, waterReady),
        movementType,
        dialColorFamily,
        materialFamily,
        sizeBand,
        attachmentType,
        displayType,
        caseStyle,
        waterReady,
        dataCompleteness: candidateCompleteness({
          movementType,
          dialColorFamily,
          materialFamily,
          sizeBand,
          attachmentType,
          waterReady,
        }),
      } satisfies CollectionRecommendationCandidate;
    })
    .sort(
      (left, right) =>
        Number(left.imageUrl === null) - Number(right.imageUrl === null) ||
        Number(!locallyBackedImageIds.has(left.catalogReferenceId)) -
          Number(!locallyBackedImageIds.has(right.catalogReferenceId)) ||
        compareCollectionText(left.brandName, right.brandName) ||
        compareCollectionText(left.displayName, right.displayName) ||
        compareCollectionText(left.referenceDisplay, right.referenceDisplay),
    );
  const selected: CollectionRecommendationCandidate[] = [];
  const selectedIds = new Set<string>();

  const addFirst = (predicate: (candidate: CollectionRecommendationCandidate) => boolean): void => {
    const candidate = candidates.find(
      (entry) => !selectedIds.has(entry.catalogReferenceId) && predicate(entry),
    );
    if (candidate) {
      selected.push(candidate);
      selectedIds.add(candidate.catalogReferenceId);
    }
  };

  addFirst((candidate) => candidate.movementType === "automatic" || candidate.movementType === "manual");
  addFirst((candidate) => selected.length === 0 || candidate.brandName !== selected[0]?.brandName);
  addFirst((candidate) => candidate.roles.includes("travel"));
  addFirst((candidate) => candidate.roles.includes("sport"));
  addFirst((candidate) => candidate.roles.includes("business") || candidate.roles.includes("formal"));

  const remainingByBrand = new Map<string, CollectionRecommendationCandidate[]>();
  for (const candidate of candidates) {
    if (selectedIds.has(candidate.catalogReferenceId)) continue;
    const group = remainingByBrand.get(candidate.brandName) ?? [];
    group.push(candidate);
    remainingByBrand.set(candidate.brandName, group);
  }

  const brandNames = [...remainingByBrand.keys()].sort(compareCollectionText);
  const requestedLimit = Math.max(
    0,
    Math.min(limit === undefined ? candidates.length : Math.trunc(limit), candidates.length),
  );
  let brandIndex = 0;
  while (selected.length < requestedLimit && remainingByBrand.size > 0) {
    const brandName = brandNames[brandIndex % brandNames.length];
    brandIndex += 1;
    if (!brandName) break;
    const group = remainingByBrand.get(brandName);
    if (!group) continue;
    const candidate = group.shift();
    if (candidate) {
      selected.push(candidate);
      selectedIds.add(candidate.catalogReferenceId);
    }
    if (group.length === 0) remainingByBrand.delete(brandName);
  }

  return selected.slice(0, requestedLimit);
}

function catalogWatchFromCandidate(
  candidate: CollectionRecommendationCandidate,
  now: string,
): LocalCollectionWatch {
  return {
    id: `local-catalog-${candidate.catalogReferenceId.replace(/[^a-z0-9]+/gi, "-")}`,
    displayName: candidate.displayName,
    userTitle: candidate.displayName,
    sourceKind: "catalog",
    ownershipStatus: "owned",
    catalogReferenceId: candidate.catalogReferenceId,
    catalogHref: candidate.href,
    brandName: candidate.brandName,
    modelName: candidate.displayName,
    referenceDisplay: candidate.referenceDisplay,
    imageUrl: candidate.imageUrl,
    photoDataUrl: null,
    acquiredAt: null,
    acquisitionSource: "Каталог Eternal Time",
    acquisitionPriceMinor: null,
    acquisitionCurrencyCode: null,
    personalNote: null,
    roles: candidate.roles,
    movementType: candidate.movementType,
    dialColorFamily: candidate.dialColorFamily,
    materialFamily: candidate.materialFamily,
    sizeBand: candidate.sizeBand,
    attachmentType: candidate.attachmentType,
    wearFrequency: "weekly",
    condition: "excellent",
    waterReady: candidate.waterReady,
    createdAt: now,
    updatedAt: now,
  };
}

export function createEmptyLocalCollection(): LocalCollectionWatch[] {
  return [];
}

export function createDemoLocalCollection(
  candidates: CollectionRecommendationCandidate[] = [],
  now = "2026-07-24T00:00:00.000Z",
  scenario: LocalCollectionDemoScenario = "many",
): LocalCollectionWatch[] {
  const catalogWatches = candidates.slice(0, 4).map((candidate) => catalogWatchFromCandidate(candidate, now));
  const manualWatch: LocalCollectionWatch = {
      id: "local-demo-manual-001",
      displayName: "Семейные часы",
      userTitle: "Семейные часы",
      sourceKind: "manual",
      ownershipStatus: "owned",
      catalogReferenceId: null,
      catalogHref: null,
      brandName: null,
      modelName: null,
      referenceDisplay: null,
      imageUrl: null,
      photoDataUrl: null,
      acquiredAt: "2021-10-20",
      acquisitionSource: "Семейная коллекция",
      acquisitionPriceMinor: null,
      acquisitionCurrencyCode: null,
      personalNote: "Часы вне публичного каталога. В анализе используются только заполненные признаки.",
      roles: ["formal"],
      movementType: "manual",
      dialColorFamily: "silver",
      materialFamily: "leather",
      sizeBand: "small",
      attachmentType: "leather_strap",
      wearFrequency: "occasionally",
      condition: "worn",
      waterReady: null,
      createdAt: now,
      updatedAt: now,
    };
  const archivedWatch: LocalCollectionWatch = {
      id: "local-demo-archive-001",
      displayName: "Архивный хронограф",
      userTitle: "Архивный хронограф",
      sourceKind: "manual",
      ownershipStatus: "previously_owned",
      catalogReferenceId: null,
      catalogHref: null,
      brandName: "Без бренда",
      modelName: "Хронограф",
      referenceDisplay: null,
      imageUrl: null,
      photoDataUrl: null,
      acquiredAt: "2019-04-18",
      acquisitionSource: null,
      acquisitionPriceMinor: null,
      acquisitionCurrencyCode: null,
      personalNote: "Архивная запись видна в истории, но исключена из текущего анализа.",
      roles: ["sport"],
      movementType: "quartz",
      dialColorFamily: "black",
      materialFamily: "steel",
      sizeBand: "large",
      attachmentType: "steel_bracelet",
      wearFrequency: "rarely",
      condition: "good",
      waterReady: false,
      createdAt: now,
      updatedAt: now,
    };

  if (scenario === "empty") return [];
  if (scenario === "one") return [catalogWatches[0] ?? manualWatch];
  if (scenario === "two") return catalogWatches.length >= 2
    ? catalogWatches.slice(0, 2)
    : [catalogWatches[0], manualWatch].filter((watch): watch is LocalCollectionWatch => Boolean(watch));
  if (scenario === "three") {
    return [...catalogWatches.slice(0, 2), manualWatch].slice(0, 3);
  }
  if (scenario === "four") {
    return catalogWatches.length >= 4
      ? catalogWatches.slice(0, 4)
      : [...catalogWatches, manualWatch].slice(0, 4);
  }
  if (scenario === "mixed") return [...catalogWatches.slice(0, 2), manualWatch, archivedWatch];
  if (scenario === "archived") return [catalogWatches[0] ?? manualWatch, archivedWatch];
  return [...catalogWatches, manualWatch, archivedWatch];
}

function normalizeIdPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
}

export function createLocalManualWatch(
  input: LocalCollectionInput,
  now = new Date().toISOString(),
): LocalCollectionWatch {
  const displayName = input.displayName.trim();
  const idSuffix = normalizeIdPart(displayName) || "watch";

  return {
    id: `local-${idSuffix}-${Date.now().toString(36)}`,
    displayName,
    userTitle: displayName,
    sourceKind: "manual",
    ownershipStatus: input.ownershipStatus ?? "owned",
    catalogReferenceId: null,
    catalogHref: null,
    brandName: input.withoutBrand ? null : textOrNull(input.brandName),
    modelName: textOrNull(input.modelName),
    referenceDisplay: textOrNull(input.referenceDisplay),
    imageUrl: null,
    photoDataUrl:
      typeof input.photoDataUrl === "string" && input.photoDataUrl.startsWith("data:image/")
        ? input.photoDataUrl
        : null,
    acquiredAt: textOrNull(input.acquiredAt),
    acquisitionSource: textOrNull(input.acquisitionSource),
    acquisitionPriceMinor: input.acquisitionPriceMinor ?? null,
    acquisitionCurrencyCode:
      typeof input.acquisitionPriceMinor === "number" ? input.acquisitionCurrencyCode ?? null : null,
    personalNote: textOrNull(input.personalNote),
    roles: [...new Set([input.role, ...(input.additionalRoles ?? [])])],
    movementType: input.movementType ?? "unknown",
    dialColorFamily: input.dialColorFamily ?? "unknown",
    materialFamily: "unknown",
    sizeBand: input.sizeBand ?? "unknown",
    attachmentType: input.attachmentType ?? "unknown",
    wearFrequency: input.wearFrequency ?? "unknown",
    condition: input.condition ?? "unknown",
    waterReady: null,
    createdAt: now,
    updatedAt: now,
  };
}

export function createLocalCatalogWatch(
  candidate: CollectionRecommendationCandidate,
  now = new Date().toISOString(),
): LocalCollectionWatch {
  return {
    ...catalogWatchFromCandidate(candidate, now),
    id: `local-catalog-${candidate.catalogReferenceId.replace(/[^a-z0-9]+/gi, "-")}-${Date.now().toString(36)}`,
  };
}

function normalizeStoredWatch(value: unknown): LocalCollectionWatch | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<LocalCollectionWatch>;
  if (
    typeof record.id !== "string" ||
    typeof record.displayName !== "string" ||
    !record.displayName.trim() ||
    (record.sourceKind !== "manual" && record.sourceKind !== "catalog") ||
    (record.ownershipStatus !== "owned" && record.ownershipStatus !== "previously_owned")
  ) {
    return null;
  }

  const normalizedRoles = Array.isArray(record.roles)
    ? record.roles.filter((role): role is CollectionRole => isOneOf(role, roles))
    : [];

  return {
    id: record.id,
    displayName: record.displayName.trim(),
    userTitle: textOrNull(record.userTitle) ?? record.displayName.trim(),
    sourceKind: record.sourceKind,
    ownershipStatus: record.ownershipStatus,
    catalogReferenceId: textOrNull(record.catalogReferenceId),
    catalogHref: textOrNull(record.catalogHref),
    brandName: textOrNull(record.brandName),
    modelName: textOrNull(record.modelName),
    referenceDisplay: textOrNull(record.referenceDisplay),
    imageUrl: textOrNull(record.imageUrl),
    photoDataUrl:
      typeof record.photoDataUrl === "string" && record.photoDataUrl.startsWith("data:image/")
        ? record.photoDataUrl
        : null,
    acquiredAt: textOrNull(record.acquiredAt),
    acquisitionSource: textOrNull(record.acquisitionSource),
    acquisitionPriceMinor: finiteNonNegativeInteger(record.acquisitionPriceMinor),
    acquisitionCurrencyCode: isOneOf(record.acquisitionCurrencyCode, currencies)
      ? record.acquisitionCurrencyCode
      : null,
    personalNote: textOrNull(record.personalNote),
    roles: [...new Set(normalizedRoles)],
    movementType: isOneOf(record.movementType, movements) ? record.movementType : "unknown",
    dialColorFamily: isOneOf(record.dialColorFamily, dialColors) ? record.dialColorFamily : "unknown",
    materialFamily: isOneOf(record.materialFamily, materials) ? record.materialFamily : "unknown",
    sizeBand: isOneOf(record.sizeBand, sizes) ? record.sizeBand : "unknown",
    attachmentType: isOneOf(record.attachmentType, attachments) ? record.attachmentType : "unknown",
    wearFrequency: isOneOf(record.wearFrequency, wearFrequencies) ? record.wearFrequency : "unknown",
    condition: isOneOf(record.condition, conditions) ? record.condition : "unknown",
    waterReady: nullableBoolean(record.waterReady),
    createdAt: textOrNull(record.createdAt) ?? new Date(0).toISOString(),
    updatedAt: textOrNull(record.updatedAt) ?? textOrNull(record.createdAt) ?? new Date(0).toISOString(),
  };
}

export function serializeLocalCollection(watches: LocalCollectionWatch[]): string {
  const envelope: LocalCollectionStorageEnvelope = {
    version: localCollectionStorageVersion,
    watches,
  };
  return JSON.stringify(envelope);
}

export function parseLocalCollection(raw: string | null): LocalCollectionWatch[] | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    const values = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === "object" &&
          ((parsed as Partial<LocalCollectionStorageEnvelope>).version === 1 ||
            (parsed as Partial<LocalCollectionStorageEnvelope>).version === localCollectionStorageVersion) &&
          Array.isArray((parsed as Partial<LocalCollectionStorageEnvelope>).watches)
        ? (parsed as LocalCollectionStorageEnvelope).watches
        : null;

    if (!values) return null;
    const watches = values.map(normalizeStoredWatch).filter((watch): watch is LocalCollectionWatch => watch !== null);
    return watches.length === values.length ? watches : null;
  } catch {
    return null;
  }
}

export function validateLocalPhotoMetadata(input: {
  type: string;
  size: number;
}): { valid: true } | { valid: false; message: string } {
  if (!["image/jpeg", "image/png", "image/webp"].includes(input.type)) {
    return { valid: false, message: "Используйте JPEG, PNG или WebP." };
  }
  if (!Number.isFinite(input.size) || input.size <= 0) {
    return { valid: false, message: "Не удалось прочитать выбранное изображение." };
  }
  if (input.size > localCollectionPhotoMaxBytes) {
    return { valid: false, message: "Файл должен быть не больше 1 МБ." };
  }
  return { valid: true };
}

export function updateLocalCollectionWatch(
  watches: LocalCollectionWatch[],
  id: string,
  update: (watch: LocalCollectionWatch) => LocalCollectionWatch,
): LocalCollectionWatch[] {
  return watches.map((watch) => (watch.id === id ? update(watch) : watch));
}

export function archiveLocalCollectionWatch(
  watches: LocalCollectionWatch[],
  id: string,
  now = new Date().toISOString(),
): LocalCollectionWatch[] {
  return updateLocalCollectionWatch(watches, id, (watch) => ({
    ...watch,
    ownershipStatus: "previously_owned",
    updatedAt: now,
  }));
}

export function deleteLocalCollectionWatch(
  watches: LocalCollectionWatch[],
  id: string,
): LocalCollectionWatch[] {
  return watches.filter((watch) => watch.id !== id);
}

export function parseLocalPriceToMinor(value: string): number | null {
  const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
  if (!normalized) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

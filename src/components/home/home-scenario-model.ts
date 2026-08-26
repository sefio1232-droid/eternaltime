import { formatCatalogMoney } from "@/modules/catalog/application/catalog-format";
import { homepageWatchAssetDimensions, homepageWatchVisualConfigByReference } from "@/components/home/home-premium-assets";
import type { CatalogReadDataset, CatalogWatchDetail } from "@/modules/catalog/domain/read-models";

export type HomeScenarioId = "everyday" | "shirt" | "travel" | "first-mechanical" | "sport" | "next-collection";
export type HomeScenarioIndex = 0 | 1 | 2 | 3 | 4 | 5;
export type HomeScenarioPosition = 0 | 1 | 2 | 3;

export type HomeHeroSlotRole = "centralMain" | "alternativeLeft" | "alternativeRight" | "alternativeRear";
export type HomeHeroQualityClass = "HERO_GRADE" | "ALTERNATIVE_GRADE" | "FRAME_ONLY" | "REJECTED";
export type HomeHeroMotionMode = "STATIC_FRONT" | "PARALLAX_ONLY" | "ORBIT_FRAME_SET";
export type HomeHeroAssetView = "front" | "three-quarter" | "side" | "back" | "unknown";

export type HomeHeroAsset = {
  path: string;
  src: string;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  qualityClass: HomeHeroQualityClass;
  motionMode: HomeHeroMotionMode;
  framePaths: string[];
  frameCount: number;
  source:
    | "final_user_zip"
    | "catalog_candidate_asset"
    | "premium_candidate_asset"
    | "homepage_premium_asset"
    | "homepage_editorial_asset";
  sourceNote: string;
  isExactReference: boolean;
  view: HomeHeroAssetView;
  isHeroApproved: boolean;
  rejectionReason?: string;
};

export type HomeScenarioWatch = {
  id: string;
  href: string;
  brandName: string;
  title: string;
  shortTitle: string;
  reference: string;
  referenceSlug: string;
  priceLabel: string | null;
  catalogMatched: boolean;
  slotRole: HomeHeroSlotRole;
  asset: HomeHeroAsset;
  specs: string[];
  displayScale: number;
  displayX: number;
  displayY: number;
  depth: number;
  opacity: number;
  isVisualFallbackFor?: string;
};

export function getHomeWatchHref(watch: Pick<HomeScenarioWatch, "href"> | Pick<OrbitWatch, "href">): string | null {
  return watch.href.startsWith("/watches/") ? watch.href : null;
}

export type HomeScenarioHero = {
  mainWatch: HomeScenarioWatch;
  secondaryWatch: HomeScenarioWatch | null;
  slots: HomeScenarioWatch[];
  backgroundWord: string;
  accentWord: string;
  sceneDescription: string;
  reviewNote: string;
};

export type HomeScenario = {
  id: HomeScenarioId;
  index: string;
  title: string;
  railTitle: string;
  eyebrow: string;
  description: string;
  criteria: string[];
  catalogHref: string;
  hero: HomeScenarioHero;
};

export type HomeEditorialCuration = {
  path: HomeScenarioWatch | null;
  selection: HomeScenarioWatch | null;
  comparisonSeastar: HomeScenarioWatch | null;
  collectionOwned: HomeScenarioWatch[];
  collectionRecommendation: HomeScenarioWatch | null;
  journal: HomeScenarioWatch[];
  final: HomeScenarioWatch[];
};

export type OrbitWatchSpec = {
  label: string;
  value: string;
};

export type OrbitWatch = {
  globalIndex: number;
  scenarioIndex: HomeScenarioIndex;
  scenarioPosition: HomeScenarioPosition;
  scenarioId: HomeScenarioId;
  scenarioTitle: string;
  scenarioRailTitle: string;
  scenarioDescription: string;
  scenarioBackgroundWord: string;
  scenarioAccentWord: string;
  brand: string;
  model: string;
  reference: string;
  href: string;
  price: number | null;
  priceLabel: string | null;
  imageSrc: string;
  sourceWidth: number;
  sourceHeight: number;
  generatedWidth: number;
  generatedHeight: number;
  qualityClass: HomeHeroQualityClass;
  motionMode: HomeHeroMotionMode;
  assetView: HomeHeroAssetView;
  isExactReferenceAsset: boolean;
  isHeroApprovedAsset: boolean;
  assetRejectionReason?: string;
  assetSourceNote: string;
  assetScale: number;
  specs: OrbitWatchSpec[];
};

export type OrbitVisibleIndexes = {
  farLeftIndex: number;
  leftIndex: number;
  centerIndex: number;
  rightIndex: number;
  farRightIndex: number;
};

export type OrbitAnchorName = "exitLeft" | "left" | "centerActive" | "right" | "queueNear" | "queueFar";

export type OrbitAnchorPresentation = {
  anchorName: OrbitAnchorName;
  x: number;
  y: number;
  scale: number;
  opacity: number;
  blur: number;
  z: number;
  shadowY: number;
  shadowBlur: number;
  shadowOpacity: number;
};

type StaticSlot = Omit<HomeScenarioWatch, "id" | "href" | "priceLabel" | "catalogMatched">;

type ScenarioDefinition = {
  id: HomeScenarioId;
  index: string;
  title: string;
  railTitle: string;
  eyebrow: string;
  description: string;
  criteria: string[];
  catalogHref: string;
  backgroundWord: string;
  accentWord: string;
  sceneDescription: string;
  reviewNote: string;
  slots: StaticSlot[];
};

const premiumAsset = (reference: string, qualityClass: HomeHeroQualityClass = "HERO_GRADE"): HomeHeroAsset => {
  const config = homepageWatchVisualConfigByReference[reference];
  const dimensions = homepageWatchAssetDimensions[reference];
  if (!config || !dimensions) {
    throw new Error(`Missing homepage premium asset config for ${reference}`);
  }
  const isEditorialAsset = config.assetPath.includes("/homepage-editorial-assets/");

  return {
    path: config.assetPath,
    src: config.assetPath,
    width: dimensions.generatedWidth,
    height: dimensions.generatedHeight,
    sourceWidth: dimensions.sourceWidth,
    sourceHeight: dimensions.sourceHeight,
    qualityClass,
    motionMode: "STATIC_FRONT",
    framePaths: [],
    frameCount: 1,
    source: isEditorialAsset ? "homepage_editorial_asset" : "homepage_premium_asset",
    sourceNote: isEditorialAsset
      ? "Exact-reference homepage editorial asset selected from catalog-compatible product media."
      : "Approved by HOMEPAGE_ASSET_CURATION for the production homepage premium visual set.",
    isExactReference: true,
    view: "front",
    isHeroApproved: true,
  };
};

const premiumSlot = (
  slot: Omit<StaticSlot, "asset" | "displayScale" | "displayX" | "displayY" | "depth" | "opacity"> & {
    qualityClass?: HomeHeroQualityClass;
    displayScale?: number;
    displayX?: number;
    displayY?: number;
    depth?: number;
    opacity?: number;
  },
): StaticSlot => ({
  ...slot,
  asset: premiumAsset(slot.reference, slot.qualityClass ?? "HERO_GRADE"),
  displayScale: slot.displayScale ?? 1,
  displayX: slot.displayX ?? 0,
  displayY: slot.displayY ?? 1,
  depth: slot.depth ?? 1,
  opacity: slot.opacity ?? 1,
});

const readableHomeScenarioDefinitions: ScenarioDefinition[] = [
  {
    id: "everyday",
    index: "01",
    title: "На каждый день",
    railTitle: "На каждый день",
    eyebrow: "Ваше время. Ваш стиль.",
    description: "Универсальные часы для ритма недели: офис, прогулка и обычный день без лишней церемонии.",
    criteria: ["читаемый циферблат", "стальной браслет", "размер около 38-40 мм"],
    catalogHref: "/watches?q=PR%20100",
    backgroundWord: "РИТМ",
    accentWord: "ПОДХОДЯТ",
    sceneDescription: "Ежедневный сценарий собран на чистых фронтальных product assets: главная роль у PR 100 40mm, рядом PR 100 Chronograph, PR 100 34mm и Edifice.",
    reviewNote: "Low-resolution Classic Dream/G-Shock/Bambino assets removed from production everyday orbit.",
    slots: [
      premiumSlot({ brandName: "Tissot", title: "Tissot PR 100 40mm", shortTitle: "PR 100 40mm", reference: "T150.410.16.051.00", referenceSlug: "t1504101605100", slotRole: "centralMain", specs: ["черный циферблат", "кожаный ремешок", "40 мм"] }),
      premiumSlot({ brandName: "Tissot", title: "Tissot PR 100 Chronograph 40mm", shortTitle: "PR 100 Chronograph", reference: "T150.417.11.041.00", referenceSlug: "t1504171104100", slotRole: "alternativeLeft", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.68, displayX: -30, displayY: 3, depth: 3, opacity: 0.48, specs: ["синий циферблат", "хронограф", "стальной браслет"] }),
      premiumSlot({ brandName: "Tissot", title: "Tissot PR 100 34mm", shortTitle: "PR 100 34mm", reference: "T150.210.11.041.00", referenceSlug: "t1502101104100", slotRole: "alternativeRight", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.64, displayX: 31, displayY: 2, depth: 4, opacity: 0.5, specs: ["синий циферблат", "стальной браслет", "34 мм"] }),
      premiumSlot({ brandName: "Casio", title: "Casio Edifice Automatic", shortTitle: "Edifice Automatic", reference: "EFK-100D-2A", referenceSlug: "efk100d2a", slotRole: "alternativeRear", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.48, displayX: 48, displayY: -10, depth: 5, opacity: 0.24, specs: ["автомат", "синий циферблат", "стальной браслет"] }),
    ],
  },
  {
    id: "shirt",
    index: "02",
    title: "Под рубашку",
    railTitle: "Под рубашку",
    eyebrow: "Тише, тоньше, собраннее.",
    description: "Сдержанные часы, которые не спорят с одеждой и остаются читаемыми в деловом сценарии.",
    criteria: ["чистый циферблат", "тонкий профиль", "кожа или спокойная сталь"],
    catalogHref: "/watches?q=T150.410.16.051.00",
    backgroundWord: "КЛАССИКА",
    accentWord: "СДЕРЖАННО",
    sceneDescription: "PR 100 на черном ремешке ведет сценарий под манжету; малые Bambino/Classic Dream thumbnails не попадают в production orbit.",
    reviewNote: "Bambino stays out until a large front asset is available.",
    slots: [
      premiumSlot({ brandName: "Tissot", title: "Tissot PR 100 40mm", shortTitle: "PR 100 40mm", reference: "T150.410.16.051.00", referenceSlug: "t1504101605100", slotRole: "centralMain", specs: ["черный циферблат", "кожаный ремешок", "40 мм"] }),
      premiumSlot({ brandName: "Tissot", title: "Tissot PR 100 34mm", shortTitle: "PR 100 34mm", reference: "T150.210.11.041.00", referenceSlug: "t1502101104100", slotRole: "alternativeLeft", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.62, displayX: -32, displayY: 2, depth: 3, opacity: 0.42, specs: ["синий циферблат", "стальной браслет", "34 мм"] }),
      premiumSlot({ brandName: "Tissot", title: "Tissot PR 100 Chronograph 40mm", shortTitle: "PR 100 Chronograph", reference: "T150.417.11.041.00", referenceSlug: "t1504171104100", slotRole: "alternativeRight", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.66, displayX: 32, displayY: 2, depth: 4, opacity: 0.44, specs: ["синий циферблат", "хронограф", "сталь"] }),
      premiumSlot({ brandName: "Casio", title: "Casio Edifice Automatic", shortTitle: "Edifice Automatic", reference: "EFK-100D-2A", referenceSlug: "efk100d2a", slotRole: "alternativeRear", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.46, displayX: 48, displayY: -10, depth: 5, opacity: 0.22, specs: ["автомат", "синий циферблат", "стальной браслет"] }),
    ],
  },
  {
    id: "travel",
    index: "03",
    title: "Для путешествий",
    railTitle: "Для путешествий",
    eyebrow: "Надежность в дороге.",
    description: "Часы для смены города, воды, маршрута и расписания, когда важны читаемость и запас прочности.",
    criteria: ["водозащита", "читаемость", "прочный корпус"],
    catalogHref: "/watches?q=Seastar%201000",
    backgroundWord: "ДВИЖЕНИЕ",
    accentWord: "ГОТОВЫ",
    sceneDescription: "Seastar Chronograph ведет дорожный сценарий; G-Shock thumbnail заменен качественным MT-G asset.",
    reviewNote: "GBD-H1000 stays rejected for production homepage because source is low-resolution.",
    slots: [
      premiumSlot({ brandName: "Tissot", title: "Tissot Seastar 1000 Chronograph 45.5mm", shortTitle: "Seastar Chronograph", reference: "T120.417.17.051.03", referenceSlug: "t1204171705103", slotRole: "centralMain", specs: ["синий циферблат", "хронограф", "стальной браслет"] }),
      premiumSlot({ brandName: "Casio", title: "Casio G-Shock MT-G", shortTitle: "G-Shock MT-G", reference: "MTG-B3000DN-1A", referenceSlug: "mtgb3000dn1a", slotRole: "alternativeLeft", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.62, displayX: -32, displayY: 2, depth: 3, opacity: 0.44, specs: ["защита", "металл", "акцент"] }),
      premiumSlot({ brandName: "Casio", title: "Casio Edifice Automatic", shortTitle: "Edifice Automatic", reference: "EFK-100D-2A", referenceSlug: "efk100d2a", slotRole: "alternativeRight", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.66, displayX: 32, displayY: 2, depth: 4, opacity: 0.46, specs: ["автомат", "синий циферблат", "стальной браслет"] }),
      premiumSlot({ brandName: "Tissot", title: "Tissot PR 100 Chronograph 40mm", shortTitle: "PR 100 Chronograph", reference: "T150.417.11.041.00", referenceSlug: "t1504171104100", slotRole: "alternativeRear", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.48, displayX: 48, displayY: -10, depth: 5, opacity: 0.22, specs: ["синий циферблат", "хронограф", "сталь"] }),
    ],
  },
  {
    id: "first-mechanical",
    index: "04",
    title: "Первая механика",
    railTitle: "Первая механика",
    eyebrow: "Автомат без лишней драмы.",
    description: "Понятный вход в механические часы: читаемый циферблат, надежная посадка и современный повседневный образ.",
    criteria: ["автоматический механизм", "стальной браслет", "понятная эксплуатация"],
    catalogHref: "/watches?q=EFK-100D-2A",
    backgroundWord: "МЕХАНИЗМ",
    accentWord: "ЖИВОЙ",
    sceneDescription: "Edifice Automatic получает главную механическую роль; малые исходные Orient thumbnails не используются в production.",
    reviewNote: "Orient Bambino and Mako are excluded until better front assets exist.",
    slots: [
      premiumSlot({ brandName: "Casio", title: "Casio Edifice Automatic", shortTitle: "Edifice Automatic", reference: "EFK-100D-2A", referenceSlug: "efk100d2a", slotRole: "centralMain", specs: ["автомат", "синий циферблат", "стальной браслет"] }),
      premiumSlot({ brandName: "Tissot", title: "Tissot PRX Powermatic 80 40mm Gold", shortTitle: "PRX Powermatic Gold", reference: "T137.407.33.051.00", referenceSlug: "t1374073305100", slotRole: "alternativeLeft", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.66, displayX: -32, displayY: 2, depth: 3, opacity: 0.44, specs: ["Powermatic 80", "золотой корпус", "черный циферблат"] }),
      premiumSlot({ brandName: "Tissot", title: "Tissot Seastar 1000 Chronograph 45.5mm", shortTitle: "Seastar Chronograph", reference: "T120.417.17.051.03", referenceSlug: "t1204171705103", slotRole: "alternativeRight", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.62, displayX: 32, displayY: 2, depth: 4, opacity: 0.44, specs: ["синий циферблат", "хронограф", "стальной браслет"] }),
      premiumSlot({ brandName: "Tissot", title: "Tissot PR 100 40mm", shortTitle: "PR 100 40mm", reference: "T150.410.16.051.00", referenceSlug: "t1504101605100", slotRole: "alternativeRear", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.48, displayX: 48, displayY: -10, depth: 5, opacity: 0.22, specs: ["черный циферблат", "кожаный ремешок", "40 мм"] }),
    ],
  },
  {
    id: "sport",
    index: "05",
    title: "Для спорта",
    railTitle: "Для спорта",
    eyebrow: "Функция и точность.",
    description: "Сценарий для активности, воды и плотного графика без хрупких или случайных визуальных компромиссов.",
    criteria: ["прочность", "водозащита", "легкая читаемость"],
    catalogHref: "/watches?q=Seastar%201000",
    backgroundWord: "ЭНЕРГИЯ",
    accentWord: "ТОЧНОСТЬ",
    sceneDescription: "Sport scenario uses Seastar and MT-G quality assets instead of the low-resolution Seastar 40/G-Shock thumbnails.",
    reviewNote: "T120.807.33.051.00 and GBD-H1000-1A4 remain rejected until better exact front assets exist.",
    slots: [
      premiumSlot({ brandName: "Tissot", title: "Tissot Seastar 1000 Chronograph 45.5mm", shortTitle: "Seastar Chronograph", reference: "T120.417.17.051.03", referenceSlug: "t1204171705103", slotRole: "centralMain", specs: ["синий циферблат", "хронограф", "стальной браслет"] }),
      premiumSlot({ brandName: "Casio", title: "Casio G-Shock MT-G", shortTitle: "G-Shock MT-G", reference: "MTG-B3000DN-1A", referenceSlug: "mtgb3000dn1a", slotRole: "alternativeLeft", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.66, displayX: -32, displayY: 2, depth: 3, opacity: 0.46, specs: ["защита", "металл", "акцент"] }),
      premiumSlot({ brandName: "Casio", title: "Casio Edifice Automatic", shortTitle: "Edifice Automatic", reference: "EFK-100D-2A", referenceSlug: "efk100d2a", slotRole: "alternativeRight", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.62, displayX: 32, displayY: 2, depth: 4, opacity: 0.44, specs: ["автомат", "синий циферблат", "стальной браслет"] }),
      premiumSlot({ brandName: "Tissot", title: "Tissot PR 100 Chronograph 40mm", shortTitle: "PR 100 Chronograph", reference: "T150.417.11.041.00", referenceSlug: "t1504171104100", slotRole: "alternativeRear", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.48, displayX: 48, displayY: -10, depth: 5, opacity: 0.22, specs: ["синий циферблат", "хронограф", "сталь"] }),
    ],
  },
  {
    id: "next-collection",
    index: "06",
    title: "В коллекцию",
    railTitle: "В коллекцию",
    eyebrow: "Когда база уже есть.",
    description: "Часы с отдельной ролью: другой металл, более сильная форма или новый сценарий внутри личной коллекции.",
    criteria: ["не дублирует базу", "сильная форма", "понятная роль"],
    catalogHref: "/watches?q=PRX%20Powermatic",
    backgroundWord: "ХАРАКТЕР",
    accentWord: "ХАРАКТЕР",
    sceneDescription: "Gold PRX leads the collection scenario; supporting watches stay within the audited premium asset set.",
    reviewNote: "PRX Blue remains out because available source frames are too small/angled for production hero use.",
    slots: [
      premiumSlot({ brandName: "Tissot", title: "Tissot PRX Powermatic 80 40mm Gold", shortTitle: "PRX Powermatic Gold", reference: "T137.407.33.051.00", referenceSlug: "t1374073305100", slotRole: "centralMain", specs: ["Powermatic 80", "золотой корпус", "черный циферблат"] }),
      premiumSlot({ brandName: "Casio", title: "Casio G-Shock MT-G", shortTitle: "G-Shock MT-G", reference: "MTG-B3000DN-1A", referenceSlug: "mtgb3000dn1a", slotRole: "alternativeLeft", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.66, displayX: -32, displayY: 2, depth: 3, opacity: 0.46, specs: ["защита", "металл", "акцент"] }),
      premiumSlot({ brandName: "Tissot", title: "Tissot Seastar 1000 Chronograph 45.5mm", shortTitle: "Seastar Chronograph", reference: "T120.417.17.051.03", referenceSlug: "t1204171705103", slotRole: "alternativeRight", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.62, displayX: 32, displayY: 2, depth: 4, opacity: 0.44, specs: ["синий циферблат", "хронограф", "стальной браслет"] }),
      premiumSlot({ brandName: "Tissot", title: "Tissot PR 100 40mm", shortTitle: "PR 100 40mm", reference: "T150.410.16.051.00", referenceSlug: "t1504101605100", slotRole: "alternativeRear", qualityClass: "ALTERNATIVE_GRADE", displayScale: 0.48, displayX: 48, displayY: -10, depth: 5, opacity: 0.22, specs: ["черный циферблат", "кожаный ремешок", "40 мм"] }),
    ],
  },
];

export const homeScenarioDefinitions = readableHomeScenarioDefinitions;

export const rejectedHomeHeroAssets = [
  {
    reference: "T129.410.11.053.00",
    path: "/generated/home-hero/final/t1294101105300/frame-01.png",
    view: "side",
    reason: "Large Classic Dream side-view frame was removed from the normal homepage hero.",
  },
  {
    reference: "T120.417.17.051.02",
    path: "/generated/home-hero/final/t1204171705102/frame-01.png",
    view: "side",
    reason: "Seastar Black side-view frame was replaced with a front-only exact-reference frame.",
  },
  {
    reference: "RA-AC0Q03S10B",
    path: "/generated/home-hero/final/raac0q03s10b/frame-02.png",
    view: "side",
    reason: "Mako side-view frame was removed from normal hero orbit.",
  },
  {
    reference: "T137.407.11.041.00",
    path: "/generated/home-hero/final/t1374071104100/frame-01.png",
    view: "three-quarter",
    reason: "PRX Blue angled frame was removed from normal hero orbit.",
  },
  {
    reference: "T137.407.11.041.00",
    path: "/generated/home-hero/final/t1374071104100/frame-02.png",
    view: "three-quarter",
    reason: "PRX Blue angled frame was removed from normal hero orbit.",
  },
] as const;

function normalizeReferenceSlug(reference: string): string {
  return reference.normalize("NFKC").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function findCatalogWatch(dataset: CatalogReadDataset | null, reference: string): CatalogWatchDetail | null {
  const referenceSlug = normalizeReferenceSlug(reference);
  return dataset?.watches.find((watch) => watch.referenceSlug === referenceSlug || normalizeReferenceSlug(watch.referenceDisplay) === referenceSlug) ?? null;
}

type EditorialWatchDefinition = {
  reference: string;
  shortTitle: string;
  assetPath: string;
  width: number;
  height: number;
  specs: string[];
};

const editorialWatchDefinitions = {
  path: {
    reference: "T150.417.11.041.00",
    shortTitle: "PR 100 Chronograph",
    assetPath: "/generated/homepage-premium-assets/t1504171104100.png",
    width: 1014,
    height: 1143,
    specs: ["40 мм", "хронограф", "стальной браслет"],
  },
  selection: {
    reference: "EFK-100D-2A",
    shortTitle: "Edifice Automatic",
    assetPath: "/generated/homepage-premium-assets/efk100d2a.png",
    width: 972,
    height: 1552,
    specs: ["автоматический механизм", "синий циферблат", "стальной браслет"],
  },
  comparisonSeastar: {
    reference: "T120.417.17.051.03",
    shortTitle: "Seastar Chronograph",
    assetPath: "/generated/homepage-editorial-assets/tissot-seastar-t1204171705103.png",
    width: 1680,
    height: 1680,
    specs: ["45,5 мм", "хронограф", "каучуковый ремень"],
  },
  collectionOwned: [
    {
      reference: "T150.417.11.041.00",
      shortTitle: "PR 100 Chronograph",
      assetPath: "/generated/homepage-premium-assets/t1504171104100.png",
      width: 1014,
      height: 1143,
      specs: ["40 мм", "хронограф", "стальной браслет"],
    },
    {
      reference: "EFK-100D-2A",
      shortTitle: "Edifice Automatic",
      assetPath: "/generated/homepage-premium-assets/efk100d2a.png",
      width: 972,
      height: 1552,
      specs: ["автомат", "синий циферблат", "сталь"],
    },
    {
      reference: "RA-AC0018E30B",
      shortTitle: "Classic Green",
      assetPath: "/generated/homepage-editorial-assets/orient-classic-raac0018e30b-cutout.png",
      width: 328,
      height: 492,
      specs: ["автомат", "зеленый циферблат", "миланский браслет"],
    },
    {
      reference: "NJ0210-13L",
      shortTitle: "Automatic Dress",
      assetPath: "/generated/homepage-editorial-assets/citizen-nj0210-13l.webp",
      width: 1400,
      height: 1400,
      specs: ["автомат", "синий циферблат", "кожаный ремень"],
    },
  ],
  collectionRecommendation: {
    reference: "RA-AA0811E19B",
    shortTitle: "Mako III Green",
    assetPath: "/generated/homepage-editorial-assets/orient-mako-raaa0811e19b-cutout.png",
    width: 328,
    height: 492,
    specs: ["автомат", "зеленый циферблат", "20 бар"],
  },
  journal: [
    {
      reference: "MTG-B3000DN-1A",
      shortTitle: "G-Shock MT-G",
      assetPath: "/generated/homepage-premium-assets/mtgb3000dn1a.png",
      width: 1027,
      height: 1368,
      specs: ["защищенный корпус", "металл", "спортивная роль"],
    },
    {
      reference: "RA-AC0022S30B",
      shortTitle: "Classic White",
      assetPath: "/generated/homepage-editorial-assets/orient-classic-raac0022s30b-cutout.png",
      width: 317,
      height: 466,
      specs: ["автомат", "светлый циферблат", "кожаный ремень"],
    },
    {
      reference: "NJ0210-56A",
      shortTitle: "Automatic Dress",
      assetPath: "/generated/homepage-editorial-assets/citizen-nj0210-56a.webp",
      width: 1400,
      height: 1400,
      specs: ["автомат", "светлый циферблат", "стальной браслет"],
    },
  ],
  final: [
    {
      reference: "T137.407.33.051.00",
      shortTitle: "PRX Powermatic Gold",
      assetPath: "/generated/homepage-premium-assets/t1374073305100.png",
      width: 954,
      height: 1527,
      specs: ["Powermatic 80", "золотой корпус", "черный циферблат"],
    },
    {
      reference: "NJ0210-13L",
      shortTitle: "Automatic Dress",
      assetPath: "/generated/homepage-editorial-assets/citizen-nj0210-13l.webp",
      width: 1400,
      height: 1400,
      specs: ["автомат", "синий циферблат", "кожаный ремень"],
    },
  ],
} satisfies {
  path: EditorialWatchDefinition;
  selection: EditorialWatchDefinition;
  comparisonSeastar: EditorialWatchDefinition;
  collectionOwned: EditorialWatchDefinition[];
  collectionRecommendation: EditorialWatchDefinition;
  journal: EditorialWatchDefinition[];
  final: EditorialWatchDefinition[];
};

function buildEditorialWatch(
  dataset: CatalogReadDataset | null,
  definition: EditorialWatchDefinition,
  slotRole: HomeHeroSlotRole,
): HomeScenarioWatch | null {
  const matchedWatch = findCatalogWatch(dataset, definition.reference);
  if (!matchedWatch) return null;

  return {
    id: matchedWatch.id,
    href: matchedWatch.href,
    brandName: matchedWatch.brandName,
    title: matchedWatch.title,
    shortTitle: definition.shortTitle,
    reference: matchedWatch.referenceDisplay,
    referenceSlug: matchedWatch.referenceSlug,
    priceLabel: priceFor(matchedWatch),
    catalogMatched: true,
    slotRole,
    asset: {
      path: definition.assetPath,
      src: definition.assetPath,
      width: definition.width,
      height: definition.height,
      sourceWidth: definition.width,
      sourceHeight: definition.height,
      qualityClass: "ALTERNATIVE_GRADE",
      motionMode: "STATIC_FRONT",
      framePaths: [],
      frameCount: 1,
      source: "homepage_editorial_asset",
      sourceNote: "Exact-reference homepage asset selected from the catalog source or official manufacturer product media.",
      isExactReference: true,
      view: "front",
      isHeroApproved: false,
    },
    specs: definition.specs,
    displayScale: 1,
    displayX: 0,
    displayY: 0,
    depth: 1,
    opacity: 1,
  };
}

export function buildHomeEditorialCuration(dataset: CatalogReadDataset | null): HomeEditorialCuration {
  const buildMany = (definitions: EditorialWatchDefinition[], slotRole: HomeHeroSlotRole) =>
    definitions
      .map((definition) => buildEditorialWatch(dataset, definition, slotRole))
      .filter((watch): watch is HomeScenarioWatch => watch !== null);

  return {
    path: buildEditorialWatch(dataset, editorialWatchDefinitions.path, "alternativeRight"),
    selection: buildEditorialWatch(dataset, editorialWatchDefinitions.selection, "centralMain"),
    comparisonSeastar: buildEditorialWatch(dataset, editorialWatchDefinitions.comparisonSeastar, "alternativeRight"),
    collectionOwned: buildMany(editorialWatchDefinitions.collectionOwned, "alternativeLeft"),
    collectionRecommendation: buildEditorialWatch(dataset, editorialWatchDefinitions.collectionRecommendation, "centralMain"),
    journal: buildMany(editorialWatchDefinitions.journal, "alternativeRight"),
    final: buildMany(editorialWatchDefinitions.final, "centralMain"),
  };
}

function catalogHrefFor(slot: StaticSlot, matchedWatch: CatalogWatchDetail | null): string {
  if (matchedWatch) return matchedWatch.href;
  return `/watches?q=${encodeURIComponent(slot.reference)}`;
}

function priceFor(matchedWatch: CatalogWatchDetail | null): string | null {
  return matchedWatch?.publicPrice ? formatCatalogMoney(matchedWatch.publicPrice) : null;
}

function buildSlot(slot: StaticSlot, dataset: CatalogReadDataset | null): HomeScenarioWatch {
  const matchedWatch = findCatalogWatch(dataset, slot.reference);
  return {
    ...slot,
    id: matchedWatch?.id ?? slot.referenceSlug,
    href: catalogHrefFor(slot, matchedWatch),
    priceLabel: priceFor(matchedWatch),
    catalogMatched: Boolean(matchedWatch),
  };
}

export function buildHomeScenarios(dataset: CatalogReadDataset | null): HomeScenario[] {
  return homeScenarioDefinitions.map((definition) => {
    const slots = definition.slots.map((slot) => buildSlot(slot, dataset));
    const visibleSlots = slots.filter((slot) => slot.asset.qualityClass !== "REJECTED" && slot.opacity > 0);
    const mainWatch = visibleSlots.find((slot) => slot.slotRole === "centralMain") ?? visibleSlots[0] ?? slots[0];
    const secondaryWatch = visibleSlots.find((slot) => slot.slotRole !== "centralMain") ?? null;

    return {
      id: definition.id,
      index: definition.index,
      title: definition.title,
      railTitle: definition.railTitle,
      eyebrow: definition.eyebrow,
      description: definition.description,
      criteria: definition.criteria,
      catalogHref: definition.catalogHref,
      hero: {
        mainWatch,
        secondaryWatch,
        slots,
        backgroundWord: definition.backgroundWord,
        accentWord: definition.accentWord,
        sceneDescription: definition.sceneDescription,
        reviewNote: definition.reviewNote,
      },
    };
  });
}

export function wrapOrbitIndex(index: number, total = 24): number {
  return ((index % total) + total) % total;
}

export function scenarioIndexFromOrbitIndex(index: number): HomeScenarioIndex {
  return Math.floor(wrapOrbitIndex(index) / 4) as HomeScenarioIndex;
}

export function scenarioPositionFromOrbitIndex(index: number): HomeScenarioPosition {
  return (wrapOrbitIndex(index) % 4) as HomeScenarioPosition;
}

export function targetOrbitIndexForScenario(scenarioIndex: HomeScenarioIndex): number {
  return scenarioIndex * 4;
}

export function visibleOrbitIndexes(activeOrbitIndex: number, total = 24): OrbitVisibleIndexes {
  return {
    farLeftIndex: wrapOrbitIndex(activeOrbitIndex - 2, total),
    leftIndex: wrapOrbitIndex(activeOrbitIndex - 1, total),
    centerIndex: wrapOrbitIndex(activeOrbitIndex, total),
    rightIndex: wrapOrbitIndex(activeOrbitIndex + 1, total),
    farRightIndex: wrapOrbitIndex(activeOrbitIndex + 2, total),
  };
}

export function shortestOrbitDirection(currentIndex: number, targetIndex: number, total = 24): 1 | -1 {
  const current = wrapOrbitIndex(currentIndex, total);
  const target = wrapOrbitIndex(targetIndex, total);
  const forward = wrapOrbitIndex(target - current, total);
  const backward = wrapOrbitIndex(current - target, total);
  return forward <= backward ? 1 : -1;
}

export function orbitDistance(currentIndex: number, targetIndex: number, direction: 1 | -1, total = 24): number {
  return direction === 1
    ? wrapOrbitIndex(targetIndex - currentIndex, total)
    : wrapOrbitIndex(currentIndex - targetIndex, total);
}

export function forwardOrbitDistance(currentIndex: number, targetIndex: number, total = 24): number {
  return wrapOrbitIndex(targetIndex - currentIndex, total);
}

export function shortestSignedCircularDistance(modelIndex: number, orbitPosition: number, total = 24): number {
  let distance = modelIndex - orbitPosition;
  distance = ((distance + total / 2) % total + total) % total - total / 2;
  return distance;
}

const orbitAnchorPresets: Record<number, Omit<OrbitAnchorPresentation, "anchorName">> = {
  [-3]: { x: -13, y: 61, scale: 0.2, opacity: 0, blur: 1.35, z: 3, shadowY: 0.36, shadowBlur: 0.55, shadowOpacity: 0 },
  [-2]: { x: 5, y: 58, scale: 0.36, opacity: 0.24, blur: 0.82, z: 5, shadowY: 0.42, shadowBlur: 0.62, shadowOpacity: 0.018 },
  [-1]: { x: 24, y: 55, scale: 0.66, opacity: 0.7, blur: 0.2, z: 25, shadowY: 0.86, shadowBlur: 1.08, shadowOpacity: 0.058 },
  [0]: { x: 54, y: 50, scale: 1, opacity: 1, blur: 0, z: 60, shadowY: 1.95, shadowBlur: 2.45, shadowOpacity: 0.18 },
  [1]: { x: 75, y: 48, scale: 0.72, opacity: 0.72, blur: 0.14, z: 38, shadowY: 0.92, shadowBlur: 1.18, shadowOpacity: 0.068 },
  [2]: { x: 90, y: 42, scale: 0.52, opacity: 0.42, blur: 0.4, z: 23, shadowY: 0.62, shadowBlur: 0.9, shadowOpacity: 0.038 },
  [3]: { x: 101, y: 36, scale: 0.38, opacity: 0.25, blur: 0.82, z: 12, shadowY: 0.42, shadowBlur: 0.68, shadowOpacity: 0.018 },
  [4]: { x: 104, y: 30, scale: 0.24, opacity: 0, blur: 1.35, z: 4, shadowY: 0.3, shadowBlur: 0.5, shadowOpacity: 0 },
};

export function orbitAnchorNameFromDistance(distance: number): OrbitAnchorName {
  const rounded = Math.round(distance);
  if (rounded <= -2) return "exitLeft";
  if (rounded === -1) return "left";
  if (rounded === 0) return "centerActive";
  if (rounded === 1) return "right";
  if (rounded === 2) return "queueNear";
  return "queueFar";
}

export function orbitPresentationForDistance(distance: number): OrbitAnchorPresentation {
  const clampedDistance = Math.min(4, Math.max(-3, distance));
  const lowerKey = Math.floor(clampedDistance);
  const upperKey = Math.ceil(clampedDistance);
  const lower = orbitAnchorPresets[lowerKey] ?? orbitAnchorPresets[0];
  const upper = orbitAnchorPresets[upperKey] ?? lower;
  const progress = upperKey === lowerKey ? 0 : clampedDistance - lowerKey;

  return {
    anchorName: orbitAnchorNameFromDistance(distance),
    x: lower.x + (upper.x - lower.x) * progress,
    y: lower.y + (upper.y - lower.y) * progress,
    scale: lower.scale + (upper.scale - lower.scale) * progress,
    opacity: lower.opacity + (upper.opacity - lower.opacity) * progress,
    blur: lower.blur + (upper.blur - lower.blur) * progress,
    z: Math.round(lower.z + (upper.z - lower.z) * progress),
    shadowY: lower.shadowY + (upper.shadowY - lower.shadowY) * progress,
    shadowBlur: lower.shadowBlur + (upper.shadowBlur - lower.shadowBlur) * progress,
    shadowOpacity: lower.shadowOpacity + (upper.shadowOpacity - lower.shadowOpacity) * progress,
  };
}

function numericPriceFromLabel(priceLabel: string | null): number | null {
  if (!priceLabel) return null;
  const digits = priceLabel.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

function orbitSpecFromText(spec: string): OrbitWatchSpec {
  const [first, ...rest] = spec.split(":");
  if (rest.length > 0) {
    return { label: first.trim().toUpperCase(), value: rest.join(":").trim().toUpperCase() };
  }
  const normalized = spec.trim().toLowerCase();
  const upperValue = (value: string) => value.trim().toUpperCase();
  if (normalized.includes("циферблат")) {
    return { label: "ЦИФЕРБЛАТ", value: upperValue(normalized.replace("циферблат", "") || spec) };
  }
  if (normalized.includes("браслет")) {
    return { label: "БРАСЛЕТ", value: upperValue(normalized.replace("браслет", "") || spec) };
  }
  if (normalized.includes("ремешок")) {
    return { label: "РЕМЕШОК", value: upperValue(normalized.replace("ремешок", "") || spec) };
  }
  if (normalized.includes("мм")) {
    return { label: "ДИАМЕТР", value: upperValue(spec) };
  }
  if (normalized.includes("хронограф")) {
    return { label: "ФУНКЦИЯ", value: "ХРОНОГРАФ" };
  }
  if (normalized.includes("автомат")) {
    return { label: "МЕХАНИЗМ", value: "АВТОМАТ" };
  }
  if (normalized.includes("механик")) {
    return { label: "МЕХАНИЗМ", value: "МЕХАНИКА" };
  }
  if (normalized.includes("кварц")) {
    return { label: "МЕХАНИЗМ", value: "КВАРЦ" };
  }
  if (normalized.includes("сталь")) {
    return { label: "КОРПУС", value: "СТАЛЬ" };
  }
  if (normalized.includes("час")) {
    return { label: "ЗАПАС ХОДА", value: upperValue(spec) };
  }
  return { label: "ДЕТАЛЬ", value: upperValue(spec) };
}

export function harmonizedVisualScale(input: { displayScale: number; sourceWidth: number; sourceHeight: number }): number {
  const aspect = input.sourceWidth > 0 ? input.sourceHeight / input.sourceWidth : 1;
  const shapeCompensation = aspect > 1.45 ? 1.025 : aspect < 0.78 ? 0.965 : 1;
  const displayCompensation = 1 + (0.72 - input.displayScale) * 0.085;
  return Math.min(1.07, Math.max(0.94, displayCompensation * shapeCompensation));
}

export function buildHomeOrbitWatches(scenarios: HomeScenario[]): OrbitWatch[] {
  return scenarios.flatMap((scenario, scenarioIndex) =>
    scenario.hero.slots.slice(0, 4).map((slot, scenarioPosition) => ({
      globalIndex: scenarioIndex * 4 + scenarioPosition,
      scenarioIndex: scenarioIndex as HomeScenarioIndex,
      scenarioPosition: scenarioPosition as HomeScenarioPosition,
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      scenarioRailTitle: scenario.railTitle,
      scenarioDescription: scenario.description,
      scenarioBackgroundWord: scenario.hero.backgroundWord,
      scenarioAccentWord: scenario.hero.accentWord,
      brand: slot.brandName,
      model: slot.shortTitle,
      reference: slot.reference,
      href: slot.href,
      price: numericPriceFromLabel(slot.priceLabel),
      priceLabel: slot.priceLabel,
      imageSrc: slot.asset.path,
      sourceWidth: slot.asset.sourceWidth,
      sourceHeight: slot.asset.sourceHeight,
      generatedWidth: slot.asset.width,
      generatedHeight: slot.asset.height,
      qualityClass: slot.asset.qualityClass,
      motionMode: slot.asset.motionMode,
      assetView: slot.asset.view,
      isExactReferenceAsset: slot.asset.isExactReference,
      isHeroApprovedAsset: slot.asset.isHeroApproved,
      assetRejectionReason: slot.asset.rejectionReason,
      assetSourceNote: slot.asset.sourceNote,
      assetScale: harmonizedVisualScale({
        displayScale: slot.displayScale,
        sourceWidth: slot.asset.sourceWidth,
        sourceHeight: slot.asset.sourceHeight,
      }),
      specs: slot.specs.slice(0, 3).map(orbitSpecFromText),
    })),
  );
}

import { formatCatalogMoney } from "@/modules/catalog/application/catalog-format";
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
  source: "final_user_zip" | "catalog_candidate_asset" | "premium_candidate_asset";
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

function orbitNormalizedAssetPath(assetPath: string): string {
  return assetPath.replace("/generated/home-hero/", "/generated/home-hero/orbit-normalized/");
}

const finalAsset = (
  referenceSlug: string,
  frame: string,
  sourceWidth: number,
  sourceHeight: number,
  qualityClass: HomeHeroQualityClass,
  motionMode: HomeHeroMotionMode,
  framePaths: string[] = [],
  audit: Partial<Pick<HomeHeroAsset, "view" | "isHeroApproved" | "rejectionReason" | "sourceNote">> = {},
): HomeHeroAsset => {
  const path = orbitNormalizedAssetPath(`/generated/home-hero/final/${referenceSlug}/${frame}`);
  return {
    path,
    src: path,
    width: 1700,
    height: 1800,
    sourceWidth,
    sourceHeight,
    qualityClass,
    motionMode,
    framePaths: framePaths.map(orbitNormalizedAssetPath),
    frameCount: framePaths.length > 0 ? framePaths.length : 1,
    source: "final_user_zip",
    sourceNote: audit.sourceNote ?? "Prepared from the user supplied final homepage ZIP set.",
    isExactReference: true,
    view: audit.view ?? "front",
    isHeroApproved: audit.isHeroApproved ?? (audit.view === undefined || audit.view === "front"),
    rejectionReason: audit.rejectionReason,
  };
};

const candidateAsset = (
  path: string,
  sourceWidth: number,
  sourceHeight: number,
  qualityClass: HomeHeroQualityClass,
  motionMode: HomeHeroMotionMode,
  sourceNote: string,
  audit: Partial<Pick<HomeHeroAsset, "view" | "isHeroApproved" | "isExactReference" | "rejectionReason">> = {},
): HomeHeroAsset => {
  const normalizedPath = orbitNormalizedAssetPath(path);
  return {
    path: normalizedPath,
    src: normalizedPath,
    width: 1700,
    height: 1800,
    sourceWidth,
    sourceHeight,
    qualityClass,
    motionMode,
    framePaths: [],
    frameCount: 1,
    source: path.includes("/premium/") ? "premium_candidate_asset" : "catalog_candidate_asset",
    sourceNote,
    isExactReference: audit.isExactReference ?? true,
    view: audit.view ?? "front",
    isHeroApproved: audit.isHeroApproved ?? (audit.view === undefined || audit.view === "front"),
    rejectionReason: audit.rejectionReason,
  };
};

const homeHeroScenarioDefinitions: ScenarioDefinition[] = [
  {
    id: "everyday",
    index: "01",
    title: "На каждый день",
    railTitle: "На каждый день",
    eyebrow: "Ваше время. Ваш стиль.",
    description: "Универсальные часы, которые спокойно проходят офис, прогулку и обычный ритм недели.",
    criteria: ["читаемый циферблат", "стальной браслет", "размер около 38-40 мм"],
    catalogHref: "/watches?q=PR%20100",
    backgroundWord: "РИТМ",
    accentWord: "ПОДХОДЯТ",
    sceneDescription: "В центре стоит PR 100 34mm: точная модель с чистым фронтальным asset, а PR 100 Chronograph остается в этом же сценарии как заметная альтернатива.",
    reviewNote: "Reordered within the approved four-watch set: T150.417.11.041.00 has only low-resolution central sources, so exact high-quality T150.210.11.041.00 becomes centralMain.",
    slots: [
      {
        brandName: "Tissot",
        title: "Tissot PR 100 34mm",
        shortTitle: "PR 100 34mm",
        reference: "T150.210.11.041.00",
        referenceSlug: "t1502101104100",
        slotRole: "centralMain",
        asset: candidateAsset(
          "/generated/home-hero/candidates/01-everyday/alt-01.png",
          1680,
          1680,
          "HERO_GRADE",
          "STATIC_FRONT",
          "Exact high-quality frontal PR 100 34mm candidate promoted to centralMain inside the approved everyday set.",
        ),
        specs: ["синий циферблат", "стальной браслет", "34 мм"],
        displayScale: 1,
        displayX: 0,
        displayY: 1,
        depth: 1,
        opacity: 1,
      },
      {
        brandName: "Tissot",
        title: "Tissot PR 100 Chronograph 40mm",
        shortTitle: "PR 100 Chronograph",
        reference: "T150.417.11.041.00",
        referenceSlug: "t1504171104100",
        slotRole: "alternativeLeft",
        asset: candidateAsset(
          "/generated/home-hero/candidates/01-everyday/secondary-01.png",
          800,
          800,
          "ALTERNATIVE_GRADE",
          "PARALLAX_ONLY",
          "Exact PR 100 Chronograph asset kept as alternative because it is readable but not safe for central enlargement.",
        ),
        specs: ["синий циферблат", "хронограф", "сталь"],
        displayScale: 0.58,
        displayX: -34,
        displayY: 3,
        depth: 3,
        opacity: 0.34,
      },
      {
        brandName: "Casio",
        title: "Casio Edifice Automatic",
        shortTitle: "Edifice Automatic",
        reference: "EFK-100D-2A",
        referenceSlug: "efk100d2a",
        slotRole: "alternativeRight",
        asset: candidateAsset(
          "/generated/home-hero/candidates/04-first-mechanical/main-01.png",
          920,
          1500,
          "ALTERNATIVE_GRADE",
          "PARALLAX_ONLY",
          "Confirmed Edifice automatic image; used small because it is not strict enough for the largest central role.",
        ),
        specs: ["автомат", "синий циферблат", "стальной браслет"],
        displayScale: 0.48,
        displayX: 31,
        displayY: 3,
        depth: 4,
        opacity: 0.42,
      },
      {
        brandName: "Tissot",
        title: "Tissot Classic Dream 40mm",
        shortTitle: "Classic Dream",
        reference: "T129.410.11.053.00",
        referenceSlug: "t1294101105300",
        slotRole: "alternativeRear",
        asset: finalAsset("t1294101105300", "frame-02.png", 320, 320, "FRAME_ONLY", "STATIC_FRONT", [], {
          sourceNote: "Front-only replacement for the rejected Classic Dream side-view frame-01.",
        }),
        specs: ["черный циферблат", "стальной браслет", "кварц"],
        displayScale: 0.42,
        displayX: 48,
        displayY: -10,
        depth: 5,
        opacity: 0.2,
      },
    ],
  },
  {
    id: "shirt",
    index: "02",
    title: "Под рубашку",
    railTitle: "Под рубашку",
    eyebrow: "Тише, тоньше, собраннее.",
    description: "Сдержанные модели, которые не спорят с одеждой и остаются читаемыми в деловом сценарии.",
    criteria: ["чистый циферблат", "тонкий профиль", "кожа или спокойная сталь"],
    catalogHref: "/watches?q=T150.410.16.051.00",
    backgroundWord: "КЛАССИКА",
    accentWord: "СДЕРЖАННО",
    sceneDescription: "Здесь главный акцент на Tissot PR 100 40mm на черном ремешке: спокойная форма, темный циферблат и понятный профиль под манжету.",
    reviewNote: "Central asset is the approved high-quality catalog candidate for T150.410.16.051.00.",
    slots: [
      {
        brandName: "Tissot",
        title: "Tissot PR 100 40mm",
        shortTitle: "PR 100 40mm",
        reference: "T150.410.16.051.00",
        referenceSlug: "t1504101605100",
        slotRole: "centralMain",
        asset: candidateAsset(
          "/generated/home-hero/candidates/02-under-shirt/main-01.png",
          1680,
          1680,
          "HERO_GRADE",
          "STATIC_FRONT",
          "Approved high-quality frontal PR 100 shirt scenario asset.",
        ),
        specs: ["черный циферблат", "кожаный ремешок", "40 мм"],
        displayScale: 0.96,
        displayX: 0,
        displayY: 1,
        depth: 1,
        opacity: 1,
      },
      {
        brandName: "Orient",
        title: "Orient Bambino 38",
        shortTitle: "Bambino 38",
        reference: "RA-AC0M03S10B",
        referenceSlug: "raac0m03s10b",
        slotRole: "alternativeLeft",
        asset: finalAsset("raac0m03s10b", "frame-01.png", 320, 480, "FRAME_ONLY", "STATIC_FRONT"),
        specs: ["светлый циферблат", "кожаный ремешок", "автомат"],
        displayScale: 0.5,
        displayX: -32,
        displayY: 1,
        depth: 3,
        opacity: 0.36,
      },
      {
        brandName: "Tissot",
        title: "Tissot Classic Dream 40mm",
        shortTitle: "Classic Dream",
        reference: "T129.410.11.053.00",
        referenceSlug: "t1294101105300",
        slotRole: "alternativeRight",
        asset: finalAsset("t1294101105300", "frame-02.png", 320, 320, "FRAME_ONLY", "STATIC_FRONT"),
        specs: ["черный циферблат", "стальной браслет", "40 мм"],
        displayScale: 0.48,
        displayX: 32,
        displayY: 3,
        depth: 4,
        opacity: 0.42,
      },
      {
        brandName: "Tissot",
        title: "Tissot PR 100 34mm",
        shortTitle: "PR 100 34mm",
        reference: "T150.210.11.041.00",
        referenceSlug: "t1502101104100",
        slotRole: "alternativeRear",
        asset: candidateAsset(
          "/generated/home-hero/candidates/01-everyday/alt-01.png",
          1680,
          1680,
          "HERO_GRADE",
          "PARALLAX_ONLY",
          "High-quality frontal PR 100 34mm candidate reused as a rear small alternative.",
        ),
        specs: ["синий циферблат", "стальной браслет", "34 мм"],
        displayScale: 0.36,
        displayX: 47,
        displayY: -10,
        depth: 5,
        opacity: 0.2,
      },
    ],
  },
  {
    id: "travel",
    index: "03",
    title: "Для путешествий",
    railTitle: "Для путешествий",
    eyebrow: "Надежность в дороге.",
    description: "Часы для смены города, воды, маршрута и расписания, когда важна читаемость и запас прочности.",
    criteria: ["водозащита", "читаемость", "прочность корпуса"],
    catalogHref: "/watches?q=Seastar%201000",
    backgroundWord: "ДВИЖЕНИЕ",
    accentWord: "ГОТОВЫ",
    sceneDescription: "Tissot Seastar 1000 Chronograph получает главный размер сцены: из пользовательского ZIP есть high-res фронтальный кадр.",
    reviewNote: "T120.417.11.041.03 frame-03 is a high-resolution final user-supplied frame and is allowed as central main.",
    slots: [
      {
        brandName: "Tissot",
        title: "Tissot Seastar 1000 Chronograph 45.5mm",
        shortTitle: "Seastar Chronograph",
        reference: "T120.417.11.041.03",
        referenceSlug: "t1204171104103",
        slotRole: "centralMain",
        asset: finalAsset("t1204171104103", "frame-03.png", 1275, 1700, "HERO_GRADE", "STATIC_FRONT", [
          "/generated/home-hero/final/t1204171104103/frame-01.png",
          "/generated/home-hero/final/t1204171104103/frame-02.png",
          "/generated/home-hero/final/t1204171104103/frame-03.png",
        ]),
        specs: ["синий циферблат", "хронограф", "стальной браслет"],
        displayScale: 1,
        displayX: 0,
        displayY: 1,
        depth: 1,
        opacity: 1,
      },
      {
        brandName: "Casio",
        title: "Casio G-Shock",
        shortTitle: "G-Shock",
        reference: "GBD-H1000-1A4",
        referenceSlug: "gbdh10001a4",
        slotRole: "alternativeLeft",
        asset: finalAsset("gbdh10001a4", "frame-01.png", 320, 320, "FRAME_ONLY", "STATIC_FRONT"),
        specs: ["черно-оранжевый корпус", "датчики", "спорт"],
        displayScale: 0.46,
        displayX: -33,
        displayY: 3,
        depth: 3,
        opacity: 0.38,
      },
      {
        brandName: "Orient",
        title: "Orient Mako 40",
        shortTitle: "Mako 40",
        reference: "RA-AC0Q03S10B",
        referenceSlug: "raac0q03s10b",
        slotRole: "alternativeRight",
        asset: finalAsset("raac0q03s10b", "frame-01.png", 320, 480, "FRAME_ONLY", "STATIC_FRONT"),
        specs: ["светлый циферблат", "стальной браслет", "автомат"],
        displayScale: 0.5,
        displayX: 33,
        displayY: 1,
        depth: 4,
        opacity: 0.42,
      },
      {
        brandName: "Tissot",
        title: "Tissot Seastar 1000 Chronograph 45.5mm",
        shortTitle: "Seastar Black",
        reference: "T120.417.17.051.02",
        referenceSlug: "t1204171705102",
        slotRole: "alternativeRear",
        asset: finalAsset("t1204171705102", "frame-02.png", 320, 480, "FRAME_ONLY", "STATIC_FRONT", [], {
          sourceNote: "Front-only replacement for rejected side-view Seastar Black frame-01.",
        }),
        specs: ["черный циферблат", "черный ремешок", "хронограф"],
        displayScale: 0.4,
        displayX: 48,
        displayY: -10,
        depth: 5,
        opacity: 0.2,
      },
    ],
  },
  {
    id: "first-mechanical",
    index: "04",
    title: "Первая механика",
    railTitle: "Первая механика",
    eyebrow: "Вход в механику без шума.",
    description: "Понятные автоматические модели, где виден смысл механики и нет лишней театральности.",
    criteria: ["автоматический механизм", "универсальный размер", "понятная посадка"],
    catalogHref: "/watches?q=automatic",
    backgroundWord: "МЕХАНИЗМ",
    accentWord: "ДВИЖЕНИЕ",
    sceneDescription: "Casio Edifice Automatic остается главным смысловым выбором; крупная сцена использует лучший доступный реальный asset без искусственного skew.",
    reviewNote: "EFK-100D-2A final frames are low-res; the older catalog candidate is the safest available large visual but is classified as ALTERNATIVE_GRADE.",
    slots: [
      {
        brandName: "Casio",
        title: "Casio Edifice Automatic",
        shortTitle: "Edifice Automatic",
        reference: "EFK-100D-2A",
        referenceSlug: "efk100d2a",
        slotRole: "centralMain",
        asset: candidateAsset(
          "/generated/home-hero/candidates/04-first-mechanical/main-01.png",
          920,
          1500,
          "ALTERNATIVE_GRADE",
          "PARALLAX_ONLY",
          "Best available real Edifice asset; allowed central with explicit quality review note because final frames are too small.",
        ),
        specs: ["автомат", "синий циферблат", "стальной браслет"],
        displayScale: 0.9,
        displayX: 0,
        displayY: 1,
        depth: 1,
        opacity: 1,
      },
      {
        brandName: "Orient",
        title: "Orient Bambino 38",
        shortTitle: "Bambino 38",
        reference: "RA-AC0M03S10B",
        referenceSlug: "raac0m03s10b",
        slotRole: "alternativeLeft",
        asset: finalAsset("raac0m03s10b", "frame-02.png", 320, 480, "FRAME_ONLY", "STATIC_FRONT"),
        specs: ["светлый циферблат", "кожа", "автомат"],
        displayScale: 0.48,
        displayX: -33,
        displayY: 3,
        depth: 3,
        opacity: 0.38,
      },
      {
        brandName: "Orient",
        title: "Orient Mako 40",
        shortTitle: "Mako 40",
        reference: "RA-AC0Q03S10B",
        referenceSlug: "raac0q03s10b",
        slotRole: "alternativeRight",
        asset: finalAsset("raac0q03s10b", "frame-01.png", 320, 480, "FRAME_ONLY", "STATIC_FRONT", [], {
          sourceNote: "Front-only Mako frame selected; frame-02 is held out of normal hero because it reads as side-view.",
        }),
        specs: ["светлый циферблат", "стальной браслет", "автомат"],
        displayScale: 0.48,
        displayX: 33,
        displayY: 2,
        depth: 4,
        opacity: 0.42,
      },
      {
        brandName: "Tissot",
        title: "Tissot PRX Powermatic 80 40mm",
        shortTitle: "PRX Powermatic",
        reference: "T137.407.11.041.00",
        referenceSlug: "t1374071104100",
        slotRole: "alternativeRear",
        asset: finalAsset("t1374071104100", "frame-03.png", 270, 320, "FRAME_ONLY", "STATIC_FRONT", [], {
          sourceNote: "Front-only PRX blue frame selected; side-view frames remain rejected for normal hero.",
        }),
        specs: ["синий циферблат", "стальной браслет", "Powermatic 80"],
        displayScale: 0.4,
        displayX: 48,
        displayY: -10,
        depth: 5,
        opacity: 0.2,
      },
    ],
  },
  {
    id: "sport",
    index: "05",
    title: "Для спорта",
    railTitle: "Для спорта",
    eyebrow: "Функция и запас прочности.",
    description: "Модели, которые спокойно переживают воду, нагрузку и активный день без хрупкости.",
    criteria: ["водозащита", "быстрое считывание", "защищенный корпус"],
    catalogHref: "/watches?q=G-Shock%20Seastar",
    backgroundWord: "ЭНЕРГИЯ",
    accentWord: "НАДЕЖНО",
    sceneDescription: "В центре спортивного сценария Seastar Chronograph с точным high-res фронтальным asset; low-resolution Seastar 40mm остается в наборе как малая альтернатива.",
    reviewNote: "Reordered within the approved sport set: T120.807.33.051.00 has only low-resolution final frames, so exact high-quality T120.417.11.041.03 becomes centralMain.",
    slots: [
      {
        brandName: "Tissot",
        title: "Tissot Seastar 1000 Chronograph 45.5mm",
        shortTitle: "Seastar Chronograph",
        reference: "T120.417.11.041.03",
        referenceSlug: "t1204171104103",
        slotRole: "centralMain",
        asset: finalAsset("t1204171104103", "frame-03.png", 1275, 1700, "HERO_GRADE", "STATIC_FRONT"),
        specs: ["синий циферблат", "хронограф", "сталь"],
        displayScale: 1,
        displayX: 0,
        displayY: 1,
        depth: 1,
        opacity: 1,
      },
      {
        brandName: "Tissot",
        title: "Tissot Seastar 1000 40mm",
        shortTitle: "Seastar 1000",
        reference: "T120.807.33.051.00",
        referenceSlug: "t1208073305100",
        slotRole: "alternativeLeft",
        asset: finalAsset("t1208073305100", "frame-01.png", 180, 320, "FRAME_ONLY", "STATIC_FRONT"),
        specs: ["дайверская логика", "зеленый акцент", "стальной браслет"],
        displayScale: 0.46,
        displayX: -33,
        displayY: 2,
        depth: 3,
        opacity: 0.38,
      },
      {
        brandName: "Casio",
        title: "Casio G-Shock MT-G",
        shortTitle: "G-Shock MT-G",
        reference: "MTG-B3000DN-1A",
        referenceSlug: "mtgb3000dn1a",
        slotRole: "alternativeRight",
        asset: candidateAsset(
          "/generated/home-hero/candidates/05-sport/alt-01.png",
          2000,
          2000,
          "ALTERNATIVE_GRADE",
          "PARALLAX_ONLY",
          "Existing MT-G candidate; no invented final orbit frames because no final MTG ZIP was supplied.",
        ),
        specs: ["защита", "металл", "акцент"],
        displayScale: 0.46,
        displayX: 33,
        displayY: 2,
        depth: 4,
        opacity: 0.42,
      },
      {
        brandName: "Casio",
        title: "Casio G-Shock",
        shortTitle: "G-Shock",
        reference: "GBD-H1000-1A4",
        referenceSlug: "gbdh10001a4",
        slotRole: "alternativeRear",
        asset: finalAsset("gbdh10001a4", "frame-01.png", 320, 320, "FRAME_ONLY", "STATIC_FRONT", [], {
          sourceNote: "Front-only G-Shock frame selected for normal hero.",
        }),
        specs: ["датчики", "ударопрочность", "спорт"],
        displayScale: 0.4,
        displayX: 48,
        displayY: -10,
        depth: 5,
        opacity: 0.2,
      },
    ],
  },
  {
    id: "next-collection",
    index: "06",
    title: "Следующее дополнение в коллекцию",
    railTitle: "В коллекцию",
    eyebrow: "Когда база уже есть.",
    description: "Часы с характером: другой металл, интегрированный браслет или новая роль в коллекции.",
    criteria: ["отличается от базы", "сильная форма", "есть отдельный сценарий носки"],
    catalogHref: "/watches?q=PRX%20Powermatic",
    backgroundWord: "ХАРАКТЕР",
    accentWord: "ХАРАКТЕР",
    sceneDescription: "Золотой PRX Powermatic получает центральную роль: из финального ZIP есть high-res кадры для аккуратного motion frame set.",
    reviewNote: "T137.407.33.051.00 has two high-resolution final frames; MTG remains a non-orbit small alternative because no final MTG ZIP was supplied.",
    slots: [
      {
        brandName: "Tissot",
        title: "Tissot PRX Powermatic 80 40mm Gold",
        shortTitle: "PRX Powermatic Gold",
        reference: "T137.407.33.051.00",
        referenceSlug: "t1374073305100",
        slotRole: "centralMain",
        asset: finalAsset("t1374073305100", "frame-02.png", 917, 1500, "HERO_GRADE", "ORBIT_FRAME_SET", [
          "/generated/home-hero/final/t1374073305100/frame-01.png",
          "/generated/home-hero/final/t1374073305100/frame-02.png",
        ]),
        specs: ["золотой корпус", "черный циферблат", "Powermatic 80"],
        displayScale: 1,
        displayX: 0,
        displayY: 1,
        depth: 1,
        opacity: 1,
      },
      {
        brandName: "Tissot",
        title: "Tissot PRX Powermatic 80 40mm Blue",
        shortTitle: "PRX Powermatic Blue",
        reference: "T137.407.11.041.00",
        referenceSlug: "t1374071104100",
        slotRole: "alternativeLeft",
        asset: finalAsset("t1374071104100", "frame-03.png", 270, 320, "FRAME_ONLY", "STATIC_FRONT", [], {
          sourceNote: "Front-only PRX blue frame selected; side-view frames remain rejected for normal hero.",
        }),
        specs: ["синий циферблат", "стальной браслет", "Powermatic 80"],
        displayScale: 0.48,
        displayX: -33,
        displayY: 2,
        depth: 3,
        opacity: 0.38,
      },
      {
        brandName: "Casio",
        title: "Casio G-Shock MT-G",
        shortTitle: "G-Shock MT-G",
        reference: "MTG-B3000DN-1A",
        referenceSlug: "mtgb3000dn1a",
        slotRole: "alternativeRight",
        asset: candidateAsset(
          "/generated/home-hero/candidates/06-collection/alt-01.png",
          2000,
          2000,
          "ALTERNATIVE_GRADE",
          "PARALLAX_ONLY",
          "Exact MT-G candidate restored as a visible collection alternative; no final orbit frames are invented.",
        ),
        specs: ["металл", "защита", "акцент"],
        displayScale: 0.44,
        displayX: 33,
        displayY: 2,
        depth: 4,
        opacity: 0.42,
      },
      {
        brandName: "Tissot",
        title: "Tissot Seastar 1000 Chronograph 45.5mm",
        shortTitle: "Seastar Black",
        reference: "T120.417.17.051.02",
        referenceSlug: "t1204171705102",
        slotRole: "alternativeRear",
        asset: finalAsset("t1204171705102", "frame-02.png", 320, 480, "FRAME_ONLY", "STATIC_FRONT"),
        specs: ["черный циферблат", "черный ремешок", "хронограф"],
        displayScale: 0.4,
        displayX: 48,
        displayY: -10,
        depth: 5,
        opacity: 0.2,
      },
    ],
  },
];

export const homeScenarioDefinitions = homeHeroScenarioDefinitions;

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
  return homeHeroScenarioDefinitions.map((definition) => {
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
  [-2]: { x: 5, y: 58, scale: 0.34, opacity: 0.12, blur: 1, z: 5, shadowY: 0.42, shadowBlur: 0.62, shadowOpacity: 0.012 },
  [-1]: { x: 24, y: 55, scale: 0.66, opacity: 0.48, blur: 0.24, z: 25, shadowY: 0.86, shadowBlur: 1.08, shadowOpacity: 0.052 },
  [0]: { x: 54, y: 50, scale: 1.08, opacity: 1, blur: 0, z: 60, shadowY: 1.95, shadowBlur: 2.45, shadowOpacity: 0.18 },
  [1]: { x: 75, y: 48, scale: 0.72, opacity: 0.58, blur: 0.18, z: 38, shadowY: 0.92, shadowBlur: 1.18, shadowOpacity: 0.062 },
  [2]: { x: 90, y: 42, scale: 0.52, opacity: 0.4, blur: 0.46, z: 23, shadowY: 0.62, shadowBlur: 0.9, shadowOpacity: 0.034 },
  [3]: { x: 101, y: 36, scale: 0.38, opacity: 0.25, blur: 0.82, z: 12, shadowY: 0.42, shadowBlur: 0.68, shadowOpacity: 0.018 },
  [4]: { x: 114, y: 30, scale: 0.24, opacity: 0, blur: 1.35, z: 4, shadowY: 0.3, shadowBlur: 0.5, shadowOpacity: 0 },
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

import * as XLSX from "xlsx";
import { catalogReferenceAliases } from "@/modules/catalog/application/catalog-reference-aliases";
import { normalizeManufacturerReference, referenceSlugFromNormalized } from "@/modules/catalog/domain/reference-normalization";
import type {
  CatalogPublicSpecification,
  CatalogSpecificationGroup,
  CatalogWatchDetail,
} from "@/modules/catalog/domain/read-models";

export const masterCharacteristicsApplyConfirmationPhrase = "APPLY_ETERNAL_TIME_MASTER_CHARACTERISTICS";

export type MasterBrandSlug = "orient" | "citizen" | "tissot" | "casio" | "seiko";

export type MasterWorkbookSource = {
  brandSlug: MasterBrandSlug;
  sourceFile: string;
};

export type MasterFunctionRow = {
  reference: string;
  referenceNormalized: string;
  functionCode: string;
  displayNameRu: string;
  value: boolean;
};

export type MasterSeoRow = {
  reference: string;
  referenceNormalized: string;
  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  overview: string | null;
  sourceUrl: string | null;
};

export type MasterProductRow = {
  sourceFile: string;
  sourceRowNumber: number;
  brandSlug: MasterBrandSlug;
  brand: string;
  referenceDisplay: string;
  referenceNormalized: string;
  lookupReferenceNormalizedCandidates: string[];
  displayNameCurrent: string | null;
  model: string | null;
  collection: string | null;
  line: string | null;
  genderPositioning: string | null;
  movementFamily: string | null;
  winding: string | null;
  movementTechnology: string | null;
  caliber: string | null;
  mechanicalPowerReserveHours: number | null;
  fullChargeRuntimeMonths: number | null;
  batteryLifeYears: number | null;
  powerReserveRaw: string | null;
  powerSource: string | null;
  accuracyRaw: string | null;
  caseMaterial: string | null;
  caseWidthMm: number | null;
  caseDiameterMm: number | null;
  caseLengthMm: number | null;
  caseThicknessMm: number | null;
  lugToLugMm: number | null;
  caseShape: string | null;
  caseCoating: string | null;
  dialColor: string | null;
  displayType: string | null;
  hourMarkers: string | null;
  lumePresent: string | null;
  lumeType: string | null;
  crystalMaterial: string | null;
  crystalRaw: string | null;
  antiReflective: string | null;
  antiReflectiveType: string | null;
  bandType: string | null;
  bandMaterial: string | null;
  claspType: string | null;
  lugWidthMm: number | null;
  waterResistanceM: number | null;
  waterResistanceAtm: number | null;
  waterResistanceRaw: string | null;
  sizeClass: string | null;
  sourceUrl: string | null;
  liveProductUrl: string | null;
  photoAction: string | null;
  officialPhotoUrl: string | null;
};

export type ParsedMasterWorkbook = {
  sourceFile: string;
  brandSlug: MasterBrandSlug;
  sheetNames: string[];
  products: MasterProductRow[];
  functions: MasterFunctionRow[];
  seo: MasterSeoRow[];
  dictionaryRows: Record<string, unknown>[];
  summaryRows: Record<string, unknown>[];
  warnings: string[];
};

export type MasterImportPatch = {
  brandSlug: MasterBrandSlug;
  sourceFile: string;
  referenceDisplay: string;
  referenceNormalized: string;
  lookupReferenceNormalized: string;
  lookupReferenceNormalizedCandidates: string[];
  referenceSlug: string;
  specifications: CatalogPublicSpecification[];
  keySpecifications: CatalogPublicSpecification[];
  seo: MasterSeoRow | null;
  photoAction: string | null;
};

type SpecDefinition = {
  label: string;
  group: CatalogSpecificationGroup;
};

export const masterSpecificationDefinitions: Record<string, SpecDefinition> = {
  movement_family_raw: { label: "Семейство механизма", group: "mechanism" },
  movement_type_raw: { label: "Тип механизма", group: "mechanism" },
  caliber_raw: { label: "Калибр", group: "mechanism" },
  power_source_raw: { label: "Питание", group: "mechanism" },
  power_reserve_raw: { label: "Запас хода", group: "mechanism" },
  full_charge_runtime_raw: { label: "Работа от полного заряда", group: "mechanism" },
  battery_life_raw: { label: "Срок службы батареи", group: "mechanism" },
  accuracy_raw: { label: "Точность хода", group: "mechanism" },
  case_material_raw: { label: "Материал корпуса", group: "case" },
  case_shape_raw: { label: "Форма корпуса", group: "case" },
  case_coating_raw: { label: "Покрытие корпуса", group: "case" },
  case_width_raw: { label: "Ширина корпуса", group: "dimensions" },
  case_diameter_raw: { label: "Диаметр корпуса", group: "dimensions" },
  case_length_raw: { label: "Длина корпуса", group: "dimensions" },
  case_thickness_raw: { label: "Толщина корпуса", group: "dimensions" },
  lug_to_lug_raw: { label: "От ушка до ушка", group: "dimensions" },
  strap_width_raw: { label: "Ширина крепления", group: "strap" },
  display_raw: { label: "Индикация", group: "mechanism" },
  dial_color_raw: { label: "Цвет циферблата", group: "dial" },
  dial_markers_raw: { label: "Индексы", group: "dial" },
  luminescence_raw: { label: "Люминесценция", group: "dial" },
  crystal_type_raw: { label: "Стекло", group: "glass" },
  anti_reflective_raw: { label: "Антибликовое покрытие", group: "glass" },
  attachment_material_raw: { label: "Ремешок или браслет", group: "strap" },
  strap_material_raw: { label: "Ремешок", group: "strap" },
  bracelet_material_raw: { label: "Браслет", group: "strap" },
  clasp_raw: { label: "Застёжка", group: "strap" },
  water_resistance_raw: { label: "Водозащита", group: "water_resistance" },
  functions_raw: { label: "Функции", group: "functions" },
  watch_type_raw: { label: "Тип часов", group: "other" },
  source_url_raw: { label: "Источник характеристик", group: "other" },
};

export const masterSpecificationOrder = [
  "movement_family_raw",
  "movement_type_raw",
  "caliber_raw",
  "power_source_raw",
  "power_reserve_raw",
  "full_charge_runtime_raw",
  "battery_life_raw",
  "accuracy_raw",
  "display_raw",
  "case_material_raw",
  "case_shape_raw",
  "case_coating_raw",
  "case_width_raw",
  "case_diameter_raw",
  "case_length_raw",
  "case_thickness_raw",
  "lug_to_lug_raw",
  "dial_color_raw",
  "dial_markers_raw",
  "luminescence_raw",
  "crystal_type_raw",
  "anti_reflective_raw",
  "attachment_material_raw",
  "strap_material_raw",
  "bracelet_material_raw",
  "strap_width_raw",
  "clasp_raw",
  "water_resistance_raw",
  "functions_raw",
  "watch_type_raw",
  "source_url_raw",
] as const;

const keySpecificationPriority = [
  "movement_type_raw",
  "case_material_raw",
  "water_resistance_raw",
  "crystal_type_raw",
  "case_width_raw",
  "case_diameter_raw",
  "dial_color_raw",
] as const;

const prohibitedPublicSpecificationKeys = new Set([
  "case_color_raw",
  "band_color_raw",
  "strap_color_raw",
  "bracelet_color_raw",
  "visual_positioning",
  "visual_positioning_raw",
]);

const requiredProductHeaders = [
  "brand",
  "reference",
  "reference_normalized",
  "movement_family",
  "case_material",
  "dial_color",
  "crystal_material",
  "band_type",
  "band_material",
  "water_resistance_m",
  "size_class",
] as const;

const enumLabels: Record<string, string> = {
  mechanical: "Механические",
  quartz: "Кварцевые",
  solar: "Солнечные",
  digital: "Цифровые",
  hybrid: "Гибридные",
  other: "Другое",
  unknown: "Не подтверждено",
  automatic: "автоматический завод",
  manual: "ручной завод",
  automatic_and_manual: "автоматический и ручной завод",
  EcoDrive: "Eco-Drive",
  "Eco-Drive": "Eco-Drive",
  tough_solar: "Tough Solar",
  mainspring: "пружинный механизм",
  battery: "батарея",
  solar_cell: "солнечный элемент",
  solar_rechargeable_cell: "солнечный аккумулятор",
  stainless_steel: "нержавеющая сталь",
  stainless_steel_316l: "нержавеющая сталь 316L",
  titanium: "титан",
  ceramic: "керамика",
  leather: "кожа",
  rubber: "каучук",
  silicone: "силикон",
  textile: "текстиль",
  carbon: "карбон",
  sapphire: "сапфировое",
  mineral: "минеральное",
  hardlex: "Hardlex",
  acrylic: "акриловое",
  hesalite: "Hesalite",
  resin: "полимерное",
  resin_glass: "полимерное",
  bio_based_resin: "биополимер",
  bracelet: "браслет",
  strap: "ремешок",
  integrated: "интегрированный браслет",
  analog: "аналоговая",
  analog_digital: "аналогово-цифровая",
  ana_digi: "аналогово-цифровая",
  lcd: "LCD",
  arabic: "арабские цифры",
  indexes: "индексы",
  baton: "метки-батоны",
  roman: "римские цифры",
  lumi_brite: "LumiBrite",
  neobrite: "Neobrite",
  super_luminova: "Super-LumiNova",
  pin_buckle: "классическая пряжка",
  three_fold_clasp: "тройная раскладывающаяся застёжка",
  mens: "мужские",
  womens: "женские",
  unisex: "унисекс",
  black: "чёрный",
  white: "белый",
  silver: "серебристый",
  blue: "синий",
  navy: "тёмно-синий",
  light_blue: "голубой",
  green: "зелёный",
  cream: "кремовый",
  beige: "бежевый",
  ivory: "айвори",
  gold: "золотистый",
  yellow: "жёлтый",
  champagne: "шампань",
  pink: "розовый",
  red: "красный",
  orange: "оранжевый",
  brown: "коричневый",
  gray: "серый",
  grey: "серый",
  mother_of_pearl: "перламутр",
  mother_of_pearl_blue: "синий перламутр",
  mother_of_pearl_pink: "розовый перламутр",
  dark_blue: "тёмно-синий",
  turquoise: "бирюзовый",
  round: "круглый",
  octagonal: "восьмиугольный",
  drop_shaped: "каплевидный",
  buckle: "пряжка",
  deployant_push_button: "раскладывающаяся застёжка с кнопками",
  double_push_butterfly: "застёжка-бабочка с кнопками",
  double_push_three_fold: "тройная застёжка с двумя кнопками",
  fold_over_push_button: "раскладывающаяся застёжка с кнопкой",
  safety_folding_buckle: "раскладывающаяся застёжка с фиксатором",
  sliding: "скользящая застёжка",
  trifold_push_button: "тройная застёжка с кнопками",
  folding_clasp: "раскладывающаяся застёжка",
  fold_over_clasp: "раскладывающаяся застёжка",
  fold_over: "раскладывающаяся застёжка",
  hook_buckle: "крючковая застёжка",
};

function cellText(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  const text = String(value).normalize("NFKC").trim();
  return text ? text : null;
}

function cellNumber(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function cellBoolean(row: Record<string, unknown>, key: string): boolean {
  const value = row[key];
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const text = String(value ?? "").trim().toLowerCase();
  return text === "true" || text === "yes" || text === "1";
}

function displayEnum(value: string | null): string | null {
  if (!value) return null;
  return enumLabels[value] ?? value;
}

function formatMm(value: number | null): string | null {
  if (value === null) return null;
  return `${String(value).replace(".", ",")} мм`;
}

function formatHours(value: number | null): string | null {
  if (value === null) return null;
  return `${String(value).replace(".", ",")} ч`;
}

function formatMonths(value: number | null): string | null {
  if (value === null) return null;
  return `${String(value).replace(".", ",")} мес.`;
}

function formatYears(value: number | null): string | null {
  if (value === null) return null;
  return `${String(value).replace(".", ",")} лет`;
}

function normalizeReferenceForBrand(brandSlug: MasterBrandSlug, raw: string): string {
  const normalized = normalizeManufacturerReference(raw);
  const alias = catalogReferenceAliases.find(
    (candidate) => candidate.brandSlug === brandSlug && candidate.fromReferenceNormalized === normalized,
  );
  return alias?.toReferenceNormalized ?? normalized;
}

function referenceDisplayForBrand(brandSlug: MasterBrandSlug, rawDisplay: string, normalized: string): string {
  const alias = catalogReferenceAliases.find(
    (candidate) => candidate.brandSlug === brandSlug && candidate.toReferenceNormalized === normalized,
  );
  return alias?.toReferenceDisplay ?? rawDisplay;
}

function lookupReferenceCandidatesForBrand(brandSlug: MasterBrandSlug, row: Record<string, unknown>): string[] {
  const rawCandidates = [
    cellText(row, "reference_live"),
    cellText(row, "reference"),
    cellText(row, "reference_normalized"),
  ].filter((value): value is string => Boolean(value));
  const normalized = rawCandidates.map((value) => normalizeManufacturerReference(value));
  const aliasCandidates = catalogReferenceAliases
    .filter((alias) => alias.brandSlug === brandSlug && normalized.includes(alias.toReferenceNormalized))
    .flatMap((alias) => [alias.fromReferenceNormalized, alias.toReferenceNormalized]);

  return [...new Set([...normalized, ...aliasCandidates])].filter(Boolean);
}

function sheetRows(workbook: XLSX.WorkBook, sheetName: string): Record<string, unknown>[] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
}

function validateProductHeaders(workbook: XLSX.WorkBook, sourceFile: string): string[] {
  const sheet = workbook.Sheets.Products;
  if (!sheet) return ["Missing Products sheet."];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  const headers = new Set((rows[0] ?? []).map((value) => String(value).trim()).filter(Boolean));
  return requiredProductHeaders
    .filter((header) => !headers.has(header))
    .map((header) => `${sourceFile}: Products sheet is missing required header ${header}.`);
}

export function parseMasterWorkbook(input: MasterWorkbookSource): ParsedMasterWorkbook {
  const workbook = XLSX.readFile(input.sourceFile);
  const warnings = validateProductHeaders(workbook, input.sourceFile);
  const products = sheetRows(workbook, "Products").flatMap((row, index): MasterProductRow[] => {
    const rawReference = cellText(row, "reference_normalized") ?? cellText(row, "reference") ?? cellText(row, "reference_live");
    if (!rawReference) return [];
    const referenceNormalized = normalizeReferenceForBrand(input.brandSlug, rawReference);
    const rawDisplay = cellText(row, "reference") ?? cellText(row, "reference_live") ?? rawReference;
    const brand = cellText(row, "brand") ?? input.brandSlug;
    const product: MasterProductRow = {
      sourceFile: input.sourceFile,
      sourceRowNumber: index + 2,
      brandSlug: input.brandSlug,
      brand,
      referenceDisplay: referenceDisplayForBrand(input.brandSlug, rawDisplay, referenceNormalized),
      referenceNormalized,
      lookupReferenceNormalizedCandidates: lookupReferenceCandidatesForBrand(input.brandSlug, row),
      displayNameCurrent: cellText(row, "display_name_current"),
      model: cellText(row, "model"),
      collection: cellText(row, "collection"),
      line: cellText(row, "line"),
      genderPositioning: cellText(row, "gender_positioning"),
      movementFamily: cellText(row, "movement_family"),
      winding: cellText(row, "winding"),
      movementTechnology: cellText(row, "movement_technology"),
      caliber: cellText(row, "caliber"),
      mechanicalPowerReserveHours: cellNumber(row, "mechanical_power_reserve_hours") ?? cellNumber(row, "power_reserve_hours"),
      fullChargeRuntimeMonths: cellNumber(row, "full_charge_runtime_months"),
      batteryLifeYears: cellNumber(row, "battery_life_years"),
      powerReserveRaw: cellText(row, "power_reserve_raw"),
      powerSource: cellText(row, "power_source"),
      accuracyRaw: cellText(row, "accuracy_raw"),
      caseMaterial: cellText(row, "case_material"),
      caseWidthMm: cellNumber(row, "case_width_mm"),
      caseDiameterMm: cellNumber(row, "case_diameter_mm"),
      caseLengthMm: cellNumber(row, "case_length_mm"),
      caseThicknessMm: cellNumber(row, "case_thickness_mm"),
      lugToLugMm: cellNumber(row, "lug_to_lug_mm"),
      caseShape: cellText(row, "case_shape"),
      caseCoating: cellText(row, "case_coating"),
      dialColor: cellText(row, "dial_color"),
      displayType: cellText(row, "display_type"),
      hourMarkers: cellText(row, "hour_markers"),
      lumePresent: cellText(row, "lume_present"),
      lumeType: cellText(row, "lume_type"),
      crystalMaterial: cellText(row, "crystal_material"),
      crystalRaw: cellText(row, "crystal_raw"),
      antiReflective: cellText(row, "anti_reflective"),
      antiReflectiveType: cellText(row, "anti_reflective_type"),
      bandType: cellText(row, "band_type"),
      bandMaterial: cellText(row, "band_material"),
      claspType: cellText(row, "clasp_type"),
      lugWidthMm: cellNumber(row, "lug_width_mm"),
      waterResistanceM: cellNumber(row, "water_resistance_m"),
      waterResistanceAtm: cellNumber(row, "water_resistance_atm"),
      waterResistanceRaw: cellText(row, "water_resistance_raw"),
      sizeClass: cellText(row, "size_class"),
      sourceUrl: cellText(row, "official_source_url") ?? cellText(row, "source_url"),
      liveProductUrl: cellText(row, "live_product_url"),
      photoAction: cellText(row, "photo_action"),
      officialPhotoUrl: cellText(row, "official_photo_url") ?? cellText(row, "official_photo_page_url"),
    };
    return [product];
  });

  const functions = sheetRows(workbook, "Functions").flatMap((row): MasterFunctionRow[] => {
    const reference = cellText(row, "reference");
    const displayNameRu = cellText(row, "display_name_ru");
    if (!reference || !displayNameRu) return [];
    return [{
      reference,
      referenceNormalized: normalizeReferenceForBrand(input.brandSlug, reference),
      functionCode: cellText(row, "function_code") ?? "",
      displayNameRu,
      value: cellBoolean(row, "value"),
    }];
  });

  const seo = sheetRows(workbook, "SEO").flatMap((row): MasterSeoRow[] => {
    const reference = cellText(row, "reference");
    if (!reference) return [];
    return [{
      reference,
      referenceNormalized: normalizeReferenceForBrand(input.brandSlug, reference),
      title: cellText(row, "title"),
      metaDescription: cellText(row, "meta_description"),
      canonical: cellText(row, "canonical"),
      overview: cellText(row, "overview"),
      sourceUrl: cellText(row, "official_source_url") ?? cellText(row, "source_url"),
    }];
  });

  return {
    sourceFile: input.sourceFile,
    brandSlug: input.brandSlug,
    sheetNames: workbook.SheetNames,
    products,
    functions,
    seo,
    dictionaryRows: sheetRows(workbook, "Dictionary"),
    summaryRows: sheetRows(workbook, "Summary"),
    warnings,
  };
}

function addSpec(specifications: CatalogPublicSpecification[], key: string, value: string | null | undefined): void {
  if (!value) return;
  if (prohibitedPublicSpecificationKeys.has(key)) return;
  const definition = masterSpecificationDefinitions[key];
  if (!definition) return;
  const normalizedValue = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!normalizedValue) return;
  specifications.push({ key, label: definition.label, value: normalizedValue, group: definition.group });
}

function movementTypeDisplay(product: MasterProductRow): string | null {
  if (product.movementFamily === "solar" || /eco-?drive/i.test(product.movementTechnology ?? "")) {
    return product.movementTechnology === "Eco-Drive"
      ? "Eco-Drive (солнечная зарядка)"
      : "Солнечный механизм";
  }

  const family = displayEnum(product.movementFamily);
  if (!family || family === "Не подтверждено") return null;
  const winding = product.movementFamily === "mechanical" ? displayEnum(product.winding) : null;
  return winding && winding !== "Не подтверждено" ? `${family}, ${winding}` : family;
}

function waterResistanceDisplay(product: MasterProductRow): string | null {
  if (product.waterResistanceRaw) return product.waterResistanceRaw.replace(/bar/gi, "бар").replace(/m\b/gi, "м");
  if (product.waterResistanceM !== null && product.waterResistanceAtm !== null) {
    return `${product.waterResistanceM} м (${product.waterResistanceAtm} бар)`;
  }
  if (product.waterResistanceM !== null) return `${product.waterResistanceM} м`;
  return null;
}

function bandDisplay(product: MasterProductRow): { attachment: string | null; strap: string | null; bracelet: string | null } {
  const material = displayEnum(product.bandMaterial);
  const type = displayEnum(product.bandType);
  if (!material && !type) return { attachment: null, strap: null, bracelet: null };
  const attachment = [type, material].filter(Boolean).join(", ");
  if (product.bandType === "strap") return { attachment, strap: material, bracelet: null };
  if (product.bandType === "bracelet" || product.bandType === "integrated") return { attachment, strap: null, bracelet: material };
  return { attachment, strap: null, bracelet: null };
}

function crystalDisplay(product: MasterProductRow): string | null {
  const material = displayEnum(product.crystalMaterial);
  if (!material && !product.crystalRaw) return null;
  if (!product.crystalRaw) return material;
  if (!material) return product.crystalRaw;
  const raw = product.crystalRaw.normalize("NFKC").trim();
  return raw.toLocaleLowerCase("ru").includes(String(product.crystalMaterial).toLocaleLowerCase("ru")) ? material : `${material} (${raw})`;
}

function luminescenceDisplay(product: MasterProductRow): string | null {
  if (product.lumePresent === null && !product.lumeType) return null;
  if (product.lumePresent === "false" || product.lumePresent === "0") return null;
  return displayEnum(product.lumeType) ?? "есть";
}

export function buildMasterSpecifications(input: {
  product: MasterProductRow;
  functions: MasterFunctionRow[];
}): CatalogPublicSpecification[] {
  const product = input.product;
  const specs: CatalogPublicSpecification[] = [];
  const band = bandDisplay(product);
  const functionLabels = input.functions
    .filter((row) => row.referenceNormalized === product.referenceNormalized && row.value)
    .map((row) => row.displayNameRu)
    .filter((label, index, all) => all.indexOf(label) === index);

  addSpec(specs, "movement_family_raw", displayEnum(product.movementFamily));
  addSpec(specs, "movement_type_raw", movementTypeDisplay(product));
  addSpec(specs, "caliber_raw", product.caliber);
  addSpec(specs, "power_source_raw", displayEnum(product.powerSource));
  if (product.movementFamily === "mechanical") {
    addSpec(specs, "power_reserve_raw", product.powerReserveRaw ?? formatHours(product.mechanicalPowerReserveHours));
  }
  if (product.movementFamily === "solar" || /eco-?drive/i.test(product.movementTechnology ?? "")) {
    addSpec(specs, "full_charge_runtime_raw", formatMonths(product.fullChargeRuntimeMonths));
  }
  if (product.movementFamily !== "mechanical") {
    addSpec(specs, "battery_life_raw", formatYears(product.batteryLifeYears));
  }
  addSpec(specs, "accuracy_raw", product.accuracyRaw);
  addSpec(specs, "display_raw", displayEnum(product.displayType));
  addSpec(specs, "case_material_raw", displayEnum(product.caseMaterial));
  addSpec(specs, "case_shape_raw", displayEnum(product.caseShape));
  addSpec(specs, "case_coating_raw", displayEnum(product.caseCoating));
  addSpec(specs, "case_width_raw", formatMm(product.caseWidthMm));
  addSpec(specs, "case_diameter_raw", formatMm(product.caseDiameterMm));
  addSpec(specs, "case_length_raw", formatMm(product.caseLengthMm));
  addSpec(specs, "case_thickness_raw", formatMm(product.caseThicknessMm));
  addSpec(specs, "lug_to_lug_raw", formatMm(product.lugToLugMm));
  addSpec(specs, "dial_color_raw", displayEnum(product.dialColor));
  addSpec(specs, "dial_markers_raw", displayEnum(product.hourMarkers));
  addSpec(specs, "luminescence_raw", luminescenceDisplay(product));
  addSpec(specs, "crystal_type_raw", crystalDisplay(product));
  addSpec(specs, "anti_reflective_raw", displayEnum(product.antiReflectiveType) ?? displayEnum(product.antiReflective));
  addSpec(specs, "attachment_material_raw", band.attachment);
  addSpec(specs, "strap_material_raw", band.strap);
  addSpec(specs, "bracelet_material_raw", band.bracelet);
  addSpec(specs, "strap_width_raw", formatMm(product.lugWidthMm));
  addSpec(specs, "clasp_raw", displayEnum(product.claspType));
  addSpec(specs, "water_resistance_raw", waterResistanceDisplay(product));
  addSpec(specs, "functions_raw", functionLabels.length > 0 ? functionLabels.join(", ") : null);
  addSpec(specs, "watch_type_raw", displayEnum(product.genderPositioning));
  addSpec(specs, "source_url_raw", product.sourceUrl);

  const ordered = new Map(specs.map((specification) => [specification.key, specification]));
  return masterSpecificationOrder.flatMap((key) => {
    const specification = ordered.get(key);
    return specification ? [specification] : [];
  });
}

export function buildMasterKeySpecifications(specifications: CatalogPublicSpecification[]): CatalogPublicSpecification[] {
  const byKey = new Map(specifications.map((specification) => [specification.key, specification]));
  const picked: CatalogPublicSpecification[] = [];
  const pickedGroups = new Set<CatalogSpecificationGroup>();

  for (const key of keySpecificationPriority) {
    const specification = byKey.get(key);
    if (specification && !pickedGroups.has(specification.group)) {
      picked.push(specification);
      pickedGroups.add(specification.group);
    }
    if (picked.length === 3) break;
  }

  return picked;
}

export function buildMasterImportPatches(workbooks: ParsedMasterWorkbook[]): MasterImportPatch[] {
  return workbooks.flatMap((workbook) => {
    const seoByReference = new Map(workbook.seo.map((row) => [row.referenceNormalized, row]));
    return workbook.products.map((product) => {
      const specifications = buildMasterSpecifications({ product, functions: workbook.functions });
      return {
        brandSlug: product.brandSlug,
        sourceFile: product.sourceFile,
        referenceDisplay: product.referenceDisplay,
        referenceNormalized: product.referenceNormalized,
        lookupReferenceNormalized:
          product.lookupReferenceNormalizedCandidates.find((candidate) => candidate !== product.referenceNormalized) ??
          product.referenceNormalized,
        lookupReferenceNormalizedCandidates: product.lookupReferenceNormalizedCandidates,
        referenceSlug: referenceSlugFromNormalized(product.referenceNormalized),
        specifications,
        keySpecifications: buildMasterKeySpecifications(specifications),
        seo: seoByReference.get(product.referenceNormalized) ?? null,
        photoAction: product.photoAction,
      };
    });
  });
}

export function applyMasterPatchToWatch(watch: CatalogWatchDetail, patch: MasterImportPatch): CatalogWatchDetail {
  const watchWithoutSeo = { ...watch } as CatalogWatchDetail & { seoOverlay?: unknown };
  delete watchWithoutSeo.seoOverlay;
  const alias = catalogReferenceAliases.find(
    (candidate) => candidate.brandSlug === patch.brandSlug && candidate.toReferenceNormalized === patch.referenceNormalized,
  );
  const replaceAliasReference = (value: string | null): string | null => {
    if (!value || !alias) return value;
    return value.split(alias.fromReferenceDisplay).join(alias.toReferenceDisplay);
  };
  const replaceAliasReferenceInImage = (image: CatalogWatchDetail["primaryImage"]): CatalogWatchDetail["primaryImage"] => {
    if (image.kind === "none" || !alias) return image;
    return {
      ...image,
      alt: replaceAliasReference(image.alt) ?? image.alt,
    };
  };
  const next: CatalogWatchDetail = {
    ...watchWithoutSeo,
    id: `${patch.brandSlug}/${patch.referenceSlug}`,
    href: `/watches/${patch.brandSlug}/${patch.referenceSlug}`,
    title: replaceAliasReference(watch.title) ?? watch.title,
    officialName: replaceAliasReference(watch.officialName),
    watchModelName: replaceAliasReference(watch.watchModelName) ?? watch.watchModelName,
    referenceDisplay: patch.referenceDisplay,
    referenceNormalized: patch.referenceNormalized,
    referenceSlug: patch.referenceSlug,
    primaryImage: replaceAliasReferenceInImage(watch.primaryImage),
    imageGallery: watch.imageGallery.map(replaceAliasReferenceInImage),
    specifications: patch.specifications,
    keySpecifications: patch.keySpecifications,
  };

  return next;
}

export function attachMasterSiblingReferences(watches: CatalogWatchDetail[]): CatalogWatchDetail[] {
  return watches.map((watch) => ({
    ...watch,
    siblingReferences: watches
      .filter(
        (sibling) =>
          sibling.id !== watch.id &&
          sibling.brandSlug === watch.brandSlug &&
          sibling.watchModelName === watch.watchModelName,
      )
      .sort((left, right) => left.referenceSlug.localeCompare(right.referenceSlug))
      .slice(0, 8)
      .map((sibling) => ({
        id: sibling.id,
        href: sibling.href,
        title: sibling.title,
        referenceDisplay: sibling.referenceDisplay,
        referenceNormalized: sibling.referenceNormalized,
        referenceSlug: sibling.referenceSlug,
        publicPrice: sibling.publicPrice,
        primaryImage: sibling.primaryImage,
      })),
  }));
}

export function countProhibitedSpecifications(specifications: CatalogPublicSpecification[]): number {
  return specifications.filter((specification) => prohibitedPublicSpecificationKeys.has(specification.key)).length;
}

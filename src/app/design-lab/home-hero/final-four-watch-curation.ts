export type FinalHomeHeroScenarioId = "01" | "02" | "03" | "04" | "05" | "06";

export type FinalHomeHeroSlotRole =
  | "centralMain"
  | "alternativeLeft"
  | "alternativeRight"
  | "alternativeBack";

export type FinalHomeHeroAssetReadiness =
  | "ready"
  | "needs_high_resolution_front_source"
  | "needs_strict_front_source"
  | "needs_hero_asset"
  | "needs_catalog_confirmation"
  | "blocked_by_scenario_rule";

export type FinalHomeHeroMotionRole = {
  scaleRange: readonly [number, number];
  opacityRange: readonly [number, number];
  mouseOffsetPx: readonly [number, number];
  zIndex: "highest" | "side" | "back";
};

export type FinalHomeHeroWatchSlot = {
  role: FinalHomeHeroSlotRole;
  requestedWatch: string;
  brand: "Tissot" | "Casio" | "Orient";
  model: string;
  variant: string;
  reference: string;
  referenceSlug: string | null;
  publicPriceRub: number | null;
  assetPath: string | null;
  candidateManifestPath: string | null;
  sourcePackage: string | null;
  actualZipEntry: string | null;
  remoteImageUrl: string | null;
  sourceLongSidePx: number | null;
  photoView: "front" | "front/perspective" | "perspective" | null;
  assetReadiness: FinalHomeHeroAssetReadiness;
  issues: readonly string[];
  motionRole: FinalHomeHeroMotionRole;
};

export type FinalHomeHeroScenarioCuration = {
  id: FinalHomeHeroScenarioId;
  title: string;
  slug: string;
  shortLabel: string;
  curationNote: string;
  scenarioIssues?: readonly string[];
  slots: readonly [
    FinalHomeHeroWatchSlot,
    FinalHomeHeroWatchSlot,
    FinalHomeHeroWatchSlot,
    FinalHomeHeroWatchSlot,
  ];
};

export const finalHomeHeroCandidateManifestPath =
  "public/generated/home-hero/candidates/home-hero-candidate-manifest.json";

export const finalHomeHeroReferenceImagePath =
  "C:/Users/Sergey/Downloads/ChatGPT Image 16 июл. 2026 г., 01_17_25.png";

const candidateRoot = "/generated/home-hero/candidates";

const motionByRole: Record<FinalHomeHeroSlotRole, FinalHomeHeroMotionRole> = {
  centralMain: {
    scaleRange: [1, 1],
    opacityRange: [1, 1],
    mouseOffsetPx: [12, 18],
    zIndex: "highest",
  },
  alternativeLeft: {
    scaleRange: [0.55, 0.68],
    opacityRange: [0.28, 0.48],
    mouseOffsetPx: [18, 26],
    zIndex: "side",
  },
  alternativeRight: {
    scaleRange: [0.5, 0.64],
    opacityRange: [0.25, 0.42],
    mouseOffsetPx: [20, 30],
    zIndex: "side",
  },
  alternativeBack: {
    scaleRange: [0.36, 0.5],
    opacityRange: [0.12, 0.28],
    mouseOffsetPx: [8, 14],
    zIndex: "back",
  },
};

function slot(
  role: FinalHomeHeroSlotRole,
  data: Omit<FinalHomeHeroWatchSlot, "role" | "motionRole">,
): FinalHomeHeroWatchSlot {
  return {
    role,
    motionRole: motionByRole[role],
    ...data,
  };
}

const noHeroAsset = {
  assetPath: null,
  candidateManifestPath: null,
  sourcePackage: null,
  actualZipEntry: null,
  remoteImageUrl: null,
  sourceLongSidePx: null,
  photoView: null,
} as const;

export const finalHomeHeroScenarios: readonly FinalHomeHeroScenarioCuration[] = [
  {
    id: "01",
    title: "На каждый день",
    slug: "01-everyday",
    shortLabel: "Ритм",
    curationNote:
      "User-confirmed target curation with article codes. PR 100 Chronograph leads the daily story; exact Classic Dream T129 asset still needs confirmation.",
    slots: [
      slot("centralMain", {
        requestedWatch: "Tissot PR 100 Chronograph 40mm, blue dial, steel bracelet",
        brand: "Tissot",
        model: "PR 100 Chronograph 40mm",
        variant: "blue dial, steel bracelet",
        reference: "T150.417.11.041.00",
        referenceSlug: "t1504171104100",
        publicPriceRub: 45678,
        assetPath: `${candidateRoot}/01-everyday/secondary-01.png`,
        candidateManifestPath: finalHomeHeroCandidateManifestPath,
        sourcePackage: "tissot_for_it_package_v8_more_photos.zip",
        actualZipEntry: "images/Tissot/T150.417.11.041.00/T150.417.11.041.00_1.webp",
        remoteImageUrl: null,
        sourceLongSidePx: 800,
        photoView: "front",
        assetReadiness: "needs_high_resolution_front_source",
        issues: ["confirmed_target_reference", "source_long_side_below_1200"],
      }),
      slot("alternativeLeft", {
        requestedWatch: "Tissot Classic Dream 40mm, black dial, steel bracelet",
        brand: "Tissot",
        model: "Classic Dream 40mm",
        variant: "black dial, steel bracelet",
        reference: "T129.410.11.053.00",
        referenceSlug: null,
        publicPriceRub: null,
        ...noHeroAsset,
        assetReadiness: "needs_catalog_confirmation",
        issues: [
          "target_reference_found_only_inside_pair_set",
          "no_single_watch_hero_manifest_asset",
          "do_not_substitute_t1584071105100",
        ],
      }),
      slot("alternativeRight", {
        requestedWatch: "Casio Edifice Automatic EFK-100D-2A, blue dial, steel bracelet",
        brand: "Casio",
        model: "Edifice Automatic",
        variant: "blue dial, steel bracelet",
        reference: "EFK-100D-2A",
        referenceSlug: "efk100d2a",
        publicPriceRub: 31213,
        assetPath: `${candidateRoot}/04-first-mechanical/main-01.png`,
        candidateManifestPath: finalHomeHeroCandidateManifestPath,
        sourcePackage: "casio_for_it_latest_with_photos_repacked (1).zip",
        actualZipEntry: "images/Casio/EFK-100D-2A/EFK-100D-2A_1.jpg",
        remoteImageUrl: null,
        sourceLongSidePx: 1500,
        photoView: "front/perspective",
        assetReadiness: "needs_strict_front_source",
        issues: ["confirmed_target_reference", "candidate_manifest_marks_photo_view_as_front_perspective"],
      }),
      slot("alternativeBack", {
        requestedWatch: "Tissot PR 100 34mm, blue dial, steel bracelet",
        brand: "Tissot",
        model: "PR 100 34mm",
        variant: "blue dial, steel bracelet",
        reference: "T150.210.11.041.00",
        referenceSlug: "t1502101104100",
        publicPriceRub: 38000,
        assetPath: `${candidateRoot}/01-everyday/alt-01.png`,
        candidateManifestPath: finalHomeHeroCandidateManifestPath,
        sourcePackage: "tissot_for_it_package_v8_more_photos.zip",
        actualZipEntry: "images/Tissot/T150.210.11.041.00/T150.210.11.041.00_1.webp",
        remoteImageUrl: null,
        sourceLongSidePx: 1680,
        photoView: "front",
        assetReadiness: "ready",
        issues: [],
      }),
    ],
  },
  {
    id: "02",
    title: "Под рубашку",
    slug: "02-under-shirt",
    shortLabel: "Классика",
    curationNote:
      "User-confirmed target curation with article codes. Leather PR 100 is ready; Bambino S10B and Classic Dream T129 need catalog/asset confirmation.",
    slots: [
      slot("centralMain", {
        requestedWatch: "Tissot PR 100 40mm, black dial, black leather strap",
        brand: "Tissot",
        model: "PR 100 40mm",
        variant: "black dial, black leather strap",
        reference: "T150.410.16.051.00",
        referenceSlug: "t1504101605100",
        publicPriceRub: 38000,
        assetPath: `${candidateRoot}/02-under-shirt/main-01.png`,
        candidateManifestPath: finalHomeHeroCandidateManifestPath,
        sourcePackage: "tissot_for_it_package_v8_more_photos.zip",
        actualZipEntry: "images/Tissot/T150.410.16.051.00/T150.410.16.051.00_1.webp",
        remoteImageUrl: null,
        sourceLongSidePx: 1680,
        photoView: "front",
        assetReadiness: "ready",
        issues: [],
      }),
      slot("alternativeLeft", {
        requestedWatch: "Orient Bambino 38, light dial, leather strap",
        brand: "Orient",
        model: "Bambino 38",
        variant: "light dial, leather strap",
        reference: "RA-AC0M03S10B",
        referenceSlug: null,
        publicPriceRub: null,
        ...noHeroAsset,
        assetReadiness: "needs_catalog_confirmation",
        issues: ["target_reference_not_found_in_current_preview_or_hero_manifest", "do_not_substitute_raac0m03s30b"],
      }),
      slot("alternativeRight", {
        requestedWatch: "Tissot Classic Dream 40mm, black dial, steel bracelet",
        brand: "Tissot",
        model: "Classic Dream 40mm",
        variant: "black dial, steel bracelet",
        reference: "T129.410.11.053.00",
        referenceSlug: null,
        publicPriceRub: null,
        ...noHeroAsset,
        assetReadiness: "needs_catalog_confirmation",
        issues: [
          "target_reference_found_only_inside_pair_set",
          "no_single_watch_hero_manifest_asset",
          "do_not_substitute_t1584071105100",
        ],
      }),
      slot("alternativeBack", {
        requestedWatch: "Tissot PR 100 34mm, blue dial, steel bracelet",
        brand: "Tissot",
        model: "PR 100 34mm",
        variant: "blue dial, steel bracelet",
        reference: "T150.210.11.041.00",
        referenceSlug: "t1502101104100",
        publicPriceRub: 38000,
        assetPath: `${candidateRoot}/02-under-shirt/secondary-01.png`,
        candidateManifestPath: finalHomeHeroCandidateManifestPath,
        sourcePackage: "tissot_for_it_package_v8_more_photos.zip",
        actualZipEntry: "images/Tissot/T150.210.11.041.00/T150.210.11.041.00_1.webp",
        remoteImageUrl: null,
        sourceLongSidePx: 1680,
        photoView: "front",
        assetReadiness: "ready",
        issues: [],
      }),
    ],
  },
  {
    id: "03",
    title: "Для путешествий",
    slug: "03-travel",
    shortLabel: "Дорога",
    curationNote:
      "User-confirmed target curation with article codes. Requested Seastar and Mako references are not in current prepared hero sources.",
    slots: [
      slot("centralMain", {
        requestedWatch: "Tissot Seastar 1000 Chronograph 45.5mm, blue dial, steel bracelet",
        brand: "Tissot",
        model: "Seastar 1000 Chronograph 45.5mm",
        variant: "blue dial, steel bracelet",
        reference: "T120.417.11.041.03",
        referenceSlug: null,
        publicPriceRub: null,
        ...noHeroAsset,
        assetReadiness: "needs_catalog_confirmation",
        issues: ["target_reference_not_found_in_current_preview_or_hero_manifest", "do_not_substitute_t1204171104101"],
      }),
      slot("alternativeLeft", {
        requestedWatch: "Casio G-Shock GBD-H1000-1A4, black-orange case",
        brand: "Casio",
        model: "G-Shock GBD-H1000-1A4",
        variant: "black-orange case",
        reference: "GBD-H1000-1A4",
        referenceSlug: "gbdh10001a4",
        publicPriceRub: 60000,
        assetPath: `${candidateRoot}/03-travel/alt-01.png`,
        candidateManifestPath: finalHomeHeroCandidateManifestPath,
        sourcePackage: "casio_for_it_latest_with_photos_repacked (1).zip",
        actualZipEntry: "images/Casio/GBD-H1000-1A4/GBD-H1000-1A4_2.png",
        remoteImageUrl: null,
        sourceLongSidePx: 490,
        photoView: "front",
        assetReadiness: "needs_high_resolution_front_source",
        issues: ["confirmed_target_reference", "source_long_side_below_1200"],
      }),
      slot("alternativeRight", {
        requestedWatch: "Orient Mako 40, light dial, steel bracelet",
        brand: "Orient",
        model: "Mako 40",
        variant: "light dial, steel bracelet",
        reference: "RA-AC0Q03S10B",
        referenceSlug: null,
        publicPriceRub: null,
        ...noHeroAsset,
        assetReadiness: "needs_catalog_confirmation",
        issues: ["target_reference_not_found_in_current_preview_or_hero_manifest"],
      }),
      slot("alternativeBack", {
        requestedWatch: "Tissot Seastar 1000 Chronograph 45.5mm, black dial, black strap",
        brand: "Tissot",
        model: "Seastar 1000 Chronograph 45.5mm",
        variant: "black dial, black strap",
        reference: "T120.417.17.051.02",
        referenceSlug: null,
        publicPriceRub: null,
        ...noHeroAsset,
        assetReadiness: "needs_catalog_confirmation",
        issues: ["target_reference_not_found_in_current_preview_or_hero_manifest", "do_not_substitute_t1204171705103"],
      }),
    ],
  },
  {
    id: "04",
    title: "Первая механика",
    slug: "04-first-mechanical",
    shortLabel: "Механика",
    curationNote:
      "User-confirmed target curation with article codes. EFK is available but needs strict front; PRX blue exists in catalog preview but needs a hero asset.",
    slots: [
      slot("centralMain", {
        requestedWatch: "Casio Edifice Automatic EFK-100D-2A, blue dial, steel bracelet",
        brand: "Casio",
        model: "Edifice Automatic",
        variant: "blue dial, steel bracelet",
        reference: "EFK-100D-2A",
        referenceSlug: "efk100d2a",
        publicPriceRub: 31213,
        assetPath: `${candidateRoot}/04-first-mechanical/main-01.png`,
        candidateManifestPath: finalHomeHeroCandidateManifestPath,
        sourcePackage: "casio_for_it_latest_with_photos_repacked (1).zip",
        actualZipEntry: "images/Casio/EFK-100D-2A/EFK-100D-2A_1.jpg",
        remoteImageUrl: null,
        sourceLongSidePx: 1500,
        photoView: "front/perspective",
        assetReadiness: "needs_strict_front_source",
        issues: ["confirmed_target_reference", "candidate_manifest_marks_photo_view_as_front_perspective"],
      }),
      slot("alternativeLeft", {
        requestedWatch: "Orient Bambino 38, light dial, leather strap",
        brand: "Orient",
        model: "Bambino 38",
        variant: "light dial, leather strap",
        reference: "RA-AC0M03S10B",
        referenceSlug: null,
        publicPriceRub: null,
        ...noHeroAsset,
        assetReadiness: "needs_catalog_confirmation",
        issues: ["target_reference_not_found_in_current_preview_or_hero_manifest", "do_not_substitute_raac0m03s30b"],
      }),
      slot("alternativeRight", {
        requestedWatch: "Orient Mako 40, light dial, steel bracelet",
        brand: "Orient",
        model: "Mako 40",
        variant: "light dial, steel bracelet",
        reference: "RA-AC0Q03S10B",
        referenceSlug: null,
        publicPriceRub: null,
        ...noHeroAsset,
        assetReadiness: "needs_catalog_confirmation",
        issues: ["target_reference_not_found_in_current_preview_or_hero_manifest"],
      }),
      slot("alternativeBack", {
        requestedWatch: "Tissot PRX Powermatic 80 40mm, blue dial, steel bracelet",
        brand: "Tissot",
        model: "PRX Powermatic 80 40mm",
        variant: "blue dial, steel bracelet",
        reference: "T137.407.11.041.00",
        referenceSlug: "t1374071104100",
        publicPriceRub: 78000,
        ...noHeroAsset,
        assetReadiness: "needs_hero_asset",
        issues: ["target_reference_exists_in_catalog_preview", "not_present_in_current_image_plan_or_hero_manifest"],
      }),
    ],
  },
  {
    id: "05",
    title: "Для спорта",
    slug: "05-sport",
    shortLabel: "Спорт",
    curationNote:
      "User-confirmed target curation with article codes. The green Seastar code exists in catalog preview but needs a prepared hero asset and color confirmation.",
    slots: [
      slot("centralMain", {
        requestedWatch: "Tissot Seastar 1000 40mm, green dial, black PVD bracelet and case",
        brand: "Tissot",
        model: "Seastar 1000 40mm",
        variant: "green dial, black PVD bracelet and case",
        reference: "T120.807.33.051.00",
        referenceSlug: "t1208073305100",
        publicPriceRub: 85000,
        ...noHeroAsset,
        assetReadiness: "needs_hero_asset",
        issues: [
          "target_reference_exists_in_catalog_preview",
          "not_present_in_current_image_plan_or_hero_manifest",
          "green_black_pvd_variant_needs_visual_confirmation",
          "do_not_substitute_t1204103309100",
        ],
      }),
      slot("alternativeLeft", {
        requestedWatch: "Casio G-Shock GBD-H1000-1A4",
        brand: "Casio",
        model: "G-Shock GBD-H1000-1A4",
        variant: "black-orange case",
        reference: "GBD-H1000-1A4",
        referenceSlug: "gbdh10001a4",
        publicPriceRub: 60000,
        assetPath: `${candidateRoot}/05-sport/secondary-01.png`,
        candidateManifestPath: finalHomeHeroCandidateManifestPath,
        sourcePackage: "casio_for_it_latest_with_photos_repacked (1).zip",
        actualZipEntry: "images/Casio/GBD-H1000-1A4/GBD-H1000-1A4_2.png",
        remoteImageUrl: null,
        sourceLongSidePx: 490,
        photoView: "front",
        assetReadiness: "needs_high_resolution_front_source",
        issues: ["confirmed_target_reference", "source_long_side_below_1200"],
      }),
      slot("alternativeRight", {
        requestedWatch: "Casio G-Shock MT-G MTG-B3000DN-1A",
        brand: "Casio",
        model: "G-Shock MT-G",
        variant: "premium sport case",
        reference: "MTG-B3000DN-1A",
        referenceSlug: "mtgb3000dn1a",
        publicPriceRub: 100000,
        assetPath: `${candidateRoot}/05-sport/alt-01.png`,
        candidateManifestPath: finalHomeHeroCandidateManifestPath,
        sourcePackage: "casio_for_it_latest_with_photos_repacked (1).zip",
        actualZipEntry: "images/Casio/MTG-B3000DN-1A/MTG-B3000DN-1A_1.png",
        remoteImageUrl: null,
        sourceLongSidePx: 2000,
        photoView: "perspective",
        assetReadiness: "needs_strict_front_source",
        issues: ["confirmed_target_reference", "mtg_allowed_in_sport", "candidate_manifest_marks_photo_view_as_perspective"],
      }),
      slot("alternativeBack", {
        requestedWatch: "Tissot Seastar 1000 Chronograph 45.5mm, blue dial, steel bracelet",
        brand: "Tissot",
        model: "Seastar 1000 Chronograph 45.5mm",
        variant: "blue dial, steel bracelet",
        reference: "T120.417.11.041.03",
        referenceSlug: null,
        publicPriceRub: null,
        ...noHeroAsset,
        assetReadiness: "needs_catalog_confirmation",
        issues: ["target_reference_not_found_in_current_preview_or_hero_manifest", "do_not_substitute_t1204171104101"],
      }),
    ],
  },
  {
    id: "06",
    title: "В коллекцию",
    slug: "06-collection",
    shortLabel: "Премиум",
    curationNote:
      "User-confirmed target curation with article codes. PRX gold is available but low-res; PRX blue needs a hero asset; MT-G remains blocked by the previous sport-only rule.",
    scenarioIssues: ["requested_mtg_slot_conflicts_with_mtg_only_sport_rule"],
    slots: [
      slot("centralMain", {
        requestedWatch: "Tissot PRX Powermatic 80 40mm Gold, gold case and bracelet, black dial",
        brand: "Tissot",
        model: "PRX Powermatic 80 40mm Gold",
        variant: "gold case and bracelet, black dial",
        reference: "T137.407.33.051.00",
        referenceSlug: "t1374073305100",
        publicPriceRub: 101010,
        assetPath: `${candidateRoot}/06-collection/main-01.png`,
        candidateManifestPath: finalHomeHeroCandidateManifestPath,
        sourcePackage: "tissot_for_it_package_v8_more_photos.zip",
        actualZipEntry: null,
        remoteImageUrl:
          "https://www.tissotwatches.com/dw/image/v2/BKKD_PRD/on/demandware.static/-/Sites-Tissot-Catalogue/default/dw66243f3d/product-pictures/a56e8842-e93e-482a-b6bb-fb5dc223c496_T137-407-33-051-00_Shadow-png.png?sh=800%2Cgravity%3Dcenter&sm=fit&sw=800",
        sourceLongSidePx: 800,
        photoView: "front",
        assetReadiness: "needs_high_resolution_front_source",
        issues: ["confirmed_target_reference", "source_long_side_below_1200"],
      }),
      slot("alternativeLeft", {
        requestedWatch: "Tissot PRX Powermatic 80 40mm Blue, blue dial, steel bracelet",
        brand: "Tissot",
        model: "PRX Powermatic 80 40mm Blue",
        variant: "blue dial, steel bracelet",
        reference: "T137.407.11.041.00",
        referenceSlug: "t1374071104100",
        publicPriceRub: 78000,
        ...noHeroAsset,
        assetReadiness: "needs_hero_asset",
        issues: ["target_reference_exists_in_catalog_preview", "not_present_in_current_image_plan_or_hero_manifest"],
      }),
      slot("alternativeRight", {
        requestedWatch: "Casio G-Shock MT-G MTG-B3000DN-1A",
        brand: "Casio",
        model: "G-Shock MT-G",
        variant: "premium sport case",
        reference: "MTG-B3000DN-1A",
        referenceSlug: "mtgb3000dn1a",
        publicPriceRub: 100000,
        assetPath: `${candidateRoot}/06-collection/alt-01.png`,
        candidateManifestPath: finalHomeHeroCandidateManifestPath,
        sourcePackage: "casio_for_it_latest_with_photos_repacked (1).zip",
        actualZipEntry: "images/Casio/MTG-B3000DN-1A/MTG-B3000DN-1A_1.png",
        remoteImageUrl: null,
        sourceLongSidePx: 2000,
        photoView: "perspective",
        assetReadiness: "blocked_by_scenario_rule",
        issues: ["confirmed_target_reference", "mtg_allowed_only_in_sport", "candidate_manifest_marks_photo_view_as_perspective"],
      }),
      slot("alternativeBack", {
        requestedWatch: "Tissot Seastar 1000 Chronograph 45.5mm, black dial, black strap",
        brand: "Tissot",
        model: "Seastar 1000 Chronograph 45.5mm",
        variant: "black dial, black strap",
        reference: "T120.417.17.051.02",
        referenceSlug: null,
        publicPriceRub: null,
        ...noHeroAsset,
        assetReadiness: "needs_catalog_confirmation",
        issues: ["target_reference_not_found_in_current_preview_or_hero_manifest", "do_not_substitute_t1204171705103"],
      }),
    ],
  },
];

export const finalHomeHeroFrontImageRequirements = {
  requiredView: "strict front",
  minimumLongSidePx: 1200,
  preferredLongSidePx: [1600, 2400] as const,
  outputFormat: "transparent PNG",
  forbidden: [
    "three_quarter_guessing",
    "perspective_transform",
    "skew_transform",
    "dial_deformation",
    "side_or_back_photo",
    "small_source_upscale",
    "small_photo_on_large_canvas",
    "watermark",
    "similar_reference_substitution",
  ] as const,
};

export function getFinalHomeHeroSlotsNeedingAssetWork(): FinalHomeHeroWatchSlot[] {
  return finalHomeHeroScenarios
    .flatMap((scenario) => scenario.slots)
    .filter((slotItem) => slotItem.assetReadiness !== "ready");
}

export function getFinalHomeHeroReadySlots(): FinalHomeHeroWatchSlot[] {
  return finalHomeHeroScenarios.flatMap((scenario) =>
    scenario.slots.filter((slotItem) => slotItem.assetReadiness === "ready"),
  );
}

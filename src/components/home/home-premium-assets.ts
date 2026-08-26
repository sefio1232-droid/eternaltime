export type HomepageWatchVisualConfig = {
  reference: string;
  assetPath: string;
  opticalCaseScale: number;
  xCorrection: number;
  yCorrection: number;
  heroCenterScale: number;
  heroLeftScale: number;
  heroRightScale: number;
  sectionLargeScale: number;
  sectionMediumScale: number;
  sectionSmallScale: number;
  shadowWidth: number;
  shadowOpacity: number;
};

export type HomepageWatchAssetDimensions = {
  sourceWidth: number;
  sourceHeight: number;
  generatedWidth: number;
  generatedHeight: number;
};

export const homepageWatchVisualConfigs: HomepageWatchVisualConfig[] = [
  {
    reference: "T150.410.16.051.00",
    assetPath: "/generated/homepage-premium-assets/t1504101605100.png",
    opticalCaseScale: 1,
    xCorrection: 0,
    yCorrection: 0,
    heroCenterScale: 1,
    heroLeftScale: 0.72,
    heroRightScale: 0.76,
    sectionLargeScale: 0.94,
    sectionMediumScale: 0.72,
    sectionSmallScale: 0.52,
    shadowWidth: 0.72,
    shadowOpacity: 0.18,
  },
  {
    reference: "T120.417.17.051.03",
    assetPath: "/generated/homepage-editorial-assets/tissot-seastar-t1204171705103.png",
    opticalCaseScale: 0.96,
    xCorrection: 0,
    yCorrection: 1,
    heroCenterScale: 0.98,
    heroLeftScale: 0.7,
    heroRightScale: 0.74,
    sectionLargeScale: 0.92,
    sectionMediumScale: 0.7,
    sectionSmallScale: 0.5,
    shadowWidth: 0.76,
    shadowOpacity: 0.2,
  },
  {
    reference: "T137.407.33.051.00",
    assetPath: "/generated/homepage-premium-assets/t1374073305100.png",
    opticalCaseScale: 0.98,
    xCorrection: 0,
    yCorrection: 0,
    heroCenterScale: 0.98,
    heroLeftScale: 0.7,
    heroRightScale: 0.74,
    sectionLargeScale: 0.92,
    sectionMediumScale: 0.7,
    sectionSmallScale: 0.5,
    shadowWidth: 0.72,
    shadowOpacity: 0.2,
  },
  {
    reference: "EFK-100D-2A",
    assetPath: "/generated/homepage-premium-assets/efk100d2a.png",
    opticalCaseScale: 1.02,
    xCorrection: 0,
    yCorrection: 0,
    heroCenterScale: 1,
    heroLeftScale: 0.72,
    heroRightScale: 0.76,
    sectionLargeScale: 0.94,
    sectionMediumScale: 0.72,
    sectionSmallScale: 0.52,
    shadowWidth: 0.74,
    shadowOpacity: 0.19,
  },
  {
    reference: "T150.210.11.041.00",
    assetPath: "/generated/homepage-premium-assets/t1502101104100.png",
    opticalCaseScale: 0.94,
    xCorrection: 0,
    yCorrection: 0,
    heroCenterScale: 0.96,
    heroLeftScale: 0.68,
    heroRightScale: 0.72,
    sectionLargeScale: 0.9,
    sectionMediumScale: 0.68,
    sectionSmallScale: 0.5,
    shadowWidth: 0.66,
    shadowOpacity: 0.16,
  },
  {
    reference: "T150.417.11.041.00",
    assetPath: "/generated/homepage-premium-assets/t1504171104100.png",
    opticalCaseScale: 0.98,
    xCorrection: 0,
    yCorrection: 0,
    heroCenterScale: 0.98,
    heroLeftScale: 0.7,
    heroRightScale: 0.74,
    sectionLargeScale: 0.92,
    sectionMediumScale: 0.7,
    sectionSmallScale: 0.5,
    shadowWidth: 0.72,
    shadowOpacity: 0.18,
  },
  {
    reference: "MTG-B3000DN-1A",
    assetPath: "/generated/homepage-premium-assets/mtgb3000dn1a.png",
    opticalCaseScale: 1.03,
    xCorrection: 0,
    yCorrection: 0,
    heroCenterScale: 0.98,
    heroLeftScale: 0.7,
    heroRightScale: 0.74,
    sectionLargeScale: 0.9,
    sectionMediumScale: 0.68,
    sectionSmallScale: 0.5,
    shadowWidth: 0.78,
    shadowOpacity: 0.22,
  },
];

export const homepageWatchVisualConfigByReference = Object.fromEntries(
  homepageWatchVisualConfigs.map((config) => [config.reference, config]),
) as Record<string, HomepageWatchVisualConfig>;

export const homepageWatchAssetDimensions: Record<string, HomepageWatchAssetDimensions> = {
  "T150.410.16.051.00": { sourceWidth: 796, sourceHeight: 1250, generatedWidth: 767, generatedHeight: 1220 },
  "T120.417.17.051.03": { sourceWidth: 1680, sourceHeight: 1680, generatedWidth: 1680, generatedHeight: 1680 },
  "T137.407.33.051.00": { sourceWidth: 1006, sourceHeight: 1579, generatedWidth: 954, generatedHeight: 1527 },
  "EFK-100D-2A": { sourceWidth: 1026, sourceHeight: 1606, generatedWidth: 972, generatedHeight: 1552 },
  "T150.210.11.041.00": { sourceWidth: 650, sourceHeight: 1164, generatedWidth: 626, generatedHeight: 1141 },
  "T150.417.11.041.00": { sourceWidth: 1038, sourceHeight: 1164, generatedWidth: 1014, generatedHeight: 1143 },
  "MTG-B3000DN-1A": { sourceWidth: 1065, sourceHeight: 1406, generatedWidth: 1027, generatedHeight: 1368 },
};

"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent,
  type PointerEvent,
  type TouchEvent,
} from "react";
import type { HomeScenario, HomeScenarioIndex, OrbitWatch, OrbitWatchSpec } from "@/components/home/home-scenario-model";
import {
  forwardOrbitDistance,
  getHomeWatchHref,
  orbitPresentationForDistance,
  rejectedHomeHeroAssets,
  scenarioIndexFromOrbitIndex,
  scenarioPositionFromOrbitIndex,
  shortestSignedCircularDistance,
  targetOrbitIndexForScenario,
  visibleOrbitIndexes,
  wrapOrbitIndex,
  type OrbitAnchorName,
} from "@/components/home/home-scenario-model";
import styles from "@/components/home/home-product-hero.module.css";

const AUTO_STEP_PERIOD_MS = 10000;
const MANUAL_STEP_MS = 720;
const WATCH_MANUAL_PAUSE_MS = 6200;
const SCENARIO_MANUAL_PAUSE_MS = 9000;
const FAST_TRAVEL_MAX_MS = 1650;
const SERVER_QUERY_SNAPSHOT = "review=0;motion=1";
const REVEAL_SELECTOR = "[data-home-reveal]";

type PauseReason = "manual" | "focus" | "documentHidden" | "reducedMotion" | "reviewPaused" | "dragging";
type ReferenceMode = "hidden" | "overlay" | "side-by-side";
type TravelState = "idle" | "step" | "fast-travel";

type HomeReviewMetrics = {
  absoluteContentCount: number;
  overlapViolations: number;
  overflowElements: string[];
  ctaVariants: string[];
  sectionHeights: string[];
  highestSection: string;
  watchRenderedSizes: string[];
  watchNaturalSizes: string[];
  upscaleWarnings: number;
  revealTargetCount: number;
  visibleTargetCount: number;
  activeAnimationCount: number;
  continuousMotionCount: number;
  layoutShiftScore: string;
  totalHomepageWords: number;
  bodyCopyWords: number;
  headlineWords: number;
  documentHeight: number;
  viewportHeight: number;
  viewportCount: string;
  transitionZoneHeight: number;
  totalVerticalPadding: number;
  largestEmptyGap: number;
  lateContentCount: number;
  invisibleReservedSpaceCount: number;
  lineCounts: string[];
  watchLinkCount: number;
  missingHrefWarnings: number;
  nestedInteractiveWarnings: number;
  watchLinkTargets: string[];
};

const emptyReviewMetrics: HomeReviewMetrics = {
  absoluteContentCount: 0,
  overlapViolations: 0,
  overflowElements: [],
  ctaVariants: [],
  sectionHeights: [],
  highestSection: "pending",
  watchRenderedSizes: [],
  watchNaturalSizes: [],
  upscaleWarnings: 0,
  revealTargetCount: 0,
  visibleTargetCount: 0,
  activeAnimationCount: 0,
  continuousMotionCount: 0,
  layoutShiftScore: "0.0000",
  totalHomepageWords: 0,
  bodyCopyWords: 0,
  headlineWords: 0,
  documentHeight: 0,
  viewportHeight: 0,
  viewportCount: "0.00",
  transitionZoneHeight: 0,
  totalVerticalPadding: 0,
  largestEmptyGap: 0,
  lateContentCount: 0,
  invisibleReservedSpaceCount: 0,
  lineCounts: [],
  watchLinkCount: 0,
  missingHrefWarnings: 0,
  nestedInteractiveWarnings: 0,
  watchLinkTargets: [],
};

type VisibleOrbitSlot = {
  slotName: OrbitAnchorName;
  globalIndex: number;
  distance: number;
  watch: OrbitWatch;
  style: CSSProperties;
};

const slotClassByName: Record<OrbitAnchorName, string> = {
  exitLeft: styles.exitLeft,
  left: styles.leftWatch,
  centerActive: styles.centerActive,
  right: styles.rightWatch,
  queueNear: styles.queueNear,
  queueFar: styles.queueFar,
};

const parallaxBySlot: Record<OrbitAnchorName, { x: number; y: number; invert?: boolean }> = {
  exitLeft: { x: 4, y: 3 },
  left: { x: 13, y: 8, invert: true },
  centerActive: { x: 8, y: 5 },
  right: { x: 15, y: 9 },
  queueNear: { x: 8, y: 5 },
  queueFar: { x: 5, y: 4 },
};

const scenarioDesignByIndex: Record<HomeScenarioIndex, { accent: string; secondary: string; wash: string; deep: string }> = {
  0: { accent: "#2D628D", secondary: "#C08A42", wash: "rgba(92,147,191,.22)", deep: "#173A57" },
  1: { accent: "#814B40", secondary: "#B68A6C", wash: "rgba(174,116,93,.20)", deep: "#482822" },
  2: { accent: "#176F91", secondary: "#C19A58", wash: "rgba(57,144,177,.22)", deep: "#10425A" },
  3: { accent: "#526F80", secondary: "#B88343", wash: "rgba(100,139,159,.21)", deep: "#2B4654" },
  4: { accent: "#327052", secondary: "#C88A32", wash: "rgba(75,145,103,.22)", deep: "#1B4831" },
  5: { accent: "#A36A22", secondary: "#29221C", wash: "rgba(197,140,65,.23)", deep: "#573713" },
};

const scenarioLightByIndex: Record<HomeScenarioIndex, { x: string; y: string; temperature: string; stageAccent: string }> = {
  0: { x: "-12px", y: "2px", temperature: "255 250 241", stageAccent: "92 147 191" },
  1: { x: "10px", y: "-2px", temperature: "255 244 235", stageAccent: "174 116 93" },
  2: { x: "-4px", y: "-5px", temperature: "244 252 255", stageAccent: "57 144 177" },
  3: { x: "7px", y: "1px", temperature: "247 252 255", stageAccent: "100 139 159" },
  4: { x: "-8px", y: "-3px", temperature: "246 255 249", stageAccent: "75 145 103" },
  5: { x: "12px", y: "3px", temperature: "255 244 222", stageAccent: "197 140 65" },
};

const scenarioWordLayoutByIndex: Record<
  HomeScenarioIndex,
  { word: string; x: string; y: string; size: string; maxWidth: string; opacity: string; letterSpacing: string }
> = {
  0: { word: "RITM", x: "30%", y: "8%", size: "clamp(78px, 8vw, 128px)", maxWidth: "48rem", opacity: "0.12", letterSpacing: "0.01em" },
  1: { word: "CLASSIC", x: "16%", y: "9%", size: "clamp(70px, 7.2vw, 116px)", maxWidth: "52rem", opacity: "0.12", letterSpacing: "0" },
  2: { word: "MOVEMENT", x: "8%", y: "10%", size: "clamp(64px, 6.8vw, 108px)", maxWidth: "54rem", opacity: "0.12", letterSpacing: "0" },
  3: { word: "MECHANISM", x: "7%", y: "9%", size: "clamp(64px, 6.8vw, 108px)", maxWidth: "54rem", opacity: "0.12", letterSpacing: "0" },
  4: { word: "ENERGY", x: "15%", y: "9%", size: "clamp(68px, 7vw, 112px)", maxWidth: "52rem", opacity: "0.12", letterSpacing: "0" },
  5: { word: "CHARACTER", x: "9%", y: "9%", size: "clamp(64px, 6.8vw, 108px)", maxWidth: "54rem", opacity: "0.12", letterSpacing: "0" },
};

const readableScenarioSubtitlesClean = [
  "Город и выходные",
  "Под манжету",
  "В дороге",
  "Понятный старт",
  "Для движения",
  "Новый характер",
];

const scenarioDisplayByIndexClean: Record<HomeScenarioIndex, { title: string; railTitle: string; backgroundWord: string }> = {
  0: { title: "На каждый день", railTitle: "На каждый день", backgroundWord: "РИТМ" },
  1: { title: "Под рубашку", railTitle: "Под рубашку", backgroundWord: "КЛАССИКА" },
  2: { title: "Для путешествий", railTitle: "Для путешествий", backgroundWord: "ДВИЖЕНИЕ" },
  3: { title: "Первая механика", railTitle: "Первая механика", backgroundWord: "МЕХАНИЗМ" },
  4: { title: "Для спорта", railTitle: "Для спорта", backgroundWord: "ЭНЕРГИЯ" },
  5: { title: "В коллекцию", railTitle: "В коллекцию", backgroundWord: "ХАРАКТЕР" },
};

const readableSpecsByReferenceClean: Record<string, OrbitWatchSpec[]> = {
  "T150.210.11.041.00": [
    { label: "ДИАМЕТР", value: "34 ММ" },
    { label: "ЦИФЕРБЛАТ", value: "СИНИЙ" },
    { label: "БРАСЛЕТ", value: "СТАЛЬ" },
  ],
  "T150.417.11.041.00": [
    { label: "ДИАМЕТР", value: "40 ММ" },
    { label: "ФУНКЦИЯ", value: "ХРОНОГРАФ" },
    { label: "ВОДОЗАЩИТА", value: "100 М" },
  ],
  "T150.410.16.051.00": [
    { label: "ДИАМЕТР", value: "40 ММ" },
    { label: "РЕМЕШОК", value: "КОЖА" },
    { label: "ЦИФЕРБЛАТ", value: "ЧЕРНЫЙ" },
  ],
  "T120.417.11.041.03": [
    { label: "ДИАМЕТР", value: "45.5 ММ" },
    { label: "ФУНКЦИЯ", value: "ХРОНОГРАФ" },
    { label: "ВОДОЗАЩИТА", value: "300 М" },
  ],
  "EFK-100D-2A": [
    { label: "МЕХАНИЗМ", value: "АВТОМАТ" },
    { label: "ЦИФЕРБЛАТ", value: "СИНИЙ" },
    { label: "БРАСЛЕТ", value: "СТАЛЬ" },
  ],
  "T137.407.33.051.00": [
    { label: "МЕХАНИЗМ", value: "POWERMATIC" },
    { label: "КОРПУС", value: "ЗОЛОТОЙ" },
    { label: "ЗАПАС", value: "80 Ч" },
  ],
  "MTG-B3000DN-1A": [
    { label: "ЗАЩИТА", value: "MT-G" },
    { label: "КОРПУС", value: "МЕТАЛЛ" },
    { label: "РОЛЬ", value: "АКЦЕНТ" },
  ],
};

function subscribeToHeroQuery(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getHeroQuerySnapshot() {
  const params = new URLSearchParams(window.location.search);
  const review = params.get("heroReview") === "1" || params.get("homeReview") === "1" ? "1" : "0";
  const motion = params.get("heroMotion") === "0" ? "0" : "1";
  return `review=${review};motion=${motion}`;
}

function getServerHeroQuerySnapshot() {
  return SERVER_QUERY_SNAPSHOT;
}

function reviewValue(value: boolean): string {
  return value ? "on" : "off";
}

function speedFactor(speedPercent: number): number {
  return Math.max(0.25, Math.min(2, speedPercent / 100));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function easeOrbit(value: number): number {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}

function assetScaleForWatch(watch: OrbitWatch): number {
  return clamp(watch.assetScale, 0.82, 1.12);
}

function buildVisibleSlots(orbitPosition: number, orbitWatches: OrbitWatch[]): VisibleOrbitSlot[] {
  const total = orbitWatches.length;
  return orbitWatches
    .map((watch) => {
      const distance = shortestSignedCircularDistance(watch.globalIndex, orbitPosition, total);
      if (distance < -2.01 || distance > 2.01) return null;
      if (!watch.isExactReferenceAsset || !watch.isHeroApprovedAsset || watch.assetView !== "front") return null;
      const preset = orbitPresentationForDistance(distance);
      const finalScale = preset.scale * assetScaleForWatch(watch);
      return {
        slotName: preset.anchorName,
        globalIndex: watch.globalIndex,
        distance,
        watch,
        style: {
          "--orbit-x": `${preset.x}cqw`,
          "--orbit-y": `${preset.y}cqh`,
          "--orbit-final-scale": finalScale.toFixed(4),
          "--orbit-opacity": preset.opacity.toFixed(3),
          "--orbit-blur": `${preset.blur.toFixed(2)}px`,
          "--orbit-shadow-y": `${preset.shadowY.toFixed(2)}rem`,
          "--orbit-shadow-blur": `${preset.shadowBlur.toFixed(2)}rem`,
          "--orbit-shadow-opacity": preset.shadowOpacity.toFixed(3),
          zIndex: preset.z,
        } as CSSProperties,
      };
    })
    .filter((slot): slot is VisibleOrbitSlot => Boolean(slot))
    .sort((left, right) => Number(left.style.zIndex ?? 0) - Number(right.style.zIndex ?? 0));
}

function elementReviewLabel(element: HTMLElement): string {
  const identity = element.dataset.homePlacementId ?? element.dataset.homeSection ?? element.id;
  const className = typeof element.className === "string" ? element.className.split(" ").filter(Boolean)[0] : "";
  return identity || `${element.tagName.toLowerCase()}${className ? `.${className}` : ""}`;
}

function reviewRectsOverlap(left: DOMRect, right: DOMRect): boolean {
  const width = Math.min(left.right, right.right) - Math.max(left.left, right.left);
  const height = Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top);
  return width > 2 && height > 2;
}

function reviewWordCount(text: string): number {
  return text.match(/[А-Яа-яЁёA-Za-z]+(?:-[А-Яа-яЁёA-Za-z]+)*/g)?.length ?? 0;
}

function reviewLineCount(element: HTMLElement): number {
  const style = window.getComputedStyle(element);
  const lineHeight = Number.parseFloat(style.lineHeight);
  if (!Number.isFinite(lineHeight) || lineHeight <= 0) return 0;
  return Math.max(1, Math.round(element.getBoundingClientRect().height / lineHeight));
}

function collectHomeReviewMetrics(): HomeReviewMetrics {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-home-section]"));
  const heroSection = document.querySelector<HTMLElement>('[data-testid="homepage-hero"]');
  const measuredSectionElements = heroSection ? [heroSection, ...sections] : sections;
  const content = Array.from(
    document.querySelectorAll<HTMLElement>("[data-home-section] h2, [data-home-section] h3, [data-home-section] h4, [data-home-section] p, [data-home-section] a, [data-home-section] figcaption"),
  );
  const candidates = Array.from(document.querySelectorAll<HTMLElement>("body *"));
  const copyElements = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-home-copy-role], [data-home-section] h2, [data-home-section] h3, [data-home-section] h4, [data-home-section] p, [data-home-section] a, [data-home-section] figcaption',
    ),
  ).filter((element) => window.getComputedStyle(element).display !== "none");
  const bodyCopyElements = Array.from(
    document.querySelectorAll<HTMLElement>('[data-home-copy-role="body"], [data-home-reveal="body"], [data-home-reveal="caption"], [data-home-section] figcaption'),
  ).filter((element) => window.getComputedStyle(element).display !== "none");
  const headlineElements = Array.from(document.querySelectorAll<HTMLElement>('h1, [data-home-section] h2, [data-home-section] h3'));
  const watchLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>("a[data-home-watch-link]"));
  const nestedInteractiveWarnings = document.querySelectorAll("a a, a button, button a").length;

  for (const element of candidates) delete element.dataset.homeOverflowElement;
  for (const element of document.querySelectorAll<HTMLElement>("[data-home-overlap-violation]")) delete element.dataset.homeOverlapViolation;
  for (const element of document.querySelectorAll<HTMLElement>("[data-home-late-content], [data-home-invisible-reserved]")) {
    delete element.dataset.homeLateContent;
    delete element.dataset.homeInvisibleReserved;
  }

  for (const element of copyElements) element.dataset.homeCopyLength = String(reviewWordCount(element.innerText));
  for (const element of headlineElements) element.dataset.homeLineCount = String(reviewLineCount(element));

  const viewportWidth = document.documentElement.clientWidth;
  const overflowElements = candidates.filter((element) => {
    const style = window.getComputedStyle(element);
    if (style.position === "fixed" || style.display === "none") return false;
    const rect = element.getBoundingClientRect();
    const overflows = rect.width > 1 && (rect.left < -1 || rect.right > viewportWidth + 1);
    if (overflows) element.dataset.homeOverflowElement = "true";
    return overflows;
  });

  let overlapViolations = 0;
  for (const section of sections) {
    const copies = Array.from(section.querySelectorAll<HTMLElement>("[data-home-overlap-copy]"));
    const watches = Array.from(section.querySelectorAll<HTMLElement>("[data-home-overlap-watch]"));
    for (const copy of copies) {
      for (const watch of watches) {
        if (!reviewRectsOverlap(copy.getBoundingClientRect(), watch.getBoundingClientRect())) continue;
        copy.dataset.homeOverlapViolation = "true";
        watch.dataset.homeOverlapViolation = "true";
        overlapViolations += 1;
      }
    }
  }

  const watchFigures = Array.from(document.querySelectorAll<HTMLElement>("figure[data-home-placement-id], [data-home-orbit-slot]"));
  let upscaleWarnings = 0;
  const watchRenderedSizes = watchFigures.map((element) => {
    const rect = element.getBoundingClientRect();
    const image = element.querySelector<HTMLImageElement>("img");
    if (image && image.naturalWidth > 0 && (rect.width > image.naturalWidth || rect.height > image.naturalHeight)) {
      element.dataset.homeUpscaleWarning = "true";
      upscaleWarnings += 1;
    } else {
      delete element.dataset.homeUpscaleWarning;
    }
    return `${elementReviewLabel(element)} ${Math.round(rect.width)}x${Math.round(rect.height)}`;
  });

  const viewportHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  const revealTargets = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
  for (const element of revealTargets) {
    const initialOpacity = window
      .getComputedStyle(element)
      .getPropertyValue("--home-reveal-initial-opacity")
      .trim();
    element.dataset.homeInitialOpacity = initialOpacity || "1";
  }
  const lateContent = revealTargets.filter((element) => {
    const rect = element.getBoundingClientRect();
    const opacity = Number.parseFloat(window.getComputedStyle(element).opacity);
    const isLate = rect.top < viewportHeight && rect.bottom > 0 && opacity < 0.5;
    if (isLate) element.dataset.homeLateContent = "true";
    return isLate;
  });
  const invisibleReservedSpace = revealTargets.filter((element) => {
    const rect = element.getBoundingClientRect();
    const opacity = Number.parseFloat(window.getComputedStyle(element).opacity);
    const reservesSpace = rect.height > 300 && opacity < 0.5;
    if (reservesSpace) element.dataset.homeInvisibleReserved = "true";
    return reservesSpace;
  });
  const verticalPaddingTargets = measuredSectionElements.flatMap((section) => [
    section,
    ...Array.from(section.children).filter((child): child is HTMLElement => child instanceof HTMLElement),
  ]);
  const totalVerticalPadding = verticalPaddingTargets.reduce((total, element) => {
    const style = window.getComputedStyle(element);
    return total + Number.parseFloat(style.paddingTop || "0") + Number.parseFloat(style.paddingBottom || "0");
  }, 0);
  const gapCandidates = Array.from(document.querySelectorAll<HTMLElement>("[data-home-section] [data-home-reveal], [data-home-section] [data-home-watch-stage]"))
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 1 && rect.height > 1)
    .sort((left, right) => left.top - right.top);
  const largestEmptyGap = gapCandidates.reduce((largest, rect, index) => {
    const previous = gapCandidates[index - 1];
    return previous ? Math.max(largest, rect.top - previous.bottom) : largest;
  }, 0);
  const measuredSections = measuredSectionElements.map((section) => ({
    label: section.dataset.homeSection ?? (section === heroSection ? "hero" : "section"),
    height: Math.round(section.getBoundingClientRect().height),
  }));
  const highestSection = measuredSections.reduce(
    (highest, section) => (section.height > highest.height ? section : highest),
    { label: "pending", height: 0 },
  );

  return {
    absoluteContentCount: content.filter((element) => window.getComputedStyle(element).position === "absolute").length,
    overlapViolations,
    overflowElements: overflowElements.slice(0, 12).map(elementReviewLabel),
    ctaVariants: Array.from(document.querySelectorAll<HTMLElement>("[data-home-cta-variant]")).map((element) => element.dataset.homeCtaVariant ?? "unknown"),
    sectionHeights: measuredSections.map((section) => `${section.label} ${section.height}px`),
    highestSection: `${highestSection.label} ${highestSection.height}px`,
    watchRenderedSizes: watchRenderedSizes.slice(0, 18),
    watchNaturalSizes: watchFigures
      .slice(0, 18)
      .map((element) => `${elementReviewLabel(element)} ${element.dataset.homeSourceDimensions ?? element.querySelector("img")?.getAttribute("width") ?? "unknown"}`),
    upscaleWarnings,
    revealTargetCount: Number(document.documentElement.dataset.homeRevealTargetCount ?? 0),
    visibleTargetCount: Number(document.documentElement.dataset.homeVisibleTargetCount ?? 0),
    activeAnimationCount: Number(document.documentElement.dataset.homeActiveAnimationCount ?? 0),
    continuousMotionCount: Number(document.documentElement.dataset.homeContinuousMotionCount ?? 0),
    layoutShiftScore: document.documentElement.dataset.homeLayoutShiftScore ?? "0.0000",
    totalHomepageWords: copyElements.reduce((total, element) => total + reviewWordCount(element.innerText), 0),
    bodyCopyWords: bodyCopyElements.reduce((total, element) => total + reviewWordCount(element.innerText), 0),
    headlineWords: headlineElements.reduce((total, element) => total + reviewWordCount(element.innerText), 0),
    documentHeight,
    viewportHeight,
    viewportCount: viewportHeight > 0 ? (documentHeight / viewportHeight).toFixed(2) : "0.00",
    transitionZoneHeight: document.querySelectorAll('[data-home-transition="light-dark-light"]').length * 104,
    totalVerticalPadding: Math.round(totalVerticalPadding),
    largestEmptyGap: Math.max(0, Math.round(largestEmptyGap)),
    lateContentCount: lateContent.length,
    invisibleReservedSpaceCount: invisibleReservedSpace.length,
    lineCounts: headlineElements.map((element) => `${element.tagName.toLowerCase()} ${reviewLineCount(element)}`),
    watchLinkCount: watchLinks.length,
    missingHrefWarnings: document.querySelectorAll('[data-home-missing-href="true"]').length,
    nestedInteractiveWarnings,
    watchLinkTargets: watchLinks.slice(0, 32).map((link) => `${link.dataset.homeWatchLinkReference ?? "unknown"}:${link.getAttribute("href") ?? "missing"}`),
  };
}

function slotStyle(slotName: OrbitAnchorName, parallaxIntensity: number): CSSProperties {
  const parallax = parallaxBySlot[slotName];
  const direction = parallax.invert ? -1 : 1;
  return {
    "--orbit-parallax-x": `${parallax.x * direction * parallaxIntensity}px`,
    "--orbit-parallax-y": `${parallax.y * direction * parallaxIntensity}px`,
  } as CSSProperties;
}

function fastTravelDuration(distance: number, speedPercent: number, motionForcedOff: boolean): number {
  if (motionForcedOff) return 220;
  const raw =
    distance <= 4
      ? 700 + distance * 50
      : distance <= 8
        ? 900 + (distance - 4) * 62.5
        : distance <= 12
          ? 1150 + (distance - 8) * 75
          : 1450 + (distance - 12) * 12;
  return clamp(raw, 650, FAST_TRAVEL_MAX_MS) / speedFactor(speedPercent);
}

function formatPauseReasons(reasons: PauseReason[]): string {
  return reasons.length > 0 ? reasons.join(",") : "false";
}

function scenarioToneStyle(index: HomeScenarioIndex): CSSProperties {
  const tone = scenarioDesignByIndex[index];
  const word = scenarioWordLayoutByIndex[index];
  const light = scenarioLightByIndex[index];
  const accentRgb = tone.accent
    .replace("#", "")
    .match(/.{2}/g)
    ?.map((part) => Number.parseInt(part, 16))
    .join(" ");
  const secondaryRgb = tone.secondary
    .replace("#", "")
    .match(/.{2}/g)
    ?.map((part) => Number.parseInt(part, 16))
    .join(" ");
  return {
    "--home-accent-color": tone.accent,
    "--home-secondary-color": tone.secondary,
    "--home-wash-color": tone.wash,
    "--home-deep-color": tone.deep,
    "--home-accent-rgb": accentRgb,
    "--home-glow-rgb": secondaryRgb,
    "--home-haze-rgb": "245 241 233",
    "--home-ink-rgb": accentRgb,
    "--home-word-x": word.x,
    "--home-word-y": word.y,
    "--home-word-size": word.size,
    "--home-word-max": word.maxWidth,
    "--home-word-opacity": word.opacity,
    "--home-word-letter-spacing": word.letterSpacing,
    "--hero-light-x": light.x,
    "--hero-light-y": light.y,
    "--hero-light-temperature": light.temperature,
    "--hero-stage-accent": light.stageAccent,
  } as CSSProperties;
}

function productSpecsForWatch(watch: OrbitWatch): OrbitWatchSpec[] {
  return readableSpecsByReferenceClean[watch.reference] ?? watch.specs;
}

export function HomeProductHero({
  scenarios,
  orbitWatches,
  reviewEnabled,
}: Readonly<{ scenarios: HomeScenario[]; orbitWatches: OrbitWatch[]; reviewEnabled: boolean }>) {
  const [orbitPosition, setOrbitPosition] = useState(0);
  const [settledOrbitIndex, setSettledOrbitIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [autoCycleEnabled, setAutoCycleEnabled] = useState(false);
  const [parallaxEnabled, setParallaxEnabled] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [pauseReasons, setPauseReasons] = useState<PauseReason[]>([]);
  const [travelState, setTravelState] = useState<TravelState>("idle");
  const [targetOrbitIndex, setTargetOrbitIndex] = useState<number | null>(null);
  const [currentDirection, setCurrentDirection] = useState<1 | -1>(1);
  const [speedPercent, setSpeedPercent] = useState(100);
  const [referenceMode, setReferenceMode] = useState<ReferenceMode>("hidden");
  const [referenceOpacity, setReferenceOpacity] = useState(0.5);
  const [showGrid, setShowGrid] = useState(false);
  const [showImageBounds, setShowImageBounds] = useState(false);
  const [showOpticalCaseBounds, setShowOpticalCaseBounds] = useState(false);
  const [showSectionLabels, setShowSectionLabels] = useState(false);
  const [showTextBounds, setShowTextBounds] = useState(false);
  const [showAssetDimensions, setShowAssetDimensions] = useState(false);
  const [showUpscaleWarnings, setShowUpscaleWarnings] = useState(false);
  const [showOverflowElements, setShowOverflowElements] = useState(false);
  const [showFullBleedBounds, setShowFullBleedBounds] = useState(false);
  const [showMaterialLayers, setShowMaterialLayers] = useState(false);
  const [showTypographyScale, setShowTypographyScale] = useState(false);
  const [showWatchRenderSize, setShowWatchRenderSize] = useState(false);
  const [showNaturalSize, setShowNaturalSize] = useState(false);
  const [showCtaVariants, setShowCtaVariants] = useState(false);
  const [showSectionHeight, setShowSectionHeight] = useState(false);
  const [showBorderCount, setShowBorderCount] = useState(false);
  const [showCopyLength, setShowCopyLength] = useState(false);
  const [showLineCount, setShowLineCount] = useState(false);
  const [showVerticalPadding, setShowVerticalPadding] = useState(false);
  const [showEmptyAreaEstimate, setShowEmptyAreaEstimate] = useState(false);
  const [showRevealInitialOpacity, setShowRevealInitialOpacity] = useState(false);
  const [showRevealTriggerPoint, setShowRevealTriggerPoint] = useState(false);
  const [showDocumentViewportCount, setShowDocumentViewportCount] = useState(false);
  const [showLateContent, setShowLateContent] = useState(false);
  const [showInvisibleReservedSpace, setShowInvisibleReservedSpace] = useState(false);
  const [showGridAreas, setShowGridAreas] = useState(false);
  const [showWatchBaselines, setShowWatchBaselines] = useState(false);
  const [showNextWatchContainer, setShowNextWatchContainer] = useState(false);
  const [showOverlaps, setShowOverlaps] = useState(false);
  const [showSectionTransitions, setShowSectionTransitions] = useState(false);
  const [showPlacementIds, setShowPlacementIds] = useState(false);
  const [showRenderKeys, setShowRenderKeys] = useState(false);
  const [showAssetAudit, setShowAssetAudit] = useState(false);
  const [staticReviewMode, setStaticReviewMode] = useState(false);
  const [reviewMetrics, setReviewMetrics] = useState<HomeReviewMetrics>(emptyReviewMetrics);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const querySnapshot = useSyncExternalStore(subscribeToHeroQuery, getHeroQuerySnapshot, getServerHeroQuerySnapshot);
  const showReview = reviewEnabled && querySnapshot.includes("review=1");
  const motionForcedOff = querySnapshot.includes("motion=0");
  const rootRef = useRef<HTMLElement | null>(null);
  const pointerFrameRef = useRef<number | null>(null);
  const orbitFrameRef = useRef<number | null>(null);
  const manualResumeTimerRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);
  const pointerTargetRef = useRef({ x: 0, y: 0 });
  const pointerCurrentRef = useRef({ x: 0, y: 0 });
  const orbitPositionRef = useRef(0);
  const focusPausedRef = useRef(false);
  const hiddenPausedRef = useRef(false);
  const manualPausedRef = useRef(false);
  const reducedMotionRef = useRef(false);
  const reviewPausedRef = useRef(false);
  const draggingPausedRef = useRef(false);
  const currentStepPeriodMs = AUTO_STEP_PERIOD_MS / speedFactor(speedPercent);
  const currentManualStepMs = MANUAL_STEP_MS / speedFactor(speedPercent);

  const orbitTotal = orbitWatches.length;
  const roundedOrbitIndex = wrapOrbitIndex(Math.round(orbitPosition), orbitTotal);
  const activeOrbitIndex = travelState === "fast-travel" ? settledOrbitIndex : roundedOrbitIndex;
  const activeWatch = orbitWatches[wrapOrbitIndex(activeOrbitIndex, orbitTotal)];
  const activeWatchHref = getHomeWatchHref(activeWatch);
  const activeScenarioIndex = scenarioIndexFromOrbitIndex(activeOrbitIndex);
  const activeScenarioPosition = scenarioPositionFromOrbitIndex(activeOrbitIndex);
  const activeScenario = scenarios[activeScenarioIndex] ?? scenarios[0] ?? null;
  const activeScenarioDisplay = scenarioDisplayByIndexClean[activeScenarioIndex];
  const activeSpecs = activeWatch ? productSpecsForWatch(activeWatch).slice(0, 3) : [];
  const visibleSlots = useMemo(() => buildVisibleSlots(orbitPosition, orbitWatches), [orbitPosition, orbitWatches]);
  const visibleIndexes = useMemo(() => visibleOrbitIndexes(activeOrbitIndex, orbitTotal), [activeOrbitIndex, orbitTotal]);
  const referenceVisible = showReview && referenceMode !== "hidden";
  const canAnimate = !motionForcedOff && !reducedMotion;
  const parallaxIntensity = parallaxEnabled && !motionForcedOff && travelState !== "fast-travel" ? 1 : 0;
  const isMetaMuted = travelState !== "idle";
  const preloadIndexes = useMemo(() => {
    if (orbitTotal === 0) return [];
    const indexes = [
      wrapOrbitIndex(activeOrbitIndex + 3, orbitTotal),
      wrapOrbitIndex(activeOrbitIndex - 3, orbitTotal),
      targetOrbitIndex === null ? null : wrapOrbitIndex(targetOrbitIndex, orbitTotal),
      targetOrbitIndex === null ? null : wrapOrbitIndex(targetOrbitIndex + 1, orbitTotal),
    ];
    return Array.from(new Set(indexes.filter((index): index is number => index !== null)));
  }, [activeOrbitIndex, orbitTotal, targetOrbitIndex]);

  const syncPauseReasons = useCallback(() => {
    const nextReasons: PauseReason[] = [];
    if (manualPausedRef.current) nextReasons.push("manual");
    if (focusPausedRef.current) nextReasons.push("focus");
    if (hiddenPausedRef.current) nextReasons.push("documentHidden");
    if (reducedMotionRef.current) nextReasons.push("reducedMotion");
    if (reviewPausedRef.current) nextReasons.push("reviewPaused");
    if (draggingPausedRef.current) nextReasons.push("dragging");
    setPauseReasons(nextReasons);
  }, []);

  const clearOrbitTimers = useCallback(() => {
    if (orbitFrameRef.current !== null) {
      window.cancelAnimationFrame(orbitFrameRef.current);
      orbitFrameRef.current = null;
    }
  }, []);

  const setOrbitPositionValue = useCallback(
    (value: number) => {
      const wrapped = wrapOrbitIndex(value, orbitTotal);
      orbitPositionRef.current = wrapped;
      setOrbitPosition(wrapped);
    },
    [orbitTotal],
  );

  const writePointerVars = useCallback((x: number, y: number) => {
    const root = rootRef.current;
    if (!root) return;
    root.style.setProperty("--home-hero-x", x.toFixed(4));
    root.style.setProperty("--home-hero-y", y.toFixed(4));
    setPointer({ x, y });
  }, []);

  const schedulePointerWrite = useCallback(
    (x: number, y: number) => {
      if (motionForcedOff || travelState === "fast-travel") {
        pointerTargetRef.current = { x: 0, y: 0 };
        pointerCurrentRef.current = { x: 0, y: 0 };
        writePointerVars(0, 0);
        return;
      }
      pointerTargetRef.current = { x, y };
      if (pointerFrameRef.current !== null) window.cancelAnimationFrame(pointerFrameRef.current);
      const step = () => {
        const current = pointerCurrentRef.current;
        const target = pointerTargetRef.current;
        const next = {
          x: current.x + (target.x - current.x) * 0.08,
          y: current.y + (target.y - current.y) * 0.08,
        };
        pointerCurrentRef.current = next;
        writePointerVars(next.x, next.y);
        if (Math.abs(next.x - target.x) > 0.002 || Math.abs(next.y - target.y) > 0.002) {
          pointerFrameRef.current = window.requestAnimationFrame(step);
        } else {
          pointerCurrentRef.current = target;
          writePointerVars(target.x, target.y);
          pointerFrameRef.current = null;
        }
      };
      pointerFrameRef.current = window.requestAnimationFrame(step);
    },
    [motionForcedOff, travelState, writePointerVars],
  );

  const resetPointer = useCallback(() => {
    schedulePointerWrite(0, 0);
  }, [schedulePointerWrite]);

  const markManualPause = useCallback(
    (durationMs: number) => {
      manualPausedRef.current = true;
      if (manualResumeTimerRef.current) window.clearTimeout(manualResumeTimerRef.current);
      manualResumeTimerRef.current = window.setTimeout(() => {
        manualPausedRef.current = false;
        manualResumeTimerRef.current = null;
        syncPauseReasons();
      }, durationMs);
      syncPauseReasons();
    },
    [syncPauseReasons],
  );

  const animateOrbitTo = useCallback(
    (targetIndex: number, direction: 1 | -1, distance: number, durationMs: number, nextTravelState: TravelState) => {
      clearOrbitTimers();
      const start = orbitPositionRef.current;
      const target = start + direction * distance;
      const finalIndex = wrapOrbitIndex(targetIndex, orbitTotal);

      setCurrentDirection(direction);
      setTargetOrbitIndex(finalIndex);
      setTravelState(canAnimate ? nextTravelState : "step");
      resetPointer();

      if (!canAnimate) {
        setOrbitPositionValue(finalIndex);
        setSettledOrbitIndex(finalIndex);
        manualPausedRef.current = false;
        if (manualResumeTimerRef.current) {
          window.clearTimeout(manualResumeTimerRef.current);
          manualResumeTimerRef.current = null;
        }
        syncPauseReasons();
        setTravelState("idle");
        setTargetOrbitIndex(null);
        return;
      }

      const startedAt = window.performance.now();
      const animate = (now: number) => {
        const progress = clamp((now - startedAt) / durationMs, 0, 1);
        const eased = easeOrbit(progress);
        setOrbitPositionValue(start + (target - start) * eased);
        if (progress < 1) {
          orbitFrameRef.current = window.requestAnimationFrame(animate);
          return;
        }
        setOrbitPositionValue(finalIndex);
        setSettledOrbitIndex(finalIndex);
        manualPausedRef.current = false;
        if (manualResumeTimerRef.current) {
          window.clearTimeout(manualResumeTimerRef.current);
          manualResumeTimerRef.current = null;
        }
        syncPauseReasons();
        setTravelState("idle");
        setTargetOrbitIndex(null);
        orbitFrameRef.current = null;
      };
      orbitFrameRef.current = window.requestAnimationFrame(animate);
    },
    [canAnimate, clearOrbitTimers, orbitTotal, resetPointer, setOrbitPositionValue, syncPauseReasons],
  );

  const moveOrbitBy = useCallback(
    (delta: number, source: "auto" | "manual" = "manual") => {
      if (orbitTotal === 0) return;
      const current = wrapOrbitIndex(Math.round(orbitPositionRef.current), orbitTotal);
      const direction = delta >= 0 ? 1 : -1;
      const distance = Math.abs(delta);
      const target = wrapOrbitIndex(current + delta, orbitTotal);
      if (source === "manual") markManualPause(WATCH_MANUAL_PAUSE_MS);
      animateOrbitTo(target, direction, distance, currentManualStepMs, "step");
    },
    [animateOrbitTo, currentManualStepMs, markManualPause, orbitTotal],
  );

  const fastTravelTo = useCallback(
    (targetIndex: number) => {
      if (orbitTotal === 0) return;
      const target = wrapOrbitIndex(targetIndex, orbitTotal);
      const current = wrapOrbitIndex(Math.round(orbitPositionRef.current), orbitTotal);
      if (target === current) {
        markManualPause(SCENARIO_MANUAL_PAUSE_MS);
        return;
      }

      markManualPause(SCENARIO_MANUAL_PAUSE_MS);
      const direction = 1;
      const distance = forwardOrbitDistance(current, target, orbitTotal);
      animateOrbitTo(target, direction, distance, fastTravelDuration(distance, speedPercent, motionForcedOff), "fast-travel");
    },
    [animateOrbitTo, markManualPause, motionForcedOff, orbitTotal, speedPercent],
  );

  useEffect(() => {
    reviewPausedRef.current = showReview;
    const timer = window.setTimeout(syncPauseReasons, 0);
    return () => window.clearTimeout(timer);
  }, [showReview, syncPauseReasons]);

  useEffect(() => {
    const root = document.documentElement;
    const reviewFlags = {
      homeReviewCompositionGrid: showGrid,
      homeReviewGridAreas: showGridAreas,
      homeReviewTextFlow: showTextBounds,
      homeReviewWatchStages: showImageBounds,
      homeReviewWatchBaselines: showWatchBaselines,
      homeReviewNextWatch: showNextWatchContainer,
      homeReviewOverlaps: showOverlaps,
      homeReviewOverflow: showOverflowElements,
      homeReviewCtaVariants: showCtaVariants,
      homeReviewTextureOpacity: showMaterialLayers,
      homeReviewSectionHeights: showSectionHeight,
      homeReviewCopyLength: showCopyLength,
      homeReviewLineCount: showLineCount,
      homeReviewVerticalPadding: showVerticalPadding,
      homeReviewEmptyAreaEstimate: showEmptyAreaEstimate,
      homeReviewRevealInitialOpacity: showRevealInitialOpacity,
      homeReviewRevealTriggerPoint: showRevealTriggerPoint,
      homeReviewTransitionZones: showSectionTransitions,
      homeReviewDocumentViewportCount: showDocumentViewportCount,
      homeReviewLateContent: showLateContent,
      homeReviewInvisibleReservedSpace: showInvisibleReservedSpace,
    } as const;

    for (const [name, enabled] of Object.entries(reviewFlags)) {
      root.dataset[name] = showReview && enabled ? "true" : "false";
    }

    if (!showReview) {
      return undefined;
    }

    let frame = window.requestAnimationFrame(() => setReviewMetrics(collectHomeReviewMetrics()));
    const refreshMetrics = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => setReviewMetrics(collectHomeReviewMetrics()));
    };
    window.addEventListener("resize", refreshMetrics);
    window.addEventListener("scroll", refreshMetrics, { passive: true });
    document.addEventListener("transitionend", refreshMetrics);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", refreshMetrics);
      window.removeEventListener("scroll", refreshMetrics);
      document.removeEventListener("transitionend", refreshMetrics);
      for (const name of Object.keys(reviewFlags)) delete root.dataset[name];
    };
  }, [
    showCtaVariants,
    showCopyLength,
    showDocumentViewportCount,
    showEmptyAreaEstimate,
    showGrid,
    showGridAreas,
    showImageBounds,
    showMaterialLayers,
    showInvisibleReservedSpace,
    showLateContent,
    showLineCount,
    showNextWatchContainer,
    showOverlaps,
    showOverflowElements,
    showReview,
    showRevealInitialOpacity,
    showRevealTriggerPoint,
    showSectionHeight,
    showSectionTransitions,
    showTextBounds,
    showWatchBaselines,
    showVerticalPadding,
  ]);

  useEffect(() => {
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const finePointerQuery = window.matchMedia("(pointer: fine)");

    function syncMotionPreference() {
      reducedMotionRef.current = reducedMotionQuery.matches;
      setReducedMotion(reducedMotionQuery.matches);
      const nextCanAnimate = !motionForcedOff && !reducedMotionQuery.matches;
      setAutoCycleEnabled(nextCanAnimate);
      setParallaxEnabled(nextCanAnimate && finePointerQuery.matches);
      if (!nextCanAnimate) resetPointer();
      syncPauseReasons();
    }

    function syncVisibility() {
      hiddenPausedRef.current = document.hidden;
      syncPauseReasons();
    }

    function releaseDragPause() {
      if (!draggingPausedRef.current) return;
      draggingPausedRef.current = false;
      syncPauseReasons();
    }

    syncMotionPreference();
    syncVisibility();
    reducedMotionQuery.addEventListener("change", syncMotionPreference);
    finePointerQuery.addEventListener("change", syncMotionPreference);
    document.addEventListener("visibilitychange", syncVisibility);
    window.addEventListener("pointerup", releaseDragPause);
    window.addEventListener("pointercancel", releaseDragPause);

    return () => {
      reducedMotionQuery.removeEventListener("change", syncMotionPreference);
      finePointerQuery.removeEventListener("change", syncMotionPreference);
      document.removeEventListener("visibilitychange", syncVisibility);
      window.removeEventListener("pointerup", releaseDragPause);
      window.removeEventListener("pointercancel", releaseDragPause);
      if (pointerFrameRef.current) window.cancelAnimationFrame(pointerFrameRef.current);
      if (manualResumeTimerRef.current) window.clearTimeout(manualResumeTimerRef.current);
      clearOrbitTimers();
    };
  }, [clearOrbitTimers, motionForcedOff, resetPointer, syncPauseReasons]);

  useEffect(() => {
    if (!autoCycleEnabled || !isPlaying || pauseReasons.length > 0 || travelState !== "idle" || orbitTotal <= 1) return undefined;

    let previousFrameAt = window.performance.now();
    const step = (now: number) => {
      const elapsedMs = Math.min(72, Math.max(0, now - previousFrameAt));
      previousFrameAt = now;
      const nextPosition = orbitPositionRef.current + elapsedMs / currentStepPeriodMs;
      setOrbitPositionValue(nextPosition);
      setSettledOrbitIndex(wrapOrbitIndex(Math.round(nextPosition), orbitTotal));
      orbitFrameRef.current = window.requestAnimationFrame(step);
    };

    orbitFrameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (orbitFrameRef.current !== null) {
        window.cancelAnimationFrame(orbitFrameRef.current);
        orbitFrameRef.current = null;
      }
    };
  }, [autoCycleEnabled, currentStepPeriodMs, isPlaying, orbitTotal, pauseReasons.length, setOrbitPositionValue, travelState]);

  function updatePointer(event: PointerEvent<HTMLElement>) {
    if (!parallaxEnabled || motionForcedOff || travelState === "fast-travel" || event.pointerType !== "mouse") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    schedulePointerWrite(x, y);
  }

  function handleFocus(event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    focusPausedRef.current = true;
    syncPauseReasons();
  }

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    focusPausedRef.current = false;
    syncPauseReasons();
  }

  function handleInteractivePointerDown() {
    draggingPausedRef.current = true;
    syncPauseReasons();
  }

  function handleTouchStart(event: TouchEvent<HTMLElement>) {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
    draggingPausedRef.current = true;
    syncPauseReasons();
  }

  function handleTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStartXRef.current === null) {
      draggingPausedRef.current = false;
      syncPauseReasons();
      return;
    }
    const endX = event.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const delta = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    draggingPausedRef.current = false;
    syncPauseReasons();
    if (Math.abs(delta) < 42) return;
    moveOrbitBy(delta < 0 ? 1 : -1);
  }

  if (!activeWatch || !activeScenario || orbitWatches.length !== 24) return null;

  return (
    <>
      <section
        ref={rootRef}
        className={styles.root}
        style={scenarioToneStyle(activeScenarioIndex)}
        data-testid="homepage-hero"
        data-home-layout="production-single-24-watch-orbit"
        data-home-orbit-position={orbitPosition.toFixed(3)}
        data-home-active-orbit-index={activeOrbitIndex}
        data-home-active-scenario-index={activeScenarioIndex}
        data-home-active-scenario-position={activeScenarioPosition}
        data-home-motion-mode="continuous-orbit"
        data-home-step-period={AUTO_STEP_PERIOD_MS}
        data-home-current-step-period={Math.round(currentStepPeriodMs)}
        data-home-auto-cycle-enabled={autoCycleEnabled && isPlaying ? "true" : "false"}
        data-home-cycle-paused={formatPauseReasons(pauseReasons)}
        data-home-motion-forced-off={motionForcedOff ? "true" : "false"}
        data-home-travel-state={travelState}
        data-home-direction={currentDirection}
        data-home-review-grid={showReview && showGrid ? "true" : "false"}
        data-home-review-media-bounds={showReview && showImageBounds ? "true" : "false"}
        data-home-review-optical-case-bounds={showReview && showOpticalCaseBounds ? "true" : "false"}
        data-home-review-section-bounds={showReview && showSectionLabels ? "true" : "false"}
        data-home-review-text-bounds={showReview && showTextBounds ? "true" : "false"}
        data-home-review-asset-dimensions={showReview && showAssetDimensions ? "true" : "false"}
        data-home-review-upscale-warnings={showReview && showUpscaleWarnings ? "true" : "false"}
        data-home-review-overflow-elements={showReview && showOverflowElements ? "true" : "false"}
        data-home-review-full-bleed-bounds={showReview && showFullBleedBounds ? "true" : "false"}
        data-home-review-material-layers={showReview && showMaterialLayers ? "true" : "false"}
        data-home-review-typography-scale={showReview && showTypographyScale ? "true" : "false"}
        data-home-review-watch-render-size={showReview && showWatchRenderSize ? "true" : "false"}
        data-home-review-natural-size={showReview && showNaturalSize ? "true" : "false"}
        data-home-review-cta-variants={showReview && showCtaVariants ? "true" : "false"}
        data-home-review-section-height={showReview && showSectionHeight ? "true" : "false"}
        data-home-review-border-count={showReview && showBorderCount ? "true" : "false"}
        data-home-review-placement-ids={showReview && showPlacementIds ? "true" : "false"}
        data-home-review-render-keys={showReview && showRenderKeys ? "true" : "false"}
        data-home-review-static={showReview && staticReviewMode ? "true" : "false"}
        onPointerLeave={resetPointer}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <div className={styles.leftMessage} data-home-hero-left-message>
          <p className={styles.eyebrow} data-home-copy-role="eyebrow">Ваше время. Ваш стиль.</p>
          <h1
            className={`${styles.permanentHeadline} text-balance`}
            data-home-copy-role="heading"
            aria-label="Часы, которые подходят именно вам"
          >
            <span>Часы,</span>
            <span>которые</span>
            <span>подходят</span>
            <span>именно вам</span>
          </h1>
          <p className={styles.description} data-home-copy-role="body">
            Подбираем часы под ваш ритм,
            <br />
            стиль и будущую коллекцию.
          </p>
          <p className={styles.ecosystemDescriptor} data-home-copy-role="route">Подбор → сравнение → покупка → коллекция</p>
          <div className={styles.actions}>
            <Link href="/selection" className="editorial-button editorial-button-dark" data-home-cta-variant="primary-light">
              Подобрать часы
            </Link>
            <Link href="/watches" className="editorial-button" data-home-cta-variant="secondary-light">
              Смотреть каталог
            </Link>
          </div>
        </div>

        <div
          className={styles.productStage}
          data-testid="homepage-product-stage"
          data-home-main-watch={activeWatch.reference}
          data-home-slot-count={visibleSlots.length}
          onPointerMove={updatePointer}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className={styles.scenarioColorField} aria-hidden="true" data-home-scenario-color-field />
          <div className={styles.colorPlate} aria-hidden="true" />
          <div className={styles.backgroundWordLayer} aria-hidden="true" data-home-background-word-layer>
            <span>{activeScenarioDisplay.backgroundWord}</span>
          </div>
          <div className={styles.stageTexture} aria-hidden="true" />
          <div className={styles.centerLight} aria-hidden="true" />

          {visibleSlots.map((slot) => {
            const isCenter = slot.slotName === "centerActive" && travelState === "idle";
            const watchHref = getHomeWatchHref(slot.watch);
            const placementId = `hero-${slot.watch.scenarioId}-${slot.watch.scenarioPosition}-${slot.watch.reference}`;
            const renderKey = `hero-orbit-${slot.globalIndex}`;
            const content = (
              <>
                <span className={styles.pointerLayer} style={slotStyle(slot.slotName, parallaxIntensity)}>
                  <Image
                    src={slot.watch.imageSrc}
                    alt={`${slot.watch.brand} ${slot.watch.model}`}
                    width={1700}
                    height={1800}
                    priority={isCenter}
                    loading={isCenter ? "eager" : "lazy"}
                    sizes={isCenter ? "(max-width: 767px) 78vw, 42vw" : "(max-width: 767px) 34vw, 18vw"}
                    className={styles.watchImage}
                  />
                </span>
                <span className="sr-only">
                  {slot.watch.brand} {slot.watch.model}
                </span>
              </>
            );

            return (
              <div
                key={slot.globalIndex}
                className={`${styles.orbitSlot} ${slotClassByName[slot.slotName]}`}
                style={slot.style}
                data-home-placement-id={placementId}
                data-home-render-key={renderKey}
                data-home-orbit-slot={slot.slotName}
                data-home-orbit-distance={slot.distance.toFixed(3)}
                data-home-orbit-index={slot.globalIndex}
                data-home-watch-ref={slot.watch.reference}
                data-home-source-dimensions={`${slot.watch.sourceWidth}x${slot.watch.sourceHeight}`}
                data-home-generated-dimensions={`${slot.watch.generatedWidth}x${slot.watch.generatedHeight}`}
                data-home-upscale-warning="false"
                data-home-watch-scenario-index={slot.watch.scenarioIndex}
                data-home-quality-class={slot.watch.qualityClass}
                data-home-asset-view={slot.watch.assetView}
                data-home-asset-approved={slot.watch.isHeroApprovedAsset ? "true" : "false"}
              >
                {watchHref ? (
                  <Link
                    href={watchHref}
                    className={`${styles.watchAction} ${isCenter ? styles.centerAction : styles.farAction}`}
                    onPointerDown={handleInteractivePointerDown}
                    aria-label={`Открыть ${slot.watch.brand} ${slot.watch.model} — ${slot.watch.reference}`}
                    data-home-watch-link
                    data-home-watch-link-reference={slot.watch.reference}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={`${styles.watchAction} ${isCenter ? styles.centerAction : styles.farAction}`} data-home-missing-href="true">
                    {content}
                  </div>
                )}
              </div>
            );
          })}

          <div className={styles.productMeta} aria-label="Активная модель" data-home-product-meta data-home-meta-muted={isMetaMuted ? "true" : "false"}>
            <span>{activeWatch.brand}</span>
            <strong>{activeWatch.model}</strong>
            <em>{activeWatch.priceLabel ?? "Цена уточняется"}</em>
            <div className={styles.productMetaSpecs}>
              {activeSpecs.map((spec) => (
                <small key={`${spec.label}-${spec.value}`}>
                  <strong>{spec.value}</strong>
                  <span>{spec.label}</span>
                </small>
              ))}
            </div>
            {activeWatchHref ? (
              <Link href={activeWatchHref} className={styles.productMetaLink} data-home-cta-variant="secondary-light" aria-label={`Открыть ${activeWatch.brand} ${activeWatch.model} — ${activeWatch.reference}`}>
                Подробнее о модели
              </Link>
            ) : null}
          </div>

          <div className={styles.orbitControls} data-home-orbit-controls aria-label="Управление орбитой часов">
            <button type="button" onPointerDown={handleInteractivePointerDown} onClick={() => moveOrbitBy(-1)} aria-label="Предыдущая модель">
              ← Назад
            </button>
            <button
              type="button"
              onPointerDown={handleInteractivePointerDown}
              onClick={() => {
                setIsPlaying((value) => !value);
                markManualPause(WATCH_MANUAL_PAUSE_MS);
              }}
              aria-label={isPlaying ? "Поставить движение на паузу" : "Продолжить движение"}
            >
              {isPlaying ? "Пауза" : "Продолжить"}
            </button>
            <button type="button" onPointerDown={handleInteractivePointerDown} onClick={() => moveOrbitBy(1)} aria-label="Следующая модель">
              Вперед →
            </button>
          </div>

          <div className={styles.preloadImages} aria-hidden="true">
            {preloadIndexes.map((index) => {
              const watch = orbitWatches[index];
              return watch ? <Image key={`preload-${index}`} src={watch.imageSrc} alt="" width={96} height={96} priority={false} /> : null;
            })}
          </div>

          {referenceVisible ? (
            <div
              className={`${styles.referenceOverlay} ${referenceMode === "side-by-side" ? styles.referenceSideBySide : styles.referenceOverlayMode}`}
              style={{ "--home-reference-opacity": referenceOpacity } as CSSProperties}
              aria-hidden="true"
            >
              <Image
                src="/generated/home-hero/review/homepage-multi-watch-approved.png"
                alt=""
                width={1536}
                height={960}
                className={styles.referenceImage}
                priority={false}
              />
            </div>
          ) : null}
        </div>

        <nav className={styles.scenarioRail} aria-label="Сценарии выбора часов" data-home-scenario-rail>
          {scenarios.map((scenario, index) => {
            const scenarioIndex = index as HomeScenarioIndex;
            const isActive = scenarioIndex === activeScenarioIndex;
            return (
              <button
                type="button"
                key={scenario.id}
                className={`${styles.scenarioItem} ${isActive ? styles.scenarioItemActive : ""}`}
                style={{ "--scenario-progress": `${(activeScenarioPosition + 1) * 25}%` } as CSSProperties}
                aria-current={isActive ? "true" : undefined}
                onPointerDown={handleInteractivePointerDown}
                onClick={() => fastTravelTo(targetOrbitIndexForScenario(scenarioIndex))}
              >
                <span className={styles.scenarioNumber}>{scenario.index}</span>
                <span className={styles.scenarioCopy}>
                  <strong>{scenarioDisplayByIndexClean[scenarioIndex].railTitle}</strong>
                  <em>{readableScenarioSubtitlesClean[index] ?? scenario.description}</em>
                </span>
                <i className={styles.scenarioProgress} data-home-cycle-progress aria-hidden="true" />
              </button>
            );
          })}
        </nav>
      </section>

      {showReview ? (
        <aside className={styles.reviewPanel} data-testid="home-hero-review" aria-label="Homepage hero review">
          <header>
            <strong>Hero orbit review</strong>
            <span>
              {activeOrbitIndex} / {activeWatch.reference}
            </span>
          </header>
          <dl>
            <div>
              <dt>active section</dt>
              <dd>hero / production homepage section 01</dd>
            </div>
            <div>
              <dt>active scenario</dt>
              <dd>
                {activeScenarioIndex + 1} / {activeScenarioDisplay.railTitle}
              </dd>
            </div>
            <div>
              <dt>orbitPosition</dt>
              <dd>{orbitPosition.toFixed(3)}</dd>
            </div>
            <div>
              <dt>activeOrbitIndex</dt>
              <dd>{activeOrbitIndex}</dd>
            </div>
            <div>
              <dt>activeScenarioIndex</dt>
              <dd>{activeScenarioIndex}</dd>
            </div>
            <div>
              <dt>activeScenarioPosition</dt>
              <dd>{activeScenarioPosition}</dd>
            </div>
            <div>
              <dt>visible indexes</dt>
              <dd>
                {visibleIndexes.farLeftIndex}, {visibleIndexes.leftIndex}, {visibleIndexes.centerIndex}, {visibleIndexes.rightIndex},{" "}
                {visibleIndexes.farRightIndex}
              </dd>
            </div>
            <div>
              <dt>rendered refs</dt>
              <dd>{visibleSlots.map((slot) => `${slot.globalIndex}:${slot.watch.reference}`).join(" / ")}</dd>
            </div>
            <div>
              <dt>center asset</dt>
              <dd>
                {activeWatch.imageSrc} / {activeWatch.sourceWidth}x{activeWatch.sourceHeight} / {activeWatch.assetView} /{" "}
                {activeWatch.isHeroApprovedAsset ? "approved-front" : "not-approved"}
              </dd>
            </div>
            <div>
              <dt>text overflow</dt>
              <dd>primary model names wrap in normal flow; no homepage primary model ellipsis contract</dd>
            </div>
            <div>
              <dt>horizontal overflow</dt>
              <dd>{reviewMetrics.overflowElements.length === 0 ? "none" : reviewMetrics.overflowElements.join(" / ")}</dd>
            </div>
            <div>
              <dt>absolute content</dt>
              <dd>{reviewMetrics.absoluteContentCount}</dd>
            </div>
            <div>
              <dt>overlap violations</dt>
              <dd>{reviewMetrics.overlapViolations}</dd>
            </div>
            <div>
              <dt>watch links</dt>
              <dd>{reviewMetrics.watchLinkCount} / missing {reviewMetrics.missingHrefWarnings}</dd>
            </div>
            <div>
              <dt>nested interactive</dt>
              <dd>{reviewMetrics.nestedInteractiveWarnings}</dd>
            </div>
            <div>
              <dt>watch href / reference</dt>
              <dd>{reviewMetrics.watchLinkTargets.join(" / ") || "pending"}</dd>
            </div>
            <div>
              <dt>CTA variants</dt>
              <dd>{reviewMetrics.ctaVariants.join(" / ") || "none"}</dd>
            </div>
            <div>
              <dt>section heights</dt>
              <dd>{reviewMetrics.sectionHeights.join(" / ") || "pending"}</dd>
            </div>
            <div>
              <dt>highest section</dt>
              <dd>{reviewMetrics.highestSection}</dd>
            </div>
            <div>
              <dt>homepage words</dt>
              <dd>{reviewMetrics.totalHomepageWords}</dd>
            </div>
            <div>
              <dt>body-copy words</dt>
              <dd>{reviewMetrics.bodyCopyWords}</dd>
            </div>
            <div>
              <dt>headline words</dt>
              <dd>{reviewMetrics.headlineWords}</dd>
            </div>
            <div>
              <dt>document / viewport</dt>
              <dd>
                {reviewMetrics.documentHeight}px / {reviewMetrics.viewportHeight}px / {reviewMetrics.viewportCount} viewports
              </dd>
            </div>
            <div>
              <dt>transition zones</dt>
              <dd>{reviewMetrics.transitionZoneHeight}px</dd>
            </div>
            <div>
              <dt>vertical padding</dt>
              <dd>{reviewMetrics.totalVerticalPadding}px</dd>
            </div>
            <div>
              <dt>largest empty gap</dt>
              <dd>{reviewMetrics.largestEmptyGap}px</dd>
            </div>
            <div>
              <dt>late content</dt>
              <dd>{reviewMetrics.lateContentCount}</dd>
            </div>
            <div>
              <dt>invisible reserved space</dt>
              <dd>{reviewMetrics.invisibleReservedSpaceCount}</dd>
            </div>
            <div>
              <dt>headline line counts</dt>
              <dd>{reviewMetrics.lineCounts.join(" / ") || "pending"}</dd>
            </div>
            <div>
              <dt>watch rendered sizes</dt>
              <dd>{reviewMetrics.watchRenderedSizes.join(" / ") || "pending"}</dd>
            </div>
            <div>
              <dt>watch natural sizes</dt>
              <dd>{reviewMetrics.watchNaturalSizes.join(" / ") || "pending"}</dd>
            </div>
            <div>
              <dt>upscale warning</dt>
              <dd>{reviewMetrics.upscaleWarnings}</dd>
            </div>
            <div>
              <dt>front / watermark</dt>
              <dd>{activeWatch.assetView === "front" && activeWatch.isHeroApprovedAsset ? "front-only / no known watermark in approved asset manifest" : "needs audit"}</dd>
            </div>
            <div>
              <dt>optical scale</dt>
              <dd>{activeWatch.assetScale.toFixed(3)}</dd>
            </div>
            <div>
              <dt>asset audit</dt>
              <dd>{orbitWatches.map((watch) => `${watch.globalIndex}:${watch.reference}:${watch.assetView}:${watch.isHeroApprovedAsset ? "approved" : "rejected"}`).join(" / ")}</dd>
            </div>
            <div>
              <dt>rejected non-front assets</dt>
              <dd>{rejectedHomeHeroAssets.map((asset) => `${asset.reference} ${asset.view} ${asset.path}`).join(" / ")}</dd>
            </div>
            <div>
              <dt>animation state</dt>
              <dd>{travelState}</dd>
            </div>
            <div>
              <dt>auto-cycle state</dt>
              <dd>{autoCycleEnabled && isPlaying && pauseReasons.length === 0 ? "running" : "paused"}</dd>
            </div>
            <div>
              <dt>pause reasons</dt>
              <dd>{formatPauseReasons(pauseReasons)}</dd>
            </div>
            <div>
              <dt>continuous step</dt>
              <dd>
                {Math.round(currentStepPeriodMs)}ms per orbit index
              </dd>
            </div>
            <div>
              <dt>home section order</dt>
              <dd>header / kinetic hero / ecosystem path / personal selection / comparison + purchase path / collection intelligence / journal + final CTA / footer</dd>
            </div>
            <div>
              <dt>CTA routes</dt>
              <dd>/selection / /watches / /collection / /journal</dd>
            </div>
            <div>
              <dt>breakpoint</dt>
              <dd>CSS responsive: desktop / tablet / mobile via module media queries</dd>
            </div>
            <div>
              <dt>perf notes</dt>
              <dd>next/image, static generated assets, no WebGL, no video, reduced-motion honored</dd>
            </div>
            <div>
              <dt>target / direction</dt>
              <dd>
                {targetOrbitIndex ?? "none"} / {currentDirection}
              </dd>
            </div>
            <div>
              <dt>Pointer</dt>
              <dd>
                {pointer.x.toFixed(2)}, {pointer.y.toFixed(2)}
              </dd>
            </div>
          </dl>
          <div className={styles.reviewControls}>
            <button type="button" onClick={() => moveOrbitBy(-1)}>
              PREVIOUS WATCH
            </button>
            <button type="button" onClick={() => moveOrbitBy(1)}>
              NEXT WATCH
            </button>
            <button type="button" onClick={() => setIsPlaying(true)}>
              RESUME MOTION
            </button>
            <button type="button" onClick={() => setIsPlaying(false)}>
              PAUSE MOTION
            </button>
            <button type="button" onClick={() => setParallaxEnabled((value) => !value)}>
              PARALLAX {reviewValue(parallaxEnabled)}
            </button>
            <button type="button" onClick={resetPointer}>
              RESET
            </button>
            <button type="button" onClick={() => setSpeedPercent((value) => (value >= 200 ? 25 : value + 25))}>
              SPEED {speedPercent}%
            </button>
            <button type="button" onClick={() => setIsPlaying((value) => !value)}>
              MOTION {reviewValue(isPlaying)}
            </button>
            <button type="button" onClick={() => setShowGrid((value) => !value)}>
              SHOW GRID {reviewValue(showGrid)}
            </button>
            <button type="button" onClick={() => setShowGrid((value) => !value)}>
              SHOW COMPOSITION GRID {reviewValue(showGrid)}
            </button>
            <button type="button" onClick={() => setShowGridAreas((value) => !value)}>
              SHOW GRID AREAS {reviewValue(showGridAreas)}
            </button>
            <button type="button" onClick={() => setShowFullBleedBounds((value) => !value)}>
              SHOW FULL-BLEED BOUNDS {reviewValue(showFullBleedBounds)}
            </button>
            <button type="button" onClick={() => setShowMaterialLayers((value) => !value)}>
              SHOW MATERIAL LAYERS {reviewValue(showMaterialLayers)}
            </button>
            <button type="button" onClick={() => setShowTypographyScale((value) => !value)}>
              SHOW TYPOGRAPHY SCALE {reviewValue(showTypographyScale)}
            </button>
            <button type="button" onClick={() => setShowImageBounds((value) => !value)}>
              SHOW MEDIA BOUNDS {reviewValue(showImageBounds)}
            </button>
            <button type="button" onClick={() => setShowImageBounds((value) => !value)}>
              SHOW WATCH STAGES {reviewValue(showImageBounds)}
            </button>
            <button type="button" onClick={() => setShowTextBounds((value) => !value)}>
              SHOW TEXT BOUNDS {reviewValue(showTextBounds)}
            </button>
            <button type="button" onClick={() => setShowTextBounds((value) => !value)}>
              SHOW TEXT FLOW {reviewValue(showTextBounds)}
            </button>
            <button type="button" onClick={() => setShowWatchBaselines((value) => !value)}>
              SHOW WATCH BASELINES {reviewValue(showWatchBaselines)}
            </button>
            <button type="button" onClick={() => setShowNextWatchContainer((value) => !value)}>
              SHOW NEXT WATCH CONTAINER {reviewValue(showNextWatchContainer)}
            </button>
            <button type="button" onClick={() => setShowOverlaps((value) => !value)}>
              SHOW OVERLAPS {reviewValue(showOverlaps)}
            </button>
            <button type="button" onClick={() => setShowWatchRenderSize((value) => !value)}>
              SHOW WATCH RENDER SIZE {reviewValue(showWatchRenderSize)}
            </button>
            <button type="button" onClick={() => setShowNaturalSize((value) => !value)}>
              SHOW NATURAL SIZE {reviewValue(showNaturalSize)}
            </button>
            <button type="button" onClick={() => setShowAssetDimensions((value) => !value)}>
              SHOW ASSET DIMENSIONS {reviewValue(showAssetDimensions)}
            </button>
            <button type="button" onClick={() => setShowUpscaleWarnings((value) => !value)}>
              SHOW UPSCALE WARNING {reviewValue(showUpscaleWarnings)}
            </button>
            <button type="button" onClick={() => setShowUpscaleWarnings((value) => !value)}>
              SHOW UPSCALE WARNINGS {reviewValue(showUpscaleWarnings)}
            </button>
            <button type="button" onClick={() => setShowOpticalCaseBounds((value) => !value)}>
              SHOW OPTICAL CASE BOUNDS {reviewValue(showOpticalCaseBounds)}
            </button>
            <button type="button" onClick={() => setShowSectionLabels((value) => !value)}>
              SHOW SECTION BOUNDS {reviewValue(showSectionLabels)}
            </button>
            <button type="button" onClick={() => setShowPlacementIds((value) => !value)}>
              SHOW PLACEMENT IDS {reviewValue(showPlacementIds)}
            </button>
            <button type="button" onClick={() => setShowRenderKeys((value) => !value)}>
              SHOW RENDER KEYS {reviewValue(showRenderKeys)}
            </button>
            <button type="button" onClick={() => setShowAssetAudit((value) => !value)}>
              SHOW ASSET QUALITY {reviewValue(showAssetAudit)}
            </button>
            <button type="button" onClick={() => setShowOverflowElements((value) => !value)}>
              SHOW OVERFLOW ELEMENTS {reviewValue(showOverflowElements)}
            </button>
            <button type="button" onClick={() => setShowOverflowElements((value) => !value)}>
              SHOW OVERFLOW {reviewValue(showOverflowElements)}
            </button>
            <button type="button" onClick={() => setShowOverflowElements((value) => !value)}>
              SHOW OVERFLOW ELEMENT {reviewValue(showOverflowElements)}
            </button>
            <button type="button" onClick={() => setShowCtaVariants((value) => !value)}>
              SHOW CTA VARIANTS {reviewValue(showCtaVariants)}
            </button>
            <button type="button" onClick={() => setShowSectionHeight((value) => !value)}>
              SHOW SECTION HEIGHT {reviewValue(showSectionHeight)}
            </button>
            <button type="button" onClick={() => setShowSectionHeight((value) => !value)}>
              SHOW SECTION HEIGHTS {reviewValue(showSectionHeight)}
            </button>
            <button type="button" onClick={() => setShowCopyLength((value) => !value)}>
              SHOW COPY LENGTH {reviewValue(showCopyLength)}
            </button>
            <button type="button" onClick={() => setShowLineCount((value) => !value)}>
              SHOW LINE COUNT {reviewValue(showLineCount)}
            </button>
            <button type="button" onClick={() => setShowVerticalPadding((value) => !value)}>
              SHOW VERTICAL PADDING {reviewValue(showVerticalPadding)}
            </button>
            <button type="button" onClick={() => setShowEmptyAreaEstimate((value) => !value)}>
              SHOW EMPTY AREA ESTIMATE {reviewValue(showEmptyAreaEstimate)}
            </button>
            <button type="button" onClick={() => setShowRevealInitialOpacity((value) => !value)}>
              SHOW REVEAL INITIAL OPACITY {reviewValue(showRevealInitialOpacity)}
            </button>
            <button type="button" onClick={() => setShowRevealTriggerPoint((value) => !value)}>
              SHOW REVEAL TRIGGER POINT {reviewValue(showRevealTriggerPoint)}
            </button>
            <button type="button" onClick={() => setShowSectionTransitions((value) => !value)}>
              SHOW TRANSITION ZONES {reviewValue(showSectionTransitions)}
            </button>
            <button type="button" onClick={() => setShowDocumentViewportCount((value) => !value)}>
              SHOW DOCUMENT VIEWPORT COUNT {reviewValue(showDocumentViewportCount)}
            </button>
            <button type="button" onClick={() => setShowLateContent((value) => !value)}>
              SHOW LATE CONTENT {reviewValue(showLateContent)}
            </button>
            <button type="button" onClick={() => setShowInvisibleReservedSpace((value) => !value)}>
              SHOW INVISIBLE RESERVED SPACE {reviewValue(showInvisibleReservedSpace)}
            </button>
            <button type="button" onClick={() => setShowMaterialLayers((value) => !value)}>
              SHOW TEXTURE OPACITY {reviewValue(showMaterialLayers)}
            </button>
            <button type="button" onClick={() => setShowBorderCount((value) => !value)}>
              SHOW BORDER COUNT {reviewValue(showBorderCount)}
            </button>
            <button type="button" onClick={() => setStaticReviewMode((value) => !value)}>
              SHOW STATIC MODE {reviewValue(staticReviewMode)}
            </button>
          </div>
          {showAssetAudit ? (
            <div className={styles.reviewAssetAudit}>
              {orbitWatches.map((watch) => (
                <p key={`audit-${watch.globalIndex}`}>
                  {watch.globalIndex}. {watch.reference} / {watch.imageSrc} / {watch.assetView} / {watch.qualityClass}
                </p>
              ))}
            </div>
          ) : null}
          <div className={styles.reviewScenarios}>
            {scenarios.map((scenario, index) => (
              <button key={`review-${scenario.id}`} type="button" onClick={() => fastTravelTo(targetOrbitIndexForScenario(index as HomeScenarioIndex))}>
                GO TO SCENARIO {String(index + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
          <div className={styles.referenceControls}>
            <button type="button" onClick={() => setReferenceMode("overlay")}>
              SHOW REFERENCE
            </button>
            <button type="button" onClick={() => setReferenceMode("hidden")}>
              HIDE REFERENCE
            </button>
            <button type="button" onClick={() => setReferenceMode("side-by-side")}>
              SIDE BY SIDE
            </button>
            <label>
              OPACITY {Math.round(referenceOpacity * 100)}%
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(referenceOpacity * 100)}
                onChange={(event) => setReferenceOpacity(Number(event.currentTarget.value) / 100)}
              />
            </label>
          </div>
          <ol className={styles.orbitSequence} aria-label="24 watch orbit sequence">
            {orbitWatches.map((watch) => (
              <li
                key={`sequence-${watch.globalIndex}`}
                data-active={watch.globalIndex === activeOrbitIndex ? "true" : undefined}
                data-boundary={watch.scenarioPosition === 0 ? "true" : undefined}
              >
                {watch.globalIndex}
              </li>
            ))}
          </ol>
        </aside>
      ) : null}
    </>
  );
}

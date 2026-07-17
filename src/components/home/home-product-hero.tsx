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

type PauseReason = "manual" | "focus" | "documentHidden" | "reducedMotion" | "reviewPaused" | "dragging";
type ReferenceMode = "hidden" | "overlay" | "side-by-side";
type TravelState = "idle" | "step" | "fast-travel";

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

const readableScenarioSubtitles = [
  "Универсальные модели на каждый день",
  "Сдержанная классика для делового образа",
  "Надежность в любых условиях",
  "Механика, с которой легко начать",
  "Функциональность и точность",
  "Исключительные модели для особых моментов",
];

const scenarioDesignByIndex: Record<HomeScenarioIndex, { accent: string; secondary: string; wash: string; deep: string }> = {
  0: { accent: "#2D628D", secondary: "#C08A42", wash: "rgba(92,147,191,.22)", deep: "#173A57" },
  1: { accent: "#814B40", secondary: "#B68A6C", wash: "rgba(174,116,93,.20)", deep: "#482822" },
  2: { accent: "#176F91", secondary: "#C19A58", wash: "rgba(57,144,177,.22)", deep: "#10425A" },
  3: { accent: "#526F80", secondary: "#B88343", wash: "rgba(100,139,159,.21)", deep: "#2B4654" },
  4: { accent: "#327052", secondary: "#C88A32", wash: "rgba(75,145,103,.22)", deep: "#1B4831" },
  5: { accent: "#A36A22", secondary: "#29221C", wash: "rgba(197,140,65,.23)", deep: "#573713" },
};

const scenarioWordLayoutByIndex: Record<
  HomeScenarioIndex,
  { word: string; x: string; y: string; size: string; maxWidth: string; opacity: string; letterSpacing: string }
> = {
  0: { word: "РИТМ", x: "28%", y: "7%", size: "clamp(110px, 10vw, 175px)", maxWidth: "56rem", opacity: "0.14", letterSpacing: "0.01em" },
  1: { word: "КЛАССИКА", x: "13%", y: "8%", size: "clamp(92px, 8.6vw, 148px)", maxWidth: "61rem", opacity: "0.13", letterSpacing: "0" },
  2: { word: "ДВИЖЕНИЕ", x: "4%", y: "9%", size: "clamp(78px, 7.6vw, 128px)", maxWidth: "64rem", opacity: "0.13", letterSpacing: "0" },
  3: { word: "МЕХАНИЗМ", x: "3%", y: "8%", size: "clamp(78px, 7.4vw, 126px)", maxWidth: "64rem", opacity: "0.13", letterSpacing: "0" },
  4: { word: "ЭНЕРГИЯ", x: "12%", y: "8%", size: "clamp(86px, 8vw, 138px)", maxWidth: "61rem", opacity: "0.13", letterSpacing: "0" },
  5: { word: "ХАРАКТЕР", x: "5%", y: "8%", size: "clamp(78px, 7.5vw, 128px)", maxWidth: "64rem", opacity: "0.14", letterSpacing: "0" },
};

const scenarioDisplayByIndex: Record<HomeScenarioIndex, { title: string; railTitle: string; backgroundWord: string }> = {
  0: { title: "На каждый день", railTitle: "На каждый день", backgroundWord: "РИТМ" },
  1: { title: "Под рубашку", railTitle: "Под работу", backgroundWord: "КЛАССИКА" },
  2: { title: "Для путешествий", railTitle: "Путешествия", backgroundWord: "ДВИЖЕНИЕ" },
  3: { title: "Первая механика", railTitle: "Механика", backgroundWord: "МЕХАНИЗМ" },
  4: { title: "Для спорта", railTitle: "Спорт", backgroundWord: "ЭНЕРГИЯ" },
  5: { title: "Следующее дополнение в коллекцию", railTitle: "Премиум", backgroundWord: "ХАРАКТЕР" },
};

const readableSpecsByReference: Record<string, OrbitWatchSpec[]> = {
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
};

function subscribeToHeroQuery(callback: () => void) {
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function getHeroQuerySnapshot() {
  const params = new URLSearchParams(window.location.search);
  const review = process.env.NODE_ENV !== "production" && params.get("heroReview") === "1" ? "1" : "0";
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
      if (distance < -2.86 || distance > 3.86) return null;
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
  } as CSSProperties;
}

function productSpecsForWatch(watch: OrbitWatch): OrbitWatchSpec[] {
  return readableSpecsByReference[watch.reference] ?? watch.specs;
}

export function HomeProductHero({
  scenarios,
  orbitWatches,
}: Readonly<{ scenarios: HomeScenario[]; orbitWatches: OrbitWatch[] }>) {
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
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const querySnapshot = useSyncExternalStore(subscribeToHeroQuery, getHeroQuerySnapshot, getServerHeroQuerySnapshot);
  const showReview = querySnapshot.includes("review=1");
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
  const activeOrbitIndex = travelState === "idle" ? roundedOrbitIndex : settledOrbitIndex;
  const activeWatch = orbitWatches[wrapOrbitIndex(activeOrbitIndex, orbitTotal)];
  const activeScenarioIndex = scenarioIndexFromOrbitIndex(activeOrbitIndex);
  const activeScenarioPosition = scenarioPositionFromOrbitIndex(activeOrbitIndex);
  const activeScenario = scenarios[activeScenarioIndex] ?? scenarios[0] ?? null;
  const activeScenarioDisplay = scenarioDisplayByIndex[activeScenarioIndex];
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
        onPointerLeave={resetPointer}
        onFocus={handleFocus}
        onBlur={handleBlur}
      >
        <div className={styles.leftMessage} data-home-hero-left-message>
          <p className={styles.eyebrow}>ВАШЕ ВРЕМЯ. ВАШ СТИЛЬ.</p>
          <h1 className={`${styles.permanentHeadline} text-balance`}>
            <span>ЧАСЫ,</span>
            <span>КОТОРЫЕ</span>
            <span>ПОДХОДЯТ</span>
            <span>ИМЕННО ВАМ</span>
          </h1>
          <p className={styles.description}>
            Подбираем часы под ваш ритм жизни,
            <br />
            стиль и характер.
          </p>
          <p className={styles.ecosystemDescriptor}>ПОДБОР → СРАВНЕНИЕ → КОЛЛЕКЦИЯ</p>
          <div className={styles.actions}>
            <Link href="/selection" className="editorial-button editorial-button-dark">
              Подобрать часы
            </Link>
            <Link href="/watches" className="editorial-button">
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
            const content = (
              <>
                <span className={styles.pointerLayer} style={slotStyle(slot.slotName, parallaxIntensity)}>
                  <Image
                    src={slot.watch.imageSrc}
                    alt={`${slot.watch.brand} ${slot.watch.model}`}
                    width={1700}
                    height={1800}
                    priority={isCenter}
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
                data-home-orbit-slot={slot.slotName}
                data-home-orbit-distance={slot.distance.toFixed(3)}
                data-home-orbit-index={slot.globalIndex}
                data-home-watch-ref={slot.watch.reference}
                data-home-watch-scenario-index={slot.watch.scenarioIndex}
                data-home-quality-class={slot.watch.qualityClass}
                data-home-asset-view={slot.watch.assetView}
                data-home-asset-approved={slot.watch.isHeroApprovedAsset ? "true" : "false"}
              >
                {isCenter ? (
                  <Link
                    href={slot.watch.href}
                    className={`${styles.watchAction} ${styles.centerAction}`}
                    onPointerDown={handleInteractivePointerDown}
                    aria-label={`Открыть текущую модель: ${slot.watch.brand} ${slot.watch.model}`}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className={`${styles.watchAction} ${styles.farAction}`} aria-hidden="true">
                    {content}
                  </div>
                )}
              </div>
            );
          })}

          <div className={styles.productMeta} aria-label="Центральная модель" data-home-product-meta data-home-meta-muted={isMetaMuted ? "true" : "false"}>
            <span>{activeWatch.brand}</span>
            <strong>{activeWatch.model}</strong>
            <em>{activeWatch.priceLabel ?? "цена в каталоге"}</em>
            <div className={styles.productMetaSpecs}>
              {activeSpecs.map((spec) => (
                <small key={`${spec.label}-${spec.value}`}>
                  <strong>{spec.value}</strong>
                  <span>{spec.label}</span>
                </small>
              ))}
            </div>
            <Link href={activeWatch.href} className={styles.productMetaLink}>
              Подробнее о модели
            </Link>
          </div>

          <div className={styles.orbitControls} data-home-orbit-controls aria-label="Управление орбитой часов">
            <button type="button" onPointerDown={handleInteractivePointerDown} onClick={() => moveOrbitBy(-1)} aria-label="Предыдущая модель">
              ←
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
              {isPlaying ? "Пауза" : "Старт"}
            </button>
            <button type="button" onPointerDown={handleInteractivePointerDown} onClick={() => moveOrbitBy(1)} aria-label="Следующая модель">
              →
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

        <nav className={styles.scenarioRail} aria-label="Сценарии первого экрана" data-home-scenario-rail>
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
                  <strong>{scenarioDisplayByIndex[scenarioIndex].railTitle}</strong>
                  <em>{readableScenarioSubtitles[index] ?? scenario.description}</em>
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
              PLAY
            </button>
            <button type="button" onClick={() => setIsPlaying(false)}>
              PAUSE
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
          </div>
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

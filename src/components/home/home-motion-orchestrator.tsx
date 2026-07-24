"use client";

import { useEffect } from "react";
import styles from "@/components/home/home-motion-orchestrator.module.css";

const MOTION_COMMAND_EVENT = "eternal-time:home-motion-command";
const REVEAL_SELECTOR = "[data-home-reveal]";

type HomeMotionCommand = "pause" | "resume" | "replay-current";

type LayoutShiftEntry = PerformanceEntry & {
  hadRecentInput: boolean;
  value: number;
};

function setVisible(element: HTMLElement, visible: boolean) {
  element.dataset.homeVisible = visible ? "true" : "false";
}

function currentSection(): HTMLElement | null {
  const viewportCenter = window.innerHeight * 0.5;
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-home-section]"));
  return (
    sections
      .map((section) => ({ section, distance: Math.abs(section.getBoundingClientRect().top - viewportCenter) }))
      .sort((left, right) => left.distance - right.distance)[0]?.section ?? null
  );
}

export function dispatchHomeMotionCommand(command: HomeMotionCommand) {
  window.dispatchEvent(new CustomEvent<HomeMotionCommand>(MOTION_COMMAND_EVENT, { detail: command }));
}

export function HomeMotionOrchestrator() {
  useEffect(() => {
    const root = document.documentElement;
    const revealTargets = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let layoutShiftScore = 0;

    const updateSummary = () => {
      const animations = document.getAnimations();
      root.dataset.homeRevealTargetCount = String(revealTargets.length);
      root.dataset.homeVisibleTargetCount = String(revealTargets.filter((target) => target.dataset.homeVisible === "true").length);
      root.dataset.homeActiveAnimationCount = String(animations.filter((animation) => animation.playState === "running").length);
      root.dataset.homeContinuousMotionCount = String(document.querySelectorAll('[data-home-continuous="true"]').length);
      root.dataset.homeLayoutShiftScore = layoutShiftScore.toFixed(4);
    };

    const revealImmediately = () => {
      for (const target of revealTargets) setVisible(target, true);
      updateSummary();
    };

    const syncReducedMotion = () => {
      const reduced = reduceMotionQuery.matches;
      root.dataset.homeMotionReduced = reduced ? "true" : "false";
      if (reduced) revealImmediately();
    };

    for (const target of revealTargets) {
      const rect = target.getBoundingClientRect();
      if (rect.top < window.innerHeight * 1.12 && rect.bottom > 0) setVisible(target, true);
    }

    syncReducedMotion();
    root.dataset.homeMotionReady = "true";
    root.dataset.homeMotionPaused = "false";

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          setVisible(target, true);
          observer.unobserve(target);
        }
        window.requestAnimationFrame(updateSummary);
      },
      { threshold: 0.06, rootMargin: "0px 0px 18% 0px" },
    );

    if (!reduceMotionQuery.matches) {
      for (const target of revealTargets) {
        if (target.dataset.homeVisible !== "true") observer.observe(target);
      }
    }

    const handleCommand = (event: Event) => {
      const command = (event as CustomEvent<HomeMotionCommand>).detail;
      if (command === "pause") {
        root.dataset.homeMotionPaused = "true";
      } else if (command === "resume") {
        root.dataset.homeMotionPaused = "false";
      } else if (command === "replay-current" && !reduceMotionQuery.matches) {
        const section = currentSection();
        if (section) {
          const targets = Array.from(section.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
          for (const target of targets) setVisible(target, false);
          window.requestAnimationFrame(() => {
            for (const target of targets) setVisible(target, true);
            updateSummary();
          });
        }
      }
      window.requestAnimationFrame(updateSummary);
    };

    const handleAnimationState = () => window.requestAnimationFrame(updateSummary);
    window.addEventListener(MOTION_COMMAND_EVENT, handleCommand);
    document.addEventListener("animationstart", handleAnimationState);
    document.addEventListener("animationend", handleAnimationState);
    document.addEventListener("transitionstart", handleAnimationState);
    document.addEventListener("transitionend", handleAnimationState);
    reduceMotionQuery.addEventListener("change", syncReducedMotion);

    let layoutShiftObserver: PerformanceObserver | null = null;
    if ("PerformanceObserver" in window) {
      try {
        layoutShiftObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as LayoutShiftEntry[]) {
            if (!entry.hadRecentInput) layoutShiftScore += entry.value;
          }
          updateSummary();
        });
        layoutShiftObserver.observe({ type: "layout-shift", buffered: true });
      } catch {
        layoutShiftObserver = null;
      }
    }

    updateSummary();

    return () => {
      observer.disconnect();
      layoutShiftObserver?.disconnect();
      window.removeEventListener(MOTION_COMMAND_EVENT, handleCommand);
      document.removeEventListener("animationstart", handleAnimationState);
      document.removeEventListener("animationend", handleAnimationState);
      document.removeEventListener("transitionstart", handleAnimationState);
      document.removeEventListener("transitionend", handleAnimationState);
      reduceMotionQuery.removeEventListener("change", syncReducedMotion);
      delete root.dataset.homeMotionReady;
      delete root.dataset.homeMotionPaused;
      delete root.dataset.homeMotionReduced;
    };
  }, []);

  return <span className={styles.orchestratorMarker} aria-hidden="true" />;
}

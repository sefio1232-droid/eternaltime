"use client";

import { useEffect } from "react";

export function SelectionStepFocus({ targetId, active }: Readonly<{ targetId: string; active: boolean }>) {
  useEffect(() => {
    if (!active) return;

    const frame = window.requestAnimationFrame(() => {
      const target = document.getElementById(targetId);
      if (!target) return;

      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      target.focus({ preventScroll: true });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [active, targetId]);

  return null;
}

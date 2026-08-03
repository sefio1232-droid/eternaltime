"use client";

import { useEffect, useRef } from "react";

export function useCollectionMotion<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const reducedMotion =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const prefersReducedMotion = reducedMotion?.matches ?? false;
    element.dataset.motionState = prefersReducedMotion ? "visible" : "pending";

    const reveal = () => {
      element.dataset.motionState = "visible";
    };
    let observer: IntersectionObserver | null = null;
    if (!prefersReducedMotion && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          reveal();
          observer?.disconnect();
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.14 },
      );
    }

    if (observer) observer.observe(element);
    else reveal();

    return () => observer?.disconnect();
  }, []);

  return ref;
}

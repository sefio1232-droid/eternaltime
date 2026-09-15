"use client";

import type { AnalyticsEventName, AnalyticsSourceSurface } from "@/modules/analytics/domain/events";

export type ClientAnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

const analyticsSessionStorageKey = "eternal-time.analytics-session";

function fallbackUuid(): string {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex
    .slice(8, 10)
    .join("")}-${hex.slice(10, 16).join("")}`;
}

export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return fallbackUuid();

  const existing = window.localStorage.getItem(analyticsSessionStorageKey);
  if (existing) return existing;

  const next = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : fallbackUuid();
  window.localStorage.setItem(analyticsSessionStorageKey, next);
  return next;
}

function currentPathname(): string {
  if (typeof window === "undefined") return "/";
  return `${window.location.pathname}${window.location.search}`;
}

function sanitizedProperties(properties: ClientAnalyticsProperties): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(properties).filter((entry): entry is [string, string | number | boolean] => entry[1] !== null && entry[1] !== undefined),
  );
}

export function trackAnalyticsEvent(eventName: AnalyticsEventName, properties: ClientAnalyticsProperties = {}) {
  if (typeof window === "undefined") return;

  const payload = JSON.stringify({
    eventName,
    sessionId: getAnalyticsSessionId(),
    pathname: currentPathname(),
    properties: sanitizedProperties(properties),
  });

  if (navigator.sendBeacon) {
    const accepted = navigator.sendBeacon("/api/analytics/events", new Blob([payload], { type: "application/json" }));
    if (accepted) return;
  }

  void fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // First-party analytics must never block navigation or commerce flows.
  });
}

export function sourceSurfaceProperty(sourceSurface: AnalyticsSourceSurface) {
  return { source_surface: sourceSurface };
}

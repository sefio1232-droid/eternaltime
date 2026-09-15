"use client";

import { useEffect } from "react";
import type { AnalyticsEventName } from "@/modules/analytics/domain/events";
import { trackAnalyticsEvent, type ClientAnalyticsProperties } from "./analytics-client";

export function PageAnalyticsEvent({
  eventName,
  properties = {},
}: Readonly<{
  eventName: AnalyticsEventName;
  properties?: ClientAnalyticsProperties;
}>) {
  useEffect(() => {
    trackAnalyticsEvent(eventName, properties);
  }, [eventName, properties]);

  return null;
}

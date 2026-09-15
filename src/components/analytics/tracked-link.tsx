"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { AnalyticsEventName } from "@/modules/analytics/domain/events";
import { trackAnalyticsEvent, type ClientAnalyticsProperties } from "./analytics-client";

export function TrackedLink({
  href,
  eventName,
  properties,
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, "href" | "onClick"> & {
  href: string;
  eventName: AnalyticsEventName;
  properties: ClientAnalyticsProperties;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      {...props}
      onClick={() => {
        trackAnalyticsEvent(eventName, properties);
      }}
    >
      {children}
    </Link>
  );
}

import "server-only";

import { headers } from "next/headers";
import {
  isLocalSiteUrl,
  normalizeSiteUrl,
  resolveConfiguredSiteUrl,
  type ResolvedSiteUrl,
} from "@/config/site-url";

function originFromForwardedHeaders(headerList: Headers): string | null {
  const forwardedHost = headerList.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headerList.get("host")?.split(",")[0]?.trim();
  if (!host) {
    return null;
  }

  const forwardedProto = headerList.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProto || (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return normalizeSiteUrl(`${protocol}://${host}`);
}

export async function resolveAuthSiteUrl(source: Record<string, string | undefined> = process.env): Promise<ResolvedSiteUrl> {
  const configured = resolveConfiguredSiteUrl(source);
  if (configured.url) {
    return configured;
  }

  const requestOrigin = originFromForwardedHeaders(await headers());
  if (requestOrigin && (source.NODE_ENV !== "production" || !isLocalSiteUrl(requestOrigin))) {
    return {
      url: requestOrigin,
      source: "request-origin",
      issues: configured.issues,
    };
  }

  return configured;
}

export async function buildAuthCallbackUrl(
  returnTo: string,
  source: Record<string, string | undefined> = process.env,
): Promise<string | null> {
  const siteUrl = await resolveAuthSiteUrl(source);
  if (!siteUrl.url) {
    return null;
  }

  const callbackUrl = new URL("/auth/callback", siteUrl.url);
  callbackUrl.searchParams.set("returnTo", returnTo);
  return callbackUrl.toString();
}

export async function buildAuthRedirectUrl(
  path: string,
  source: Record<string, string | undefined> = process.env,
): Promise<string | null> {
  const siteUrl = await resolveAuthSiteUrl(source);
  if (!siteUrl.url) {
    return null;
  }

  return new URL(path, siteUrl.url).toString();
}

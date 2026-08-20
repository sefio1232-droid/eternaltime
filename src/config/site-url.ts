export const developmentSiteUrl = "http://localhost:3004";

export const siteUrlEnvKeys = [
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "SITE_URL",
  "APP_URL",
] as const;

export type SiteUrlEnvKey = (typeof siteUrlEnvKeys)[number] | "development-default" | "request-origin";

export type SiteUrlIssue = {
  key: string;
  message: string;
};

export type ResolvedSiteUrl = {
  url: string | null;
  source: SiteUrlEnvKey | null;
  issues: SiteUrlIssue[];
};

export function normalizeSiteUrl(value: string | undefined): string | null {
  const raw = value?.trim();
  if (!raw) {
    return null;
  }

  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return null;
    }

    parsed.pathname = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/+$/, "");
    parsed.search = "";
    parsed.hash = "";
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function isLocalSiteUrl(value: string): boolean {
  const parsed = new URL(value);
  return parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1" || parsed.hostname === "::1";
}

export function resolveConfiguredSiteUrl(source: Record<string, string | undefined> = process.env): ResolvedSiteUrl {
  const issues: SiteUrlIssue[] = [];

  for (const key of siteUrlEnvKeys) {
    const raw = source[key];
    if (!raw?.trim()) {
      continue;
    }

    const normalized = normalizeSiteUrl(raw);
    if (!normalized) {
      issues.push({ key, message: `${key} must be an absolute http(s) URL.` });
      continue;
    }

    return { url: normalized, source: key, issues };
  }

  if (source.NODE_ENV === "production") {
    return {
      url: null,
      source: null,
      issues: [
        ...issues,
        {
          key: "SITE_URL",
          message: "Production site URL must be configured explicitly; localhost fallback is disabled in production.",
        },
      ],
    };
  }

  return { url: developmentSiteUrl, source: "development-default", issues };
}

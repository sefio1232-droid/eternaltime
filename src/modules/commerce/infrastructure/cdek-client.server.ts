import "server-only";

import { getServerEnv } from "@/config/server-env";

export type CdekPickupPoint = {
  code: string;
  name?: string;
  location?: {
    city?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  };
  address_comment?: string;
  work_time?: string;
};

export type CdekTariffQuote = {
  tariff_code: number;
  tariff_name?: string;
  delivery_sum?: number;
  period_min?: number;
  period_max?: number;
};

export class CdekConfigurationError extends Error {
  constructor() {
    super("CDEK is not configured. Set CDEK_CLIENT_ID and CDEK_CLIENT_SECRET.");
    this.name = "CdekConfigurationError";
  }
}

export class CdekApiError extends Error {
  readonly status: number;
  readonly responseBody: string;

  constructor(status: number, responseBody: string) {
    super(`CDEK API request failed with HTTP ${status}.`);
    this.name = "CdekApiError";
    this.status = status;
    this.responseBody = responseBody;
  }
}

let tokenCache: { token: string; expiresAt: number } | null = null;

function cdekBaseUrl(): string {
  return getServerEnv().cdek.apiBaseUrl.replace(/\/$/, "");
}

async function getCdekAccessToken(): Promise<string> {
  const env = getServerEnv();

  if (!env.cdek.isConfigured) {
    throw new CdekConfigurationError();
  }

  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.cdek.clientId,
    client_secret: env.cdek.clientSecret,
  });

  const response = await fetch(`${cdekBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new CdekApiError(response.status, text);
  }

  const parsed = JSON.parse(text) as { access_token: string; expires_in?: number };
  tokenCache = {
    token: parsed.access_token,
    expiresAt: Date.now() + (parsed.expires_in ?? 3600) * 1000,
  };

  return parsed.access_token;
}

async function cdekFetch<T>(path: string, options: { method?: "GET" | "POST"; body?: unknown } = {}): Promise<T> {
  const token = await getCdekAccessToken();
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${cdekBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new CdekApiError(response.status, text);
  }

  return JSON.parse(text) as T;
}

export async function listCdekPickupPoints(input: {
  cityCode?: number;
  postalCode?: string;
  city?: string;
}): Promise<CdekPickupPoint[]> {
  const params = new URLSearchParams();
  params.set("type", "PVZ");
  if (input.cityCode) {
    params.set("city_code", String(input.cityCode));
  }
  if (input.postalCode) {
    params.set("postal_code", input.postalCode);
  }
  if (input.city) {
    params.set("city", input.city);
  }

  return cdekFetch<CdekPickupPoint[]>(`/deliverypoints?${params.toString()}`);
}

export async function listCdekTariffs(input: {
  fromLocationCode: number;
  toLocationCode: number;
  weightGram: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}): Promise<{ tariff_codes: CdekTariffQuote[] }> {
  return cdekFetch<{ tariff_codes: CdekTariffQuote[] }>("/calculator/tarifflist", {
    method: "POST",
    body: {
      from_location: { code: input.fromLocationCode },
      to_location: { code: input.toLocationCode },
      packages: [
        {
          weight: input.weightGram,
          length: input.lengthCm,
          width: input.widthCm,
          height: input.heightCm,
        },
      ],
    },
  });
}

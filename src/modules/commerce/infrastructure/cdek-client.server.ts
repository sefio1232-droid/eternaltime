import "server-only";

import { getServerEnv } from "@/config/server-env";

const requestTimeoutMs = 10_000;

export type CdekCity = {
  code: number;
  city: string;
  region?: string;
  country?: string;
  postal_codes?: string[];
};

export type CdekPickupPoint = {
  code: string;
  name?: string;
  postal_code?: string;
  nearest_station?: string;
  location?: {
    city_code?: number;
    city?: string;
    address?: string;
    address_full?: string;
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
  total_sum?: number;
  period_min?: number;
  period_max?: number;
};

export type CdekCreateOrderResponse = {
  entity?: {
    uuid?: string;
    cdek_number?: string;
    number?: string;
  };
  requests?: Array<{
    request_uuid?: string;
    type?: string;
    state?: string;
    errors?: Array<{ code?: string; message?: string }>;
  }>;
  related_entities?: unknown[];
};

export type CdekOrderInfo = {
  entity?: {
    uuid?: string;
    cdek_number?: string;
    number?: string;
    statuses?: Array<{
      code?: string;
      name?: string;
      city?: string;
      date_time?: string;
    }>;
  };
};

export class CdekConfigurationError extends Error {
  constructor(message = "CDEK is not configured. Set CDEK_CLIENT_ID and CDEK_CLIENT_SECRET.") {
    super(message);
    this.name = "CdekConfigurationError";
  }
}

export class CdekAuthenticationError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`CDEK authentication failed with HTTP ${status}.`);
    this.name = "CdekAuthenticationError";
    this.status = status;
  }
}

export class CdekValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CdekValidationError";
  }
}

export class CdekRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CdekRateError";
  }
}

export class CdekShipmentCreationError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "CdekShipmentCreationError";
    this.status = status;
  }
}

export class CdekUnavailableError extends Error {
  readonly status?: number;

  constructor(message = "CDEK is temporarily unavailable.", status?: number) {
    super(message);
    this.name = "CdekUnavailableError";
    this.status = status;
  }
}

let tokenCache: { token: string; expiresAt: number } | null = null;
let tokenPromise: Promise<string> | null = null;

function cdekBaseUrl(): string {
  return getServerEnv().cdek.apiBaseUrl.replace(/\/$/, "");
}

function safeJsonParse(text: string): unknown {
  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new CdekUnavailableError("CDEK request timed out.");
    }
    throw new CdekUnavailableError();
  } finally {
    clearTimeout(timeout);
  }
}

async function requestCdekAccessToken(): Promise<string> {
  const env = getServerEnv();

  if (!env.cdek.isConfigured) {
    throw new CdekConfigurationError();
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.cdek.clientId,
    client_secret: env.cdek.clientSecret,
  });

  const response = await fetchWithTimeout(`${cdekBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "EternalTime/1.0 (+server-side CDEK integration)",
    },
    body,
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    throw new CdekAuthenticationError(response.status);
  }

  const parsed = safeJsonParse(text) as { access_token?: string; expires_in?: number } | null;
  if (!parsed?.access_token) {
    throw new CdekAuthenticationError(response.status);
  }

  tokenCache = {
    token: parsed.access_token,
    expiresAt: Date.now() + Math.max(60, parsed.expires_in ?? 3600) * 1000,
  };

  return parsed.access_token;
}

export async function getCdekAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }

  tokenPromise ??= requestCdekAccessToken().finally(() => {
    tokenPromise = null;
  });

  return tokenPromise;
}

async function cdekFetch<T>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown; errorKind?: "rate" | "shipment" | "validation" } = {},
): Promise<T> {
  const token = await getCdekAccessToken();
  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
    "X-App-Name": "widget_pvz",
    "X-App-Version": "3.11.1",
    "User-Agent": "EternalTime/1.0 (+server-side CDEK integration)",
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetchWithTimeout(`${cdekBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  if (!response.ok) {
    if (options.errorKind === "rate") {
      throw new CdekRateError(`CDEK rate request failed with HTTP ${response.status}.`);
    }
    if (options.errorKind === "shipment") {
      throw new CdekShipmentCreationError(`CDEK shipment request failed with HTTP ${response.status}.`, response.status);
    }
    if (response.status === 400 || response.status === 422) {
      throw new CdekValidationError(`CDEK validation failed with HTTP ${response.status}.`);
    }
    throw new CdekUnavailableError(`CDEK API request failed with HTTP ${response.status}.`, response.status);
  }

  return safeJsonParse(text) as T;
}

function cleanWidgetServicePayload(input: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(input).filter(([key, value]) => key !== "action" && value !== undefined && value !== null && value !== ""),
  );
}

export async function proxyCdekWidgetService(input: Record<string, unknown>): Promise<unknown> {
  const action = typeof input.action === "string" ? input.action : "";
  const payload = cleanWidgetServicePayload(input);

  if (action === "offices") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(payload)) {
      if (Array.isArray(value)) {
        for (const item of value) params.append(key, String(item));
      } else if (typeof value === "object") {
        params.set(key, JSON.stringify(value));
      } else {
        params.set(key, String(value));
      }
    }
    return cdekFetch<unknown>(`/deliverypoints?${params.toString()}`);
  }

  if (action === "calculate") {
    return cdekFetch<unknown>("/calculator/tarifflist", {
      method: "POST",
      errorKind: "rate",
      body: payload,
    });
  }

  throw new CdekValidationError("Unknown CDEK widget service action.");
}

export async function searchCdekCities(input: { city: string; limit?: number }): Promise<CdekCity[]> {
  const city = input.city.trim();
  if (city.length < 2) {
    return [];
  }

  const params = new URLSearchParams();
  params.set("city", city);
  params.set("country_codes", "RU");
  params.set("size", String(Math.min(Math.max(input.limit ?? 10, 1), 30)));

  return cdekFetch<CdekCity[]>(`/location/cities?${params.toString()}`);
}

export async function listCdekPickupPoints(input: {
  cityCode?: number;
  postalCode?: string;
  city?: string;
  limit?: number;
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

  const points = await cdekFetch<CdekPickupPoint[]>(`/deliverypoints?${params.toString()}`);
  return points.slice(0, Math.min(Math.max(input.limit ?? 30, 1), 100));
}

export async function getCdekPickupPointByCode(code: string): Promise<CdekPickupPoint | null> {
  const normalized = code.trim();
  if (!normalized) {
    return null;
  }

  const params = new URLSearchParams();
  params.set("code", normalized);
  const points = await cdekFetch<CdekPickupPoint[]>(`/deliverypoints?${params.toString()}`, {
    errorKind: "validation",
  });
  return points.find((point) => point.code === normalized) ?? points[0] ?? null;
}

export async function calculateCdekTariff(input: {
  tariffCode: number;
  fromLocationCode: number;
  toLocationCode: number;
  weightGram: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}): Promise<CdekTariffQuote> {
  return cdekFetch<CdekTariffQuote>("/calculator/tariff", {
    method: "POST",
    errorKind: "rate",
    body: {
      tariff_code: input.tariffCode,
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
    errorKind: "rate",
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

export async function createCdekOrder(payload: Record<string, unknown>): Promise<CdekCreateOrderResponse> {
  return cdekFetch<CdekCreateOrderResponse>("/orders", {
    method: "POST",
    errorKind: "shipment",
    body: payload,
  });
}

export async function getCdekOrderInfo(uuid: string): Promise<CdekOrderInfo> {
  if (!uuid.trim()) {
    throw new CdekValidationError("CDEK order UUID is required.");
  }

  return cdekFetch<CdekOrderInfo>(`/orders/${encodeURIComponent(uuid)}`);
}

export function resetCdekTokenCacheForTests() {
  tokenCache = null;
  tokenPromise = null;
}

import "server-only";

import { z } from "zod";

export type ServerEnv = {
  nodeEnv: "development" | "test" | "production";
  catalogReadSource: "database" | "preview";
  supabase: {
    serviceRoleKey: string;
    hasServiceRole: boolean;
  };
  commerce: {
    deliveryPricingMode: "included" | "flat" | "cdek_threshold" | "not_configured";
    deliveryFlatAmountMinor: number | null;
    cdekFreeDeliveryThresholdMinor: number;
    cdekBelowThresholdAmountMinor: number;
  };
  cdek: {
    isConfigured: boolean;
    apiBaseUrl: string;
    clientId: string;
    clientSecret: string;
    account: string;
    securePassword: string;
    fromLocationCode: number | null;
    defaultTariffCode: number | null;
  };
  yookassa: {
    isConfigured: boolean;
    apiBaseUrl: string;
    shopId: string;
    secretKey: string;
    webhookBasicAuthUser: string;
    webhookBasicAuthPassword: string;
    receiptsEnabled: boolean;
  };
};

const deliveryPricingModeSchema = z
  .enum(["included", "flat", "cdek_threshold", "not_configured"])
  .default("cdek_threshold");

function parseRubAmountMinor(raw: string | undefined): number | null {
  if (!raw) {
    return null;
  }

  const normalized = raw.trim().replace(",", ".");
  const rub = Number(normalized);

  if (!Number.isFinite(rub) || rub < 0) {
    return null;
  }

  return Math.round(rub * 100);
}

function parseOptionalInteger(raw: string | undefined): number | null {
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export function getServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  const nodeEnv = source.NODE_ENV;
  const catalogReadSource = source.CATALOG_READ_SOURCE === "preview" ? "preview" : "database";
  const deliveryPricingMode = deliveryPricingModeSchema.catch("not_configured").parse(source.DELIVERY_PRICING_MODE);
  const deliveryFlatAmountMinor = parseRubAmountMinor(source.DELIVERY_FLAT_AMOUNT_RUB);
  const cdekFreeDeliveryThresholdMinor =
    parseRubAmountMinor(source.CDEK_FREE_DELIVERY_THRESHOLD_RUB) ?? 1_000_000;
  const cdekBelowThresholdAmountMinor =
    parseRubAmountMinor(source.CDEK_BELOW_THRESHOLD_DELIVERY_RUB) ?? 50_000;
  const yookassaShopId = source.YOOKASSA_SHOP_ID?.trim() ?? "";
  const yookassaSecretKey = source.YOOKASSA_SECRET_KEY?.trim() ?? "";
  const cdekClientId = source.CDEK_CLIENT_ID?.trim() ?? source.CDEK_ACCOUNT?.trim() ?? "";
  const cdekClientSecret = source.CDEK_CLIENT_SECRET?.trim() ?? source.CDEK_SECURE_PASSWORD?.trim() ?? "";

  const resolvedNodeEnv = nodeEnv === "production" || nodeEnv === "test" ? nodeEnv : "development";

  return {
    nodeEnv: resolvedNodeEnv,
    catalogReadSource,
    supabase: {
      serviceRoleKey: source.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
      hasServiceRole: Boolean(source.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    },
    commerce: {
      deliveryPricingMode,
      deliveryFlatAmountMinor: deliveryPricingMode === "flat" ? deliveryFlatAmountMinor : null,
      cdekFreeDeliveryThresholdMinor,
      cdekBelowThresholdAmountMinor,
    },
    cdek: {
      isConfigured: Boolean(cdekClientId && cdekClientSecret),
      apiBaseUrl: source.CDEK_API_BASE_URL?.trim() || "https://api.cdek.ru/v2",
      clientId: cdekClientId,
      clientSecret: cdekClientSecret,
      account: source.CDEK_ACCOUNT?.trim() ?? "",
      securePassword: source.CDEK_SECURE_PASSWORD?.trim() ?? "",
      fromLocationCode: parseOptionalInteger(source.CDEK_FROM_LOCATION_CODE),
      defaultTariffCode: parseOptionalInteger(source.CDEK_DEFAULT_TARIFF_CODE),
    },
    yookassa: {
      isConfigured: Boolean(yookassaShopId && yookassaSecretKey),
      apiBaseUrl: source.YOOKASSA_API_BASE_URL?.trim() || "https://api.yookassa.ru/v3",
      shopId: yookassaShopId,
      secretKey: yookassaSecretKey,
      webhookBasicAuthUser: source.YOOKASSA_WEBHOOK_BASIC_AUTH_USER?.trim() ?? "",
      webhookBasicAuthPassword: source.YOOKASSA_WEBHOOK_BASIC_AUTH_PASSWORD?.trim() ?? "",
      receiptsEnabled: source.YOOKASSA_RECEIPTS_ENABLED === "true",
    },
  };
}

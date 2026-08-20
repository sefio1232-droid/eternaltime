import "server-only";

import { z } from "zod";

export type ServerEnv = {
  nodeEnv: "development" | "test" | "production";
  catalogReadSource: "database" | "preview";
  supabase: {
    adminSecretKey: string;
    hasAdminSecret: boolean;
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
    widgetYandexMapsApiKey: string;
    hasWidgetYandexMapsApiKey: boolean;
    fromLocationCode: number | null;
    defaultTariffCode: number | null;
    pickupTariffCode: number | null;
    courierTariffCode: number | null;
    webhookToken: string;
    packagePolicy: {
      weightGrams: number | null;
      lengthCm: number | null;
      widthCm: number | null;
      heightCm: number | null;
      isConfigured: boolean;
    };
  };
  yookassa: {
    isConfigured: boolean;
    apiBaseUrl: string;
    shopId: string;
    secretKey: string;
    webhookBasicAuthUser: string;
    webhookBasicAuthPassword: string;
    receiptsEnabled: boolean;
    receiptVatCode: number | null;
    receiptPaymentSubject: string;
    receiptPaymentMode: string;
    receiptTaxSystemCode: number | null;
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
  const cdekClientId = source.CDEK_CLIENT_ID?.trim() ?? "";
  const cdekClientSecret = source.CDEK_CLIENT_SECRET?.trim() ?? "";
  const cdekPackageWeightGrams = parseOptionalInteger(source.CDEK_DEFAULT_PACKAGE_WEIGHT_GRAMS);
  const cdekPackageLengthCm = parseOptionalInteger(source.CDEK_DEFAULT_PACKAGE_LENGTH_CM);
  const cdekPackageWidthCm = parseOptionalInteger(source.CDEK_DEFAULT_PACKAGE_WIDTH_CM);
  const cdekPackageHeightCm = parseOptionalInteger(source.CDEK_DEFAULT_PACKAGE_HEIGHT_CM);

  const resolvedNodeEnv = nodeEnv === "production" || nodeEnv === "test" ? nodeEnv : "development";

  return {
    nodeEnv: resolvedNodeEnv,
    catalogReadSource,
    supabase: {
      adminSecretKey: source.SUPABASE_SECRET_KEY?.trim() ?? "",
      hasAdminSecret: Boolean(source.SUPABASE_SECRET_KEY?.trim()),
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
      widgetYandexMapsApiKey: source.CDEK_WIDGET_YANDEX_MAPS_API_KEY?.trim() ?? "",
      hasWidgetYandexMapsApiKey: Boolean(source.CDEK_WIDGET_YANDEX_MAPS_API_KEY?.trim()),
      fromLocationCode: parseOptionalInteger(source.CDEK_ORIGIN_CITY_CODE) ?? parseOptionalInteger(source.CDEK_FROM_LOCATION_CODE),
      defaultTariffCode: parseOptionalInteger(source.CDEK_DEFAULT_TARIFF_CODE),
      pickupTariffCode:
        parseOptionalInteger(source.CDEK_PICKUP_TARIFF_CODE) ?? parseOptionalInteger(source.CDEK_DEFAULT_TARIFF_CODE),
      courierTariffCode:
        parseOptionalInteger(source.CDEK_COURIER_TARIFF_CODE) ?? parseOptionalInteger(source.CDEK_DEFAULT_TARIFF_CODE),
      webhookToken: source.CDEK_WEBHOOK_TOKEN?.trim() ?? "",
      packagePolicy: {
        weightGrams: cdekPackageWeightGrams,
        lengthCm: cdekPackageLengthCm,
        widthCm: cdekPackageWidthCm,
        heightCm: cdekPackageHeightCm,
        isConfigured: Boolean(
          cdekPackageWeightGrams &&
            cdekPackageLengthCm &&
            cdekPackageWidthCm &&
            cdekPackageHeightCm,
        ),
      },
    },
    yookassa: {
      isConfigured: Boolean(yookassaShopId && yookassaSecretKey),
      apiBaseUrl: source.YOOKASSA_API_BASE_URL?.trim() || "https://api.yookassa.ru/v3",
      shopId: yookassaShopId,
      secretKey: yookassaSecretKey,
      webhookBasicAuthUser: source.YOOKASSA_WEBHOOK_BASIC_AUTH_USER?.trim() ?? "",
      webhookBasicAuthPassword: source.YOOKASSA_WEBHOOK_BASIC_AUTH_PASSWORD?.trim() ?? "",
      receiptsEnabled: source.YOOKASSA_RECEIPTS_ENABLED === "true",
      receiptVatCode: parseOptionalInteger(source.YOOKASSA_RECEIPT_VAT_CODE),
      receiptPaymentSubject: source.YOOKASSA_RECEIPT_PAYMENT_SUBJECT?.trim() ?? "",
      receiptPaymentMode: source.YOOKASSA_RECEIPT_PAYMENT_MODE?.trim() ?? "",
      receiptTaxSystemCode: parseOptionalInteger(source.YOOKASSA_RECEIPT_TAX_SYSTEM_CODE),
    },
  };
}

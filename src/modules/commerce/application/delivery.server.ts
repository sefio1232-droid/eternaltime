import "server-only";

import { getServerEnv, type ServerEnv } from "@/config/server-env";
import type { DeliveryQuote } from "@/modules/commerce/domain/types";

export function getDeliveryQuote(
  input: { productSubtotalMinor: number },
  env: ServerEnv = getServerEnv(),
): DeliveryQuote {
  const productSubtotalMinor = Math.max(0, input.productSubtotalMinor);

  if (env.commerce.deliveryPricingMode === "included") {
    return {
      status: "configured",
      provider: "included",
      method: "included",
      label: "Доставка включена в стоимость",
      amountMinor: 0,
      currencyCode: "RUB",
      tariffCode: null,
      freeDeliveryThresholdMinor: null,
      snapshot: {
        mode: "included",
      },
    };
  }

  if (env.commerce.deliveryPricingMode === "flat" && env.commerce.deliveryFlatAmountMinor !== null) {
    return {
      status: "configured",
      provider: "flat",
      method: "courier",
      label: "Фиксированная доставка",
      amountMinor: env.commerce.deliveryFlatAmountMinor,
      currencyCode: "RUB",
      tariffCode: null,
      freeDeliveryThresholdMinor: null,
      snapshot: {
        mode: "flat",
        amountMinor: env.commerce.deliveryFlatAmountMinor,
      },
    };
  }

  if (env.commerce.deliveryPricingMode === "cdek_threshold") {
    const isFree = productSubtotalMinor >= env.commerce.cdekFreeDeliveryThresholdMinor;
    const amountMinor = isFree ? 0 : env.commerce.cdekBelowThresholdAmountMinor;
    const fallbackTariffCode = env.cdek.pickupTariffCode ?? env.cdek.courierTariffCode ?? env.cdek.defaultTariffCode;

    return {
      status: "configured",
      provider: "cdek",
      method: "courier",
      label: isFree ? "СДЭК — бесплатно от 10 000 ₽" : "СДЭК",
      amountMinor,
      currencyCode: "RUB",
      tariffCode: fallbackTariffCode ? String(fallbackTariffCode) : null,
      freeDeliveryThresholdMinor: env.commerce.cdekFreeDeliveryThresholdMinor,
      snapshot: {
        mode: "cdek_threshold",
        provider: "cdek",
        amountMinor,
        freeDeliveryThresholdMinor: env.commerce.cdekFreeDeliveryThresholdMinor,
        belowThresholdAmountMinor: env.commerce.cdekBelowThresholdAmountMinor,
        subtotalMinor: productSubtotalMinor,
        pickupTariffCode: env.cdek.pickupTariffCode,
        courierTariffCode: env.cdek.courierTariffCode,
        fromLocationCode: env.cdek.fromLocationCode,
        cdekCredentialsConfigured: env.cdek.isConfigured,
      },
    };
  }

  return {
    status: "not_configured",
    provider: "none",
    method: "courier",
    label: "Стоимость доставки не настроена",
    amountMinor: null,
    currencyCode: "RUB",
    tariffCode: null,
    freeDeliveryThresholdMinor: null,
    snapshot: {
      mode: "not_configured",
    },
  };
}

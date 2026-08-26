import "server-only";

import { getServerEnv, type ServerEnv } from "@/config/server-env";
import type { CheckoutContactInput, DeliveryQuote } from "@/modules/commerce/domain/types";

export const cdekCourierDeliveryAmountMinor = 65_000;

type DeliveryQuoteMethod = CheckoutContactInput["deliveryMethod"];

export function getDeliveryQuote(
  input: { productSubtotalMinor: number; deliveryMethod?: DeliveryQuoteMethod },
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
    if (input.deliveryMethod === "cdek_courier") {
      return {
        status: "configured",
        provider: "cdek",
        method: "courier",
        label: "СДЭК — курьером",
        amountMinor: cdekCourierDeliveryAmountMinor,
        currencyCode: "RUB",
        tariffCode: env.cdek.courierTariffCode ? String(env.cdek.courierTariffCode) : null,
        freeDeliveryThresholdMinor: null,
        snapshot: {
          mode: "cdek_courier_flat",
          provider: "cdek",
          amountMinor: cdekCourierDeliveryAmountMinor,
          courierDeliveryAmountMinor: cdekCourierDeliveryAmountMinor,
          subtotalMinor: productSubtotalMinor,
          courierTariffCode: env.cdek.courierTariffCode,
          fromLocationCode: env.cdek.fromLocationCode,
          cdekCredentialsConfigured: env.cdek.isConfigured,
        },
      };
    }

    const isFree = productSubtotalMinor >= env.commerce.cdekFreeDeliveryThresholdMinor;
    const amountMinor = isFree ? 0 : env.commerce.cdekBelowThresholdAmountMinor;
    const fallbackTariffCode = env.cdek.pickupTariffCode ?? env.cdek.defaultTariffCode;

    return {
      status: "configured",
      provider: "cdek",
      method: "pickup",
      label: isFree ? "СДЭК ПВЗ — бесплатно от 10 000 ₽" : "СДЭК ПВЗ",
      amountMinor,
      currencyCode: "RUB",
      tariffCode: fallbackTariffCode ? String(fallbackTariffCode) : null,
      freeDeliveryThresholdMinor: env.commerce.cdekFreeDeliveryThresholdMinor,
      snapshot: {
        mode: "cdek_pickup_threshold",
        provider: "cdek",
        amountMinor,
        freeDeliveryThresholdMinor: env.commerce.cdekFreeDeliveryThresholdMinor,
        belowThresholdAmountMinor: env.commerce.cdekBelowThresholdAmountMinor,
        subtotalMinor: productSubtotalMinor,
        pickupTariffCode: env.cdek.pickupTariffCode,
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

import type { Money } from "@/modules/catalog/domain/money";
import type { CatalogOfferStatus } from "@/modules/catalog/domain/types";

export type PublicCommerceStateKind = "purchasable" | "temporarily_unavailable" | "catalog_only";

export type PublicCommerceOfferInput = {
  status: CatalogOfferStatus | string | null;
  isVisible: boolean | null;
  currentPriceMinor: number | null;
  currencyCode: string | null;
  inventoryIsOrderable?: boolean | null;
  inventoryCode?: string | null;
  deliveryEstimateLabel?: string | null;
};

export type PublicCommerceStateInput = {
  publicPrice: Money | null;
  offer?: PublicCommerceOfferInput | null;
};

export type PublicCommerceState = {
  kind: PublicCommerceStateKind;
  publicLabel: string;
  shortLabel: string;
  priceVisible: boolean;
  purchaseAllowed: boolean;
  buyNowAllowed: boolean;
  addToCartAllowed: boolean;
  deliveryCopy: string | null;
  legalDeliveryCopy: string;
  reason: "active_offer" | "offer_unavailable" | "catalog_only";
};

export const defaultDeliveryOrientationCopy = "Ориентир доставки — около 12 календарных дней.";
export const defaultLegalDeliveryLimitCopy = "Предельный срок исполнения заказа — 45 календарных дней.";

export function isValidRubPrice(price: Money | null | undefined): price is Money {
  return Boolean(
    price &&
      price.currencyCode === "RUB" &&
      Number.isSafeInteger(price.amountMinor) &&
      price.amountMinor > 0,
  );
}

function offerHasValidRubPrice(offer: PublicCommerceOfferInput | null | undefined): boolean {
  return Boolean(
    offer &&
      offer.currencyCode === "RUB" &&
      Number.isSafeInteger(offer.currentPriceMinor) &&
      Number(offer.currentPriceMinor) > 0,
  );
}

export function getPublicCommerceState(input: PublicCommerceStateInput): PublicCommerceState {
  const offer = input.offer ?? null;
  const activeVisibleOffer =
    offer?.status === "active" &&
    offer.isVisible === true &&
    offerHasValidRubPrice(offer) &&
    offer.inventoryIsOrderable !== false;

  if (activeVisibleOffer) {
    return {
      kind: "purchasable",
      publicLabel: "Можно заказать",
      shortLabel: "Доступно для заказа",
      priceVisible: true,
      purchaseAllowed: true,
      buyNowAllowed: true,
      addToCartAllowed: true,
      deliveryCopy: offer.deliveryEstimateLabel || defaultDeliveryOrientationCopy,
      legalDeliveryCopy: defaultLegalDeliveryLimitCopy,
      reason: "active_offer",
    };
  }

  if (offer) {
    return {
      kind: "temporarily_unavailable",
      publicLabel: "Сейчас недоступно для заказа",
      shortLabel: "Недоступно для заказа",
      priceVisible: false,
      purchaseAllowed: false,
      buyNowAllowed: false,
      addToCartAllowed: false,
      deliveryCopy: null,
      legalDeliveryCopy: defaultLegalDeliveryLimitCopy,
      reason: "offer_unavailable",
    };
  }

  return {
    kind: "catalog_only",
    publicLabel: "Сейчас без активного предложения",
    shortLabel: "Без предложения",
    priceVisible: false,
    purchaseAllowed: false,
    buyNowAllowed: false,
    addToCartAllowed: false,
    deliveryCopy: null,
    legalDeliveryCopy: defaultLegalDeliveryLimitCopy,
    reason: "catalog_only",
  };
}

export function commerceRank(state: PublicCommerceState | null | undefined): number {
  if (state?.kind === "purchasable") return 2;
  if (state?.kind === "temporarily_unavailable") return 1;
  return 0;
}

export function publicCommercePriceLabel(price: Money | null, state: PublicCommerceState): Money | null {
  return state.priceVisible ? price : null;
}

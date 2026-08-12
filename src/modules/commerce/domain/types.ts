import type { Money } from "@/modules/catalog/domain/money";
import type { CatalogImagePresentation } from "@/modules/catalog/domain/read-models";

export const commerceCartStorageKey = "eternal-time:cart:v2";
export const commerceCartMaxQuantity = 5;

export type CommerceCartSource = "catalog" | "selection" | "journal" | "buy_now";

export type CommerceCartItemInput = {
  brandSlug: string;
  referenceNormalized: string;
  quantity: number;
  source: CommerceCartSource;
  addedAt: string;
};

export type CommerceCartStorage = {
  schemaVersion: 2;
  items: CommerceCartItemInput[];
};

export type CommerceProductSnapshot = {
  brandSlug: string;
  referenceNormalized: string;
  referenceDisplay: string;
  referenceSlug: string;
  brandName: string;
  displayName: string;
  canonicalHref: string;
  image: CatalogImagePresentation;
  publicPrice: Money | null;
  purchasable: boolean;
};

export type CommerceResolvedLine = {
  input: CommerceCartItemInput;
  product: CommerceProductSnapshot | null;
  quantity: number;
  unitPrice: Money | null;
  lineTotalMinor: number | null;
  issue: "not_found" | "not_purchasable" | null;
};

export type DeliveryQuote =
  | {
      status: "configured";
      provider: "included" | "flat" | "cdek";
      method: "included" | "courier" | "pickup";
      label: string;
      amountMinor: number;
      currencyCode: "RUB";
      tariffCode: string | null;
      freeDeliveryThresholdMinor: number | null;
      snapshot: Record<string, unknown>;
    }
  | {
      status: "not_configured";
      provider: "none";
      method: "courier";
      label: string;
      amountMinor: null;
      currencyCode: "RUB";
      tariffCode: null;
      freeDeliveryThresholdMinor: null;
      snapshot: Record<string, unknown>;
    };

export type CommerceResolvedSummary = {
  lines: CommerceResolvedLine[];
  productSubtotalMinor: number;
  delivery: DeliveryQuote;
  totalAmountMinor: number | null;
  currencyCode: "RUB";
  itemCount: number;
  purchasable: boolean;
  issues: string[];
};

export type CheckoutSource =
  | { type: "buy_now"; item: CommerceCartItemInput }
  | { type: "cart"; items: CommerceCartItemInput[] };

export type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "processing"
  | "supplier_ordered"
  | "in_transit"
  | "local_delivery"
  | "completed"
  | "cancelled";

export type OrderPaymentStatus =
  | "not_started"
  | "pending"
  | "succeeded"
  | "partially_refunded"
  | "refunded";

export type PaymentAttemptStatus =
  | "created"
  | "pending"
  | "waiting_for_capture"
  | "succeeded"
  | "canceled"
  | "failed";

export type RefundStatus = "pending" | "succeeded" | "canceled" | "failed";

export type CheckoutContactInput = {
  recipientName: string;
  phone: string;
  email: string;
  deliveryMethod?: "cdek_courier" | "cdek_pickup";
  cdekPickupPointCode?: string;
  cdekPickupPointAddress?: string;
  city: string;
  postalCode: string;
  street: string;
  house: string;
  unit?: string;
  deliveryComment?: string;
  customerComment?: string;
};

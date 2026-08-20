import type { CheckoutContactInput, OrderShipmentStatus } from "@/modules/commerce/domain/types";

export type CdekStatusMapping = {
  status: OrderShipmentStatus;
  customerMessage: string;
};

const statusGroups: Array<{ patterns: RegExp[]; mapping: CdekStatusMapping }> = [
  {
    patterns: [/delivered|вручен|получен/i],
    mapping: { status: "delivered", customerMessage: "Доставка получена." },
  },
  {
    patterns: [/ready|готов.*выдач|ожидает.*получ/i],
    mapping: { status: "ready_for_pickup", customerMessage: "Заказ готов к выдаче." },
  },
  {
    patterns: [/arrived|прибыл|поступил.*пвз|поступил.*склад/i],
    mapping: { status: "arrived_at_pickup_point", customerMessage: "Заказ прибыл в пункт выдачи." },
  },
  {
    patterns: [/transit|в пути|отправлен|перемещ/i],
    mapping: { status: "in_transit", customerMessage: "Заказ в пути." },
  },
  {
    patterns: [/accepted|handed|принят|передан/i],
    mapping: { status: "handed_over", customerMessage: "Заказ передан в СДЭК." },
  },
  {
    patterns: [/return|возврат/i],
    mapping: { status: "returning", customerMessage: "Заказ возвращается." },
  },
  {
    patterns: [/cancel|error|fail|problem|отмен|ошиб|проблем/i],
    mapping: { status: "problem", customerMessage: "Есть проблема с доставкой. Мы проверяем статус." },
  },
];

export function mapCdekStatusToShipmentStatus(input: {
  code?: string | null;
  name?: string | null;
}): CdekStatusMapping {
  const statusText = `${input.code ?? ""} ${input.name ?? ""}`.trim();

  for (const group of statusGroups) {
    if (group.patterns.some((pattern) => pattern.test(statusText))) {
      return group.mapping;
    }
  }

  return { status: "created", customerMessage: "Доставка оформлена." };
}

export function cdekTrackingUrl(trackingNumber: string | null | undefined): string | null {
  if (!trackingNumber) {
    return null;
  }

  const normalized = trackingNumber.trim();
  if (!normalized) {
    return null;
  }

  const url = new URL("https://www.cdek.ru/ru/tracking/");
  url.searchParams.set("order_id", normalized);
  return url.toString();
}

export function publicDeliveryAddress(contact: CheckoutContactInput): Record<string, string | number> {
  if (contact.deliveryMethod === "cdek_pickup") {
    return {
      method: "cdek_pickup",
      city: contact.cdekPickupPointCity || contact.city,
      pointCode: contact.cdekPickupPointCode || "",
      pointName: contact.cdekPickupPointName || "",
      pointAddress: contact.cdekPickupPointAddress || "",
      postalCode: contact.cdekPickupPointPostalCode || contact.postalCode || "",
      ...(contact.cdekPickupPointWorkTime ? { workTime: contact.cdekPickupPointWorkTime } : {}),
      ...(contact.cdekPickupPointNote ? { note: contact.cdekPickupPointNote } : {}),
      ...(typeof contact.cdekPickupPointLatitude === "number" ? { latitude: contact.cdekPickupPointLatitude } : {}),
      ...(typeof contact.cdekPickupPointLongitude === "number" ? { longitude: contact.cdekPickupPointLongitude } : {}),
    };
  }

  return {
    method: "cdek_courier",
    city: contact.city,
    postalCode: contact.postalCode || "",
    street: contact.street || "",
    house: contact.house || "",
    ...(contact.unit ? { unit: contact.unit } : {}),
  };
}

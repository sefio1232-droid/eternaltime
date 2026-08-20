import { z } from "zod";
import { normalizeCommerceCartItem } from "@/modules/commerce/domain/cart";
import type { CheckoutContactInput, CheckoutSource } from "@/modules/commerce/domain/types";

const cartItemSchema = z
  .unknown()
  .transform((value, context) => {
    const normalized = normalizeCommerceCartItem(value);
    if (!normalized) {
      context.addIssue({ code: "custom", message: "Некорректная модель в корзине." });
      return z.NEVER;
    }
    return normalized;
  });

export const checkoutContactSchema = z.object({
  recipientName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(5).max(32),
  email: z.string().trim().email().max(254),
  deliveryMethod: z.enum(["cdek_courier", "cdek_pickup"]).default("cdek_courier"),
  cdekCityCode: z.number().int().positive().optional(),
  cdekPickupPointCode: z.string().trim().max(64).optional().or(z.literal("")),
  cdekPickupPointName: z.string().trim().max(180).optional().or(z.literal("")),
  cdekPickupPointAddress: z.string().trim().max(300).optional().or(z.literal("")),
  cdekPickupPointCity: z.string().trim().max(120).optional().or(z.literal("")),
  cdekPickupPointPostalCode: z.string().trim().max(20).optional().or(z.literal("")),
  cdekPickupPointLatitude: z.number().finite().optional(),
  cdekPickupPointLongitude: z.number().finite().optional(),
  cdekPickupPointWorkTime: z.string().trim().max(240).optional().or(z.literal("")),
  cdekPickupPointNote: z.string().trim().max(500).optional().or(z.literal("")),
  cdekPickupPointProviderSnapshot: z.record(z.string(), z.unknown()).optional(),
  city: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().max(20).optional().or(z.literal("")),
  street: z.string().trim().max(160).optional().or(z.literal("")),
  house: z.string().trim().max(32).optional().or(z.literal("")),
  unit: z.string().trim().max(64).optional().or(z.literal("")),
  deliveryComment: z.string().trim().max(500).optional().or(z.literal("")),
  customerComment: z.string().trim().max(500).optional().or(z.literal("")),
  legalOfferAccepted: z.literal(true, { message: "Необходимо принять Публичную оферту." }),
  personalDataConsentAccepted: z.literal(true, { message: "Необходимо дать согласие на обработку персональных данных." }),
  marketingConsentAccepted: z.boolean().optional().default(false),
}).superRefine((contact, context) => {
  if (contact.deliveryMethod === "cdek_pickup") {
    if (!contact.cdekPickupPointCode?.trim()) {
      context.addIssue({ code: "custom", path: ["cdekPickupPointCode"], message: "Выберите пункт выдачи СДЭК." });
    }
    if (!contact.cdekPickupPointAddress?.trim()) {
      context.addIssue({ code: "custom", path: ["cdekPickupPointAddress"], message: "Выберите пункт выдачи СДЭК." });
    }
    return;
  }

  if (!contact.postalCode?.trim()) {
    context.addIssue({ code: "custom", path: ["postalCode"], message: "Укажите индекс для курьерской доставки." });
  }
  if (!contact.street?.trim()) {
    context.addIssue({ code: "custom", path: ["street"], message: "Укажите улицу для курьерской доставки." });
  }
  if (!contact.house?.trim()) {
    context.addIssue({ code: "custom", path: ["house"], message: "Укажите дом для курьерской доставки." });
  }
}) satisfies z.ZodType<CheckoutContactInput>;

export const createCheckoutOrderSchema = z.object({
  checkoutSubmissionKey: z.string().uuid(),
  source: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("buy_now"),
      item: cartItemSchema,
    }),
    z.object({
      type: z.literal("cart"),
      items: z.array(cartItemSchema).min(1).max(30),
    }),
  ]) satisfies z.ZodType<CheckoutSource>,
  contact: checkoutContactSchema,
});

export type CreateCheckoutOrderInput = z.infer<typeof createCheckoutOrderSchema>;

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
  cdekPickupPointCode: z.string().trim().max(64).optional().or(z.literal("")),
  cdekPickupPointAddress: z.string().trim().max(300).optional().or(z.literal("")),
  city: z.string().trim().min(2).max(120),
  postalCode: z.string().trim().min(3).max(20),
  street: z.string().trim().min(2).max(160),
  house: z.string().trim().min(1).max(32),
  unit: z.string().trim().max(64).optional().or(z.literal("")),
  deliveryComment: z.string().trim().max(500).optional().or(z.literal("")),
  customerComment: z.string().trim().max(500).optional().or(z.literal("")),
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

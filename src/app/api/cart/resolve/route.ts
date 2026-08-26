import { NextResponse } from "next/server";
import { z } from "zod";
import { resolveCommerceSummary } from "@/modules/commerce/application/catalog-product-resolver.server";
import { normalizeCommerceCartItem } from "@/modules/commerce/domain/cart";
import type { CommerceCartItemInput } from "@/modules/commerce/domain/types";

const resolveCartSchema = z.object({
  items: z.array(z.unknown()).default([]),
  deliveryMethod: z.enum(["cdek_courier", "cdek_pickup"]).optional(),
});

export async function POST(request: Request) {
  const parsed = resolveCartSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_cart" }, { status: 400 });
  }

  const items = parsed.data.items
    .map(normalizeCommerceCartItem)
    .filter((item): item is CommerceCartItemInput => Boolean(item));
  const summary = await resolveCommerceSummary(items, { deliveryMethod: parsed.data.deliveryMethod });

  return NextResponse.json({ summary });
}

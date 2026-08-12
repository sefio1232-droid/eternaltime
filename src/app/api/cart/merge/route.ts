import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedSupabaseUser, mergeServerCartForUser } from "@/modules/commerce/infrastructure/commerce-repository.server";
import { normalizeCommerceCartItem } from "@/modules/commerce/domain/cart";
import type { CommerceCartItemInput } from "@/modules/commerce/domain/types";

const mergeCartSchema = z.object({
  items: z.array(z.unknown()).default([]),
});

export async function POST(request: Request) {
  const auth = await getAuthenticatedSupabaseUser();
  if (auth.status === "unconfigured") {
    return NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 });
  }
  if (auth.status === "unauthenticated") {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const parsed = mergeCartSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_cart" }, { status: 400 });
  }

  const items = parsed.data.items
    .map(normalizeCommerceCartItem)
    .filter((item): item is CommerceCartItemInput => Boolean(item));
  const result = await mergeServerCartForUser(auth.user.id, items);

  if (!result.ready) {
    return NextResponse.json({ error: result.reason }, { status: 503 });
  }

  return NextResponse.json(result);
}

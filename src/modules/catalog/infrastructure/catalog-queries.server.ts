import "server-only";

import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PublishedBrandSummary, PublishedReferenceSummary } from "@/modules/catalog/domain/types";

const brandSummarySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});

const referenceSummarySchema = z.object({
  id: z.string().uuid(),
  brand_id: z.string().uuid(),
  reference_code_display: z.string(),
  reference_code_normalized: z.string(),
  slug: z.string(),
  display_name: z.string(),
  status: z.enum(["published", "archival"]),
  brands: z.object({
    slug: z.string(),
  }),
});

export async function getPublishedBrandBySlug(slug: string): Promise<PublishedBrandSummary | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("brands")
    .select("id,name,slug")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return brandSummarySchema.parse(data);
}

export async function getPublishedReferenceByRoute(input: {
  brandSlug: string;
  referenceSlug: string;
}): Promise<PublishedReferenceSummary | null> {
  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("watch_references")
    .select("id,brand_id,reference_code_display,reference_code_normalized,slug,display_name,status,brands!inner(slug)")
    .eq("slug", input.referenceSlug)
    .eq("brands.slug", input.brandSlug)
    .in("status", ["published", "archival"])
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const parsed = referenceSummarySchema.parse(data);

  return {
    id: parsed.id,
    brandId: parsed.brand_id,
    brandSlug: parsed.brands.slug,
    referenceCodeDisplay: parsed.reference_code_display,
    referenceCodeNormalized: parsed.reference_code_normalized,
    slug: parsed.slug,
    displayName: parsed.display_name,
    status: parsed.status,
  };
}

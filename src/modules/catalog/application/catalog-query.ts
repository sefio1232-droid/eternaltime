import { z } from "zod";

export const catalogListInputSchema = z.object({
  brandSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).optional(),
  movementTypeCodes: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).max(10).default([]),
  dialColorCodes: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)).max(10).default([]),
  minPriceMinor: z.number().int().nonnegative().optional(),
  maxPriceMinor: z.number().int().nonnegative().optional(),
  currencyCode: z.string().regex(/^[A-Z]{3}$/).optional(),
  limit: z.number().int().min(1).max(60).default(24),
  cursor: z.string().optional(),
});

export type CatalogListInput = z.infer<typeof catalogListInputSchema>;

export function parseCatalogListInput(value: unknown): CatalogListInput {
  return catalogListInputSchema.parse(value);
}

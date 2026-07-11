import { z } from "zod";
import { ownershipStatuses } from "@/modules/user-watch-collection/domain/types";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().max(maximum).optional(),
  );

export const createCatalogUserWatchSchema = z.object({
  watchReferenceId: z.string().uuid(),
  displayName: optionalText(160),
  allowDuplicate: z.boolean().default(false),
});

export const createManualUserWatchSchema = z.object({
  displayName: z.string().trim().min(1).max(160),
  brandName: optionalText(120),
  modelName: optionalText(160),
  reference: optionalText(120),
  note: optionalText(3000),
});

export const updateOwnershipSchema = z
  .object({
    displayName: z.string().trim().min(1).max(160),
    acquiredAt: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.iso.date().optional(),
    ),
    acquisitionPriceMinor: z.number().int().nonnegative().optional(),
    acquisitionCurrencyCode: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
      z.string().regex(/^[A-Z]{3}$/).optional(),
    ),
    acquisitionSource: optionalText(240),
    ownershipStatus: z.enum(ownershipStatuses),
    personalNote: optionalText(5000),
  })
  .refine(
    (value) => value.acquisitionPriceMinor === undefined || value.acquisitionCurrencyCode !== undefined,
    { message: "Currency is required with acquisition price.", path: ["acquisitionCurrencyCode"] },
  );

export const userWatchIdSchema = z.string().uuid();

export const userWatchPhotoSchema = z.object({
  type: z.enum(["image/jpeg", "image/png", "image/webp"]),
  size: z.number().int().positive().max(8 * 1024 * 1024),
  name: z.string().trim().min(1).max(255),
});

export function rublesToMinorUnits(value: string | undefined): number | undefined {
  if (!value?.trim()) {
    return undefined;
  }

  const normalized = value.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return Number.NaN;
  }

  return Math.round(Number(normalized) * 100);
}

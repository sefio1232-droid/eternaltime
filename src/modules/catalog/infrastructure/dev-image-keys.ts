import { createHash } from "node:crypto";
import type { CatalogImageUploadPlanItem } from "@/modules/imports/catalog/domain/database-apply-types";

export function createCatalogDevImageKey(item: CatalogImageUploadPlanItem): string {
  return createHash("sha256")
    .update(
      [
        item.candidateId,
        item.brandSlug,
        item.referenceSlug,
        String(item.intendedOrder),
        item.actualZipEntry ?? "",
        item.remoteImageUrl ?? "",
      ].join("\u0000"),
    )
    .digest("hex")
    .slice(0, 32);
}

export function isCatalogDevImageKey(value: string): boolean {
  return /^[a-f0-9]{32}$/.test(value);
}

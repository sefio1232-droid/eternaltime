import { resolveDevCatalogImage } from "@/modules/catalog/infrastructure/dev-image-resolver.server";
import { isOrientArchiveImageKey } from "@/modules/catalog/infrastructure/orient-photo-archive-keys";
import { resolveOrientArchiveImage } from "@/modules/catalog/infrastructure/orient-photo-archive-resolver.server";
import { isCasioArchiveImageKey } from "@/modules/catalog/infrastructure/casio-photo-archive-keys";
import { resolveCasioArchiveImage } from "@/modules/catalog/infrastructure/casio-photo-archive-resolver.server";
import { isTissotArchiveImageKey } from "@/modules/catalog/infrastructure/tissot-photo-archive-keys";
import { resolveTissotArchiveImage } from "@/modules/catalog/infrastructure/tissot-photo-archive-resolver.server";

async function resolveByKey(imageKey: string) {
  if (isOrientArchiveImageKey(imageKey)) {
    return resolveOrientArchiveImage({ imageKey });
  }
  if (isCasioArchiveImageKey(imageKey)) {
    return resolveCasioArchiveImage({ imageKey });
  }
  if (isTissotArchiveImageKey(imageKey)) {
    return resolveTissotArchiveImage({ imageKey });
  }
  return resolveDevCatalogImage({ imageKey });
}

export async function GET(_request: Request, context: { params: Promise<{ imageKey: string }> }) {
  const { imageKey } = await context.params;
  const result = await resolveByKey(imageKey);

  if (result.status !== "found") {
    return new Response(null, {
      status: 404,
      headers: {
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response(Buffer.from(result.bytes), {
    status: 200,
    headers: {
      "Content-Type": result.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

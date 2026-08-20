import { isOrientArchiveImageKey } from "@/modules/catalog/infrastructure/orient-photo-archive-keys";
import { isCasioArchiveImageKey } from "@/modules/catalog/infrastructure/casio-photo-archive-keys";
import { isTissotArchiveImageKey } from "@/modules/catalog/infrastructure/tissot-photo-archive-keys";

export const runtime = "nodejs";

async function resolveByKey(imageKey: string) {
  if (isOrientArchiveImageKey(imageKey)) {
    const { resolveOrientArchiveImage } = await import(
      "@/modules/catalog/infrastructure/orient-photo-archive-resolver.server"
    );
    return resolveOrientArchiveImage({ imageKey });
  }
  if (isCasioArchiveImageKey(imageKey)) {
    const { resolveCasioArchiveImage } = await import(
      "@/modules/catalog/infrastructure/casio-photo-archive-resolver.server"
    );
    return resolveCasioArchiveImage({ imageKey });
  }
  if (isTissotArchiveImageKey(imageKey)) {
    const { resolveTissotArchiveImage } = await import(
      "@/modules/catalog/infrastructure/tissot-photo-archive-resolver.server"
    );
    return resolveTissotArchiveImage({ imageKey });
  }
  const { resolveDevCatalogImage } = await import("@/modules/catalog/infrastructure/dev-image-resolver.server");
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
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

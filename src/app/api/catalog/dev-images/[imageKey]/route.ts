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

function missingCatalogImagePlaceholderSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="1200" viewBox="0 0 960 1200" role="img" aria-label="Изображение часов недоступно">
  <rect width="960" height="1200" fill="#ffffff"/>
  <rect x="96" y="120" width="768" height="960" fill="none" stroke="#d8d0c4" stroke-width="2"/>
  <circle cx="480" cy="560" r="172" fill="none" stroke="#d8d0c4" stroke-width="3"/>
  <path d="M480 388v344M308 560h344" stroke="#d8d0c4" stroke-width="2" opacity=".42"/>
  <text x="480" y="610" text-anchor="middle" fill="#8a693a" font-family="Georgia, 'Times New Roman', serif" font-size="76" letter-spacing="10">ET</text>
  <text x="480" y="690" text-anchor="middle" fill="#7c878d" font-family="Arial, sans-serif" font-size="20" letter-spacing="5">ФОТО ГОТОВИТСЯ</text>
</svg>`;
}

export async function GET(_request: Request, context: { params: Promise<{ imageKey: string }> }) {
  const { imageKey } = await context.params;
  const result = await resolveByKey(imageKey);

  if (result.status !== "found") {
    return new Response(missingCatalogImagePlaceholderSvg(), {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
        "X-Catalog-Image-Fallback": result.status,
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

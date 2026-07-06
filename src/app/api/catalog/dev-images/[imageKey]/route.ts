import { resolveDevCatalogImage } from "@/modules/catalog/infrastructure/dev-image-resolver.server";

export async function GET(_request: Request, context: { params: Promise<{ imageKey: string }> }) {
  const { imageKey } = await context.params;
  const result = await resolveDevCatalogImage({ imageKey });

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

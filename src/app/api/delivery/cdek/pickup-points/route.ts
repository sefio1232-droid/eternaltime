import { NextResponse } from "next/server";
import { listCdekPickupPoints } from "@/modules/commerce/infrastructure/cdek-client.server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const cityCode = url.searchParams.get("cityCode");
  const postalCode = url.searchParams.get("postalCode") ?? undefined;
  const city = url.searchParams.get("city") ?? undefined;

  try {
    const points = await listCdekPickupPoints({
      cityCode: cityCode ? Number(cityCode) : undefined,
      postalCode,
      city,
    });

    return NextResponse.json({
      points: points.map((point) => ({
        code: point.code,
        name: point.name ?? point.code,
        address: point.location?.address_full ?? point.location?.address ?? "",
        city: point.location?.city ?? "",
        cityCode: point.location?.city_code ?? null,
        postalCode: point.postal_code ?? "",
        latitude: point.location?.latitude ?? null,
        longitude: point.location?.longitude ?? null,
        workTime: point.work_time ?? "",
      })),
    });
  } catch (error) {
    console.error("[cdek] pickup-points unavailable", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      {
        error: "cdek_unavailable",
        message: "Не удалось получить пункты выдачи. Попробуйте позже.",
      },
      { status: 503 },
    );
  }
}

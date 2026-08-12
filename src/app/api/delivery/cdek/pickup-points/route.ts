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
        address: point.location?.address ?? "",
        city: point.location?.city ?? "",
        latitude: point.location?.latitude ?? null,
        longitude: point.location?.longitude ?? null,
        workTime: point.work_time ?? "",
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "cdek_unavailable",
        message: error instanceof Error ? error.message : "CDEK pickup points unavailable.",
      },
      { status: 503 },
    );
  }
}

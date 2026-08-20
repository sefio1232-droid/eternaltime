import { NextResponse } from "next/server";
import { searchCdekCities } from "@/modules/commerce/infrastructure/cdek-client.server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const city = url.searchParams.get("city") ?? "";

  try {
    const cities = await searchCdekCities({ city, limit: 20 });
    return NextResponse.json({
      cities: cities.map((item) => ({
        code: item.code,
        city: item.city,
        region: item.region ?? "",
        country: item.country ?? "Россия",
        postalCodes: item.postal_codes ?? [],
      })),
    });
  } catch (error) {
    console.error("[cdek] city search unavailable", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      {
        error: "cdek_unavailable",
        message: "Не удалось найти город. Попробуйте позже.",
      },
      { status: 503 },
    );
  }
}

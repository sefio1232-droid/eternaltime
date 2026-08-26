import { NextResponse } from "next/server";
import { getServerEnv } from "@/config/server-env";

export async function GET() {
  const env = getServerEnv();

  if (!env.cdek.hasWidgetYandexMapsApiKey) {
    return NextResponse.json({
      ready: false,
      reason: "missing_yandex_maps_key",
      message: "Не удалось загрузить карту пунктов выдачи. Попробуйте снова.",
    });
  }

  if (!env.cdek.fromLocationCode || !env.cdek.packagePolicy.isConfigured) {
    return NextResponse.json({
      ready: false,
      reason: "cdek_widget_origin_or_package_missing",
      message: "Не удалось загрузить карту пунктов выдачи. Попробуйте снова.",
    });
  }

  return NextResponse.json({
    ready: true,
    apiKey: env.cdek.widgetYandexMapsApiKey,
    servicePath: "/api/delivery/cdek/widget-service",
    from: null,
    tariffs: {
      office: [env.cdek.pickupTariffCode].filter((value): value is number => Boolean(value)),
      door: [env.cdek.courierTariffCode].filter((value): value is number => Boolean(value)),
      pickup: [],
    },
    goods: [],
  });
}

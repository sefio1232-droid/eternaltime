import { NextResponse } from "next/server";
import { getServerEnv } from "@/config/server-env";

export async function GET() {
  const env = getServerEnv();
  const packagePolicy = env.cdek.packagePolicy;

  if (!env.cdek.hasWidgetYandexMapsApiKey) {
    return NextResponse.json({
      ready: false,
      reason: "missing_yandex_maps_key",
      message: "Не удалось загрузить карту СДЭК. Добавьте CDEK_WIDGET_YANDEX_MAPS_API_KEY и попробуйте снова.",
    });
  }

  if (!env.cdek.fromLocationCode || !env.cdek.packagePolicy.isConfigured) {
    return NextResponse.json({
      ready: false,
      reason: "cdek_widget_origin_or_package_missing",
      message: "Карта СДЭК ждёт настройки города отправления и параметров посылки.",
    });
  }

  return NextResponse.json({
    ready: true,
    scriptUrl: "https://cdn.jsdelivr.net/npm/@cdek-it/widget@3",
    apiKey: env.cdek.widgetYandexMapsApiKey,
    servicePath: "/api/delivery/cdek/widget-service",
    from: {
      country_code: "RU",
      code: env.cdek.fromLocationCode,
    },
    tariffs: {
      office: [env.cdek.pickupTariffCode].filter((value): value is number => Boolean(value)),
      door: [env.cdek.courierTariffCode].filter((value): value is number => Boolean(value)),
    },
    goods: [
      {
        width: packagePolicy.widthCm,
        height: packagePolicy.heightCm,
        length: packagePolicy.lengthCm,
        weight: packagePolicy.weightGrams,
      },
    ],
  });
}

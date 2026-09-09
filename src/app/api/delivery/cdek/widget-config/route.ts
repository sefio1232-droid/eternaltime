import { NextResponse } from "next/server";
import { getServerEnv } from "@/config/server-env";

export async function GET() {
  const env = getServerEnv();
  const originCode = env.cdek.fromLocationCode;
  const packagePolicy = env.cdek.packagePolicy;

  if (!env.cdek.hasWidgetYandexMapsApiKey) {
    return NextResponse.json({
      ready: false,
      reason: "missing_yandex_maps_key",
      message: "Не удалось загрузить карту пунктов выдачи. Попробуйте снова.",
    });
  }

  if (
    !originCode ||
    !packagePolicy.weightGrams ||
    !packagePolicy.lengthCm ||
    !packagePolicy.widthCm ||
    !packagePolicy.heightCm
  ) {
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
    from: {
      code: originCode,
      postal_code: null,
      country_code: "RU",
      city: null,
      address: null,
    },
    tariffs: {
      office: [env.cdek.pickupTariffCode].filter((value): value is number => Boolean(value)),
      door: [env.cdek.courierTariffCode].filter((value): value is number => Boolean(value)),
      pickup: [],
    },
    goods: [
      {
        weight: packagePolicy.weightGrams,
        length: packagePolicy.lengthCm,
        width: packagePolicy.widthCm,
        height: packagePolicy.heightCm,
      },
    ],
  });
}

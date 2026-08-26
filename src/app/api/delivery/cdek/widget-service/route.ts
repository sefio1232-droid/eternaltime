import { NextResponse } from "next/server";
import { CdekValidationError, proxyCdekWidgetService } from "@/modules/commerce/infrastructure/cdek-client.server";

const maxWidgetServiceBodyBytes = 32_000;
const allowedActions = new Set(["offices", "calculate"]);

async function requestPayload(request: Request): Promise<Record<string, unknown>> {
  const url = new URL(request.url);
  const queryPayload = Object.fromEntries(url.searchParams.entries());
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > maxWidgetServiceBodyBytes) {
    throw new CdekValidationError("CDEK widget request is too large.");
  }

  const bodyText = await request.text();
  if (new TextEncoder().encode(bodyText).byteLength > maxWidgetServiceBodyBytes) {
    throw new CdekValidationError("CDEK widget request is too large.");
  }

  if (!bodyText.trim()) {
    return queryPayload;
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return { ...queryPayload, ...(JSON.parse(bodyText) as Record<string, unknown>) };
  }

  return { ...queryPayload, ...Object.fromEntries(new URLSearchParams(bodyText).entries()) };
}

async function handle(request: Request) {
  try {
    const payload = await requestPayload(request);
    if (typeof payload.action !== "string" || !allowedActions.has(payload.action)) {
      throw new CdekValidationError("Unknown CDEK widget service action.");
    }

    const result = await proxyCdekWidgetService(payload);
    return NextResponse.json(result, {
      headers: {
        "X-Service-Version": "3.11.1-next",
      },
    });
  } catch (error) {
    const status = error instanceof CdekValidationError ? 400 : 503;
    console.error("[cdek] widget service unavailable", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return NextResponse.json(
      {
        message:
          status === 400
            ? "Некорректный запрос к сервису карты пунктов выдачи."
            : "Не удалось загрузить карту пунктов выдачи. Попробуйте снова.",
      },
      { status },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}

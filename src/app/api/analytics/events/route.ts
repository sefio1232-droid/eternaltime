import { NextResponse } from "next/server";
import {
  AnalyticsEventValidationError,
  validateAnalyticsEvent,
} from "@/modules/analytics/domain/events";
import { recordAnalyticsEvent } from "@/modules/analytics/infrastructure/analytics-repository.server";
import { getAuthenticatedSupabaseUser } from "@/modules/commerce/infrastructure/commerce-repository.server";

function statusForAnalyticsError(error: AnalyticsEventValidationError): number {
  if (error.code === "unknown_event") return 400;
  if (error.code === "invalid_session") return 400;
  if (error.code === "pii_forbidden") return 400;
  if (error.code === "oversized_properties") return 413;
  return 400;
}

export async function POST(request: Request) {
  let event;
  try {
    event = validateAnalyticsEvent(await request.json().catch(() => ({})));
  } catch (error) {
    if (error instanceof AnalyticsEventValidationError) {
      return NextResponse.json({ error: error.code }, { status: statusForAnalyticsError(error) });
    }
    return NextResponse.json({ error: "invalid_properties" }, { status: 400 });
  }

  const auth = await getAuthenticatedSupabaseUser();
  const userId = auth.status === "authenticated" ? auth.user.id : null;
  await recordAnalyticsEvent({ event, userId });

  return NextResponse.json({ accepted: true }, { status: 202 });
}

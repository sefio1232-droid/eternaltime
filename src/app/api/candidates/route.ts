import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CandidateServiceError,
  removeCandidate,
  saveCandidate,
  updateCandidateStatus,
  type CandidateMutationInput,
} from "@/modules/candidates/application/candidate-service";
import { createCandidateRepository } from "@/modules/candidates/infrastructure/candidate-repository.server";
import { getCurrentUser } from "@/modules/auth/server";
import {
  analyticsSourceSurfaces,
  validateAnalyticsEvent,
  type AnalyticsEventName,
  type AnalyticsSourceSurface,
} from "@/modules/analytics/domain/events";
import { recordAnalyticsEvent } from "@/modules/analytics/infrastructure/analytics-repository.server";
import type { CandidateStatus, CandidateSummary } from "@/modules/candidates/domain/types";

type CandidateRequestPayload = {
  watchReferenceId?: unknown;
  status?: unknown;
  note?: unknown;
  sourceSurface?: unknown;
  analyticsSessionId?: unknown;
};

function candidateErrorResponse(error: unknown) {
  if (error instanceof CandidateServiceError) {
    const status = error.code === "authentication_required"
      ? 401
      : error.code === "invalid_watch_reference" || error.code === "validation_error"
        ? 400
        : error.code === "not_found"
          ? 404
          : error.code === "already_owned"
            ? 409
            : 500;

    return NextResponse.json(
      {
        error: error.code,
        message:
          error.code === "already_owned"
            ? "Эта модель уже есть в вашей коллекции."
            : error.code === "invalid_watch_reference"
              ? "Эту модель пока нельзя сохранить в кандидаты."
              : error.code === "not_found"
                ? "Кандидат не найден."
                : "Не удалось обновить кандидаты. Попробуйте ещё раз.",
      },
      { status },
    );
  }

  console.error("candidate_api_failed", {
    message: error instanceof Error ? error.message : "unknown_error",
  });
  return NextResponse.json(
    { error: "candidate_update_failed", message: "Не удалось обновить кандидаты. Попробуйте ещё раз." },
    { status: 500 },
  );
}

function parseCandidatePayload(input: unknown): CandidateRequestPayload {
  return input && typeof input === "object" ? input as CandidateRequestPayload : {};
}

function analyticsSourceSurface(input: CandidateRequestPayload): AnalyticsSourceSurface {
  return typeof input.sourceSurface === "string" && (analyticsSourceSurfaces as readonly string[]).includes(input.sourceSurface)
    ? input.sourceSurface as AnalyticsSourceSurface
    : "watch_detail";
}

function toCandidateMutationInput(payload: CandidateRequestPayload): CandidateMutationInput {
  return {
    watchReferenceId: typeof payload.watchReferenceId === "string" ? payload.watchReferenceId : "",
    ...(typeof payload.status === "string" ? { status: payload.status as CandidateStatus } : {}),
    ...(typeof payload.note === "string" ? { note: payload.note } : {}),
  };
}

async function recordCandidateEvent(input: {
  eventName: AnalyticsEventName;
  candidate: CandidateSummary;
  payload: CandidateRequestPayload;
  userId: string;
}) {
  const watch = input.candidate.watch;
  if (!watch || typeof input.payload.analyticsSessionId !== "string") return;

  try {
    const sourceSurface = analyticsSourceSurface(input.payload);
    const event = validateAnalyticsEvent({
      eventName: sourceSurface === "selection" && input.eventName === "candidate_saved"
        ? "selection_candidate_saved"
        : input.eventName,
      sessionId: input.payload.analyticsSessionId,
      pathname: watch.href,
      properties: {
        brand: watch.brandName,
        reference: watch.referenceDisplay,
        commerce_state: watch.publicCommerceState.kind,
        source_surface: sourceSurface,
        ...(input.eventName === "candidate_status_changed" ? { status: input.candidate.status } : {}),
      },
    });
    await recordAnalyticsEvent({ event, userId: input.userId });
  } catch {
    // Candidate UX must not fail if analytics payload is missing or stale.
  }
}

async function getCandidateContext() {
  const currentUser = await getCurrentUser();
  if (currentUser.status === "unconfigured") {
    return { response: NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 }) };
  }
  if (!currentUser.user) {
    return { response: NextResponse.json({ error: "authentication_required" }, { status: 401 }) };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { response: NextResponse.json({ error: "supabase_unconfigured" }, { status: 503 }) };
  }

  return {
    userId: currentUser.user.id,
    repository: createCandidateRepository(supabase),
  };
}

export async function POST(request: Request) {
  const context = await getCandidateContext();
  if ("response" in context) return context.response;

  try {
    const payload = parseCandidatePayload(await request.json().catch(() => ({})));
    const candidate = await saveCandidate(
      context.repository,
      context.userId,
      toCandidateMutationInput(payload),
    );
    await recordCandidateEvent({ eventName: "candidate_saved", candidate, payload, userId: context.userId });
    return NextResponse.json({ candidate });
  } catch (error) {
    return candidateErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const context = await getCandidateContext();
  if ("response" in context) return context.response;

  try {
    const payload = parseCandidatePayload(await request.json().catch(() => ({})));
    const candidate = await updateCandidateStatus(
      context.repository,
      context.userId,
      {
        watchReferenceId: typeof payload.watchReferenceId === "string" ? payload.watchReferenceId : "",
        status: payload.status as CandidateStatus,
      },
    );
    await recordCandidateEvent({ eventName: "candidate_status_changed", candidate, payload, userId: context.userId });
    return NextResponse.json({ candidate });
  } catch (error) {
    return candidateErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const context = await getCandidateContext();
  if ("response" in context) return context.response;

  try {
    const payload = parseCandidatePayload(await request.json().catch(() => ({})));
    const watchReferenceId = String(payload.watchReferenceId ?? "");
    const existing = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(watchReferenceId)
      ? await context.repository.findByReference(context.userId, watchReferenceId)
      : null;
    await removeCandidate(context.repository, context.userId, watchReferenceId);
    if (existing) await recordCandidateEvent({ eventName: "candidate_removed", candidate: existing, payload, userId: context.userId });
    return NextResponse.json({ removed: true });
  } catch (error) {
    return candidateErrorResponse(error);
  }
}

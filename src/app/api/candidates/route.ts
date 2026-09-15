import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CandidateServiceError,
  removeCandidate,
  saveCandidate,
  updateCandidateStatus,
} from "@/modules/candidates/application/candidate-service";
import { createCandidateRepository } from "@/modules/candidates/infrastructure/candidate-repository.server";
import { getCurrentUser } from "@/modules/auth/server";

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
    const candidate = await saveCandidate(
      context.repository,
      context.userId,
      await request.json().catch(() => ({})),
    );
    return NextResponse.json({ candidate });
  } catch (error) {
    return candidateErrorResponse(error);
  }
}

export async function PATCH(request: Request) {
  const context = await getCandidateContext();
  if ("response" in context) return context.response;

  try {
    const candidate = await updateCandidateStatus(
      context.repository,
      context.userId,
      await request.json().catch(() => ({})),
    );
    return NextResponse.json({ candidate });
  } catch (error) {
    return candidateErrorResponse(error);
  }
}

export async function DELETE(request: Request) {
  const context = await getCandidateContext();
  if ("response" in context) return context.response;

  try {
    const payload = await request.json().catch(() => ({}));
    await removeCandidate(context.repository, context.userId, String(payload.watchReferenceId ?? ""));
    return NextResponse.json({ removed: true });
  } catch (error) {
    return candidateErrorResponse(error);
  }
}

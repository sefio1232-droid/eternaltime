import { CandidateButton } from "@/components/candidates/candidate-action";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/server";
import { getCandidateByReference } from "@/modules/candidates/application/candidate-service";
import type { CandidateStatus } from "@/modules/candidates/domain/types";
import type { AnalyticsSourceSurface } from "@/modules/analytics/domain/events";
import { createCandidateRepository } from "@/modules/candidates/infrastructure/candidate-repository.server";

export async function CandidateWatchAction({
  watchReferenceId,
  displayName,
  returnTo,
  compact = false,
  sourceSurface = "watch_detail",
}: Readonly<{
  watchReferenceId: string;
  displayName: string;
  returnTo: string;
  compact?: boolean;
  sourceSurface?: AnalyticsSourceSurface;
}>) {
  const currentUser = await getCurrentUser();
  let initialStatus: CandidateStatus | null = null;

  if (currentUser.user) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const candidate = await getCandidateByReference(
        createCandidateRepository(supabase),
        currentUser.user.id,
        watchReferenceId,
      );
      initialStatus = candidate?.status ?? null;
    }
  }

  return (
    <CandidateButton
      watchReferenceId={watchReferenceId}
      displayName={displayName}
      returnTo={returnTo}
      initialStatus={initialStatus}
      compact={compact}
      sourceSurface={sourceSurface}
    />
  );
}

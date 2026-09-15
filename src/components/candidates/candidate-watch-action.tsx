import { CandidateButton } from "@/components/candidates/candidate-action";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/server";
import { getCandidateByReference } from "@/modules/candidates/application/candidate-service";
import type { CandidateStatus } from "@/modules/candidates/domain/types";
import { createCandidateRepository } from "@/modules/candidates/infrastructure/candidate-repository.server";

export async function CandidateWatchAction({
  watchReferenceId,
  displayName,
  returnTo,
  compact = false,
}: Readonly<{
  watchReferenceId: string;
  displayName: string;
  returnTo: string;
  compact?: boolean;
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
    />
  );
}

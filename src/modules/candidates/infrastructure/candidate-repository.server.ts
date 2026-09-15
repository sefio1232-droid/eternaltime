import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCatalogReadDataset } from "@/modules/catalog/infrastructure/catalog-read-repository.server";
import { displayWatchModelHeading } from "@/modules/catalog/application/catalog-display";
import { getPublicCommerceState } from "@/modules/commerce/domain/public-commerce-state";
import {
  CandidateServiceError,
  type CandidateRepository,
} from "@/modules/candidates/application/candidate-service";
import type { CandidateStatus, CandidateSummary } from "@/modules/candidates/domain/types";

type CandidateRow = {
  id: string;
  user_id: string;
  watch_reference_id: string;
  status: CandidateStatus;
  note: string | null;
  created_at: string;
  updated_at: string;
};

function candidateTable(client: SupabaseClient) {
  return client.from("user_watch_candidates" as never);
}

function repositoryError(error: unknown): CandidateServiceError {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (message.includes("invalid_watch_reference")) {
    return new CandidateServiceError("invalid_watch_reference", "Watch reference is not available for candidates.");
  }
  return new CandidateServiceError("repository_error", "Candidate operation failed.");
}

async function publicWatchByReferenceId(watchReferenceId: string) {
  const dataset = await getCatalogReadDataset();
  return dataset.watches.find((watch) => watch.id === watchReferenceId) ?? null;
}

async function hydrateCandidateRow(row: CandidateRow): Promise<CandidateSummary> {
  const watch = await publicWatchByReferenceId(row.watch_reference_id);
  const commerceState = watch
    ? (watch.publicCommerceState ?? getPublicCommerceState({ publicPrice: watch.publicPrice }))
    : null;

  return {
    id: row.id,
    watchReferenceId: row.watch_reference_id,
    status: row.status,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    watch: watch && commerceState
      ? {
          href: watch.href,
          brandName: watch.brandName,
          brandSlug: watch.brandSlug,
          displayName: displayWatchModelHeading({
            brandName: watch.brandName,
            title: watch.title,
            referenceDisplay: watch.referenceDisplay,
          }),
          referenceDisplay: watch.referenceDisplay,
          referenceNormalized: watch.referenceNormalized,
          referenceSlug: watch.referenceSlug,
          image: watch.primaryImage,
          publicPrice: watch.publicPrice,
          publicCommerceState: commerceState,
        }
      : null,
  };
}

async function hydrateCandidateRows(rows: CandidateRow[]): Promise<CandidateSummary[]> {
  return Promise.all(rows.map(hydrateCandidateRow));
}

export function createCandidateRepository(supabase: SupabaseClient): CandidateRepository {
  return {
    async list(userId) {
      const { data, error } = await candidateTable(supabase)
        .select("id,user_id,watch_reference_id,status,note,created_at,updated_at")
        .eq("user_id", userId)
        .is("resolved_at", null)
        .order("updated_at", { ascending: false });

      if (error) {
        throw repositoryError(error);
      }

      return hydrateCandidateRows((data ?? []) as CandidateRow[]);
    },

    async findByReference(userId, watchReferenceId) {
      const { data, error } = await candidateTable(supabase)
        .select("id,user_id,watch_reference_id,status,note,created_at,updated_at")
        .eq("user_id", userId)
        .eq("watch_reference_id", watchReferenceId)
        .is("resolved_at", null)
        .maybeSingle();

      if (error) {
        throw repositoryError(error);
      }

      return data ? hydrateCandidateRow(data as CandidateRow) : null;
    },

    async upsert(userId, input) {
      const publicWatch = await publicWatchByReferenceId(input.watchReferenceId);
      if (!publicWatch) {
        throw new CandidateServiceError("invalid_watch_reference", "Only public catalog references can be saved as candidates.");
      }

      const { data: owned, error: ownedError } = await supabase
        .from("user_watches")
        .select("id")
        .eq("user_id", userId)
        .eq("watch_reference_id", input.watchReferenceId)
        .eq("ownership_status", "owned")
        .is("deleted_at", null)
        .limit(1);

      if (ownedError) {
        throw repositoryError(ownedError);
      }

      if (owned?.[0]?.id) {
        throw new CandidateServiceError("already_owned", "Owned watches belong in Collection, not Candidates.");
      }

      const { data, error } = await candidateTable(supabase)
        .upsert(
          {
            user_id: userId,
            watch_reference_id: input.watchReferenceId,
            status: input.status,
            note: input.note ?? null,
            resolved_at: null,
            resolved_by_user_watch_id: null,
          },
          { onConflict: "user_id,watch_reference_id" },
        )
        .select("id,user_id,watch_reference_id,status,note,created_at,updated_at")
        .single();

      if (error || !data) {
        throw repositoryError(error ?? new Error("Candidate upsert returned no row."));
      }

      return hydrateCandidateRow(data as CandidateRow);
    },

    async remove(userId, watchReferenceId) {
      const { data, error } = await candidateTable(supabase)
        .delete()
        .eq("user_id", userId)
        .eq("watch_reference_id", watchReferenceId)
        .select("id");

      if (error) {
        throw repositoryError(error);
      }

      return (data?.length ?? 0) > 0;
    },

    async resolveByOwnedReference(userId, watchReferenceId, userWatchId) {
      const { error } = await candidateTable(supabase)
        .update({
          resolved_at: new Date().toISOString(),
          resolved_by_user_watch_id: userWatchId ?? null,
        })
        .eq("user_id", userId)
        .eq("watch_reference_id", watchReferenceId)
        .is("resolved_at", null);

      if (error) {
        throw repositoryError(error);
      }
    },
  };
}

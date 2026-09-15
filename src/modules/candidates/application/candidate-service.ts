import { z } from "zod";
import type { CandidateStatus, CandidateSummary } from "@/modules/candidates/domain/types";
import { candidateStatuses } from "@/modules/candidates/domain/types";

export type CandidateErrorCode =
  | "authentication_required"
  | "validation_error"
  | "invalid_watch_reference"
  | "already_owned"
  | "not_found"
  | "repository_error";

export class CandidateServiceError extends Error {
  readonly code: CandidateErrorCode;

  constructor(code: CandidateErrorCode, message: string) {
    super(message);
    this.name = "CandidateServiceError";
    this.code = code;
  }
}

export const candidateMutationSchema = z.object({
  watchReferenceId: z.string().uuid(),
  status: z.enum(candidateStatuses).default("saved"),
  note: z.string().trim().max(1000).optional(),
});

export type CandidateMutationInput = z.input<typeof candidateMutationSchema>;

export interface CandidateRepository {
  list(userId: string): Promise<CandidateSummary[]>;
  findByReference(userId: string, watchReferenceId: string): Promise<CandidateSummary | null>;
  upsert(userId: string, input: z.output<typeof candidateMutationSchema>): Promise<CandidateSummary>;
  remove(userId: string, watchReferenceId: string): Promise<boolean>;
  resolveByOwnedReference(userId: string, watchReferenceId: string, userWatchId?: string | null): Promise<void>;
}

export async function listCandidates(repository: CandidateRepository, userId: string): Promise<CandidateSummary[]> {
  return repository.list(userId);
}

export async function getCandidateByReference(
  repository: CandidateRepository,
  userId: string,
  watchReferenceId: string,
): Promise<CandidateSummary | null> {
  const parsed = z.string().uuid().safeParse(watchReferenceId);
  if (!parsed.success) return null;
  return repository.findByReference(userId, parsed.data);
}

export async function saveCandidate(
  repository: CandidateRepository,
  userId: string,
  input: CandidateMutationInput,
): Promise<CandidateSummary> {
  const parsed = candidateMutationSchema.safeParse(input);
  if (!parsed.success) {
    throw new CandidateServiceError("validation_error", "Candidate input is invalid.");
  }

  return repository.upsert(userId, parsed.data);
}

export async function updateCandidateStatus(
  repository: CandidateRepository,
  userId: string,
  input: { watchReferenceId: string; status: CandidateStatus },
): Promise<CandidateSummary> {
  return saveCandidate(repository, userId, input);
}

export async function removeCandidate(
  repository: CandidateRepository,
  userId: string,
  watchReferenceId: string,
): Promise<void> {
  const parsed = z.string().uuid().safeParse(watchReferenceId);
  if (!parsed.success) {
    throw new CandidateServiceError("validation_error", "Candidate reference is invalid.");
  }

  const removed = await repository.remove(userId, parsed.data);
  if (!removed) {
    throw new CandidateServiceError("not_found", "Candidate was not found.");
  }
}

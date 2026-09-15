"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  candidateStatusLabels,
  candidateStatuses,
  type CandidateStatus,
} from "@/modules/candidates/domain/types";
import type { AnalyticsSourceSurface } from "@/modules/analytics/domain/events";
import { getAnalyticsSessionId } from "@/components/analytics/analytics-client";
import styles from "@/components/candidates/candidate-action.module.css";

type CandidateActionResponse = {
  candidate?: { status: CandidateStatus };
  error?: string;
  message?: string;
  removed?: boolean;
};

function loginHref(returnTo: string): string {
  return `/login?returnTo=${encodeURIComponent(returnTo)}`;
}

function effectiveReturnTo(fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return `${window.location.pathname}${window.location.search}`;
}

async function requestCandidate(
  method: "POST" | "PATCH" | "DELETE",
  payload: { watchReferenceId: string; status?: CandidateStatus; sourceSurface: AnalyticsSourceSurface },
): Promise<CandidateActionResponse & { statusCode: number }> {
  const response = await fetch("/api/candidates", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...payload, analyticsSessionId: getAnalyticsSessionId() }),
  });
  const body = (await response.json().catch(() => ({}))) as CandidateActionResponse;
  return { ...body, statusCode: response.status };
}

export function CandidateButton({
  watchReferenceId,
  displayName,
  returnTo,
  initialStatus = null,
  compact = false,
  sourceSurface = "watch_detail",
}: Readonly<{
  watchReferenceId: string;
  displayName: string;
  returnTo: string;
  initialStatus?: CandidateStatus | null;
  compact?: boolean;
  sourceSurface?: AnalyticsSourceSurface;
}>) {
  const router = useRouter();
  const [status, setStatus] = useState<CandidateStatus | null>(initialStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={styles.button}
      data-active={status ? "true" : "false"}
      data-compact={compact ? "true" : "false"}
      disabled={isPending}
      aria-pressed={Boolean(status)}
      aria-label={status ? `${displayName}: ${candidateStatusLabels[status]}` : `${displayName}: сохранить в кандидаты`}
      onClick={() => {
        setMessage(null);
        startTransition(async () => {
          const result = await requestCandidate("POST", { watchReferenceId, status: "saved", sourceSurface });
          if (result.statusCode === 401) {
            router.push(loginHref(effectiveReturnTo(returnTo)));
            return;
          }
          if (result.candidate?.status) {
            setStatus(result.candidate.status);
            router.refresh();
            return;
          }
          setMessage(result.message ?? "Не удалось сохранить модель.");
        });
      }}
    >
      {isPending ? "Сохраняем…" : status ? candidateStatusLabels[status] : "Сохранить"}
      {message ? <span className={`${styles.message} ${styles.error}`}>{message}</span> : null}
    </button>
  );
}

export function CandidateStatusControls({
  watchReferenceId,
  returnTo,
  initialStatus = null,
  sourceSurface = "compare",
}: Readonly<{
  watchReferenceId: string;
  returnTo: string;
  initialStatus?: CandidateStatus | null;
  sourceSurface?: AnalyticsSourceSurface;
}>) {
  const router = useRouter();
  const [status, setStatus] = useState<CandidateStatus | null>(initialStatus);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function mutate(nextStatus: CandidateStatus) {
    setMessage(null);
    startTransition(async () => {
      const result = await requestCandidate(status ? "PATCH" : "POST", { watchReferenceId, status: nextStatus, sourceSurface });
      if (result.statusCode === 401) {
        router.push(loginHref(effectiveReturnTo(returnTo)));
        return;
      }
      if (result.candidate?.status) {
        setStatus(result.candidate.status);
        router.refresh();
        return;
      }
      setMessage(result.message ?? "Не удалось обновить статус.");
    });
  }

  function remove() {
    setMessage(null);
    startTransition(async () => {
      const result = await requestCandidate("DELETE", { watchReferenceId, sourceSurface });
      if (result.statusCode === 401) {
        router.push(loginHref(effectiveReturnTo(returnTo)));
        return;
      }
      if (result.removed) {
        setStatus(null);
        router.refresh();
        return;
      }
      setMessage(result.message ?? "Не удалось убрать модель.");
    });
  }

  return (
    <div className={styles.actions}>
      {candidateStatuses.map((candidateStatus) => (
        <button
          type="button"
          key={candidateStatus}
          className={styles.statusButton}
          data-active={status === candidateStatus ? "true" : "false"}
          disabled={isPending}
          onClick={() => mutate(candidateStatus)}
        >
          {candidateStatusLabels[candidateStatus]}
        </button>
      ))}
      {status ? (
        <button type="button" className={styles.removeButton} disabled={isPending} onClick={remove}>
          Убрать
        </button>
      ) : null}
      {message ? <p className={`${styles.message} ${styles.error}`}>{message}</p> : null}
    </div>
  );
}

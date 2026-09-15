import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ValidatedAnalyticsEvent } from "@/modules/analytics/domain/events";

type AnalyticsInsertRow = {
  event_name: string;
  session_id: string;
  user_id: string | null;
  pathname: string | null;
  properties: Record<string, unknown>;
};

type AnalyticsCountQuery = {
  gte(column: "created_at", value: string): Promise<{ count: number | null; error: { message: string } | null }>;
};

type AnalyticsSelectQuery = {
  gte(column: "created_at", value: string): {
    order(column: "created_at", options: { ascending: false }): {
      limit(count: number): Promise<{ data: AnalyticsEventRow[] | null; error: { message: string } | null }>;
    };
  };
};

interface AnalyticsEventsTable {
  insert(row: AnalyticsInsertRow): Promise<{ error: { message: string } | null }>;
  select(columns: "id", options: { count: "exact"; head: true }): AnalyticsCountQuery;
  select(columns: "event_name,session_id,created_at,properties,pathname"): AnalyticsSelectQuery;
}

type AnalyticsClient = {
  from(table: "analytics_events"): AnalyticsEventsTable;
};

export type AnalyticsEventRow = {
  event_name: string;
  session_id: string;
  created_at: string;
  pathname: string | null;
  properties: Record<string, unknown> | null;
};

function analyticsClient(): AnalyticsClient | null {
  const client = createSupabaseAdminClient();
  return client ? (client as unknown as AnalyticsClient) : null;
}

export async function recordAnalyticsEvent(input: {
  event: ValidatedAnalyticsEvent;
  userId?: string | null;
}): Promise<{ stored: boolean; reason?: string }> {
  const client = analyticsClient();
  if (!client) return { stored: false, reason: "supabase_admin_unconfigured" };

  const { error } = await client.from("analytics_events").insert({
    event_name: input.event.eventName,
    session_id: input.event.sessionId,
    user_id: input.userId ?? null,
    pathname: input.event.pathname,
    properties: input.event.properties,
  });

  if (error) {
    console.error("analytics_event_write_failed", { eventName: input.event.eventName, message: error.message });
    return { stored: false, reason: "storage_error" };
  }

  return { stored: true };
}

export async function countAnalyticsEventsSince(since: string): Promise<number> {
  const client = analyticsClient();
  if (!client) return 0;

  const { count, error } = await client
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", since);

  if (error) {
    console.error("analytics_event_count_failed", { message: error.message });
    return 0;
  }

  return count ?? 0;
}

export async function listAnalyticsEventsSince(since: string, limit = 10_000): Promise<AnalyticsEventRow[]> {
  const client = analyticsClient();
  if (!client) return [];

  const { data, error } = await client
    .from("analytics_events")
    .select("event_name,session_id,created_at,properties,pathname")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("analytics_event_list_failed", { message: error.message });
    return [];
  }

  return data ?? [];
}

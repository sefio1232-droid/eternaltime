-- P4: first-party funnel analytics.
-- Stores only typed, minimal event payloads. No PII, request IP, user agent fingerprint or secrets
-- are accepted by application validation; browser clients write through a server endpoint.

create table if not exists public.analytics_events (
  id uuid primary key default extensions.gen_random_uuid(),
  event_name text not null,
  session_id uuid not null,
  user_id uuid references auth.users(id) on delete set null,
  pathname text,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint analytics_events_name_check check (
    event_name in (
      'home_view',
      'journal_index_view',
      'journal_article_view',
      'journal_product_click',
      'journal_selection_click',
      'catalog_view',
      'catalog_filter_changed',
      'watch_view',
      'candidate_saved',
      'candidate_status_changed',
      'candidate_removed',
      'compare_added',
      'compare_viewed',
      'selection_started',
      'selection_completed',
      'selection_result_opened',
      'selection_candidate_saved',
      'add_to_cart',
      'remove_from_cart',
      'checkout_started',
      'checkout_validation_failed',
      'order_created',
      'order_claimed',
      'collection_view',
      'collection_watch_added',
      'collection_recommendation_opened'
    )
  ),
  constraint analytics_events_properties_object_check check (jsonb_typeof(properties) = 'object'),
  constraint analytics_events_properties_size_check check (octet_length(properties::text) <= 4096),
  constraint analytics_events_pathname_check check (pathname is null or (pathname like '/%' and char_length(pathname) <= 240))
);

create index if not exists analytics_events_created_at_idx
on public.analytics_events (created_at desc);

create index if not exists analytics_events_name_created_at_idx
on public.analytics_events (event_name, created_at desc);

create index if not exists analytics_events_user_created_at_idx
on public.analytics_events (user_id, created_at desc)
where user_id is not null;

alter table public.analytics_events enable row level security;

revoke all on table public.analytics_events from anon;
revoke all on table public.analytics_events from authenticated;

comment on table public.analytics_events is 'P4 first-party funnel analytics. No PII/fingerprinting payloads; write via server endpoint, read only via admin server-side reports.';

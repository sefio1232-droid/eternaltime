-- P3: private research candidates and final LUKIA public-read cleanup.
-- Raw/import/catalog history is intentionally preserved. Only the public read projection is cleaned.

delete from public.catalog_public_read_models prm
using public.watch_references wr
join public.watch_models wm on wm.id = wr.watch_model_id
left join public.brand_collections bc on bc.id = wm.brand_collection_id
where prm.watch_reference_id = wr.id
  and prm.brand_slug = 'seiko'
  and (
    coalesce(bc.name, '') ilike '%LUKIA%'
    or prm.read_model_json::text ilike '%LUKIA%'
    or prm.reference_code_normalized in (
      'SSVW212', 'SSVV081', 'SSVV082', 'SSWA008', 'SSQW091',
      'SSQW092', 'SSQW094', 'SSQW096', 'SSQW098', 'SSVW209',
      'SSVW210', 'SSVW213', 'SSVW214', 'SSQW071', 'SSWA012',
      'SSWA011', 'SSVV090', 'SSVW196', 'SSVR139', 'SSVR140',
      'SSVM062', 'SSVV084', 'SSQW081', 'SSQW082', 'SSVW230'
    )
  );

create table if not exists public.user_watch_candidates (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  watch_reference_id uuid not null references public.watch_references(id) on delete cascade,
  status text not null default 'saved',
  note text,
  resolved_at timestamptz,
  resolved_by_user_watch_id uuid references public.user_watches(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_watch_candidates_status_check check (status in ('saved', 'considering', 'finalist')),
  constraint user_watch_candidates_note_length check (note is null or char_length(note) <= 1000),
  unique (user_id, watch_reference_id)
);

create index if not exists user_watch_candidates_owner_active_idx
on public.user_watch_candidates (user_id, status, updated_at desc)
where resolved_at is null;

create index if not exists user_watch_candidates_reference_idx
on public.user_watch_candidates (watch_reference_id)
where resolved_at is null;

create trigger user_watch_candidates_set_updated_at
before update on public.user_watch_candidates
for each row execute function public.set_updated_at();

alter table public.user_watch_candidates enable row level security;

drop policy if exists user_watch_candidates_owner_all on public.user_watch_candidates;
create policy user_watch_candidates_owner_all
on public.user_watch_candidates for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create or replace function public.resolve_user_watch_candidate_after_ownership()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.deleted_at is null
    and new.ownership_status = 'owned'
    and new.watch_reference_id is not null then
    update public.user_watch_candidates
    set resolved_at = coalesce(resolved_at, now()),
        resolved_by_user_watch_id = coalesce(resolved_by_user_watch_id, new.id)
    where user_id = new.user_id
      and watch_reference_id = new.watch_reference_id
      and resolved_at is null;
  end if;

  return new;
end;
$$;

drop trigger if exists user_watches_resolve_candidate_after_ownership on public.user_watches;
create trigger user_watches_resolve_candidate_after_ownership
after insert or update of ownership_status, watch_reference_id, deleted_at
on public.user_watches
for each row execute function public.resolve_user_watch_candidate_after_ownership();

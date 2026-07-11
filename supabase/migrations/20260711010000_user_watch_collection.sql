create table public.user_watch_collections (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Моя коллекция',
  description text,
  visibility text not null default 'private',
  public_slug text,
  public_description_enabled boolean not null default false,
  published_at timestamptz,
  collection_version integer not null default 1,
  is_default boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_watch_collections_title_present check (public.normalize_catalog_text(title) is not null),
  constraint user_watch_collections_visibility_check check (visibility in ('private', 'public')),
  constraint user_watch_collections_version_positive check (collection_version > 0),
  constraint user_watch_collections_public_state check (
    visibility = 'private'
    or (public_slug is not null and published_at is not null)
  ),
  unique (id, user_id)
);

create unique index user_watch_collections_one_default_per_user
on public.user_watch_collections (user_id)
where is_default = true;

create unique index user_watch_collections_public_slug_unique
on public.user_watch_collections (public_slug)
where public_slug is not null;

create trigger user_watch_collections_set_updated_at
before update on public.user_watch_collections
for each row execute function public.set_updated_at();

create table public.user_watches (
  id uuid primary key default extensions.gen_random_uuid(),
  user_watch_collection_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  watch_reference_id uuid references public.watch_references(id) on delete restrict,
  provisional_watch_identity_id uuid,
  source_kind text not null,
  display_name text not null,
  custom_brand_name text,
  custom_model_name text,
  custom_reference text,
  ownership_status text not null default 'owned',
  acquired_at date,
  acquisition_price_minor bigint,
  acquisition_currency_code char(3),
  acquisition_source text,
  personal_note text,
  public_visibility text not null default 'private',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_watches_collection_owner_fk foreign key (user_watch_collection_id, user_id)
    references public.user_watch_collections(id, user_id) on delete cascade,
  constraint user_watches_display_name_present check (public.normalize_catalog_text(display_name) is not null),
  constraint user_watches_source_kind_check check (source_kind in ('catalog', 'manual')),
  constraint user_watches_catalog_source_reference_check check (
    source_kind <> 'catalog' or watch_reference_id is not null
  ),
  constraint user_watches_ownership_status_check check (ownership_status in ('owned', 'previously_owned')),
  constraint user_watches_acquisition_price_non_negative check (
    acquisition_price_minor is null or acquisition_price_minor >= 0
  ),
  constraint user_watches_acquisition_currency_check check (
    (acquisition_price_minor is null and acquisition_currency_code is null)
    or (acquisition_price_minor is not null and acquisition_currency_code ~ '^[A-Z]{3}$')
  ),
  constraint user_watches_public_visibility_check check (
    public_visibility in ('private', 'public_summary', 'public_full')
  ),
  unique (id, user_id)
);

create index user_watches_owner_active_idx
on public.user_watches (user_id, created_at desc)
where deleted_at is null;

create index user_watches_collection_active_idx
on public.user_watches (user_watch_collection_id, created_at desc)
where deleted_at is null;

create index user_watches_reference_owner_idx
on public.user_watches (user_id, watch_reference_id)
where watch_reference_id is not null and deleted_at is null;

create trigger user_watches_set_updated_at
before update on public.user_watches
for each row execute function public.set_updated_at();

create or replace function public.bump_user_watch_collection_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    update public.user_watch_collections
    set collection_version = collection_version + 1
    where id = old.user_watch_collection_id and user_id = old.user_id;
    return old;
  end if;

  update public.user_watch_collections
  set collection_version = collection_version + 1
  where id = new.user_watch_collection_id and user_id = new.user_id;
  return new;
end;
$$;

create trigger user_watches_bump_collection_version
after insert or update or delete on public.user_watches
for each row execute function public.bump_user_watch_collection_version();

create table public.user_watch_source_data (
  id uuid primary key default extensions.gen_random_uuid(),
  user_watch_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  raw_brand_name text,
  raw_model_name text,
  raw_reference text,
  raw_display_name text,
  raw_year_or_period text,
  raw_movement text,
  raw_case_size text,
  raw_dial_color text,
  raw_attachment text,
  raw_case_material text,
  raw_water_resistance text,
  raw_functions text,
  source_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_watch_source_data_watch_owner_fk foreign key (user_watch_id, user_id)
    references public.user_watches(id, user_id) on delete cascade,
  unique (user_watch_id)
);

create trigger user_watch_source_data_set_updated_at
before update on public.user_watch_source_data
for each row execute function public.set_updated_at();

create table public.user_watch_analysis_traits (
  id uuid primary key default extensions.gen_random_uuid(),
  user_watch_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  normalization_status text not null default 'empty',
  movement_type_id uuid references public.movement_types(id) on delete set null,
  case_material_id uuid references public.materials(id) on delete set null,
  dial_color_id uuid references public.colors(id) on delete set null,
  strap_material_id uuid references public.materials(id) on delete set null,
  bracelet_material_id uuid references public.materials(id) on delete set null,
  attachment_type text,
  case_diameter_mm numeric(5,2),
  lug_to_lug_mm numeric(5,2),
  case_thickness_mm numeric(5,2),
  water_resistance_m integer,
  brand_country_code char(2),
  production_country_code char(2),
  style_scores_json jsonb not null default '{}'::jsonb,
  use_case_scores_json jsonb not null default '{}'::jsonb,
  function_codes_json jsonb not null default '[]'::jsonb,
  trait_provenance_json jsonb not null default '{}'::jsonb,
  trait_confidence_json jsonb not null default '{}'::jsonb,
  completeness_score numeric(4,3) not null default 0,
  analysis_confidence numeric(4,3) not null default 0,
  data_confidence text not null default 'unknown',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_watch_analysis_traits_watch_owner_fk foreign key (user_watch_id, user_id)
    references public.user_watches(id, user_id) on delete cascade,
  constraint user_watch_analysis_traits_status_check check (
    normalization_status in ('empty', 'partial', 'confirmed', 'needs_review')
  ),
  constraint user_watch_analysis_traits_confidence_check check (
    data_confidence in ('verified', 'user_confirmed', 'deterministic', 'suggested', 'partial', 'unknown')
  ),
  constraint user_watch_analysis_traits_score_range check (
    completeness_score between 0 and 1 and analysis_confidence between 0 and 1
  ),
  constraint user_watch_analysis_traits_dimensions_positive check (
    (case_diameter_mm is null or case_diameter_mm > 0)
    and (lug_to_lug_mm is null or lug_to_lug_mm > 0)
    and (case_thickness_mm is null or case_thickness_mm > 0)
    and (water_resistance_m is null or water_resistance_m >= 0)
  ),
  unique (user_watch_id)
);

create trigger user_watch_analysis_traits_set_updated_at
before update on public.user_watch_analysis_traits
for each row execute function public.set_updated_at();

create table public.provisional_watch_identities (
  id uuid primary key default extensions.gen_random_uuid(),
  normalized_brand_key text,
  normalized_model_key text,
  normalized_reference_key text,
  display_label text not null,
  status text not null default 'candidate',
  watch_reference_id uuid references public.watch_references(id) on delete set null,
  aggregate_count integer not null default 1,
  last_seen_at timestamptz not null default now(),
  shared_traits_json jsonb,
  shared_traits_provenance_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint provisional_watch_identities_label_present check (public.normalize_catalog_text(display_label) is not null),
  constraint provisional_watch_identities_status_check check (
    status in ('candidate', 'reviewed', 'linked_to_catalog', 'rejected')
  ),
  constraint provisional_watch_identities_count_positive check (aggregate_count > 0)
);

alter table public.user_watches
add constraint user_watches_provisional_identity_fk foreign key (provisional_watch_identity_id)
references public.provisional_watch_identities(id) on delete set null;

create trigger provisional_watch_identities_set_updated_at
before update on public.provisional_watch_identities
for each row execute function public.set_updated_at();

create table public.user_watch_match_candidates (
  id uuid primary key default extensions.gen_random_uuid(),
  user_watch_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  candidate_type text not null,
  watch_reference_id uuid references public.watch_references(id) on delete cascade,
  provisional_watch_identity_id uuid references public.provisional_watch_identities(id) on delete cascade,
  match_status text not null default 'suggested',
  match_confidence text not null,
  score numeric(5,4),
  signals_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  constraint user_watch_match_candidates_watch_owner_fk foreign key (user_watch_id, user_id)
    references public.user_watches(id, user_id) on delete cascade,
  constraint user_watch_match_candidates_type_check check (
    candidate_type in ('watch_reference', 'provisional_watch_identity')
  ),
  constraint user_watch_match_candidates_target_check check (
    (candidate_type = 'watch_reference' and watch_reference_id is not null and provisional_watch_identity_id is null)
    or (candidate_type = 'provisional_watch_identity' and provisional_watch_identity_id is not null and watch_reference_id is null)
  ),
  constraint user_watch_match_candidates_status_check check (
    match_status in ('suggested', 'confirmed', 'rejected', 'ambiguous', 'expired')
  ),
  constraint user_watch_match_candidates_confidence_check check (
    match_confidence in ('exact_candidate', 'high_confidence_candidate', 'possible_candidate', 'ambiguous', 'no_match')
  ),
  constraint user_watch_match_candidates_score_range check (score is null or score between 0 and 1)
);

create index user_watch_match_candidates_owner_status_idx
on public.user_watch_match_candidates (user_id, match_status, created_at desc);

create table public.user_watch_files (
  id uuid primary key default extensions.gen_random_uuid(),
  user_watch_id uuid not null,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  file_kind text not null,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null,
  original_filename text,
  created_at timestamptz not null default now(),
  constraint user_watch_files_watch_owner_fk foreign key (user_watch_id, owner_user_id)
    references public.user_watches(id, user_id) on delete cascade,
  constraint user_watch_files_kind_check check (
    file_kind in ('photo', 'receipt', 'warranty', 'service_document', 'other')
  ),
  constraint user_watch_files_size_positive check (size_bytes > 0),
  constraint user_watch_files_path_present check (public.normalize_catalog_text(storage_path) is not null),
  unique (storage_bucket, storage_path)
);

create index user_watch_files_watch_kind_idx
on public.user_watch_files (user_watch_id, file_kind, created_at);

alter table public.user_watch_collections enable row level security;
alter table public.user_watches enable row level security;
alter table public.user_watch_source_data enable row level security;
alter table public.user_watch_analysis_traits enable row level security;
alter table public.provisional_watch_identities enable row level security;
alter table public.user_watch_match_candidates enable row level security;
alter table public.user_watch_files enable row level security;

create policy user_watch_collections_owner_all
on public.user_watch_collections for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy user_watches_owner_all
on public.user_watches for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy user_watch_source_data_owner_all
on public.user_watch_source_data for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy user_watch_analysis_traits_owner_all
on public.user_watch_analysis_traits for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy user_watch_match_candidates_owner_all
on public.user_watch_match_candidates for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy user_watch_files_owner_all
on public.user_watch_files for all to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy provisional_watch_identities_admin_read
on public.provisional_watch_identities for select to authenticated
using (public.current_user_has_any_role(array['admin', 'catalog_manager']));

create policy provisional_watch_identities_admin_write
on public.provisional_watch_identities for all to authenticated
using (public.current_user_has_any_role(array['admin', 'catalog_manager']))
with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));

create or replace function public.ensure_user_watch_collection()
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  collection_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select id into collection_id
  from public.user_watch_collections
  where user_id = current_user_id and is_default = true
  limit 1;

  if collection_id is null then
    insert into public.user_watch_collections (user_id, is_default)
    values (current_user_id, true)
    on conflict (user_id) where is_default = true do update set updated_at = now()
    returning id into collection_id;
  end if;

  return collection_id;
end;
$$;

create or replace function public.create_catalog_user_watch(
  input_watch_reference_id uuid,
  input_display_name text default null,
  input_allow_duplicate boolean default false
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  collection_id uuid;
  reference_display_name text;
  user_watch_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  select display_name into reference_display_name
  from public.watch_references
  where id = input_watch_reference_id and status in ('published', 'archival');

  if reference_display_name is null then
    raise exception using errcode = '22023', message = 'invalid_watch_reference';
  end if;

  if not input_allow_duplicate and exists (
    select 1 from public.user_watches
    where user_id = current_user_id
      and watch_reference_id = input_watch_reference_id
      and deleted_at is null
  ) then
    raise exception using errcode = '23505', message = 'duplicate_catalog_watch_confirmation_required';
  end if;

  collection_id := public.ensure_user_watch_collection();

  insert into public.user_watches (
    user_watch_collection_id,
    user_id,
    watch_reference_id,
    source_kind,
    display_name
  ) values (
    collection_id,
    current_user_id,
    input_watch_reference_id,
    'catalog',
    coalesce(nullif(btrim(input_display_name), ''), reference_display_name)
  ) returning id into user_watch_id;

  return user_watch_id;
end;
$$;

create or replace function public.create_manual_user_watch(
  input_display_name text,
  input_brand_name text default null,
  input_model_name text default null,
  input_reference text default null,
  input_note text default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  collection_id uuid;
  user_watch_id uuid;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;

  if public.normalize_catalog_text(input_display_name) is null then
    raise exception using errcode = '22023', message = 'display_name_required';
  end if;

  collection_id := public.ensure_user_watch_collection();

  insert into public.user_watches (
    user_watch_collection_id,
    user_id,
    source_kind,
    display_name,
    custom_brand_name,
    custom_model_name,
    custom_reference,
    personal_note
  ) values (
    collection_id,
    current_user_id,
    'manual',
    btrim(input_display_name),
    nullif(btrim(input_brand_name), ''),
    nullif(btrim(input_model_name), ''),
    nullif(btrim(input_reference), ''),
    nullif(btrim(input_note), '')
  ) returning id into user_watch_id;

  insert into public.user_watch_source_data (
    user_watch_id,
    user_id,
    raw_brand_name,
    raw_model_name,
    raw_reference,
    raw_display_name
  ) values (
    user_watch_id,
    current_user_id,
    nullif(btrim(input_brand_name), ''),
    nullif(btrim(input_model_name), ''),
    nullif(btrim(input_reference), ''),
    btrim(input_display_name)
  );

  insert into public.user_watch_analysis_traits (user_watch_id, user_id)
  values (user_watch_id, current_user_id);

  return user_watch_id;
end;
$$;

revoke all on function public.ensure_user_watch_collection() from public;
revoke all on function public.create_catalog_user_watch(uuid, text, boolean) from public;
revoke all on function public.create_manual_user_watch(text, text, text, text, text) from public;
grant execute on function public.ensure_user_watch_collection() to authenticated;
grant execute on function public.create_catalog_user_watch(uuid, text, boolean) to authenticated;
grant execute on function public.create_manual_user_watch(text, text, text, text, text) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-watch-collection-media-private',
  'user-watch-collection-media-private',
  false,
  8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy user_watch_media_owner_select
on storage.objects for select to authenticated
using (
  bucket_id = 'user-watch-collection-media-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy user_watch_media_owner_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'user-watch-collection-media-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy user_watch_media_owner_update
on storage.objects for update to authenticated
using (
  bucket_id = 'user-watch-collection-media-private'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'user-watch-collection-media-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy user_watch_media_owner_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'user-watch-collection-media-private'
  and (storage.foldername(name))[1] = auth.uid()::text
);

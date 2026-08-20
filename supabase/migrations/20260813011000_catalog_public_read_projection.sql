create table public.catalog_public_read_models (
  watch_reference_id uuid primary key references public.watch_references(id) on delete cascade,
  brand_slug text not null,
  reference_slug text not null,
  reference_code_normalized text not null,
  read_model_json jsonb not null,
  source_import_batch_id uuid references public.import_batches(id) on delete set null,
  status text not null default 'published',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_public_read_models_brand_slug_format check (public.is_catalog_slug(brand_slug)),
  constraint catalog_public_read_models_reference_slug_format check (public.is_catalog_slug(reference_slug)),
  constraint catalog_public_read_models_reference_present check (public.normalize_reference_code(reference_code_normalized) is not null),
  constraint catalog_public_read_models_status_check check (status in ('published', 'hidden', 'archived')),
  unique (brand_slug, reference_slug)
);

create index catalog_public_read_models_brand_idx
on public.catalog_public_read_models (brand_slug, status);

create trigger catalog_public_read_models_set_updated_at
before update on public.catalog_public_read_models
for each row execute function public.set_updated_at();

alter table public.catalog_public_read_models enable row level security;

create policy catalog_public_read_models_public_read
on public.catalog_public_read_models
for select
to anon, authenticated
using (status = 'published');

create policy catalog_public_read_models_catalog_admin_write
on public.catalog_public_read_models
for all
to authenticated
using (public.current_user_has_any_role(array['admin', 'catalog_manager']))
with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));

create or replace function public.apply_catalog_public_read_models(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  v_batch_id uuid;
  v_reference_id uuid;
  row_count integer := 0;
begin
  if coalesce(input->>'confirmation', '') <> 'APPLY_ETERNAL_TIME_CATALOG_IMPORT' then
    raise exception 'Catalog public read model apply confirmation token is missing or invalid.';
  end if;

  v_batch_id := nullif(input->>'importBatchId', '')::uuid;

  for item in
    select value from jsonb_array_elements(coalesce(input->'publicReadModels', '[]'::jsonb))
  loop
    select wr.id into v_reference_id
    from public.watch_references wr
    join public.brands b on b.id = wr.brand_id
    where b.slug = item->>'brandSlug'
      and wr.reference_code_normalized = public.normalize_reference_code(item->>'referenceNormalized')
    limit 1;

    if v_reference_id is null then
      raise exception 'Public read model reference is missing for %/%', item->>'brandSlug', item->>'referenceSlug';
    end if;

    insert into public.catalog_public_read_models (
      watch_reference_id,
      brand_slug,
      reference_slug,
      reference_code_normalized,
      read_model_json,
      source_import_batch_id,
      status
    )
    values (
      v_reference_id,
      item->>'brandSlug',
      item->>'referenceSlug',
      item->>'referenceNormalized',
      item,
      v_batch_id,
      'published'
    )
    on conflict (watch_reference_id) do update
    set brand_slug = excluded.brand_slug,
        reference_slug = excluded.reference_slug,
        reference_code_normalized = excluded.reference_code_normalized,
        read_model_json = excluded.read_model_json,
        source_import_batch_id = excluded.source_import_batch_id,
        status = 'published';

    row_count := row_count + 1;
  end loop;

  insert into public.audit_logs (action, entity_type, entity_id, safe_metadata_json)
  values (
    'catalog_public_read_models.apply',
    'import_batch',
    v_batch_id,
    jsonb_build_object('recordCount', row_count)
  );

  return jsonb_build_object(
    'importBatchId', v_batch_id,
    'recordCount', row_count
  );
end;
$$;

revoke all on function public.apply_catalog_public_read_models(jsonb) from public;
grant execute on function public.apply_catalog_public_read_models(jsonb) to service_role;

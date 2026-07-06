create table public.import_batches (
  id uuid primary key default extensions.gen_random_uuid(),
  source_filename text not null,
  source_kind text not null,
  status text not null default 'dry_run',
  uploaded_by uuid references auth.users(id) on delete set null,
  mapping_json jsonb not null default '{}'::jsonb,
  summary_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  applied_at timestamptz,
  constraint import_batches_source_filename_present check (public.normalize_catalog_text(source_filename) is not null),
  constraint import_batches_source_kind_format check (source_kind ~ '^[a-z][a-z0-9_]*$'),
  constraint import_batches_status_check check (status in ('dry_run', 'pending', 'applying', 'applied', 'failed', 'cancelled')),
  constraint import_batches_applied_status_check check (
    (status = 'applied' and applied_at is not null)
    or (status <> 'applied')
  )
);

create index import_batches_status_created_idx
on public.import_batches (status, created_at desc);

create table public.import_rows (
  id uuid primary key default extensions.gen_random_uuid(),
  import_batch_id uuid not null references public.import_batches(id) on delete cascade,
  row_number integer not null,
  raw_json jsonb not null default '{}'::jsonb,
  normalized_json jsonb not null default '{}'::jsonb,
  status text not null,
  errors_json jsonb not null default '[]'::jsonb,
  warnings_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint import_rows_row_number_positive check (row_number > 0),
  constraint import_rows_status_check check (
    status in ('eligible', 'manual_review', 'intentionally_skipped_missing_reference', 'applied', 'failed')
  )
);

create index import_rows_batch_status_idx
on public.import_rows (import_batch_id, status);

create table public.audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  safe_metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_format check (action ~ '^[a-z][a-z0-9_.]*$'),
  constraint audit_logs_entity_type_format check (entity_type ~ '^[a-z][a-z0-9_]*$')
);

create index audit_logs_entity_created_idx
on public.audit_logs (entity_type, entity_id, created_at desc);

alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;
alter table public.audit_logs enable row level security;

create policy import_batches_catalog_admin_read
on public.import_batches
for select
to authenticated
using (public.current_user_has_any_role(array['admin', 'catalog_manager']));

create policy import_batches_catalog_admin_write
on public.import_batches
for all
to authenticated
using (public.current_user_has_any_role(array['admin', 'catalog_manager']))
with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));

create policy import_rows_catalog_admin_read
on public.import_rows
for select
to authenticated
using (public.current_user_has_any_role(array['admin', 'catalog_manager']));

create policy import_rows_catalog_admin_write
on public.import_rows
for all
to authenticated
using (public.current_user_has_any_role(array['admin', 'catalog_manager']))
with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));

create policy audit_logs_admin_read
on public.audit_logs
for select
to authenticated
using (public.current_user_has_any_role(array['admin']));

create policy audit_logs_admin_write
on public.audit_logs
for all
to authenticated
using (public.current_user_has_any_role(array['admin']))
with check (public.current_user_has_any_role(array['admin']));

create or replace function public.apply_catalog_import_batch(input jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  item jsonb;
  batch_id uuid;
  row_index integer := 0;
  brand_id uuid;
  collection_id uuid;
  model_id uuid;
  reference_id uuid;
  offer_id uuid;
  existing_price_minor bigint;
  proposed_price_minor bigint;
  duplicate_offer_count integer;
  inserted_brands integer := 0;
  inserted_collections integer := 0;
  inserted_models integer := 0;
  inserted_references integer := 0;
  inserted_offers integer := 0;
  updated_offers integer := 0;
  inserted_prices integer := 0;
  noop_offers integer := 0;
  reference_display text;
  reference_normalized text;
  import_offer_marker constant text := 'catalog_import_pipeline_v1';
begin
  if coalesce(input->>'confirmation', '') <> 'APPLY_ETERNAL_TIME_CATALOG_IMPORT' then
    raise exception 'Catalog import apply confirmation token is missing or invalid.';
  end if;

  insert into public.import_batches (source_filename, source_kind, status, mapping_json, summary_json)
  values (
    coalesce(input->>'sourceFilename', 'catalog-import-preview.json'),
    'catalog_import_preview',
    'applying',
    jsonb_build_object('version', 1, 'strategy', 'controlled_catalog_database_apply'),
    jsonb_build_object('startedAt', now())
  )
  returning id into batch_id;

  for item in
    select value from jsonb_array_elements(coalesce(input->'records', '[]'::jsonb))
  loop
    row_index := row_index + 1;
    brand_id := null;
    collection_id := null;
    model_id := null;
    reference_id := null;
    offer_id := null;
    existing_price_minor := null;
    proposed_price_minor := null;
    reference_display := item->>'referenceDisplay';
    reference_normalized := public.normalize_reference_code(reference_display);

    if exists (
      select 1
      from public.brands b
      where b.slug = item->>'brandSlug'
        and b.name_normalized <> public.normalize_catalog_text(item->>'brand')
    ) then
      raise exception 'Brand slug conflict for %', item->>'brandSlug';
    end if;

    select b.id into brand_id
    from public.brands b
    where b.name_normalized = public.normalize_catalog_text(item->>'brand')
    limit 1;

    if brand_id is null then
      insert into public.brands (name, slug, status)
      values (item->>'brand', item->>'brandSlug', 'draft')
      returning id into brand_id;
      inserted_brands := inserted_brands + 1;
    end if;

    if nullif(item->>'brandCollection', '') is not null then
      if exists (
        select 1
        from public.brand_collections bc
        where bc.brand_id = brand_id
          and bc.slug = item->>'brandCollectionSlug'
          and bc.name_normalized <> public.normalize_catalog_text(item->>'brandCollection')
      ) then
        raise exception 'Brand Collection slug conflict for %', item->>'brandCollectionSlug';
      end if;

      select bc.id into collection_id
      from public.brand_collections bc
      where bc.brand_id = brand_id
        and bc.name_normalized = public.normalize_catalog_text(item->>'brandCollection')
      limit 1;

      if collection_id is null then
        insert into public.brand_collections (brand_id, name, slug, status)
        values (brand_id, item->>'brandCollection', item->>'brandCollectionSlug', 'draft')
        returning id into collection_id;
        inserted_collections := inserted_collections + 1;
      end if;
    end if;

    if exists (
      select 1
      from public.watch_models wm
      where wm.brand_id = brand_id
        and wm.slug = item->>'watchModelSlug'
        and wm.name_normalized <> public.normalize_catalog_text(item->>'watchModel')
    ) then
      raise exception 'Watch Model slug conflict for %', item->>'watchModelSlug';
    end if;

    select wm.id into model_id
    from public.watch_models wm
    where wm.brand_id = brand_id
      and wm.name_normalized = public.normalize_catalog_text(item->>'watchModel')
    limit 1;

    if model_id is null then
      insert into public.watch_models (brand_id, brand_collection_id, name, slug, model_status)
      values (brand_id, collection_id, item->>'watchModel', item->>'watchModelSlug', 'draft')
      returning id into model_id;
      inserted_models := inserted_models + 1;
    end if;

    if exists (
      select 1
      from public.watch_references wr
      where wr.brand_id = brand_id
        and wr.slug = item->>'referenceSlug'
        and wr.reference_code_normalized <> reference_normalized
    ) then
      raise exception 'Watch Reference slug conflict for %', item->>'referenceSlug';
    end if;

    select wr.id into reference_id
    from public.watch_references wr
    where wr.brand_id = brand_id
      and wr.reference_code_normalized = reference_normalized
    limit 1;

    if reference_id is null then
      insert into public.watch_references (
        brand_id,
        watch_model_id,
        reference_code_display,
        slug,
        display_name,
        status,
        reference_status,
        data_confidence
      )
      values (
        brand_id,
        model_id,
        reference_display,
        item->>'referenceSlug',
        item->>'displayName',
        'draft',
        'unknown',
        'imported'
      )
      returning id into reference_id;
      inserted_references := inserted_references + 1;
    end if;

    if nullif(item->>'publicPriceMinor', '') is not null then
      proposed_price_minor := (item->>'publicPriceMinor')::bigint;

      select count(*) into duplicate_offer_count
      from public.catalog_offers co
      where co.watch_reference_id = reference_id
        and co.offer_kind = 'standard'
        and co.condition = 'new'
        and co.seller_note = import_offer_marker;

      if duplicate_offer_count > 1 then
        raise exception 'Multiple import-managed offers found for reference %', reference_display;
      end if;

      select co.id, co.current_price_minor into offer_id, existing_price_minor
      from public.catalog_offers co
      where co.watch_reference_id = reference_id
        and co.offer_kind = 'standard'
        and co.condition = 'new'
        and co.seller_note = import_offer_marker
      limit 1;

      if offer_id is null then
        insert into public.catalog_offers (
          watch_reference_id,
          status,
          offer_kind,
          condition,
          current_price_minor,
          currency_code,
          is_visible,
          seller_note
        )
        values (
          reference_id,
          'inactive',
          'standard',
          'new',
          proposed_price_minor,
          'RUB',
          false,
          import_offer_marker
        )
        returning id into offer_id;
        inserted_offers := inserted_offers + 1;

        insert into public.offer_price_history (catalog_offer_id, price_minor, currency_code, reason)
        values (offer_id, proposed_price_minor, 'RUB', 'catalog_import_apply');
        inserted_prices := inserted_prices + 1;
      elsif existing_price_minor = proposed_price_minor then
        noop_offers := noop_offers + 1;
      else
        update public.offer_price_history
        set valid_to = now()
        where catalog_offer_id = offer_id
          and valid_to is null
          and price_minor <> proposed_price_minor;

        update public.catalog_offers
        set previous_price_minor = current_price_minor,
            current_price_minor = proposed_price_minor,
            currency_code = 'RUB'
        where id = offer_id;

        insert into public.offer_price_history (catalog_offer_id, price_minor, currency_code, reason)
        select offer_id, proposed_price_minor, 'RUB', 'catalog_import_apply'
        where not exists (
          select 1
          from public.offer_price_history oph
          where oph.catalog_offer_id = offer_id
            and oph.valid_to is null
            and oph.price_minor = proposed_price_minor
        );

        updated_offers := updated_offers + 1;
        inserted_prices := inserted_prices + 1;
      end if;
    end if;

    insert into public.import_rows (
      import_batch_id,
      row_number,
      raw_json,
      normalized_json,
      status,
      warnings_json
    )
    values (
      batch_id,
      row_index,
      jsonb_build_object('candidateId', item->>'candidateId'),
      item,
      'applied',
      coalesce(item->'warnings', '[]'::jsonb)
    );
  end loop;

  update public.import_batches
  set status = 'applied',
      applied_at = now(),
      summary_json = jsonb_build_object(
        'recordCount', row_index,
        'insertedBrands', inserted_brands,
        'insertedBrandCollections', inserted_collections,
        'insertedWatchModels', inserted_models,
        'insertedWatchReferences', inserted_references,
        'insertedCatalogOffers', inserted_offers,
        'updatedCatalogOffers', updated_offers,
        'insertedPublicPrices', inserted_prices,
        'noopCatalogOffers', noop_offers
      )
  where id = batch_id;

  insert into public.audit_logs (action, entity_type, entity_id, safe_metadata_json)
  values (
    'catalog_import.apply',
    'import_batch',
    batch_id,
    jsonb_build_object(
      'recordCount', row_index,
      'insertedBrands', inserted_brands,
      'insertedBrandCollections', inserted_collections,
      'insertedWatchModels', inserted_models,
      'insertedWatchReferences', inserted_references,
      'insertedCatalogOffers', inserted_offers,
      'updatedCatalogOffers', updated_offers,
      'insertedPublicPrices', inserted_prices,
      'noopCatalogOffers', noop_offers
    )
  );

  return jsonb_build_object(
    'importBatchId', batch_id,
    'recordCount', row_index,
    'insertedBrands', inserted_brands,
    'insertedBrandCollections', inserted_collections,
    'insertedWatchModels', inserted_models,
    'insertedWatchReferences', inserted_references,
    'insertedCatalogOffers', inserted_offers,
    'updatedCatalogOffers', updated_offers,
    'insertedPublicPrices', inserted_prices,
    'noopCatalogOffers', noop_offers
  );
exception
  when others then
    update public.import_batches
    set status = 'failed',
        summary_json = summary_json || jsonb_build_object('errorCode', sqlstate)
    where id = batch_id;
    raise;
end;
$$;

revoke all on function public.apply_catalog_import_batch(jsonb) from public;
grant execute on function public.apply_catalog_import_batch(jsonb) to service_role;

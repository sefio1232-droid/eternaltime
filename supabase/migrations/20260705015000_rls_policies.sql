alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.user_roles enable row level security;

create policy profiles_select_own_or_admin
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.current_user_has_role('admin'));

create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy roles_select_authenticated
on public.roles
for select
to authenticated
using (true);

create policy roles_admin_write
on public.roles
for all
to authenticated
using (public.current_user_has_role('admin'))
with check (public.current_user_has_role('admin'));

create policy user_roles_select_own_or_admin
on public.user_roles
for select
to authenticated
using (user_id = auth.uid() or public.current_user_has_role('admin'));

create policy user_roles_admin_write
on public.user_roles
for all
to authenticated
using (public.current_user_has_role('admin'))
with check (public.current_user_has_role('admin'));

alter table public.movement_types enable row level security;
alter table public.movements enable row level security;
alter table public.materials enable row level security;
alter table public.colors enable row level security;
alter table public.crystal_types enable row level security;
alter table public.case_shapes enable row level security;
alter table public.clasp_types enable row level security;
alter table public.styles enable row level security;
alter table public.use_cases enable row level security;
alter table public.watch_functions enable row level security;
alter table public.attribute_definitions enable row level security;
alter table public.attribute_options enable row level security;

create policy movement_types_public_active_read on public.movement_types for select to anon, authenticated using (status = 'active');
create policy movements_public_read on public.movements for select to anon, authenticated using (true);
create policy materials_public_active_read on public.materials for select to anon, authenticated using (status = 'active');
create policy colors_public_active_read on public.colors for select to anon, authenticated using (status = 'active');
create policy crystal_types_public_active_read on public.crystal_types for select to anon, authenticated using (status = 'active');
create policy case_shapes_public_active_read on public.case_shapes for select to anon, authenticated using (status = 'active');
create policy clasp_types_public_active_read on public.clasp_types for select to anon, authenticated using (status = 'active');
create policy styles_public_active_read on public.styles for select to anon, authenticated using (status = 'active');
create policy use_cases_public_active_read on public.use_cases for select to anon, authenticated using (status = 'active');
create policy watch_functions_public_active_read on public.watch_functions for select to anon, authenticated using (status = 'active');
create policy attribute_definitions_public_active_read on public.attribute_definitions for select to anon, authenticated using (status = 'active');
create policy attribute_options_public_active_read on public.attribute_options for select to anon, authenticated using (status = 'active');

create policy movement_types_catalog_admin_write on public.movement_types for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy movements_catalog_admin_write on public.movements for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy materials_catalog_admin_write on public.materials for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy colors_catalog_admin_write on public.colors for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy crystal_types_catalog_admin_write on public.crystal_types for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy case_shapes_catalog_admin_write on public.case_shapes for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy clasp_types_catalog_admin_write on public.clasp_types for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy styles_catalog_admin_write on public.styles for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy use_cases_catalog_admin_write on public.use_cases for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy watch_functions_catalog_admin_write on public.watch_functions for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy attribute_definitions_catalog_admin_write on public.attribute_definitions for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy attribute_options_catalog_admin_write on public.attribute_options for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));

alter table public.brands enable row level security;
alter table public.brand_collections enable row level security;
alter table public.brand_lines enable row level security;
alter table public.watch_models enable row level security;
alter table public.watch_references enable row level security;
alter table public.watch_reference_styles enable row level security;
alter table public.watch_reference_use_cases enable row level security;
alter table public.watch_reference_functions enable row level security;
alter table public.watch_reference_attribute_values enable row level security;
alter table public.catalog_search_documents enable row level security;

create policy brands_public_read
on public.brands
for select
to anon, authenticated
using (status = 'published');

create policy brand_collections_public_read
on public.brand_collections
for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1 from public.brands b
    where b.id = brand_collections.brand_id
      and b.status = 'published'
  )
);

create policy brand_lines_public_read
on public.brand_lines
for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.brand_collections bc
    join public.brands b on b.id = bc.brand_id
    where bc.id = brand_lines.brand_collection_id
      and bc.status = 'published'
      and b.status = 'published'
  )
);

create policy watch_models_public_read
on public.watch_models
for select
to anon, authenticated
using (
  model_status in ('active', 'archival')
  and exists (
    select 1 from public.brands b
    where b.id = watch_models.brand_id
      and b.status = 'published'
  )
);

create policy watch_references_public_read
on public.watch_references
for select
to anon, authenticated
using (
  status in ('published', 'archival')
  and exists (
    select 1 from public.brands b
    where b.id = watch_references.brand_id
      and b.status = 'published'
  )
);

create policy watch_reference_styles_public_read on public.watch_reference_styles for select to anon, authenticated using (
  exists (select 1 from public.watch_references wr where wr.id = watch_reference_styles.watch_reference_id and wr.status in ('published', 'archival'))
);

create policy watch_reference_use_cases_public_read on public.watch_reference_use_cases for select to anon, authenticated using (
  exists (select 1 from public.watch_references wr where wr.id = watch_reference_use_cases.watch_reference_id and wr.status in ('published', 'archival'))
);

create policy watch_reference_functions_public_read on public.watch_reference_functions for select to anon, authenticated using (
  exists (select 1 from public.watch_references wr where wr.id = watch_reference_functions.watch_reference_id and wr.status in ('published', 'archival'))
);

create policy watch_reference_attribute_values_public_read on public.watch_reference_attribute_values for select to anon, authenticated using (
  exists (select 1 from public.watch_references wr where wr.id = watch_reference_attribute_values.watch_reference_id and wr.status in ('published', 'archival'))
);

create policy catalog_search_documents_public_read on public.catalog_search_documents for select to anon, authenticated using (
  exists (select 1 from public.watch_references wr where wr.id = catalog_search_documents.watch_reference_id and wr.status in ('published', 'archival'))
);

create policy brands_catalog_admin_write on public.brands for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy brand_collections_catalog_admin_write on public.brand_collections for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy brand_lines_catalog_admin_write on public.brand_lines for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy watch_models_catalog_admin_write on public.watch_models for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy watch_references_catalog_admin_write on public.watch_references for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy watch_reference_styles_catalog_admin_write on public.watch_reference_styles for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy watch_reference_use_cases_catalog_admin_write on public.watch_reference_use_cases for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy watch_reference_functions_catalog_admin_write on public.watch_reference_functions for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy watch_reference_attribute_values_catalog_admin_write on public.watch_reference_attribute_values for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy catalog_search_documents_catalog_admin_write on public.catalog_search_documents for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));

alter table public.delivery_estimates enable row level security;
alter table public.inventory_states enable row level security;
alter table public.catalog_offers enable row level security;
alter table public.offer_price_history enable row level security;
alter table public.inventory_events enable row level security;
alter table public.watch_images enable row level security;

create policy delivery_estimates_public_active_read on public.delivery_estimates for select to anon, authenticated using (status = 'active');
create policy inventory_states_public_read on public.inventory_states for select to anon, authenticated using (true);

create policy catalog_offers_public_read
on public.catalog_offers
for select
to anon, authenticated
using (
  is_visible = true
  and status in ('active', 'coming_soon', 'on_request')
  and exists (
    select 1
    from public.watch_references wr
    where wr.id = catalog_offers.watch_reference_id
      and wr.status in ('published', 'archival')
  )
);

create policy watch_images_public_read
on public.watch_images
for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.watch_references wr
    where wr.id = watch_images.watch_reference_id
      and wr.status in ('published', 'archival')
  )
);

create policy delivery_estimates_catalog_admin_write on public.delivery_estimates for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy inventory_states_catalog_admin_write on public.inventory_states for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy catalog_offers_catalog_admin_write on public.catalog_offers for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy offer_price_history_catalog_admin_read_write on public.offer_price_history for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy inventory_events_catalog_admin_read_write on public.inventory_events for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));
create policy watch_images_catalog_admin_write on public.watch_images for all to authenticated using (public.current_user_has_any_role(array['admin', 'catalog_manager'])) with check (public.current_user_has_any_role(array['admin', 'catalog_manager']));

create table public.delivery_estimates (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  label text not null,
  min_days integer,
  max_days integer,
  status text not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_estimates_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint delivery_estimates_status_check check (status in ('draft', 'active', 'inactive')),
  constraint delivery_estimates_days_valid check (
    (min_days is null or min_days >= 0)
    and (max_days is null or max_days >= 0)
    and (min_days is null or max_days is null or max_days >= min_days)
  ),
  constraint delivery_estimates_sort_order_non_negative check (sort_order >= 0)
);

create trigger delivery_estimates_set_updated_at
before update on public.delivery_estimates
for each row execute function public.set_updated_at();

create table public.inventory_states (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  label text not null,
  is_orderable boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inventory_states_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint inventory_states_sort_order_non_negative check (sort_order >= 0)
);

insert into public.inventory_states (code, label, is_orderable, sort_order)
values
  ('in_stock', 'In stock', true, 10),
  ('preorder', 'Preorder', true, 20),
  ('on_request', 'On request', true, 30),
  ('out_of_stock', 'Out of stock', false, 40),
  ('archival', 'Archival', false, 50)
on conflict (code) do nothing;

create trigger inventory_states_set_updated_at
before update on public.inventory_states
for each row execute function public.set_updated_at();

create table public.catalog_offers (
  id uuid primary key default extensions.gen_random_uuid(),
  watch_reference_id uuid not null references public.watch_references(id) on delete restrict,
  status text not null default 'inactive',
  offer_kind text not null default 'standard',
  condition text not null default 'new',
  sku text,
  current_price_minor bigint,
  previous_price_minor bigint,
  currency_code char(3),
  inventory_state_id uuid references public.inventory_states(id) on delete set null,
  delivery_estimate_id uuid references public.delivery_estimates(id) on delete set null,
  seller_note text,
  purchase_limit integer,
  is_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint catalog_offers_status_check check (
    status in ('active', 'inactive', 'coming_soon', 'on_request', 'sold_out')
  ),
  constraint catalog_offers_kind_check check (offer_kind in ('standard', 'bundle', 'preorder', 'consignment', 'archival')),
  constraint catalog_offers_condition_check check (condition in ('new', 'pre_owned', 'open_box')),
  constraint catalog_offers_money_non_negative check (
    (current_price_minor is null or current_price_minor >= 0)
    and (previous_price_minor is null or previous_price_minor >= 0)
  ),
  constraint catalog_offers_currency_required_with_price check (
    (current_price_minor is null and previous_price_minor is null)
    or currency_code ~ '^[A-Z]{3}$'
  ),
  constraint catalog_offers_purchase_limit_positive check (purchase_limit is null or purchase_limit > 0),
  constraint catalog_offers_sku_length check (sku is null or char_length(sku) <= 120)
);

create unique index catalog_offers_sku_unique
on public.catalog_offers (sku)
where sku is not null;

create unique index catalog_offers_one_visible_active_standard_new_offer
on public.catalog_offers (watch_reference_id)
where status = 'active' and offer_kind = 'standard' and condition = 'new' and is_visible = true;

create index catalog_offers_reference_status_idx
on public.catalog_offers (watch_reference_id, status);

create index catalog_offers_status_price_idx
on public.catalog_offers (status, current_price_minor)
where is_visible = true and current_price_minor is not null;

create index catalog_offers_inventory_state_idx
on public.catalog_offers (inventory_state_id)
where is_visible = true;

create trigger catalog_offers_set_updated_at
before update on public.catalog_offers
for each row execute function public.set_updated_at();

create table public.offer_price_history (
  id uuid primary key default extensions.gen_random_uuid(),
  catalog_offer_id uuid not null references public.catalog_offers(id) on delete cascade,
  price_minor bigint not null,
  currency_code char(3) not null,
  valid_from timestamptz not null default now(),
  valid_to timestamptz,
  reason text,
  changed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint offer_price_history_price_non_negative check (price_minor >= 0),
  constraint offer_price_history_currency_format check (currency_code ~ '^[A-Z]{3}$'),
  constraint offer_price_history_valid_range check (valid_to is null or valid_to > valid_from)
);

create unique index offer_price_history_one_current_price
on public.offer_price_history (catalog_offer_id)
where valid_to is null;

create index offer_price_history_offer_valid_from_idx
on public.offer_price_history (catalog_offer_id, valid_from desc);

create table public.inventory_events (
  id uuid primary key default extensions.gen_random_uuid(),
  catalog_offer_id uuid not null references public.catalog_offers(id) on delete cascade,
  inventory_state_id uuid not null references public.inventory_states(id) on delete restrict,
  quantity_available integer,
  source text not null default 'admin',
  changed_at timestamptz not null default now(),
  changed_by uuid references auth.users(id) on delete set null,
  constraint inventory_events_quantity_non_negative check (quantity_available is null or quantity_available >= 0),
  constraint inventory_events_source_length check (char_length(source) <= 80)
);

create index inventory_events_offer_changed_idx
on public.inventory_events (catalog_offer_id, changed_at desc);

create table public.watch_images (
  id uuid primary key default extensions.gen_random_uuid(),
  watch_reference_id uuid not null references public.watch_references(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watch_images_storage_bucket_present check (public.normalize_catalog_text(storage_bucket) is not null),
  constraint watch_images_storage_path_present check (public.normalize_catalog_text(storage_path) is not null),
  constraint watch_images_sort_order_non_negative check (sort_order >= 0),
  constraint watch_images_status_check check (status in ('draft', 'published', 'hidden', 'archived')),
  unique (storage_bucket, storage_path)
);

create unique index watch_images_one_published_primary_per_reference
on public.watch_images (watch_reference_id)
where is_primary = true and status = 'published';

create index watch_images_reference_sort_idx
on public.watch_images (watch_reference_id, status, sort_order);

create trigger watch_images_set_updated_at
before update on public.watch_images
for each row execute function public.set_updated_at();

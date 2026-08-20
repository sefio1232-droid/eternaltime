do $$
begin
  create type public.order_shipment_status as enum (
    'pending_creation',
    'creation_in_progress',
    'creation_pending_retry',
    'creation_failed',
    'created',
    'handed_over',
    'in_transit',
    'arrived_at_pickup_point',
    'ready_for_pickup',
    'delivered',
    'returning',
    'returned',
    'problem'
  );
exception when duplicate_object then null;
end $$;

alter table public.orders
  alter column delivery_postal_code drop not null,
  alter column delivery_street drop not null,
  alter column delivery_house drop not null,
  add column if not exists cdek_pickup_point_name text,
  add column if not exists cdek_pickup_point_city text,
  add column if not exists cdek_pickup_point_postal_code text,
  add column if not exists cdek_pickup_point_latitude numeric,
  add column if not exists cdek_pickup_point_longitude numeric,
  add column if not exists cdek_destination_city_code integer;

create table if not exists public.order_shipments (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'cdek',
  delivery_method text not null,
  customer_delivery_charge_minor bigint not null,
  carrier_actual_cost_minor bigint,
  carrier_currency text not null default 'RUB',
  carrier_name text not null default 'CDEK',
  pickup_point_code text,
  pickup_point_name text,
  pickup_point_address text,
  pickup_point_city text,
  pickup_point_postal_code text,
  pickup_point_latitude numeric,
  pickup_point_longitude numeric,
  delivery_address jsonb not null default '{}'::jsonb,
  recipient_name text not null,
  recipient_phone text not null,
  cdek_order_uuid text,
  cdek_order_number text,
  tracking_number text,
  shipment_status public.order_shipment_status not null default 'pending_creation',
  carrier_status_code text,
  carrier_status_name text,
  carrier_status_updated_at timestamptz,
  last_sync_at timestamptz,
  create_attempts integer not null default 0,
  last_error_code text,
  last_error_at timestamptz,
  safe_admin_note text,
  raw_carrier_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_shipments_one_per_order unique (order_id),
  constraint order_shipments_provider_known check (provider = 'cdek'),
  constraint order_shipments_method_known check (delivery_method in ('cdek_pickup', 'cdek_courier')),
  constraint order_shipments_charge_non_negative check (
    customer_delivery_charge_minor >= 0 and
    (carrier_actual_cost_minor is null or carrier_actual_cost_minor >= 0)
  ),
  constraint order_shipments_currency_rub check (carrier_currency = 'RUB'),
  constraint order_shipments_recipient_lengths check (
    char_length(recipient_name) between 2 and 160 and
    char_length(recipient_phone) between 5 and 32
  ),
  constraint order_shipments_pickup_snapshot_required check (
    delivery_method <> 'cdek_pickup' or
    (pickup_point_code is not null and pickup_point_address is not null)
  )
);

create index if not exists order_shipments_order_idx on public.order_shipments (order_id);
create index if not exists order_shipments_status_idx on public.order_shipments (shipment_status, updated_at desc);
create index if not exists order_shipments_cdek_uuid_idx on public.order_shipments (cdek_order_uuid) where cdek_order_uuid is not null;
create index if not exists order_shipments_tracking_idx on public.order_shipments (tracking_number) where tracking_number is not null;

create trigger order_shipments_set_updated_at
before update on public.order_shipments
for each row execute function public.set_updated_at();

alter table public.order_shipments enable row level security;

drop policy if exists "Customers read own order shipments" on public.order_shipments;
create policy "Customers read own order shipments"
on public.order_shipments
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_shipments.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Order managers manage order shipments" on public.order_shipments;
create policy "Order managers manage order shipments"
on public.order_shipments
for all
to authenticated
using (public.current_user_has_any_role(array['admin', 'order_manager']))
with check (public.current_user_has_any_role(array['admin', 'order_manager']));

alter table public.profiles
  add column if not exists phone text,
  add column if not exists city text,
  add column if not exists preferred_contact text;

alter table public.profiles
  drop constraint if exists profiles_phone_length,
  add constraint profiles_phone_length check (phone is null or char_length(phone) <= 32);

alter table public.profiles
  drop constraint if exists profiles_city_length,
  add constraint profiles_city_length check (city is null or char_length(city) <= 120);

alter table public.profiles
  drop constraint if exists profiles_preferred_contact_known,
  add constraint profiles_preferred_contact_known check (
    preferred_contact is null or preferred_contact in ('email', 'phone')
  );

do $$
begin
  create type public.checkout_source as enum ('buy_now', 'cart');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_status as enum (
    'awaiting_payment',
    'paid',
    'processing',
    'supplier_ordered',
    'in_transit',
    'local_delivery',
    'completed',
    'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_payment_status as enum (
    'not_started',
    'pending',
    'succeeded',
    'partially_refunded',
    'refunded'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_attempt_status as enum (
    'created',
    'pending',
    'waiting_for_capture',
    'succeeded',
    'canceled',
    'failed'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_refund_status as enum ('pending', 'succeeded', 'canceled', 'failed');
exception when duplicate_object then null;
end $$;

create sequence if not exists public.order_public_number_seq as bigint start with 1 increment by 1;

create or replace function public.generate_order_number()
returns text
language sql
volatile
set search_path = public
as $$
  select 'ET-' || to_char(now() at time zone 'UTC', 'YYYYMMDD') || '-' || lpad(nextval('public.order_public_number_seq')::text, 6, '0');
$$;

create table if not exists public.commerce_carts (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_carts_status_known check (status in ('active', 'converted', 'abandoned'))
);

create unique index if not exists commerce_carts_one_active_per_user
on public.commerce_carts (user_id)
where status = 'active';

create table if not exists public.commerce_cart_items (
  id uuid primary key default extensions.gen_random_uuid(),
  cart_id uuid not null references public.commerce_carts(id) on delete cascade,
  brand_slug text not null,
  reference_code_normalized text not null,
  quantity integer not null,
  source text not null default 'catalog',
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commerce_cart_items_quantity_range check (quantity between 1 and 5),
  constraint commerce_cart_items_source_known check (source in ('catalog', 'selection', 'journal', 'buy_now')),
  constraint commerce_cart_items_brand_slug_format check (brand_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint commerce_cart_items_reference_not_empty check (char_length(reference_code_normalized) > 0)
);

create unique index if not exists commerce_cart_items_identity_idx
on public.commerce_cart_items (cart_id, brand_slug, reference_code_normalized);

create table if not exists public.orders (
  id uuid primary key default extensions.gen_random_uuid(),
  order_number text not null unique default public.generate_order_number(),
  user_id uuid not null references auth.users(id) on delete restrict,
  source public.checkout_source not null,
  status public.order_status not null default 'awaiting_payment',
  payment_status public.order_payment_status not null default 'pending',
  currency text not null default 'RUB',
  product_subtotal_minor bigint not null,
  delivery_amount_minor bigint not null,
  delivery_provider text not null default 'cdek',
  delivery_method text not null default 'cdek_courier',
  delivery_tariff_code text,
  delivery_quote_snapshot jsonb not null default '{}'::jsonb,
  total_amount_minor bigint not null,
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null,
  delivery_postal_code text not null,
  delivery_city text not null,
  delivery_street text not null,
  delivery_house text not null,
  delivery_unit text,
  cdek_pickup_point_code text,
  cdek_pickup_point_address text,
  delivery_comment text,
  customer_comment text,
  checkout_submission_key uuid not null,
  legal_consent_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  constraint orders_currency_rub check (currency = 'RUB'),
  constraint orders_delivery_provider_known check (delivery_provider in ('included', 'flat', 'cdek')),
  constraint orders_delivery_method_known check (delivery_method in ('included', 'courier', 'pickup', 'cdek_courier', 'cdek_pickup')),
  constraint orders_amounts_non_negative check (
    product_subtotal_minor >= 0 and delivery_amount_minor >= 0 and total_amount_minor > 0
  ),
  constraint orders_total_matches_parts check (total_amount_minor = product_subtotal_minor + delivery_amount_minor),
  constraint orders_contact_lengths check (
    char_length(contact_name) between 2 and 160 and
    char_length(contact_email) between 3 and 254 and
    char_length(contact_phone) between 5 and 32
  )
);

create unique index if not exists orders_user_checkout_submission_key_idx
on public.orders (user_id, checkout_submission_key);

create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders (status, created_at desc);
create index if not exists orders_payment_status_created_idx on public.orders (payment_status, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  brand_slug text not null,
  reference_code_normalized text not null,
  brand_name_snapshot text not null,
  display_name_snapshot text not null,
  reference_display_snapshot text not null,
  canonical_href_snapshot text not null,
  image_snapshot jsonb,
  quantity integer not null,
  unit_price_minor bigint not null,
  line_total_minor bigint not null,
  created_at timestamptz not null default now(),
  constraint order_items_quantity_range check (quantity between 1 and 5),
  constraint order_items_amounts_non_negative check (unit_price_minor > 0 and line_total_minor = unit_price_minor * quantity)
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_reference_idx on public.order_items (brand_slug, reference_code_normalized);

create table if not exists public.payment_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'yookassa',
  provider_payment_id text unique,
  status public.payment_attempt_status not null default 'created',
  amount_minor bigint not null,
  currency text not null default 'RUB',
  confirmation_url text,
  idempotency_key text not null unique,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  succeeded_at timestamptz,
  canceled_at timestamptz,
  constraint payment_attempts_provider_known check (provider = 'yookassa'),
  constraint payment_attempts_currency_rub check (currency = 'RUB'),
  constraint payment_attempts_amount_positive check (amount_minor > 0),
  constraint payment_attempts_idempotency_length check (char_length(idempotency_key) between 8 and 64)
);

create index if not exists payment_attempts_order_created_idx on public.payment_attempts (order_id, created_at desc);

create table if not exists public.payment_events (
  id uuid primary key default extensions.gen_random_uuid(),
  provider text not null default 'yookassa',
  provider_object_id text not null,
  event_type text not null,
  provider_status text,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_result text not null default 'received',
  order_id uuid references public.orders(id) on delete set null,
  payment_attempt_id uuid references public.payment_attempts(id) on delete set null,
  refund_id uuid,
  constraint payment_events_provider_known check (provider = 'yookassa')
);

create unique index if not exists payment_events_unique_final_event_idx
on public.payment_events (provider, provider_object_id, event_type);

create index if not exists payment_events_order_idx on public.payment_events (order_id, received_at desc);

create table if not exists public.payment_refunds (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_attempt_id uuid not null references public.payment_attempts(id) on delete restrict,
  provider_refund_id text unique,
  amount_minor bigint not null,
  currency text not null default 'RUB',
  status public.payment_refund_status not null default 'pending',
  reason text,
  requested_by uuid references auth.users(id) on delete set null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  succeeded_at timestamptz,
  failed_at timestamptz,
  constraint payment_refunds_currency_rub check (currency = 'RUB'),
  constraint payment_refunds_amount_positive check (amount_minor > 0),
  constraint payment_refunds_reason_length check (reason is null or char_length(reason) <= 500)
);

alter table public.payment_events
  drop constraint if exists payment_events_refund_id_fkey,
  add constraint payment_events_refund_id_fkey foreign key (refund_id)
  references public.payment_refunds(id) on delete set null;

create index if not exists payment_refunds_order_created_idx on public.payment_refunds (order_id, created_at desc);

create table if not exists public.order_events (
  id uuid primary key default extensions.gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event_type text not null,
  previous_status text,
  next_status text,
  previous_payment_status text,
  next_payment_status text,
  message text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  customer_visible boolean not null default true,
  created_at timestamptz not null default now(),
  constraint order_events_message_length check (char_length(message) between 1 and 1000)
);

create unique index if not exists order_events_unique_type_status_idx
on public.order_events (order_id, event_type, coalesce(next_status, ''), coalesce(next_payment_status, ''));

create index if not exists order_events_order_created_idx on public.order_events (order_id, created_at asc);

create trigger commerce_carts_set_updated_at
before update on public.commerce_carts
for each row execute function public.set_updated_at();

create trigger commerce_cart_items_set_updated_at
before update on public.commerce_cart_items
for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

create trigger payment_attempts_set_updated_at
before update on public.payment_attempts
for each row execute function public.set_updated_at();

create trigger payment_refunds_set_updated_at
before update on public.payment_refunds
for each row execute function public.set_updated_at();

alter table public.commerce_carts enable row level security;
alter table public.commerce_cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_events enable row level security;
alter table public.payment_refunds enable row level security;
alter table public.order_events enable row level security;

drop policy if exists "Customers manage their own carts" on public.commerce_carts;
create policy "Customers manage their own carts"
on public.commerce_carts
for all
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Customers manage items in their own carts" on public.commerce_cart_items;
create policy "Customers manage items in their own carts"
on public.commerce_cart_items
for all
to authenticated
using (
  exists (
    select 1 from public.commerce_carts cart
    where cart.id = commerce_cart_items.cart_id
      and cart.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.commerce_carts cart
    where cart.id = commerce_cart_items.cart_id
      and cart.user_id = auth.uid()
  )
);

drop policy if exists "Customers read own orders" on public.orders;
create policy "Customers read own orders"
on public.orders
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Customers create own orders" on public.orders;
create policy "Customers create own orders"
on public.orders
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Order managers manage orders" on public.orders;
create policy "Order managers manage orders"
on public.orders
for all
to authenticated
using (public.current_user_has_any_role(array['admin', 'order_manager']))
with check (public.current_user_has_any_role(array['admin', 'order_manager']));

drop policy if exists "Customers read own order items" on public.order_items;
create policy "Customers read own order items"
on public.order_items
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Order managers manage order items" on public.order_items;
create policy "Order managers manage order items"
on public.order_items
for all
to authenticated
using (public.current_user_has_any_role(array['admin', 'order_manager']))
with check (public.current_user_has_any_role(array['admin', 'order_manager']));

drop policy if exists "Customers read own payment attempts" on public.payment_attempts;
create policy "Customers read own payment attempts"
on public.payment_attempts
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = payment_attempts.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Order managers read payment attempts" on public.payment_attempts;
create policy "Order managers read payment attempts"
on public.payment_attempts
for select
to authenticated
using (public.current_user_has_any_role(array['admin', 'order_manager']));

drop policy if exists "Order managers read payment events" on public.payment_events;
create policy "Order managers read payment events"
on public.payment_events
for select
to authenticated
using (public.current_user_has_any_role(array['admin', 'order_manager']));

drop policy if exists "Customers read own refunds" on public.payment_refunds;
create policy "Customers read own refunds"
on public.payment_refunds
for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = payment_refunds.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Order managers manage refunds" on public.payment_refunds;
create policy "Order managers manage refunds"
on public.payment_refunds
for all
to authenticated
using (public.current_user_has_any_role(array['admin', 'order_manager']))
with check (public.current_user_has_any_role(array['admin', 'order_manager']));

drop policy if exists "Customers read visible own order events" on public.order_events;
create policy "Customers read visible own order events"
on public.order_events
for select
to authenticated
using (
  customer_visible and exists (
    select 1 from public.orders o
    where o.id = order_events.order_id
      and o.user_id = auth.uid()
  )
);

drop policy if exists "Order managers manage order events" on public.order_events;
create policy "Order managers manage order events"
on public.order_events
for all
to authenticated
using (public.current_user_has_any_role(array['admin', 'order_manager']))
with check (public.current_user_has_any_role(array['admin', 'order_manager']));

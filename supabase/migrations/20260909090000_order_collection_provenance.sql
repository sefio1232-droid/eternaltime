alter table public.user_watches
  add column if not exists source_order_id uuid references public.orders(id) on delete set null,
  add column if not exists source_order_item_id uuid references public.order_items(id) on delete set null;

create unique index if not exists user_watches_source_order_item_unique
on public.user_watches (source_order_item_id)
where source_order_item_id is not null and deleted_at is null;

create index if not exists user_watches_source_order_idx
on public.user_watches (source_order_id)
where source_order_id is not null and deleted_at is null;

alter table public.orders
  alter column user_id drop not null;

drop index if exists public.orders_user_checkout_submission_key_idx;

create unique index if not exists orders_user_checkout_submission_key_idx
on public.orders (user_id, checkout_submission_key)
where user_id is not null;

create unique index if not exists orders_guest_checkout_submission_key_idx
on public.orders (checkout_submission_key)
where user_id is null;

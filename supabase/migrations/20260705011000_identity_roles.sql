create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_path text,
  locale text not null default 'ru-RU',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_length check (display_name is null or char_length(display_name) <= 120),
  constraint profiles_avatar_path_length check (avatar_path is null or char_length(avatar_path) <= 512),
  constraint profiles_locale_format check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$')
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create table public.roles (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  description text not null,
  created_at timestamptz not null default now(),
  constraint roles_code_known check (code in (
    'customer',
    'admin',
    'catalog_manager',
    'content_manager',
    'order_manager'
  )),
  constraint roles_code_format check (code ~ '^[a-z][a-z0-9_]*$')
);

insert into public.roles (code, description)
values
  ('customer', 'Normal authenticated customer role.'),
  ('admin', 'Broad application administration role.'),
  ('catalog_manager', 'Catalog and import operations role.'),
  ('content_manager', 'Content and SEO operations role.'),
  ('order_manager', 'Order operations role.')
on conflict (code) do nothing;

create table public.user_roles (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete restrict,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoke_reason text,
  constraint user_roles_revoked_after_granted check (revoked_at is null or revoked_at > granted_at),
  constraint user_roles_revoke_reason_length check (revoke_reason is null or char_length(revoke_reason) <= 500)
);

create unique index user_roles_one_active_role_per_user
on public.user_roles (user_id, role_id)
where revoked_at is null;

create index user_roles_user_active_idx
on public.user_roles (user_id, revoked_at);

create index user_roles_role_active_idx
on public.user_roles (role_id, revoked_at);

create or replace function public.current_user_has_role(required_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.revoked_at is null
      and r.code = required_role
  );
$$;

create or replace function public.current_user_has_any_role(required_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid()
      and ur.revoked_at is null
      and r.code = any(required_roles)
  );
$$;

revoke all on function public.current_user_has_role(text) from public;
revoke all on function public.current_user_has_any_role(text[]) from public;
grant execute on function public.current_user_has_role(text) to anon, authenticated, service_role;
grant execute on function public.current_user_has_any_role(text[]) to anon, authenticated, service_role;

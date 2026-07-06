create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.normalize_catalog_text(input text)
returns text
language sql
immutable
parallel safe
as $$
  select nullif(lower(regexp_replace(btrim(coalesce(input, '')), '\s+', ' ', 'g')), '');
$$;

create or replace function public.normalize_reference_code(input text)
returns text
language sql
immutable
parallel safe
as $$
  select nullif(upper(regexp_replace(coalesce(input, ''), '[^[:alnum:]]+', '', 'g')), '');
$$;

create or replace function public.is_catalog_slug(input text)
returns boolean
language sql
immutable
parallel safe
as $$
  select coalesce(input ~ '^[a-z0-9]+(-[a-z0-9]+)*$', false);
$$;

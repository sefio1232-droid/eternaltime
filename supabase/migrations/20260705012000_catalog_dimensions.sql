create table public.movement_types (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  label text not null,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movement_types_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint movement_types_status_check check (status in ('active', 'inactive')),
  constraint movement_types_sort_order_non_negative check (sort_order >= 0)
);

create trigger movement_types_set_updated_at
before update on public.movement_types
for each row execute function public.set_updated_at();

create table public.movements (
  id uuid primary key default extensions.gen_random_uuid(),
  movement_type_id uuid references public.movement_types(id) on delete set null,
  manufacturer text,
  caliber_code text,
  display_name text not null,
  power_reserve_hours integer,
  frequency_vph integer,
  jewels integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint movements_power_reserve_positive check (power_reserve_hours is null or power_reserve_hours > 0),
  constraint movements_frequency_positive check (frequency_vph is null or frequency_vph > 0),
  constraint movements_jewels_non_negative check (jewels is null or jewels >= 0),
  constraint movements_identity_present check (public.normalize_catalog_text(display_name) is not null)
);

create unique index movements_caliber_unique
on public.movements (
  public.normalize_catalog_text(coalesce(manufacturer, '')),
  public.normalize_catalog_text(coalesce(caliber_code, display_name))
);

create trigger movements_set_updated_at
before update on public.movements
for each row execute function public.set_updated_at();

create table public.materials (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  label text not null,
  material_family text,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint materials_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint materials_status_check check (status in ('active', 'inactive')),
  constraint materials_sort_order_non_negative check (sort_order >= 0)
);

create trigger materials_set_updated_at
before update on public.materials
for each row execute function public.set_updated_at();

create table public.colors (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  label text not null,
  color_family text not null,
  hex_value text,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint colors_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint colors_hex_value_format check (hex_value is null or hex_value ~ '^#[0-9A-Fa-f]{6}$'),
  constraint colors_status_check check (status in ('active', 'inactive')),
  constraint colors_sort_order_non_negative check (sort_order >= 0)
);

create trigger colors_set_updated_at
before update on public.colors
for each row execute function public.set_updated_at();

create table public.crystal_types (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  label text not null,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crystal_types_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint crystal_types_status_check check (status in ('active', 'inactive')),
  constraint crystal_types_sort_order_non_negative check (sort_order >= 0)
);

create trigger crystal_types_set_updated_at
before update on public.crystal_types
for each row execute function public.set_updated_at();

create table public.case_shapes (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  label text not null,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint case_shapes_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint case_shapes_status_check check (status in ('active', 'inactive')),
  constraint case_shapes_sort_order_non_negative check (sort_order >= 0)
);

create trigger case_shapes_set_updated_at
before update on public.case_shapes
for each row execute function public.set_updated_at();

create table public.clasp_types (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  label text not null,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clasp_types_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint clasp_types_status_check check (status in ('active', 'inactive')),
  constraint clasp_types_sort_order_non_negative check (sort_order >= 0)
);

create trigger clasp_types_set_updated_at
before update on public.clasp_types
for each row execute function public.set_updated_at();

create table public.styles (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  label text not null,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint styles_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint styles_status_check check (status in ('active', 'inactive')),
  constraint styles_sort_order_non_negative check (sort_order >= 0)
);

create trigger styles_set_updated_at
before update on public.styles
for each row execute function public.set_updated_at();

create table public.use_cases (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  label text not null,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint use_cases_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint use_cases_status_check check (status in ('active', 'inactive')),
  constraint use_cases_sort_order_non_negative check (sort_order >= 0)
);

create trigger use_cases_set_updated_at
before update on public.use_cases
for each row execute function public.set_updated_at();

create table public.watch_functions (
  id uuid primary key default extensions.gen_random_uuid(),
  code text not null unique,
  label text not null,
  status text not null default 'active',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watch_functions_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint watch_functions_status_check check (status in ('active', 'inactive')),
  constraint watch_functions_sort_order_non_negative check (sort_order >= 0)
);

create trigger watch_functions_set_updated_at
before update on public.watch_functions
for each row execute function public.set_updated_at();

create table public.attribute_definitions (
  id uuid primary key default extensions.gen_random_uuid(),
  key text not null unique,
  label text not null,
  scope text not null default 'watch_reference',
  value_type text not null,
  unit text,
  validation_note text,
  is_filterable boolean not null default false,
  is_seo_visible boolean not null default false,
  admin_group text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attribute_definitions_key_format check (key ~ '^[a-z][a-z0-9_]*$'),
  constraint attribute_definitions_scope_check check (scope in ('watch_reference')),
  constraint attribute_definitions_value_type_check check (value_type in ('text', 'number', 'boolean', 'option')),
  constraint attribute_definitions_status_check check (status in ('draft', 'active', 'inactive', 'archived')),
  constraint attribute_definitions_label_present check (public.normalize_catalog_text(label) is not null)
);

create trigger attribute_definitions_set_updated_at
before update on public.attribute_definitions
for each row execute function public.set_updated_at();

create table public.attribute_options (
  id uuid primary key default extensions.gen_random_uuid(),
  attribute_definition_id uuid not null references public.attribute_definitions(id) on delete cascade,
  code text not null,
  label text not null,
  sort_order integer not null default 0,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attribute_options_code_format check (code ~ '^[a-z][a-z0-9_]*$'),
  constraint attribute_options_status_check check (status in ('active', 'inactive')),
  constraint attribute_options_sort_order_non_negative check (sort_order >= 0),
  constraint attribute_options_label_present check (public.normalize_catalog_text(label) is not null),
  unique (attribute_definition_id, code)
);

create trigger attribute_options_set_updated_at
before update on public.attribute_options
for each row execute function public.set_updated_at();

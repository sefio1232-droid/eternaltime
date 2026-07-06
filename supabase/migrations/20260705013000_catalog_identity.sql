create table public.brands (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  name_normalized text generated always as (public.normalize_catalog_text(name)) stored,
  slug text not null,
  country_code char(2),
  description text,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brands_name_present check (name_normalized is not null),
  constraint brands_slug_format check (public.is_catalog_slug(slug)),
  constraint brands_country_code_format check (country_code is null or country_code ~ '^[A-Z]{2}$'),
  constraint brands_status_check check (status in ('draft', 'published', 'archival', 'hidden')),
  unique (slug),
  unique (name_normalized)
);

create trigger brands_set_updated_at
before update on public.brands
for each row execute function public.set_updated_at();

create table public.brand_collections (
  id uuid primary key default extensions.gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  name text not null,
  name_normalized text generated always as (public.normalize_catalog_text(name)) stored,
  slug text not null,
  description text,
  status text not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_collections_name_present check (name_normalized is not null),
  constraint brand_collections_slug_format check (public.is_catalog_slug(slug)),
  constraint brand_collections_status_check check (status in ('draft', 'published', 'archival', 'hidden')),
  constraint brand_collections_sort_order_non_negative check (sort_order >= 0),
  unique (id, brand_id),
  unique (brand_id, slug),
  unique (brand_id, name_normalized)
);

create index brand_collections_brand_status_sort_idx
on public.brand_collections (brand_id, status, sort_order);

create trigger brand_collections_set_updated_at
before update on public.brand_collections
for each row execute function public.set_updated_at();

create table public.brand_lines (
  id uuid primary key default extensions.gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  brand_collection_id uuid not null,
  name text not null,
  name_normalized text generated always as (public.normalize_catalog_text(name)) stored,
  slug text not null,
  description text,
  status text not null default 'draft',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brand_lines_collection_brand_fk foreign key (brand_collection_id, brand_id)
    references public.brand_collections(id, brand_id) on delete restrict,
  constraint brand_lines_name_present check (name_normalized is not null),
  constraint brand_lines_slug_format check (public.is_catalog_slug(slug)),
  constraint brand_lines_status_check check (status in ('draft', 'published', 'archival', 'hidden')),
  constraint brand_lines_sort_order_non_negative check (sort_order >= 0),
  unique (id, brand_id, brand_collection_id),
  unique (brand_id, slug),
  unique (brand_collection_id, name_normalized)
);

create index brand_lines_collection_status_sort_idx
on public.brand_lines (brand_collection_id, status, sort_order);

create trigger brand_lines_set_updated_at
before update on public.brand_lines
for each row execute function public.set_updated_at();

create table public.watch_models (
  id uuid primary key default extensions.gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  brand_collection_id uuid,
  brand_line_id uuid,
  name text not null,
  name_normalized text generated always as (public.normalize_catalog_text(name)) stored,
  slug text not null,
  model_code text,
  description text,
  model_status text not null default 'draft',
  positioning text,
  release_year integer,
  discontinued_year integer,
  has_public_model_page boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watch_models_collection_brand_fk foreign key (brand_collection_id, brand_id)
    references public.brand_collections(id, brand_id) on delete restrict,
  constraint watch_models_line_hierarchy_present check (brand_line_id is null or brand_collection_id is not null),
  constraint watch_models_line_hierarchy_fk foreign key (brand_line_id, brand_id, brand_collection_id)
    references public.brand_lines(id, brand_id, brand_collection_id) on delete restrict,
  constraint watch_models_name_present check (name_normalized is not null),
  constraint watch_models_slug_format check (public.is_catalog_slug(slug)),
  constraint watch_models_status_check check (model_status in ('draft', 'active', 'discontinued', 'archival', 'hidden')),
  constraint watch_models_release_year_range check (release_year is null or release_year between 1800 and 2200),
  constraint watch_models_discontinued_year_range check (discontinued_year is null or discontinued_year between 1800 and 2200),
  constraint watch_models_year_order check (
    release_year is null or discontinued_year is null or discontinued_year >= release_year
  ),
  unique (id, brand_id),
  unique (brand_id, slug),
  unique (brand_id, name_normalized)
);

create unique index watch_models_brand_model_code_unique
on public.watch_models (brand_id, public.normalize_catalog_text(model_code))
where model_code is not null;

create index watch_models_brand_status_idx
on public.watch_models (brand_id, model_status);

create index watch_models_collection_status_idx
on public.watch_models (brand_collection_id, model_status);

create trigger watch_models_set_updated_at
before update on public.watch_models
for each row execute function public.set_updated_at();

create table public.watch_references (
  id uuid primary key default extensions.gen_random_uuid(),
  brand_id uuid not null references public.brands(id) on delete restrict,
  watch_model_id uuid not null,
  reference_code_display text not null,
  reference_code_normalized text generated always as (public.normalize_reference_code(reference_code_display)) stored,
  slug text not null,
  display_name text not null,
  status text not null default 'draft',
  reference_status text not null default 'unknown',
  short_description text,
  description text,
  movement_description text,
  fit_description text,
  water_resistance_description text,
  set_contents_description text,
  authenticity_description text,
  movement_type_id uuid references public.movement_types(id) on delete set null,
  movement_id uuid references public.movements(id) on delete set null,
  case_material_id uuid references public.materials(id) on delete set null,
  case_coating_material_id uuid references public.materials(id) on delete set null,
  case_shape_id uuid references public.case_shapes(id) on delete set null,
  case_color_id uuid references public.colors(id) on delete set null,
  dial_color_id uuid references public.colors(id) on delete set null,
  crystal_type_id uuid references public.crystal_types(id) on delete set null,
  strap_material_id uuid references public.materials(id) on delete set null,
  bracelet_material_id uuid references public.materials(id) on delete set null,
  clasp_type_id uuid references public.clasp_types(id) on delete set null,
  case_diameter_mm numeric(5,2),
  case_width_mm numeric(5,2),
  lug_to_lug_mm numeric(5,2),
  case_thickness_mm numeric(5,2),
  lug_width_mm numeric(5,2),
  weight_g numeric(6,2),
  water_resistance_m integer,
  has_date boolean not null default false,
  has_day_date boolean not null default false,
  has_gmt boolean not null default false,
  has_chronograph boolean not null default false,
  has_tachymeter boolean not null default false,
  has_world_time boolean not null default false,
  has_alarm boolean not null default false,
  has_stopwatch boolean not null default false,
  has_timer boolean not null default false,
  has_moon_phase boolean not null default false,
  has_rotating_bezel boolean not null default false,
  brand_country_code char(2),
  production_country_code char(2),
  data_confidence text not null default 'unknown',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watch_references_model_brand_fk foreign key (watch_model_id, brand_id)
    references public.watch_models(id, brand_id) on delete restrict,
  constraint watch_references_reference_present check (reference_code_normalized is not null),
  constraint watch_references_slug_format check (public.is_catalog_slug(slug)),
  constraint watch_references_display_name_present check (public.normalize_catalog_text(display_name) is not null),
  constraint watch_references_status_check check (status in ('draft', 'published', 'archival', 'hidden')),
  constraint watch_references_reference_status_check check (
    reference_status in ('current', 'discontinued', 'catalog_only', 'unknown')
  ),
  constraint watch_references_country_code_format check (
    (brand_country_code is null or brand_country_code ~ '^[A-Z]{2}$')
    and (production_country_code is null or production_country_code ~ '^[A-Z]{2}$')
  ),
  constraint watch_references_data_confidence_check check (
    data_confidence in ('verified', 'imported', 'partial', 'unknown')
  ),
  constraint watch_references_positive_dimensions check (
    (case_diameter_mm is null or case_diameter_mm > 0)
    and (case_width_mm is null or case_width_mm > 0)
    and (lug_to_lug_mm is null or lug_to_lug_mm > 0)
    and (case_thickness_mm is null or case_thickness_mm > 0)
    and (lug_width_mm is null or lug_width_mm > 0)
    and (weight_g is null or weight_g > 0)
    and (water_resistance_m is null or water_resistance_m >= 0)
  ),
  unique (brand_id, reference_code_normalized),
  unique (brand_id, slug)
);

create index watch_references_model_status_idx
on public.watch_references (watch_model_id, status);

create index watch_references_movement_type_idx
on public.watch_references (movement_type_id)
where status in ('published', 'archival');

create index watch_references_case_material_idx
on public.watch_references (case_material_id)
where status in ('published', 'archival');

create index watch_references_dial_color_idx
on public.watch_references (dial_color_id)
where status in ('published', 'archival');

create index watch_references_diameter_idx
on public.watch_references (case_diameter_mm)
where status in ('published', 'archival') and case_diameter_mm is not null;

create index watch_references_thickness_idx
on public.watch_references (case_thickness_mm)
where status in ('published', 'archival') and case_thickness_mm is not null;

create index watch_references_water_resistance_idx
on public.watch_references (water_resistance_m)
where status in ('published', 'archival') and water_resistance_m is not null;

create trigger watch_references_set_updated_at
before update on public.watch_references
for each row execute function public.set_updated_at();

create table public.watch_reference_styles (
  watch_reference_id uuid not null references public.watch_references(id) on delete cascade,
  style_id uuid not null references public.styles(id) on delete restrict,
  score numeric(4,3) not null default 1,
  created_at timestamptz not null default now(),
  primary key (watch_reference_id, style_id),
  constraint watch_reference_styles_score_range check (score >= 0 and score <= 1)
);

create index watch_reference_styles_style_score_idx
on public.watch_reference_styles (style_id, score desc);

create table public.watch_reference_use_cases (
  watch_reference_id uuid not null references public.watch_references(id) on delete cascade,
  use_case_id uuid not null references public.use_cases(id) on delete restrict,
  score numeric(4,3) not null default 1,
  created_at timestamptz not null default now(),
  primary key (watch_reference_id, use_case_id),
  constraint watch_reference_use_cases_score_range check (score >= 0 and score <= 1)
);

create index watch_reference_use_cases_use_case_score_idx
on public.watch_reference_use_cases (use_case_id, score desc);

create table public.watch_reference_functions (
  watch_reference_id uuid not null references public.watch_references(id) on delete cascade,
  function_id uuid not null references public.watch_functions(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (watch_reference_id, function_id)
);

create index watch_reference_functions_function_idx
on public.watch_reference_functions (function_id);

create table public.watch_reference_attribute_values (
  id uuid primary key default extensions.gen_random_uuid(),
  watch_reference_id uuid not null references public.watch_references(id) on delete cascade,
  attribute_definition_id uuid not null references public.attribute_definitions(id) on delete restrict,
  attribute_option_id uuid references public.attribute_options(id) on delete restrict,
  value_text text,
  value_numeric numeric,
  value_boolean boolean,
  source text not null default 'admin',
  confidence numeric(4,3) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint watch_reference_attribute_values_one_value check (
    num_nonnulls(attribute_option_id, value_text, value_numeric, value_boolean) = 1
  ),
  constraint watch_reference_attribute_values_confidence_range check (confidence >= 0 and confidence <= 1),
  unique (watch_reference_id, attribute_definition_id)
);

create trigger watch_reference_attribute_values_set_updated_at
before update on public.watch_reference_attribute_values
for each row execute function public.set_updated_at();

create table public.catalog_search_documents (
  watch_reference_id uuid primary key references public.watch_references(id) on delete cascade,
  search_text text not null,
  search_vector tsvector generated always as (to_tsvector('simple', search_text)) stored,
  updated_at timestamptz not null default now()
);

create index catalog_search_documents_vector_idx
on public.catalog_search_documents using gin (search_vector);

create index catalog_search_documents_trgm_idx
on public.catalog_search_documents using gin (search_text extensions.gin_trgm_ops);

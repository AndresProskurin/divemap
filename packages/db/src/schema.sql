-- ────────────────────────────────────────────────────────────────────────────
-- DiveMap — full database schema.
--
-- GENERATED FILE — DO NOT EDIT BY HAND.
-- Source of truth: supabase/migrations/
-- Regenerate:     pnpm db:schema
--
-- Concatenation of every migration in apply order:
--   20260716000000_initial_schema.sql
--   20260717000001_dive_reviews.sql
--   20260721000000_storage_site_photos.sql
--   20260722000000_dive_plans_usernames.sql
--   20260723000000_user_gear.sql
--   20260724000000_social.sql
-- ────────────────────────────────────────────────────────────────────────────

-- ────────────────────────────────────────────────────────────────────────────
-- 20260716000000_initial_schema.sql
-- ────────────────────────────────────────────────────────────────────────────

set search_path to public, extensions;

-- DiveMap — core Postgres schema for Supabase.
--
-- Apply with `pnpm db:push`, then regenerate types with `pnpm db:types`.
-- Conventions:
--   * Every user-writable table has RLS enabled with an owner-only write policy.
--   * Ownership is always a `user_id`/`reporter`/`created_by` column referencing
--     public.users(id), which itself mirrors auth.users(id).
--   * Policies wrap auth.uid() in a scalar subquery — `(select auth.uid())` — so
--     Postgres evaluates it once per query rather than once per row.
--   * Distances/depths are metres, temperatures Celsius. Suffixes make it explicit.

create extension if not exists "postgis";
create extension if not exists "pgcrypto";

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

-- Site classification shown as the type badge on site cards.
create type public.site_type as enum (
  'reef',
  'wreck',
  'wall',
  'cave',
  'cenote',
  'drift',
  'muck',
  'pinnacle',
  'kelp',
  'fissure'
);

-- Matches the 5-step current selector in the conditions report flow.
create type public.current_level as enum (
  'none',      -- slack water
  'mild',      -- easy to fin against
  'moderate',  -- work to hold position
  'strong',    -- drift dive territory
  'ripping'    -- hook in or abort
);

-- Experience required, shown in the site detail spec strip.
create type public.dive_level as enum (
  'beginner',
  'intermediate',
  'advanced',
  'technical'
);

-- ─── SHARED TRIGGER FUNCTIONS ────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, extensions
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── users ───────────────────────────────────────────────────────────────────
-- Public profile mirroring auth.users. Row is created by the on_auth_user_created
-- trigger below, so the app never inserts into this table directly.

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  bio text,
  home_country text,
  -- Certification badges: [{ abbr, name, org, year }]. Kept denormalised because
  -- certs are only ever read as a whole list on the profile screen.
  certifications jsonb not null default '[]'::jsonb,
  -- Client preferences: units, default gas mix, gradient factors, etc.
  preferences jsonb not null default '{}'::jsonb,
  total_dives integer not null default 0 check (total_dives >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint users_certifications_is_array check (jsonb_typeof(certifications) = 'array'),
  constraint users_preferences_is_object check (jsonb_typeof(preferences) = 'object')
);

create index users_home_country_idx on public.users (home_country);

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

alter table public.users enable row level security;

create policy "Profiles are readable by everyone"
  on public.users for select
  using (true);

create policy "Users can insert their own profile"
  on public.users for insert
  with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
  on public.users for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Create the profile row whenever Supabase Auth creates a user. SECURITY DEFINER
-- because the inserting role is auth's, not the new user's, so RLS would reject it.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── dive_sites ──────────────────────────────────────────────────────────────

create table public.dive_sites (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  -- Rendered in a visually distinct block on the site detail screen.
  insider_notes text,
  type public.site_type not null,
  level public.dive_level,

  -- Authors write lat/lng; `location` is derived for geo queries so the two can
  -- never drift apart.
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  location extensions.geography(Point, 4326)
    generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::extensions.geography) stored,

  country text not null,
  region text,

  depth_min_m numeric(5, 1) not null check (depth_min_m >= 0),
  depth_max_m numeric(5, 1) not null check (depth_max_m >= 0),

  -- Rolling aggregate of conditions_reports, 0–5, shown as viz dots (●●●●○).
  viz_score numeric(2, 1) check (viz_score between 0 and 5),
  current_level public.current_level,
  avg_temp_c numeric(4, 1),
  rating numeric(2, 1) check (rating between 0 and 5),

  hero_photo_url text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint dive_sites_depth_range check (depth_max_m >= depth_min_m)
);

-- Bounding-box and radius lookups from the discovery map.
create index dive_sites_location_idx on public.dive_sites using gist (location);
create index dive_sites_country_idx on public.dive_sites (country);
create index dive_sites_type_idx on public.dive_sites (type);
create index dive_sites_created_by_idx on public.dive_sites (created_by);
-- Depth filter chip.
create index dive_sites_depth_max_idx on public.dive_sites (depth_max_m);

create trigger dive_sites_set_updated_at
  before update on public.dive_sites
  for each row execute function public.set_updated_at();

alter table public.dive_sites enable row level security;

create policy "Dive sites are readable by everyone"
  on public.dive_sites for select
  using (true);

create policy "Authenticated users can create dive sites"
  on public.dive_sites for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

create policy "Users can update dive sites they created"
  on public.dive_sites for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy "Users can delete dive sites they created"
  on public.dive_sites for delete
  to authenticated
  using ((select auth.uid()) = created_by);

-- ─── operators ───────────────────────────────────────────────────────────────

create table public.operators (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  -- Free-text base, e.g. "Hurghada · liveaboard + day boats".
  base text,
  country text not null,

  lat double precision check (lat between -90 and 90),
  lng double precision check (lng between -180 and 180),
  location extensions.geography(Point, 4326)
    generated always as (
      case
        when lat is null or lng is null then null
        else st_setsrid(st_makepoint(lng, lat), 4326)::extensions.geography
      end
    ) stored,

  tech_certified boolean not null default false,
  -- e.g. {TWINSETS,STAGES,O2,SOFNOLIME}
  certs_offered text[] not null default '{}',
  rating numeric(2, 1) check (rating between 0 and 5),
  tech_dives_guided integer not null default 0 check (tech_dives_guided >= 0),
  website text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index operators_location_idx on public.operators using gist (location);
create index operators_country_idx on public.operators (country);
create index operators_created_by_idx on public.operators (created_by);
-- "Tech-friendly" filter chip.
create index operators_tech_certified_idx on public.operators (tech_certified) where tech_certified;

create trigger operators_set_updated_at
  before update on public.operators
  for each row execute function public.set_updated_at();

alter table public.operators enable row level security;

create policy "Operators are readable by everyone"
  on public.operators for select
  using (true);

create policy "Authenticated users can create operators"
  on public.operators for insert
  to authenticated
  with check ((select auth.uid()) = created_by);

create policy "Users can update operators they created"
  on public.operators for update
  to authenticated
  using ((select auth.uid()) = created_by)
  with check ((select auth.uid()) = created_by);

create policy "Users can delete operators they created"
  on public.operators for delete
  to authenticated
  using ((select auth.uid()) = created_by);

-- Join table: which operators serve which sites.
create table public.operator_sites (
  operator_id uuid not null references public.operators (id) on delete cascade,
  site_id uuid not null references public.dive_sites (id) on delete cascade,
  primary key (operator_id, site_id)
);

create index operator_sites_site_id_idx on public.operator_sites (site_id);

alter table public.operator_sites enable row level security;

create policy "Operator/site links are readable by everyone"
  on public.operator_sites for select
  using (true);

create policy "Operator owners can link their operators to sites"
  on public.operator_sites for all
  to authenticated
  using (
    exists (
      select 1 from public.operators o
      where o.id = operator_id and o.created_by = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.operators o
      where o.id = operator_id and o.created_by = (select auth.uid())
    )
  );

-- ─── species ─────────────────────────────────────────────────────────────────
-- Reference table backing species_sightings.species_id and site_photos.species_tagged.

create table public.species (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  common_name text not null,
  scientific_name text,
  -- Marine-life chip colour from the design (e.g. '#48cae4').
  color text check (color ~ '^#[0-9a-fA-F]{6}$'),
  thumbnail_url text,
  created_at timestamptz not null default now()
);

create index species_common_name_idx on public.species (common_name);

alter table public.species enable row level security;

create policy "Species are readable by everyone"
  on public.species for select
  using (true);

-- Curated list: writes are service-role only, so no write policy is defined.

-- ─── dives ───────────────────────────────────────────────────────────────────

create table public.dives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  site_id uuid references public.dive_sites (id) on delete set null,

  dived_at timestamptz not null,
  max_depth_m numeric(5, 1) not null check (max_depth_m >= 0),
  avg_depth_m numeric(5, 1) check (avg_depth_m >= 0),
  bottom_time_min integer not null check (bottom_time_min > 0),
  -- Total runtime including deco/ascent; null until a profile is attached.
  runtime_min integer check (runtime_min > 0),

  -- Gas fractions 0–1, matching @divemap/deco-engine GasMix.
  gas_o2 numeric(4, 3) check (gas_o2 between 0 and 1),
  gas_he numeric(4, 3) check (gas_he between 0 and 1),

  viz_m numeric(4, 1) check (viz_m >= 0),
  current_level public.current_level,
  temp_surface_c numeric(4, 1),
  temp_bottom_c numeric(4, 1),

  weight_kg numeric(4, 1) check (weight_kg >= 0),
  buddy text,
  notes text,
  rating smallint check (rating between 1 and 5),
  is_public boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint dives_gas_fractions_sum check (coalesce(gas_o2, 0) + coalesce(gas_he, 0) <= 1),
  constraint dives_avg_depth_lte_max check (avg_depth_m is null or avg_depth_m <= max_depth_m),
  constraint dives_runtime_gte_bottom_time check (runtime_min is null or runtime_min >= bottom_time_min)
);

create index dives_user_id_idx on public.dives (user_id);
create index dives_site_id_idx on public.dives (site_id);
-- Logbook feed: a user's dives, newest first.
create index dives_user_dived_at_idx on public.dives (user_id, dived_at desc);
create index dives_public_dived_at_idx on public.dives (dived_at desc) where is_public;

create trigger dives_set_updated_at
  before update on public.dives
  for each row execute function public.set_updated_at();

alter table public.dives enable row level security;

create policy "Users can read their own dives and public dives"
  on public.dives for select
  using (is_public or (select auth.uid()) = user_id);

create policy "Users can log their own dives"
  on public.dives for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own dives"
  on public.dives for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own dives"
  on public.dives for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ─── conditions_reports ──────────────────────────────────────────────────────

create table public.conditions_reports (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.dive_sites (id) on delete cascade,
  reporter uuid not null references public.users (id) on delete cascade,

  -- Viz slider in the report flow runs 0–30 m; allow headroom for gin-clear sites.
  viz_m numeric(4, 1) not null check (viz_m >= 0),
  current_level public.current_level not null,
  temp_surface_c numeric(4, 1),
  temp_bottom_c numeric(4, 1),
  notes text,

  reported_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index conditions_reports_site_id_idx on public.conditions_reports (site_id);
create index conditions_reports_reporter_idx on public.conditions_reports (reporter);
-- "Latest conditions for this site" — the hot read path.
create index conditions_reports_site_reported_at_idx
  on public.conditions_reports (site_id, reported_at desc);

create trigger conditions_reports_set_updated_at
  before update on public.conditions_reports
  for each row execute function public.set_updated_at();

alter table public.conditions_reports enable row level security;

create policy "Conditions reports are readable by everyone"
  on public.conditions_reports for select
  using (true);

create policy "Users can file their own conditions reports"
  on public.conditions_reports for insert
  to authenticated
  with check ((select auth.uid()) = reporter);

create policy "Users can update their own conditions reports"
  on public.conditions_reports for update
  to authenticated
  using ((select auth.uid()) = reporter)
  with check ((select auth.uid()) = reporter);

create policy "Users can delete their own conditions reports"
  on public.conditions_reports for delete
  to authenticated
  using ((select auth.uid()) = reporter);

-- ─── site_photos ─────────────────────────────────────────────────────────────

create table public.site_photos (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.dive_sites (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  dive_id uuid references public.dives (id) on delete set null,

  url text not null,
  caption text,
  depth_taken_m numeric(5, 1) check (depth_taken_m >= 0),
  -- Species shown in the photo. Postgres cannot enforce a foreign key from an
  -- array element, so orphaned ids are possible; treat reads as best-effort.
  species_tagged uuid[] not null default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index site_photos_site_id_idx on public.site_photos (site_id);
create index site_photos_user_id_idx on public.site_photos (user_id);
create index site_photos_site_created_at_idx on public.site_photos (site_id, created_at desc);
-- Containment lookups: "photos tagged with this species".
create index site_photos_species_tagged_idx on public.site_photos using gin (species_tagged);

create trigger site_photos_set_updated_at
  before update on public.site_photos
  for each row execute function public.set_updated_at();

alter table public.site_photos enable row level security;

create policy "Site photos are readable by everyone"
  on public.site_photos for select
  using (true);

create policy "Users can upload their own site photos"
  on public.site_photos for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own site photos"
  on public.site_photos for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own site photos"
  on public.site_photos for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ─── species_sightings ───────────────────────────────────────────────────────

create table public.species_sightings (
  id uuid primary key default gen_random_uuid(),
  species_id uuid not null references public.species (id) on delete cascade,
  site_id uuid not null references public.dive_sites (id) on delete cascade,
  dive_id uuid references public.dives (id) on delete set null,
  -- Denormalised from dive_id so sightings can be logged without a dive, and so
  -- RLS can check ownership without joining dives.
  user_id uuid not null references public.users (id) on delete cascade,

  depth_m numeric(5, 1) check (depth_m >= 0),
  photo_url text,
  sighted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index species_sightings_species_id_idx on public.species_sightings (species_id);
create index species_sightings_site_id_idx on public.species_sightings (site_id);
create index species_sightings_dive_id_idx on public.species_sightings (dive_id);
create index species_sightings_user_id_idx on public.species_sightings (user_id);
-- "What's been seen at this site lately".
create index species_sightings_site_sighted_at_idx
  on public.species_sightings (site_id, sighted_at desc);

alter table public.species_sightings enable row level security;

create policy "Species sightings are readable by everyone"
  on public.species_sightings for select
  using (true);

create policy "Users can log their own species sightings"
  on public.species_sightings for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own species sightings"
  on public.species_sightings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own species sightings"
  on public.species_sightings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ─── wishlists ───────────────────────────────────────────────────────────────

create table public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  site_id uuid not null references public.dive_sites (id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),

  unique (user_id, site_id)
);

create index wishlists_user_id_idx on public.wishlists (user_id);
create index wishlists_site_id_idx on public.wishlists (site_id);

alter table public.wishlists enable row level security;

-- A wishlist is private to its owner — no public select policy.
create policy "Users can read their own wishlist"
  on public.wishlists for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add to their own wishlist"
  on public.wishlists for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own wishlist"
  on public.wishlists for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can remove from their own wishlist"
  on public.wishlists for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ─── dive_reviews ────────────────────────────────────────────────────────────
-- Star reviews for dive sites: one overall rating plus optional sub-ratings
-- for visibility, current, and marine life. One review per user per site.

create table public.dive_reviews (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.dive_sites (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,

  rating smallint not null check (rating between 1 and 5),
  viz_rating smallint check (viz_rating between 1 and 5),
  current_rating smallint check (current_rating between 1 and 5),
  marine_life_rating smallint check (marine_life_rating between 1 and 5),
  body text check (char_length(body) <= 2000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One review per diver per site; writing again updates the existing review.
  unique (site_id, user_id)
);

create index dive_reviews_site_id_idx on public.dive_reviews (site_id);
create index dive_reviews_user_id_idx on public.dive_reviews (user_id);
-- "Latest reviews for this site" — the hot read path.
create index dive_reviews_site_created_at_idx
  on public.dive_reviews (site_id, created_at desc);

create trigger dive_reviews_set_updated_at
  before update on public.dive_reviews
  for each row execute function public.set_updated_at();

alter table public.dive_reviews enable row level security;

create policy "Dive reviews are readable by everyone"
  on public.dive_reviews for select
  using (true);

create policy "Users can write their own reviews"
  on public.dive_reviews for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own reviews"
  on public.dive_reviews for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own reviews"
  on public.dive_reviews for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ─── GEO SEARCH ──────────────────────────────────────────────────────────────
-- Sites within `radius_m` of a point, nearest first. Uses the GiST index on
-- dive_sites.location. Exposed to PostgREST as rpc('dive_sites_near').

create or replace function public.dive_sites_near(
  in_lat double precision,
  in_lng double precision,
  radius_m double precision default 50000,
  max_results integer default 50
)
returns table (
  id uuid,
  slug text,
  name text,
  type public.site_type,
  country text,
  lat double precision,
  lng double precision,
  depth_min_m numeric,
  depth_max_m numeric,
  viz_score numeric,
  current_level public.current_level,
  rating numeric,
  hero_photo_url text,
  distance_m double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    s.id,
    s.slug,
    s.name,
    s.type,
    s.country,
    s.lat,
    s.lng,
    s.depth_min_m,
    s.depth_max_m,
    s.viz_score,
    s.current_level,
    s.rating,
    s.hero_photo_url,
    st_distance(s.location, st_setsrid(st_makepoint(in_lng, in_lat), 4326)::extensions.geography) as distance_m
  from public.dive_sites s
  where st_dwithin(s.location, st_setsrid(st_makepoint(in_lng, in_lat), 4326)::extensions.geography, radius_m)
  order by s.location <-> st_setsrid(st_makepoint(in_lng, in_lat), 4326)::extensions.geography
  limit least(max_results, 200);
$$;

-- ────────────────────────────────────────────────────────────────────────────
-- 20260717000001_dive_reviews.sql
-- ────────────────────────────────────────────────────────────────────────────

-- ─── dive_reviews ────────────────────────────────────────────────────────────
-- Star reviews for dive sites: one overall rating plus optional sub-ratings
-- for visibility, current, and marine life. One review per user per site.

create table if not exists public.dive_reviews (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.dive_sites (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,

  rating smallint not null check (rating between 1 and 5),
  viz_rating smallint check (viz_rating between 1 and 5),
  current_rating smallint check (current_rating between 1 and 5),
  marine_life_rating smallint check (marine_life_rating between 1 and 5),
  body text check (char_length(body) <= 2000),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- One review per diver per site; writing again updates the existing review.
  unique (site_id, user_id)
);

create index dive_reviews_site_id_idx on public.dive_reviews (site_id);
create index dive_reviews_user_id_idx on public.dive_reviews (user_id);
-- "Latest reviews for this site" — the hot read path.
create index dive_reviews_site_created_at_idx
  on public.dive_reviews (site_id, created_at desc);

create trigger dive_reviews_set_updated_at
  before update on public.dive_reviews
  for each row execute function public.set_updated_at();

alter table public.dive_reviews enable row level security;

create policy "Dive reviews are readable by everyone"
  on public.dive_reviews for select
  using (true);

create policy "Users can write their own reviews"
  on public.dive_reviews for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own reviews"
  on public.dive_reviews for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own reviews"
  on public.dive_reviews for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 20260721000000_storage_site_photos.sql
-- ────────────────────────────────────────────────────────────────────────────

-- Storage bucket backing the Photos tab on a dive site page.
--
-- Until now the bucket was a manual dashboard step, so a fresh environment came
-- up with photo uploads broken and nothing in the schema explaining why.
--
-- Two separate things are needed and only one of them is the bucket:
--   * the bucket itself, and
--   * RLS policies on storage.objects.
-- Marking a bucket public only opens *reads* through the public URL endpoint.
-- Uploads are INSERTs into storage.objects, where RLS is on by default, so
-- without an insert policy every upload fails with a policy violation even
-- though the bucket exists.
--
-- The policies on public.site_photos (the metadata row) are a different layer
-- and are already defined in 20260716000000_initial_schema.sql.

-- ─── BUCKET ──────────────────────────────────────────────────────────────────
-- Limits mirror what the client actually produces: PhotosTab compresses to a
-- 1920 px long edge and always encodes image/jpeg, so a 5 MB / jpeg-only bucket
-- never rejects a legitimate upload but does stop arbitrary payloads going in
-- through the storage API directly.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-photos', 'site-photos', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─── POLICIES ────────────────────────────────────────────────────────────────
-- Dropped first so this file can be re-run against an environment where the
-- bucket was already wired up by hand.

drop policy if exists "Authenticated users can upload site photos" on storage.objects;
drop policy if exists "Users can delete their own site photos"     on storage.objects;
drop policy if exists "Users can update their own site photos"     on storage.objects;
drop policy if exists "Site photos are publicly readable"          on storage.objects;

-- Any signed-in diver may add a photo to any site. Object keys are
-- {site_id}/{timestamp}.jpg, so the usual `(storage.foldername(name))[1] =
-- auth.uid()::text` ownership trick does not apply here — the first path
-- segment is the site, not the uploader. Ownership is enforced on write-back
-- instead, via storage.objects.owner, which Storage populates automatically.
create policy "Authenticated users can upload site photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'site-photos');

create policy "Users can update their own site photos"
  on storage.objects for update
  to authenticated
  using      (bucket_id = 'site-photos' and owner = (select auth.uid()))
  with check (bucket_id = 'site-photos' and owner = (select auth.uid()));

create policy "Users can delete their own site photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'site-photos' and owner = (select auth.uid()));

-- Redundant while the bucket is public — public reads bypass RLS through the
-- public endpoint — but required the moment `public` is flipped to false.
create policy "Site photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'site-photos');

-- ────────────────────────────────────────────────────────────────────────────
-- 20260722000000_dive_plans_usernames.sql
-- ────────────────────────────────────────────────────────────────────────────

set search_path to public, extensions;

-- Saved dive plans (task 3.7) and public usernames (task 7.1).
--
-- * dive_plans stores a planner run: the inputs plus a small result snapshot so
--   the profile list can show runtime/stops without re-running the engine. The
--   engine stays the source of truth — reopening a plan recomputes from inputs.
-- * users.username backs /profile/[username]. Lowercase slug, unique, with a
--   reserved list so a username can never shadow a static /profile/* route.

-- ─── users.username ──────────────────────────────────────────────────────────

alter table public.users
  add column username text unique
  check (username ~ '^[a-z0-9_]{3,24}$' and username not in ('edit', 'plans', 'settings'));

-- Backfill: slugified display_name (or email local part). First taker of a
-- slug keeps it bare; collisions and reserved words get a short id suffix.
--
-- NB on the clamping: rpad(s, 3) TRUNCATES strings longer than 3 — it is not a
-- min-length pad. The first revision of this migration used it that way and
-- collapsed every user to a 3-char slug ('andy_pros' → 'and'), so the backfill
-- died on the unique constraint. Pad only when short, clamp only when long,
-- and rank over the FINAL slug so the partition can never disagree with the
-- value actually assigned.
with raw as (
  select
    id,
    created_at,
    regexp_replace(lower(coalesce(display_name, split_part(email, '@', 1))), '[^a-z0-9_]+', '_', 'g') as r
  from public.users
  where username is null
),
base as (
  select
    id,
    created_at,
    -- Clamp to the check constraint: 3–24 chars of [a-z0-9_].
    case when length(r) < 3 then rpad(r, 3, '_') else substr(r, 1, 20) end as slug
  from raw
),
ranked as (
  select id, slug, row_number() over (partition by slug order by created_at) as rn
  from base
)
update public.users u
set username = case
  when ranked.rn = 1 and ranked.slug not in ('edit', 'plans', 'settings') then ranked.slug
  else substr(ranked.slug, 1, 19) || '_' || substr(replace(u.id::text, '-', ''), 1, 4)
end
from ranked
where u.id = ranked.id;

-- New signups: same slugification, suffixed with a short id fragment so the
-- insert can never fail on a duplicate and never trips the reserved list.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  insert into public.users (id, email, display_name, avatar_url, username)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url',
    -- Pad only when short (rpad truncates long strings — see the backfill
    -- comment), clamp to 16 so the id suffix keeps the total within 24.
    (
      select case when length(s) < 3 then rpad(s, 3, '_') else substr(s, 1, 16) end
      from (
        select regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]+', '_', 'g') as s
      ) t
    ) || '_' || substr(replace(new.id::text, '-', ''), 1, 4)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ─── dive_plans ──────────────────────────────────────────────────────────────

create table public.dive_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  site_id uuid references public.dive_sites (id) on delete set null,

  name text not null,

  -- Inputs, mirroring @divemap/deco-engine DivePlanInput.
  depth_m numeric(5, 1) not null check (depth_m > 0),
  bottom_time_min integer not null check (bottom_time_min > 0),
  gas_o2 numeric(4, 3) not null check (gas_o2 between 0 and 1),
  gas_he numeric(4, 3) not null default 0 check (gas_he between 0 and 1),
  gf_lo smallint not null check (gf_lo between 10 and 100),
  gf_hi smallint not null check (gf_hi between 10 and 100),
  -- Deco gases as [{fO2, fHe}]; empty array = back gas only.
  deco_gases jsonb not null default '[]'::jsonb,

  -- Result snapshot for list display only; recomputed on open.
  runtime_min integer,
  tts_min integer,
  stop_count integer,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint dive_plans_gas_fractions_sum check (gas_o2 + gas_he <= 1),
  constraint dive_plans_deco_gases_is_array check (jsonb_typeof(deco_gases) = 'array')
);

create index dive_plans_user_id_idx on public.dive_plans (user_id, created_at desc);
create index dive_plans_site_id_idx on public.dive_plans (site_id);

create trigger dive_plans_set_updated_at
  before update on public.dive_plans
  for each row execute function public.set_updated_at();

alter table public.dive_plans enable row level security;

-- Owner-only in all directions: plans are working documents, not content.
create policy "Users can view their own dive plans"
  on public.dive_plans for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can save their own dive plans"
  on public.dive_plans for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update their own dive plans"
  on public.dive_plans for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own dive plans"
  on public.dive_plans for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ────────────────────────────────────────────────────────────────────────────
-- 20260723000000_user_gear.sql
-- ────────────────────────────────────────────────────────────────────────────

set search_path to public, extensions;

-- Diver equipment list (profile settings). Same denormalised-jsonb shape as
-- certifications: gear is only ever read as a whole list on the profile
-- screen, and items are free-form ({ category, name }) — a relational model
-- would buy nothing here.

alter table public.users
  add column gear jsonb not null default '[]'::jsonb;

alter table public.users
  add constraint users_gear_is_array check (jsonb_typeof(gear) = 'array');

-- ────────────────────────────────────────────────────────────────────────────
-- 20260724000000_social.sql
-- ────────────────────────────────────────────────────────────────────────────

set search_path to public, extensions;

-- Social layer: diver-to-diver follows (task 7.4) and insider notes as UGC
-- with a moderation queue (task 5.4). The activity feed (task 5.3) needs no
-- table — it merges conditions_reports, public dives and site_photos at
-- query time.

-- ─── user_follows ────────────────────────────────────────────────────────────

create table public.user_follows (
  follower_id uuid not null references public.users (id) on delete cascade,
  followee_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),

  primary key (follower_id, followee_id),
  constraint user_follows_no_self check (follower_id <> followee_id)
);

-- Reverse lookups: "who follows X" / follower counts.
create index user_follows_followee_idx on public.user_follows (followee_id);

alter table public.user_follows enable row level security;

-- The social graph is public — counts and lists show on public profiles.
create policy "Follows are readable by everyone"
  on public.user_follows for select
  using (true);

create policy "Users can follow others"
  on public.user_follows for insert
  to authenticated
  with check ((select auth.uid()) = follower_id);

create policy "Users can unfollow"
  on public.user_follows for delete
  to authenticated
  using ((select auth.uid()) = follower_id);

-- ─── insider_notes ───────────────────────────────────────────────────────────

create type public.note_status as enum ('pending', 'approved', 'rejected');

create table public.insider_notes (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.dive_sites (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,

  body text not null check (char_length(body) between 20 and 1000),
  status public.note_status not null default 'pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index insider_notes_site_status_idx on public.insider_notes (site_id, status);
create index insider_notes_user_idx on public.insider_notes (user_id);

create trigger insider_notes_set_updated_at
  before update on public.insider_notes
  for each row execute function public.set_updated_at();

alter table public.insider_notes enable row level security;

-- Approved notes are content; authors additionally see their own pending and
-- rejected submissions ("visible after review").
create policy "Approved notes are readable, authors see their own"
  on public.insider_notes for select
  using (status = 'approved' or (select auth.uid()) = user_id);

-- Submissions are forced into the moderation queue: the with-check pins
-- status to 'pending', and the absence of any UPDATE policy means authors
-- cannot approve themselves. Moderation runs with the service role
-- (dashboard SQL: update insider_notes set status='approved' where id=…).
create policy "Users can submit notes for review"
  on public.insider_notes for insert
  to authenticated
  with check ((select auth.uid()) = user_id and status = 'pending');

create policy "Users can delete their own notes"
  on public.insider_notes for delete
  to authenticated
  using ((select auth.uid()) = user_id);

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
with base as (
  select
    id,
    -- Slugify, clamp to the check constraint: 3–24 chars of [a-z0-9_].
    substr(
      rpad(
        regexp_replace(lower(coalesce(display_name, split_part(email, '@', 1))), '[^a-z0-9_]+', '_', 'g'),
        3, '_'
      ),
      1, 20
    ) as slug,
    row_number() over (
      partition by regexp_replace(lower(coalesce(display_name, split_part(email, '@', 1))), '[^a-z0-9_]+', '_', 'g')
      order by created_at
    ) as rn
  from public.users
  where username is null
)
update public.users u
set username = case
  when base.rn = 1 and base.slug not in ('edit', 'plans', 'settings') then base.slug
  else substr(base.slug, 1, 19) || '_' || substr(replace(u.id::text, '-', ''), 1, 4)
end
from base
where u.id = base.id;

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
    substr(
      rpad(
        regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]+', '_', 'g'),
        3, '_'
      ),
      1, 16
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

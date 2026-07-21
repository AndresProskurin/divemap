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

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

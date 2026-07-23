set search_path to public, extensions;

-- Posts become a first-class entity (PROJECT_DOCS §15 item 0b).
--
-- Until now a "post" was either a site_photos row (single image) or an
-- insider_notes row (moderated text). That shape cannot express carousels or
-- video. This migration replaces both tables with:
--
--   posts       — the social object: author, site, optional linked dive,
--                 caption/body, kind ('media' | 'note'), moderation status
--   post_media  — ordered attachments (photo or video) of a 'media' post
--
-- Existing rows are copied over PRESERVING their ids, which is what makes the
-- post_comments rewire a one-line UPDATE (comments pointed at photo/note ids
-- that are now post ids). Both source tables are dropped at the end — every
-- code path ships against the new model in the same commit.
--
-- Moderation semantics carry over unchanged, still by construction:
--   * kind='note'  → status pinned to 'pending' at insert (community tips are
--     reviewed before the world sees them)
--   * kind='media' → status pinned to 'approved' (photos/videos publish
--     instantly, exactly like site_photos did)
-- There is still no UPDATE policy — nobody, including the author, can flip
-- status through PostgREST.

-- ─── TABLES ──────────────────────────────────────────────────────────────────

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  site_id uuid not null references public.dive_sites (id) on delete cascade,
  -- Linked dive: the post then renders real conditions (depth, viz, gas).
  dive_id uuid references public.dives (id) on delete set null,

  kind text not null check (kind in ('media', 'note')),
  -- Caption for media posts, the note text for notes.
  body text check (body is null or char_length(body) between 1 and 2000),
  status public.note_status not null default 'pending',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- A note IS its text; media posts may go caption-less.
  constraint posts_note_has_body check (kind <> 'note' or body is not null)
);

create index posts_site_created_idx on public.posts (site_id, created_at desc);
create index posts_user_created_idx on public.posts (user_id, created_at desc);
create index posts_status_created_idx on public.posts (status, created_at desc);

create trigger posts_set_updated_at
  before update on public.posts
  for each row execute function public.set_updated_at();

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  position smallint not null default 0,

  media_type text not null check (media_type in ('photo', 'video')),
  url text not null,
  -- Poster frame for videos (grids and feed cards never autoload the mp4);
  -- null for photos — url itself is the image.
  thumbnail_url text,
  width int,
  height int,
  duration_s numeric(6, 1),
  depth_m numeric(5, 1),

  created_at timestamptz not null default now(),

  unique (post_id, position)
);

create index post_media_post_idx on public.post_media (post_id, position);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

alter table public.posts enable row level security;
alter table public.post_media enable row level security;

-- Approved posts are public; authors additionally see their own pending /
-- rejected notes (so "under review" states render without extra queries).
create policy "Approved posts and own posts are readable"
  on public.posts for select
  using (status = 'approved' or (select auth.uid()) = user_id);

-- The status pin: the row's declared kind dictates the only status the
-- insert may carry. (A client could label a text-only post 'media' to skip
-- review, but then it renders as a caption-only media post — same exposure
-- an unreviewed photo caption already has.)
create policy "Users can post as themselves"
  on public.posts for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and ((kind = 'note' and status = 'pending')
      or (kind = 'media' and status = 'approved'))
  );

create policy "Users can delete their own posts"
  on public.posts for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- Media visibility rides on the parent post's select policy (the subquery is
-- itself RLS-filtered), so hidden posts hide their attachments too.
create policy "Media of visible posts is readable"
  on public.post_media for select
  using (exists (select 1 from public.posts p where p.id = post_id));

create policy "Users can attach media to their own posts"
  on public.post_media for insert
  to authenticated
  with check (exists (
    select 1 from public.posts p
    where p.id = post_id and p.user_id = (select auth.uid())
  ));

create policy "Users can remove media from their own posts"
  on public.post_media for delete
  to authenticated
  using (exists (
    select 1 from public.posts p
    where p.id = post_id and p.user_id = (select auth.uid())
  ));

-- ─── DATA MIGRATION (ids preserved) ─────────────────────────────────────────

insert into public.posts (id, user_id, site_id, dive_id, kind, body, status, created_at, updated_at)
select id, user_id, site_id, dive_id, 'media', caption, 'approved', created_at, updated_at
from public.site_photos;

-- species_tagged is dropped with the table: never written by any client.
insert into public.post_media (post_id, position, media_type, url, depth_m)
select id, 0, 'photo', url, depth_taken_m
from public.site_photos;

insert into public.posts (id, user_id, site_id, kind, body, status, created_at, updated_at)
select id, user_id, site_id, 'note', body, status, created_at, updated_at
from public.insider_notes;

-- ─── COMMENTS REWIRE ─────────────────────────────────────────────────────────
-- The XOR pair photo_id/note_id collapses into post_id (see 20260727: this
-- was designed to be mechanical).

alter table public.post_comments
  add column post_id uuid references public.posts (id) on delete cascade;

update public.post_comments set post_id = coalesce(photo_id, note_id);

alter table public.post_comments
  alter column post_id set not null;

alter table public.post_comments
  drop constraint post_comments_one_target,
  drop column photo_id,
  drop column note_id;

create index post_comments_post_idx on public.post_comments (post_id, created_at);

-- ─── DROP OLD TABLES / REALTIME ──────────────────────────────────────────────
-- Dropping a table removes it from supabase_realtime automatically; the feed
-- now subscribes to posts instead. post_media arrives right after its post —
-- the client's debounced refetch picks both up in one pass.

drop table public.site_photos;
drop table public.insider_notes;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'posts'
  ) then
    alter publication supabase_realtime add table public.posts;
  end if;
end $$;

-- ─── STORAGE: the bucket learns video ────────────────────────────────────────
-- Mobile uploads H.264 mp4/mov straight from the library (no client-side
-- transcode exists in Expo), so the cap rises to 50 MB — roughly a minute of
-- 1080p. Photos are still 1920px JPEGs well under the old 5 MB.

update storage.buckets
set file_size_limit    = 52428800,
    allowed_mime_types = array['image/jpeg', 'video/mp4', 'video/quicktime']
where id = 'site-photos';

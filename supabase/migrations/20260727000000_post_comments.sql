set search_path to public, extensions;

-- Comments under posts. A post is currently a site_photos or insider_notes
-- row (see PROJECT_DOCS backlog for the future posts entity), so a comment
-- targets exactly one of the two — enforced by the XOR check, which also
-- keeps a future migration to a real posts table mechanical.

create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  photo_id uuid references public.site_photos (id) on delete cascade,
  note_id uuid references public.insider_notes (id) on delete cascade,

  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now(),

  constraint post_comments_one_target check (
    (photo_id is not null)::int + (note_id is not null)::int = 1
  )
);

create index post_comments_photo_idx on public.post_comments (photo_id, created_at);
create index post_comments_note_idx on public.post_comments (note_id, created_at);

alter table public.post_comments enable row level security;

create policy "Comments are readable by everyone"
  on public.post_comments for select
  using (true);

create policy "Users can comment as themselves"
  on public.post_comments for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own comments"
  on public.post_comments for delete
  to authenticated
  using ((select auth.uid()) = user_id);

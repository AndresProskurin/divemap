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

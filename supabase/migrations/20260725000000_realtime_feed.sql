set search_path to public, extensions;

-- Realtime for the activity feed (task 5.3): postgres_changes events only
-- flow for tables in the supabase_realtime publication, and none are there
-- by default. Subscribers still go through RLS, so clients only receive
-- rows they could select anyway (public dives, world-readable reports and
-- photos).
--
-- Guarded so a re-run (or an environment where a table was added by hand
-- through the dashboard) does not fail on the duplicate.

do $$
declare
  t text;
begin
  foreach t in array array['conditions_reports', 'dives', 'site_photos'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

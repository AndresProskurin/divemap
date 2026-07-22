set search_path to public, extensions;

-- Diver equipment list (profile settings). Same denormalised-jsonb shape as
-- certifications: gear is only ever read as a whole list on the profile
-- screen, and items are free-form ({ category, name }) — a relational model
-- would buy nothing here.

alter table public.users
  add column gear jsonb not null default '[]'::jsonb;

alter table public.users
  add constraint users_gear_is_array check (jsonb_typeof(gear) = 'array');

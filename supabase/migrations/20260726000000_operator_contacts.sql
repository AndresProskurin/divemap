set search_path to public, extensions;

-- Contact channels for operators (requested 2026-07-23): divers need to reach
-- the shop that runs a site — website alone is not a contact method on a
-- phone. Free-text phone: international formats vary too much for a check
-- constraint to help.

alter table public.operators
  add column email text,
  add column phone text;

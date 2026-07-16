/**
 * @divemap/db — Supabase client, generated types and query helpers.
 *
 * All Supabase access goes through this package. Never query Supabase
 * directly from a component; add a helper under `src/queries/` instead.
 */

export type { Database, Enums, Json, Tables, TablesInsert, TablesUpdate } from './types'
export { createClient } from './client'
export { createServerSupabaseClient } from './server'
export { useAuth, useSignIn } from './hooks/useAuth'
export type { AuthState } from './hooks/useAuth'

export {
  getSiteBySlug,
  getSiteConditions,
  getSitePhotos,
  getSiteOperators,
  getSiteMarineLife,
  getTopSiteSlugs,
} from './queries/sites'
export type { MarineSpecies } from './queries/sites'

import type { Enums, Tables } from './types'

// ─── DOMAIN ALIASES ──────────────────────────────────────────────────────────
// Convenience names for the rows the app actually passes around. These survive
// `pnpm db:types` regeneration, which only rewrites `types.ts`.

export type User = Tables<'users'>
export type DiveSite = Tables<'dive_sites'>
export type Dive = Tables<'dives'>
export type Operator = Tables<'operators'>
export type ConditionsReport = Tables<'conditions_reports'>
export type SitePhoto = Tables<'site_photos'>
export type Species = Tables<'species'>
export type SpeciesSighting = Tables<'species_sightings'>
export type Wishlist = Tables<'wishlists'>

export type SiteType = Enums<'site_type'>
export type CurrentLevel = Enums<'current_level'>
export type DiveLevel = Enums<'dive_level'>

/**
 * A certification badge in `users.certifications`. Stored as jsonb, so this
 * shape is a convention the app enforces rather than the database.
 */
export interface Certification {
  /** Short badge label, e.g. 'T50'. */
  abbr: string
  /** Full name, e.g. 'Tec 50'. */
  name: string
  /** Issuing agency, e.g. 'PADI TecRec'. */
  org: string
  /** Year awarded, e.g. 2024. */
  year: number
}

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
  searchSites,
  browseSites,
} from './queries/sites'
export type { MarineSpecies, SiteSearchResult, SiteListItem, BrowseSitesOptions } from './queries/sites'

export { getMapSites } from './queries/sites'
export type { MapSite } from './queries/sites'
export { insertConditionsReport } from './queries/conditions'
export type { InsertConditionsReportInput } from './queries/conditions'

export {
  getUserProfile,
  getUserDives,
  getUserWishlist,
  updateUserProfile,
  getUserByUsername,
  getUserPublicDives,
  getUserPhotos,
} from './queries/profile'
export type { UserPhoto } from './queries/profile'
export {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowCounts,
  getFollowingIds,
  getSiteInsiderNotes,
  submitInsiderNote,
  getActivityFeed,
} from './queries/social'
export type { FollowCounts, InsiderNote, ActivityItem, ActivityKind, HomeFeedItem } from './queries/social'
export { getHomeFeed } from './queries/social'
export { getUserPlans, insertPlan, deletePlan } from './queries/plans'
export type { DivePlanWithSite } from './queries/plans'
export type { DiveWithSite, WishlistSite, UpdateProfileInput } from './queries/profile'

export { insertDive } from './queries/dives'
export type { InsertDiveInput } from './queries/dives'

export { getWishlistItem, addToWishlist, removeFromWishlist } from './queries/wishlist'

export {
  getSiteReviews,
  getUserReviewForSite,
  upsertSiteReview,
  deleteSiteReview,
  computeReviewStats,
} from './queries/reviews'
export type { SiteReview, SiteReviewStats, UpsertReviewInput } from './queries/reviews'

export { listOperators, getOperatorBySlug, getOperatorCountries } from './queries/operators'
export type { OperatorSiteLink, BrowseOperatorsOptions } from './queries/operators'

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

export { CERT_CATALOG, GEAR_CATEGORIES } from './certs'
export type { CatalogCert, GearItem } from './certs'

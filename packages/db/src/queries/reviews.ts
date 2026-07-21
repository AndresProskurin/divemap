import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'

type Client = SupabaseClient<Database>

export interface SiteReview {
  id: string
  rating: number
  viz_rating: number | null
  current_rating: number | null
  marine_life_rating: number | null
  body: string | null
  created_at: string
  reviewer: { display_name: string | null; avatar_url: string | null } | null
}

export interface SiteReviewStats {
  count: number
  avgRating: number
  avgViz: number | null
  avgCurrent: number | null
  avgMarineLife: number | null
  /** Histogram indexed 1..5 (index 0 unused). */
  distribution: [number, number, number, number, number, number]
}

export interface UpsertReviewInput {
  siteId: string
  userId: string
  rating: number
  vizRating?: number | null
  currentRating?: number | null
  marineLifeRating?: number | null
  body?: string | null
}

export async function getSiteReviews(
  siteId: string,
  supabase: Client,
  limit = 50,
): Promise<SiteReview[]> {
  const { data } = await supabase
    .from('dive_reviews')
    .select('id, rating, viz_rating, current_rating, marine_life_rating, body, created_at, reviewer:user_id(display_name, avatar_url)')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as unknown as SiteReview[]
}

/** Aggregate stats computed from the reviews themselves. */
export function computeReviewStats(reviews: Pick<SiteReview, 'rating' | 'viz_rating' | 'current_rating' | 'marine_life_rating'>[]): SiteReviewStats {
  const distribution: SiteReviewStats['distribution'] = [0, 0, 0, 0, 0, 0]
  let sum = 0
  let vizSum = 0, vizN = 0
  let curSum = 0, curN = 0
  let mlSum = 0, mlN = 0
  for (const r of reviews) {
    sum += r.rating
    const bucket = Math.min(5, Math.max(1, Math.round(r.rating)))
    distribution[bucket] = (distribution[bucket] ?? 0) + 1
    if (r.viz_rating != null) { vizSum += r.viz_rating; vizN++ }
    if (r.current_rating != null) { curSum += r.current_rating; curN++ }
    if (r.marine_life_rating != null) { mlSum += r.marine_life_rating; mlN++ }
  }
  const count = reviews.length
  return {
    count,
    avgRating: count ? sum / count : 0,
    avgViz: vizN ? vizSum / vizN : null,
    avgCurrent: curN ? curSum / curN : null,
    avgMarineLife: mlN ? mlSum / mlN : null,
    distribution,
  }
}

export async function getUserReviewForSite(
  userId: string,
  siteId: string,
  supabase: Client,
): Promise<SiteReview | null> {
  const { data } = await supabase
    .from('dive_reviews')
    .select('id, rating, viz_rating, current_rating, marine_life_rating, body, created_at, reviewer:user_id(display_name, avatar_url)')
    .eq('user_id', userId)
    .eq('site_id', siteId)
    .maybeSingle()
  return (data as unknown as SiteReview) ?? null
}

export async function upsertSiteReview(
  input: UpsertReviewInput,
  supabase: Client,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('dive_reviews')
    .upsert(
      {
        site_id: input.siteId,
        user_id: input.userId,
        rating: input.rating,
        viz_rating: input.vizRating ?? null,
        current_rating: input.currentRating ?? null,
        marine_life_rating: input.marineLifeRating ?? null,
        body: input.body ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'site_id,user_id' },
    )
  return { error: error?.message ?? null }
}

export async function deleteSiteReview(
  reviewId: string,
  supabase: Client,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('dive_reviews').delete().eq('id', reviewId)
  return { error: error?.message ?? null }
}

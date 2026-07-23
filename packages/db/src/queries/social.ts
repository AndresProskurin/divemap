import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'

type Client = SupabaseClient<Database>

// ─── Follows (task 7.4) ──────────────────────────────────────────────────────

export async function followUser(followerId: string, followeeId: string, supabase: Client) {
  const { error } = await supabase
    .from('user_follows')
    .insert({ follower_id: followerId, followee_id: followeeId })
  return { error: error?.message ?? null }
}

export async function unfollowUser(followerId: string, followeeId: string, supabase: Client) {
  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId)
  return { error: error?.message ?? null }
}

export async function isFollowing(
  followerId: string,
  followeeId: string,
  supabase: Client,
): Promise<boolean> {
  const { data } = await supabase
    .from('user_follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('followee_id', followeeId)
    .maybeSingle()
  return data != null
}

export interface FollowCounts {
  followers: number
  following: number
}

export async function getFollowCounts(userId: string, supabase: Client): Promise<FollowCounts> {
  const [followers, following] = await Promise.all([
    supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('followee_id', userId),
    supabase
      .from('user_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_id', userId),
  ])
  return { followers: followers.count ?? 0, following: following.count ?? 0 }
}

/** Ids the user follows — feeds filter on this. */
export async function getFollowingIds(userId: string, supabase: Client): Promise<string[]> {
  const { data } = await supabase
    .from('user_follows')
    .select('followee_id')
    .eq('follower_id', userId)
    .limit(1000)
  return (data ?? []).map((r) => r.followee_id)
}

// ─── Insider notes (task 5.4) ────────────────────────────────────────────────

export interface InsiderNote {
  id: string
  body: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  user: { username: string | null; display_name: string | null; certifications: unknown } | null
}

/**
 * Approved notes plus — thanks to RLS — the caller's own pending/rejected
 * submissions, so "visible after review" states render without extra queries.
 */
export async function getSiteInsiderNotes(siteId: string, supabase: Client): Promise<InsiderNote[]> {
  const { data } = await supabase
    .from('insider_notes')
    .select('id, body, status, created_at, user:user_id(username, display_name, certifications)')
    .eq('site_id', siteId)
    .order('created_at', { ascending: false })
    .limit(20)
  return (data ?? []) as unknown as InsiderNote[]
}

export async function submitInsiderNote(
  siteId: string,
  userId: string,
  body: string,
  supabase: Client,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('insider_notes')
    .insert({ site_id: siteId, user_id: userId, body: body.trim() })
  return { error: error?.message ?? null }
}

// ─── Activity feed (task 5.3) ────────────────────────────────────────────────

export type ActivityKind = 'report' | 'dive' | 'photo'

export interface ActivityItem {
  kind: ActivityKind
  /** Present for photo items — opens the post. */
  id?: string
  at: string
  site: { name: string; slug: string; country: string | null } | null
  user: { username: string | null; display_name: string | null } | null
  /** Kind-specific one-liner, already formatted. */
  summary: string
  photoUrl?: string
}

interface FeedOptions {
  /** Restrict to these actor ids (the Following filter). */
  actorIds?: string[]
  limit?: number
}

/**
 * Merged community activity: conditions reports, public dives, site photos.
 * Three parallel queries merged client-side — at this scale a UNION view buys
 * nothing and RLS stays per-table. Realtime can layer on later (backlog).
 */
export async function getActivityFeed(
  supabase: Client,
  options: FeedOptions = {},
): Promise<ActivityItem[]> {
  const limit = options.limit ?? 30
  const ids = options.actorIds

  let reports = supabase
    .from('conditions_reports')
    .select('reported_at, viz_m, current_level, reporter, site:site_id(name, slug, country), user:reporter(username, display_name)')
    .order('reported_at', { ascending: false })
    .limit(limit)
  if (ids) reports = reports.in('reporter', ids)

  let dives = supabase
    .from('dives')
    .select('dived_at, max_depth_m, bottom_time_min, user_id, site:site_id(name, slug, country), user:user_id(username, display_name)')
    .eq('is_public', true)
    .order('dived_at', { ascending: false })
    .limit(limit)
  if (ids) dives = dives.in('user_id', ids)

  let photos = supabase
    .from('site_photos')
    .select('id, created_at, url, user_id, site:site_id(name, slug, country), user:user_id(username, display_name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (ids) photos = photos.in('user_id', ids)

  const [r, d, p] = await Promise.all([reports, dives, photos])

  type Joined = { name: string; slug: string; country: string | null }
  type JoinedUser = { username: string | null; display_name: string | null }

  const items: ActivityItem[] = [
    ...(r.data ?? []).map((row) => ({
      kind: 'report' as const,
      at: row.reported_at,
      site: row.site as unknown as Joined | null,
      user: row.user as unknown as JoinedUser | null,
      summary: [
        row.viz_m != null ? `${row.viz_m}m viz` : null,
        row.current_level ? `${row.current_level} current` : null,
      ].filter(Boolean).join(' · ') || 'conditions report',
    })),
    ...(d.data ?? []).map((row) => ({
      kind: 'dive' as const,
      at: row.dived_at,
      site: row.site as unknown as Joined | null,
      user: row.user as unknown as JoinedUser | null,
      summary: `${row.max_depth_m}m · ${row.bottom_time_min} min`,
    })),
    ...(p.data ?? []).map((row) => ({
      kind: 'photo' as const,
      id: row.id,
      at: row.created_at,
      site: row.site as unknown as Joined | null,
      user: row.user as unknown as JoinedUser | null,
      summary: 'added a photo',
      photoUrl: row.url,
    })),
  ]

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

// ─── Home community feed (photos + approved notes) ───────────────────────────

export interface HomeFeedItem {
  kind: 'photo' | 'note'
  /** Source row id (site_photos.id or insider_notes.id) — the post id. */
  id: string
  at: string
  user: { username: string | null; display_name: string | null; avatar_url: string | null } | null
  site: { name: string; slug: string; country: string | null } | null
  /** Photo URL for kind 'photo'. */
  photoUrl?: string
  /** Caption (photo) or note body. */
  text?: string
}

interface HomeFeedOptions {
  actorIds?: string[]
  limit?: number
}

/**
 * The Discover-tab community stream: site photos and approved insider notes,
 * newest first, optionally restricted to followed divers. Instagram-shaped —
 * every item is attributable (avatar + username + site).
 */
export async function getHomeFeed(
  supabase: Client,
  options: HomeFeedOptions = {},
): Promise<HomeFeedItem[]> {
  const limit = options.limit ?? 30
  const ids = options.actorIds

  let photos = supabase
    .from('site_photos')
    .select('id, created_at, url, caption, user:user_id(username, display_name, avatar_url), site:site_id(name, slug, country)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (ids) photos = photos.in('user_id', ids)

  let notes = supabase
    .from('insider_notes')
    .select('id, created_at, body, status, user:user_id(username, display_name, avatar_url), site:site_id(name, slug, country)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (ids) notes = notes.in('user_id', ids)

  const [p, n] = await Promise.all([photos, notes])

  type JUser = { username: string | null; display_name: string | null; avatar_url: string | null }
  type JSite = { name: string; slug: string; country: string | null }

  const items: HomeFeedItem[] = [
    ...(p.data ?? []).map((row) => ({
      kind: 'photo' as const,
      id: row.id,
      at: row.created_at,
      user: row.user as unknown as JUser | null,
      site: row.site as unknown as JSite | null,
      photoUrl: row.url,
      text: row.caption ?? undefined,
    })),
    ...(n.data ?? []).map((row) => ({
      kind: 'note' as const,
      id: row.id,
      at: row.created_at,
      user: row.user as unknown as JUser | null,
      site: row.site as unknown as JSite | null,
      text: row.body,
    })),
  ]

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

// ─── Post detail ─────────────────────────────────────────────────────────────

export interface PostUser {
  username: string | null
  display_name: string | null
  avatar_url: string | null
}
export interface PostSite {
  name: string
  slug: string
  country: string | null
}
export interface PostDive {
  dived_at: string
  max_depth_m: number
  bottom_time_min: number
  viz_m: number | null
  current_level: string | null
  temp_surface_c: number | null
  temp_bottom_c: number | null
  rating: number | null
  gas_o2: number | null
  gas_he: number | null
}

export interface PhotoPost {
  kind: 'photo'
  id: string
  url: string
  caption: string | null
  depth_taken_m: number | null
  created_at: string
  user: PostUser | null
  site: PostSite | null
  /** The linked dive, when the uploader attached one (or auto-link found it). */
  dive: PostDive | null
}

export interface NotePost {
  kind: 'note'
  id: string
  body: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  user: PostUser | null
  site: PostSite | null
}

export async function getPhotoPost(id: string, supabase: Client): Promise<PhotoPost | null> {
  const { data } = await supabase
    .from('site_photos')
    .select(`
      id, url, caption, depth_taken_m, created_at,
      user:user_id(username, display_name, avatar_url),
      site:site_id(name, slug, country),
      dive:dive_id(dived_at, max_depth_m, bottom_time_min, viz_m, current_level, temp_surface_c, temp_bottom_c, rating, gas_o2, gas_he)
    `)
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  return { kind: 'photo', ...(data as object) } as unknown as PhotoPost
}

export async function getNotePost(id: string, supabase: Client): Promise<NotePost | null> {
  const { data } = await supabase
    .from('insider_notes')
    .select('id, body, status, created_at, user:user_id(username, display_name, avatar_url), site:site_id(name, slug, country)')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  return { kind: 'note', ...(data as object) } as unknown as NotePost
}

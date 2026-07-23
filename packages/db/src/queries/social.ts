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

// ─── Posts: shared shapes ────────────────────────────────────────────────────

export interface PostMediaItem {
  id: string
  position: number
  media_type: 'photo' | 'video'
  url: string
  /** Poster frame for videos; null for photos (url is the image). */
  thumbnail_url: string | null
  width: number | null
  height: number | null
  duration_s: number | null
  depth_m: number | null
}

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

/** Grid/feed thumbnail for a media list — the first attachment's image. */
export function postThumbnail(media: PostMediaItem[]): string | null {
  const first = [...media].sort((a, b) => a.position - b.position)[0]
  if (!first) return null
  return first.media_type === 'video' ? first.thumbnail_url : first.url
}

const MEDIA_SELECT = 'media:post_media(id, position, media_type, url, thumbnail_url, width, height, duration_s, depth_m)'

// ─── Creating posts ──────────────────────────────────────────────────────────

/**
 * Inserts the post row of a media post (status pinned to 'approved' — the RLS
 * insert policy rejects anything else for kind 'media'). Attachments follow
 * via addPostMedia.
 */
export async function createMediaPost(
  input: { siteId: string; userId: string; diveId?: string | null; body?: string | null },
  supabase: Client,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      site_id: input.siteId,
      user_id: input.userId,
      dive_id: input.diveId ?? null,
      kind: 'media',
      body: input.body?.trim() || null,
      status: 'approved',
    })
    .select('id')
    .single()
  return { id: data?.id ?? null, error: error?.message ?? null }
}

export async function addPostMedia(
  items: Database['public']['Tables']['post_media']['Insert'][],
  supabase: Client,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('post_media').insert(items)
  return { error: error?.message ?? null }
}

/** A community note is a text-only post — pending review by construction. */
export async function createNotePost(
  siteId: string,
  userId: string,
  body: string,
  supabase: Client,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('posts')
    .insert({ site_id: siteId, user_id: userId, kind: 'note', body: body.trim(), status: 'pending' })
  return { error: error?.message ?? null }
}

export async function deletePost(postId: string, supabase: Client): Promise<void> {
  await supabase.from('posts').delete().eq('id', postId)
}

// ─── Site notes (task 5.4 — moderated community tips) ───────────────────────

export interface SiteNote {
  id: string
  body: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  user: { username: string | null; display_name: string | null; certifications: unknown } | null
}

/**
 * Approved notes plus — thanks to RLS — the caller's own pending/rejected
 * submissions, so "visible after review" states render without extra queries.
 */
export async function getSiteNotes(siteId: string, supabase: Client): Promise<SiteNote[]> {
  const { data } = await supabase
    .from('posts')
    .select('id, body, status, created_at, user:user_id(username, display_name, certifications)')
    .eq('site_id', siteId)
    .eq('kind', 'note')
    .order('created_at', { ascending: false })
    .limit(20)
  return (data ?? []) as unknown as SiteNote[]
}

// ─── Activity feed (task 5.3) ────────────────────────────────────────────────

export type ActivityKind = 'report' | 'dive' | 'post'

export interface ActivityItem {
  kind: ActivityKind
  /** Present for post items — opens the post. */
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
 * Merged community activity: conditions reports, public dives, posts.
 * Three parallel queries merged client-side — at this scale a UNION view buys
 * nothing and RLS stays per-table.
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

  let posts = supabase
    .from('posts')
    .select(`id, kind, body, created_at, user_id, site:site_id(name, slug, country), user:user_id(username, display_name), ${MEDIA_SELECT}`)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (ids) posts = posts.in('user_id', ids)

  const [r, d, p] = await Promise.all([reports, dives, posts])

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
    ...(p.data ?? []).map((raw) => {
      const media = ((raw as { media?: PostMediaItem[] }).media ?? [])
        .sort((a, b) => a.position - b.position)
      const summary = raw.kind === 'note'
        ? 'shared a note'
        : media.some((m) => m.media_type === 'video')
          ? 'shared a video'
          : media.length > 1 ? `added ${media.length} photos` : 'added a photo'
      return {
        kind: 'post' as const,
        id: raw.id,
        at: raw.created_at,
        site: raw.site as unknown as Joined | null,
        user: raw.user as unknown as JoinedUser | null,
        summary,
        photoUrl: postThumbnail(media) ?? undefined,
      }
    }),
  ]

  return items
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, limit)
}

// ─── Home community feed ─────────────────────────────────────────────────────

export interface HomeFeedItem {
  id: string
  kind: 'media' | 'note'
  at: string
  user: PostUser | null
  site: PostSite | null
  /** Ordered attachments — empty for notes. */
  media: PostMediaItem[]
  /** Caption (media post) or note body. */
  text?: string
}

interface HomeFeedOptions {
  actorIds?: string[]
  /** Restrict to one site (the site page's community feed). */
  siteId?: string
  limit?: number
}

/**
 * The Discover-tab community stream, newest first, optionally restricted to
 * followed divers. Instagram-shaped — every item is attributable (avatar +
 * username + site) and a media post carries its full carousel.
 */
export async function getHomeFeed(
  supabase: Client,
  options: HomeFeedOptions = {},
): Promise<HomeFeedItem[]> {
  const limit = options.limit ?? 30

  let q = supabase
    .from('posts')
    .select(`id, kind, body, created_at, user:user_id(username, display_name, avatar_url), site:site_id(name, slug, country), ${MEDIA_SELECT}`)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .order('id')
    .limit(limit)
  if (options.actorIds) q = q.in('user_id', options.actorIds)
  if (options.siteId) q = q.eq('site_id', options.siteId)

  const { data } = await q

  return (data ?? []).map((raw) => ({
    id: raw.id,
    kind: raw.kind as 'media' | 'note',
    at: raw.created_at,
    user: raw.user as unknown as PostUser | null,
    site: raw.site as unknown as PostSite | null,
    media: ((raw as { media?: PostMediaItem[] }).media ?? [])
      .sort((a, b) => a.position - b.position),
    text: raw.body ?? undefined,
  }))
}

// ─── Post detail ─────────────────────────────────────────────────────────────

export interface PostDetail {
  id: string
  kind: 'media' | 'note'
  body: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  user: PostUser | null
  site: PostSite | null
  /** The linked dive, when the author attached one (or auto-link found it). */
  dive: PostDive | null
  media: PostMediaItem[]
}

export async function getPost(id: string, supabase: Client): Promise<PostDetail | null> {
  const { data } = await supabase
    .from('posts')
    .select(`
      id, kind, body, status, created_at,
      user:user_id(username, display_name, avatar_url),
      site:site_id(name, slug, country),
      dive:dive_id(dived_at, max_depth_m, bottom_time_min, viz_m, current_level, temp_surface_c, temp_bottom_c, rating, gas_o2, gas_he),
      ${MEDIA_SELECT}
    `)
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  const post = data as unknown as PostDetail
  post.media = (post.media ?? []).sort((a, b) => a.position - b.position)
  return post
}

// ─── Comments ────────────────────────────────────────────────────────────────

export interface PostComment {
  id: string
  body: string
  created_at: string
  user_id: string
  user: { username: string | null; display_name: string | null; avatar_url: string | null } | null
}

export async function getPostComments(postId: string, supabase: Client): Promise<PostComment[]> {
  const { data } = await supabase
    .from('post_comments')
    .select('id, body, created_at, user_id, user:user_id(username, display_name, avatar_url)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true })
    .limit(100)
  return (data ?? []) as unknown as PostComment[]
}

export async function addPostComment(
  postId: string,
  userId: string,
  body: string,
  supabase: Client,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('post_comments').insert({
    user_id: userId,
    post_id: postId,
    body: body.trim(),
  })
  return { error: error?.message ?? null }
}

export async function deletePostComment(commentId: string, supabase: Client): Promise<void> {
  await supabase.from('post_comments').delete().eq('id', commentId)
}

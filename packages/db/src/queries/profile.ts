import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'

type Client = SupabaseClient<Database>

export interface DiveWithSite {
  id: string
  dived_at: string
  max_depth_m: number
  bottom_time_min: number
  gas_o2: number | null
  gas_he: number | null
  buddy: string | null
  site: { name: string; slug: string; country: string | null } | null
}

export interface WishlistSite {
  id: string
  site: {
    id: string
    name: string
    slug: string
    country: string | null
    depth_min_m: number | null
    depth_max_m: number | null
  }
}

export async function getUserProfile(userId: string, supabase: Client) {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  return data ?? null
}

export async function getUserDives(
  userId: string,
  supabase: Client,
  limit = 20,
): Promise<DiveWithSite[]> {
  const { data } = await supabase
    .from('dives')
    .select('id, dived_at, max_depth_m, bottom_time_min, gas_o2, gas_he, buddy, site:site_id(name, slug, country)')
    .eq('user_id', userId)
    .order('dived_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as unknown as DiveWithSite[]
}

export interface UpdateProfileInput {
  display_name?: string | null
  username?: string
  bio?: string | null
  home_country?: string | null
  avatar_url?: string | null
  certifications?: unknown
  gear?: unknown
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
  supabase: Client,
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('users')
    .update({ ...(input as Record<string, unknown>), updated_at: new Date().toISOString() })
    .eq('id', userId)
  return { error: error?.message ?? null }
}

export async function getUserWishlist(
  userId: string,
  supabase: Client,
): Promise<WishlistSite[]> {
  const { data } = await supabase
    .from('wishlists')
    .select('id, site:site_id(id, name, slug, country, depth_min_m, depth_max_m)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []) as unknown as WishlistSite[]
}

// ─── Public profile (/profile/[username]) ────────────────────────────────────

export async function getUserByUsername(username: string, supabase: Client) {
  const { data } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, bio, home_country, certifications, gear, created_at')
    .eq('username', username.toLowerCase())
    .single()
  return data ?? null
}

/** Only dives the owner explicitly made public — RLS enforces the same rule. */
export async function getUserPublicDives(
  userId: string,
  supabase: Client,
  limit = 20,
): Promise<DiveWithSite[]> {
  const { data } = await supabase
    .from('dives')
    .select('id, dived_at, max_depth_m, bottom_time_min, gas_o2, gas_he, buddy, site:site_id(name, slug, country)')
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('dived_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as unknown as DiveWithSite[]
}

export interface UserPhoto {
  id: string
  url: string
  caption: string | null
  depth_taken_m: number | null
  created_at: string
  site: { name: string; slug: string } | null
}

export async function getUserPhotos(
  userId: string,
  supabase: Client,
  limit = 24,
): Promise<UserPhoto[]> {
  const { data } = await supabase
    .from('site_photos')
    .select('id, url, caption, depth_taken_m, created_at, site:site_id(name, slug)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data ?? []) as unknown as UserPhoto[]
}

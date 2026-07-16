import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../types'

type Client = SupabaseClient<Database>

export async function getWishlistItem(
  userId: string,
  siteId: string,
  supabase: Client,
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from('wishlists')
    .select('id')
    .eq('user_id', userId)
    .eq('site_id', siteId)
    .single()
  return data ?? null
}

export async function addToWishlist(
  userId: string,
  siteId: string,
  supabase: Client,
): Promise<{ id: string | null; error: string | null }> {
  const { data, error } = await supabase
    .from('wishlists')
    .insert({ user_id: userId, site_id: siteId })
    .select('id')
    .single()
  return { id: data?.id ?? null, error: error?.message ?? null }
}

export async function removeFromWishlist(
  wishlistItemId: string,
  supabase: Client,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('wishlists').delete().eq('id', wishlistItemId)
  return { error: error?.message ?? null }
}

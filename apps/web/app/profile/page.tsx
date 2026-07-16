import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import { getUserProfile, getUserDives, getUserWishlist } from '@divemap/db'
import { ProfilePage } from './ProfilePage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Profile — DiveMap',
  description: 'Your dive logbook, certifications and wishlist.',
}

function makeSupabase() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  if (!url || !key) return null
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => {
        try {
          return (cookies() as unknown as { getAll(): Array<{ name: string; value: string }> }).getAll()
        } catch {
          return []
        }
      },
      setAll: () => {},
    },
  })
}

export default async function ProfileRoute() {
  const supabase = makeSupabase()
  if (!supabase) redirect('/')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [profile, dives, wishlist] = await Promise.all([
    getUserProfile(user.id, supabase),
    getUserDives(user.id, supabase, 20),
    getUserWishlist(user.id, supabase),
  ])

  return (
    <ProfilePage
      user={profile}
      dives={dives}
      wishlist={wishlist}
    />
  )
}

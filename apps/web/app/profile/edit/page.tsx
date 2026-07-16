import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import { getUserProfile } from '@divemap/db'
import { EditProfilePage } from './EditProfilePage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Edit Profile — DiveMap',
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

export default async function EditProfileRoute() {
  const supabase = makeSupabase()
  if (!supabase) redirect('/')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/sign-in?next=/profile/edit')

  const profile = await getUserProfile(user.id, supabase)
  if (!profile) redirect('/profile')

  return <EditProfilePage user={profile} />
}

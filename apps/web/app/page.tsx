import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { DiveSite } from '@divemap/db'
import type { Database } from '@divemap/db'
import { DiscoveryMap } from '@/components/map/DiscoveryMap'

async function getDiveSites(): Promise<DiveSite[]> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  if (!url || !key) return []   // env not configured yet

  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(url, key, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options) } catch { /* read-only in RSC */ }
          })
        },
      },
    })
    const { data } = await supabase
      .from('dive_sites')
      .select('*')
      .order('rating', { ascending: false })
      .limit(500)
    return (data ?? []) as DiveSite[]
  } catch {
    return []
  }
}

export default async function DiscoveryPage() {
  const sites = await getDiveSites()

  return (
    <main className="relative w-screen h-screen overflow-hidden">
      <Suspense>
        <DiscoveryMap initialSites={sites} />
      </Suspense>
    </main>
  )
}

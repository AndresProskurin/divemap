import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import { browseSites } from '@divemap/db'
import { SitesBrowsePage } from './SitesBrowsePage'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Browse Dive Sites — DiveMap',
  description: 'Discover and search thousands of dive sites worldwide.',
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

interface PageProps {
  searchParams: Promise<{
    q?: string
    type?: string
    level?: string
    country?: string
    page?: string
  }>
}

export default async function SitesBrowseRoute({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page ?? '1', 10))

  const supabase = makeSupabase()
  const result = supabase
    ? await browseSites({ query: params.q, type: params.type, level: params.level, country: params.country, page }, supabase)
    : { sites: [], total: 0 }

  return (
    <SitesBrowsePage
      sites={result.sites}
      total={result.total}
      page={page}
      filters={{ q: params.q, type: params.type, level: params.level, country: params.country }}
    />
  )
}

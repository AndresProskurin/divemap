import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import { getSiteBySlug } from '@divemap/db'
import { LogDivePage } from './LogDivePage'

export const metadata: Metadata = {
  title: 'Log a Dive — DiveMap',
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

interface Props {
  searchParams: { site?: string }
}

export default async function LogDiveRoute({ searchParams }: Props) {
  const supabase = makeSupabase()
  const site = supabase && searchParams.site
    ? await getSiteBySlug(searchParams.site, supabase)
    : null

  return (
    <Suspense>
      <LogDivePage
        prelinkedSite={site ? { id: site.id, name: site.name, slug: site.slug } : null}
      />
    </Suspense>
  )
}

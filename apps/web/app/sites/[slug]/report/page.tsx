import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import { getSiteBySlug } from '@divemap/db'
import { ReportFlow } from './ReportFlow'

interface Props {
  params: { slug: string }
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

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = makeSupabase()
  const site = supabase ? await getSiteBySlug(params.slug, supabase) : null
  const name = site?.name ?? 'Dive Site'
  return {
    title: `Report Conditions — ${name} | DiveMap`,
    description: `Submit a conditions report for ${name}.`,
  }
}

export default async function ReportPage({ params }: Props) {
  const supabase = makeSupabase()
  const site = supabase ? await getSiteBySlug(params.slug, supabase) : null
  if (!site) notFound()

  return (
    <ReportFlow
      siteId={site.id}
      siteName={site.name}
      siteSlug={params.slug}
      siteLocation={site.country ?? undefined}
    />
  )
}

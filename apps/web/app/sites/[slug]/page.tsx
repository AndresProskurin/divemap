import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import {
  getSiteBySlug,
  getSiteConditions,
  getSiteMediaPosts,
  getSiteOperators,
  getSiteMarineLife,
  getTopSiteSlugs,
} from '@divemap/db'
import { SiteDetailPage } from './SiteDetailPage'

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
          // cookies() is async in Next 15 but synchronous in Next 14 — keep both happy
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
  if (!supabase) return { title: 'Dive Site — DiveMap' }

  const site = await getSiteBySlug(params.slug, supabase)
  if (!site) return { title: 'Dive Site Not Found — DiveMap' }

  const title = `${site.name} — DiveMap`
  const description = site.description
    ? site.description.slice(0, 160)
    : `Dive site in ${site.country}. Depth: ${site.depth_min_m}–${site.depth_max_m}m.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      images: site.hero_photo_url
        ? [{ url: site.hero_photo_url, width: 1200, height: 630, alt: site.name }]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: site.hero_photo_url ? [site.hero_photo_url] : [],
    },
  }
}

export async function generateStaticParams() {
  const supabase = makeSupabase()
  if (!supabase) return []
  const slugs = await getTopSiteSlugs(500, supabase)
  return slugs.map((slug) => ({ slug }))
}

export default async function SitePage({ params }: Props) {
  const supabase = makeSupabase()
  if (!supabase) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg)' }}
      >
        <p style={{ color: 'var(--tx3)', fontSize: '13px' }}>
          Database not configured.
        </p>
      </main>
    )
  }

  const site = await getSiteBySlug(params.slug, supabase)
  if (!site) notFound()

  const [conditions, photos, operators, marineLife] = await Promise.all([
    getSiteConditions(site.id, supabase),
    getSiteMediaPosts(site.id, supabase),
    getSiteOperators(site.id, supabase),
    getSiteMarineLife(site.id, supabase),
  ])

  return (
    <main>
      <SiteDetailPage
        site={site}
        conditions={conditions}
        photos={photos}
        operators={operators}
        marineLife={marineLife}
      />
    </main>
  )
}

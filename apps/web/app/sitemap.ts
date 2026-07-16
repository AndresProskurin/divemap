import type { MetadataRoute } from 'next'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@divemap/db'
import { getTopSiteSlugs } from '@divemap/db'

const BASE_URL = process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://divemap.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), priority: 1.0, changeFrequency: 'daily' },
  ]

  if (!url || !key) return staticRoutes

  try {
    const supabase = createServerClient<Database>(url, key, {
      cookies: { getAll: () => [], setAll: () => {} },
    })
    const slugs = await getTopSiteSlugs(500, supabase)
    const siteRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
      url: `${BASE_URL}/sites/${slug}`,
      lastModified: new Date(),
      priority: 0.8,
      changeFrequency: 'weekly' as const,
    }))
    return [...staticRoutes, ...siteRoutes]
  } catch {
    return staticRoutes
  }
}

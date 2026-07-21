import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type SpeciesDetail = {
  id: string
  slug: string
  common_name: string
  scientific_name: string | null
  color: string | null
  thumbnail_url: string | null
}

type SightingSite = {
  site: {
    id: string
    name: string
    slug: string
    country: string | null
    depth_max_m: number | null
  } | null
  sighting_count: number
}

async function getSpeciesBySlug(slug: string): Promise<{
  species: SpeciesDetail
  sites: SightingSite[]
} | null> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  if (!url || !key) return null
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(url, key, {
      cookies: {
        getAll: () => {
          try {
            return (cookieStore as unknown as { getAll(): Array<{ name: string; value: string }> }).getAll()
          } catch { return [] }
        },
        setAll: () => {},
      },
    })
    const { data: species } = await supabase
      .from('species')
      .select('id, slug, common_name, scientific_name, color, thumbnail_url')
      .eq('slug', slug)
      .single()

    if (!species) return null

    // Get unique sites where this species has been sighted
    const { data: sightings } = await supabase
      .from('species_sightings')
      .select('site_id, site:site_id(id, name, slug, country, depth_max_m)')
      .eq('species_id', species.id)
      .limit(50)

    // Deduplicate sites and count sightings
    const siteMap = new Map<string, SightingSite>()
    for (const s of sightings ?? []) {
      const key = (s.site as unknown as { id: string } | null)?.id
      if (!key) continue
      if (siteMap.has(key)) {
        const existing = siteMap.get(key)!
        existing.sighting_count++
      } else {
        siteMap.set(key, {
          site: s.site as unknown as SightingSite['site'],
          sighting_count: 1,
        })
      }
    }

    const sites = Array.from(siteMap.values()).sort((a, b) => b.sighting_count - a.sighting_count)

    return { species, sites }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const result = await getSpeciesBySlug(slug)
  if (!result) return { title: 'Species not found — DiveMap' }
  const { species } = result
  return {
    title: `${species.common_name} — DiveMap`,
    description: species.scientific_name
      ? `${species.common_name} (${species.scientific_name}) sighting locations and dive sites.`
      : `${species.common_name} dive sites and sighting locations on DiveMap.`,
  }
}

function depthColor(m: number | null | undefined): string {
  if (!m) return 'var(--tx3)'
  if (m < 20) return '#33d6c3'
  if (m < 40) return '#ffb703'
  if (m < 60) return '#ef476f'
  return '#0077b6'
}

export default async function SpeciesDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await getSpeciesBySlug(slug)

  if (!result) notFound()

  const { species, sites } = result
  const accentColor = species.color ?? 'var(--acc)'

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'var(--bg2)', borderBottom: '1px solid var(--line)',
          padding: '52px 16px 14px',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}
      >
        <Link
          href="/species"
          style={{
            width: '34px', height: '34px', borderRadius: '50%',
            border: '1px solid var(--line)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none', flexShrink: 0,
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16">
            <path d="M8 2L2.5 8L8 14" stroke="var(--tx2)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="font-mono font-semibold" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.1em' }}>
          MARINE LIFE
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          background: species.thumbnail_url
            ? `url(${species.thumbnail_url}) center/cover`
            : species.color
              ? `linear-gradient(160deg, ${species.color}22, ${species.color}55, var(--bg2))`
              : 'var(--bg2)',
          minHeight: '200px',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '24px 16px 20px',
        }}
      >
        {species.thumbnail_url && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(5,20,34,0.95))' }} />
        )}

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {/* Color swatch when no image */}
          {!species.thumbnail_url && species.color && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: species.color, border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
              <div className="font-mono" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.1em' }}>
                {species.color.toUpperCase()}
              </div>
            </div>
          )}
          <div className="font-extrabold" style={{ fontSize: '28px', color: 'var(--tx)', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            {species.common_name}
          </div>
          {species.scientific_name && (
            <div className="font-medium" style={{ fontSize: '13px', color: 'var(--tx3)', fontStyle: 'italic' }}>
              {species.scientific_name}
            </div>
          )}
        </div>
      </div>

      {/* Sightings section */}
      <div style={{ padding: '20px 16px 48px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <div className="font-bold" style={{ fontSize: '15px', color: 'var(--tx)' }}>Spotted at</div>
          <div className="font-mono font-semibold" style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.06em' }}>
            {sites.length} {sites.length === 1 ? 'SITE' : 'SITES'}
          </div>
        </div>

        {sites.length === 0 ? (
          <div
            style={{
              background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: '16px', padding: '28px 20px',
              textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center',
            }}
          >
            <div className="font-medium" style={{ fontSize: '13px', color: 'var(--tx3)' }}>
              No sightings logged yet.
            </div>
            <div className="font-medium" style={{ fontSize: '11px', color: 'var(--tx3)' }}>
              Log a dive and add a sighting to be first.
            </div>
            <Link
              href="/log-dive"
              style={{
                marginTop: '4px', padding: '9px 18px', borderRadius: '10px',
                background: 'var(--acc)', fontWeight: 700, fontSize: '12px',
                color: '#02222e', textDecoration: 'none',
              }}
            >
              Log a dive
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sites.map(({ site, sighting_count }) => {
              if (!site) return null
              const dColor = depthColor(site.depth_max_m)
              return (
                <Link key={site.id} href={`/sites/${site.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                  <div
                    style={{
                      background: 'var(--card)', border: '1px solid var(--line)',
                      borderRadius: '14px', borderLeft: `3px solid ${dColor}`,
                      padding: '12px 14px',
                      display: 'flex', alignItems: 'center', gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div className="font-bold truncate" style={{ fontSize: '13.5px', color: 'var(--tx)' }}>
                        {site.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {site.country && (
                          <span className="font-medium" style={{ fontSize: '11px', color: 'var(--tx3)' }}>
                            {site.country}
                          </span>
                        )}
                        {site.depth_max_m != null && (
                          <span className="font-mono font-semibold" style={{ fontSize: '10px', color: dColor }}>
                            to {site.depth_max_m}m
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                      <div
                        className="font-mono font-bold"
                        style={{ fontSize: '15px', color: accentColor }}
                      >
                        {sighting_count}
                      </div>
                      <div className="font-mono" style={{ fontSize: '7px', color: 'var(--tx3)', letterSpacing: '0.05em' }}>
                        {sighting_count === 1 ? 'SIGHT' : 'SIGHTS'}
                      </div>
                    </div>
                    <svg width="6" height="10" viewBox="0 0 6 10" fill="none" style={{ flexShrink: 0 }}>
                      <path d="M1 1l4 4-4 4" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

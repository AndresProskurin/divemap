import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import { getOperatorBySlug } from '@divemap/db'
import type { OperatorSiteLink } from '@divemap/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type Operator = Database['public']['Tables']['operators']['Row']

async function getData(slug: string): Promise<{ operator: Operator; sites: OperatorSiteLink[] } | null> {
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
    return await getOperatorBySlug(slug, supabase)
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const data = await getData(slug)
  if (!data) return { title: 'Operator — DiveMap' }
  return {
    title: `${data.operator.name} — DiveMap`,
    description: data.operator.description ?? `${data.operator.name}, dive operator in ${data.operator.country}.`,
  }
}

function depthColor(m: number | null): string {
  if (!m) return 'var(--tx3)'
  if (m < 20) return '#33d6c3'
  if (m < 40) return '#ffb703'
  if (m < 60) return '#ef476f'
  return '#0077b6'
}

export default async function OperatorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getData(slug)
  if (!data) notFound()

  const { operator: op, sites } = data

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--bg2)', borderBottom: op.tech_certified ? '3px solid var(--acc)' : '1px solid var(--line)',
          padding: '52px 16px 20px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}
      >
        <Link
          href="/operators"
          style={{
            width: '34px', height: '34px', borderRadius: '50%',
            border: '1px solid var(--line)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none',
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16">
            <path d="M8 2L2.5 8L8 14" stroke="var(--tx2)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span className="font-extrabold" style={{ fontSize: '25px', color: 'var(--tx)', lineHeight: 1.15 }}>
            {op.name}
          </span>
          {op.tech_certified && (
            <span
              className="font-mono font-bold"
              style={{
                fontSize: '9px', letterSpacing: '0.12em',
                color: '#02222e', background: 'var(--acc)',
                borderRadius: '5px', padding: '3px 8px',
              }}
            >
              TECH CERTIFIED
            </span>
          )}
        </div>
        <span className="font-medium" style={{ fontSize: '12px', color: 'var(--tx2)' }}>
          {op.base ? `${op.base} · ` : ''}{op.country}
        </span>

        {/* Stats strip */}
        <div style={{ display: 'flex', gap: '18px', marginTop: '4px' }}>
          {op.rating != null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="font-mono font-bold" style={{ fontSize: '17px', color: '#ffb703' }}>★ {op.rating.toFixed(1)}</span>
              <span className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.1em' }}>RATING</span>
            </div>
          )}
          {op.tech_dives_guided > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span className="font-mono font-bold" style={{ fontSize: '17px', color: 'var(--tx)' }}>
                {op.tech_dives_guided.toLocaleString()}
              </span>
              <span className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.1em' }}>TECH DIVES GUIDED</span>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span className="font-mono font-bold" style={{ fontSize: '17px', color: 'var(--tx)' }}>{sites.length}</span>
            <span className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.1em' }}>SITES SERVED</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '16px 16px 48px' }}>
        {/* Description */}
        {op.description && (
          <div
            style={{
              background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: '14px', padding: '14px 16px',
            }}
          >
            <p className="font-medium" style={{ fontSize: '13px', color: 'var(--tx2)', lineHeight: 1.6, margin: 0 }}>
              {op.description}
            </p>
          </div>
        )}

        {/* Certs */}
        {op.certs_offered.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="font-mono font-semibold" style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>
              CERTIFICATIONS OFFERED
            </span>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {op.certs_offered.map(cert => (
                <span
                  key={cert}
                  className="font-mono font-semibold"
                  style={{
                    fontSize: '10px', color: 'var(--acc)', letterSpacing: '0.04em',
                    background: 'var(--chip)', border: '1px solid rgba(0,180,216,0.35)',
                    borderRadius: '8px', padding: '5px 10px',
                  }}
                >
                  {cert}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Website */}
        {op.website && (
          <a
            href={op.website}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: '14px', padding: '13px 16px',
              fontSize: '13px', color: 'var(--acc)', textDecoration: 'none',
            }}
          >
            <span>Visit website</span>
            <span style={{ fontSize: '12px' }}>↗</span>
          </a>
        )}

        {/* Sites served */}
        {sites.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <span className="font-mono font-semibold" style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>
              DIVE SITES SERVED
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sites.map(site => {
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
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className="font-bold truncate" style={{ fontSize: '13.5px', color: 'var(--tx)' }}>{site.name}</span>
                        <span className="font-medium" style={{ fontSize: '10.5px', color: 'var(--tx3)' }}>
                          {site.country ?? ''}
                          <span className="font-mono" style={{ marginLeft: '8px', color: 'var(--tx3)', textTransform: 'uppercase', fontSize: '8.5px', letterSpacing: '0.08em' }}>
                            {site.type}
                          </span>
                        </span>
                      </div>
                      {site.depth_max_m != null && (
                        <span className="font-mono font-bold" style={{ fontSize: '12px', color: dColor, flexShrink: 0 }}>
                          {site.depth_max_m}m
                        </span>
                      )}
                      <svg width="6" height="10" viewBox="0 0 6 10" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M1 1l4 4-4 4" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

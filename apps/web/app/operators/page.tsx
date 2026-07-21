import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import { listOperators, getOperatorCountries } from '@divemap/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dive Operators — DiveMap',
  description: 'Find dive centres and technical operators at sites worldwide.',
}

type Operator = Database['public']['Tables']['operators']['Row']

const FORMSPREE_ID = process.env['NEXT_PUBLIC_FORMSPREE_FORM_ID']
const LIST_SHOP_HREF = FORMSPREE_ID
  ? `https://formspree.io/f/${FORMSPREE_ID}`
  : 'mailto:partners@divemap.app?subject=List%20my%20dive%20shop%20on%20DiveMap'

async function getData(country?: string, techOnly?: boolean): Promise<{ operators: Operator[]; countries: string[] }> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  if (!url || !key) return { operators: [], countries: [] }
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
    const [operators, countries] = await Promise.all([
      listOperators({ country, techOnly }, supabase),
      getOperatorCountries(supabase),
    ])
    return { operators, countries }
  } catch {
    return { operators: [], countries: [] }
  }
}

function OperatorCard({ op }: { op: Operator }) {
  return (
    <Link href={`/operators/${op.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div
        style={{
          background: 'var(--card)', border: '1px solid var(--line)',
          borderRadius: '16px', padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="font-bold" style={{ fontSize: '14.5px', color: 'var(--tx)' }}>{op.name}</span>
              {op.tech_certified && (
                <span
                  className="font-mono font-bold"
                  style={{
                    fontSize: '8px', letterSpacing: '0.1em',
                    color: '#02222e', background: 'var(--acc)',
                    borderRadius: '4px', padding: '2px 6px',
                  }}
                >
                  TECH
                </span>
              )}
            </div>
            <span className="font-medium" style={{ fontSize: '11px', color: 'var(--tx3)' }}>
              {op.base ? `${op.base} · ` : ''}{op.country}
            </span>
          </div>
          {op.rating != null && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', flexShrink: 0 }}>
              <span className="font-mono font-bold" style={{ fontSize: '15px', color: '#ffb703' }}>
                {op.rating.toFixed(1)}
              </span>
              <span className="font-mono" style={{ fontSize: '7px', color: 'var(--tx3)', letterSpacing: '0.08em' }}>RATING</span>
            </div>
          )}
        </div>

        {op.certs_offered.length > 0 && (
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {op.certs_offered.slice(0, 5).map(cert => (
              <span
                key={cert}
                className="font-mono font-semibold"
                style={{
                  fontSize: '8.5px', color: 'var(--tx2)', letterSpacing: '0.04em',
                  border: '1px solid var(--line)', borderRadius: '6px', padding: '3px 7px',
                }}
              >
                {cert}
              </span>
            ))}
            {op.certs_offered.length > 5 && (
              <span className="font-mono" style={{ fontSize: '8.5px', color: 'var(--tx3)', padding: '3px 2px' }}>
                +{op.certs_offered.length - 5}
              </span>
            )}
          </div>
        )}

        {op.tech_dives_guided > 0 && (
          <span className="font-mono" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.06em' }}>
            {op.tech_dives_guided.toLocaleString()} TECH DIVES GUIDED
          </span>
        )}
      </div>
    </Link>
  )
}

export default async function OperatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string; tech?: string }>
}) {
  const { country, tech } = await searchParams
  const techOnly = tech === '1'
  const { operators, countries } = await getData(country, techOnly)

  const buildHref = (c?: string, t?: boolean) => {
    const params = new URLSearchParams()
    if (c) params.set('country', c)
    if (t) params.set('tech', '1')
    const qs = params.toString()
    return qs ? `/operators?${qs}` : '/operators'
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'var(--bg2)', borderBottom: '1px solid var(--line)',
          padding: '52px 16px 12px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            href="/"
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
          <div style={{ flex: 1 }}>
            <div className="font-extrabold" style={{ fontSize: '20px', color: 'var(--tx)' }}>Dive Operators</div>
            <div className="font-medium" style={{ fontSize: '11px', color: 'var(--tx3)' }}>Centres &amp; technical guides worldwide</div>
          </div>
          <div className="font-mono font-semibold" style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.06em' }}>
            {operators.length} SHOPS
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
          <Link
            href={buildHref(country, !techOnly)}
            className="font-semibold"
            style={{
              flexShrink: 0, fontSize: '11px', borderRadius: '20px', padding: '6px 13px',
              textDecoration: 'none',
              color: techOnly ? '#02222e' : 'var(--tx2)',
              background: techOnly ? 'var(--acc)' : 'var(--chip)',
              border: `1px solid ${techOnly ? 'var(--acc)' : 'var(--line)'}`,
            }}
          >
            Tech certified
          </Link>
          <Link
            href={buildHref(undefined, techOnly)}
            className="font-semibold"
            style={{
              flexShrink: 0, fontSize: '11px', borderRadius: '20px', padding: '6px 13px',
              textDecoration: 'none',
              color: !country ? '#02222e' : 'var(--tx2)',
              background: !country ? 'var(--acc)' : 'var(--chip)',
              border: `1px solid ${!country ? 'var(--acc)' : 'var(--line)'}`,
            }}
          >
            All countries
          </Link>
          {countries.map(c => (
            <Link
              key={c}
              href={buildHref(c === country ? undefined : c, techOnly)}
              className="font-semibold"
              style={{
                flexShrink: 0, fontSize: '11px', borderRadius: '20px', padding: '6px 13px',
                textDecoration: 'none',
                color: c === country ? '#02222e' : 'var(--tx2)',
                background: c === country ? 'var(--acc)' : 'var(--chip)',
                border: `1px solid ${c === country ? 'var(--acc)' : 'var(--line)'}`,
              }}
            >
              {c}
            </Link>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px 24px' }}>
        {operators.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <p className="font-medium" style={{ fontSize: '13px', color: 'var(--tx3)' }}>
              No operators match these filters.
            </p>
          </div>
        ) : (
          operators.map(op => <OperatorCard key={op.id} op={op} />)
        )}
      </div>

      {/* List Your Shop CTA */}
      <div style={{ padding: '0 16px 48px' }}>
        <div
          style={{
            background: 'linear-gradient(140deg, #023e8a22, #0077b622)',
            border: '1px solid rgba(0,180,216,0.35)',
            borderRadius: '18px', padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-start',
          }}
        >
          <div className="font-mono font-semibold" style={{ fontSize: '9px', color: 'var(--acc)', letterSpacing: '0.14em' }}>
            FOR DIVE CENTRES
          </div>
          <div className="font-extrabold" style={{ fontSize: '18px', color: 'var(--tx)', lineHeight: 1.25 }}>
            Run a dive shop?<br />Get in front of divers planning their next trip.
          </div>
          <p className="font-medium" style={{ fontSize: '12px', color: 'var(--tx2)', lineHeight: 1.55, margin: 0 }}>
            Listed operators appear on every linked dive site with a tech badge, cert offerings, and direct contact.
          </p>
          <a
            href={LIST_SHOP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold"
            style={{
              marginTop: '4px', padding: '11px 22px', borderRadius: '12px',
              background: 'var(--acc)', fontSize: '13px', color: '#02222e',
              textDecoration: 'none',
              boxShadow: '0 6px 16px rgba(0,180,216,0.3)',
            }}
          >
            List your shop →
          </a>
        </div>
      </div>
    </div>
  )
}

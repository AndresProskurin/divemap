import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Marine Species — DiveMap',
  description: 'Discover the marine life you can spot at dive sites worldwide.',
}

type Species = {
  id: string
  slug: string
  common_name: string
  scientific_name: string | null
  color: string | null
  thumbnail_url: string | null
}

async function getSpecies(): Promise<Species[]> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  if (!url || !key) return []
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
    const { data } = await supabase
      .from('species')
      .select('id, slug, common_name, scientific_name, color, thumbnail_url')
      .order('common_name')
      .limit(200)
    return (data ?? []) as Species[]
  } catch {
    return []
  }
}

export default async function SpeciesPage() {
  const species = await getSpecies()

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
        <div className="font-extrabold" style={{ fontSize: '20px', color: 'var(--tx)', flex: 1 }}>Marine Life</div>
        <div
          className="font-mono font-semibold"
          style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.06em' }}
        >
          {species.length} SPECIES
        </div>
      </div>

      {/* Grid */}
      {species.length === 0 ? (
        <div style={{ padding: '60px 16px', textAlign: 'center' }}>
          <p className="font-medium" style={{ fontSize: '14px', color: 'var(--tx3)' }}>
            No species data yet. Check back after dives are logged with sightings.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '10px',
            padding: '14px 16px 48px',
          }}
        >
          {species.map(s => (
            <div
              key={s.id}
              style={{
                background: 'var(--card)',
                border: '1px solid var(--line)',
                borderRadius: '14px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Photo / color swatch */}
              <div
                style={{
                  height: '90px',
                  background: s.thumbnail_url
                    ? `url(${s.thumbnail_url}) center/cover`
                    : s.color
                      ? `linear-gradient(160deg, ${s.color}33, ${s.color}88)`
                      : 'linear-gradient(160deg, #0b2438, #12314b)',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {s.color && !s.thumbnail_url && (
                  <div
                    style={{
                      position: 'absolute', bottom: '8px', right: '8px',
                      width: '16px', height: '16px', borderRadius: '50%',
                      background: s.color, border: '2px solid rgba(255,255,255,0.3)',
                    }}
                  />
                )}
              </div>

              {/* Name */}
              <div style={{ padding: '10px 10px 12px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div
                  className="font-bold"
                  style={{ fontSize: '12.5px', color: 'var(--tx)', lineHeight: 1.2 }}
                >
                  {s.common_name}
                </div>
                {s.scientific_name && (
                  <div
                    style={{
                      fontSize: '9.5px',
                      color: 'var(--tx3)',
                      fontStyle: 'italic',
                      lineHeight: 1.3,
                    }}
                  >
                    {s.scientific_name}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

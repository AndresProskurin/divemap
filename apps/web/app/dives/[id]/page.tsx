import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

type FullDive = Database['public']['Tables']['dives']['Row'] & {
  site: { name: string; slug: string; country: string | null } | null
}

async function getDive(id: string): Promise<{ dive: FullDive; ownerId: string } | null> {
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
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const { data } = await supabase
      .from('dives')
      .select('*, site:site_id(name, slug, country)')
      .eq('id', id)
      .single()

    if (!data) return null
    // Only show own dives (or public ones)
    if (data.user_id !== session.user.id && !data.is_public) return null

    return { dive: data as unknown as FullDive, ownerId: session.user.id }
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const result = await getDive(id)
  if (!result) return { title: 'Dive — DiveMap' }
  const { dive } = result
  const siteName = dive.site?.name ?? 'Unknown site'
  const date = new Date(dive.dived_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  return { title: `${siteName} · ${date} — DiveMap` }
}

function gasName(o2: number | null, he: number | null): string {
  if (!o2) return 'Air'
  const heVal = he ?? 0
  if (heVal > 0) return `TMX ${o2}/${heVal}`
  if (o2 > 21) return `EAN${o2}`
  return 'Air'
}

function StatCell({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center', flex: 1 }}>
      <div
        className={mono ? 'font-mono font-bold' : 'font-bold'}
        style={{ fontSize: '18px', color: 'var(--tx)' }}
      >
        {value}
      </div>
      <div className="font-mono" style={{ fontSize: '8.5px', color: 'var(--tx3)', letterSpacing: '0.1em' }}>{label}</div>
    </div>
  )
}

export default async function DiveDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await getDive(id)

  if (!result) {
    // May just not be logged in
    const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
    const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
    if (url && key) {
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
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) redirect(`/auth/sign-in?next=/dives/${id}`)
      } catch { /* ignore */ }
    }
    notFound()
  }

  const { dive } = result
  const site = dive.site
  const date = new Date(dive.dived_at)
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const gas = gasName(dive.gas_o2, dive.gas_he)

  const depthColor = dive.max_depth_m < 20 ? '#33d6c3'
    : dive.max_depth_m < 40 ? '#ffb703'
    : dive.max_depth_m < 60 ? '#ef476f'
    : '#0077b6'

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
          href="/profile"
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
          <div className="font-extrabold" style={{ fontSize: '17px', color: 'var(--tx)' }}>
            {site ? (
              <Link href={`/sites/${site.slug}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                {site.name}
              </Link>
            ) : 'Dive Log'}
          </div>
          <div className="font-medium" style={{ fontSize: '10.5px', color: 'var(--tx3)' }}>{dateStr}</div>
        </div>
        {dive.rating != null && (
          <div className="font-mono font-bold" style={{ fontSize: '14px', color: '#ffb703' }}>
            {'★'.repeat(dive.rating)}{'☆'.repeat(5 - dive.rating)}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px 16px 48px' }}>
        {/* Primary stats */}
        <div
          style={{
            background: 'var(--card)', border: `1px solid ${depthColor}40`,
            borderTop: `3px solid ${depthColor}`,
            borderRadius: '16px', padding: '16px',
            display: 'flex', gap: '0',
          }}
        >
          <StatCell label="DEPTH" value={`${dive.max_depth_m}m`} />
          <div style={{ width: '1px', background: 'var(--line)' }} />
          <StatCell label="BOTTOM TIME" value={`${dive.bottom_time_min}min`} />
          {dive.runtime_min != null && (
            <>
              <div style={{ width: '1px', background: 'var(--line)' }} />
              <StatCell label="RUNTIME" value={`${dive.runtime_min}min`} />
            </>
          )}
        </div>

        {/* Gas + conditions */}
        <div
          style={{
            background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: '16px', padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}
        >
          <div className="font-mono font-semibold" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>
            GAS &amp; CONDITIONS
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '80px' }}>
              <div className="font-mono font-bold" style={{ fontSize: '15px', color: 'var(--acc)' }}>{gas}</div>
              <div className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.08em' }}>GAS MIX</div>
            </div>
            {dive.viz_m != null && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div className="font-mono font-bold" style={{ fontSize: '15px', color: 'var(--ok)' }}>{dive.viz_m}m</div>
                <div className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.08em' }}>VISIBILITY</div>
              </div>
            )}
            {dive.temp_surface_c != null && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div className="font-mono font-bold" style={{ fontSize: '15px', color: 'var(--tx)' }}>{dive.temp_surface_c}°C</div>
                <div className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.08em' }}>SURFACE</div>
              </div>
            )}
            {dive.temp_bottom_c != null && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div className="font-mono font-bold" style={{ fontSize: '15px', color: 'var(--tx2)' }}>{dive.temp_bottom_c}°C</div>
                <div className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.08em' }}>BOTTOM</div>
              </div>
            )}
            {dive.current_level && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div className="font-mono font-bold" style={{ fontSize: '15px', color: 'var(--tx2)', textTransform: 'capitalize' }}>{dive.current_level}</div>
                <div className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.08em' }}>CURRENT</div>
              </div>
            )}
            {dive.weight_kg != null && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div className="font-mono font-bold" style={{ fontSize: '15px', color: 'var(--tx)' }}>{dive.weight_kg}kg</div>
                <div className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.08em' }}>WEIGHT</div>
              </div>
            )}
          </div>
        </div>

        {/* Buddy */}
        {dive.buddy && (
          <div
            style={{
              background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: '14px', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: '10px',
            }}
          >
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(0,180,216,0.12)', border: '1px solid rgba(0,180,216,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '14px' }}>🤿</span>
            </div>
            <div>
              <div className="font-bold" style={{ fontSize: '13px', color: 'var(--tx)' }}>{dive.buddy}</div>
              <div className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.08em' }}>DIVE BUDDY</div>
            </div>
          </div>
        )}

        {/* Notes */}
        {dive.notes && (
          <div
            style={{
              background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: '14px', padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: '8px',
            }}
          >
            <div className="font-mono font-semibold" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>NOTES</div>
            <p className="font-medium" style={{ fontSize: '13px', color: 'var(--tx2)', lineHeight: 1.6, margin: 0 }}>
              {dive.notes}
            </p>
          </div>
        )}

        {/* Site link */}
        {site && (
          <Link
            href={`/sites/${site.slug}`}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              background: 'var(--card)', border: '1px solid var(--line)',
              borderRadius: '14px', padding: '12px 16px',
              textDecoration: 'none',
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div className="font-semibold" style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.1em' }}>VIEW SITE</div>
              <div className="font-bold" style={{ fontSize: '14px', color: 'var(--acc)' }}>{site.name}</div>
              {site.country && <div className="font-medium" style={{ fontSize: '11px', color: 'var(--tx3)' }}>{site.country}</div>}
            </div>
            <svg width="7" height="12" viewBox="0 0 7 12" fill="none">
              <path d="M1 1l5 5-5 5" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        )}
      </div>
    </div>
  )
}

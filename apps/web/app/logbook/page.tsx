import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import { getUserDives } from '@divemap/db'
import type { DiveWithSite } from '@divemap/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Logbook — DiveMap',
  description: 'Your personal dive log.',
}

async function getData(): Promise<{ dives: DiveWithSite[] } | null> {
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
    const dives = await getUserDives(session.user.id, supabase, 500)
    return { dives }
  } catch {
    return null
  }
}

function gasName(o2: number | null, he: number | null): string {
  if (!o2) return 'Air'
  const heVal = he ?? 0
  if (heVal > 0) return `TMX ${o2}/${heVal}`
  if (o2 > 21) return `EAN${o2}`
  return 'Air'
}

function depthColor(m: number): string {
  if (m < 20) return '#33d6c3'
  if (m < 40) return '#ffb703'
  if (m < 60) return '#ef476f'
  return '#0077b6'
}

function StatCell({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div style={{ flex: 1, padding: '14px 8px', display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
        <span className="font-mono font-bold" style={{ fontSize: '22px', color: 'var(--tx)', lineHeight: 1 }}>{value}</span>
        {unit && <span className="font-mono" style={{ fontSize: '10px', color: 'var(--tx3)' }}>{unit}</span>}
      </div>
      <span className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>{label}</span>
    </div>
  )
}

export default async function LogbookPage() {
  const data = await getData()
  if (!data) redirect('/auth/sign-in?next=/logbook')

  const { dives } = data

  const totalDives = dives.length
  const deepest = dives.reduce((m, d) => Math.max(m, d.max_depth_m), 0)
  const longest = dives.reduce((m, d) => Math.max(m, d.bottom_time_min), 0)
  const totalMinutes = dives.reduce((s, d) => s + d.bottom_time_min, 0)
  const totalHours = totalMinutes / 60

  // Group by year, newest first (dives arrive sorted by dived_at desc).
  const byYear = new Map<number, DiveWithSite[]>()
  for (const dive of dives) {
    const year = new Date(dive.dived_at).getFullYear()
    const list = byYear.get(year)
    if (list) list.push(dive)
    else byYear.set(year, [dive])
  }

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
          <div className="font-extrabold" style={{ fontSize: '20px', color: 'var(--tx)' }}>Logbook</div>
          <div className="font-medium" style={{ fontSize: '11px', color: 'var(--tx3)' }}>Every dive, on record</div>
        </div>
        <Link
          href="/log-dive"
          className="font-bold"
          style={{
            fontSize: '12px', color: '#02222e', background: 'var(--acc)',
            borderRadius: '10px', padding: '8px 14px', textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(0,180,216,0.3)',
          }}
        >
          + Log dive
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '14px 16px 48px' }}>
        {/* Stats summary */}
        <div
          style={{
            display: 'flex',
            background: 'var(--card)', border: '1px solid var(--line)',
            borderRadius: '16px', overflow: 'hidden',
          }}
        >
          <StatCell value={String(totalDives)} label="DIVES" />
          <div style={{ width: '1px', background: 'var(--line)' }} />
          <StatCell value={String(deepest)} unit="m" label="DEEPEST" />
          <div style={{ width: '1px', background: 'var(--line)' }} />
          <StatCell value={String(longest)} unit="min" label="LONGEST" />
          <div style={{ width: '1px', background: 'var(--line)' }} />
          <StatCell value={totalHours >= 10 ? String(Math.round(totalHours)) : totalHours.toFixed(1)} unit="h" label="BOTTOM TIME" />
        </div>

        {/* History */}
        {totalDives === 0 ? (
          <div
            style={{
              padding: '56px 20px', textAlign: 'center',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px',
              background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: '16px',
            }}
          >
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <circle cx="22" cy="22" r="19" stroke="var(--line)" strokeWidth="1.5" />
              <path d="M22 12v14M22 26l-5-5M22 26l5-5" stroke="var(--acc)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="14" y1="32" x2="30" y2="32" stroke="var(--line)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span className="font-bold" style={{ fontSize: '15px', color: 'var(--tx)' }}>No dives logged yet</span>
              <span className="font-medium" style={{ fontSize: '12px', color: 'var(--tx3)' }}>
                Your logbook starts with the first entry.
              </span>
            </div>
            <Link
              href="/log-dive"
              className="font-bold"
              style={{
                padding: '11px 22px', borderRadius: '12px',
                background: 'var(--acc)', fontSize: '13px', color: '#02222e',
                textDecoration: 'none',
              }}
            >
              Log your first dive
            </Link>
          </div>
        ) : (
          Array.from(byYear.entries()).map(([year, yearDives]) => (
            <div key={year} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span className="font-mono font-bold" style={{ fontSize: '13px', color: 'var(--tx)' }}>{year}</span>
                <span className="font-mono" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.08em' }}>
                  {yearDives.length} {yearDives.length === 1 ? 'DIVE' : 'DIVES'}
                </span>
                <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
              </div>

              {yearDives.map(dive => {
                const dColor = depthColor(dive.max_depth_m)
                const date = new Date(dive.dived_at)
                return (
                  <Link key={dive.id} href={`/dives/${dive.id}`} style={{ textDecoration: 'none', display: 'block' }}>
                    <div
                      style={{
                        background: 'var(--card)', border: '1px solid var(--line)',
                        borderRadius: '14px', padding: '11px 13px',
                        display: 'flex', alignItems: 'center', gap: '12px',
                      }}
                    >
                      {/* Depth badge */}
                      <div
                        style={{
                          width: '42px', height: '42px', borderRadius: '11px', flexShrink: 0,
                          background: `${dColor}16`, border: `1px solid ${dColor}45`,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <span className="font-mono font-bold" style={{ fontSize: '12.5px', color: dColor, lineHeight: 1.1 }}>
                          {dive.max_depth_m}
                        </span>
                        <span className="font-mono" style={{ fontSize: '7px', color: dColor, opacity: 0.75 }}>M</span>
                      </div>

                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                          <span className="font-bold truncate" style={{ fontSize: '13px', color: 'var(--tx)' }}>
                            {dive.site?.name ?? 'Unknown site'}
                          </span>
                          <span className="font-mono flex-shrink-0" style={{ fontSize: '9.5px', color: 'var(--tx3)' }}>
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <span className="font-mono font-semibold" style={{ fontSize: '10.5px', color: 'var(--tx2)' }}>
                          {dive.bottom_time_min} min ·{' '}
                          <span style={{ color: 'var(--acc)' }}>{gasName(dive.gas_o2, dive.gas_he)}</span>
                          {dive.buddy && <span style={{ color: 'var(--tx3)' }}> · w/ {dive.buddy}</span>}
                        </span>
                      </div>

                      <svg width="6" height="10" viewBox="0 0 6 10" fill="none" style={{ flexShrink: 0 }}>
                        <path d="M1 1l4 4-4 4" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

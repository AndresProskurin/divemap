import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import { getUserDives } from '@divemap/db'
import type { DiveWithSite } from '@divemap/db'
import Link from 'next/link'
import { LogbookView } from './LogbookView'

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

        <LogbookView dives={dives} />
      </div>
    </div>
  )
}

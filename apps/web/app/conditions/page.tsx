import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Recent Conditions — DiveMap',
  description: 'Live conditions reports from divers around the world. Plan your next dive.',
}

type ReportWithSite = {
  id: string
  viz_m: number
  current_level: string
  temp_surface_c: number | null
  temp_bottom_c: number | null
  notes: string | null
  reported_at: string
  site: {
    id: string
    name: string
    slug: string
    country: string | null
  } | null
}

async function getRecentReports(): Promise<ReportWithSite[]> {
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
      .from('conditions_reports')
      .select('id, viz_m, current_level, temp_surface_c, temp_bottom_c, notes, reported_at, site:site_id(id, name, slug, country)')
      .order('reported_at', { ascending: false })
      .limit(40)
    return (data ?? []) as unknown as ReportWithSite[]
  } catch {
    return []
  }
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diffMs / 3_600_000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const CURRENT_GLYPHS: Record<string, string> = {
  none: '—', mild: '›', moderate: '‹›', strong: '›‹›', ripping: '‹›‹›',
}

const VIZ_COLOR = (m: number) => {
  if (m < 5) return 'var(--dang)'
  if (m < 10) return 'var(--warn)'
  if (m < 18) return 'var(--tx2)'
  return 'var(--ok)'
}

function VizBar({ m }: { m: number }) {
  const pct = Math.min(100, (m / 30) * 100)
  return (
    <div style={{ height: '3px', borderRadius: '2px', background: 'var(--line)', overflow: 'hidden', width: '60px' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: VIZ_COLOR(m), borderRadius: '2px', transition: 'width 0.3s' }} />
    </div>
  )
}

function ReportCard({ report }: { report: ReportWithSite }) {
  const site = report.site
  const glyph = CURRENT_GLYPHS[report.current_level] ?? '—'

  return (
    <div
      style={{
        background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '16px',
        padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px',
      }}
    >
      {/* Site + time */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        {site ? (
          <Link
            href={`/sites/${site.slug}`}
            style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}
          >
            <div className="font-bold truncate" style={{ fontSize: '13.5px', color: 'var(--acc)' }}>{site.name}</div>
            {site.country && (
              <div className="font-medium" style={{ fontSize: '10.5px', color: 'var(--tx3)' }}>{site.country}</div>
            )}
          </Link>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--tx3)' }}>Unknown site</div>
        )}
        <div className="font-mono flex-shrink-0" style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.05em' }}>
          {timeAgo(report.reported_at)}
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Viz */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span className="font-mono font-bold" style={{ fontSize: '16px', color: VIZ_COLOR(report.viz_m) }}>
              {report.viz_m}m
            </span>
            <span className="font-mono" style={{ fontSize: '8.5px', color: 'var(--tx3)' }}>VIZ</span>
          </div>
          <VizBar m={report.viz_m} />
        </div>

        {/* Current */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span
            className="font-mono font-bold"
            style={{ fontSize: '14px', color: 'var(--tx2)', letterSpacing: '-0.02em' }}
          >
            {glyph}
          </span>
          <span className="font-mono" style={{ fontSize: '8.5px', color: 'var(--tx3)', textTransform: 'capitalize' }}>
            {report.current_level}
          </span>
        </div>

        {/* Temps */}
        {(report.temp_surface_c != null || report.temp_bottom_c != null) && (
          <div style={{ display: 'flex', gap: '10px' }}>
            {report.temp_surface_c != null && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                <span className="font-mono font-bold" style={{ fontSize: '13px', color: 'var(--tx)' }}>
                  {report.temp_surface_c}°
                </span>
                <span className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)' }}>SURF</span>
              </div>
            )}
            {report.temp_bottom_c != null && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'center' }}>
                <span className="font-mono font-bold" style={{ fontSize: '13px', color: 'var(--tx2)' }}>
                  {report.temp_bottom_c}°
                </span>
                <span className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)' }}>BTM</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {report.notes && (
        <p className="font-medium" style={{ fontSize: '12px', color: 'var(--tx3)', lineHeight: 1.5, margin: 0 }}>
          &ldquo;{report.notes}&rdquo;
        </p>
      )}

      {/* Report conditions CTA */}
      {site && (
        <Link
          href={`/sites/${site.slug}/report`}
          className="font-semibold"
          style={{
            alignSelf: 'flex-start',
            fontSize: '10.5px', color: 'var(--tx3)',
            borderRadius: '8px', padding: '4px 10px',
            border: '1px solid var(--line)', textDecoration: 'none',
          }}
        >
          Report here too →
        </Link>
      )}
    </div>
  )
}

export default async function ConditionsPage() {
  const reports = await getRecentReports()

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
        <div style={{ flex: 1 }}>
          <div className="font-extrabold" style={{ fontSize: '20px', color: 'var(--tx)' }}>Conditions Feed</div>
          <div className="font-medium" style={{ fontSize: '11px', color: 'var(--tx3)' }}>Live reports from divers worldwide</div>
        </div>
        <div
          className="font-mono font-semibold"
          style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.06em' }}
        >
          {reports.length} REPORTS
        </div>
      </div>

      {/* Feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px 48px' }}>
        {reports.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <p className="font-medium" style={{ fontSize: '14px', color: 'var(--tx3)' }}>
              No conditions reports yet.
            </p>
            <p className="font-medium" style={{ fontSize: '12px', color: 'var(--tx3)', marginTop: '6px' }}>
              Be the first — visit a site page and tap &ldquo;Report Conditions&rdquo;.
            </p>
          </div>
        ) : (
          reports.map(r => <ReportCard key={r.id} report={r} />)
        )}
      </div>
    </div>
  )
}

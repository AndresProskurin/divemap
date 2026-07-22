'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import Link from 'next/link'
import type { DiveWithSite } from '@divemap/db'

// ── Helpers ───────────────────────────────────────────────────────────────────

function gasName(o2: number | null, he: number | null): string {
  // gas_o2/gas_he are stored as fractions 0-1 (deco-engine GasMix convention).
  if (!o2) return 'Air'
  const pO2 = Math.round(o2 * 100)
  const pHe = Math.round((he ?? 0) * 100)
  if (pHe > 0) return `TMX ${pO2}/${pHe}`
  if (pO2 > 21) return `EAN${pO2}`
  return 'Air'
}

function depthColor(m: number): string {
  if (m < 20) return '#33d6c3'
  if (m < 40) return '#ffb703'
  if (m < 60) return '#ef476f'
  return '#0077b6'
}

// Depth-range filter chips share the depth-band boundaries used everywhere else.
const DEPTH_BANDS = [
  { label: 'All depths', min: 0, max: Infinity },
  { label: '<20 m', min: 0, max: 20 },
  { label: '20–40 m', min: 20, max: 40 },
  { label: '40–60 m', min: 40, max: 60 },
  { label: '60 m+', min: 60, max: Infinity },
] as const

// ── Charts (hand-rolled SVG, same idiom as the planner profile) ──────────────

const MONTH_LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

/** Dives per month over the trailing 12 months, oldest first. */
function divesPerMonth(dives: DiveWithSite[]): Array<{ label: string; count: number }> {
  const now = new Date()
  const buckets: Array<{ label: string; count: number; key: string }> = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({
      label: MONTH_LABELS[d.getMonth()] ?? '',
      count: 0,
      key: `${d.getFullYear()}-${d.getMonth()}`,
    })
  }
  const byKey = new Map(buckets.map((b) => [b.key, b]))
  for (const dive of dives) {
    const d = new Date(dive.dived_at)
    const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`)
    if (bucket) bucket.count++
  }
  return buckets
}

function BarChart({ data, accent }: { data: Array<{ label: string; count: number }>; accent?: (i: number) => string }) {
  const W = 320
  const H = 96
  const max = Math.max(1, ...data.map((d) => d.count))
  const bw = W / data.length
  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {data.map((d, i) => {
        const h = d.count === 0 ? 2 : (d.count / max) * (H - 8)
        return (
          <g key={i}>
            <rect
              x={i * bw + bw * 0.18}
              y={H - h}
              width={bw * 0.64}
              height={h}
              rx={3}
              fill={d.count === 0 ? 'var(--line)' : (accent?.(i) ?? 'var(--acc)')}
            />
            {d.count > 0 && (
              <text
                x={i * bw + bw / 2}
                y={H - h - 4}
                textAnchor="middle"
                style={{ font: "600 8px 'IBM Plex Mono', monospace", fill: 'var(--tx2)' }}
              >
                {d.count}
              </text>
            )}
            <text
              x={i * bw + bw / 2}
              y={H + 11}
              textAnchor="middle"
              style={{ font: "600 7.5px 'IBM Plex Mono', monospace", fill: 'var(--tx3)' }}
            >
              {d.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--card)', border: '1px solid var(--line)',
        borderRadius: '16px', padding: '13px 14px',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}
    >
      <span className="font-mono font-semibold" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>
        {title}
      </span>
      {children}
    </div>
  )
}

// ── Main view ─────────────────────────────────────────────────────────────────

interface Props {
  dives: DiveWithSite[]
}

export function LogbookView({ dives }: Props) {
  // ── Filters (task 4.2: year, site, buddy, depth range) ───────────────────
  const [year, setYear] = useState<'all' | number>('all')
  const [site, setSite] = useState<'all' | string>('all')
  const [buddy, setBuddy] = useState('')
  const [band, setBand] = useState(0)

  const years = useMemo(
    () => Array.from(new Set(dives.map((d) => new Date(d.dived_at).getFullYear()))).sort((a, b) => b - a),
    [dives],
  )
  const sites = useMemo(() => {
    const seen = new Map<string, string>()
    for (const d of dives) if (d.site) seen.set(d.site.slug, d.site.name)
    return Array.from(seen.entries()).sort((a, b) => a[1].localeCompare(b[1]))
  }, [dives])

  const filtered = useMemo(() => {
    const b = DEPTH_BANDS[band] ?? DEPTH_BANDS[0]
    const buddyQ = buddy.trim().toLowerCase()
    return dives.filter((d) => {
      if (year !== 'all' && new Date(d.dived_at).getFullYear() !== year) return false
      if (site !== 'all' && d.site?.slug !== site) return false
      if (buddyQ && !(d.buddy ?? '').toLowerCase().includes(buddyQ)) return false
      if (d.max_depth_m < b.min || d.max_depth_m >= b.max) return false
      return true
    })
  }, [dives, year, site, buddy, band])

  const filtering = year !== 'all' || site !== 'all' || buddy.trim() !== '' || band !== 0

  // ── Stats over the filtered set (task 4.3) ───────────────────────────────
  const monthly = useMemo(() => divesPerMonth(filtered), [filtered])
  const histogram = useMemo(() => {
    const bands = [
      { label: '<10', min: 0, max: 10 },
      { label: '10–20', min: 10, max: 20 },
      { label: '20–30', min: 20, max: 30 },
      { label: '30–40', min: 30, max: 40 },
      { label: '40+', min: 40, max: Infinity },
    ]
    return bands.map((b) => ({
      label: b.label,
      count: filtered.filter((d) => d.max_depth_m >= b.min && d.max_depth_m < b.max).length,
      color: depthColor(b.min),
    }))
  }, [filtered])
  const topSites = useMemo(() => {
    const counts = new Map<string, { name: string; slug: string; count: number }>()
    for (const d of filtered) {
      if (!d.site) continue
      const cur = counts.get(d.site.slug)
      if (cur) cur.count++
      else counts.set(d.site.slug, { name: d.site.name, slug: d.site.slug, count: 1 })
    }
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [filtered])
  const maxTopCount = Math.max(1, ...topSites.map((s) => s.count))

  // ── Grouping for the list ────────────────────────────────────────────────
  const byYear = useMemo(() => {
    const m = new Map<number, DiveWithSite[]>()
    for (const dive of filtered) {
      const y = new Date(dive.dived_at).getFullYear()
      const list = m.get(y)
      if (list) list.push(dive)
      else m.set(y, [dive])
    }
    return m
  }, [filtered])

  const selectStyle: CSSProperties = {
    background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px',
    color: 'var(--tx)', font: "600 12px 'Archivo', sans-serif", padding: '8px 10px',
  }

  return (
    <>
      {/* ── Filter bar ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <select value={year} onChange={(e) => setYear(e.target.value === 'all' ? 'all' : Number(e.target.value))} style={selectStyle}>
            <option value="all">All years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={site} onChange={(e) => setSite(e.target.value)} style={selectStyle}>
            <option value="all">All sites</option>
            {sites.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
          <input
            value={buddy}
            onChange={(e) => setBuddy(e.target.value)}
            placeholder="Buddy…"
            style={{ ...selectStyle, background: 'var(--inputbg, var(--card))', width: '110px' }}
          />
        </div>
        <div data-scroll="1" style={{ display: 'flex', gap: '7px', overflowX: 'auto' }}>
          {DEPTH_BANDS.map((b, i) => (
            <button
              key={b.label}
              onClick={() => setBand(i)}
              className="font-semibold"
              style={{
                flex: 'none', fontSize: '11.5px', whiteSpace: 'nowrap', cursor: 'pointer',
                color: band === i ? 'var(--acc)' : 'var(--tx3)',
                background: band === i ? 'var(--chip)' : 'transparent',
                border: `1px solid ${band === i ? 'rgba(0,180,216,0.4)' : 'var(--line)'}`,
                borderRadius: '999px', padding: '7px 12px',
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
        {filtering && (
          <span className="font-mono" style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.08em' }}>
            {filtered.length} OF {dives.length} DIVES MATCH
          </span>
        )}
      </div>

      {/* ── Stats dashboard ── */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <ChartCard title="DIVES PER MONTH · LAST 12">
            <BarChart data={monthly} />
          </ChartCard>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <ChartCard title="DEPTH DISTRIBUTION">
              <BarChart data={histogram} accent={(i) => histogram[i]?.color ?? 'var(--acc)'} />
            </ChartCard>
            <ChartCard title="TOP SITES">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {topSites.length === 0 && (
                  <span style={{ fontSize: '11px', color: 'var(--tx3)', fontStyle: 'italic' }}>No sites yet.</span>
                )}
                {topSites.map((s) => (
                  <Link key={s.slug} href={`/sites/${s.slug}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '6px' }}>
                      <span className="font-semibold truncate" style={{ fontSize: '11px', color: 'var(--tx2)' }}>{s.name}</span>
                      <span className="font-mono font-bold" style={{ fontSize: '10.5px', color: 'var(--tx)' }}>{s.count}</span>
                    </div>
                    <div style={{ height: '4px', borderRadius: '2px', background: 'var(--line)', overflow: 'hidden' }}>
                      <div style={{ width: `${(s.count / maxTopCount) * 100}%`, height: '100%', background: 'var(--acc)' }} />
                    </div>
                  </Link>
                ))}
              </div>
            </ChartCard>
          </div>
        </div>
      )}

      {/* ── History ── */}
      {filtered.length === 0 ? (
        <div
          style={{
            padding: '40px 20px', textAlign: 'center',
            background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: '16px',
          }}
        >
          <span className="font-medium" style={{ fontSize: '12.5px', color: 'var(--tx3)' }}>
            {filtering ? 'No dives match these filters.' : 'No dives logged yet.'}
          </span>
        </div>
      ) : (
        Array.from(byYear.entries()).map(([y, yearDives]) => (
          <div key={y} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
              <span className="font-mono font-bold" style={{ fontSize: '13px', color: 'var(--tx)' }}>{y}</span>
              <span className="font-mono" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.08em' }}>
                {yearDives.length} {yearDives.length === 1 ? 'DIVE' : 'DIVES'}
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
            </div>

            {yearDives.map((dive) => {
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
    </>
  )
}

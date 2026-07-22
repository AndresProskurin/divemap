'use client'

import type { ConditionsReport } from '@divemap/db'
import type { CurrentLevel } from '@divemap/db'

const CURRENT_GLYPHS: Record<CurrentLevel, string> = {
  none: '○',
  mild: '›',
  moderate: '››',
  strong: '›››',
  ripping: '›‣›',
}

const CURRENT_LABELS: Record<CurrentLevel, string> = {
  none: 'None',
  mild: 'Mild',
  moderate: 'Moderate',
  strong: 'Strong',
  ripping: 'Ripping',
}

function VizDots({ vizM }: { vizM: number }) {
  const filled = Math.min(5, Math.round(vizM / 6))
  return (
    <span style={{ letterSpacing: '3px', fontSize: '10px' }}>
      <span style={{ color: 'var(--acc)' }}>{'●'.repeat(filled)}</span>
      <span style={{ color: 'var(--line)' }}>{'●'.repeat(5 - filled)}</span>
    </span>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * 7-day viz trend sparkline (design screen 02). Real reports, oldest → newest
 * left to right; hidden below two points because a one-dot trend is noise.
 */
function VizTrend({ reports }: { reports: ConditionsReport[] }) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  const points = reports
    .filter((r) => new Date(r.reported_at).getTime() >= cutoff)
    .slice(0, 12)
    .reverse()
  if (points.length < 2) return null

  const maxViz = Math.max(...points.map((p) => p.viz_m), 1)
  const W = 120
  const H = 26
  const poly = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * W
      const y = H - 3 - (p.viz_m / maxViz) * (H - 8)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <>
      <svg width="100%" height="26" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ marginTop: '4px' }}>
        <polyline points={poly} fill="none" stroke="var(--acc)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <span className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.1em' }}>
        7-DAY TREND
      </span>
    </>
  )
}

interface Props {
  siteSlug: string
  reports: ConditionsReport[]
}

export function ConditionsTab({ siteSlug, reports }: Props) {
  const latest = reports[0]

  return (
    <div className="flex flex-col gap-[14px] p-4" style={{ animation: 'dmFade 0.25s ease' }}>
      {latest ? (
        <div className="flex gap-[10px]">
          <div
            className="flex-1 flex flex-col gap-[3px] rounded-14 p-[14px]"
            style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
          >
            <span
              className="font-mono font-semibold uppercase"
              style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.12em' }}
            >
              VISIBILITY
            </span>
            <span className="font-mono font-bold" style={{ fontSize: '24px', color: 'var(--tx)' }}>
              {latest.viz_m}m
            </span>
            <VizDots vizM={latest.viz_m} />
            <VizTrend reports={reports} />
          </div>
          <div
            className="flex-1 flex flex-col gap-[3px] rounded-14 p-[14px]"
            style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
          >
            <span
              className="font-mono font-semibold uppercase"
              style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.12em' }}
            >
              CURRENT
            </span>
            <span className="font-mono font-bold" style={{ fontSize: '24px', color: 'var(--tx)' }}>
              {CURRENT_GLYPHS[latest.current_level]}
            </span>
            <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--tx2)' }}>
              {CURRENT_LABELS[latest.current_level]}
            </span>
          </div>
        </div>
      ) : (
        <p style={{ fontSize: '13px', color: 'var(--tx3)', fontStyle: 'italic' }}>
          No conditions reported yet.
        </p>
      )}

      {latest && (latest.temp_surface_c || latest.temp_bottom_c) && (
        <div
          className="flex flex-col gap-2 rounded-14 p-[14px]"
          style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
        >
          <span
            className="font-mono font-semibold uppercase"
            style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.12em' }}
          >
            WATER TEMP
          </span>
          {latest.temp_surface_c != null && (
            <div
              className="flex justify-between font-mono font-semibold"
              style={{
                fontSize: '12.5px',
                borderBottom: '1px solid var(--line)',
                padding: '6px 0',
              }}
            >
              <span style={{ color: 'var(--tx3)' }}>Surface</span>
              <span style={{ color: 'var(--tx)' }}>{latest.temp_surface_c}°C</span>
            </div>
          )}
          {latest.temp_bottom_c != null && (
            <div
              className="flex justify-between font-mono font-semibold"
              style={{ fontSize: '12.5px', padding: '6px 0' }}
            >
              <span style={{ color: 'var(--tx3)' }}>Bottom</span>
              <span style={{ color: 'var(--tx)' }}>{latest.temp_bottom_c}°C</span>
            </div>
          )}
        </div>
      )}

      {reports.length > 0 && (
        <div className="flex flex-col gap-2">
          <span
            className="font-mono font-semibold uppercase"
            style={{ fontSize: '10px', color: 'var(--tx3)', letterSpacing: '0.12em' }}
          >
            RECENT REPORTS
          </span>
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex gap-[10px] items-center rounded-12 px-[12px] py-[10px]"
              style={{ border: '1px solid var(--line)', background: 'var(--card)' }}
            >
              <div
                className="w-2 h-2 rounded-full flex-none"
                style={{ background: 'var(--acc)' }}
              />
              <div className="flex flex-col gap-[2px]">
                <span style={{ fontSize: '11.5px', color: 'var(--tx2)', fontWeight: 500 }}>
                  Viz {r.viz_m}m · {CURRENT_LABELS[r.current_level]} current
                  {r.notes ? ` · ${r.notes}` : ''}
                </span>
                <span className="font-mono" style={{ fontSize: '9px', color: 'var(--tx3)' }}>
                  {formatDate(r.reported_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <a
        href={`/sites/${siteSlug}/report`}
        className="block rounded-[13px] p-3 text-center font-bold"
        style={{
          border: '1.5px solid var(--acc)',
          color: 'var(--acc)',
          fontSize: '13px',
          textDecoration: 'none',
        }}
      >
        Report conditions
      </a>
    </div>
  )
}

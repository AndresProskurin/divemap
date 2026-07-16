'use client'

import type { DiveSite } from '@divemap/db'

interface Props {
  site: DiveSite
}

function calcMod(o2Pct: number, maxPpo2 = 1.4): number {
  return Math.round((maxPpo2 / (o2Pct / 100) - 10) * 10) / 10
}

const MIXES = [
  { label: 'EAN21', o2: 21 },
  { label: 'EAN32', o2: 32 },
  { label: 'EAN36', o2: 36 },
  { label: 'EAN50', o2: 50 },
  { label: 'O₂ 100%', o2: 100 },
]

export function TechPlanTab({ site }: Props) {
  return (
    <div className="flex flex-col gap-[12px] p-4" style={{ animation: 'dmFade 0.25s ease' }}>
      <div
        className="flex flex-col gap-[7px] rounded-14 p-[14px]"
        style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
      >
        <span
          className="font-mono font-semibold uppercase"
          style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.12em' }}
        >
          MOD QUICK TABLE · ppO₂ 1.4
        </span>
        {MIXES.map((mix) => (
          <div
            key={mix.label}
            className="flex justify-between font-mono font-semibold"
            style={{
              fontSize: '12.5px',
              borderBottom: '1px solid var(--line)',
              padding: '6px 0',
            }}
          >
            <span style={{ color: 'var(--tx2)' }}>{mix.label}</span>
            <span style={{ color: 'var(--tx)' }}>{calcMod(mix.o2)}m</span>
          </div>
        ))}
        <p style={{ fontSize: '10.5px', color: 'var(--tx3)', fontWeight: 500 }}>
          Site depth: {site.depth_min_m}–{site.depth_max_m}m. Plan gas to bottom depth.
        </p>
      </div>

      <a
        href={`/planner?site=${site.slug}&depth=${site.depth_max_m}`}
        className="block rounded-[13px] p-[13px] text-center font-bold"
        style={{
          background: 'var(--chip)',
          border: '1px solid rgba(0,180,216,0.4)',
          color: 'var(--acc)',
          fontSize: '13px',
          textDecoration: 'none',
        }}
      >
        Open Tech Planner →
      </a>
    </div>
  )
}

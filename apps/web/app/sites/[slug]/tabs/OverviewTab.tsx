'use client'

import type { DiveSite } from '@divemap/db'
import type { MarineSpecies } from '@divemap/db'
import { ReviewsSection } from '../ReviewsSection'

const SPECIES_COLORS = [
  '#33d6c3', '#00b4d8', '#ffb703', '#ff5d7d', '#9fc3da',
  '#48cae4', '#0077b6', '#ef476f', '#33d6c3', '#ffb703',
]

function renderDescription(text: string) {
  return text.split(/\n\n+/).map((para, i) => (
    <p key={i} className="leading-relaxed" style={{ color: 'var(--tx2)', fontSize: '13px' }}>
      {para.trim()}
    </p>
  ))
}

interface Props {
  site: DiveSite
  marineLife: MarineSpecies[]
}

export function OverviewTab({ site, marineLife }: Props) {
  return (
    <div className="flex flex-col gap-4 p-4" style={{ animation: 'dmFade 0.25s ease' }}>
      {site.description && (
        <div className="flex flex-col gap-2">
          {renderDescription(site.description)}
        </div>
      )}

      {site.insider_notes && (
        <div
          className="flex flex-col gap-2 rounded-14 p-[14px]"
          style={{
            background: 'var(--chip)',
            border: '1px solid rgba(0,180,216,0.4)',
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="font-mono font-semibold tracking-widest uppercase"
              style={{ fontSize: '10px', color: 'var(--acc)', letterSpacing: '0.14em' }}
            >
              🤿 INSIDER NOTES
            </span>
            <span style={{ fontSize: '10px', color: 'var(--tx3)', fontWeight: 500 }}>
              from our technical divers
            </span>
          </div>
          <p
            className="leading-relaxed"
            style={{ fontSize: '13px', color: 'var(--tx)', fontWeight: 500 }}
          >
            {site.insider_notes}
          </p>
        </div>
      )}

      {marineLife.length > 0 && (
        <div className="flex flex-col gap-2">
          <span
            className="font-mono font-semibold uppercase"
            style={{ fontSize: '10px', color: 'var(--tx3)', letterSpacing: '0.12em' }}
          >
            MARINE LIFE · SPOTTED THIS MONTH
          </span>
          <div className="flex flex-wrap gap-[7px]">
            {marineLife.map((species, i) => (
              <div
                key={species.id}
                className="flex items-center gap-[6px] rounded-full px-[11px] py-[6px]"
                style={{ border: '1px solid var(--line)', background: 'var(--card)' }}
              >
                <div
                  className="w-[7px] h-[7px] rounded-full flex-none"
                  style={{ background: species.color ?? SPECIES_COLORS[i % SPECIES_COLORS.length] }}
                />
                <span style={{ fontSize: '11.5px', color: 'var(--tx2)', fontWeight: 600 }}>
                  {species.common_name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!site.description && !site.insider_notes && (
        <p style={{ fontSize: '13px', color: 'var(--tx3)', fontStyle: 'italic' }}>
          No description yet.
        </p>
      )}

      <ReviewsSection siteId={site.id} />
    </div>
  )
}

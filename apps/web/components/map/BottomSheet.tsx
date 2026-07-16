'use client'

import type { DiveSite } from '@divemap/db'
import { colors } from '@divemap/ui'

interface BottomSheetProps {
  site: DiveSite
  onClose: () => void
}

function vizDots(score: number | null): string {
  const filled = Math.round(score ?? 0)
  return '●'.repeat(filled) + '○'.repeat(5 - filled)
}

function depthLabel(site: DiveSite): string {
  if (site.depth_min_m === site.depth_max_m) return `${site.depth_max_m} m`
  return `${site.depth_min_m}–${site.depth_max_m} m`
}

const CURRENT_COLOR: Record<string, string> = {
  none:     colors.ok,
  mild:     colors.ok,
  moderate: colors.warn,
  strong:   colors.dang,
  ripping:  colors.dang,
}

export function BottomSheet({ site, onClose }: BottomSheetProps) {
  const currentColor = site.current_level
    ? (CURRENT_COLOR[site.current_level] ?? colors.tx3)
    : colors.tx3

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 z-10"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="absolute left-0 right-0 bottom-0 z-20 rounded-t-[20px]
                   flex flex-col gap-3"
        style={{
          background: colors.sheet,
          boxShadow: '0 -12px 34px rgba(0,0,0,0.5)',
          padding: '9px 14px 32px',
        }}
      >
        {/* Handle */}
        <div
          className="mx-auto rounded-full"
          style={{ width: 36, height: 4, background: colors.line }}
        />

        {/* Site card */}
        <div
          className="flex gap-3 items-center rounded-[14px] p-[9px]"
          style={{ background: colors.card, border: `1px solid ${colors.line}` }}
        >
          {/* Thumbnail placeholder */}
          <div
            className="flex-none rounded-[10px] bg-[#0c2640]"
            style={{ width: 60, height: 60 }}
          >
            {site.hero_photo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={site.hero_photo_url}
                alt={site.name}
                className="w-full h-full object-cover rounded-[10px]"
              />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col gap-[3px]">
            <div className="flex items-center gap-[7px]">
              <span
                className="font-bold text-[14px] text-[#eaf6fd] truncate"
                style={{ fontFamily: "'Archivo', sans-serif" }}
              >
                {site.name}
              </span>
              <span
                className="flex-none text-[8.5px] font-semibold border rounded-[5px] px-[5px] py-[2px] uppercase tracking-[0.08em]"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: colors.acc,
                  borderColor: colors.acc,
                }}
              >
                {site.type}
              </span>
            </div>

            <div
              className="text-[10.5px] font-medium"
              style={{ fontFamily: "'Archivo', sans-serif", color: colors.tx3 }}
            >
              {site.region ? `${site.region} · ${site.country}` : site.country}
            </div>

            <div
              className="flex gap-[9px] items-center text-[10.5px] font-semibold"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            >
              <span style={{ color: colors.tx2 }}>{depthLabel(site)}</span>
              <span className="text-[9px] tracking-[2px]">
                <span style={{ color: colors.acc }}>{vizDots(site.viz_score).slice(0, Math.round(site.viz_score ?? 0))}</span>
                <span style={{ color: colors.line }}>{vizDots(site.viz_score).slice(Math.round(site.viz_score ?? 0))}</span>
              </span>
            </div>
          </div>

          {/* Right col */}
          <div className="flex-none flex flex-col items-end gap-[5px]">
            {site.rating && (
              <span
                className="text-[12.5px] font-bold"
                style={{ fontFamily: "'Archivo', sans-serif", color: colors.tx }}
              >
                ★ {site.rating.toFixed(1)}
              </span>
            )}
            {site.current_level && (
              <span
                className="text-[9px] font-semibold uppercase tracking-[0.06em]"
                style={{ fontFamily: "'IBM Plex Mono', monospace", color: currentColor }}
              >
                {site.current_level}
              </span>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          className="w-full text-center font-bold text-[13.5px] rounded-full py-3"
          style={{
            fontFamily: "'Archivo', sans-serif",
            background: colors.acc,
            color: '#02222e',
            boxShadow: '0 8px 22px rgba(0,180,216,0.4)',
          }}
        >
          View Site
        </button>
      </div>
    </>
  )
}

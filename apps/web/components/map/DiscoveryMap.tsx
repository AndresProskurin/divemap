'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type { DiveSite } from '@divemap/db'
import type { Enums } from '@divemap/db'
import { DiveMap } from './DiveMap'
import { FilterBar } from './FilterBar'
import { SearchBar } from './SearchBar'
import { colors } from '@divemap/ui'

interface DiscoveryMapProps {
  initialSites: DiveSite[]
}

export function DiscoveryMap({ initialSites }: DiscoveryMapProps) {
  const params = useSearchParams()

  // Apply URL-param filters client-side.
  const filteredSites = useMemo(() => {
    let sites = initialSites
    const typeFilter = params.get('type') as Enums<'site_type'> | null
    const techFilter = params.get('tech')

    if (typeFilter) sites = sites.filter((s) => s.type === typeFilter)
    if (techFilter === '1') {
      // "tech-friendly": depth ≥ 30 m or type in cave/wall/wreck
      sites = sites.filter(
        (s) => s.depth_max_m >= 30 || ['cave', 'wall', 'wreck'].includes(s.type)
      )
    }
    return sites
  }, [initialSites, params])

  return (
    <div className="relative w-full h-full">
      {/* Map fills the viewport */}
      <DiveMap sites={filteredSites} />

      {/* HUD overlay */}
      <div
        className="absolute top-0 left-0 right-0 z-10 flex flex-col gap-[9px]"
        style={{ paddingTop: 64, paddingLeft: 14, paddingRight: 14 }}
      >
        {/* Search bar */}
        <SearchBar />

        {/* Filter chips */}
        <FilterBar />

        {/* Offline indicator */}
        <div>
          <div
            className="inline-flex items-center gap-[6px] rounded-full"
            style={{
              background: 'rgba(6,24,40,0.75)',
              padding: '5px 10px',
            }}
          >
            <div
              className="rounded-full"
              style={{ width: 6, height: 6, background: colors.ok }}
            />
            <span
              className="text-[9px] font-semibold tracking-[0.1em]"
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                color: colors.tx2,
              }}
            >
              {filteredSites.length} SITES LOADED
            </span>
          </div>
        </div>
      </div>

      {/* Log a Dive FAB */}
      <button
        className="absolute right-4 z-20 flex items-center gap-[8px] rounded-full font-bold text-[13.5px]"
        style={{
          bottom: 'calc(env(safe-area-inset-bottom, 0px) + 120px)',
          background: colors.acc,
          color: '#02222e',
          padding: '13px 18px 13px 15px',
          boxShadow: '0 8px 22px rgba(0,180,216,0.4)',
          fontFamily: "'Archivo', sans-serif",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16">
          <line x1="8" y1="2.5" x2="8" y2="13.5" stroke="#02222e" strokeWidth="2.4" strokeLinecap="round"/>
          <line x1="2.5" y1="8" x2="13.5" y2="8" stroke="#02222e" strokeWidth="2.4" strokeLinecap="round"/>
        </svg>
        Log a Dive
      </button>
    </div>
  )
}

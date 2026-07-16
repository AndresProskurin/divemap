'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@divemap/db'
import type { DiveSite } from '@divemap/db'
import { colors } from '@divemap/ui'

interface SearchBarProps {
  onSelect?: (site: DiveSite) => void
}

interface GeoResult {
  id: string
  place_name: string
  center: [number, number]
}

type Result =
  | { kind: 'site'; site: DiveSite }
  | { kind: 'geo';  geo: GeoResult }

export function SearchBar({ onSelect }: SearchBarProps) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [open,    setOpen]    = useState(false)
  const inputRef              = useRef<HTMLInputElement>(null)
  const timerRef              = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }

    const supabase = createClient()

    // Parallel: Supabase full-text + Mapbox Geocoding.
    const [siteRes, geoRes] = await Promise.all([
      supabase
        .from('dive_sites')
        .select('id,slug,name,country,region,depth_min_m,depth_max_m,type,lat,lng,viz_score,current_level,rating,hero_photo_url,created_by,created_at,updated_at,description,insider_notes,level,avg_temp_c')
        .ilike('name', `%${q}%`)
        .limit(5),
      fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
        `?access_token=${process.env['NEXT_PUBLIC_MAPBOX_TOKEN']}&types=place,country&limit=3`
      ).then((r) => r.json()).catch(() => ({ features: [] })),
    ])

    const siteResults: Result[] = (siteRes.data ?? []).map((s) => ({
      kind: 'site' as const,
      site: s as DiveSite,
    }))

    const geoResults: Result[] = ((geoRes.features ?? []) as GeoResult[]).map((g) => ({
      kind: 'geo' as const,
      geo: g,
    }))

    setResults([...siteResults, ...geoResults])
    setOpen(true)
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value
    setQuery(v)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => search(v), 280)
  }

  // Close on outside click.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!inputRef.current?.closest('[data-searchbar]')?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div data-searchbar="" className="relative" style={{ fontFamily: "'Archivo', sans-serif" }}>
      {/* Input */}
      <div
        className="flex items-center gap-[10px] rounded-[13px]"
        style={{
          background: 'rgba(6,24,40,0.88)',
          border: '1px solid rgba(148,196,230,0.18)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          padding: '12px 14px',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 15 15" className="flex-none">
          <circle cx="6.2" cy="6.2" r="4.8" stroke={colors.tx2} strokeWidth="1.6" fill="none"/>
          <line x1="9.9" y1="9.9" x2="13.6" y2="13.6" stroke={colors.tx2} strokeWidth="1.6" strokeLinecap="round"/>
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search 10,000+ dive sites"
          className="flex-1 bg-transparent outline-none text-[13px] font-medium"
          style={{ color: query ? colors.tx : '#7fa5bd' }}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false) }}
            className="flex-none text-[#638aa3] hover:text-[#9fc3da]"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-[13px] overflow-hidden z-50"
          style={{
            background: 'rgba(8,28,48,0.97)',
            border: `1px solid ${colors.line}`,
            backdropFilter: 'blur(10px)',
          }}
        >
          {results.map((r, i) => {
            if (r.kind === 'site') {
              const s = r.site
              return (
                <button
                  key={`site-${s.id}`}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[rgba(0,180,216,0.08)] transition-colors"
                  style={{ borderBottom: i < results.length - 1 ? `1px solid ${colors.line}` : undefined }}
                  onClick={() => { setQuery(s.name); setOpen(false); onSelect?.(s) }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" className="flex-none">
                    <circle cx="7" cy="5.5" r="3" stroke={colors.acc} strokeWidth="1.5" fill="none"/>
                    <path d="M7 13C7 13 2 8.5 2 5.5a5 5 0 0110 0C12 8.5 7 13 7 13z" stroke={colors.acc} strokeWidth="1.5" fill="none"/>
                  </svg>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold truncate" style={{ color: colors.tx }}>{s.name}</div>
                    <div className="text-[10.5px] font-medium" style={{ color: colors.tx3, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {s.country} · {s.depth_min_m}–{s.depth_max_m} m
                    </div>
                  </div>
                  <span
                    className="flex-none text-[8px] font-semibold border rounded-[4px] px-[4px] py-[1px] uppercase tracking-[0.08em]"
                    style={{ color: colors.acc, borderColor: colors.acc, fontFamily: "'IBM Plex Mono', monospace" }}
                  >
                    {s.type}
                  </span>
                </button>
              )
            }
            return (
              <button
                key={`geo-${r.geo.id}`}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[rgba(0,180,216,0.08)] transition-colors"
                style={{ borderBottom: i < results.length - 1 ? `1px solid ${colors.line}` : undefined }}
                onClick={() => { setQuery(r.geo.place_name); setOpen(false) }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" className="flex-none">
                  <circle cx="7" cy="7" r="5.5" stroke={colors.tx3} strokeWidth="1.4" fill="none"/>
                  <path d="M7 1.5v11M1.5 7h11" stroke={colors.tx3} strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                <span className="text-[13px] font-medium truncate" style={{ color: colors.tx2 }}>
                  {r.geo.place_name}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

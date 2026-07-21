'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import Supercluster from 'supercluster'
import type { DiveSite } from '@divemap/db'
import { BottomSheet } from './BottomSheet'
import { colors } from '@divemap/ui'

import 'mapbox-gl/dist/mapbox-gl.css'

// Depth-band colour mapping (CLAUDE.md spec).
function depthColor(maxDepth: number): string {
  if (maxDepth < 20) return colors.depthShallow  // #33d6c3 teal
  if (maxDepth < 40) return colors.depthMid      // #ffb703 amber
  if (maxDepth < 60) return colors.depthDeep     // #ef476f coral
  return colors.depthTech                         // #0077b6 navy
}

interface DiveMapProps {
  sites: DiveSite[]
  /** Called when a single marker is clicked. */
  onSiteClick?: (site: DiveSite) => void
}

const MAPBOX_STYLE_DARK = 'mapbox://styles/mapbox/dark-v11'
const MAPBOX_STYLE_SAT  = 'mapbox://styles/mapbox/satellite-streets-v12'
const WATER_COLOR       = '#023e8a'

export function DiveMap({ sites, onSiteClick }: DiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<mapboxgl.Map | null>(null)
  const clusterRef   = useRef<Supercluster | null>(null)
  const markersRef   = useRef<mapboxgl.Marker[]>([])
  const teardownRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [selectedSite, setSelectedSite]   = useState<DiveSite | null>(null)
  const [isSatellite, setIsSatellite]     = useState(false)
  const [mapReady, setMapReady]           = useState(false)

  // Build supercluster index from sites.
  useEffect(() => {
    const index = new Supercluster({ radius: 60, maxZoom: 16 })
    index.load(
      sites.map((s) => ({
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
        properties: { siteId: s.id },
      }))
    )
    clusterRef.current = index
  }, [sites])

  // Render markers for the current viewport.
  const renderMarkers = useCallback(() => {
    const map = mapRef.current
    const cluster = clusterRef.current
    if (!map || !cluster) return

    // Clear existing markers.
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const bounds = map.getBounds()
    if (!bounds) return
    const zoom = Math.floor(map.getZoom())
    const bbox: [number, number, number, number] = [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ]

    const points = cluster.getClusters(bbox, zoom)

    points.forEach((point) => {
      const coords = point.geometry.coordinates
      const lng = coords[0] as number
      const lat = coords[1] as number
      const props = point.properties

      const el = document.createElement('div')

      if (props['cluster']) {
        // Cluster bubble.
        const count = props['point_count'] as number
        const size = count < 10 ? 32 : count < 50 ? 40 : 48
        el.style.cssText = `
          width:${size}px;height:${size}px;border-radius:50%;
          background:${colors.acc};color:#02222e;
          border:2px solid #eaf6fd;
          display:flex;align-items:center;justify-content:center;
          font:700 11px 'IBM Plex Mono',monospace;
          box-shadow:0 0 0 6px rgba(0,180,216,0.2),0 2px 10px rgba(0,0,0,0.5);
          cursor:pointer;
        `
        el.textContent = String(count)
        el.addEventListener('click', () => {
          const expansionZoom = Math.min(cluster.getClusterExpansionZoom(props['cluster_id'] as number), 20)
          map.easeTo({ center: [lng, lat], zoom: expansionZoom })
        })
      } else {
        // Single-site marker.
        const siteId = props['siteId'] as string
        const site   = sites.find((s) => s.id === siteId)
        if (!site) return

        const color  = depthColor(site.depth_max_m)
        el.style.cssText = `
          width:14px;height:14px;border-radius:50%;
          background:${color};
          border:2px solid #eaf6fd;
          box-shadow:0 0 0 6px ${color}33,0 2px 10px rgba(0,0,0,0.5);
          cursor:pointer;
        `
        el.addEventListener('click', () => {
          setSelectedSite(site)
          onSiteClick?.(site)
        })
      }

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([lng, lat])
        .addTo(map)

      markersRef.current.push(marker)
    })
  }, [sites, onSiteClick])

  // Initialise map once.
  useEffect(() => {
    // A pending teardown means this is StrictMode remounting us, not a real
    // unmount — cancel it and keep the existing map (see the cleanup below).
    if (teardownRef.current) {
      clearTimeout(teardownRef.current)
      teardownRef.current = null
    }

    if (!containerRef.current) return
    const token = process.env['NEXT_PUBLIC_MAPBOX_TOKEN']
    if (!token) { console.error('NEXT_PUBLIC_MAPBOX_TOKEN not set'); return }

    if (!mapRef.current) {
      mapboxgl.accessToken = token
      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: MAPBOX_STYLE_DARK,
        center: [34.9, 24.0],  // Red Sea default
        zoom: 4,
        attributionControl: false,
      })

      map.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-left')
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')

      map.on('load', () => {
        // Custom water colour: target fill layers whose id contains 'water' or 'ocean'.
        const layers = map.getStyle()?.layers ?? []
        layers.forEach((l) => {
          if (l.type === 'fill' && (l.id.includes('water') || l.id.includes('ocean'))) {
            try { map.setPaintProperty(l.id, 'fill-color', WATER_COLOR) } catch { /* not on this style */ }
          }
          if (l.type === 'background' && l.id.includes('water')) {
            try { map.setPaintProperty(l.id, 'background-color', WATER_COLOR) } catch { /* not on this style */ }
          }
        })
        setMapReady(true)
      })

      map.on('moveend', renderMarkers)
      map.on('zoomend', renderMarkers)

      mapRef.current = map
    }

    const map = mapRef.current
    // Defer teardown by a tick. StrictMode runs cleanup and then re-runs this
    // effect synchronously; removing the map inline tears down mapbox-gl's
    // shared worker pool and the map created microseconds later never finishes
    // loading its style — no tiles, no `load` event, so no markers ever render.
    return () => {
      teardownRef.current = setTimeout(() => {
        map.remove()
        mapRef.current = null
        teardownRef.current = null
      }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-render markers when map is ready or sites change.
  useEffect(() => {
    if (mapReady) renderMarkers()
  }, [mapReady, renderMarkers])

  // Style toggle.
  const toggleStyle = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const next = isSatellite ? MAPBOX_STYLE_DARK : MAPBOX_STYLE_SAT
    map.setStyle(next)
    map.once('style.load', () => {
      if (!isSatellite) {
        // Reapply water on dark style (satellite has its own water).
        const styleLayers = map.getStyle()?.layers ?? []
        styleLayers.forEach((l) => {
          if (l.type === 'fill' && (l.id.includes('water') || l.id.includes('ocean'))) {
            try { map.setPaintProperty(l.id, 'fill-color', WATER_COLOR) } catch { /* not on this style */ }
          }
        })
      }
      renderMarkers()
    })
    setIsSatellite((v) => !v)
  }, [isSatellite, renderMarkers])

  return (
    <div className="relative w-full h-full">
      {/* Map canvas. mapbox-gl.css sets `.mapboxgl-map { position: relative }`
          and Next appends component CSS after globals, so it wins over
          Tailwind's `absolute` — inset-0 alone leaves the container 0px tall.
          Size it explicitly so the fill holds whichever rule applies. */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Style toggle — task 1.4 */}
      <button
        onClick={toggleStyle}
        title={isSatellite ? 'Switch to dark ocean' : 'Switch to satellite'}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center
                   bg-[rgba(6,24,40,0.88)] border border-[rgba(148,196,230,0.18)]
                   backdrop-blur-[10px] text-[#9fc3da] hover:text-[#00b4d8] transition-colors"
      >
        {isSatellite ? (
          // Map icon
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M2 7h14M7 2v14" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        ) : (
          // Satellite icon
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M9 2v2M9 14v2M2 9h2M14 9h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {/* Bottom sheet */}
      {selectedSite && (
        <BottomSheet site={selectedSite} onClose={() => setSelectedSite(null)} />
      )}
    </div>
  )
}

/**
 * Native Mapbox discovery map (design screen 01).
 *
 * @rnmapbox/maps is a native module: this renders only in a dev build
 * (expo run:ios), never in Expo Go. Clustering runs natively in the style
 * layer — no supercluster on the JS thread, unlike the web map.
 */

import { useMemo, useRef } from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import Mapbox, {
  MapView,
  Camera,
  ShapeSource,
  CircleLayer,
  SymbolLayer,
} from '@rnmapbox/maps'
import { useRouter } from 'expo-router'
import type { MapSite } from '@divemap/db'
import { colors } from '@divemap/ui'

const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN
if (token) Mapbox.setAccessToken(token)

// Same depth bands and colours as every other surface (CLAUDE.md spec).
const DEPTH_STOPS = [20, colors.depthMid, 40, colors.depthDeep, 60, colors.depthTech] as const

interface Props {
  sites: MapSite[]
}

export function DiscoveryMap({ sites }: Props) {
  const router = useRouter()
  const cameraRef = useRef<Camera>(null)
  const mapRef = useRef<MapView>(null)

  async function zoomBy(delta: number) {
    const z = (await mapRef.current?.getZoom()) ?? 3
    cameraRef.current?.zoomTo(Math.min(16, Math.max(1, z + delta)), 250)
  }

  const collection = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: sites.map((s) => ({
        type: 'Feature' as const,
        id: s.id,
        geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
        properties: {
          slug: s.slug,
          depth: s.depth_max_m ?? 20,
          featured: (s.rating ?? 0) >= 4.8,
        },
      })),
    }),
    [sites],
  )

  if (!token) {
    return (
      <View style={s.fallback}>
        <Text style={s.fallbackText}>Set EXPO_PUBLIC_MAPBOX_TOKEN in apps/mobile/.env</Text>
      </View>
    )
  }

  return (
    <View style={s.wrap}>
      <MapView
        ref={mapRef}
        style={s.map}
        styleURL="mapbox://styles/mapbox/dark-v11"
        logoEnabled={false}
        attributionPosition={{ bottom: 4, left: 4 }}
        scaleBarEnabled={false}
        // Pan + pinch/double-tap zoom only: accidental rotation and tilt are
        // what makes a small embedded map feel broken.
        rotateEnabled={false}
        pitchEnabled={false}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{ centerCoordinate: [34.9, 24.0], zoomLevel: 3 }}
        />
        <ShapeSource
          id="sites"
          shape={collection}
          cluster
          clusterRadius={50}
          clusterMaxZoomLevel={14}
          onPress={async (e) => {
            const feature = e.features[0]
            if (!feature) return
            const props = feature.properties as Record<string, unknown> | null
            if (props?.['cluster']) {
              // Zoom towards the cluster; native expansion zoom isn't exposed
              // cleanly, a fixed step mirrors the web map feel well enough.
              const coords = (feature.geometry as GeoJSON.Point).coordinates
              const current = e.point ? undefined : undefined
              cameraRef.current?.setCamera({
                centerCoordinate: [coords[0] ?? 0, coords[1] ?? 0],
                zoomLevel: Math.min(14, ((props['point_count'] as number) > 50 ? 6 : 8)),
                animationDuration: 500,
              })
              void current
              return
            }
            const slug = props?.['slug']
            if (typeof slug === 'string') router.push(`/sites/${slug}`)
          }}
        >
          {/* Cluster bubble + count */}
          <CircleLayer
            id="clusters"
            filter={['has', 'point_count']}
            style={{
              circleColor: colors.acc,
              circleRadius: ['step', ['get', 'point_count'], 14, 10, 18, 50, 22],
              circleStrokeWidth: 2,
              circleStrokeColor: '#eaf6fd',
              circleOpacity: 0.92,
            }}
          />
          <SymbolLayer
            id="cluster-count"
            filter={['has', 'point_count']}
            style={{
              textField: ['get', 'point_count_abbreviated'],
              textSize: 11,
              textColor: '#02222e',
              textFont: ['DIN Pro Bold', 'Arial Unicode MS Bold'],
              textAllowOverlap: true,
            }}
          />
          {/* Single-site pins, depth-banded */}
          <CircleLayer
            id="site-pins"
            filter={['!', ['has', 'point_count']]}
            style={{
              circleColor: ['step', ['get', 'depth'], colors.depthShallow, ...DEPTH_STOPS],
              circleRadius: ['case', ['get', 'featured'], 8, 6],
              circleStrokeWidth: 2,
              circleStrokeColor: '#eaf6fd',
            }}
          />
        </ShapeSource>
      </MapView>

      {/* Zoom controls — pinch works on device (Option+drag in the
          Simulator), but visible buttons match the web map's affordance. */}
      <View style={s.zoomControls}>
        <TouchableOpacity style={s.zoomBtn} onPress={() => zoomBy(1)} accessibilityLabel="Zoom in">
          <Text style={s.zoomBtnText}>+</Text>
        </TouchableOpacity>
        <View style={s.zoomDivider} />
        <TouchableOpacity style={s.zoomBtn} onPress={() => zoomBy(-1)} accessibilityLabel="Zoom out">
          <Text style={s.zoomBtnText}>−</Text>
        </TouchableOpacity>
        <View style={s.zoomDivider} />
        <TouchableOpacity
          style={s.zoomBtn}
          onPress={() => cameraRef.current?.setCamera({ centerCoordinate: [34.9, 24.0], zoomLevel: 3, animationDuration: 600 })}
          accessibilityLabel="Reset view"
        >
          <Text style={[s.zoomBtnText, { fontSize: 13 }]}>◎</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  wrap: {
    marginHorizontal: 14,
    height: 300,
    marginBottom: 4,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.line,
  },
  map: { flex: 1 },
  zoomControls: {
    position: 'absolute', right: 10, top: 10,
    backgroundColor: 'rgba(6,24,40,0.88)',
    borderWidth: 1, borderColor: colors.line,
    borderRadius: 12, overflow: 'hidden',
  },
  zoomBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  zoomBtnText: { fontSize: 20, color: colors.tx2, lineHeight: 22 },
  zoomDivider: { height: 1, backgroundColor: colors.line },
  fallback: {
    marginHorizontal: 14,
    height: 300,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: { fontSize: 11, color: colors.tx3 },
})

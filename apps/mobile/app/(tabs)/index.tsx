import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Link } from 'expo-router'
import { createClient } from '../../lib/supabase'
import type { SiteListItem, MapSite } from '@divemap/db'
import { browseSites, getMapSites } from '@divemap/db'
import { DiscoveryMap } from '../../components/DiscoveryMap'
import { colors } from '@divemap/ui'

const TYPES = ['reef', 'wreck', 'wall', 'cave', 'cenote', 'drift', 'muck'] as const

function depthColor(m: number | null): string {
  if (!m) return colors.tx3
  if (m < 20) return colors.depthShallow
  if (m < 40) return colors.depthMid
  if (m < 60) return colors.depthDeep
  return colors.depthTech
}

function SiteCard({ site, onPress }: { site: SiteListItem; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.78} style={s.card}>
      {/* Depth bar strip */}
      <View style={[s.depthStrip, { backgroundColor: depthColor(site.depth_max_m) }]} />
      <View style={s.cardBody}>
        {/* Header row */}
        <View style={s.cardHeader}>
          <View style={s.typeBadge}>
            <Text style={s.typeText}>{site.type.toUpperCase()}</Text>
          </View>
          {site.rating != null && (
            <Text style={s.rating}>★ {site.rating.toFixed(1)}</Text>
          )}
        </View>
        <Text style={s.siteName} numberOfLines={1}>{site.name}</Text>
        <Text style={s.siteCountry} numberOfLines={1}>{site.country ?? ''}</Text>
        {/* Stats */}
        <View style={s.statsRow}>
          {site.depth_max_m != null && (
            <Text style={[s.statText, { color: depthColor(site.depth_max_m) }]}>
              ↓{site.depth_max_m}m
            </Text>
          )}
          {site.level != null && (
            <Text style={s.statText}>{site.level}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  const [activeType, setActiveType] = useState<string | null>(null)
  const [sites, setSites] = useState<SiteListItem[]>([])
  const [mapSites, setMapSites] = useState<MapSite[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Map pins load once — the map shows the whole catalogue, not the filter.
  useEffect(() => {
    let cancelled = false
    getMapSites(createClient()).then((rows) => {
      if (!cancelled) setMapSites(rows)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const supabase = createClient()
      const result = await browseSites(
        { query: query || undefined, type: activeType ?? undefined, pageSize: 30 },
        supabase,
      )
      if (!cancelled) {
        setSites(result.sites)
        setTotal(result.total)
        setLoading(false)
      }
    }
    const t = setTimeout(load, query ? 350 : 0)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, activeType])

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.logo}>DIVEMAP</Text>
        <Text style={s.totalText}>{total.toLocaleString()} SITES</Text>
      </View>

      {/* Search bar */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder="Search dive sites…"
          placeholderTextColor={colors.tx3}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Type filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.hScroll}
        contentContainerStyle={s.chips}
      >
        {TYPES.map(t => {
          const active = activeType === t
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setActiveType(active ? null : t)}
              style={[s.chip, active && s.chipActive]}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Native Mapbox map */}
      <DiscoveryMap sites={mapSites} />

      {/* Site list label */}
      <View style={s.listHeader}>
        <Text style={s.listHeaderText}>NEARBY SITES</Text>
        {loading && <ActivityIndicator size="small" color={colors.acc} />}
      </View>

      {/* Site cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.hScroll}
        contentContainerStyle={s.cardList}
      >
        {sites.length === 0 && !loading ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No sites found</Text>
          </View>
        ) : (
          sites.map(site => (
            <Link key={site.id} href={`/sites/${site.slug}`} asChild>
              <SiteCard site={site} onPress={() => {}} />
            </Link>
          ))
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  logo: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    fontWeight: '700',
    fontSize: 17,
    color: colors.tx,
    letterSpacing: 3,
  },
  totalText: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    fontSize: 9,
    color: colors.tx3,
    letterSpacing: 1,
  },
  searchWrap: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.tx,
    borderWidth: 1,
    borderColor: colors.line,
  },
  hScroll: {
    flexGrow: 0,
  },
  chips: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: {
    backgroundColor: colors.chip,
    borderColor: colors.acc,
  },
  chipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: colors.tx3,
  },
  chipTextActive: {
    color: colors.acc,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
  },
  listHeaderText: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    fontSize: 9,
    color: colors.tx3,
    letterSpacing: 2,
    fontWeight: '600',
  },
  cardList: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 10,
    flexDirection: 'row',
  },
  card: {
    width: 160,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  depthStrip: {
    height: 3,
  },
  cardBody: {
    padding: 12,
    gap: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  typeBadge: {
    backgroundColor: colors.acc,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  typeText: {
    fontSize: 7.5,
    fontWeight: '700',
    color: '#04121f',
    letterSpacing: 0.8,
  },
  rating: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.tx2,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  siteName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.tx,
  },
  siteCountry: {
    fontSize: 10.5,
    fontWeight: '500',
    color: colors.tx3,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  statText: {
    fontSize: 10.5,
    fontWeight: '600',
    color: colors.tx2,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    textTransform: 'capitalize',
  },
  emptyCard: {
    width: 200,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: colors.tx3,
    fontStyle: 'italic',
  },
})

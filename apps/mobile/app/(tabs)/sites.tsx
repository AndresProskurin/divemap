import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Link } from 'expo-router'
import { browseSites } from '@divemap/db'
import { createClient } from '../../lib/supabase'
import type { SiteListItem } from '@divemap/db'
import { colors } from '@divemap/ui'

function depthColor(m: number | null): string {
  if (!m) return colors.tx3
  if (m < 20) return colors.depthShallow
  if (m < 40) return colors.depthMid
  if (m < 60) return colors.depthDeep
  return colors.depthTech
}

function SiteRow({ site }: { site: SiteListItem }) {
  return (
    <Link href={`/sites/${site.slug}`} asChild>
      <TouchableOpacity activeOpacity={0.75} style={s.row}>
        <View style={[s.depthDot, { backgroundColor: depthColor(site.depth_max_m) }]} />
        <View style={s.rowBody}>
          <Text style={s.rowName} numberOfLines={1}>{site.name}</Text>
          <Text style={s.rowSub} numberOfLines={1}>
            {[site.country, site.type].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <View style={s.rowRight}>
          {site.depth_max_m != null && (
            <Text style={[s.depth, { color: depthColor(site.depth_max_m) }]}>
              ↓{site.depth_max_m}m
            </Text>
          )}
          {site.rating != null && (
            <Text style={s.rowRating}>★ {site.rating.toFixed(1)}</Text>
          )}
        </View>
        <Text style={s.chevron}>›</Text>
      </TouchableOpacity>
    </Link>
  )
}

export default function SitesScreen() {
  const insets = useSafeAreaInsets()
  const [query, setQuery] = useState('')
  const [sites, setSites] = useState<SiteListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)

  async function load(q: string, p: number, append = false) {
    if (p === 1) setLoading(true)
    else setLoadingMore(true)
    const supabase = createClient()
    const result = await browseSites({ query: q || undefined, page: p, pageSize: 30 }, supabase)
    setSites(prev => append ? [...prev, ...result.sites] : result.sites)
    setTotal(result.total)
    setLoading(false)
    setLoadingMore(false)
  }

  useEffect(() => {
    setPage(1)
    const t = setTimeout(() => load(query, 1), query ? 350 : 0)
    return () => clearTimeout(t)
  }, [query])

  function loadMore() {
    if (loadingMore || sites.length >= total) return
    const next = page + 1
    setPage(next)
    void load(query, next, true)
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.title}>Dive Sites</Text>
        <Text style={s.totalText}>{total.toLocaleString()} sites</Text>
      </View>

      {/* Search */}
      <View style={s.searchWrap}>
        <TextInput
          style={s.searchInput}
          placeholder="Search…"
          placeholderTextColor={colors.tx3}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={colors.acc} />
        </View>
      ) : (
        <FlatList
          data={sites}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <SiteRow site={item} />}
          ItemSeparatorComponent={() => <View style={s.separator} />}
          contentContainerStyle={s.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.acc} style={s.moreLoader} /> : null}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={s.emptyText}>No sites found.</Text>
            </View>
          }
        />
      )}
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
    alignItems: 'baseline',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.tx,
  },
  totalText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.tx3,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  searchWrap: {
    paddingHorizontal: 14,
    paddingBottom: 10,
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
  list: {
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  depthDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.tx,
  },
  rowSub: {
    fontSize: 10.5,
    fontWeight: '500',
    color: colors.tx3,
    textTransform: 'capitalize',
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  depth: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  rowRating: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.tx3,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  chevron: {
    fontSize: 18,
    color: colors.tx3,
    marginLeft: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.line,
    marginHorizontal: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: colors.tx3,
    fontStyle: 'italic',
  },
  moreLoader: {
    paddingVertical: 20,
  },
})

import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { createClient } from '../../lib/supabase'
import { colors } from '@divemap/ui'

type ReportRow = {
  id: string
  viz_m: number
  current_level: string
  temp_surface_c: number | null
  temp_bottom_c: number | null
  notes: string | null
  reported_at: string
  site: { id: string; name: string; slug: string; country: string | null } | null
}

const CURRENT_GLYPHS: Record<string, string> = {
  none: '—', mild: '›', moderate: '‹›', strong: '›‹›', ripping: '‹›‹›',
}

function vizColor(m: number): string {
  if (m < 5) return colors.dang
  if (m < 10) return colors.warn
  if (m < 18) return colors.tx2
  return colors.ok
}

function timeAgo(iso: string): string {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ReportCard({ item, onPress }: { item: ReportRow; onPress: () => void }) {
  const glyph = CURRENT_GLYPHS[item.current_level] ?? '—'
  const vColor = vizColor(item.viz_m)

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75}>
      <View style={s.card}>
        {/* Site + time */}
        <View style={s.cardHeader}>
          <View style={s.cardHeaderLeft}>
            <Text style={s.siteName} numberOfLines={1}>
              {item.site?.name ?? 'Unknown site'}
            </Text>
            {item.site?.country && (
              <Text style={s.siteCountry}>{item.site.country}</Text>
            )}
          </View>
          <Text style={s.timeAgo}>{timeAgo(item.reported_at)}</Text>
        </View>

        {/* Stats */}
        <View style={s.statsRow}>
          {/* Viz */}
          <View style={s.statBlock}>
            <Text style={[s.statVal, { color: vColor }]}>{item.viz_m}m</Text>
            <Text style={s.statLabel}>VIZ</Text>
            <View style={s.vizBar}>
              <View style={[s.vizFill, { width: `${Math.min(100, (item.viz_m / 30) * 100)}%` as unknown as number, backgroundColor: vColor }]} />
            </View>
          </View>

          {/* Current */}
          <View style={s.statBlock}>
            <Text style={[s.glyphText]}>{glyph}</Text>
            <Text style={[s.statLabel, { textTransform: 'capitalize' }]}>{item.current_level}</Text>
          </View>

          {/* Temps */}
          {(item.temp_surface_c != null || item.temp_bottom_c != null) && (
            <View style={s.tempGroup}>
              {item.temp_surface_c != null && (
                <View style={s.statBlock}>
                  <Text style={s.statVal}>{item.temp_surface_c}°</Text>
                  <Text style={s.statLabel}>SURF</Text>
                </View>
              )}
              {item.temp_bottom_c != null && (
                <View style={s.statBlock}>
                  <Text style={[s.statVal, { color: colors.tx2 }]}>{item.temp_bottom_c}°</Text>
                  <Text style={s.statLabel}>BTM</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Notes */}
        {item.notes && (
          <Text style={s.notes} numberOfLines={2}>&ldquo;{item.notes}&rdquo;</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

export default function ConditionsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [reports, setReports] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  async function fetchReports() {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('conditions_reports')
        .select('id, viz_m, current_level, temp_surface_c, temp_bottom_c, notes, reported_at, site:site_id(id, name, slug, country)')
        .order('reported_at', { ascending: false })
        .limit(30)
      setReports((data ?? []) as unknown as ReportRow[])
    } catch { /* ignore */ }
    finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { void fetchReports() }, [])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    void fetchReports()
  }, [])

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Conditions</Text>
          <Text style={s.subtitle}>Live reports from divers</Text>
        </View>
        <View style={s.badge}>
          <Text style={s.badgeText}>{reports.length} REPORTS</Text>
        </View>
      </View>

      {loading ? (
        <View style={s.loader}>
          <ActivityIndicator color={colors.acc} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={r => r.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.acc} />}
          renderItem={({ item }) => (
            <ReportCard
              item={item}
              onPress={() => {
                if (item.site) router.push(`/sites/${item.site.slug}`)
              }}
            />
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>No reports yet</Text>
              <Text style={s.emptySub}>Visit a site and tap &quot;Report Conditions&quot; to be first.</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace' })

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.line,
    backgroundColor: colors.bg2,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.tx },
  subtitle: { fontSize: 11, fontWeight: '500', color: colors.tx3, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: colors.line },
  badgeText: { fontSize: 8.5, fontWeight: '600', color: colors.tx3, fontFamily: MONO, letterSpacing: 0.6 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, gap: 10, paddingBottom: 32 },
  card: {
    backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.line,
    padding: 13, gap: 10,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cardHeaderLeft: { flex: 1, gap: 2 },
  siteName: { fontSize: 13.5, fontWeight: '700', color: colors.acc },
  siteCountry: { fontSize: 10, fontWeight: '500', color: colors.tx3 },
  timeAgo: { fontSize: 9.5, color: colors.tx3, fontFamily: MONO, flexShrink: 0 },
  statsRow: { flexDirection: 'row', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' },
  statBlock: { gap: 2, alignItems: 'center' },
  statVal: { fontSize: 15, fontWeight: '700', color: colors.tx, fontFamily: MONO },
  statLabel: { fontSize: 8, color: colors.tx3, fontFamily: MONO, letterSpacing: 0.5 },
  glyphText: { fontSize: 13, fontWeight: '700', color: colors.tx2, fontFamily: MONO },
  tempGroup: { flexDirection: 'row', gap: 10 },
  vizBar: {
    width: 52, height: 3, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden', marginTop: 2,
  },
  vizFill: { height: '100%', borderRadius: 2 },
  notes: { fontSize: 11.5, color: colors.tx3, fontWeight: '500', lineHeight: 16 },
  empty: { padding: 48, alignItems: 'center', gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.tx },
  emptySub: { fontSize: 12, fontWeight: '500', color: colors.tx3, textAlign: 'center' },
})

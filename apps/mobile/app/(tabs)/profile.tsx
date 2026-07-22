import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Link, useRouter } from 'expo-router'
import { getUserDives, getUserProfile } from '@divemap/db'
import { createClient } from '../../lib/supabase'
import type { DiveWithSite } from '@divemap/db'
import { colors } from '@divemap/ui'

function gasLabel(o2: number | null, he: number | null): string {
  // gas_o2/gas_he are stored as fractions 0-1 (deco-engine GasMix convention).
  if (o2 === null) return '—'
  const p2 = Math.round(o2 * 100)
  const ph = Math.round((he ?? 0) * 100)
  if (ph > 0) return `TX ${p2}/${ph}`
  if (p2 === 21) return 'Air'
  return `EAN${p2}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

function DiveRow({ dive }: { dive: DiveWithSite }) {
  return (
    <View style={s.diveRow}>
      <View style={s.depthBadge}>
        <Text style={s.depthBadgeText}>{dive.max_depth_m}m</Text>
      </View>
      <View style={s.diveBody}>
        <View style={s.diveHeader}>
          <Text style={s.diveSite} numberOfLines={1}>{dive.site?.name ?? 'Unknown site'}</Text>
          <Text style={s.diveDate}>{formatDate(dive.dived_at)}</Text>
        </View>
        <Text style={s.diveSub} numberOfLines={1}>
          {dive.site?.country ?? ''}{dive.buddy ? ` · w/ ${dive.buddy}` : ''}
        </Text>
        <Text style={s.diveStats}>
          {dive.max_depth_m} m · {dive.bottom_time_min} min ·{' '}
          <Text style={{ color: colors.acc }}>{gasLabel(dive.gas_o2, dive.gas_he)}</Text>
        </Text>
      </View>
    </View>
  )
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [displayName, setDisplayName] = useState<string | null>(null)
  const [dives, setDives] = useState<DiveWithSite[]>([])
  const [loading, setLoading] = useState(true)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      setSignedIn(true)
      const [profile, userDives] = await Promise.all([
        getUserProfile(user.id, supabase),
        getUserDives(user.id, supabase, 15),
      ])
      setDisplayName(profile?.display_name ?? null)
      setDives(userDives)
      setLoading(false)
    }
    void load()
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    setSignedIn(false)
    setDives([])
    setDisplayName(null)
  }

  const maxDepth = dives.length ? Math.max(...dives.map(d => d.max_depth_m)) : null
  const totalMin = dives.reduce((s, d) => s + d.bottom_time_min, 0)

  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.acc} />
      </View>
    )
  }

  if (!signedIn) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <View style={s.signInWrap}>
          <Text style={s.signInHeading}>Your profile</Text>
          <Text style={s.signInSub}>Sign in to view your logbook,{'\n'}certifications and wishlist.</Text>
          <Link href="/auth/sign-in" asChild>
            <TouchableOpacity style={s.btn}>
              <Text style={s.btnText}>Sign in</Text>
            </TouchableOpacity>
          </Link>
          <Link href="/auth/sign-up" asChild>
            <TouchableOpacity style={s.outlineBtn}>
              <Text style={s.outlineBtnText}>Create account</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    )
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={s.content}>
        {/* Avatar + name */}
        <View style={s.profileHeader}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {(displayName || '?')[0]?.toUpperCase() ?? '?'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{displayName ?? 'Diver'}</Text>
          </View>
        </View>

        {/* Stats bar */}
        {dives.length > 0 && (
          <View style={s.statsBar}>
            <View style={s.statCell}>
              <Text style={s.statVal}>{dives.length}</Text>
              <Text style={s.statLabel}>DIVES</Text>
            </View>
            <View style={[s.statCell, s.statBorder]}>
              <Text style={s.statVal}>{maxDepth != null ? `${maxDepth}m` : '—'}</Text>
              <Text style={s.statLabel}>MAX DEPTH</Text>
            </View>
            <View style={[s.statCell, s.statBorder]}>
              <Text style={s.statVal}>{Math.round(totalMin / 60)}h</Text>
              <Text style={s.statLabel}>UNDERWATER</Text>
            </View>
          </View>
        )}

        {/* Logbook */}
        <Text style={s.sectionTitle}>LOGBOOK</Text>
        {dives.length === 0 ? (
          <Text style={s.emptyText}>No dives logged yet.</Text>
        ) : (
          <View style={s.diveList}>
            {dives.map(d => <DiveRow key={d.id} dive={d} />)}
          </View>
        )}

        {/* Actions */}
        <Link href="/(tabs)/log" asChild>
          <TouchableOpacity style={s.btn}>
            <Text style={s.btnText}>+ Log a dive</Text>
          </TouchableOpacity>
        </Link>
        <Link href="/edit-profile" asChild>
          <TouchableOpacity style={s.outlineBtn}>
            <Text style={s.outlineBtnText}>Edit profile</Text>
          </TouchableOpacity>
        </Link>
        <TouchableOpacity
          onPress={() => Alert.alert('Sign out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign out', style: 'destructive', onPress: signOut },
          ])}
          style={s.outlineBtn}
        >
          <Text style={s.outlineBtnText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 48,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingBottom: 4,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.accD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#caf0f8',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.tx,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 14,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
  },
  statVal: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.tx,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  statLabel: {
    fontSize: 7.5,
    fontWeight: '600',
    color: colors.tx3,
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  sectionTitle: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    fontSize: 9,
    fontWeight: '600',
    color: colors.tx3,
    letterSpacing: 2,
  },
  diveList: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
    gap: 0,
  },
  diveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  depthBadge: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: colors.accDeep,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  depthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#caf0f8',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  diveBody: {
    flex: 1,
    gap: 2,
  },
  diveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  diveSite: {
    fontSize: 13.5,
    fontWeight: '700',
    color: colors.tx,
    flex: 1,
  },
  diveDate: {
    fontSize: 10,
    color: colors.tx3,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    marginLeft: 8,
  },
  diveSub: {
    fontSize: 10.5,
    fontWeight: '500',
    color: colors.tx3,
  },
  diveStats: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.tx2,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  signInWrap: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    gap: 16,
  },
  signInHeading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.tx,
  },
  signInSub: {
    fontSize: 14,
    color: colors.tx3,
    fontWeight: '500',
    lineHeight: 20,
  },
  btn: {
    backgroundColor: colors.acc,
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#02222e',
  },
  outlineBtn: {
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  outlineBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.tx3,
  },
  emptyText: {
    fontSize: 13,
    color: colors.tx3,
    fontStyle: 'italic',
  },
})

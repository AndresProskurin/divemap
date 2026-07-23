/**
 * Public diver profile (mobile) — the native counterpart of web
 * /profile/[username], plus the Follow button that used to be web-only.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, Link } from 'expo-router'
import {
  getUserByUsername,
  getUserPublicDives,
  getUserPosts,
  getFollowCounts,
  isFollowing,
  followUser,
  unfollowUser,
} from '@divemap/db'
import type { Certification, GearItem, DiveWithSite, UserPost } from '@divemap/db'
import { createClient } from '../../lib/supabase'
import { colors } from '@divemap/ui'

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace' })

type PublicUser = NonNullable<Awaited<ReturnType<typeof getUserByUsername>>>

function gasName(o2: number | null, he: number | null): string {
  if (!o2) return 'Air'
  const pO2 = Math.round(o2 * 100)
  const pHe = Math.round((he ?? 0) * 100)
  if (pHe > 0) return `TX ${pO2}/${pHe}`
  if (pO2 === 21) return 'Air'
  return `EAN${pO2}`
}

export default function DiverProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { username } = useLocalSearchParams<{ username: string }>()

  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<PublicUser | null>(null)
  const [dives, setDives] = useState<DiveWithSite[]>([])
  const [posts, setPosts] = useState<UserPost[]>([])
  const [followers, setFollowers] = useState(0)
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [following, setFollowing] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!username) return
    const supabase = createClient()
    const user = await getUserByUsername(username, supabase)
    if (!user) { setLoading(false); return }
    setProfile(user)
    const [d, p, counts, { data: { user: viewer } }] = await Promise.all([
      getUserPublicDives(user.id, supabase, 20),
      getUserPosts(user.id, supabase, 12),
      getFollowCounts(user.id, supabase),
      supabase.auth.getUser(),
    ])
    setDives(d)
    setPosts(p)
    setFollowers(counts.followers)
    setViewerId(viewer?.id ?? null)
    if (viewer && viewer.id !== user.id) {
      setFollowing(await isFollowing(viewer.id, user.id, supabase))
    }
    setLoading(false)
  }, [username])

  useEffect(() => { void load() }, [load])

  async function toggleFollow() {
    if (!profile || !viewerId || following === null || busy) return
    setBusy(true)
    const supabase = createClient()
    setFollowing(!following)
    setFollowers(n => n + (following ? -1 : 1))
    const { error } = following
      ? await unfollowUser(viewerId, profile.id, supabase)
      : await followUser(viewerId, profile.id, supabase)
    if (error) {
      setFollowing(following)
      setFollowers(n => n + (following ? 1 : -1))
      Alert.alert('Error', error)
    }
    setBusy(false)
  }

  if (loading) {
    return (
      <View style={[s.screen, s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.acc} />
      </View>
    )
  }

  if (!profile) {
    return (
      <View style={[s.screen, s.center, { paddingTop: insets.top, gap: 10 }]}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.tx }}>Diver not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 13, color: colors.acc, fontWeight: '600' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const displayName = profile.display_name ?? profile.username ?? 'Diver'
  const certs = (profile.certifications as unknown as Certification[] | null) ?? []
  const gear = (profile.gear as unknown as GearItem[] | null) ?? []
  const maxDepth = dives.reduce((m, d) => Math.max(m, d.max_depth_m), 0)
  const hours = dives.reduce((sum, d) => sum + d.bottom_time_min, 0) / 60
  const isSelf = viewerId === profile.id

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header bar */}
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Identity */}
        <View style={s.identityRow}>
          <View style={s.avatar}>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={s.avatarImg} />
            ) : (
              <Text style={s.avatarLetter}>{displayName[0]?.toUpperCase() ?? '?'}</Text>
            )}
          </View>
          <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
            <Text style={s.name} numberOfLines={1}>{displayName}</Text>
            <Text style={s.username}>@{profile.username}</Text>
            {profile.home_country && <Text style={s.country}>{profile.home_country}</Text>}
          </View>
        </View>

        {/* Follow row */}
        <View style={s.followRow}>
          <Text style={s.followCount}>
            {followers} {followers === 1 ? 'FOLLOWER' : 'FOLLOWERS'}
          </Text>
          {!isSelf && (
            viewerId ? (
              <TouchableOpacity
                onPress={toggleFollow}
                disabled={busy || following === null}
                style={[s.followBtn, following ? s.followBtnOutline : s.followBtnFill]}
              >
                <Text style={[s.followBtnText, following ? { color: colors.tx2 } : { color: '#02222e' }]}>
                  {following === null ? '…' : following ? 'Following ✓' : 'Follow'}
                </Text>
              </TouchableOpacity>
            ) : (
              <Link href="/auth/sign-in" asChild>
                <TouchableOpacity style={[s.followBtn, s.followBtnFill]}>
                  <Text style={[s.followBtnText, { color: '#02222e' }]}>Follow</Text>
                </TouchableOpacity>
              </Link>
            )
          )}
        </View>

        {profile.bio && <Text style={s.bio}>{profile.bio}</Text>}

        {/* Certs */}
        {certs.length > 0 && (
          <View style={s.chipWrap}>
            {certs.map((c, i) => (
              <Text key={i} style={s.certChip}>{c.abbr}</Text>
            ))}
          </View>
        )}

        {/* Gear */}
        {gear.length > 0 && (
          <View style={s.chipWrap}>
            {gear.map((g, i) => (
              <Text key={i} style={s.gearChip}>{g.name}</Text>
            ))}
          </View>
        )}

        {/* Stats */}
        <View style={s.statsCard}>
          {[
            [String(dives.length), 'PUBLIC DIVES'],
            [`${maxDepth}m`, 'MAX DEPTH'],
            [hours >= 10 ? String(Math.round(hours)) : hours.toFixed(1), 'HOURS'],
          ].map(([v, l]) => (
            <View key={l} style={s.statCell}>
              <Text style={s.statVal}>{v}</Text>
              <Text style={s.statLabel}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Recent dives */}
        <Text style={s.sectionTitle}>RECENT DIVES</Text>
        {dives.length === 0 ? (
          <Text style={s.emptyText}>No public dives yet.</Text>
        ) : (
          dives.map(d => (
            <TouchableOpacity
              key={d.id}
              disabled={!d.site}
              onPress={() => d.site && router.push(`/sites/${d.site.slug}`)}
              style={s.diveRow}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={s.diveSite} numberOfLines={1}>{d.site?.name ?? 'Unknown site'}</Text>
                <Text style={s.diveMeta}>
                  {d.max_depth_m}m · {d.bottom_time_min} min · {gasName(d.gas_o2, d.gas_he)}
                </Text>
              </View>
              <Text style={s.diveDate}>
                {new Date(d.dived_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Text>
            </TouchableOpacity>
          ))
        )}

        {/* Posts — square thumbnails, Instagram-style, tap → post */}
        {posts.length > 0 && (
          <>
            <Text style={s.sectionTitle}>POSTS</Text>
            <View style={s.postGrid}>
              {posts.map(p => {
                const first = p.media[0]
                const thumb = first?.media_type === 'video' ? first.thumbnail_url : first?.url
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={s.postThumbWrap}
                    activeOpacity={0.85}
                    onPress={() => router.push(`/post/${p.id}`)}
                  >
                    <Image source={{ uri: thumb ?? undefined }} style={s.postThumb} />
                    {(first?.media_type === 'video' || p.media.length > 1) && (
                      <Text style={s.postThumbBadge}>
                        {first?.media_type === 'video' ? '▶' : '⧉'}
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 14, paddingVertical: 8 },
  backBtn: { width: 36 },
  backText: { fontSize: 26, color: colors.tx2, lineHeight: 28 },
  content: { paddingHorizontal: 16, paddingBottom: 48, gap: 12 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 64, height: 64, borderRadius: 32, overflow: 'hidden',
    backgroundColor: colors.accDeep, alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarLetter: { fontSize: 22, fontWeight: '700', color: '#caf0f8' },
  name: { fontSize: 19, fontWeight: '800', color: colors.tx },
  username: { fontSize: 11, fontWeight: '600', color: colors.acc, fontFamily: MONO },
  country: { fontSize: 11.5, fontWeight: '500', color: colors.tx3 },
  followRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  followCount: { fontSize: 10, fontWeight: '600', color: colors.tx3, fontFamily: MONO, letterSpacing: 0.8 },
  followBtn: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 8 },
  followBtnFill: { backgroundColor: colors.acc },
  followBtnOutline: { borderWidth: 1.5, borderColor: colors.line },
  followBtnText: { fontSize: 12.5, fontWeight: '700' },
  bio: { fontSize: 13, color: colors.tx2, lineHeight: 19, fontWeight: '500' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  certChip: {
    fontSize: 9, fontWeight: '700', color: colors.acc, fontFamily: MONO,
    borderWidth: 1, borderColor: colors.acc, borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 3, overflow: 'hidden', letterSpacing: 0.8,
  },
  gearChip: {
    fontSize: 10.5, fontWeight: '500', color: colors.tx2,
    borderWidth: 1, borderColor: colors.line, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden',
  },
  statsCard: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.line, borderRadius: 16, overflow: 'hidden',
  },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 13, gap: 3 },
  statVal: { fontSize: 18, fontWeight: '700', color: colors.tx, fontFamily: MONO },
  statLabel: { fontSize: 7.5, color: colors.tx3, fontFamily: MONO, letterSpacing: 1 },
  sectionTitle: { fontSize: 9.5, fontWeight: '600', color: colors.tx3, fontFamily: MONO, letterSpacing: 1.5, marginTop: 6 },
  emptyText: { fontSize: 12.5, color: colors.tx3, fontStyle: 'italic' },
  diveRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
    borderRadius: 12, padding: 12,
  },
  diveSite: { fontSize: 13, fontWeight: '700', color: colors.tx },
  diveMeta: { fontSize: 10.5, fontWeight: '600', color: colors.tx2, fontFamily: MONO },
  diveDate: { fontSize: 9.5, color: colors.tx3, fontFamily: MONO },
  postGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  postThumbWrap: { width: '31.8%', aspectRatio: 1, borderRadius: 8, overflow: 'hidden' },
  postThumb: { width: '100%', height: '100%', backgroundColor: colors.card },
  postThumbBadge: {
    position: 'absolute', top: 5, right: 5,
    fontSize: 9, fontWeight: '700', color: '#eaf6fd',
    backgroundColor: 'rgba(4,18,31,0.72)', borderRadius: 5, overflow: 'hidden',
    paddingHorizontal: 4, paddingVertical: 2,
  },
})

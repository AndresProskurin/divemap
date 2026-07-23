/**
 * Post detail: a photo post (image + caption + the linked dive's conditions)
 * or a note post (insider-note body). Feed cards and profile grids land here;
 * the site line links onward to the site page, the author to their profile.
 *
 * Carousels and video are deferred — they need a real posts entity instead of
 * single-photo site_photos rows (backlog).
 */

import { useEffect, useState } from 'react'
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getPhotoPost, getNotePost } from '@divemap/db'
import type { PhotoPost, NotePost, PostDive } from '@divemap/db'
import { createClient } from '../../../lib/supabase'
import { colors } from '@divemap/ui'

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace' })

const CURRENT_GLYPHS: Record<string, string> = {
  none: '—', mild: '›', moderate: '‹›', strong: '›‹›', ripping: '‹›‹›',
}

function gasName(o2: number | null, he: number | null): string {
  if (!o2) return 'Air'
  const pO2 = Math.round(o2 * 100)
  const pHe = Math.round((he ?? 0) * 100)
  if (pHe > 0) return `TX ${pO2}/${pHe}`
  if (pO2 === 21) return 'Air'
  return `EAN${pO2}`
}

function DiveConditions({ dive }: { dive: PostDive }) {
  const cells: Array<[string, string]> = [
    [`${dive.max_depth_m}m`, 'MAX DEPTH'],
    [`${dive.bottom_time_min}min`, 'TIME'],
    [gasName(dive.gas_o2, dive.gas_he), 'GAS'],
  ]
  if (dive.viz_m != null) cells.push([`${dive.viz_m}m`, 'VIZ'])
  if (dive.current_level) cells.push([CURRENT_GLYPHS[dive.current_level] ?? '—', dive.current_level.toUpperCase()])
  if (dive.temp_bottom_c != null) cells.push([`${dive.temp_bottom_c}°`, 'BOTTOM'])

  return (
    <View style={s.diveCard}>
      <View style={s.diveHeader}>
        <Text style={s.diveTitle}>DIVE CONDITIONS</Text>
        <Text style={s.diveDate}>
          {new Date(dive.dived_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}
        </Text>
      </View>
      <View style={s.diveGrid}>
        {cells.map(([v, l]) => (
          <View key={l} style={s.diveCell}>
            <Text style={s.diveVal}>{v}</Text>
            <Text style={s.diveLabel}>{l}</Text>
          </View>
        ))}
      </View>
      {dive.rating != null && (
        <Text style={s.diveRating}>{'★'.repeat(dive.rating)}{'☆'.repeat(5 - dive.rating)}</Text>
      )}
    </View>
  )
}

export default function PostScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>()

  const [loading, setLoading] = useState(true)
  const [post, setPost] = useState<PhotoPost | NotePost | null>(null)

  useEffect(() => {
    if (!id || !kind) return
    const supabase = createClient()
    const fetcher = kind === 'photo' ? getPhotoPost : getNotePost
    fetcher(id, supabase).then((p) => { setPost(p); setLoading(false) })
  }, [kind, id])

  if (loading) {
    return (
      <View style={[s.screen, s.center, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.acc} />
      </View>
    )
  }

  if (!post) {
    return (
      <View style={[s.screen, s.center, { paddingTop: insets.top, gap: 10 }]}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.tx }}>Post not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={{ fontSize: 13, color: colors.acc, fontWeight: '600' }}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const who = post.user?.username ? `@${post.user.username}` : post.user?.display_name ?? 'diver'

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={{ width: 36 }}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Author */}
        <TouchableOpacity
          style={s.authorRow}
          onPress={() => post.user?.username && router.push(`/diver/${post.user.username}`)}
        >
          <View style={s.avatar}>
            {post.user?.avatar_url ? (
              <Image source={{ uri: post.user.avatar_url }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Text style={s.avatarLetter}>{(who[1] ?? '?').toUpperCase()}</Text>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.who}>{who}</Text>
            <TouchableOpacity onPress={() => post.site && router.push(`/sites/${post.site.slug}`)}>
              <Text style={s.siteLine} numberOfLines={1}>
                {post.site?.name ?? 'Unknown site'}{post.site?.country ? ` · ${post.site.country}` : ''}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={s.time}>
            {new Date(post.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </TouchableOpacity>

        {/* Body */}
        {post.kind === 'photo' ? (
          <>
            <Image source={{ uri: post.url }} style={s.photo} resizeMode="cover" />
            {post.caption && <Text style={s.caption}>{post.caption}</Text>}
            {post.dive ? (
              <DiveConditions dive={post.dive} />
            ) : (
              post.depth_taken_m != null && (
                <Text style={s.depthTaken}>Taken at {post.depth_taken_m}m</Text>
              )
            )}
          </>
        ) : (
          <View style={s.noteWrap}>
            <Text style={s.noteMark}>◆ INSIDER NOTE</Text>
            <Text style={s.noteBody}>{post.body}</Text>
            {post.status !== 'approved' && (
              <Text style={s.notePending}>PENDING REVIEW — visible only to you</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  topBar: { paddingHorizontal: 14, paddingVertical: 8 },
  backText: { fontSize: 26, color: colors.tx2, lineHeight: 28 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingBottom: 12 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, overflow: 'hidden',
    backgroundColor: colors.accDeep, alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { fontSize: 16, fontWeight: '700', color: '#caf0f8' },
  who: { fontSize: 14, fontWeight: '700', color: colors.tx },
  siteLine: { fontSize: 11.5, fontWeight: '600', color: colors.acc },
  time: { fontSize: 9.5, color: colors.tx3, fontFamily: MONO },
  photo: { width: '100%', aspectRatio: 1, backgroundColor: colors.bg2 },
  caption: { padding: 14, fontSize: 13.5, color: colors.tx, lineHeight: 20, fontWeight: '500' },
  depthTaken: { paddingHorizontal: 14, fontSize: 11, color: colors.tx3, fontFamily: MONO },
  diveCard: {
    margin: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
    borderRadius: 16, padding: 14, gap: 12,
  },
  diveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  diveTitle: { fontSize: 9, fontWeight: '600', color: colors.tx3, fontFamily: MONO, letterSpacing: 1.2 },
  diveDate: { fontSize: 9, color: colors.acc, fontFamily: MONO },
  diveGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  diveCell: { minWidth: 74, gap: 2 },
  diveVal: { fontSize: 17, fontWeight: '700', color: colors.tx, fontFamily: MONO },
  diveLabel: { fontSize: 7.5, color: colors.tx3, fontFamily: MONO, letterSpacing: 1 },
  diveRating: { fontSize: 14, color: colors.warn, letterSpacing: 2 },
  noteWrap: {
    margin: 14, padding: 16, borderRadius: 16,
    backgroundColor: 'rgba(0,180,216,0.06)', borderWidth: 1, borderColor: 'rgba(0,180,216,0.35)',
    gap: 10,
  },
  noteMark: { fontSize: 10, fontWeight: '700', color: colors.acc, fontFamily: MONO, letterSpacing: 1.4 },
  noteBody: { fontSize: 14.5, color: colors.tx, lineHeight: 23, fontWeight: '500' },
  notePending: { fontSize: 9, color: colors.warn, fontFamily: MONO, letterSpacing: 0.8 },
})

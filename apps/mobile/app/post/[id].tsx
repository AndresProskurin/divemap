/**
 * Post detail: a media post (photo/video carousel + caption + the linked
 * dive's conditions) or a note post (moderated community tip). Feed cards and
 * profile grids land here; the site line links onward to the site page, the
 * author to their profile.
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
  TextInput,
  KeyboardAvoidingView,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useVideoPlayer, VideoView } from 'expo-video'
import { getPost, getPostComments, addPostComment, deletePostComment } from '@divemap/db'
import type { PostDetail, PostDive, PostComment, PostMediaItem } from '@divemap/db'
import { createClient } from '../../lib/supabase'
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
  )}

/** One video slide — hooks force a component per player instance. */
function VideoSlide({ item, size, active }: { item: PostMediaItem; size: number; active: boolean }) {
  const player = useVideoPlayer(item.url, (p) => { p.loop = true })
  useEffect(() => {
    if (active) player.play()
    else player.pause()
  }, [active, player])
  return (
    <VideoView
      player={player}
      style={{ width: size, height: size, backgroundColor: colors.bg2 }}
      contentFit="cover"
      nativeControls
    />
  )
}

/** Instagram-style pager: full-width square slides, dots when more than one. */
function MediaPager({ media }: { media: PostMediaItem[] }) {
  const { width } = useWindowDimensions()
  const [page, setPage] = useState(0)

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width))
  }

  return (
    <View>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={{ flexGrow: 0 }}
      >
        {media.map((m, i) => (
          m.media_type === 'video' ? (
            <VideoSlide key={m.id} item={m} size={width} active={i === page} />
          ) : (
            <Image
              key={m.id}
              source={{ uri: m.url }}
              style={{ width, height: width, backgroundColor: colors.bg2 }}
              resizeMode="cover"
            />
          )
        ))}
      </ScrollView>
      {media.length > 1 && (
        <View style={s.dots}>
          {media.map((m, i) => (
            <View key={m.id} style={[s.dot, i === page && s.dotActive]} />
          ))}
        </View>
      )}
    </View>
  )
}

export default function PostScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [post, setPost] = useState<PostDetail | null>(null)
  const [comments, setComments] = useState<PostComment[]>([])
  const [viewerId, setViewerId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!id) return
    const supabase = createClient()
    getPost(id, supabase).then((p) => { setPost(p); setLoading(false) })
    getPostComments(id, supabase).then(setComments).catch(() => {})
    supabase.auth.getUser().then(({ data }) => setViewerId(data.user?.id ?? null))
  }, [id])

  async function sendComment() {
    const body = draft.trim()
    if (!body || !viewerId || !id || sending) return
    setSending(true)
    const supabase = createClient()
    const { error } = await addPostComment(id, viewerId, body, supabase)
    if (!error) {
      setDraft('')
      setComments(await getPostComments(id, supabase))
    }
    setSending(false)
  }

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
  const firstDepth = post.media.find((m) => m.depth_m != null)?.depth_m

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
        {post.kind === 'media' ? (
          <>
            <MediaPager media={post.media} />
            {post.body && <Text style={s.caption}>{post.body}</Text>}
            {post.dive ? (
              <DiveConditions dive={post.dive} />
            ) : (
              firstDepth != null && (
                <Text style={s.depthTaken}>Taken at {firstDepth}m</Text>
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

        {/* ── Comments ── */}
        <View style={s.commentsWrap}>
          <Text style={s.commentsTitle}>
            {comments.length === 0 ? 'COMMENTS' : `COMMENTS · ${comments.length}`}
          </Text>
          {comments.length === 0 && (
            <Text style={s.commentsEmpty}>Be the first to comment.</Text>
          )}
          {comments.map(c => {
            const name = c.user?.username ? `@${c.user.username}` : c.user?.display_name ?? 'diver'
            return (
              <View key={c.id} style={s.commentRow}>
                <TouchableOpacity
                  onPress={() => c.user?.username && router.push(`/diver/${c.user.username}`)}
                  style={s.commentAvatar}
                >
                  {c.user?.avatar_url ? (
                    <Image source={{ uri: c.user.avatar_url }} style={{ width: '100%', height: '100%' }} />
                  ) : (
                    <Text style={s.commentAvatarLetter}>{(name[1] ?? '?').toUpperCase()}</Text>
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={s.commentBody}>
                    <Text style={s.commentWho}>{name}  </Text>
                    {c.body}
                  </Text>
                  <Text style={s.commentTime}>
                    {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                {c.user_id === viewerId && (
                  <TouchableOpacity
                    onPress={async () => {
                      setComments(prev => prev.filter(x => x.id !== c.id))
                      await deletePostComment(c.id, createClient())
                    }}
                  >
                    <Text style={{ fontSize: 15, color: colors.tx3, paddingHorizontal: 4 }}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })}
        </View>
      </ScrollView>

      {/* Composer */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {viewerId ? (
          <View style={[s.composer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <TextInput
              style={s.composerInput}
              value={draft}
              onChangeText={setDraft}
              placeholder="Add a comment…"
              placeholderTextColor={colors.tx3}
              maxLength={500}
              onSubmitEditing={sendComment}
              returnKeyType="send"
            />
            <TouchableOpacity
              onPress={sendComment}
              disabled={sending || !draft.trim()}
              style={[s.composerSend, (!draft.trim() || sending) && { opacity: 0.4 }]}
            >
              <Text style={s.composerSendText}>{sending ? '…' : '↑'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[s.composer, { paddingBottom: Math.max(insets.bottom, 10), justifyContent: 'center' }]}
            onPress={() => router.push('/auth/sign-in')}
          >
            <Text style={{ fontSize: 12.5, color: colors.acc, fontWeight: '600' }}>Sign in to comment</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
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
  dots: {
    flexDirection: 'row', gap: 5, justifyContent: 'center',
    paddingTop: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotActive: { backgroundColor: colors.acc },
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
  commentsWrap: { paddingHorizontal: 16, paddingTop: 6, gap: 12 },
  commentsTitle: { fontSize: 9, fontWeight: '600', color: colors.tx3, fontFamily: MONO, letterSpacing: 1.4 },
  commentsEmpty: { fontSize: 12, color: colors.tx3, fontStyle: 'italic' },
  commentRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  commentAvatar: {
    width: 28, height: 28, borderRadius: 14, overflow: 'hidden',
    backgroundColor: colors.accDeep, alignItems: 'center', justifyContent: 'center',
  },
  commentAvatarLetter: { fontSize: 11, fontWeight: '700', color: '#caf0f8' },
  commentWho: { fontWeight: '700', color: colors.tx },
  commentBody: { fontSize: 12.5, color: colors.tx2, lineHeight: 18 },
  commentTime: { fontSize: 8.5, color: colors.tx3, fontFamily: MONO, marginTop: 2 },
  composer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg2,
  },
  composerInput: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, fontSize: 13, color: colors.tx,
  },
  composerSend: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: colors.acc,
    alignItems: 'center', justifyContent: 'center',
  },
  composerSendText: { fontSize: 16, fontWeight: '700', color: '#02222e' },
})

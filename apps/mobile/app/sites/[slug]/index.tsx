import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, Link } from 'expo-router'
import { getSiteBySlug, getSiteConditions, getSiteOperators, getSitePhotos, getWishlistItem, addToWishlist, removeFromWishlist } from '@divemap/db'
import type { SitePhoto } from '@divemap/db'
import type { Tables } from '@divemap/db'
import { createClient } from '../../../lib/supabase'
import { pickPhoto, uploadSitePhoto } from '../../../lib/photos'
import { getSiteInsiderNotes, submitInsiderNote } from '@divemap/db'
import type { InsiderNote } from '@divemap/db'
import type { DiveSite, ConditionsReport } from '@divemap/db'
import { colors } from '@divemap/ui'

function depthColor(m: number): string {
  if (m < 20) return colors.depthShallow
  if (m < 40) return colors.depthMid
  if (m < 60) return colors.depthDeep
  return colors.depthTech
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.chip}>
      <Text style={s.chipValue}>{value}</Text>
      <Text style={s.chipLabel}>{label}</Text>
    </View>
  )
}

export default function SiteDetailScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { slug } = useLocalSearchParams<{ slug: string }>()

  const [site, setSite] = useState<DiveSite | null>(null)
  const [conditions, setConditions] = useState<ConditionsReport[]>([])
  const [operators, setOperators] = useState<Tables<'operators'>[]>([])
  const [photos, setPhotos] = useState<SitePhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [ugcNotes, setUgcNotes] = useState<InsiderNote[]>([])
  const [noteDraft, setNoteDraft] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteBusy, setNoteBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [wishlisted, setWishlisted] = useState(false)
  const [wishlistId, setWishlistId] = useState<string | null>(null)
  const [wishlistBusy, setWishlistBusy] = useState(false)

  useEffect(() => {
    if (!slug) return
    async function load() {
      const supabase = createClient()
      const [s, cond] = await Promise.all([
        getSiteBySlug(slug, supabase),
        getSiteConditions(slug, supabase).catch(() => [] as ConditionsReport[]),
      ])
      setSite(s)
      setConditions(cond)
      setLoading(false)
      if (s) {
        getSiteOperators(s.id, supabase).then(setOperators).catch(() => {})
        getSitePhotos(s.id, supabase).then(setPhotos).catch(() => {})
        getSiteInsiderNotes(s.id, supabase).then(setUgcNotes).catch(() => {})
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const item = await getWishlistItem(user.id, s.id, supabase)
          if (item) { setWishlisted(true); setWishlistId(item.id) }
        }
      }
    }
    void load()
  }, [slug])

  async function toggleWishlist() {
    if (!site || wishlistBusy) return
    setWishlistBusy(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/sign-in'); return }
      if (wishlisted && wishlistId) {
        await removeFromWishlist(wishlistId, supabase)
        setWishlisted(false); setWishlistId(null)
      } else {
        const { id } = await addToWishlist(user.id, site.id, supabase)
        setWishlisted(true); setWishlistId(id)
      }
    } finally {
      setWishlistBusy(false)
    }
  }

  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.acc} />
      </View>
    )
  }

  if (!site) {
    return (
      <View style={[s.screen, { paddingTop: insets.top, padding: 24 }]}>
        <Text style={s.notFound}>Site not found.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backLink}>← Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const dColor = depthColor(site.depth_max_m)
  const latestConditions = conditions[0]

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Hero header */}
      <View style={[s.hero, { borderBottomColor: dColor }]}>
        <View style={s.heroNav}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backBtnText}>‹</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleWishlist}
            disabled={wishlistBusy}
            style={[s.wishBtn, wishlisted && s.wishBtnActive]}
          >
            <Text style={[s.wishIcon, wishlisted && { color: colors.acc }]}>
              {wishlisted ? '♥' : '♡'}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={[s.typeBadge, { backgroundColor: colors.acc }]}>
          <Text style={s.typeText}>{site.type.toUpperCase()}</Text>
        </View>
        <Text style={s.siteName}>{site.name}</Text>
        <Text style={s.siteLocation}>
          {site.region ? `${site.region} · ` : ''}{site.country}
        </Text>
        {site.rating != null && (
          <Text style={s.rating}>★ {site.rating.toFixed(1)}</Text>
        )}
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Spec chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>
          <Chip label="DEPTH" value={`${site.depth_min_m}–${site.depth_max_m}m`} />
          {site.viz_score != null && <Chip label="VIZ" value={`${site.viz_score}/5`} />}
          {site.current_level && <Chip label="CURRENT" value={site.current_level} />}
          {site.avg_temp_c != null && <Chip label="AVG TEMP" value={`${site.avg_temp_c}°C`} />}
          {site.level && <Chip label="LEVEL" value={site.level} />}
        </ScrollView>

        {/* Conditions update timestamp */}
        {latestConditions && (
          <Text style={s.conditionsNote}>
            CONDITIONS UPDATED{' '}
            {Math.floor((Date.now() - new Date(latestConditions.reported_at).getTime()) / 3_600_000)}H AGO
          </Text>
        )}

        {/* Description */}
        {site.description && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>OVERVIEW</Text>
            <Text style={s.description}>{site.description}</Text>
          </View>
        )}

        {/* Insider notes */}
        {site.insider_notes && (
          <View style={[s.section, s.insiderSection]}>
            <Text style={[s.sectionTitle, { color: colors.warn }]}>INSIDER NOTES</Text>
            <Text style={[s.description, { color: colors.tx2 }]}>{site.insider_notes}</Text>
          </View>
        )}

        {/* Latest conditions */}
        {latestConditions && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>LATEST CONDITIONS</Text>
            <View style={s.condRow}>
              {latestConditions.viz_m != null && (
                <View style={s.condCell}>
                  <Text style={s.condVal}>{latestConditions.viz_m}m</Text>
                  <Text style={s.condLabel}>VIZ</Text>
                </View>
              )}
              {latestConditions.temp_surface_c != null && (
                <View style={s.condCell}>
                  <Text style={s.condVal}>{latestConditions.temp_surface_c}°C</Text>
                  <Text style={s.condLabel}>SURFACE</Text>
                </View>
              )}
              {latestConditions.temp_bottom_c != null && (
                <View style={s.condCell}>
                  <Text style={s.condVal}>{latestConditions.temp_bottom_c}°C</Text>
                  <Text style={s.condLabel}>BOTTOM</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Community insider notes (UGC, moderated) */}
        {(ugcNotes.length > 0 || true) && (
          <View style={s.section}>
            <Text style={[s.sectionTitle, { color: colors.warn }]}>COMMUNITY NOTES</Text>
            {ugcNotes.map(n => (
              <View key={n.id} style={[s.ugcNote, n.status !== 'approved' && { opacity: 0.65 }]}>
                {n.status !== 'approved' && (
                  <Text style={s.ugcPending}>PENDING REVIEW</Text>
                )}
                <Text style={s.ugcBody}>{n.body}</Text>
                <Text style={s.ugcAuthor}>
                  — {n.user?.username ? `@${n.user.username}` : n.user?.display_name ?? 'diver'}
                </Text>
              </View>
            ))}
            {!noteOpen ? (
              <TouchableOpacity onPress={() => setNoteOpen(true)} style={s.ugcAddBtn}>
                <Text style={s.ugcAddBtnText}>+ Share an insider note</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 8 }}>
                <TextInput
                  style={s.ugcInput}
                  value={noteDraft}
                  onChangeText={setNoteDraft}
                  placeholder="The tip only locals know…"
                  placeholderTextColor={colors.tx3}
                  multiline
                  maxLength={1000}
                />
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <TouchableOpacity
                    disabled={noteBusy}
                    onPress={async () => {
                      const body = noteDraft.trim()
                      if (body.length < 20) { Alert.alert('Too short', 'At least 20 characters — make it useful.'); return }
                      const supabase = createClient()
                      const { data: { user } } = await supabase.auth.getUser()
                      if (!user) { Alert.alert('Sign in required', 'Sign in to share notes.'); return }
                      if (!site) return
                      setNoteBusy(true)
                      const { error } = await submitInsiderNote(site.id, user.id, body, supabase)
                      setNoteBusy(false)
                      if (error) { Alert.alert('Error', error); return }
                      setNoteDraft(''); setNoteOpen(false)
                      setUgcNotes(await getSiteInsiderNotes(site.id, supabase))
                    }}
                    style={s.ugcSubmitBtn}
                  >
                    <Text style={s.ugcSubmitText}>{noteBusy ? 'Submitting…' : 'Submit for review'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setNoteOpen(false)}>
                    <Text style={{ fontSize: 12, color: colors.tx3 }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Photos */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>PHOTOS{photos.length > 0 ? ` · ${photos.length}` : ''}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={s.photoStrip}>
            <TouchableOpacity
              disabled={uploading}
              onPress={async () => {
                if (!site) return
                const picked = await pickPhoto()
                if (!picked) return
                setUploading(true)
                try {
                  await uploadSitePhoto(picked, site.id)
                  const supabase = createClient()
                  setPhotos(await getSitePhotos(site.id, supabase))
                } catch (e) {
                  Alert.alert('Upload failed', e instanceof Error ? e.message : 'Try again.')
                } finally {
                  setUploading(false)
                }
              }}
              style={s.photoAdd}
            >
              {uploading
                ? <ActivityIndicator size="small" color={colors.acc} />
                : <Text style={s.photoAddText}>＋</Text>}
            </TouchableOpacity>
            {photos.map(ph => (
              <Image key={ph.id} source={{ uri: ph.url }} style={s.photoThumb} />
            ))}
          </ScrollView>
        </View>

        {/* Operators (dive shops & clubs running this site) */}
        {operators.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>OPERATORS · {operators.length}</Text>
            {operators.map(op => (
              <View key={op.id} style={s.opCard}>
                <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Text style={s.opName} numberOfLines={1}>{op.name}</Text>
                    {op.tech_certified && (
                      <Text style={s.opTechBadge}>TECH ✓</Text>
                    )}
                  </View>
                  {op.base != null && <Text style={s.opBase} numberOfLines={1}>{op.base}</Text>}
                  {op.certs_offered.length > 0 && (
                    <Text style={s.opKit} numberOfLines={1}>{op.certs_offered.join(' · ')}</Text>
                  )}
                </View>
                {op.rating != null && <Text style={s.opRating}>★ {op.rating.toFixed(1)}</Text>}
              </View>
            ))}
            {/* Contact actions for the listed operators */}
            {operators.map(op => (op.phone || op.email || op.website) && (
              <View key={`${op.id}-contacts`} style={s.opContactRow}>
                <Text style={s.opContactName} numberOfLines={1}>{op.name}</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {op.phone && (
                    <TouchableOpacity style={s.opContactBtn} onPress={() => Linking.openURL(`tel:${op.phone!.replace(/\s+/g, '')}`)}>
                      <Text style={s.opContactBtnText}>📞 Call</Text>
                    </TouchableOpacity>
                  )}
                  {op.email && (
                    <TouchableOpacity style={s.opContactBtn} onPress={() => Linking.openURL(`mailto:${op.email}`)}>
                      <Text style={s.opContactBtnText}>✉️ Email</Text>
                    </TouchableOpacity>
                  )}
                  {op.website && (
                    <TouchableOpacity style={s.opContactBtn} onPress={() => Linking.openURL(op.website!)}>
                      <Text style={s.opContactBtnText}>🌐 Web</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* CTA buttons */}
        <View style={s.ctaRow}>
          <Link href={`/(tabs)/log?site=${site.slug}`} asChild>
            <TouchableOpacity style={s.ctaSecondary}>
              <Text style={s.ctaSecondaryText}>+ Log dive</Text>
            </TouchableOpacity>
          </Link>
          <Link href={`/planner?site=${site.slug}&depth=${site.depth_max_m}`} asChild>
            <TouchableOpacity style={s.ctaPrimary}>
              <Text style={s.ctaPrimaryText}>Plan This Dive</Text>
            </TouchableOpacity>
          </Link>
        </View>
        <Link href={`/sites/${site.slug}/report`} asChild>
          <TouchableOpacity style={s.reportBtn}>
            <Text style={s.reportBtnText}>Report Conditions</Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  ugcNote: {
    backgroundColor: 'rgba(0,180,216,0.06)', borderWidth: 1, borderColor: 'rgba(0,180,216,0.3)',
    borderRadius: 12, padding: 12, gap: 6, marginTop: 8,
  },
  ugcPending: {
    alignSelf: 'flex-start', fontSize: 7.5, fontWeight: '700', color: colors.warn,
    borderWidth: 1, borderColor: colors.warn, borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1, letterSpacing: 0.8, overflow: 'hidden',
  },
  ugcBody: { fontSize: 12.5, color: colors.tx, lineHeight: 18, fontWeight: '500' },
  ugcAuthor: { fontSize: 10, color: colors.tx3, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }) },
  ugcAddBtn: {
    alignSelf: 'flex-start', marginTop: 8,
    borderWidth: 1, borderColor: colors.acc, borderStyle: 'dashed', borderRadius: 12,
    paddingHorizontal: 13, paddingVertical: 9,
  },
  ugcAddBtnText: { fontSize: 12, fontWeight: '700', color: colors.acc },
  ugcInput: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 12,
    padding: 12, fontSize: 13, color: colors.tx, height: 84, textAlignVertical: 'top', marginTop: 8,
  },
  ugcSubmitBtn: {
    backgroundColor: colors.acc, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
  },
  ugcSubmitText: { fontSize: 12.5, fontWeight: '700', color: '#02222e' },
  photoStrip: { flexDirection: 'row', gap: 8, paddingTop: 8 },
  photoAdd: {
    width: 96, height: 96, borderRadius: 12,
    borderWidth: 1, borderColor: colors.acc, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,180,216,0.06)',
  },
  photoAddText: { fontSize: 22, color: colors.acc },
  photoThumb: { width: 96, height: 96, borderRadius: 12, backgroundColor: colors.card },
  opCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
    borderRadius: 14, padding: 13, marginTop: 8,
  },
  opName: { fontSize: 13.5, fontWeight: '700', color: colors.tx, flexShrink: 1 },
  opTechBadge: {
    fontSize: 8, fontWeight: '700', color: colors.acc,
    borderWidth: 1, borderColor: colors.acc, borderRadius: 4,
    paddingHorizontal: 4, paddingVertical: 1, overflow: 'hidden', letterSpacing: 0.8,
  },
  opBase: { fontSize: 11, color: colors.tx3, fontWeight: '500' },
  opKit: { fontSize: 9.5, color: colors.tx2, fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }) },
  opRating: { fontSize: 12, fontWeight: '600', color: colors.tx2 },
  opContactRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10,
    marginTop: 8, paddingHorizontal: 2,
  },
  opContactName: { flex: 1, fontSize: 10.5, fontWeight: '600', color: colors.tx3 },
  opContactBtn: {
    borderWidth: 1, borderColor: colors.line, borderRadius: 999,
    paddingHorizontal: 11, paddingVertical: 7, backgroundColor: colors.card,
  },
  opContactBtnText: { fontSize: 11, fontWeight: '600', color: colors.tx2 },
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  hero: {
    backgroundColor: colors.bg2,
    padding: 16,
    paddingBottom: 20,
    borderBottomWidth: 3,
    gap: 4,
  },
  heroNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(8,28,48,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 22,
    color: colors.tx,
    lineHeight: 26,
  },
  wishBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(8,28,48,0.8)',
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishBtnActive: {
    borderColor: colors.acc,
    backgroundColor: 'rgba(0,180,216,0.12)',
  },
  wishIcon: {
    fontSize: 16,
    color: colors.tx3,
    lineHeight: 20,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginBottom: 4,
  },
  typeText: {
    fontSize: 8,
    fontWeight: '700',
    color: '#04121f',
    letterSpacing: 0.8,
  },
  siteName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.tx,
    lineHeight: 30,
  },
  siteLocation: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.tx2,
  },
  rating: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.tx2,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  content: {
    padding: 14,
    gap: 14,
    paddingBottom: 48,
  },
  chips: {
    gap: 8,
    flexDirection: 'row',
    paddingBottom: 2,
  },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 80,
    gap: 3,
  },
  chipValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.tx,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  chipLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: colors.tx3,
    letterSpacing: 1,
  },
  conditionsNote: {
    fontSize: 9,
    color: colors.tx3,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    letterSpacing: 0.8,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 8,
  },
  insiderSection: {
    borderColor: 'rgba(255,183,3,0.3)',
    backgroundColor: 'rgba(255,183,3,0.05)',
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: '600',
    color: colors.tx3,
    letterSpacing: 1.5,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  description: {
    fontSize: 13.5,
    color: colors.tx,
    lineHeight: 20,
    fontWeight: '400',
  },
  condRow: {
    flexDirection: 'row',
    gap: 12,
  },
  condCell: {
    alignItems: 'center',
    gap: 3,
  },
  condVal: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.tx,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  condLabel: {
    fontSize: 8.5,
    color: colors.tx3,
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  ctaSecondary: {
    width: 100,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
  },
  ctaSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.acc,
  },
  ctaPrimary: {
    flex: 1,
    padding: 15,
    borderRadius: 14,
    backgroundColor: colors.acc,
    alignItems: 'center',
  },
  ctaPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#02222e',
  },
  notFound: {
    fontSize: 16,
    color: colors.tx3,
    marginBottom: 12,
  },
  backLink: {
    fontSize: 14,
    color: colors.acc,
    fontWeight: '600',
  },
  reportBtn: {
    borderRadius: 14,
    padding: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  reportBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: colors.tx3,
  },
})

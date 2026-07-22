import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { insertDive, searchSites } from '@divemap/db'
import type { SiteSearchResult } from '@divemap/db'
import { createClient } from '../../lib/supabase'
import { colors } from '@divemap/ui'

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function mixLabel(o2: number, he: number): string {
  const p2 = Math.round(o2)
  const ph = Math.round(he)
  if (ph > 0) return `TX ${p2}/${ph}`
  if (p2 === 21) return 'Air'
  return `EAN${p2}`
}

const CURRENTS = [
  { glyph: '—', label: 'None', desc: 'Slack water' },
  { glyph: '›', label: 'Mild', desc: 'Easy to fin against' },
  { glyph: '‹›', label: 'Moderate', desc: 'Work to hold position' },
  { glyph: '›‹›', label: 'Strong', desc: 'Drift dive territory' },
  { glyph: '‹›‹›', label: 'Ripping', desc: 'Hook in or abort' },
] as const
const CURRENT_LEVELS = ['none', 'mild', 'moderate', 'strong', 'ripping'] as const

const STEP_TITLES = [
  'Where did you dive?',
  'When, and with whom?',
  'Depth, time & gas',
  'Conditions',
  'Notes & rating',
] as const

// ── Small components ──────────────────────────────────────────────────────────

function MonoInput({
  value, onChangeText, placeholder, unit, keyboardType = 'numeric',
}: {
  value: string
  onChangeText: (v: string) => void
  placeholder: string
  unit?: string
  keyboardType?: 'numeric' | 'default'
}) {
  return (
    <View style={s.monoWrap}>
      <TextInput
        style={s.monoInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.tx3}
        keyboardType={keyboardType}
        returnKeyType="done"
      />
      {unit && <Text style={s.monoUnit}>{unit}</Text>}
    </View>
  )
}

function StarRow({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map(star => (
        <TouchableOpacity key={star} onPress={() => onChange(star === value ? 0 : star)}>
          <Text style={{ fontSize: 28, color: star <= value ? colors.warn : colors.line }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

function StepDots({ current }: { current: number }) {
  return (
    <View style={s.dots}>
      {[1, 2, 3, 4, 5].map(n => (
        <View key={n} style={[s.dot, n === current && s.dotWide, n <= current && s.dotActive]} />
      ))}
    </View>
  )
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function LogScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [step, setStep] = useState(1)

  // Step 1 — site
  const [siteQuery, setSiteQuery] = useState('')
  const [siteResults, setSiteResults] = useState<SiteSearchResult[]>([])
  const [site, setSite] = useState<SiteSearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const searchSeq = useRef(0)

  // Step 2 — when & buddy
  const [date, setDate] = useState(todayISO())
  const [buddy, setBuddy] = useState('')

  // Step 3 — depth / time / gas
  const [depth, setDepth] = useState('')
  const [time, setTime] = useState('')
  const [o2, setO2] = useState('21')
  const [he, setHe] = useState('0')

  // Step 4 — conditions
  const [viz, setViz] = useState('')
  const [currentIdx, setCurrentIdx] = useState<number | null>(null)
  const [tempSurface, setTempSurface] = useState('')
  const [tempBottom, setTempBottom] = useState('')

  // Step 5 — notes & rating
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState(0)
  const [loading, setLoading] = useState(false)

  const o2Num = Math.min(100, Math.max(5, parseFloat(o2) || 21))
  const heNum = Math.min(95, Math.max(0, parseFloat(he) || 0))

  // Debounced site search over the live dive_sites table.
  useEffect(() => {
    const q = siteQuery.trim()
    if (q.length < 2) { setSiteResults([]); return }
    const seq = ++searchSeq.current
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const results = await searchSites(q, createClient())
        if (seq === searchSeq.current) setSiteResults(results)
      } finally {
        if (seq === searchSeq.current) setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [siteQuery])

  function validateStep(): string | null {
    if (step === 2 && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Date must be YYYY-MM-DD.'
    if (step === 3) {
      const d = parseFloat(depth)
      const t = parseFloat(time)
      if (isNaN(d) || d <= 0) return 'Enter a valid max depth.'
      if (isNaN(t) || t <= 0) return 'Enter a valid bottom time.'
      if (o2Num + heNum > 100) return 'O₂ + He cannot exceed 100%.'
    }
    return null
  }

  function next() {
    const err = validateStep()
    if (err) { Alert.alert('Check your input', err); return }
    setStep(v => Math.min(5, v + 1))
  }

  async function save() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { Alert.alert('Sign in', 'Please sign in to log a dive.'); return }

      const vizNum = parseFloat(viz)
      const tS = parseFloat(tempSurface)
      const tB = parseFloat(tempBottom)
      const { error } = await insertDive({
        userId: user.id,
        siteId: site?.id ?? null,
        divedAt: date,
        maxDepthM: parseFloat(depth),
        bottomTimeMin: parseFloat(time),
        gasO2: o2Num,
        gasHe: heNum > 0 ? heNum : null,
        vizM: isNaN(vizNum) ? null : vizNum,
        currentLevel: currentIdx === null ? null : CURRENT_LEVELS[currentIdx],
        tempSurfaceC: isNaN(tS) ? null : tS,
        tempBottomC: isNaN(tB) ? null : tB,
        buddy: buddy.trim() || null,
        notes: notes.trim() || null,
        rating: rating > 0 ? rating : null,
      }, supabase)

      if (error) { Alert.alert('Error', error); return }
      Alert.alert('Logged!', site ? `Dive at ${site.name} saved.` : 'Dive saved.', [
        { text: 'OK', onPress: () => { resetAll(); router.push('/(tabs)/profile') } },
      ])
    } finally {
      setLoading(false)
    }
  }

  function resetAll() {
    setStep(1)
    setSiteQuery(''); setSiteResults([]); setSite(null)
    setDate(todayISO()); setBuddy('')
    setDepth(''); setTime(''); setO2('21'); setHe('0')
    setViz(''); setCurrentIdx(null); setTempSurface(''); setTempBottom('')
    setNotes(''); setRating(0)
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        {step > 1 ? (
          <TouchableOpacity onPress={() => setStep(v => Math.max(1, v - 1))} style={s.backBtn}>
            <Text style={s.backText}>‹</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.backBtn} />
        )}
        <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
          <Text style={s.title}>Log a Dive</Text>
          <Text style={s.subtitle}>STEP {step} OF 5</Text>
        </View>
        <View style={s.backBtn} />
      </View>
      <StepDots current={step} />

      <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
        <Text style={s.stepTitle}>{STEP_TITLES[step - 1]}</Text>

        {/* ── Step 1: site ── */}
        {step === 1 && (
          <View style={s.stepWrap}>
            <TextInput
              style={s.input}
              value={siteQuery}
              onChangeText={setSiteQuery}
              placeholder="Search 1,000+ dive sites…"
              placeholderTextColor={colors.tx3}
              autoCorrect={false}
            />
            {site && (
              <View style={s.sitePicked}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.sitePickedName}>{site.name}</Text>
                  <Text style={s.sitePickedSub}>
                    {site.country ?? '—'}{site.depth_max_m ? ` · to ${site.depth_max_m}m` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSite(null)}>
                  <Text style={{ fontSize: 18, color: colors.tx3 }}>×</Text>
                </TouchableOpacity>
              </View>
            )}
            {searching && <Text style={s.hint}>Searching…</Text>}
            {siteResults.map(r => (
              <TouchableOpacity
                key={r.id}
                style={s.siteRow}
                onPress={() => { setSite(r); setSiteQuery(''); setSiteResults([]) }}
              >
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.siteRowName}>{r.name}</Text>
                  <Text style={s.siteRowSub}>{r.country ?? '—'}</Text>
                </View>
                {r.depth_max_m != null && <Text style={s.siteRowDepth}>{r.depth_max_m}m</Text>}
              </TouchableOpacity>
            ))}
            {!site && (
              <Text style={s.hint}>No site? Just hit Next — you can log without one.</Text>
            )}
          </View>
        )}

        {/* ── Step 2: when & buddy ── */}
        {step === 2 && (
          <View style={s.stepWrap}>
            <Text style={s.fieldLabel}>DATE</Text>
            <TextInput
              style={s.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.tx3}
              returnKeyType="done"
            />
            <Text style={s.fieldLabel}>BUDDY</Text>
            <TextInput
              style={s.input}
              value={buddy}
              onChangeText={setBuddy}
              placeholder="Dive buddy name (optional)"
              placeholderTextColor={colors.tx3}
              returnKeyType="done"
            />
          </View>
        )}

        {/* ── Step 3: depth / time / gas ── */}
        {step === 3 && (
          <View style={s.stepWrap}>
            <View style={s.grid2}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>MAX DEPTH (M)</Text>
                <MonoInput value={depth} onChangeText={setDepth} placeholder="42" unit="m" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>BOTTOM TIME (MIN)</Text>
                <MonoInput value={time} onChangeText={setTime} placeholder="45" unit="min" />
              </View>
            </View>
            <View style={s.gasBadge}>
              <Text style={s.gasName}>{mixLabel(o2Num, heNum)}</Text>
            </View>
            <View style={s.grid2}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>O₂ %</Text>
                <MonoInput value={o2} onChangeText={setO2} placeholder="21" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>HE %</Text>
                <MonoInput value={he} onChangeText={setHe} placeholder="0" />
              </View>
            </View>
          </View>
        )}

        {/* ── Step 4: conditions ── */}
        {step === 4 && (
          <View style={s.stepWrap}>
            <Text style={s.fieldLabel}>VIZ (M)</Text>
            <MonoInput value={viz} onChangeText={setViz} placeholder="20" unit="m" />
            <Text style={s.fieldLabel}>CURRENT</Text>
            {CURRENTS.map((c, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setCurrentIdx(idx => (idx === i ? null : i))}
                style={[s.currentCard, i === currentIdx && s.currentCardActive]}
              >
                <Text style={[s.currentGlyph, i === currentIdx && { color: colors.acc }]}>{c.glyph}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[s.currentLabel, i === currentIdx && { color: colors.acc }]}>{c.label}</Text>
                  <Text style={s.currentDesc}>{c.desc}</Text>
                </View>
                {i === currentIdx && <Text style={{ fontSize: 16, color: colors.acc }}>✓</Text>}
              </TouchableOpacity>
            ))}
            <View style={s.grid2}>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>SURFACE °C</Text>
                <MonoInput value={tempSurface} onChangeText={setTempSurface} placeholder="26" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.fieldLabel}>AT DEPTH °C</Text>
                <MonoInput value={tempBottom} onChangeText={setTempBottom} placeholder="22" />
              </View>
            </View>
          </View>
        )}

        {/* ── Step 5: notes & rating ── */}
        {step === 5 && (
          <View style={s.stepWrap}>
            <Text style={s.fieldLabel}>NOTES</Text>
            <TextInput
              style={s.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="What you saw, how it went…"
              placeholderTextColor={colors.tx3}
              multiline
            />
            <Text style={s.fieldLabel}>RATING</Text>
            <StarRow value={rating} onChange={setRating} />
            {/* Summary before saving */}
            <View style={s.summary}>
              <Text style={s.summaryLine}>
                {site ? site.name : 'No site'} · {date}
              </Text>
              <Text style={s.summaryLine}>
                {depth || '?'}m · {time || '?'}min · {mixLabel(o2Num, heNum)}
                {buddy.trim() ? ` · w/ ${buddy.trim()}` : ''}
              </Text>
            </View>
          </View>
        )}

        {/* ── Nav ── */}
        <View style={s.navRow}>
          {step < 5 ? (
            <TouchableOpacity onPress={next} style={s.btn}>
              <Text style={s.btnText}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={save} disabled={loading} style={[s.btn, loading && { opacity: 0.6 }]}>
              <Text style={s.btnText}>{loading ? 'Saving…' : 'Save dive'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const mono = Platform.select({ ios: 'Courier New', android: 'monospace' })

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  backText: { fontSize: 26, color: colors.tx2, lineHeight: 28 },
  title: { fontSize: 17, fontWeight: '800', color: colors.tx },
  subtitle: { fontSize: 9, fontWeight: '600', color: colors.tx3, letterSpacing: 1.5, fontFamily: mono },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 7, paddingBottom: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.line },
  dotWide: { width: 22 },
  dotActive: { backgroundColor: colors.acc },
  form: { padding: 20, gap: 14, paddingBottom: 48 },
  stepTitle: { fontSize: 23, fontWeight: '800', color: colors.tx },
  stepWrap: { gap: 10 },
  input: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line,
    padding: 13, fontSize: 14, color: colors.tx,
  },
  fieldLabel: {
    fontSize: 9, fontWeight: '600', color: colors.tx3, letterSpacing: 1.5,
    fontFamily: mono, marginTop: 4,
  },
  hint: { fontSize: 12, color: colors.tx3, fontStyle: 'italic' },
  sitePicked: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,180,216,0.08)', borderRadius: 14,
    borderWidth: 1.5, borderColor: colors.acc, padding: 13,
  },
  sitePickedName: { fontSize: 14, fontWeight: '700', color: colors.tx },
  sitePickedSub: { fontSize: 11, color: colors.tx3, fontWeight: '500' },
  siteRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: colors.line, padding: 12,
  },
  siteRowName: { fontSize: 13.5, fontWeight: '700', color: colors.tx },
  siteRowSub: { fontSize: 10.5, color: colors.tx3, fontWeight: '500' },
  siteRowDepth: { fontSize: 11, color: colors.acc, fontWeight: '600', fontFamily: mono },
  grid2: { flexDirection: 'row', gap: 12 },
  monoWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 1, borderColor: colors.line, paddingRight: 12,
  },
  monoInput: {
    flex: 1, padding: 13, fontSize: 18, fontWeight: '700', color: colors.tx, fontFamily: mono,
  },
  monoUnit: { fontSize: 11, color: colors.tx3, fontFamily: mono },
  gasBadge: {
    alignSelf: 'flex-start', backgroundColor: 'rgba(0,180,216,0.12)',
    borderWidth: 1, borderColor: 'rgba(0,180,216,0.4)', borderRadius: 999,
    paddingVertical: 6, paddingHorizontal: 12, marginTop: 4,
  },
  gasName: { fontSize: 12, fontWeight: '700', color: colors.acc, fontFamily: mono },
  currentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.card,
  },
  currentCardActive: { borderColor: colors.acc, backgroundColor: 'rgba(0,180,216,0.08)' },
  currentGlyph: {
    fontSize: 16, fontWeight: '700', color: colors.tx3, width: 34, textAlign: 'center', fontFamily: mono,
  },
  currentLabel: { fontSize: 14, fontWeight: '700', color: colors.tx },
  currentDesc: { fontSize: 11, color: colors.tx3, fontWeight: '500' },
  notesInput: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line,
    padding: 13, fontSize: 13.5, color: colors.tx, height: 110, textAlignVertical: 'top',
  },
  summary: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line,
    padding: 12, gap: 4, marginTop: 6,
  },
  summaryLine: { fontSize: 12, color: colors.tx2, fontWeight: '600', fontFamily: mono },
  navRow: { marginTop: 10 },
  btn: { backgroundColor: colors.acc, borderRadius: 14, padding: 15, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700', color: '#02222e' },
})

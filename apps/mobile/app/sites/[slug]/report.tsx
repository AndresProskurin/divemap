import { useState } from 'react'
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
import { useLocalSearchParams, useRouter } from 'expo-router'
import { insertConditionsReport } from '@divemap/db'
import { createClient } from '../../../lib/supabase'
import { colors } from '@divemap/ui'

type Step = 1 | 2 | 3 | 4 | 'done'

const CURRENTS = [
  { glyph: '—', label: 'None', desc: 'Slack water' },
  { glyph: '›', label: 'Mild', desc: 'Easy to fin against' },
  { glyph: '‹›', label: 'Moderate', desc: 'Work to hold position' },
  { glyph: '›‹›', label: 'Strong', desc: 'Drift dive territory' },
  { glyph: '‹›‹›', label: 'Ripping', desc: 'Hook in or abort' },
] as const

const VIZ_WORDS = (m: number) => {
  if (m < 5) return 'Poor'
  if (m < 10) return 'Fair'
  if (m < 18) return 'Good'
  if (m < 25) return 'Great'
  return 'Gin-clear'
}

function StepDots({ current }: { current: Step }) {
  return (
    <View style={s.dots}>
      {([1, 2, 3, 4] as const).map(n => (
        <View key={n} style={[s.dot, (current === 'done' || n <= (current as number)) && s.dotActive]} />
      ))}
    </View>
  )
}

export default function ReportScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { slug } = useLocalSearchParams<{ slug: string }>()

  const [step, setStep] = useState<Step>(1)
  const [vizM, setVizM] = useState(15)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [tempSurface, setTempSurface] = useState('')
  const [tempBottom, setTempBottom] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const currentLevels = ['none', 'mild', 'moderate', 'strong', 'ripping'] as const
  const currentLevel = currentLevels[currentIdx]!

  const tSurface = parseFloat(tempSurface)
  const tBottom = parseFloat(tempBottom)
  const thermocline = !isNaN(tSurface) && !isNaN(tBottom) && Math.abs(tSurface - tBottom) >= 3

  async function submit() {
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Sign in required', 'Please sign in to submit a conditions report.')
        setSubmitting(false)
        return
      }
      const siteRes = await supabase.from('dive_sites').select('id').eq('slug', slug).single()
      if (!siteRes.data) {
        Alert.alert('Error', 'Site not found.')
        setSubmitting(false)
        return
      }
      const { error } = await insertConditionsReport({
        siteId: siteRes.data.id,
        reporterId: user.id,
        vizM,
        currentLevel,
        tempSurfaceC: isNaN(tSurface) ? undefined : tSurface,
        tempBottomC: isNaN(tBottom) ? undefined : tBottom,
        notes: notes.trim() || undefined,
      }, supabase)
      if (error) { Alert.alert('Error', error); setSubmitting(false); return }
      setStep('done')
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (step === 'done') {
    return (
      <View style={[s.screen, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center', padding: 32 }]}>
        <View style={s.doneCircle}>
          <Text style={s.doneCheck}>✓</Text>
        </View>
        <Text style={s.doneTitle}>Report submitted</Text>
        <Text style={s.doneSub}>Thanks for helping the community!</Text>
        <TouchableOpacity onPress={() => router.back()} style={s.btn}>
          <Text style={s.btnText}>Back to site</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => step === 1 ? router.back() : setStep(prev => (prev as number) - 1 as Step)}>
          <Text style={s.backText}>{step === 1 ? '✕' : '‹'}</Text>
        </TouchableOpacity>
        <Text style={s.title}>Report Conditions</Text>
        <StepDots current={step} />
      </View>

      <ScrollView contentContainerStyle={s.content}>

        {/* Step 1: Visibility */}
        {step === 1 && (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>How was the viz?</Text>
            <Text style={s.stepSub}>Horizontal distance you could see at depth.</Text>

            <View style={s.vizDisplay}>
              <Text style={s.vizNum}>{vizM}</Text>
              <Text style={s.vizUnit}>metres</Text>
            </View>
            <Text style={s.vizWord}>{VIZ_WORDS(vizM)}</Text>

            {/* Gradient bar */}
            <View style={s.vizBar}>
              <View style={[s.vizFill, { width: `${(vizM / 30) * 100}%` as unknown as number }]} />
            </View>

            {/* Stepper */}
            <View style={s.vizStepper}>
              <TouchableOpacity onPress={() => setVizM(v => Math.max(0, v - 1))} style={s.stepBtn}>
                <Text style={s.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.vizRange}>0 – 30 m</Text>
              <TouchableOpacity onPress={() => setVizM(v => Math.min(30, v + 1))} style={s.stepBtn}>
                <Text style={s.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 2: Current */}
        {step === 2 && (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>Current?</Text>
            <Text style={s.stepSub}>How strong was it at depth?</Text>

            {CURRENTS.map((c, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setCurrentIdx(i)}
                style={[s.currentCard, i === currentIdx && s.currentCardActive]}
              >
                <Text style={[s.currentGlyph, i === currentIdx && { color: colors.acc }]}>{c.glyph}</Text>
                <View style={s.currentBody}>
                  <Text style={[s.currentLabel, i === currentIdx && { color: colors.acc }]}>{c.label}</Text>
                  <Text style={s.currentDesc}>{c.desc}</Text>
                </View>
                {i === currentIdx && <Text style={s.currentCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 3: Temperature */}
        {step === 3 && (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>Water temp?</Text>
            <Text style={s.stepSub}>In °C, at the surface and at depth.</Text>

            <View style={s.tempRow}>
              <View style={s.tempField}>
                <Text style={s.fieldLabel}>SURFACE</Text>
                <TextInput
                  style={s.tempInput}
                  value={tempSurface}
                  onChangeText={setTempSurface}
                  placeholder="—"
                  placeholderTextColor={colors.tx3}
                  keyboardType="numeric"
                  returnKeyType="next"
                />
              </View>
              <View style={s.tempField}>
                <Text style={s.fieldLabel}>BOTTOM</Text>
                <TextInput
                  style={s.tempInput}
                  value={tempBottom}
                  onChangeText={setTempBottom}
                  placeholder="—"
                  placeholderTextColor={colors.tx3}
                  keyboardType="numeric"
                  returnKeyType="done"
                />
              </View>
            </View>

            {thermocline && (
              <View style={s.thermoclineWarn}>
                <Text style={s.thermoclineIcon}>⚡</Text>
                <Text style={s.thermoclineText}>Thermocline detected ({Math.abs(tSurface - tBottom).toFixed(1)}°C delta)</Text>
              </View>
            )}

          </View>
        )}

        {/* Step 4: Anything else (design screen 04) */}
        {step === 4 && (
          <View style={s.stepWrap}>
            <Text style={s.stepTitle}>Anything else?</Text>
            <Text style={s.stepSub}>Optional — surge, entry conditions, what you saw.</Text>
            <TextInput
              style={s.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Current direction, surge at entry, what you saw…"
              placeholderTextColor={colors.tx3}
              multiline
            />
          </View>
        )}

        {/* Nav buttons */}
        <View style={s.navRow}>
          {step < 4 ? (
            <TouchableOpacity
              onPress={() => setStep(prev => (prev as number) + 1 as Step)}
              style={s.btn}
            >
              <Text style={s.btnText}>Next →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={submit}
              disabled={submitting}
              style={[s.btn, submitting && { opacity: 0.6 }]}
            >
              <Text style={s.btnText}>{submitting ? 'Submitting…' : 'Submit report'}</Text>
            </TouchableOpacity>
          )}
        </View>

      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  backText: { fontSize: 22, color: colors.tx2, width: 28 },
  title: { flex: 1, fontSize: 17, fontWeight: '800', color: colors.tx },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.line },
  dotActive: { backgroundColor: colors.acc },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  stepWrap: { gap: 14 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: colors.tx },
  stepSub: { fontSize: 13, color: colors.tx3, fontWeight: '500' },
  vizDisplay: { flexDirection: 'row', alignItems: 'baseline', gap: 6, justifyContent: 'center', marginVertical: 8 },
  vizNum: {
    fontSize: 56, fontWeight: '800', color: colors.tx,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  vizUnit: { fontSize: 16, fontWeight: '600', color: colors.tx3 },
  vizWord: { fontSize: 14, fontWeight: '700', color: colors.acc, textAlign: 'center' },
  vizBar: {
    height: 6, borderRadius: 3, backgroundColor: colors.line,
    overflow: 'hidden', marginVertical: 4,
  },
  vizFill: { height: '100%', backgroundColor: colors.acc, borderRadius: 3 },
  vizStepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20,
  },
  stepBtn: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnText: { fontSize: 22, color: colors.acc, lineHeight: 26 },
  vizRange: {
    fontSize: 11, color: colors.tx3,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  currentCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 13, borderRadius: 14, borderWidth: 1, borderColor: colors.line,
    backgroundColor: colors.card,
  },
  currentCardActive: { borderColor: colors.acc, backgroundColor: 'rgba(0,180,216,0.08)' },
  currentGlyph: {
    fontSize: 18, fontWeight: '700', color: colors.tx3, width: 32, textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  currentBody: { flex: 1, gap: 2 },
  currentLabel: { fontSize: 14, fontWeight: '700', color: colors.tx },
  currentDesc: { fontSize: 11, color: colors.tx3, fontWeight: '500' },
  currentCheck: { fontSize: 16, color: colors.acc },
  tempRow: { flexDirection: 'row', gap: 12 },
  tempField: { flex: 1, gap: 6 },
  fieldLabel: {
    fontSize: 9, fontWeight: '600', color: colors.tx3, letterSpacing: 1.5,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  tempInput: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line,
    padding: 12, fontSize: 22, fontWeight: '700', color: colors.tx, textAlign: 'center',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  thermoclineWarn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,183,3,0.1)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(255,183,3,0.4)', padding: 12,
  },
  thermoclineIcon: { fontSize: 14 },
  thermoclineText: { fontSize: 12, color: colors.warn, fontWeight: '600', flex: 1 },
  notesInput: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line,
    padding: 13, fontSize: 13.5, color: colors.tx, height: 128, textAlignVertical: 'top',
  },
  navRow: { marginTop: 8 },
  btn: { backgroundColor: colors.acc, borderRadius: 14, padding: 15, alignItems: 'center' },
  btnText: { fontSize: 15, fontWeight: '700', color: '#02222e' },
  doneCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(0,180,216,0.12)', borderWidth: 1.5, borderColor: colors.acc,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  doneCheck: { fontSize: 28, color: colors.acc },
  doneTitle: { fontSize: 22, fontWeight: '800', color: colors.tx, marginBottom: 6 },
  doneSub: { fontSize: 13, color: colors.tx3, marginBottom: 24 },
})

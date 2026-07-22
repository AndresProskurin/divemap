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
import { useRouter } from 'expo-router'
import { insertDive } from '@divemap/db'
import { createClient } from '../../lib/supabase'
import { colors } from '@divemap/ui'

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

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{label}</Text>
      {children}
    </View>
  )
}

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
      {[1, 2, 3, 4, 5].map(s => (
        <TouchableOpacity key={s} onPress={() => onChange(s === value ? 0 : s)}>
          <Text style={{ fontSize: 24, color: s <= value ? colors.warn : colors.line }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

export default function LogScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [date, setDate] = useState(todayISO())
  const [depth, setDepth] = useState('')
  const [time, setTime] = useState('')
  const [o2, setO2] = useState('21')
  const [he, setHe] = useState('0')
  const [viz, setViz] = useState('')
  const [buddy, setBuddy] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState(0)
  const [loading, setLoading] = useState(false)

  const o2Num = Math.min(100, Math.max(5, parseFloat(o2) || 21))
  const heNum = Math.min(95, Math.max(0, parseFloat(he) || 0))
  const gasName = mixLabel(o2Num, heNum)

  async function save() {
    const depthNum = parseFloat(depth)
    const timeNum = parseFloat(time)
    if (isNaN(depthNum) || depthNum <= 0) { Alert.alert('Error', 'Enter a valid depth.'); return }
    if (isNaN(timeNum) || timeNum <= 0) { Alert.alert('Error', 'Enter a valid bottom time.'); return }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { Alert.alert('Sign in', 'Please sign in to log a dive.'); return }

      const vizNum = parseFloat(viz)
      const { error } = await insertDive({
        userId: user.id,
        siteId: null,
        divedAt: date,
        maxDepthM: depthNum,
        bottomTimeMin: timeNum,
        gasO2: o2Num,
        gasHe: heNum > 0 ? heNum : null,
        vizM: isNaN(vizNum) ? null : vizNum,
        buddy: buddy.trim() || null,
        notes: notes.trim() || null,
        rating: rating > 0 ? rating : null,
      }, supabase)

      if (error) { Alert.alert('Error', error); return }
      Alert.alert('Logged!', 'Dive saved.', [{ text: 'OK', onPress: () => router.push('/(tabs)/profile') }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>Log a Dive</Text>
      </View>

      <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">

        <Section label="WHEN">
          <TextInput
            style={s.input}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.tx3}
            keyboardType="default"
            returnKeyType="done"
          />
        </Section>

        <Section label="DIVE">
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
          <Text style={s.fieldLabel}>VIZ (M)</Text>
          <MonoInput value={viz} onChangeText={setViz} placeholder="20" unit="m" />
        </Section>

        <Section label="GAS MIX">
          <View style={s.gasBadge}>
            <Text style={s.gasName}>{gasName}</Text>
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
        </Section>

        <Section label="DETAILS">
          <Text style={s.fieldLabel}>BUDDY</Text>
          <TextInput
            style={s.input}
            value={buddy}
            onChangeText={setBuddy}
            placeholder="Dive buddy name"
            placeholderTextColor={colors.tx3}
            returnKeyType="next"
          />
          <Text style={s.fieldLabel}>NOTES</Text>
          <TextInput
            style={[s.input, { height: 88, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Highlights, critters spotted…"
            placeholderTextColor={colors.tx3}
            multiline
          />
          <Text style={s.fieldLabel}>RATING</Text>
          <StarRow value={rating} onChange={setRating} />
        </Section>

        <TouchableOpacity
          onPress={save}
          disabled={loading}
          style={[s.btn, loading && { opacity: 0.6 }]}
        >
          <Text style={s.btnText}>{loading ? 'Saving…' : 'Save dive'}</Text>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.tx,
  },
  form: {
    padding: 16,
    gap: 16,
    paddingBottom: 48,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 10,
  },
  sectionLabel: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    fontSize: 9,
    fontWeight: '600',
    color: colors.tx3,
    letterSpacing: 2,
  },
  fieldLabel: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    fontSize: 8.5,
    fontWeight: '600',
    color: colors.tx3,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.tx,
    fontWeight: '500',
  },
  grid2: {
    flexDirection: 'row',
    gap: 10,
  },
  monoWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    overflow: 'hidden',
  },
  monoInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 20,
    fontWeight: '700',
    color: colors.tx,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    textAlign: 'center',
  },
  monoUnit: {
    paddingRight: 10,
    fontSize: 10,
    fontWeight: '600',
    color: colors.tx3,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  gasBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.chip,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,180,216,0.35)',
  },
  gasName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.acc,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  btn: {
    backgroundColor: colors.acc,
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#02222e',
  },
})

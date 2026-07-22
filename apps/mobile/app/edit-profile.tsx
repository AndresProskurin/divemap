/**
 * Profile settings (mobile): display name, bio, home country, plus the
 * certification and gear editors backed by the shared CERT_CATALOG.
 */

import { useEffect, useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import type { Certification, GearItem } from '@divemap/db'
import { getUserProfile, updateUserProfile, CERT_CATALOG, GEAR_CATEGORIES } from '@divemap/db'
import { createClient } from '../lib/supabase'
import { colors } from '@divemap/ui'

const mono = Platform.select({ ios: 'Courier New', android: 'monospace' })

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [homeCountry, setHomeCountry] = useState('')
  const [certs, setCerts] = useState<Certification[]>([])
  const [gear, setGear] = useState<GearItem[]>([])

  // Pickers
  const [agencyIdx, setAgencyIdx] = useState(0)
  const [certIdx, setCertIdx] = useState(0)
  const [gearCatIdx, setGearCatIdx] = useState(0)
  const [gearName, setGearName] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        Alert.alert('Sign in required', undefined, [{ text: 'OK', onPress: () => router.back() }])
        return
      }
      const profile = await getUserProfile(user.id, supabase)
      if (cancelled) return
      setUserId(user.id)
      setDisplayName(profile?.display_name ?? '')
      setBio(profile?.bio ?? '')
      setHomeCountry(profile?.home_country ?? '')
      setCerts((profile?.certifications as unknown as Certification[] | null) ?? [])
      setGear((profile?.gear as unknown as GearItem[] | null) ?? [])
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [router])

  function addCert() {
    const cat = CERT_CATALOG[agencyIdx]?.certs[certIdx]
    if (!cat) return
    if (certs.some(c => c.abbr === cat.abbr && c.org === cat.org)) return
    setCerts(prev => [...prev, { ...cat, year: new Date().getFullYear() }])
  }

  function addGear() {
    const name = gearName.trim()
    if (!name) return
    const category = GEAR_CATEGORIES[gearCatIdx] ?? 'Other'
    setGear(prev => [...prev, { category, name }])
    setGearName('')
  }

  async function save() {
    if (!userId) return
    setSaving(true)
    const { error } = await updateUserProfile(
      userId,
      {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        home_country: homeCountry.trim() || null,
        certifications: certs,
        gear,
      },
      createClient(),
    )
    setSaving(false)
    if (error) Alert.alert('Error', error)
    else router.back()
  }

  if (loading) {
    return (
      <View style={[s.screen, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.acc} />
      </View>
    )
  }

  const agency = CERT_CATALOG[agencyIdx]

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}>
          <Text style={s.headerBtnText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={s.title}>Edit profile</Text>
        <TouchableOpacity onPress={save} disabled={saving} style={s.headerBtn}>
          <Text style={[s.headerBtnText, { color: colors.acc, fontWeight: '700' }]}>
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>DISPLAY NAME</Text>
        <TextInput style={s.input} value={displayName} onChangeText={setDisplayName} placeholder="Your name" placeholderTextColor={colors.tx3} />

        <Text style={s.label}>BIO</Text>
        <TextInput
          style={[s.input, s.multiline]}
          value={bio}
          onChangeText={setBio}
          placeholder="A few words about you…"
          placeholderTextColor={colors.tx3}
          multiline
          maxLength={280}
        />

        <Text style={s.label}>HOME COUNTRY</Text>
        <TextInput style={s.input} value={homeCountry} onChangeText={setHomeCountry} placeholder="e.g. Estonia" placeholderTextColor={colors.tx3} />

        {/* ── Certifications ── */}
        <Text style={s.label}>CERTIFICATIONS</Text>
        {certs.map((c, i) => (
          <View key={`${c.org}-${c.abbr}`} style={s.row}>
            <Text style={s.rowBadge}>{c.abbr}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowTitle}>{c.name}</Text>
              <Text style={s.rowSub}>{c.org} · {c.year}</Text>
            </View>
            <TouchableOpacity onPress={() => setCerts(prev => prev.filter((_, j) => j !== i))}>
              <Text style={s.remove}>×</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Agency selector chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.hScroll} contentContainerStyle={s.chipRow}>
          {CERT_CATALOG.map((a, i) => (
            <TouchableOpacity
              key={a.agency}
              onPress={() => { setAgencyIdx(i); setCertIdx(0) }}
              style={[s.chip, i === agencyIdx && s.chipActive]}
            >
              <Text style={[s.chipText, i === agencyIdx && s.chipTextActive]}>{a.agency}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {/* Cert selector chips for the chosen agency */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.hScroll} contentContainerStyle={s.chipRow}>
          {(agency?.certs ?? []).map((c, i) => (
            <TouchableOpacity
              key={c.abbr}
              onPress={() => setCertIdx(i)}
              style={[s.chip, i === certIdx && s.chipActive]}
            >
              <Text style={[s.chipText, i === certIdx && s.chipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={addCert} style={s.addBtn}>
          <Text style={s.addBtnText}>+ Add certification</Text>
        </TouchableOpacity>

        {/* ── Gear ── */}
        <Text style={s.label}>GEAR</Text>
        {gear.map((g, i) => (
          <View key={`${g.category}-${g.name}-${i}`} style={s.row}>
            <Text style={[s.rowSub, { width: 84 }]}>{g.category.toUpperCase()}</Text>
            <Text style={[s.rowTitle, { flex: 1 }]}>{g.name}</Text>
            <TouchableOpacity onPress={() => setGear(prev => prev.filter((_, j) => j !== i))}>
              <Text style={s.remove}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.hScroll} contentContainerStyle={s.chipRow}>
          {GEAR_CATEGORIES.map((c, i) => (
            <TouchableOpacity
              key={c}
              onPress={() => setGearCatIdx(i)}
              style={[s.chip, i === gearCatIdx && s.chipActive]}
            >
              <Text style={[s.chipText, i === gearCatIdx && s.chipTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            value={gearName}
            onChangeText={setGearName}
            placeholder="e.g. Shearwater Perdix 2"
            placeholderTextColor={colors.tx3}
            onSubmitEditing={addGear}
            returnKeyType="done"
          />
          <TouchableOpacity onPress={addGear} style={[s.addBtn, { marginTop: 0, paddingHorizontal: 16 }]}>
            <Text style={s.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  headerBtn: { minWidth: 60 },
  headerBtnText: { fontSize: 14, color: colors.tx2 },
  title: { fontSize: 16, fontWeight: '800', color: colors.tx },
  form: { padding: 18, paddingBottom: 60, gap: 8 },
  label: {
    fontSize: 9, fontWeight: '600', color: colors.tx3, letterSpacing: 1.5,
    fontFamily: mono, marginTop: 14, marginBottom: 2,
  },
  input: {
    backgroundColor: colors.card, borderRadius: 12, borderWidth: 1, borderColor: colors.line,
    padding: 12, fontSize: 14, color: colors.tx,
  },
  multiline: { height: 84, textAlignVertical: 'top' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line,
    borderRadius: 12, padding: 11,
  },
  rowBadge: {
    fontSize: 10, fontWeight: '700', color: colors.acc, fontFamily: mono,
    borderWidth: 1, borderColor: colors.acc, borderRadius: 5,
    paddingHorizontal: 5, paddingVertical: 2, overflow: 'hidden',
  },
  rowTitle: { fontSize: 13, fontWeight: '700', color: colors.tx },
  rowSub: { fontSize: 9.5, color: colors.tx3, fontFamily: mono },
  remove: { fontSize: 18, color: colors.tx3, paddingHorizontal: 4 },
  hScroll: { flexGrow: 0 },
  chipRow: { gap: 7, paddingVertical: 4, flexDirection: 'row' },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999,
    borderWidth: 1, borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.chip, borderColor: colors.acc },
  chipText: { fontSize: 11.5, fontWeight: '600', color: colors.tx3 },
  chipTextActive: { color: colors.acc },
  addBtn: {
    marginTop: 4, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: colors.acc, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(0,180,216,0.08)',
  },
  addBtnText: { fontSize: 12.5, fontWeight: '700', color: colors.acc },
})

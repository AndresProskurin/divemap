import { useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { computeDivePlan } from '@divemap/deco-engine'
import type { DecoStop } from '@divemap/deco-engine'
import { colors } from '@divemap/ui'

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function gasLabel(o2Frac: number, heFrac: number): string {
  const o2 = Math.round(o2Frac * 100)
  const he = Math.round(heFrac * 100)
  if (he > 0) return `TX ${o2}/${he}`
  if (o2 === 21) return 'Air'
  return `EAN${o2}`
}

function cnsColor(pct: number): string {
  if (pct >= 80) return colors.dang
  if (pct >= 50) return colors.warn
  return colors.ok
}

function SliderRow({
  label, value, min, max, step, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void
}) {
  return (
    <View style={s.sliderRow}>
      <Text style={s.sliderLabel}>{label}</Text>
      <View style={s.sliderControls}>
        <TouchableOpacity onPress={() => onChange(clamp(value - step, min, max))} style={s.sliderBtn}>
          <Text style={s.sliderBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={s.sliderValue}>{value}</Text>
        <TouchableOpacity onPress={() => onChange(clamp(value + step, min, max))} style={s.sliderBtn}>
          <Text style={s.sliderBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

function DecoRow({ stop, index }: { stop: DecoStop; index: number }) {
  const o2 = Math.round(stop.gasMix.fO2 * 100)
  const he = Math.round(stop.gasMix.fHe * 100)
  return (
    <View style={[s.decoRow, index % 2 === 1 && s.decoRowAlt]}>
      <Text style={s.decoDepth}>{stop.depth} m</Text>
      <Text style={s.decoDuration}>{stop.duration} min</Text>
      <Text style={s.decoGas}>{gasLabel(o2 / 100, he / 100)}</Text>
    </View>
  )
}

export default function PlannerScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const params = useLocalSearchParams<{ depth?: string }>()

  const defaultDepth = parseInt(params.depth ?? '30', 10)

  const [depth, setDepth] = useState(isNaN(defaultDepth) ? 30 : clamp(defaultDepth, 5, 120))
  const [bottomTime, setBottomTime] = useState(20)
  const [o2, setO2] = useState(21)
  const [he, setHe] = useState(0)
  const [gfLo, setGfLo] = useState(30)
  const [gfHi, setGfHi] = useState(70)

  const plan = useMemo(() => {
    const fO2 = clamp(o2, 5, 100) / 100
    const fHe = clamp(he, 0, 95 - clamp(o2, 5, 100)) / 100
    return computeDivePlan({
      depth,
      bottomTime,
      gasMix: { fO2, fHe },
      gradientFactors: { gfLo, gfHi },
    })
  }, [depth, bottomTime, o2, he, gfLo, gfHi])

  const fO2 = o2 / 100
  const fHe = clamp(he, 0, 95 - o2) / 100
  const gasName = gasLabel(fO2, fHe)
  const isNoDeco = plan.decoStops.length === 0

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View>
          <Text style={s.title}>Tech Planner</Text>
          <Text style={s.subtitle}>Bühlmann ZHL-16C</Text>
        </View>
        <View style={[s.gasPill, { backgroundColor: isNoDeco ? 'rgba(51,214,195,0.15)' : 'rgba(255,93,125,0.15)' }]}>
          <Text style={[s.gasPillText, { color: isNoDeco ? colors.ok : colors.dang }]}>{gasName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Input panel */}
        <View style={s.panel}>
          <Text style={s.panelLabel}>DIVE PARAMETERS</Text>
          <SliderRow label="Depth (m)" value={depth} min={5} max={120} step={1} onChange={setDepth} />
          <SliderRow label="Bottom time (min)" value={bottomTime} min={1} max={120} step={1} onChange={setBottomTime} />

          <View style={s.divider} />

          <Text style={s.panelLabel}>GAS MIX</Text>
          <SliderRow label="O₂ %" value={o2} min={5} max={100} step={1} onChange={setO2} />
          <SliderRow label="He %" value={clamp(he, 0, 95 - o2)} min={0} max={Math.max(0, 95 - o2)} step={1} onChange={setHe} />

          <View style={s.divider} />

          <Text style={s.panelLabel}>GRADIENT FACTORS</Text>
          <SliderRow label="GF Low %" value={gfLo} min={10} max={100} step={5} onChange={setGfLo} />
          <SliderRow label="GF High %" value={gfHi} min={10} max={100} step={5} onChange={setGfHi} />
        </View>

        {/* Result summary */}
        <View style={s.summaryRow}>
          <View style={s.summaryCell}>
            <Text style={s.summaryVal}>{plan.totalRuntime}</Text>
            <Text style={s.summaryLabel}>RUNTIME (MIN)</Text>
          </View>
          <View style={[s.summaryCell, s.summaryCellBorder]}>
            <Text style={[s.summaryVal, { color: isNoDeco ? colors.ok : colors.tx }]}>
              {isNoDeco ? `NDL ${plan.ndl}` : `${plan.decoStops.length} STOPS`}
            </Text>
            <Text style={s.summaryLabel}>{isNoDeco ? 'NO DECO' : 'DECO'}</Text>
          </View>
          <View style={[s.summaryCell, s.summaryCellBorder]}>
            <Text style={[s.summaryVal, { color: cnsColor(plan.cnsPercent) }]}>
              {plan.cnsPercent.toFixed(0)}%
            </Text>
            <Text style={s.summaryLabel}>CNS O₂</Text>
          </View>
          <View style={[s.summaryCell, s.summaryCellBorder]}>
            <Text style={s.summaryVal}>{plan.otu.toFixed(0)}</Text>
            <Text style={s.summaryLabel}>OTU</Text>
          </View>
        </View>

        {/* Deco table */}
        {plan.decoStops.length > 0 ? (
          <View style={s.panel}>
            <Text style={s.panelLabel}>DECO TABLE</Text>
            {/* Header */}
            <View style={[s.decoRow, s.decoHeader]}>
              <Text style={s.decoHeaderText}>DEPTH</Text>
              <Text style={s.decoHeaderText}>STOP</Text>
              <Text style={s.decoHeaderText}>GAS</Text>
            </View>
            {plan.decoStops.map((stop, i) => (
              <DecoRow key={i} stop={stop} index={i} />
            ))}
          </View>
        ) : (
          <View style={s.noDeco}>
            <Text style={s.noDecoIcon}>✓</Text>
            <Text style={s.noDecoText}>No decompression required</Text>
            <Text style={s.noDecoSub}>NDL: {plan.ndl} min at {depth} m</Text>
          </View>
        )}

        {/* OTU note */}
        <Text style={s.note}>
          CNS and OTU values are for planning only. Always follow current dive tables and training.
        </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 22,
    color: colors.tx,
    lineHeight: 26,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.tx,
  },
  subtitle: {
    fontSize: 9,
    color: colors.tx3,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    letterSpacing: 1,
  },
  gasPill: {
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  gasPillText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  content: {
    padding: 14,
    gap: 14,
    paddingBottom: 48,
  },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    gap: 10,
  },
  panelLabel: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    fontSize: 9,
    fontWeight: '600',
    color: colors.tx3,
    letterSpacing: 2,
  },
  sliderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.tx,
    flex: 1,
  },
  sliderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderBtnText: {
    fontSize: 18,
    color: colors.acc,
    lineHeight: 20,
  },
  sliderValue: {
    width: 42,
    fontSize: 18,
    fontWeight: '700',
    color: colors.tx,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 14,
  },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  summaryCellBorder: {
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
  },
  summaryVal: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.tx,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  summaryLabel: {
    fontSize: 7.5,
    fontWeight: '600',
    color: colors.tx3,
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  decoHeader: {
    backgroundColor: 'rgba(148,196,230,0.06)',
  },
  decoHeaderText: {
    flex: 1,
    fontSize: 8.5,
    fontWeight: '700',
    color: colors.tx3,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    letterSpacing: 1.2,
  },
  decoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  decoRowAlt: {
    backgroundColor: 'rgba(148,196,230,0.04)',
  },
  decoDepth: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.tx,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  decoDuration: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.tx2,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  decoGas: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.acc,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  noDeco: {
    backgroundColor: 'rgba(51,214,195,0.08)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(51,214,195,0.3)',
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  noDecoIcon: {
    fontSize: 28,
    color: colors.ok,
  },
  noDecoText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.ok,
  },
  noDecoSub: {
    fontSize: 12,
    color: colors.tx3,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
  note: {
    fontSize: 10.5,
    color: colors.tx3,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 15,
  },
})

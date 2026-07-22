'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { computeDivePlan } from '@divemap/deco-engine'
import type { GasMix, DivePlanResult } from '@divemap/deco-engine'
import { createClient, insertPlan, useAuth } from '@divemap/db'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DecoGas {
  fO2: number
  fHe: number
  label: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PRESET_DECO_GASES: DecoGas[] = [
  { fO2: 0.50, fHe: 0, label: 'EAN50' },
  { fO2: 1.00, fHe: 0, label: 'O₂ 100%' },
  { fO2: 0.36, fHe: 0, label: 'EAN36' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcMod(fO2: number, maxPpO2 = 1.4): number {
  if (fO2 <= 0) return Infinity
  return Math.round((maxPpO2 / fO2 - 10) * 10) / 10
}

function mixLabel(fO2: number, fHe: number): string {
  const o2 = Math.round(fO2 * 100)
  const he = Math.round(fHe * 100)
  if (he === 0) return o2 === 21 ? 'Air' : `EAN${o2}`
  return `TMX ${o2}/${he}`
}

function cnsColor(cns: number): string {
  if (cns >= 80) return '#ff5d7d'
  if (cns >= 60) return '#ffb703'
  return '#eaf6fd'
}

// ── SVG Depth Profile ─────────────────────────────────────────────────────────
// SVG canvas: 148 × 308 px. Plot area: x 10–118, y 8–276.

const SVG_W = 148
const SVG_H = 308
const PLOT_X0 = 10
const PLOT_X1 = 118
const PLOT_Y0 = 8
const PLOT_Y1 = 276

interface ProfilePoint { x: number; y: number }

function buildProfile(
  depth: number,
  descentRate: number,
  result: DivePlanResult,
  bottomTime: number,
): { path: string; dots: ProfilePoint[]; gridLines: Array<{ y: number; ty: number; label: string }> } {
  const maxDepth = depth
  const totalRuntime = result.totalRuntime

  const xOf = (t: number) => PLOT_X0 + ((t / totalRuntime) * (PLOT_X1 - PLOT_X0))
  const yOf = (d: number) => PLOT_Y0 + ((d / (maxDepth * 1.1)) * (PLOT_Y1 - PLOT_Y0))

  const descentTime = depth / descentRate
  const flatTime = Math.max(0, bottomTime - descentTime)

  const pts: ProfilePoint[] = [{ x: xOf(0), y: yOf(0) }]
  pts.push({ x: xOf(descentTime), y: yOf(depth) })
  pts.push({ x: xOf(descentTime + flatTime), y: yOf(depth) })

  // Add deco stop breakpoints
  let t = descentTime + flatTime
  const ascRate = 9
  const stops = [...result.decoStops].sort((a, b) => b.depth - a.depth)

  if (stops.length > 0) {
    const firstStop = stops[0]!.depth
    const ascToFirst = (depth - firstStop) / ascRate
    t += ascToFirst
    pts.push({ x: xOf(t), y: yOf(firstStop) })

    let curDepth = firstStop
    for (const stop of stops) {
      if (stop.depth < curDepth) {
        const ascTime = (curDepth - stop.depth) / ascRate
        t += ascTime
        pts.push({ x: xOf(t), y: yOf(stop.depth) })
        curDepth = stop.depth
      }
      t += stop.duration
      pts.push({ x: xOf(t), y: yOf(curDepth) })
    }
    const finalAsc = curDepth / ascRate
    t += finalAsc
  } else {
    const ascTime = depth / ascRate
    t += ascTime
  }

  pts.push({ x: xOf(totalRuntime), y: yOf(0) })

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')

  const dots = stops.map((s) => {
    const idx = pts.findIndex((p) => Math.abs(p.y - yOf(s.depth)) < 2)
    return idx >= 0 ? pts[idx]! : { x: PLOT_X0, y: yOf(s.depth) }
  })

  // Grid lines at even depth intervals
  const gridStep = maxDepth <= 30 ? 10 : maxDepth <= 60 ? 20 : 30
  const gridLines = []
  for (let d = 0; d <= maxDepth; d += gridStep) {
    const y = yOf(d)
    gridLines.push({ y: parseFloat(y.toFixed(1)), ty: parseFloat((y + 3).toFixed(1)), label: `${d}` })
  }

  return { path, dots, gridLines }
}

// ── Number Input ──────────────────────────────────────────────────────────────

function NumInput({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <div className="flex flex-col gap-[5px]">
      <span
        className="font-mono font-semibold uppercase"
        style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.1em' }}
      >
        {label}
      </span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v)))
        }}
        className="font-mono font-semibold w-full rounded-[10px] px-3 py-[9px]"
        style={{
          background: 'var(--inputbg, #08192b)',
          border: '1px solid var(--line)',
          color: 'var(--tx)',
          fontSize: '18px',
        }}
      />
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function TechPlannerPage() {
  const params = useSearchParams()
  const siteSlug = params.get('site') ?? null
  const initialDepth = Math.min(150, Math.max(5, parseInt(params.get('depth') ?? '40', 10)))
  // Saved-plan prefill: /planner?depth=…&time=…&o2=…&he=…&gflo=…&gfhi=…
  // The engine recomputes from these inputs; nothing else is restored.
  const intParam = (key: string, fallback: number, lo: number, hi: number) => {
    const raw = parseInt(params.get(key) ?? '', 10)
    return Number.isNaN(raw) ? fallback : Math.min(hi, Math.max(lo, raw))
  }

  const [depth, setDepth] = useState(initialDepth)
  const [bottomTime, setBottomTime] = useState(() => intParam('time', 30, 1, 300))
  const [o2Pct, setO2Pct] = useState(() => intParam('o2', 21, 5, 100))
  const [hePct, setHePct] = useState(() => intParam('he', 0, 0, 95))
  const [gfLo, setGfLo] = useState(() => intParam('gflo', 40, 10, 100))
  const [gfHi, setGfHi] = useState(() => intParam('gfhi', 85, 10, 100))
  const [decoGases, setDecoGases] = useState<DecoGas[]>([])

  // ── Save plan ─────────────────────────────────────────────────────────────

  const { user } = useAuth()
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // Any input change invalidates the previous "Saved ✓".
  useEffect(() => {
    setSaveState((s) => (s === 'saved' ? 'idle' : s))
  }, [depth, bottomTime, o2Pct, hePct, gfLo, gfHi, decoGases])

  // Clamp gas fractions on change
  const handleO2 = useCallback((v: number) => setO2Pct(Math.min(100 - hePct, v)), [hePct])
  const handleHe = useCallback((v: number) => setHePct(Math.min(100 - o2Pct, v)), [o2Pct])

  const result = useMemo<DivePlanResult>(() => {
    const mix: GasMix = { fO2: o2Pct / 100, fHe: hePct / 100 }
    try {
      return computeDivePlan({
        depth,
        bottomTime,
        gasMix: mix,
        gradientFactors: { gfLo, gfHi },
      })
    } catch {
      return {
        decoStops: [],
        totalRuntime: Math.round(depth / 9 + bottomTime),
        ndl: 0,
        cnsPercent: 0,
        otu: 0,
        ceilingByMinute: [],
      }
    }
  }, [depth, bottomTime, o2Pct, hePct, gfLo, gfHi])

  const ppO2 = (1.01325 + depth / 10) * (o2Pct / 100)
  const mod = calcMod(o2Pct / 100)
  const tts = result.totalRuntime - bottomTime
  const noDeco = result.decoStops.length === 0

  // ── Warnings ──────────────────────────────────────────────────────────────

  const warnings: Array<{ text: string; level: 'warn' | 'dang' }> = []
  if (ppO2 > 1.6) warnings.push({ text: `ppO₂ ${ppO2.toFixed(2)} bar — EXCEEDS 1.6 bar hard limit`, level: 'dang' })
  else if (ppO2 > 1.4) warnings.push({ text: `ppO₂ ${ppO2.toFixed(2)} bar — above 1.4 bar working limit`, level: 'warn' })
  if (result.cnsPercent > 80) warnings.push({ text: `CNS ${result.cnsPercent.toFixed(1)}% — oxygen toxicity risk`, level: 'dang' })
  if (hePct > 0 && hePct + o2Pct > 100) warnings.push({ text: 'Gas fractions exceed 100%', level: 'dang' })

  // ── Deco gas chip helpers ─────────────────────────────────────────────────

  const addDecoGas = useCallback((gas: DecoGas) => {
    setDecoGases((prev) => prev.some((g) => g.label === gas.label) ? prev : [...prev, gas])
  }, [])
  const removeDecoGas = useCallback((label: string) => {
    setDecoGases((prev) => prev.filter((g) => g.label !== label))
  }, [])
  const availablePresets = PRESET_DECO_GASES.filter(
    (g) => !decoGases.some((d) => d.label === g.label)
  )

  const handleSavePlan = useCallback(async () => {
    if (!user || saveState === 'saving') return
    setSaveState('saving')
    try {
      const supabase = createClient()
      // Plans store site_id, but the planner only carries the slug from the
      // "Plan This Dive" link — resolve it here; a plan without a site is fine.
      let siteId: string | null = null
      let siteName: string | null = null
      if (siteSlug) {
        const { data } = await supabase
          .from('dive_sites')
          .select('id, name')
          .eq('slug', siteSlug)
          .single()
        siteId = data?.id ?? null
        siteName = data?.name ?? null
      }
      const res = await insertPlan(
        {
          user_id: user.id,
          site_id: siteId,
          name: `${siteName ?? mixLabel(o2Pct / 100, hePct / 100)} · ${depth}m / ${bottomTime}min`,
          depth_m: depth,
          bottom_time_min: bottomTime,
          gas_o2: o2Pct / 100,
          gas_he: hePct / 100,
          gf_lo: gfLo,
          gf_hi: gfHi,
          deco_gases: decoGases.map((g) => ({ fO2: g.fO2, fHe: g.fHe })),
          runtime_min: result.totalRuntime,
          tts_min: tts,
          stop_count: result.decoStops.length,
        },
        supabase,
      )
      setSaveState('error' in res ? 'error' : 'saved')
    } catch {
      setSaveState('error')
    }
  }, [user, saveState, siteSlug, depth, bottomTime, o2Pct, hePct, gfLo, gfHi, decoGases, result, tts])

  // ── SVG Profile ───────────────────────────────────────────────────────────

  const [svgKey, setSvgKey] = useState(0)
  useEffect(() => { setSvgKey((k) => k + 1) }, [result])

  const { path, dots, gridLines } = useMemo(
    () => buildProfile(depth, 18, result, bottomTime),
    [depth, result, bottomTime],
  )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'var(--bg)', paddingTop: '60px' }}
    >
      {/* ── Header ── */}
      <div className="flex items-center gap-[11px] px-4 pb-[10px] pt-[6px]">
        <Link
          href={siteSlug ? `/sites/${siteSlug}` : '/'}
          className="flex items-center justify-center"
          style={{ color: 'var(--tx2)' }}
        >
          <svg width="10" height="17" viewBox="0 0 10 17">
            <path d="M8.5 1.5L2 8.5l6.5 7" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="flex-1 flex flex-col">
          <span className="font-extrabold" style={{ fontSize: '17px', color: 'var(--tx)' }}>
            Tech Planner
          </span>
          {siteSlug && (
            <span style={{ fontSize: '10.5px', color: 'var(--tx3)', fontWeight: 500 }}>
              {siteSlug.replace(/-/g, ' ')}
            </span>
          )}
        </div>
        <span
          className="font-mono font-bold"
          style={{
            fontSize: '9px',
            color: 'var(--acc)',
            border: '1px solid var(--acc)',
            borderRadius: '6px',
            padding: '4px 7px',
            letterSpacing: '0.1em',
          }}
        >
          OC · ZHL-16C
        </span>
        {saveState === 'saved' ? (
          <Link
            href="/profile"
            className="font-mono font-bold"
            style={{
              fontSize: '9px',
              color: 'var(--ok)',
              border: '1px solid var(--ok)',
              borderRadius: '6px',
              padding: '4px 7px',
              letterSpacing: '0.1em',
            }}
          >
            SAVED ✓
          </Link>
        ) : (
          <button
            onClick={handleSavePlan}
            disabled={saveState === 'saving'}
            className="font-mono font-bold"
            style={{
              fontSize: '9px',
              color: saveState === 'error' ? 'var(--dang)' : '#02222e',
              background: saveState === 'error' ? 'transparent' : 'var(--acc)',
              border: saveState === 'error' ? '1px solid var(--dang)' : '1px solid var(--acc)',
              borderRadius: '6px',
              padding: '4px 7px',
              letterSpacing: '0.1em',
              cursor: saveState === 'saving' ? 'default' : 'pointer',
              opacity: saveState === 'saving' ? 0.6 : 1,
            }}
          >
            {saveState === 'saving' ? 'SAVING…' : saveState === 'error' ? 'RETRY SAVE' : 'SAVE PLAN'}
          </button>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto px-[14px] pb-16 flex flex-col gap-[11px]">

        {/* ── Gas inputs ── */}
        <div
          className="flex flex-col gap-[10px] rounded-16 p-[13px]"
          style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
        >
          <div className="grid grid-cols-2 gap-[9px]">
            <NumInput label={`BOTTOM DEPTH (M)`} value={depth} onChange={setDepth} min={3} max={150} />
            <NumInput label="BOTTOM TIME (MIN)" value={bottomTime} onChange={setBottomTime} min={1} max={360} />
            <NumInput label="O₂ (%)" value={o2Pct} onChange={handleO2} min={16} max={100} />
            <NumInput label="HELIUM (%)" value={hePct} onChange={handleHe} min={0} max={79} />
          </div>
          <span
            className="font-mono font-semibold"
            style={{ fontSize: '10.5px', color: 'var(--acc)', letterSpacing: '0.04em' }}
          >
            {mixLabel(o2Pct / 100, hePct / 100)} · ppO₂ {ppO2.toFixed(2)} bar · MOD {mod}m
          </span>
          {/* ppO₂ gauge (design screen 03). Scale 0–1.7 bar; the colour bands
              sit at the same thresholds the warnings fire on: 1.4 working
              limit (amber), 1.6 hard limit (red). */}
          <div className="flex flex-col gap-[4px]">
            <div
              className="relative"
              style={{
                height: '6px', borderRadius: '3px',
                background: 'linear-gradient(90deg, #0f9488 0%, #0f9488 62%, #ffb703 82%, #ff5d7d 96%)',
              }}
            >
              <div
                style={{
                  position: 'absolute', top: '-3.5px',
                  left: `${(Math.min(ppO2 / 1.7, 1) * 100).toFixed(1)}%`,
                  width: '3px', height: '13px', borderRadius: '2px',
                  background: '#ffffff', boxShadow: '0 0 7px rgba(255,255,255,0.8)',
                  transform: 'translateX(-50%)',
                }}
              />
            </div>
            <div className="relative font-mono font-semibold" style={{ height: '11px', fontSize: '8px', color: 'var(--tx3)' }}>
              <span style={{ position: 'absolute', left: 0 }}>ppO₂</span>
              <span style={{ position: 'absolute', left: '59%', transform: 'translateX(-50%)' }}>1.0</span>
              <span style={{ position: 'absolute', left: '82%', transform: 'translateX(-50%)', color: 'var(--warn)' }}>1.4</span>
              <span style={{ position: 'absolute', left: '94%', transform: 'translateX(-50%)', color: 'var(--dang)' }}>1.6</span>
            </div>
          </div>
        </div>

        {/* ── GF sliders ── */}
        <div
          className="flex flex-col gap-[2px] rounded-16 p-[13px]"
          style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
        >
          <div className="flex justify-between items-center mb-[4px]">
            <span
              className="font-mono font-semibold uppercase"
              style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.1em' }}
            >
              GRADIENT FACTORS
            </span>
            <span className="font-mono font-bold" style={{ fontSize: '13px', color: 'var(--acc)' }}>
              {gfLo} / {gfHi}
            </span>
          </div>
          <GfSlider label="LO" value={gfLo} onChange={setGfLo} />
          <GfSlider label="HI" value={gfHi} onChange={setGfHi} />
        </div>

        {/* ── Deco gases ── */}
        <div className="flex items-center gap-[7px] flex-wrap">
          <span
            className="font-mono font-semibold uppercase"
            style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.1em' }}
          >
            DECO GASES
          </span>
          {decoGases.map((g) => (
            <div
              key={g.label}
              className="flex items-center gap-[7px] rounded-full px-[11px] py-[6px]"
              style={{ background: 'var(--chip)', border: '1px solid rgba(0,180,216,0.4)' }}
            >
              <span className="font-mono font-semibold" style={{ fontSize: '10.5px', color: 'var(--acc)' }}>
                {g.label}
              </span>
              <button
                onClick={() => removeDecoGas(g.label)}
                style={{ color: 'var(--tx3)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', lineHeight: 1, padding: 0 }}
              >
                ×
              </button>
            </div>
          ))}
          {availablePresets.slice(0, 1).map((g) => (
            <button
              key={g.label}
              onClick={() => addDecoGas(g)}
              className="font-mono font-semibold rounded-full px-[11px] py-[6px]"
              style={{
                fontSize: '10.5px',
                color: 'var(--tx2)',
                border: '1px dashed var(--tx3)',
                background: 'none',
                cursor: 'pointer',
              }}
            >
              + {g.label}
            </button>
          ))}
        </div>

        {/* ── Warnings ── */}
        {warnings.map((w) => (
          <div
            key={w.text}
            className="flex gap-[10px] items-center rounded-12 px-[12px] py-[10px]"
            style={{
              background: w.level === 'dang' ? 'rgba(255,93,125,0.1)' : 'rgba(255,183,3,0.1)',
              border: `1px solid ${w.level === 'dang' ? 'rgba(255,93,125,0.4)' : 'rgba(255,183,3,0.4)'}`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full flex-none"
              style={{
                background: w.level === 'dang' ? 'var(--dang)' : 'var(--warn)',
                boxShadow: `0 0 9px ${w.level === 'dang' ? 'var(--dang)' : 'var(--warn)'}`,
              }}
            />
            <span
              className="font-mono font-semibold"
              style={{
                fontSize: '11px',
                letterSpacing: '0.02em',
                color: w.level === 'dang' ? 'var(--dang)' : 'var(--warn)',
              }}
            >
              {w.text}
            </span>
          </div>
        ))}

        {/* ── Stat tiles ── */}
        <div className="grid grid-cols-4 gap-2">
          <StatTile label="RUNTIME" value={`${result.totalRuntime}m`} />
          <StatTile label="TTS" value={`${Math.max(0, Math.round(tts))}m`} />
          <StatTile label="CNS" value={`${result.cnsPercent.toFixed(0)}%`} color={cnsColor(result.cnsPercent)} />
          <StatTile label="OTU" value={`${result.otu}`} />
        </div>

        {/* ── Deco table + SVG profile ── */}
        <div className="flex gap-3 items-stretch">
          {/* Deco table */}
          <div
            className="flex-1 flex flex-col gap-0 rounded-16 p-[13px] min-w-0"
            style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
          >
            <div
              className="flex justify-between font-mono font-semibold pb-[7px]"
              style={{ fontSize: '8.5px', color: 'var(--tx3)', letterSpacing: '0.1em', borderBottom: '1px solid var(--line)' }}
            >
              <span>STOP</span><span>MIN</span><span>GAS</span>
            </div>
            {noDeco ? (
              <p style={{ fontSize: '11.5px', color: 'var(--tx2)', padding: '14px 0', lineHeight: 1.5 }}>
                No required stops — NDL {result.ndl}min. Ascend at 9m/min with a 3min safety stop.
              </p>
            ) : (
              result.decoStops.map((s) => (
                <div
                  key={s.depth}
                  className="flex justify-between items-baseline font-mono font-semibold py-[7px]"
                  style={{ fontSize: '12.5px', borderBottom: '1px solid var(--line)' }}
                >
                  <span style={{ color: 'var(--tx)' }}>{s.depth}m</span>
                  <span style={{ color: 'var(--acc)' }}>{s.duration}</span>
                  <span style={{ fontSize: '10px', color: 'var(--tx3)' }}>
                    {mixLabel(s.gasMix.fO2, s.gasMix.fHe)}
                  </span>
                </div>
              ))
            )}
            <p
              className="font-mono pt-[9px]"
              style={{ fontSize: '9.5px', color: 'var(--tx3)' }}
            >
              DESC 18 · ASC 9 M/MIN
            </p>
          </div>

          {/* SVG depth profile */}
          <div
            className="flex-none flex flex-col items-center rounded-16 py-2"
            style={{ width: '152px', background: 'var(--inputbg, #08192b)', border: '1px solid var(--line)' }}
          >
            <svg key={svgKey} width={SVG_W} height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
              {gridLines.map((gl) => (
                <g key={gl.label}>
                  <line x1={PLOT_X0} x2={PLOT_X1} y1={gl.y} y2={gl.y} stroke="var(--line)" strokeWidth="1" />
                  <text x={PLOT_X1 + 4} y={gl.ty} fill="var(--tx3)" fontSize="8" fontFamily="IBM Plex Mono, monospace">
                    {gl.label}
                  </text>
                </g>
              ))}
              <path
                d={path}
                stroke="var(--acc)"
                strokeWidth="2.2"
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
                style={{
                  strokeDasharray: 1100,
                  strokeDashoffset: 1100,
                  animation: 'dmDraw 1.8s ease-out 0.3s forwards',
                }}
              />
              {dots.map((pt, i) => (
                <circle key={i} cx={pt.x} cy={pt.y} r="2.6" fill="var(--acc)" />
              ))}
            </svg>
            <span
              className="font-mono text-center px-1"
              style={{ fontSize: '8.5px', color: 'var(--tx3)', letterSpacing: '0.08em' }}
            >
              0 → {result.totalRuntime}min · DEPTH M
            </span>
          </div>
        </div>

        <p
          className="text-center"
          style={{ fontSize: '10px', color: 'var(--tx3)' }}
        >
          Planning aid only — always dive your computer.
        </p>
      </div>
    </div>
  )
}

function GfSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-[10px]">
      <span className="font-mono" style={{ fontSize: '9px', color: 'var(--tx3)', width: '16px' }}>{label}</span>
      <input
        type="range"
        min="10"
        max="100"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="flex-1"
        style={{
          WebkitAppearance: 'none',
          appearance: 'none',
          height: '4px',
          borderRadius: '2px',
          background: `linear-gradient(to right, var(--acc) ${value}%, var(--line) ${value}%)`,
          outline: 'none',
          margin: '10px 0',
          cursor: 'pointer',
        }}
      />
    </div>
  )
}

function StatTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div
      className="flex flex-col items-center gap-[2px] rounded-12 py-[10px] px-2"
      style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
    >
      <span className="font-mono font-bold" style={{ fontSize: '16px', color: color ?? 'var(--tx)' }}>
        {value}
      </span>
      <span
        className="font-mono font-semibold uppercase"
        style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.1em' }}
      >
        {label}
      </span>
    </div>
  )
}

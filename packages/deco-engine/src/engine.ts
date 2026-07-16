/**
 * Bühlmann ZHL-16C decompression algorithm with gradient factors.
 *
 * SAFETY-CRITICAL — see types.ts for the 100% test coverage requirement.
 *
 * References:
 *   - A. A. Bühlmann, "Decompression–Decompression Sickness" (1984)
 *   - libdivecomputer / subsurface ZHL-16C coefficients
 *   - Erik Baker, "Understanding M-values" (2000) for gradient factors
 */

import type {
  CeilingSample,
  DecoStop,
  DivePlanInput,
  DivePlanResult,
  GasMix,
} from './types'

// ── Constants ───────────────────────────────────────────────────────────────

/** Water vapour pressure at 37 °C (body temperature) in bar. */
const P_WVP = 0.0627

/** Descent rate (m/min) — standard open-circuit trimix. */
const DESCENT_RATE = 18

/** Ascent rate (m/min) — standard Bühlmann ascent. */
const ASCENT_RATE = 9

/** Mandatory deco stop increment (m). */
const STOP_STEP = 3

/** Maximum deco simulation cycles to guard against infinite loops. */
const MAX_STOP_ITER = 9_999

// ── ZHL-16C Tissue Compartments ─────────────────────────────────────────────
// Each row: [HT_N2, a_N2, b_N2, HT_He, a_He, b_He]
// Source: Bühlmann ZHL-16C as listed in libdivecomputer / subsurface.

const COMPARTMENTS: ReadonlyArray<readonly [number, number, number, number, number, number]> = [
  [  4.0, 1.2599, 0.5050,   1.51, 1.7424, 0.4245],
  [  8.0, 1.0000, 0.6514,   3.02, 1.3830, 0.5747],
  [ 12.5, 0.8618, 0.7222,   4.72, 1.1919, 0.6527],
  [ 18.5, 0.7562, 0.7825,   6.99, 1.0458, 0.7223],
  [ 27.0, 0.6667, 0.8126,  10.21, 0.9220, 0.7582],
  [ 38.3, 0.5933, 0.8434,  14.48, 0.8205, 0.7957],
  [ 54.3, 0.5282, 0.8693,  20.53, 0.7305, 0.8279],
  [ 77.0, 0.4701, 0.8910,  29.11, 0.6502, 0.8553],
  [109.0, 0.4187, 0.9092,  41.20, 0.5950, 0.8757],
  [146.0, 0.3798, 0.9222,  55.19, 0.5545, 0.8903],
  [187.0, 0.3497, 0.9319,  70.69, 0.5333, 0.8997],
  [239.0, 0.3223, 0.9403,  90.34, 0.5189, 0.9073],
  [305.0, 0.2850, 0.9477, 115.29, 0.5181, 0.9122],
  [390.0, 0.2737, 0.9544, 147.42, 0.5176, 0.9171],
  [498.0, 0.2523, 0.9602, 188.24, 0.5172, 0.9217],
  [635.0, 0.2327, 0.9653, 240.03, 0.5119, 0.9267],
]

const N = COMPARTMENTS.length

// ── NOAA CNS Single-Exposure Limits (ppO2 bar → minutes) ────────────────────
// Descending thresholds; first entry where ppO2 ≥ threshold gives the limit.
const CNS_TABLE: ReadonlyArray<readonly [number, number]> = [
  [1.60,  45],
  [1.55,  83],
  [1.50, 120],
  [1.45, 135],
  [1.40, 150],
  [1.35, 180],
  [1.30, 210],
  [1.25, 270],
  [1.20, 300],
  [1.10, 450],
  [1.00, 600],
  [0.50, Infinity],
]

// ── Tissue State ─────────────────────────────────────────────────────────────

interface Tissues {
  n2: number[]
  he: number[]
}

function initSurface(pSurf: number): Tissues {
  // Assume fully saturated with atmospheric air after a long surface interval.
  const pAlv = (pSurf - P_WVP) * 0.7902
  return { n2: Array<number>(N).fill(pAlv), he: Array<number>(N).fill(0) }
}

function clone(t: Tissues): Tissues {
  return { n2: [...t.n2], he: [...t.he] }
}

// ── Schreiner Equation ───────────────────────────────────────────────────────
// Exact solution for constant-rate pressure change.

function schreiner(p0: number, pAlv0: number, rAlv: number, k: number, dt: number): number {
  if (Math.abs(rAlv) < 1e-10) {
    return pAlv0 + (p0 - pAlv0) * Math.exp(-k * dt)
  }
  return pAlv0 + rAlv * (dt - 1 / k) - (pAlv0 - p0 + rAlv / k) * Math.exp(-k * dt)
}

// ── Tissue Loading ───────────────────────────────────────────────────────────

function loadSegment(
  t: Tissues,
  startDepth: number,
  endDepth: number,
  dt: number,
  gas: GasMix,
  pSurf: number,
): void {
  if (dt <= 0) return
  const fN2 = 1 - gas.fO2 - gas.fHe
  const fHe = gas.fHe
  const pAmbStart = pSurf + startDepth / 10
  const dP = (endDepth - startDepth) / 10 / dt  // bar/min

  for (let i = 0; i < N; i++) {
    // COMPARTMENTS is a fixed-length tuple; index is always in range.
    const comp = COMPARTMENTS[i]!
    const kN2 = Math.LN2 / comp[0]
    const kHe = Math.LN2 / comp[3]
    t.n2[i] = schreiner(t.n2[i]!, (pAmbStart - P_WVP) * fN2, dP * fN2, kN2, dt)
    t.he[i] = schreiner(t.he[i]!, (pAmbStart - P_WVP) * fHe, dP * fHe, kHe, dt)
  }
}

// ── Ceiling ──────────────────────────────────────────────────────────────────

function ceiling(t: Tissues, gf: number, pSurf: number): number {
  let max = 0
  for (let i = 0; i < N; i++) {
    const comp = COMPARTMENTS[i]!
    const pN2 = t.n2[i]!
    const pHe = t.he[i]!
    const pTot = pN2 + pHe
    if (pTot <= 0) continue
    const a = (comp[1] * pN2 + comp[4] * pHe) / pTot
    const b = (comp[2] * pN2 + comp[5] * pHe) / pTot
    const pCeil = (pTot - a * gf) / (gf / b + 1 - gf)
    const d = Math.max(0, (pCeil - pSurf) * 10)
    if (d > max) max = d
  }
  return max
}

function stopCeiling(depth: number): number {
  return Math.ceil(depth / STOP_STEP) * STOP_STEP
}

// ── CNS & OTU ────────────────────────────────────────────────────────────────

function cnsLimitMin(ppO2: number): number {
  for (const [threshold, limit] of CNS_TABLE) {
    if (ppO2 >= threshold) return limit
  }
  return Infinity
}

function cnsDelta(ppO2: number, dt: number): number {
  const lim = cnsLimitMin(ppO2)
  return isFinite(lim) ? (dt / lim) * 100 : 0
}

function otuDelta(ppO2: number, dt: number): number {
  return ppO2 > 0.5 ? Math.pow((ppO2 - 0.5) / 0.5, 0.83) * dt : 0
}

function ppO2at(depth: number, gas: GasMix, pSurf: number): number {
  return (pSurf + depth / 10) * gas.fO2
}

// ── NDL Calculation ──────────────────────────────────────────────────────────

function calcNdl(t: Tissues, depth: number, gas: GasMix, pSurf: number, gfHi: number): number {
  // Binary search for the extra flat bottom time that would push ceiling > 0.
  let lo = 0
  let hi = 999
  const test = clone(t)
  // Quick check: if already over limit, NDL is 0
  loadSegment(test, depth, depth, hi, gas, pSurf)
  if (ceiling(test, gfHi, pSurf) === 0) return hi

  for (let iter = 0; iter < 24; iter++) {
    const mid = (lo + hi) / 2
    const probe = clone(t)
    loadSegment(probe, depth, depth, mid, gas, pSurf)
    if (ceiling(probe, gfHi, pSurf) > 0) {
      hi = mid
    } else {
      lo = mid
    }
  }
  // Subtract ascent time so NDL is the remaining flat time before starting up.
  const ascentTime = depth / ASCENT_RATE
  return Math.max(0, Math.floor(lo - ascentTime))
}

// ── Main Entry Point ─────────────────────────────────────────────────────────

export function computeDivePlan(input: DivePlanInput): DivePlanResult {
  const pSurf = input.surfacePressure ?? 1.01325
  const gfLo = input.gradientFactors.gfLo / 100
  const gfHi = input.gradientFactors.gfHi / 100
  const { depth, bottomTime, gasMix } = input

  let runtime = 0
  let cns = 0
  let otu = 0
  const ceilingByMinute: CeilingSample[] = []

  const tissues = initSurface(pSurf)

  // ── Descent ────────────────────────────────────────────────────────────────
  const descentDt = depth / DESCENT_RATE
  loadSegment(tissues, 0, depth, descentDt, gasMix, pSurf)
  runtime += descentDt
  // Toxicity at mid-descent depth
  cns += cnsDelta(ppO2at(depth / 2, gasMix, pSurf), descentDt)
  otu += otuDelta(ppO2at(depth / 2, gasMix, pSurf), descentDt)

  // ── Flat bottom (bottomTime is total including descent) ────────────────────
  const flatDt = Math.max(0, bottomTime - descentDt)
  loadSegment(tissues, depth, depth, flatDt, gasMix, pSurf)
  runtime += flatDt
  const ppO2bot = ppO2at(depth, gasMix, pSurf)
  cns += cnsDelta(ppO2bot, flatDt)
  otu += otuDelta(ppO2bot, flatDt)

  // Record ceiling per minute through bottom phase
  for (let m = 1; m <= Math.round(runtime); m++) {
    ceilingByMinute.push({ minute: m, ceiling: ceiling(tissues, gfHi, pSurf) })
  }

  // ── NDL check ──────────────────────────────────────────────────────────────
  const ceilGfLo = ceiling(tissues, gfLo, pSurf)

  if (ceilGfLo <= 0) {
    // No decompression required — compute NDL.
    const ndl = calcNdl(tissues, depth, gasMix, pSurf, gfHi)
    const tts = Math.round(depth / ASCENT_RATE)
    return {
      decoStops: [],
      totalRuntime: Math.round(runtime) + tts,
      ndl,
      cnsPercent: Math.round(cns * 10) / 10,
      otu: Math.round(otu),
      ceilingByMinute,
    }
  }

  // ── Decompression ascent ────────────────────────────────────────────────────
  const firstStop = stopCeiling(ceilGfLo)
  const pFirstStop = pSurf + firstStop / 10

  // Interpolated GF at a given ambient pressure (linear between first stop and surface).
  // pFirstStop > pSurf is guaranteed because ceilGfLo > 0 → firstStop >= STOP_STEP.
  const gfAt = (pAmb: number): number => {
    const t = (pAmb - pSurf) / (pFirstStop - pSurf)
    return gfHi + (gfLo - gfHi) * Math.min(1, Math.max(0, t))
  }

  // Ascend from bottom to first stop (dt = 0 when depth === firstStop, handled in loadSegment).
  const ascToFirst = depth - firstStop
  const ascToFirstDt = ascToFirst / ASCENT_RATE
  loadSegment(tissues, depth, firstStop, ascToFirstDt, gasMix, pSurf)
  runtime += ascToFirstDt
  cns += cnsDelta(ppO2at((depth + firstStop) / 2, gasMix, pSurf), ascToFirstDt)
  otu += otuDelta(ppO2at((depth + firstStop) / 2, gasMix, pSurf), ascToFirstDt)

  // ── Stop-by-stop ascent ────────────────────────────────────────────────────
  const decoStops: DecoStop[] = []
  let currentDepth = firstStop
  let stopIter = 0

  while (currentDepth > 0 && stopIter < MAX_STOP_ITER) {
    stopIter++
    const pAmb = pSurf + currentDepth / 10
    const gf = gfAt(pAmb)
    const ceil = ceiling(tissues, gf, pSurf)

    if (ceil <= currentDepth - STOP_STEP) {
      // Safe to ascend to the next stop.
      const nextDepth = currentDepth - STOP_STEP
      const dt = STOP_STEP / ASCENT_RATE
      loadSegment(tissues, currentDepth, nextDepth, dt, gasMix, pSurf)
      runtime += dt
      cns += cnsDelta(ppO2at((currentDepth + nextDepth) / 2, gasMix, pSurf), dt)
      otu += otuDelta(ppO2at((currentDepth + nextDepth) / 2, gasMix, pSurf), dt)
      currentDepth = nextDepth
    } else {
      // Wait 1 minute at this stop.
      loadSegment(tissues, currentDepth, currentDepth, 1, gasMix, pSurf)
      runtime += 1
      const ppO2stop = ppO2at(currentDepth, gasMix, pSurf)
      cns += cnsDelta(ppO2stop, 1)
      otu += otuDelta(ppO2stop, 1)
      ceilingByMinute.push({ minute: Math.round(runtime), ceiling: ceiling(tissues, gf, pSurf) })

      // Accumulate into decoStops list.
      const last = decoStops[decoStops.length - 1]
      if (last && last.depth === currentDepth) {
        last.duration += 1
      } else {
        decoStops.push({ depth: currentDepth, duration: 1, gasMix })
      }
    }
  }

  return {
    decoStops,
    totalRuntime: Math.round(runtime),
    ndl: 0,
    cnsPercent: Math.round(cns * 10) / 10,
    otu: Math.round(otu),
    ceilingByMinute,
  }
}

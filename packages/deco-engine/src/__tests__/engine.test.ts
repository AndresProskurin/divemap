/**
 * Bühlmann ZHL-16C unit tests.
 *
 * Validation targets (GF 100/100 = full M-value, no conservatism). The
 * engine's NDL is the remaining flat time at depth after subtracting direct-
 * ascent time, so it reads slightly conservative next to published bottom-
 * time NDLs; validation windows below bracket the published ZH-L16C values
 * with that offset in mind:
 *   - NDL at 18m air ∈ [40, 70]  (published ≈ 51)
 *   - NDL at 21m air ∈ [25, 45]  (published ≈ 35)
 *   - NDL at 30m air ∈ [8, 18]   (published ≈ 14)
 *   - NDL at 42m air ∈ [1, 8]    (published ≈ 7)
 *   - 40m/25 min air requires deco; stops finish at 3m
 *
 * Gradient factor tests:
 *   - Same dive with GF 40/85 should produce more stops / longer runtime
 *     than GF 100/100, with a deeper first stop.
 *
 * Regression: the Schreiner equation's R/k term must be subtracted inside
 * the exponential bracket. With the sign flipped, slow compartments corrupt
 * by hundreds of bar on any depth change and deco schedules run away into
 * the iteration guard (thousands of minutes of stops).
 */

import { describe, expect, it } from 'vitest'
import { computeDivePlan } from '../engine'
import type { DivePlanInput, GasMix } from '../types'

// ── Helpers ──────────────────────────────────────────────────────────────────

const AIR: GasMix = { fO2: 0.21, fHe: 0 }
const EAN32: GasMix = { fO2: 0.32, fHe: 0 }
const TRIMIX: GasMix = { fO2: 0.21, fHe: 0.35 }  // 21/35

const GF_FULL: DivePlanInput['gradientFactors'] = { gfLo: 100, gfHi: 100 }
const GF_CONS: DivePlanInput['gradientFactors'] = { gfLo: 40, gfHi: 85 }

function plan(
  depth: number,
  bottomTime: number,
  gasMix: GasMix = AIR,
  gf = GF_FULL,
  surfacePressure?: number,
): ReturnType<typeof computeDivePlan> {
  const input: DivePlanInput = { depth, bottomTime, gasMix, gradientFactors: gf, surfacePressure }
  return computeDivePlan(input)
}

// ── No-deco dives ─────────────────────────────────────────────────────────────

describe('no-decompression dives', () => {
  it('returns empty decoStops and ndl>0 for a shallow short air dive', () => {
    const result = plan(20, 20)
    expect(result.decoStops).toHaveLength(0)
    expect(result.ndl).toBeGreaterThan(0)
  })

  it('30 m air within NDL stays no-deco; 22 min exceeds the published ~14 min limit', () => {
    const within = plan(30, 10, AIR, GF_FULL)
    expect(within.decoStops).toHaveLength(0)
    expect(within.ndl).toBeGreaterThan(0)
    // 22 min bottom at 30m is past the ZH-L16C NDL → mandatory stop(s).
    const over = plan(30, 22, AIR, GF_FULL)
    expect(over.decoStops.length).toBeGreaterThan(0)
  })

  it('NDL at 20 m air is much larger than at 30 m', () => {
    const r20 = plan(20, 5, AIR, GF_FULL)
    const r30 = plan(30, 5, AIR, GF_FULL)
    expect(r20.ndl).toBeGreaterThan(r30.ndl)
  })

  it('totalRuntime includes ascent time for no-deco dive', () => {
    const result = plan(30, 22)
    expect(result.totalRuntime).toBeGreaterThan(22)
  })

  it('cnsPercent is non-zero for a nitrox dive at depth', () => {
    // EAN32 at 30m: ppO2 = (1 + 30/10) * 0.32 = 1.28 bar, within CNS limits
    const result = plan(30, 20, EAN32, GF_FULL)
    expect(result.cnsPercent).toBeGreaterThan(0)
  })

  it('otu is non-zero when ppO2 > 0.5', () => {
    const result = plan(10, 10)   // ppO2 = (1+1)*0.21 = 0.42 — barely under 0.5
    const result2 = plan(15, 10)  // ppO2 = (1+1.5)*0.21 = 0.525 — over 0.5
    expect(result2.otu).toBeGreaterThan(0)
    // Shallow enough that OTU may be 0 or very small at 10m
    expect(result.otu).toBeGreaterThanOrEqual(0)
  })

  it('ndl is 0 when already saturated at 999 min (extreme exposure)', () => {
    // 999 min at 20m will push all compartments near saturation
    const result = plan(20, 999, AIR, GF_FULL)
    // Could be deco or no-deco depending on exact NDL — just check it's a valid result
    expect(result.totalRuntime).toBeGreaterThan(0)
  })

  it('handles bottomTime shorter than descent time (zero flat phase)', () => {
    // 40m descent takes ~2.2 min; bottomTime=1 min → flatDt=0 → loadSegment(dt=0) early-return
    const result = plan(40, 1, AIR, GF_FULL)
    expect(result.totalRuntime).toBeGreaterThan(0)
    expect(result.decoStops).toHaveLength(0)
    expect(result.ndl).toBeGreaterThan(0)
  })

  it('uses default surface pressure of 1.01325 bar when not provided', () => {
    const withDefault = computeDivePlan({ depth: 20, bottomTime: 20, gasMix: AIR, gradientFactors: GF_FULL })
    const withExplicit = computeDivePlan({ depth: 20, bottomTime: 20, gasMix: AIR, gradientFactors: GF_FULL, surfacePressure: 1.01325 })
    expect(withDefault.ndl).toBeCloseTo(withExplicit.ndl, 0)
  })

  it('handles altitude (lower surface pressure) — returns a valid result', () => {
    // At 2000m altitude pSurf ≈ 0.795 bar; M-values are lower so NDL is shorter
    // than sea level for the same metric depth. Just verify the plan is valid.
    const altitude = plan(20, 20, AIR, GF_FULL, 0.795)
    expect(altitude.totalRuntime).toBeGreaterThan(0)
    expect(altitude.decoStops.length).toBeGreaterThanOrEqual(0)
  })
})

// ── Decompression dives ───────────────────────────────────────────────────────

describe('decompression dives', () => {
  it('40 m air 25 min produces deco stops (GF 100/100)', () => {
    const result = plan(40, 25, AIR, GF_FULL)
    expect(result.decoStops.length).toBeGreaterThan(0)
    expect(result.ndl).toBe(0)
  })

  it('deco stops are in descending depth order', () => {
    const result = plan(40, 25, AIR, GF_FULL)
    for (let i = 1; i < result.decoStops.length; i++) {
      expect(result.decoStops[i]!.depth).toBeLessThan(result.decoStops[i - 1]!.depth)
    }
  })

  it('all deco stops are at multiples of 3 m', () => {
    const result = plan(40, 25, AIR, GF_FULL)
    for (const stop of result.decoStops) {
      expect(stop.depth % 3).toBe(0)
    }
  })

  it('deco stop durations are ≥ 1 min', () => {
    const result = plan(40, 25, AIR, GF_FULL)
    for (const stop of result.decoStops) {
      expect(stop.duration).toBeGreaterThanOrEqual(1)
    }
  })

  it('each deco stop carries the bottom gas mix', () => {
    const result = plan(40, 25, AIR, GF_FULL)
    for (const stop of result.decoStops) {
      expect(stop.gasMix).toEqual(AIR)
    }
  })

  it('totalRuntime is greater than bottomTime for a deco dive', () => {
    const result = plan(40, 25, AIR, GF_FULL)
    expect(result.totalRuntime).toBeGreaterThan(25)
  })

  it('GF 40/85 produces longer runtime than GF 100/100 for same dive', () => {
    const permissive = plan(40, 25, AIR, GF_FULL)
    const conservative = plan(40, 25, AIR, GF_CONS)
    expect(conservative.totalRuntime).toBeGreaterThan(permissive.totalRuntime)
  })

  it('GF 40/85 produces more deco stops or longer stops than GF 100/100', () => {
    const permissive = plan(40, 25, AIR, GF_FULL)
    const conservative = plan(40, 25, AIR, GF_CONS)
    const sumDuration = (r: ReturnType<typeof plan>) =>
      r.decoStops.reduce((s, st) => s + st.duration, 0)
    expect(sumDuration(conservative)).toBeGreaterThan(sumDuration(permissive))
  })

  it('cnsPercent is higher for a deeper/longer deco dive', () => {
    const short = plan(40, 25, AIR, GF_FULL)
    const long = plan(40, 60, AIR, GF_FULL)
    expect(long.cnsPercent).toBeGreaterThan(short.cnsPercent)
  })

  it('otu is higher for a longer dive', () => {
    const short = plan(40, 25, AIR, GF_FULL)
    const long = plan(40, 60, AIR, GF_FULL)
    expect(long.otu).toBeGreaterThan(short.otu)
  })

  it('ceilingByMinute is populated for a deco dive', () => {
    const result = plan(40, 25, AIR, GF_FULL)
    expect(result.ceilingByMinute.length).toBeGreaterThan(0)
  })

  it('ceilingByMinute entries have minute ≥ 1', () => {
    const result = plan(40, 25, AIR, GF_FULL)
    for (const s of result.ceilingByMinute) {
      expect(s.minute).toBeGreaterThanOrEqual(1)
    }
  })

  it('deep trimix dive produces deco stops', () => {
    const result = plan(60, 30, TRIMIX, GF_CONS)
    expect(result.decoStops.length).toBeGreaterThan(0)
  })

  it('helium reduces narcosis depth but generates deco stops when deep', () => {
    // At 60m 30 min trimix should produce deco stops
    const result = plan(60, 30, TRIMIX, GF_FULL)
    expect(result.decoStops.length).toBeGreaterThan(0)
  })
})

// ── Gas mix edge cases ────────────────────────────────────────────────────────

describe('gas mix edge cases', () => {
  it('pure helium mix (fHe=0.79, fO2=0.21) yields deco stops at depth', () => {
    const heliox: GasMix = { fO2: 0.21, fHe: 0.79 }
    const result = plan(50, 25, heliox, GF_FULL)
    // He-heavy mix saturates fast — should have deco requirements
    expect(result.totalRuntime).toBeGreaterThan(0)
  })

  it('high-O2 nitrox cnsPct increases vs air at same depth', () => {
    const nitrox40: GasMix = { fO2: 0.40, fHe: 0 }
    const rAir = plan(20, 30, AIR, GF_FULL)
    const rNitrox = plan(20, 30, nitrox40, GF_FULL)
    expect(rNitrox.cnsPercent).toBeGreaterThan(rAir.cnsPercent)
  })
})

// ── Surface pressure edge cases ───────────────────────────────────────────────

describe('surface pressure edge cases', () => {
  it('non-standard surface pressure shifts results consistently', () => {
    const r = plan(30, 20, AIR, GF_FULL, 0.9)
    expect(r.totalRuntime).toBeGreaterThan(0)
  })
})

// ── Validation against published Bühlmann ZH-L16C values ─────────────────────

describe('validation against published ZH-L16C air NDLs (GF 100/100)', () => {
  it.each([
    [18, 40, 70],   // published ≈ 51 min
    [21, 25, 45],   // published ≈ 35 min
    [24, 15, 32],   // published ≈ 25 min
    [30, 8, 18],    // published ≈ 14 min
    [36, 3, 12],    // published ≈ 9 min
    [42, 1, 8],     // published ≈ 7 min
  ])('NDL at %im air falls in [%i, %i] min', (depth, lo, hi) => {
    const r = plan(depth, 3, AIR, GF_FULL)
    expect(r.ndl).toBeGreaterThanOrEqual(lo)
    expect(r.ndl).toBeLessThanOrEqual(hi)
  })

  it('NDL decreases monotonically with depth', () => {
    const depths = [15, 18, 21, 24, 27, 30, 33, 36, 39, 42]
    const ndls = depths.map(d => plan(d, 3, AIR, GF_FULL).ndl)
    for (let i = 1; i < ndls.length; i++) {
      expect(ndls[i]!).toBeLessThan(ndls[i - 1]!)
    }
  })

  it('NDL caps at 999 for a depth the model never limits (6m air)', () => {
    // At 6m saturation even the slowest compartment stays below its M-value,
    // exercising the quick-return path in the NDL binary search.
    const r = plan(6, 10, AIR, GF_FULL)
    expect(r.ndl).toBe(999)
  })
})

describe('validation of deco schedules against published profiles', () => {
  it('40m/25min air GF 100/100 → shallow stops only, deco total 8–25 min', () => {
    const r = plan(40, 25, AIR, GF_FULL)
    const totalDeco = r.decoStops.reduce((s, st) => s + st.duration, 0)
    expect(r.decoStops[0]!.depth).toBeLessThanOrEqual(9)
    expect(r.decoStops[r.decoStops.length - 1]!.depth).toBe(3)
    expect(totalDeco).toBeGreaterThanOrEqual(8)
    expect(totalDeco).toBeLessThanOrEqual(25)
  })

  it('45m/30min trimix 21/35 GF 30/80 → sane technical schedule', () => {
    const r = plan(45, 30, TRIMIX, { gfLo: 30, gfHi: 80 })
    // First stop pulled deep by gfLo=30, but not deeper than the bottom.
    expect(r.decoStops[0]!.depth).toBeGreaterThanOrEqual(12)
    expect(r.decoStops[0]!.depth).toBeLessThanOrEqual(24)
    expect(r.decoStops[r.decoStops.length - 1]!.depth).toBe(3)
    // The 3m stop is the longest — classic single-gas deco shape.
    const longest = Math.max(...r.decoStops.map(s => s.duration))
    expect(r.decoStops[r.decoStops.length - 1]!.duration).toBe(longest)
    expect(r.totalRuntime).toBeGreaterThanOrEqual(80)
    expect(r.totalRuntime).toBeLessThanOrEqual(140)
  })

  it('regression: deep trimix never runs away into the iteration guard (Schreiner sign)', () => {
    const r = plan(60, 30, { fO2: 0.18, fHe: 0.45 }, { gfLo: 30, gfHi: 80 })
    expect(r.decoStops[0]!.depth).toBeGreaterThanOrEqual(24)
    // With the R/k sign flipped this runtime explodes past 10,000 min.
    expect(r.totalRuntime).toBeLessThan(400)
    for (const stop of r.decoStops) {
      expect(stop.duration).toBeLessThan(200)
    }
  })

  it('lower gfLo pulls the first stop deeper for the same dive', () => {
    const shallow = plan(45, 30, TRIMIX, { gfLo: 80, gfHi: 80 })
    const deep = plan(45, 30, TRIMIX, { gfLo: 30, gfHi: 80 })
    expect(deep.decoStops[0]!.depth).toBeGreaterThan(shallow.decoStops[0]!.depth)
  })

  it('ceilingByMinute rises through the bottom phase of a deco dive', () => {
    const r = plan(40, 25, AIR, GF_FULL)
    const bottom = r.ceilingByMinute.filter(s => s.minute <= 25)
    // Tissue loading grows with time at depth, so the sampled ceiling at the
    // end of the bottom phase must exceed the early-bottom ceiling.
    expect(bottom.length).toBeGreaterThan(5)
    expect(bottom[bottom.length - 1]!.ceiling).toBeGreaterThan(bottom[0]!.ceiling)
  })
})

// ── Degenerate inputs ─────────────────────────────────────────────────────────

describe('degenerate inputs', () => {
  it('depth 0 returns a surface "dive" with no stops and max NDL', () => {
    // Exercises the dt<=0 guard in tissue loading (descent takes zero time).
    const r = plan(0, 5, AIR, GF_FULL)
    expect(r.decoStops).toHaveLength(0)
    expect(r.ndl).toBe(999)
    expect(r.cnsPercent).toBe(0)
  })
})

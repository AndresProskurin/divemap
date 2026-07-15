/**
 * Bühlmann ZHL-16C decompression engine — public types.
 *
 * SAFETY-CRITICAL. Every exported function must have 100% unit test coverage
 * and be validated against published Bühlmann tables before shipping.
 *
 * References: libdivecomputer, subsurface.
 */

/** Breathing gas mix. Fractions are 0..1 and must satisfy fO2 + fHe <= 1. */
export interface GasMix {
  /** Fraction of oxygen, 0..1 (e.g. 0.21 for air). */
  fO2: number
  /** Fraction of helium, 0..1 (e.g. 0.35 for trimix 21/35). */
  fHe: number
}

/** Gradient factor pair, expressed as percentages (0..100). */
export interface GradientFactors {
  /** GF applied at the first (deepest) stop. */
  gfLo: number
  /** GF applied at the surface. */
  gfHi: number
}

/** Inputs for a single-level dive plan. */
export interface DivePlanInput {
  /** Maximum depth in metres of sea water. */
  depth: number
  /** Bottom time in minutes, including descent. */
  bottomTime: number
  gasMix: GasMix
  gradientFactors: GradientFactors
  /** Surface atmospheric pressure in bar. Defaults to 1.013. */
  surfacePressure?: number
}

/** A single mandatory decompression stop. */
export interface DecoStop {
  /** Stop depth in metres. */
  depth: number
  /** Stop duration in minutes. */
  duration: number
  /** Gas breathed at this stop. */
  gasMix: GasMix
}

/** Computed ceiling at a given runtime minute. */
export interface CeilingSample {
  /** Minute of runtime. */
  minute: number
  /** Ceiling depth in metres (0 = direct ascent permitted). */
  ceiling: number
}

/** Result of a decompression calculation. */
export interface DivePlanResult {
  /** Ordered deco stops, deepest first. Empty for a no-deco dive. */
  decoStops: DecoStop[]
  /** Total runtime in minutes, including bottom time and ascent. */
  totalRuntime: number
  /** No-decompression limit in minutes for the planned depth and gas. */
  ndl: number
  /** CNS oxygen toxicity loading as a percentage. */
  cnsPercent: number
  /** Pulmonary oxygen toxicity in OTUs. */
  otu: number
  /** Ceiling sampled once per runtime minute. */
  ceilingByMinute: CeilingSample[]
}

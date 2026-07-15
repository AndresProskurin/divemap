/**
 * DiveMap Design Tokens
 * Auto-extracted from DiveMap.dc.html (Claude Design output)
 * Source of truth for all UI components.
 *
 * Fonts:
 *   Primary:  Archivo (400/500/600/700/800) — all headings, body, UI
 *   Mono:     IBM Plex Mono (400/500/600/700) — labels, tags, stats, coordinates
 *   Google Fonts link:
 *   https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800
 *     &family=IBM+Plex+Mono:wght@400;500;600;700&display=swap
 */

// ─── COLOR PALETTE ───────────────────────────────────────────────────────────

export const colors = {
  // Backgrounds (dark mode)
  bg:        '#051422',   // page background
  bg2:       '#081c30',   // secondary background, nav
  card:      '#0b2438',   // card surface
  card2:     '#12314b',   // elevated card, modal
  sheet:     '#081c30',   // bottom sheet
  inputBg:   '#08192b',   // input fields

  // Backgrounds (light mode)
  bgLight:    '#eef5fa',
  bg2Light:   '#ffffff',
  cardLight:  '#ffffff',
  card2Light: '#e8f2f9',
  sheetLight: '#ffffff',
  inputBgLight: '#f2f8fc',

  // Text
  tx:  '#eaf6fd',   // primary text (dark mode)
  tx2: '#9fc3da',   // secondary text
  tx3: '#638aa3',   // muted / placeholder
  txLight:  '#0a2540',   // primary text (light mode)
  tx2Light: '#3f6580',
  tx3Light: '#7c9cb2',

  // Brand / Accent
  acc:    '#00b4d8',   // primary accent (cyan)
  accD:   '#0077b6',   // darker accent (ocean blue)
  accDeep: '#023e8a',  // deepest accent (navy)

  // Semantic
  ok:   '#33d6c3',   // success / confirmed (teal)
  okDark: '#0f9488',
  warn: '#ffb703',   // warning (amber)
  warnDark: '#b06f00',
  dang: '#ff5d7d',   // danger / error
  dangDark: '#d23359',

  // Structural
  line:      'rgba(148,196,230,0.14)',  // dividers, borders (dark)
  lineLight: 'rgba(2,62,138,0.15)',    // dividers (light)
  chip:      'rgba(0,180,216,0.12)',   // filter chip bg (dark)
  chipLight: 'rgba(0,150,199,0.10)',   // filter chip bg (light)
  shadow:    'rgba(0,0,0,0.5)',
  shadowLight: 'rgba(30,60,90,0.2)',

  // Depth marker colors (site pins on map)
  depthShallow:  '#33d6c3',   // <20m — teal
  depthMid:      '#ffb703',   // 20–40m — amber
  depthDeep:     '#ef476f',   // 40–60m — coral
  depthTech:     '#0077b6',   // 60m+ — deep blue

  // Raw ocean palette (use for gradients / illustrations)
  ocean: {
    50:  '#eaf6fd',
    100: '#caf0f8',
    200: '#90e0ef',
    300: '#48cae4',
    400: '#00b4d8',
    500: '#0096c7',
    600: '#0077b6',
    700: '#023e8a',
    800: '#03045e',
    900: '#04090e',
  },
} as const

// ─── TYPOGRAPHY ──────────────────────────────────────────────────────────────

export const typography = {
  fontFamily: {
    sans: "'Archivo', system-ui, sans-serif",
    mono: "'IBM Plex Mono', ui-monospace, monospace",
  },

  // Font sizes — px values matching design
  fontSize: {
    '2xs': '9px',
    xs:    '10px',
    sm:    '11px',    // IBM Plex Mono labels
    base:  '13px',    // secondary body
    md:    '13.5px',  // body / buttons
    lg:    '14px',    // list titles
    xl:    '14.5px',  // section headers
    '2xl': '16px',    // card headings
    '3xl': '18px',    // screen titles
    '4xl': '22px',    // large stats
    '5xl': '28px',    // hero numbers
    '6xl': '36px',    // display
  },

  fontWeight: {
    normal:    '400',
    medium:    '500',
    semibold:  '600',
    bold:      '700',
    extrabold: '800',
  },

  letterSpacing: {
    tight:     '-0.01em',
    normal:    '0',
    wide:      '0.04em',
    wider:     '0.08em',
    widest:    '0.14em',
    label:     '0.22em',   // IBM Plex Mono uppercase labels
    tag:       '0.3em',    // map geo labels
  },

  // Named text styles
  styles: {
    // IBM Plex Mono uppercase label (e.g. "DIVEMAP", "01 · DISCOVERY MAP")
    monoLabel: {
      fontFamily: "'IBM Plex Mono', monospace",
      fontWeight: '600',
      fontSize: '11px',
      letterSpacing: '0.22em',
      textTransform: 'uppercase' as const,
      color: colors.acc,
    },
    // Screen section header
    screenTitle: {
      fontFamily: "'Archivo', sans-serif",
      fontWeight: '800',
      fontSize: '22px',
      color: colors.tx,
    },
    // Card / list item title
    cardTitle: {
      fontFamily: "'Archivo', sans-serif",
      fontWeight: '700',
      fontSize: '14px',
      color: colors.tx,
    },
    // Body text
    body: {
      fontFamily: "'Archivo', sans-serif",
      fontWeight: '400',
      fontSize: '13px',
      color: colors.tx2,
    },
    // Stat / numeric value
    stat: {
      fontFamily: "'IBM Plex Mono', monospace",
      fontWeight: '600',
      fontSize: '11px',
      color: colors.tx2,
    },
  },
} as const

// ─── BORDER RADIUS ───────────────────────────────────────────────────────────

export const radius = {
  xs:    '4px',
  sm:    '7px',
  md:    '12px',   // inputs, chips, small cards
  lg:    '14px',   // cards, list items
  xl:    '16px',   // modals, large cards
  '2xl': '20px',   // bottom sheet top corners
  full:  '999px',  // pills, buttons, badges
  circle: '50%',   // avatars, markers
} as const

// ─── SHADOWS ─────────────────────────────────────────────────────────────────

export const shadows = {
  card:   '0 1px 6px rgba(0,0,0,0.4)',
  sheet:  '0 -12px 34px rgba(0,0,0,0.5)',
  btn:    '0 8px 22px rgba(0,180,216,0.4)',
  btnMd:  '0 6px 18px rgba(0,180,216,0.35)',
  btnSm:  '0 6px 16px rgba(0,180,216,0.3)',
} as const

// ─── SPACING ─────────────────────────────────────────────────────────────────
// Base unit: 4px. Design uses multiples of 4 with some 7/9/11/14 exceptions.

export const spacing = {
  1:  '4px',
  2:  '7px',    // tight gap (chips, icons)
  3:  '9px',    // card inner gap
  4:  '11px',   // list item gap
  5:  '14px',   // section padding horizontal
  6:  '18px',   // button padding horizontal
  8:  '24px',
  10: '32px',
  12: '40px',
  16: '56px',   // screen top padding (status bar clearance)
  20: '64px',
  24: '80px',   // bottom padding (tab bar clearance)
} as const

// ─── ANIMATION ───────────────────────────────────────────────────────────────

export const animation = {
  // Depth profile chart draw animation
  draw: 'dmDraw 1.5s ease forwards',
  // Entry fade (cards, modals)
  fadeIn: 'dmFade 0.25s ease both',
} as const

// ─── COMPONENT TOKENS ────────────────────────────────────────────────────────

export const components = {
  // Bottom sheet
  bottomSheet: {
    background: colors.sheet,
    borderRadius: `${radius['2xl']} ${radius['2xl']} 0 0`,
    boxShadow: shadows.sheet,
    paddingTop: '9px',
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[24],
    // Handle bar
    handle: {
      width: '36px',
      height: '4px',
      borderRadius: radius.xs,
      background: colors.line,
      margin: '0 auto',
    },
  },

  // Filter chip
  chip: {
    active: {
      color: colors.acc,
      background: colors.chip,
      border: `1px solid ${colors.acc}`,
    },
    inactive: {
      color: colors.tx3,
      background: 'transparent',
      border: `1px solid ${colors.line}`,
    },
    borderRadius: radius.full,
    padding: '8px 13px',
    fontFamily: "'Archivo', sans-serif",
    fontWeight: '600',
    fontSize: '11.5px',
  },

  // Viz score dots (●●●●○)
  vizDot: {
    active: colors.acc,
    inactive: colors.line,
  },

  // Depth marker (map pin)
  marker: {
    border: '2px solid #eaf6fd',
    ringOpacity: 0.25,
  },

  // Primary CTA button
  button: {
    primary: {
      background: colors.acc,
      color: '#02222e',
      borderRadius: radius.full,
      padding: '13px 18px',
      fontWeight: '700',
      fontSize: '13.5px',
      boxShadow: shadows.btn,
    },
  },

  // Search bar
  searchBar: {
    background: 'rgba(6,24,40,0.88)',
    border: `1px solid rgba(148,196,230,0.18)`,
    backdropFilter: 'blur(10px)',
    borderRadius: radius.md,
    padding: '12px 14px',
  },

  // Offline badge
  offlineBadge: {
    background: 'rgba(6,24,40,0.75)',
    borderRadius: radius.full,
    padding: '5px 10px',
    dot: colors.ok,
  },

  // Tag / type badge on cards
  typeBadge: {
    color: colors.acc,
    border: `1px solid ${colors.acc}`,
    borderRadius: '5px',
    padding: '2px 5px',
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: '600',
    fontSize: '8.5px',
    letterSpacing: '0.08em',
  },

  // Deco warning bar
  cnsBar: {
    track: colors.line,
    fill: colors.acc,
    danger: colors.dang,  // >80% CNS
    height: '4px',
    borderRadius: radius.xs,
  },
} as const

// ─── TAILWIND CONFIG EXTENSION ───────────────────────────────────────────────
// Paste into tailwind.config.ts → theme.extend

export const tailwindExtend = {
  colors: {
    ocean: colors.ocean,
    acc: colors.acc,
    'acc-d': colors.accD,
    'acc-deep': colors.accDeep,
    tx: colors.tx,
    'tx-2': colors.tx2,
    'tx-3': colors.tx3,
    card: colors.card,
    'card-2': colors.card2,
    bg: colors.bg,
    'bg-2': colors.bg2,
    line: colors.line,
    ok: colors.ok,
    warn: colors.warn,
    dang: colors.dang,
  },
  fontFamily: {
    sans: ["'Archivo'", 'system-ui', 'sans-serif'],
    mono: ["'IBM Plex Mono'", 'ui-monospace', 'monospace'],
  },
  borderRadius: {
    '4':  '4px',
    '7':  '7px',
    '12': '12px',
    '14': '14px',
    '16': '16px',
    '20': '20px',
  },
  boxShadow: {
    card:  '0 1px 6px rgba(0,0,0,0.4)',
    sheet: '0 -12px 34px rgba(0,0,0,0.5)',
    btn:   '0 8px 22px rgba(0,180,216,0.4)',
  },
}

# DiveMap — Project Context for Claude Code

## Stack
- **Frontend (web):** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Mobile:** Expo (React Native) + TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Realtime)
- **Maps:** Mapbox GL JS (web) / @rnmapbox/maps (mobile)
- **Payments:** RevenueCat (mobile) + Stripe (web)
- **Analytics:** PostHog
- **Deco engine:** Bühlmann ZHL-16C (`packages/deco-engine`)

## Key Commands
```bash
pnpm dev           # start web dev server (localhost:3000)
pnpm mobile        # start Expo dev server
pnpm db:push       # push Supabase schema changes
pnpm db:types      # regenerate TypeScript types from Supabase
pnpm test          # run all tests
pnpm lint          # ESLint + TypeScript check
pnpm build         # production build
```

## Monorepo Structure
```
apps/
  web/            Next.js 14 app
  mobile/         Expo app
packages/
  ui/             Shared components (web + mobile)
  db/             Supabase client, types, queries
  deco-engine/    Bühlmann ZHL-16C TypeScript implementation
design-reference/
  DiveMap.dc.html     ← Full design from Claude Design (5 screens, interactive)
  tokens.ts           ← All design tokens extracted from design (ALWAYS import from here)
  images/             ← Design assets (hero.png, d1.png, d2.png, d3.png, jelly.png, silfra.png)
  ios-frame.jsx       ← iOS device frame component used in design
```

## Design System — CRITICAL
**Always import tokens from `design-reference/tokens.ts`** — never hardcode colors/fonts.

### Fonts (load via Google Fonts)
```html
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
```
- **Archivo** — all body, headings, buttons, UI text
- **IBM Plex Mono** — labels, tags, stats, coordinates, monospaced data

### Core Colors (dark mode default)
| Token     | Value       | Use                              |
|-----------|-------------|----------------------------------|
| `--bg`    | `#051422`   | Page background                  |
| `--bg2`   | `#081c30`   | Nav, secondary bg                |
| `--card`  | `#0b2438`   | Card surface                     |
| `--card2` | `#12314b`   | Elevated card                    |
| `--tx`    | `#eaf6fd`   | Primary text                     |
| `--tx2`   | `#9fc3da`   | Secondary text                   |
| `--tx3`   | `#638aa3`   | Muted / placeholder              |
| `--acc`   | `#00b4d8`   | Primary accent (cyan)            |
| `--accD`  | `#0077b6`   | Darker accent (ocean blue)       |
| `--ok`    | `#33d6c3`   | Success / confirmed              |
| `--warn`  | `#ffb703`   | Warning                          |
| `--dang`  | `#ff5d7d`   | Danger / error                   |
| `--line`  | `rgba(148,196,230,0.14)` | Borders, dividers   |
| `--chip`  | `rgba(0,180,216,0.12)`   | Filter chip bg      |

### Design Reference
Open `design-reference/DiveMap.dc.html` in a browser to see all 5 screens:
1. Discovery Map — dark ocean map, bottom sheet with site cards, filter chips
2. Dive Site Detail — hero photo, tabs (Overview/Conditions/Photos/Operators/Tech Plan)
3. Tech Dive Planner — Bühlmann deco table, animated depth profile SVG
4. Conditions Report — 4-step flow, viz slider, current selector
5. Diver Profile — stats, logbook feed, certification badges

## Coding Conventions
- TypeScript strict mode (`"strict": true`)
- 2-space indentation
- Named exports only (no default exports except pages/screens)
- Tailwind for web, StyleSheet for mobile — no inline styles except for dynamic values
- All Supabase queries through `packages/db/src/queries/` — never query directly in components
- Error boundaries on all screen-level components
- Loading/empty/error states required for all data-fetching components

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_MAPBOX_TOKEN=
NEXT_PUBLIC_POSTHOG_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
REVENUECAT_API_KEY=
```

## Supabase Tables (core schema)
- `users` — profiles, certifications, preferences
- `dive_sites` — name, slug, coords, depth, type, country, viz_score, current_level
- `dives` — user logbook entries, linked to site
- `operators` — dive centres, locations, tech_certified, certs_offered
- `conditions_reports` — viz, current, temp_surface, temp_bottom, reporter, site_id
- `site_photos` — url, depth_taken, species_tagged, caption, site_id, user_id
- `species_sightings` — species_id, site_id, dive_id, depth, photo_url
- `wishlists` — user_id, site_id

## Key Design Decisions
- Dark mode is DEFAULT (divers use phones in low light / pre-dive)
- Mapbox dark style: `mapbox://styles/mapbox/dark-v11` with custom water `#023e8a`
- Depth marker colors: <20m=#33d6c3 (teal), 20-40m=#ffb703 (amber), 40-60m=#ef476f (coral), 60m+=#0077b6 (navy)
- Bottom sheet pattern for map → site list (not separate screen)
- IBM Plex Mono for ALL numeric/data display (depths, times, coordinates, stats)
- "Insider Notes" section must be visually distinct from regular description

## Deco Engine Notes (packages/deco-engine)
- Algorithm: Bühlmann ZHL-16C with gradient factors
- Reference: libdivecomputer, subsurface source
- Inputs: depth (m), bottom_time (min), gas_mix (fO2, fHe), gf_lo, gf_hi
- Outputs: deco_stops[], total_runtime, ndl, cns_percent, otu, ceiling_by_minute[]
- 100% unit test coverage required — safety-critical code
- Compare outputs against published Bühlmann tables before shipping

# DiveMap — Project Documentation

> **Revised:** 2026-07-21 — corrected against the actual source tree.
> Every table, enum, route, export and seed entry below was read out of the code,
> not from memory. Where the previous revision disagreed with the code, the code won;
> those spots are flagged with **[was wrong]**.

---

## 1. Project Overview

DiveMap is an "AllTrails for diving" — a dive site discovery platform with:
- **Consumer app** (Next.js web + Expo mobile): discover dive sites, log dives, plan tech dives
- **B2B operator listing**: dive shops pay to be listed ($29–49/mo)
- **Monetization**: AllTrails model — $49/yr subscription (Tech Planner, advanced filters, offline maps)

**Business model:**
- Free: browse sites, read conditions, write reviews
- Premium ($49/yr): Bühlmann ZHL-16C Tech Planner, offline maps, advanced filters
- Operator B2B: $29–49/mo listing fee

Neither paywall is enforced yet — see §12.

---

## 2. Tech Stack

| Layer | Tech |
|-------|------|
| Web | Next.js 14.2.35 (App Router) + TypeScript + Tailwind |
| Mobile | Expo 57 (React Native) + TypeScript |
| Database | Supabase (PostgreSQL + PostGIS + Auth + Storage) |
| Maps | Mapbox GL JS v3 + Supercluster |
| Payments | Stripe (web) + RevenueCat (mobile) — NOT INTEGRATED |
| Analytics | PostHog — provider wired, key optional |
| Monorepo | Turborepo 2.10 + pnpm 9.15.9 (Node ≥ 20) |
| Deco engine | `packages/deco-engine` — Bühlmann ZH-L16C, TypeScript |

**Note on React versions:** `apps/web` pins React 18 (Next 14), `apps/mobile` pins React 19 (Expo 57).
`.npmrc` sets `node-linker=isolated` precisely so hoisting cannot collapse them into one copy.
Do not "fix" the peer-dependency warnings by hoisting.

**Design tokens** live in `packages/ui/src/tokens.ts` and are the single source of truth
(`colors`, `typography`, `radius`, `shadows`, `spacing`, `animation`, `components`, `tailwindExtend`).
`apps/web/tailwind.config.ts` imports `tailwindExtend` from there. Never hardcode a hex value.

Core palette: bg `#051422` · card `#0b2438` · accent `#00b4d8` · ocean-600 `#0077b6` · ocean-700 `#023e8a`.
Depth-band pin colours: `<20 m` teal `#33d6c3` · `20–40 m` amber `#ffb703` · `40–60 m` coral `#ef476f` · `60 m+` navy `#0077b6`.

**Personas (design research, Jul 2026)** — the refreshed design canvas documents three:
Maya the vacation diver (~60% of divers; picks sites AllTrails-style, rating first),
Tom the local regular (dives weekly; checks viz/current before driving out, logs with wet
hands), and Marta the technical diver (~25%, spends 46% more; judges the app by whether
its deco numbers can be trusted). Feature priorities map accordingly: viz score and
operators for Maya, 30-second reporting and conditions trends for Tom, the Bühlmann
planner and insider depth beta for Marta.

---

## 3. Repo Structure

```
divemap/
├── apps/
│   ├── web/                     # Next.js 14 App Router
│   │   ├── app/                 # routes — see §7
│   │   ├── components/map/      # DiveMap, DiscoveryMap, FilterBar, SearchBar, BottomSheet
│   │   ├── middleware.ts        # auth guard, PROTECTED = /profile, /log-dive, /planner
│   │   └── .env.local           # REQUIRED HERE (see §4)
│   └── mobile/                  # Expo app
│       └── app/
│           ├── (tabs)/          # index, sites, conditions, log, profile
│           ├── sites/[slug]/    # detail + conditions report wizard
│           ├── planner/         # mobile tech planner
│           └── auth/            # sign-in, sign-up
├── packages/
│   ├── db/src/
│   │   ├── types.ts             # generated Supabase types
│   │   ├── client.ts            # browser client (anon key)
│   │   ├── server.ts            # SSR client, cookie-bound (anon key, NOT service role)
│   │   ├── queries/             # all DB access lives here
│   │   ├── hooks/useAuth.ts
│   │   └── schema.sql           # GENERATED — pnpm db:schema, never by hand
│   ├── deco-engine/src/         # Bühlmann ZH-L16C + 41 tests
│   └── ui/src/tokens.ts         # design tokens
├── supabase/migrations/         # ✅ SOURCE OF TRUTH for the schema
│   ├── 20260716000000_initial_schema.sql
│   ├── 20260717000001_dive_reviews.sql
│   └── 20260721000000_storage_site_photos.sql
├── design-reference/            # DiveMap.dc.html + image assets
└── scripts/
    ├── seed-dive-sites.ts       # dive_sites
    ├── seed-operators-species.ts # operators, operator_sites, species, sightings
    └── build-schema-sql.ts      # regenerates packages/db/src/schema.sql
```

**[was wrong]** The previous revision called `packages/db/src/schema.sql` the source of truth.
It is not — `supabase/migrations/` is. `schema.sql` is now a **generated** single-file view
of the whole database, produced by `pnpm db:schema`; run that after adding a migration and
never edit it by hand.

It had rotted quietly while hand-maintained: by 2026-07-21 it was missing the `dive_reviews`
table entirely, the storage bucket and its policies, and six indexes. That is exactly the
failure a generated artifact prevents — a second hand-written copy of the schema will always
drift, and a stale one is worse than none because it reads as authoritative.

**[was wrong]** `packages/db/src/server.ts` does *not* use the service role key.
It builds a cookie-bound SSR client on the anon key so RLS still applies. The service role
key is used only by the seed script.

---

## 4. Environment Variables

File: `apps/web/.env.local` — must exist **here**, not only at the repo root. Next.js only
loads `.env*` from the app directory.

```env
NEXT_PUBLIC_SUPABASE_URL=https://sdinzyrebuyjrhrnqldy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_pub_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...     # server/seed only
NEXT_PUBLIC_MAPBOX_TOKEN=pk....
# Optional
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
# Phase 5, not read by any code yet
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
```

`turbo.json` declares these in `globalEnv`, so changing one busts the Turborepo cache.

**CRITICAL:** never prefix `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_` — that ships a
full RLS bypass to every browser.

Without the Supabase URL/key the middleware throws on **every** route and the whole site 500s.
Without the Mapbox token the map logs `NEXT_PUBLIC_MAPBOX_TOKEN not set` and renders nothing.

---

## 5. Database Schema

### Tables (12) — as defined in `supabase/migrations/`

| Table | Purpose |
|-------|---------|
| `users` | Public profile mirroring `auth.users`; row created by the `on_auth_user_created` trigger |
| `dive_sites` | Core site data; `lat`/`lng` authored, `location` geography generated from them |
| `conditions_reports` | Diver-submitted conditions (viz, current, temp) |
| `dives` | Personal dive log entries |
| `dive_reviews` | Star ratings + text reviews (second migration) |
| `site_photos` | Site photos, backed by Supabase Storage |
| `operators` | Dive shop listings |
| `operator_sites` | Many-to-many: operators ↔ sites |
| `species` | Marine life catalog |
| `species_sightings` | Species seen at sites |
| `wishlists` | User saved sites |
| `dive_plans` | Saved Tech Planner runs (inputs + result snapshot); owner-only RLS |

**[was wrong]** The previous revision listed `dive_logs` (actual name: `dives`), `photos`
(actual: `site_photos`), and `operator_follows` — **no such table exists** in either migration.

### Enums

- `site_type`: `reef | wreck | wall | cave | cenote | drift | muck | pinnacle | kelp | fissure`
- `current_level`: `none | mild | moderate | strong | ripping`
- `dive_level`: `beginner | intermediate | advanced | technical`

**[was wrong]** The previous revision listed `site_type` as `boat_dive | shore_dive | liveaboard | freedive`
— a completely different axis (entry method, not topography). It also gave `current_level`'s last
value as `variable` (actual: `ripping`) and named the third enum `certification_level` (actual: `dive_level`).
Anything written against the old list will fail the enum check on insert.

### Conventions worth knowing

- Every user-writable table has RLS on, with owner-only writes keyed on `user_id` / `reporter` / `created_by`.
- Policies wrap auth as `(select auth.uid())` so Postgres evaluates it once per query, not per row.
- Distances and depths are **metres**, temperatures **Celsius**; column suffixes make it explicit.
- `dive_sites.location` is `generated always as ... stored` from `lng`/`lat`, so the two can never drift.

### Functions

- `set_updated_at()` — shared `updated_at` trigger
- `handle_new_user()` — `SECURITY DEFINER`, creates the `public.users` row on signup
- `dive_sites_near(in_lat, in_lng, radius_m default 50000, max_results default 50)` — PostGIS radius
  search over the GiST index, exposed to PostgREST as `rpc('dive_sites_near')`

**[was wrong]** `search_dive_sites()` and `top_rated_sites()` do **not** exist. Text search is
`.ilike('name', '%…%')` in `browseSites`/`searchSites`, and "top rated" is
`.order('rating', { ascending: false })` in `getTopSiteSlugs`. Also worth knowing: **no application
code calls `dive_sites_near` at all** — it is defined but unused, so the GiST index currently earns nothing.

---

## 6. Known Issues

### ✅ Fixed 2026-07-21

**Map showed no pins.** The cause was neither an empty database nor a bad Mapbox token
(both were fine — 20 sites seeded, token valid). Two independent defects in
`apps/web/components/map/DiveMap.tsx`:

1. **Container collapsed to 0 px tall.** The map div was `className="absolute inset-0"`, but
   `mapbox-gl.css` sets `.mapboxgl-map { position: relative }`. Next.js appends component-level
   CSS *after* `globals.css`, so at equal specificity Mapbox's rule won, `position` resolved to
   `relative`, and `inset-0` stopped constraining height. Measured: `height: 0`.
   Fixed by sizing the container explicitly (`w-full h-full`) so the fill no longer depends on
   which rule wins the cascade.

2. **Second map instance never finished loading (dev only).** React StrictMode double-invokes
   effects; the cleanup called `map.remove()` synchronously, which tears down mapbox-gl's shared
   worker pool, and the map re-created microseconds later never loaded its style — verified:
   `isStyleLoaded() === false` forever, zero tile requests, `load` never fired, and therefore
   `setMapReady(true)` never ran and no markers were created. No console error, which is why
   this was mis-diagnosed as a data problem.
   Fixed by deferring teardown one tick so a StrictMode remount cancels it and reuses the live map.

   This one is **development-only** — StrictMode does not double-invoke effects in production
   builds — which is why the same code appeared to work when built.

### 🔴 Open

Nothing. Photo upload was the last unverified path and has now been exercised end to end
against the real bucket.

### 🟡 Missing integrations

3. **Stripe / RevenueCat** — not integrated. Premium upsell buttons exist but go nowhere.
4. **PostHog** — provider and page-view tracker are wired; supply `NEXT_PUBLIC_POSTHOG_KEY` to activate.
5. **Google OAuth** — needs the callback URL registered in Supabase + Google Cloud Console.
   The handler at `/auth/callback` is already implemented.

### 🟡 Quality

6. **Mobile app** — runs as a dev build (`expo run:ios`; Expo Go no longer works since
   @rnmapbox/maps is native). Verified live: Google sign-in, 5-step log wizard writing to
   the shared DB, native clustered map with tap-through. Remaining gaps: photos/species in
   the wizard, offline, push.
7. **`dive_sites_near` is dead code** — see §5.
8. Two `<img>` lint warnings (`ProfilePage.tsx`, `ReportFlow.tsx`) — should be `next/image`.

---

## 7. Pages & Routes

All 20 page routes plus one route handler, as they exist on disk:

| Route | Auth | Guarded by |
|-------|------|-----------|
| `/` | No | — |
| `/sites` | No | — |
| `/sites/[slug]` | No (review: yes) | — |
| `/sites/[slug]/report` | Yes | in-page redirect |
| `/conditions` | No | — |
| `/operators` | No | — |
| `/operators/[slug]` | No | — |
| `/species` | No | — |
| `/species/[slug]` | No | — |
| `/planner` | Yes | **middleware** |
| `/profile` | Yes | **middleware** (exact match) |
| `/profile/[username]` | No | — public diver profile |
| `/profile/edit` | Yes | **middleware** |
| `/log-dive` | Yes | **middleware** |
| `/logbook` | Yes | in-page redirect |
| `/wishlist` | Yes | in-page redirect |
| `/dives/[id]` | Yes | in-page redirect |
| `/auth/sign-in` | No | — |
| `/auth/sign-up` | No | — |
| `/auth/reset-password` | No | — |
| `/auth/update-password` | No | — |
| `/auth/callback` | No | route handler (OAuth/PKCE exchange) |

Two different guard mechanisms are in play. `middleware.ts` protects `/log-dive`, `/planner`
and `/profile/edit` by prefix plus `/profile` by exact match — exact, because public diver
profiles live under `/profile/[username]`. Usernames can never collide with the static
routes: `edit`, `plans` and `settings` are reserved in the `users.username` check constraint.
Everything else authenticates inside the page and redirects to `/auth/sign-in?next=…`.
If you add a protected route, pick one mechanism deliberately — the middleware list is easy to forget.

**[was wrong]** The previous revision omitted `/auth/update-password` and `/auth/callback`, and
implied middleware covered `/logbook` and `/wishlist`. It does not.

---

## 8. Seed Scripts

Two scripts, run in order. Both are idempotent — verified by running each twice and
comparing row counts.

### 8.1 `scripts/seed-dive-sites.ts`

Writes to `dive_sites` only, upserting on `slug` (safe to re-run). Two stages:
20 curated flagship sites, then up to `OSM_LIMIT` (default 1000) real sites
from OpenStreetMap via Overpass, with countries reverse-geocoded through
Mapbox (one call per 1° grid cell, so ~1000 sites cost ~200 calls).

The Overpass stage failed silently for a long time — three separate causes,
all fixed and worth knowing:

* **406** — Overpass rejects requests without an identifying `User-Agent`
  (OSM policy); Node's `fetch` sends none.
* **Wrong tags** — `sport=diving` is *platform* diving (springboard halls),
  and `leisure=scuba_diving` does not exist; the documented tag is
  `sport=scuba_diving`.
* **504** — a global `nwr` query with `out center` makes public instances
  compute polygon centres for the planet and they shed load; nodes-only with
  `out qt` returns in ~2 min. Three mirror endpoints are tried in order.

Business noise (dive shops, schools, pool centres share the tag) is filtered
by `shop`/`office`/`building`/`amenity=dive_centre`/`leisure=sports_centre`
tags; only named elements are imported. Types are classified heuristically
from tags and names (wreck/cave/cenote/wall/pinnacle/kelp/drift, default reef).
Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS, falling back to the anon key if absent.

```bash
# from the repo root
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... pnpm seed
```

The 20 sites it actually inserts:

| | slug | | slug |
|-|------|-|------|
| 1 | `blue-hole-dahab` | 11 | `blue-hole-malta` |
| 2 | `ss-thistlegorm` | 12 | `barracuda-lake-philippines` |
| 3 | `usat-liberty-bali` | 13 | `tubbataha-reef` |
| 4 | `manta-point-bali` | 14 | `ningaloo-reef` |
| 5 | `devils-grotto-cayman` | 15 | `poor-knights-islands` |
| 6 | `silfra-fissure` | 16 | `poor-knights-wall` |
| 7 | `jellyfish-lake-palau` | 17 | `richelieu-rock-thailand` |
| 8 | `blue-corner-palau` | 18 | `koh-bon-thailand` |
| 9 | `ras-mohammed` | 19 | `zenobia-wreck-cyprus` |
| 10 | `the-arch-malta` | 20 | `cirkewwa-malta` |

### 8.2 `scripts/seed-operators-species.ts`

```bash
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... pnpm seed:operators
```

Seeds **15 operators**, **20 operator↔site links** and **20 species**, all linked to the sites
above by slug; a slug that is not in the database is skipped with a warning rather than failing.
Operators upsert on `slug`, links rely on the `(operator_id, site_id)` composite primary key.

`species_sightings` is handled separately because `user_id` is `not null` with an FK to
`public.users`. The script attributes sightings to `SEED_USER_ID` when set, otherwise to the
oldest row in `public.users`, and skips them entirely (with a clear message) when there are no
users yet. Sightings are stamped across the last 28 days on purpose — `getSiteMarineLife()`
only looks back 30 days, so a `now()` timestamp for every row would age out together.
Re-running clears only the exact `(user_id, species_id, site_id)` triples it is about to write,
so a real diver's own sightings are never touched.

**[was wrong]** The previous list was largely fictional. Great Barrier Reef, Barracuda Point
(Malaysia), Baa Atoll, Neptune Islands, Cozumel Palancar, Lembeh Strait, Sardine Run, Blue Hole
(Belize), Manta Ray Bay (Yap), Japanese Gardens (Aqaba) and Shark & Yolanda Reef are **not**
in the seed. Sites 4, 6, 7, 11–16 and 18–20 were missing from it.

---

## 9. Deco Engine (Bühlmann ZH-L16C)

`packages/deco-engine/src/engine.ts`. Safety-critical: 100% unit-test coverage is a hard
requirement, and results must be checked against published Bühlmann tables before shipping.

**Actual API — takes one object, returns one object:**

```typescript
import { computeDivePlan } from '@divemap/deco-engine'

const result = computeDivePlan({
  depth: 40,                                  // m, max depth
  bottomTime: 25,                             // min, including descent
  gasMix: { fO2: 0.21, fHe: 0 },              // fractions 0..1, fO2 + fHe <= 1
  gradientFactors: { gfLo: 30, gfHi: 85 },    // percentages 0..100
  surfacePressure: 1.01325,                   // bar, optional
})

result.decoStops       // [{ depth, duration, gasMix }], deepest first, [] if no-deco
result.totalRuntime    // min, bottom time + ascent
result.ndl             // min, no-decompression limit
result.cnsPercent      // CNS O2 toxicity, %
result.otu             // pulmonary O2 toxicity, OTU
result.ceilingByMinute // [{ minute, ceiling }], one sample per runtime minute
```

**[was wrong]** The previous revision documented `planDive(depth, time, gas, gf, surface)` with
five positional arguments returning `tts` and `maxDepthM`. There is no `planDive` export, no
positional form, and no `tts`/`maxDepthM` field. It also wrote the gradient factors as
`gfLow`/`gfHigh` — the actual keys are **`gfLo`/`gfHi`**, and a typo there silently yields
`NaN` rather than an error.

Compartment coefficients are true ZH-L16**C** with compartment 1b, matching
libdivecomputer/subsurface. (The version in the GitHub repo at commit `0e27132` still carries
ZH-L16**A** nitrogen `a`-coefficients — less conservative. The local tree is correct.)

**Tests:** 41 tests in `src/__tests__/engine.test.ts` — 100% of statements, branches, functions and lines.

```bash
pnpm --filter @divemap/deco-engine test
```

---

## 10. How to Run Locally

```bash
# 1. Install (pnpm 9.15.9 via corepack; Node >= 20)
corepack enable && corepack prepare pnpm@9.15.9 --activate
pnpm install

# 2. Env — must be at apps/web/.env.local, see §4
cp apps/web/.env.local.example apps/web/.env.local
$EDITOR apps/web/.env.local

# 3. Apply migrations (one-time)
SUPABASE_ACCESS_TOKEN=sbp_... npx supabase link --project-ref sdinzyrebuyjrhrnqldy
npx supabase db push

# 4. Seed — sites first, then operators/species (see §8)
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... pnpm seed
SUPABASE_SERVICE_ROLE_KEY=sb_secret_... pnpm seed:operators

# 5. Web  →  http://localhost:3000
pnpm dev

# 6. Mobile, separate terminal
cd apps/mobile && npx expo start
```

`pnpm dev` from the root runs `turbo run dev --filter=@divemap/web`; `pnpm mobile` runs the Expo app.
Peer-dependency warnings from Expo during install are expected — see §2.

**Verified on this machine:** install clean, `tsc --noEmit` clean on web, `next build` succeeds
across all 23 build outputs, deco tests 41/41 at 100% coverage, dev server serves
`/ /sites /planner /conditions /species /operators` at 200, map renders with clustered pins.

---

## 11. Completed Features (Phase 0–4)

**Phase 0 — Foundation:** Turborepo monorepo, Supabase schema with PostGIS, TypeScript types,
design tokens + Tailwind config, Supabase Auth (+ Google OAuth handler).

**Phase 1 — Map & Discovery:** Mapbox map with depth-coloured pins and Supercluster clustering,
FilterBar (type / depth / current / tech-friendly), SearchBar, map⇄list toggle, seed script,
dark⇄satellite style toggle with custom `#023e8a` water.

**Phase 2 — Site Detail:** tabbed detail page (Overview, Conditions, Photos, Operators, Tech Plan),
recent conditions reports, wishlist button, depth profile and marine life.

**Phase 3 — Tech Planner:** ZH-L16C engine, web planner UI (depth, time, gas mix, GF),
deco stop table, CNS / OTU / runtime, 41 tests at 100% coverage, mobile planner screen.

**Phase 4 — UGC & Social:** reviews + star ratings, photo uploads to Supabase Storage,
operator listing and detail pages, logbook, conditions feed, species listing, wishlist page,
404 page and error boundaries.

---

## 12. Next Phases (not built)

**Phase 5 — Monetization:** Stripe subscription ($49/yr), RevenueCat IAP, paywall on the Tech
Planner, operator B2B self-serve signup, Stripe webhook handler.

**Phase 6 — Growth:** conditions-alert emails, social sharing cards, operator dashboard,
SEO (static generation for site pages — `/sites/[slug]` already prerenders, `sitemap.ts` exists).

**Phase 7 — Mobile polish:** offline maps, push notifications, store submission.

---

## 13. GitHub

- **Repo:** `git@github.com:AndresProskurin/divemap.git`, branch **`master`** (not `main` — the
  previous revision said `main`; `origin/HEAD` points at `master`)
- **Supabase project ref:** `sdinzyrebuyjrhrnqldy`

⚠️ **The remote was badly behind and has now been caught up.** Before 2026-07-21 it sat at `0e27132`
(*"feat: [18] Error boundaries + mobile wishlist toggle"*) — missing the whole
`supabase/migrations/` directory, reviews, operators, `/logbook`, `/wishlist`,
`/conditions`, `/dives/[id]`, `/species/[slug]`, the PostHog provider, the loading
states and the ZH-L16C coefficient correction. All of that is pushed now. Keep it that
way: for a solo project the remote is the only backup, and it silently rotted for days.

---

## 14. Gotchas

Things that cost real debugging time here, recorded because none of them announce
themselves clearly.

### `sb_*` API keys must go in the `apikey` header, not `Authorization: Bearer`

Supabase's newer key format (`sb_publishable_...`, `sb_secret_...`) is **not** a JWT.
Anything that expects a JWT rejects it with a message that says nothing about headers:

```
{"statusCode":"403","error":"Unauthorized","message":"Invalid Compact JWS"}
```

"Invalid Compact JWS" means "this string does not have three dot-separated segments",
i.e. it is not a JWT — not "this key is wrong". Use `apikey`:

```bash
# works
curl "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/bucket" -H "apikey: $SUPABASE_SERVICE_ROLE_KEY"
# 403 Invalid Compact JWS
curl "$NEXT_PUBLIC_SUPABASE_URL/storage/v1/bucket" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

Sending both headers also works, which is why copied-from-docs snippets sometimes
succeed and stripped-down ones do not.

### Google sign-in can 400 on the first attempt, then work on a retry

Observed repeatedly in a browser with ~10 Google accounts signed in: pick an account,
Google shows a bare HTTP 400 ("Произошла ошибка") *after* the password is accepted;
press Back, pick the **same** account again, and it goes through. A different
signed-in account worked first time.

The failing URL bounces through `accounts.google.com/ServiceLogin` with
`continue=…/signin/oauth/consent?authuser=N`. Best-fitting explanation: that account's
session cookie had gone stale, Google tried to refresh it via `ServiceLogin`, and the
consent → ServiceLogin → consent chain broke — while still refreshing the session as a
side effect, so the retry succeeds. Per-account, not per-browser: account count and
cookie volume were ruled out by one account working while another failed in the same
browser.

**Nothing in this codebase causes it or can catch it.** The break happens entirely
between Google's own pages; the user never reaches `/auth/callback`, so there is no
error for the app to handle. Verified separately that the OAuth client, the registered
redirect URI (`https://<ref>.supabase.co/auth/v1/callback`) and the consent screen are
configured correctly.

What to tell a user who reports it: **go back and try again with the same account.**
Failing that, a private window works (single fresh session). Email + password sign-in is
unaffected and is the reliable fallback.

`signInWithOAuth` passes `prompt=select_account` ([useAuth.ts](packages/db/src/hooks/useAuth.ts)),
which forces the account chooser instead of letting Google resolve the session silently.
That is worth having on its own — the user always knows which account they are using —
but be clear that **it does not prevent the 400 above**; that was tested.

### Never run `next build` while `next dev` is running

Both write to the same `apps/web/.next`. Starting a build against a live dev server
overwrites that directory underneath it, and the dev server goes on serving HTML that
references CSS chunks which no longer exist. The result is a page with correct markup and
**no styling at all** — unstyled links, default form controls, white background. No error
appears in the terminal or the browser console, so it reads as "the whole app broke".

Recovery:

```bash
pkill -f "next dev"
rm -rf apps/web/.next
pnpm dev
```

If you need to verify a production build, stop the dev server first.

### Supabase redirect allowlist

After Google returns, Supabase only forwards to `redirectTo` if it matches
Authentication → URL Configuration → Redirect URLs. For local dev that needs
`http://localhost:3000/**`. A missing entry does not error — it silently lands the user
on Site URL, unauthenticated, which reads as "login did nothing".

---

## 15. Immediate Action Items

0. **Tech Planner deep-work (requested 2026-07-22, research first):** custom deco gases
   (web has only the EAN50/EAN36/O₂ presets, mobile planner has none at all), automatic
   best-mix suggestion for a target depth (fO₂ from a 1.2–1.4 bar bottom ppO₂, fHe from
   an END ceiling of 30–40 m), and gas logistics (SAC-based consumption, minimum gas /
   rock bottom). Compare against Subsurface planner and MultiDeco before designing.

1. **Apply `20260722000000_dive_plans_usernames.sql`** — Save Plan and /profile/[username]
   404 until the `dive_plans` table and `users.username` exist. SQL editor or `db push`.
2. Decide on `dive_sites_near`: wire it into the map's viewport query, or drop it and the index.
3. Wire up Stripe for the premium paywall (Phase 5).

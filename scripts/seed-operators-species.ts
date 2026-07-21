/**
 * Seed script — populate operators, operator_sites, species and species_sightings.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=sb_secret_... pnpm seed:operators
 *
 * Companion to seed-dive-sites.ts, which seeds dive_sites only. Run that first:
 * operators and sightings are linked to sites by slug, and any slug that is not
 * in the database yet is skipped with a warning.
 *
 * The service role key is used (via env SUPABASE_SERVICE_ROLE_KEY) so RLS is
 * bypassed and the seed can run without an authenticated user. Falls back to
 * the anon key when absent, which will fail on the write policies.
 *
 * species_sightings.user_id is NOT NULL and references public.users, so
 * sightings cannot be invented out of thin air. The script attributes them to
 * SEED_USER_ID when set, otherwise to the oldest row in public.users. With no
 * users at all it seeds everything else and skips sightings — sign up once in
 * the app, then re-run.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../packages/db/src/types'

type OperatorInsert = Database['public']['Tables']['operators']['Insert']
type SpeciesInsert = Database['public']['Tables']['species']['Insert']
type SightingInsert = Database['public']['Tables']['species_sightings']['Insert']

// ─── OPERATORS ───────────────────────────────────────────────────────────────
// `sites` is not a column — it lists dive_sites slugs this operator runs trips
// to, and is stripped out into operator_sites below.

interface OperatorSeed extends OperatorInsert {
  sites: string[]
}

const OPERATORS: OperatorSeed[] = [
  {
    slug: 'dahab-tech-divers',
    name: 'Dahab Tech Divers',
    description: 'Trimix and CCR training on the Gulf of Aqaba, run out of a shore base 200 m from the Blue Hole car park.',
    base: 'Dahab · shore diving + tech training',
    country: 'Egypt',
    lat: 28.4899,
    lng: 34.5136,
    tech_certified: true,
    certs_offered: ['TWINSETS', 'STAGES', 'O2', 'SOFNOLIME', 'TRIMIX'],
    rating: 4.8,
    tech_dives_guided: 1420,
    website: 'https://example.com/dahab-tech-divers',
    sites: ['blue-hole-dahab'],
  },
  {
    slug: 'red-sea-explorers',
    name: 'Red Sea Explorers',
    description: 'Liveaboard operator covering the northern wrecks and Ras Mohammed, with twinset and stage fills on board.',
    base: 'Hurghada · liveaboard + day boats',
    country: 'Egypt',
    lat: 27.2579,
    lng: 33.8116,
    tech_certified: true,
    certs_offered: ['TWINSETS', 'STAGES', 'O2'],
    rating: 4.7,
    tech_dives_guided: 980,
    website: 'https://example.com/red-sea-explorers',
    sites: ['ss-thistlegorm', 'ras-mohammed'],
  },
  {
    slug: 'tulamben-dive-lodge',
    name: 'Tulamben Dive Lodge',
    description: 'Shore-entry specialist on the Liberty wreck. Pre-dawn slots to beat the day-trip buses from the south.',
    base: 'Tulamben · shore diving',
    country: 'Indonesia',
    lat: -8.2745,
    lng: 115.5921,
    tech_certified: false,
    certs_offered: [],
    rating: 4.6,
    tech_dives_guided: 0,
    website: 'https://example.com/tulamben-dive-lodge',
    sites: ['usat-liberty-bali'],
  },
  {
    slug: 'penida-blue-dive',
    name: 'Penida Blue Dive',
    description: 'Nusa Penida day boats for manta cleaning stations and the mola-mola season. Small groups, 4 divers per guide.',
    base: 'Sanur · day boats to Nusa Penida',
    country: 'Indonesia',
    lat: -8.6871,
    lng: 115.2624,
    tech_certified: false,
    certs_offered: [],
    rating: 4.5,
    tech_dives_guided: 0,
    website: 'https://example.com/penida-blue-dive',
    sites: ['manta-point-bali'],
  },
  {
    slug: 'cayman-deep-blue',
    name: 'Cayman Deep Blue',
    description: 'George Town shore and boat dives across the Eden Rock and Devil’s Grotto cavern system.',
    base: 'George Town · shore + day boats',
    country: 'Cayman Islands',
    lat: 19.2925,
    lng: -81.3861,
    tech_certified: false,
    certs_offered: ['O2'],
    rating: 4.6,
    tech_dives_guided: 0,
    website: 'https://example.com/cayman-deep-blue',
    sites: ['devils-grotto-cayman'],
  },
  {
    slug: 'silfra-freeflow',
    name: 'Silfra Freeflow',
    description: 'Drysuit-only guiding in the Thingvellir rift. Drysuit certification or a logged drysuit dive is mandatory.',
    base: 'Thingvellir · drysuit only',
    country: 'Iceland',
    lat: 64.2559,
    lng: -21.1144,
    tech_certified: false,
    certs_offered: ['DRYSUIT'],
    rating: 4.9,
    tech_dives_guided: 0,
    website: 'https://example.com/silfra-freeflow',
    sites: ['silfra-fissure'],
  },
  {
    slug: 'palau-blue-water',
    name: 'Palau Blue Water',
    description: 'Reef hooks and current diving on the Rock Islands, plus permitted access to the marine lake.',
    base: 'Koror · day boats',
    country: 'Palau',
    lat: 7.3419,
    lng: 134.4792,
    tech_certified: true,
    certs_offered: ['TWINSETS', 'O2'],
    rating: 4.8,
    tech_dives_guided: 310,
    website: 'https://example.com/palau-blue-water',
    sites: ['blue-corner-palau', 'jellyfish-lake-palau'],
  },
  {
    slug: 'gozo-technical-diving',
    name: 'Gozo Technical Diving',
    description: 'Deep shore dives on Gozo with sofnolime and helium on site. Normoxic trimix upwards.',
    base: 'Marsalforn · shore diving + tech',
    country: 'Malta',
    lat: 36.0729,
    lng: 14.2588,
    tech_certified: true,
    certs_offered: ['TWINSETS', 'STAGES', 'O2', 'SOFNOLIME', 'TRIMIX'],
    rating: 4.7,
    tech_dives_guided: 640,
    website: 'https://example.com/gozo-technical-diving',
    sites: ['the-arch-malta', 'blue-hole-malta'],
  },
  {
    slug: 'cirkewwa-dive-centre',
    name: 'Cirkewwa Dive Centre',
    description: 'Walk-in access to the Cirkewwa arch and the P29 and Rozi wrecks. Nitrox included in the day rate.',
    base: 'Cirkewwa · shore diving',
    country: 'Malta',
    lat: 35.9895,
    lng: 14.3283,
    tech_certified: false,
    certs_offered: ['O2'],
    rating: 4.4,
    tech_dives_guided: 0,
    website: 'https://example.com/cirkewwa-dive-centre',
    sites: ['cirkewwa-malta'],
  },
  {
    slug: 'coron-wreck-divers',
    name: 'Coron Wreck Divers',
    description: 'Japanese WWII wrecks around Coron Bay plus the thermocline dive in Barracuda Lake.',
    base: 'Coron · day boats',
    country: 'Philippines',
    lat: 11.9986,
    lng: 120.2043,
    tech_certified: true,
    certs_offered: ['TWINSETS', 'STAGES', 'O2'],
    rating: 4.6,
    tech_dives_guided: 520,
    website: 'https://example.com/coron-wreck-divers',
    sites: ['barracuda-lake-philippines'],
  },
  {
    slug: 'sulu-sea-liveaboards',
    name: 'Sulu Sea Liveaboards',
    description: 'March-to-June liveaboard season on Tubbataha. Permits and park fees handled on board.',
    base: 'Puerto Princesa · liveaboard only',
    country: 'Philippines',
    lat: 9.7392,
    lng: 118.7353,
    tech_certified: false,
    certs_offered: ['O2'],
    rating: 4.9,
    tech_dives_guided: 0,
    website: 'https://example.com/sulu-sea-liveaboards',
    sites: ['tubbataha-reef'],
  },
  {
    slug: 'exmouth-ningaloo-dive',
    name: 'Exmouth Ningaloo Dive',
    description: 'Whale shark season March to August, with spotter aircraft and in-water guides on every trip.',
    base: 'Exmouth · day boats',
    country: 'Australia',
    lat: -21.9323,
    lng: 114.1281,
    tech_certified: false,
    certs_offered: [],
    rating: 4.7,
    tech_dives_guided: 0,
    website: 'https://example.com/exmouth-ningaloo-dive',
    sites: ['ningaloo-reef'],
  },
  {
    slug: 'northland-dive-nz',
    name: 'Northland Dive',
    description: 'Poor Knights day boats out of Tutukaka. Subtropical current arrives late summer.',
    base: 'Tutukaka · day boats',
    country: 'New Zealand',
    lat: -35.6117,
    lng: 174.5314,
    tech_certified: true,
    certs_offered: ['TWINSETS', 'O2'],
    rating: 4.8,
    tech_dives_guided: 275,
    website: 'https://example.com/northland-dive-nz',
    sites: ['poor-knights-islands', 'poor-knights-wall'],
  },
  {
    slug: 'similan-liveaboards',
    name: 'Similan Liveaboards',
    description: 'Four-night runs to Richelieu Rock and Koh Bon during the October-to-May Andaman season.',
    base: 'Khao Lak · liveaboard',
    country: 'Thailand',
    lat: 8.6415,
    lng: 98.2461,
    tech_certified: false,
    certs_offered: ['O2'],
    rating: 4.7,
    tech_dives_guided: 0,
    website: 'https://example.com/similan-liveaboards',
    sites: ['richelieu-rock-thailand', 'koh-bon-thailand'],
  },
  {
    slug: 'larnaca-wreck-divers',
    name: 'Larnaca Wreck Divers',
    description: 'Zenobia specialists. Penetration of the upper cargo decks for suitably certified divers only.',
    base: 'Larnaca · day boats + tech',
    country: 'Cyprus',
    lat: 34.9182,
    lng: 33.6401,
    tech_certified: true,
    certs_offered: ['TWINSETS', 'STAGES', 'O2', 'TRIMIX'],
    rating: 4.8,
    tech_dives_guided: 1130,
    website: 'https://example.com/larnaca-wreck-divers',
    sites: ['zenobia-wreck-cyprus'],
  },
]

// ─── SPECIES ─────────────────────────────────────────────────────────────────
// `sites` lists the dive_sites slugs where this species gets a sighting.
// Colours come from the ocean palette in packages/ui/src/tokens.ts and must
// match the ^#[0-9a-fA-F]{6}$ check constraint.

interface SpeciesSeed extends SpeciesInsert {
  sites: string[]
}

const SPECIES: SpeciesSeed[] = [
  {
    slug: 'whale-shark',
    common_name: 'Whale shark',
    scientific_name: 'Rhincodon typus',
    color: '#48cae4',
    sites: ['ningaloo-reef', 'richelieu-rock-thailand', 'koh-bon-thailand'],
  },
  {
    slug: 'reef-manta',
    common_name: 'Reef manta ray',
    scientific_name: 'Mobula alfredi',
    color: '#00b4d8',
    sites: ['manta-point-bali', 'koh-bon-thailand', 'ningaloo-reef'],
  },
  {
    slug: 'mola-mola',
    common_name: 'Ocean sunfish',
    scientific_name: 'Mola alexandrini',
    color: '#90e0ef',
    sites: ['manta-point-bali'],
  },
  {
    slug: 'grey-reef-shark',
    common_name: 'Grey reef shark',
    scientific_name: 'Carcharhinus amblyrhynchos',
    color: '#0077b6',
    sites: ['blue-corner-palau', 'tubbataha-reef'],
  },
  {
    slug: 'scalloped-hammerhead',
    common_name: 'Scalloped hammerhead',
    scientific_name: 'Sphyrna lewini',
    color: '#023e8a',
    sites: ['tubbataha-reef', 'ras-mohammed'],
  },
  {
    slug: 'napoleon-wrasse',
    common_name: 'Napoleon wrasse',
    scientific_name: 'Cheilinus undulatus',
    color: '#33d6c3',
    sites: ['blue-corner-palau', 'ras-mohammed'],
  },
  {
    slug: 'bumphead-parrotfish',
    common_name: 'Bumphead parrotfish',
    scientific_name: 'Bolbometopon muricatum',
    color: '#0096c7',
    sites: ['tubbataha-reef', 'blue-corner-palau'],
  },
  {
    slug: 'golden-jellyfish',
    common_name: 'Golden jellyfish',
    scientific_name: 'Mastigias papua etpisoni',
    color: '#ffb703',
    sites: ['jellyfish-lake-palau'],
  },
  {
    slug: 'green-turtle',
    common_name: 'Green turtle',
    scientific_name: 'Chelonia mydas',
    color: '#33d6c3',
    sites: ['ras-mohammed', 'usat-liberty-bali', 'ningaloo-reef'],
  },
  {
    slug: 'hawksbill-turtle',
    common_name: 'Hawksbill turtle',
    scientific_name: 'Eretmochelys imbricata',
    color: '#48cae4',
    sites: ['devils-grotto-cayman', 'tubbataha-reef'],
  },
  {
    slug: 'giant-moray',
    common_name: 'Giant moray',
    scientific_name: 'Gymnothorax javanicus',
    color: '#ef476f',
    sites: ['ss-thistlegorm', 'blue-hole-dahab', 'usat-liberty-bali'],
  },
  {
    slug: 'great-barracuda',
    common_name: 'Great barracuda',
    scientific_name: 'Sphyraena barracuda',
    color: '#9fc3da',
    sites: ['zenobia-wreck-cyprus', 'cirkewwa-malta', 'devils-grotto-cayman'],
  },
  {
    slug: 'bigfin-reef-squid',
    common_name: 'Bigfin reef squid',
    scientific_name: 'Sepioteuthis lessoniana',
    color: '#caf0f8',
    sites: ['usat-liberty-bali', 'blue-hole-dahab'],
  },
  {
    slug: 'painted-frogfish',
    common_name: 'Painted frogfish',
    scientific_name: 'Antennarius pictus',
    color: '#ffb703',
    sites: ['usat-liberty-bali'],
  },
  {
    slug: 'pygmy-seahorse',
    common_name: 'Pygmy seahorse',
    scientific_name: 'Hippocampus bargibanti',
    color: '#ef476f',
    sites: ['richelieu-rock-thailand', 'usat-liberty-bali'],
  },
  {
    slug: 'short-tailed-stingray',
    common_name: 'Short-tailed stingray',
    scientific_name: 'Bathytoshia brevicaudata',
    color: '#638aa3',
    sites: ['poor-knights-islands', 'poor-knights-wall'],
  },
  {
    slug: 'sand-tiger-shark',
    common_name: 'Sand tiger shark',
    scientific_name: 'Carcharias taurus',
    color: '#0077b6',
    sites: ['poor-knights-wall'],
  },
  {
    slug: 'arctic-charr',
    common_name: 'Arctic charr',
    scientific_name: 'Salvelinus alpinus',
    color: '#90e0ef',
    sites: ['silfra-fissure'],
  },
  {
    slug: 'silver-tarpon',
    common_name: 'Atlantic tarpon',
    scientific_name: 'Megalops atlanticus',
    color: '#caf0f8',
    sites: ['devils-grotto-cayman'],
  },
  {
    slug: 'dusky-grouper',
    common_name: 'Dusky grouper',
    scientific_name: 'Epinephelus marginatus',
    color: '#33d6c3',
    sites: ['the-arch-malta', 'blue-hole-malta', 'cirkewwa-malta'],
  },
]

// ─── MAIN ────────────────────────────────────────────────────────────────────

async function main() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']

  if (!url || !key) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    process.exit(1)
  }

  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false },
  })

  // ── Resolve site slugs to ids up front; everything below links by slug. ────
  const { data: siteRows, error: siteErr } = await supabase
    .from('dive_sites')
    .select('id, slug')

  if (siteErr) { console.error('Could not read dive_sites:', siteErr.message); process.exit(1) }

  const siteIdBySlug = new Map((siteRows ?? []).map((s) => [s.slug, s.id]))
  if (siteIdBySlug.size === 0) {
    console.error('dive_sites is empty — run `pnpm seed` first.')
    process.exit(1)
  }
  console.log(`Found ${siteIdBySlug.size} dive sites.`)

  // ── Operators ─────────────────────────────────────────────────────────────
  console.log(`\nUpserting ${OPERATORS.length} operators…`)
  const operatorRows: OperatorInsert[] = OPERATORS.map(({ sites: _sites, ...op }) => op)

  const { data: upsertedOps, error: opErr } = await supabase
    .from('operators')
    .upsert(operatorRows, { onConflict: 'slug', ignoreDuplicates: false })
    .select('id, slug')

  if (opErr) { console.error('Operator upsert error:', opErr.message); process.exit(1) }
  console.log(`✓ ${upsertedOps?.length ?? 0} operators.`)

  const operatorIdBySlug = new Map((upsertedOps ?? []).map((o) => [o.slug, o.id]))

  // ── operator_sites ────────────────────────────────────────────────────────
  const links: Array<{ operator_id: string; site_id: string }> = []
  for (const op of OPERATORS) {
    const operatorId = operatorIdBySlug.get(op.slug)
    if (!operatorId) continue
    for (const siteSlug of op.sites) {
      const siteId = siteIdBySlug.get(siteSlug)
      if (!siteId) {
        console.warn(`  ! ${op.slug}: no site '${siteSlug}', skipping link`)
        continue
      }
      links.push({ operator_id: operatorId, site_id: siteId })
    }
  }

  // Composite primary key (operator_id, site_id) makes this naturally idempotent.
  const { error: linkErr } = await supabase
    .from('operator_sites')
    .upsert(links, { onConflict: 'operator_id,site_id', ignoreDuplicates: true })

  if (linkErr) { console.error('operator_sites error:', linkErr.message); process.exit(1) }
  console.log(`✓ ${links.length} operator↔site links.`)

  // ── Species ───────────────────────────────────────────────────────────────
  console.log(`\nUpserting ${SPECIES.length} species…`)
  const speciesRows: SpeciesInsert[] = SPECIES.map(({ sites: _sites, ...sp }) => sp)

  const { data: upsertedSpecies, error: spErr } = await supabase
    .from('species')
    .upsert(speciesRows, { onConflict: 'slug', ignoreDuplicates: false })
    .select('id, slug')

  if (spErr) { console.error('Species upsert error:', spErr.message); process.exit(1) }
  console.log(`✓ ${upsertedSpecies?.length ?? 0} species.`)

  const speciesIdBySlug = new Map((upsertedSpecies ?? []).map((s) => [s.slug, s.id]))

  // ── species_sightings ─────────────────────────────────────────────────────
  // user_id is NOT NULL and references public.users, so a real user must exist.
  let userId = process.env['SEED_USER_ID'] ?? null

  if (!userId) {
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .order('created_at', { ascending: true })
      .limit(1)
    userId = users?.[0]?.id ?? null
  }

  if (!userId) {
    console.warn(
      '\n⚠ No rows in public.users — skipping species_sightings.\n' +
      '  Sign up once in the app, then re-run this script (or pass SEED_USER_ID).\n' +
      '  Until then the marine-life strip on site pages and the "seen at" list on\n' +
      '  /species/[slug] stay empty; /species and /operators work regardless.'
    )
    console.log('\n✅ Seed complete (without sightings).')
    return
  }

  console.log(`\nAttributing sightings to user ${userId}.`)

  // getSiteMarineLife() only looks back 30 days, so spread sightings across the
  // last four weeks rather than stamping them all with now().
  const now = Date.now()
  const DAY_MS = 24 * 60 * 60 * 1000

  const sightings: SightingInsert[] = []
  let dayOffset = 0
  for (const sp of SPECIES) {
    const speciesId = speciesIdBySlug.get(sp.slug)
    if (!speciesId) continue
    for (const siteSlug of sp.sites) {
      const siteId = siteIdBySlug.get(siteSlug)
      if (!siteId) {
        console.warn(`  ! ${sp.slug}: no site '${siteSlug}', skipping sighting`)
        continue
      }
      dayOffset = (dayOffset + 3) % 28
      sightings.push({
        species_id: speciesId,
        site_id: siteId,
        user_id: userId,
        depth_m: 8 + ((dayOffset * 7) % 32),
        sighted_at: new Date(now - dayOffset * DAY_MS).toISOString(),
      })
    }
  }

  // species_sightings has no natural key, so clear the rows this script owns
  // before re-inserting. Scoped to (user_id, species_id, site_id) triples we are
  // about to write, so a real diver's own sightings elsewhere are untouched.
  let cleared = 0
  for (const s of sightings) {
    const { count } = await supabase
      .from('species_sightings')
      .delete({ count: 'exact' })
      .eq('user_id', s.user_id)
      .eq('species_id', s.species_id)
      .eq('site_id', s.site_id)
    cleared += count ?? 0
  }
  if (cleared > 0) console.log(`  cleared ${cleared} previously seeded sightings`)

  const { error: sightErr } = await supabase.from('species_sightings').insert(sightings)
  if (sightErr) { console.error('Sightings insert error:', sightErr.message); process.exit(1) }
  console.log(`✓ ${sightings.length} sightings.`)

  console.log('\n✅ Seed complete.')
}

main()

/**
 * Seed script — populate dive_sites with 20 flagship sites + Overpass data.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   pnpm tsx scripts/seed-dive-sites.ts
 *
 * The Supabase service role key is used (via env SUPABASE_SERVICE_ROLE_KEY)
 * so RLS is bypassed and the seed can run without an authenticated user.
 * Falls back to anon key when the service role key is absent.
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../packages/db/src/types'

type SiteInsert = Database['public']['Tables']['dive_sites']['Insert']

// ─── 20 FLAGSHIP SITES ───────────────────────────────────────────────────────

const FLAGSHIP_SITES: SiteInsert[] = [
  {
    slug: 'blue-hole-dahab',
    name: 'Blue Hole',
    description: 'Iconic underwater sinkhole on the Gulf of Aqaba coast. The Arch at 55 m connects the hole to the open sea — a bucket-list technical dive.',
    insider_notes: 'Enter the arch from the outside heading inland; current pushes you through. Most fatalities happen going out — do not attempt without technical training and a guideline reel.',
    type: 'cave',
    level: 'technical',
    lat: 28.5714,
    lng: 34.5438,
    country: 'Egypt',
    region: 'Dahab · Red Sea',
    depth_min_m: 7,
    depth_max_m: 130,
    viz_score: 4.5,
    current_level: 'mild',
    avg_temp_c: 24,
    rating: 4.8,
  },
  {
    slug: 'ss-thistlegorm',
    name: 'SS Thistlegorm',
    description: 'British armed freighter sunk by German bombers in 1941, resting upright at 30 m. Holds packed with BSA motorcycles, Bedford trucks and Wellington boots.',
    insider_notes: 'Two locomotives were blown clear of the deck and sit in the sand at 33 m off the port side — most guides skip them. Current builds hard after 10:00.',
    type: 'wreck',
    level: 'intermediate',
    lat: 27.8126,
    lng: 33.9213,
    country: 'Egypt',
    region: 'Ras Muhammad · Red Sea',
    depth_min_m: 16,
    depth_max_m: 32,
    viz_score: 4.0,
    current_level: 'moderate',
    avg_temp_c: 26,
    rating: 4.9,
  },
  {
    slug: 'usat-liberty-bali',
    name: 'USAT Liberty',
    description: 'American cargo ship torpedoed in 1942, beached at Tulamben and later slid into the sea. Sits at 5–29 m, draped in coral and schooling fish.',
    insider_notes: 'Dive at dawn before the day-boats arrive. The stern section at 29 m has the best visibility and rarely any current.',
    type: 'wreck',
    level: 'beginner',
    lat: -8.2776,
    lng: 115.5973,
    country: 'Indonesia',
    region: 'Tulamben · Bali',
    depth_min_m: 5,
    depth_max_m: 29,
    viz_score: 3.5,
    current_level: 'mild',
    avg_temp_c: 28,
    rating: 4.7,
  },
  {
    slug: 'manta-point-bali',
    name: 'Manta Point',
    description: 'Cleaning station frequented by oceanic manta rays. Rays hover motionless while cleaner wrasse pick parasites — approach slowly and stay low.',
    insider_notes: 'Best from July–September when SW monsoon brings plankton bloom. Timed correctly you can share the station with 8–10 mantas.',
    type: 'reef',
    level: 'intermediate',
    lat: -8.7583,
    lng: 115.4278,
    country: 'Indonesia',
    region: 'Nusa Penida · Bali',
    depth_min_m: 10,
    depth_max_m: 30,
    viz_score: 3.0,
    current_level: 'strong',
    avg_temp_c: 26,
    rating: 4.8,
  },
  {
    slug: 'devils-grotto-cayman',
    name: "Devil's Grotto",
    description: 'Shallow cave system on the west side of Grand Cayman, filled with tarpon and silversides. Excellent snorkelling through to 15 m.',
    insider_notes: 'Link through to Eden Rock and spend the second half of the dive there — combined it\'s the best two-site dive on the island.',
    type: 'cave',
    level: 'beginner',
    lat: 19.3098,
    lng: -81.3975,
    country: 'Cayman Islands',
    region: 'George Town · Grand Cayman',
    depth_min_m: 3,
    depth_max_m: 15,
    viz_score: 4.5,
    current_level: 'none',
    avg_temp_c: 27,
    rating: 4.6,
  },
  {
    slug: 'silfra-fissure',
    name: 'Silfra Fissure',
    description: 'The crack between the North American and Eurasian tectonic plates, filled with glacial meltwater filtered through lava for 50+ years. Visibility exceeds 100 m.',
    insider_notes: 'Water is 2–4 °C year-round — dry suit and thick undersuit mandatory. The "Big Crack" narrows to shoulder-width; exhale before squeezing through.',
    type: 'fissure',
    level: 'advanced',
    lat: 64.2559,
    lng: -21.1144,
    country: 'Iceland',
    region: 'Þingvellir National Park',
    depth_min_m: 7,
    depth_max_m: 63,
    viz_score: 5.0,
    current_level: 'mild',
    avg_temp_c: 3,
    rating: 4.9,
  },
  {
    slug: 'jellyfish-lake-palau',
    name: 'Jellyfish Lake',
    description: 'Marine lake on Eil Malk island, home to millions of golden jellyfish that have lost their sting through evolution. Surreal snorkelling experience.',
    insider_notes: 'Scuba diving is banned; snorkel only. Go in the morning when jellyfish migrate east chasing sunlight — afternoon they retreat to depth.',
    type: 'cave',
    level: 'beginner',
    lat: 7.1597,
    lng: 134.3763,
    country: 'Palau',
    region: 'Eil Malk',
    depth_min_m: 0,
    depth_max_m: 10,
    viz_score: 4.0,
    current_level: 'none',
    avg_temp_c: 29,
    rating: 4.7,
  },
  {
    slug: 'blue-corner-palau',
    name: 'Blue Corner',
    description: 'World-class drift dive over a coral plateau dropped into the blue. Grey reef and whitetip sharks circle constantly; visibility 30+ m.',
    insider_notes: 'Hook into the reef when current rips and let the sharks come to you. Unhook before surfacing — ascent can be fast in the up-current on the north side.',
    type: 'wall',
    level: 'advanced',
    lat: 7.1485,
    lng: 134.2344,
    country: 'Palau',
    region: 'Ngemelis',
    depth_min_m: 6,
    depth_max_m: 28,
    viz_score: 4.5,
    current_level: 'strong',
    avg_temp_c: 28,
    rating: 4.9,
  },
  {
    slug: 'ras-mohammed',
    name: 'Ras Mohammed',
    description: 'The tip of the Sinai Peninsula — two walls (Shark Reef and Jolanda) connected by a saddle at 25 m, with one of the densest fish populations in the Red Sea.',
    insider_notes: 'Jolanda holds the remains of a cargo ship that slid off the reef; you can still find toilets and tiles scattered at 35–40 m.',
    type: 'wall',
    level: 'advanced',
    lat: 27.7325,
    lng: 34.2487,
    country: 'Egypt',
    region: 'Ras Muhammad National Park',
    depth_min_m: 6,
    depth_max_m: 40,
    viz_score: 4.5,
    current_level: 'moderate',
    avg_temp_c: 25,
    rating: 4.8,
  },
  {
    slug: 'the-arch-malta',
    name: 'The Arch',
    description: 'Dramatic limestone archway on Gozo\'s Azure Window site, now underwater. The arch sits at 30 m; the collapsed column creates a swimthrough at 25 m.',
    insider_notes: 'After the 2017 collapse the rubble field is unstable — stay 2 m clear of the debris pile. Best vis in calm NW swell; poor in NE weather.',
    type: 'cave',
    level: 'advanced',
    lat: 36.0585,
    lng: 14.1895,
    country: 'Malta',
    region: 'Dwejra · Gozo',
    depth_min_m: 20,
    depth_max_m: 30,
    viz_score: 4.0,
    current_level: 'mild',
    avg_temp_c: 22,
    rating: 4.5,
  },
  {
    slug: 'blue-hole-malta',
    name: 'Blue Hole (Malta)',
    description: 'Natural limestone chimney descending from the surface to 55 m where it opens to the Mediterranean wall. Overhanging ceiling covered in orange cup coral.',
    insider_notes: 'Exit the hole at 8 m and swim across the top to the Azure Window site for a back-gas decompression dive — one of the best tech dives in the Med.',
    type: 'cave',
    level: 'technical',
    lat: 36.0596,
    lng: 14.1892,
    country: 'Malta',
    region: 'Dwejra · Gozo',
    depth_min_m: 0,
    depth_max_m: 55,
    viz_score: 4.5,
    current_level: 'none',
    avg_temp_c: 22,
    rating: 4.7,
  },
  {
    slug: 'barracuda-lake-philippines',
    name: 'Barracuda Lake',
    description: 'Landlocked lake on Coron island with thermoclines of different salinities creating lens effects. Huge chevron barracuda are resident.',
    insider_notes: 'Water temperature jumps from 28 °C to 38 °C inside the thermocline — do not exceed 28 m or you will be cooking. Limestone scramble entry requires booties.',
    type: 'cave',
    level: 'advanced',
    lat: 11.9903,
    lng: 120.0547,
    country: 'Philippines',
    region: 'Coron · Palawan',
    depth_min_m: 0,
    depth_max_m: 28,
    viz_score: 4.0,
    current_level: 'none',
    avg_temp_c: 32,
    rating: 4.6,
  },
  {
    slug: 'tubbataha-reef',
    name: 'Tubbataha Reef',
    description: 'UNESCO World Heritage coral atoll in the Sulu Sea — two remote atolls accessible only by liveaboard March–June. Hammerhead schools, whale sharks, dogtooth tuna.',
    insider_notes: 'Book liveaboard 12+ months in advance. Bring a reef hook — the north atoll wall runs constant 1–2 knot current. Budget 3 nights minimum.',
    type: 'reef',
    level: 'advanced',
    lat: 8.9833,
    lng: 119.9167,
    country: 'Philippines',
    region: 'Sulu Sea',
    depth_min_m: 5,
    depth_max_m: 40,
    viz_score: 5.0,
    current_level: 'strong',
    avg_temp_c: 29,
    rating: 4.9,
  },
  {
    slug: 'ningaloo-reef',
    name: 'Ningaloo Reef',
    description: 'World\'s largest fringing reef, accessible by swimming from the beach. Whale shark aggregations March–July make this a bucket-list encounter.',
    insider_notes: 'Whale shark tours are strictly managed — max 10 swimmers per animal. Snorkel with fins only (no scuba near sharks). Book via licensed operators only.',
    type: 'reef',
    level: 'beginner',
    lat: -22.6901,
    lng: 113.7744,
    country: 'Australia',
    region: 'Coral Bay · Western Australia',
    depth_min_m: 3,
    depth_max_m: 25,
    viz_score: 4.0,
    current_level: 'mild',
    avg_temp_c: 23,
    rating: 4.7,
  },
  {
    slug: 'poor-knights-islands',
    name: 'Poor Knights Islands',
    description: 'Jacques Cousteau\'s top-10 dive site — volcanic arches and tunnels in gin-clear subtropical water meeting temperate NZ species. Giant schools of blue maomao.',
    insider_notes: 'Rikoriko cave is the world\'s largest sea cave accessible by boat — dive it at slack water only. The Northern Arch swimthrough requires a torch at the back.',
    type: 'cave',
    level: 'intermediate',
    lat: -35.4833,
    lng: 174.7333,
    country: 'New Zealand',
    region: 'Northland',
    depth_min_m: 5,
    depth_max_m: 45,
    viz_score: 4.5,
    current_level: 'moderate',
    avg_temp_c: 18,
    rating: 4.8,
  },
  {
    slug: 'poor-knights-wall',
    name: 'Poor Knights Wall',
    description: 'The sheer western wall drops from the surface to beyond 70 m, encrusted in sponges and black coral. Resident yellowtail kingfish and snapper.',
    insider_notes: 'Current runs north–south along the wall — plan to drift it, not fight it. Deep divers find the wall cleaner below 50 m where surge can\'t sand it.',
    type: 'wall',
    level: 'technical',
    lat: -35.4712,
    lng: 174.7251,
    country: 'New Zealand',
    region: 'Northland',
    depth_min_m: 3,
    depth_max_m: 70,
    viz_score: 4.5,
    current_level: 'strong',
    avg_temp_c: 17,
    rating: 4.7,
  },
  {
    slug: 'richelieu-rock-thailand',
    name: 'Richelieu Rock',
    description: 'Horseshoe-shaped seamount in the Mergui Archipelago — Thailand\'s undisputed best dive site. Whale sharks, mantas and schools of barracuda year-round.',
    insider_notes: 'The rock is exposed; even small swell can make entry from a longtail dangerous. The NE pinnacle at 30 m is where mantas clean — get there before 8 am.',
    type: 'pinnacle',
    level: 'advanced',
    lat: 9.4047,
    lng: 98.1117,
    country: 'Thailand',
    region: 'Surin Islands · Phang Nga',
    depth_min_m: 5,
    depth_max_m: 35,
    viz_score: 3.5,
    current_level: 'moderate',
    avg_temp_c: 29,
    rating: 4.9,
  },
  {
    slug: 'koh-bon-thailand',
    name: 'Koh Bon Ridge',
    description: 'Submerged ridge running east–west, swept by current that attracts manta rays and schooling fish. Frequent whale shark sightings November–April.',
    insider_notes: 'Drop at the western tip and drift east along the ridge. Mantas feed mid-water above the ridge at 20–25 m — fin shallower than the reef to get the angles right.',
    type: 'pinnacle',
    level: 'intermediate',
    lat: 9.0472,
    lng: 97.7739,
    country: 'Thailand',
    region: 'Phang Nga · Andaman Sea',
    depth_min_m: 8,
    depth_max_m: 25,
    viz_score: 3.5,
    current_level: 'moderate',
    avg_temp_c: 29,
    rating: 4.6,
  },
  {
    slug: 'zenobia-wreck-cyprus',
    name: 'Zenobia Wreck',
    description: 'Swedish roll-on roll-off ferry that sank in 1980 on her maiden voyage, lying on her side at 18–42 m. Lorries still chained to the car decks. Europe\'s best wreck dive.',
    insider_notes: 'Three dives needed to cover the whole wreck. Start deep (cargo deck at 42 m) first dive, work shallower on dives two and three. Night dive reveals huge lobsters.',
    type: 'wreck',
    level: 'advanced',
    lat: 34.9212,
    lng: 33.6401,
    country: 'Cyprus',
    region: 'Larnaca',
    depth_min_m: 18,
    depth_max_m: 42,
    viz_score: 4.0,
    current_level: 'none',
    avg_temp_c: 24,
    rating: 4.9,
  },
  {
    slug: 'cirkewwa-malta',
    name: 'Cirkewwa Arch',
    description: 'Malta\'s most dived site — a shallow archway at 12 m with resident moray eels, octopus and a steel ramp leading to the anchor of the MV Rozi wreck.',
    insider_notes: 'The Rozi wreck sits at 36 m to the north of the arch — great for a second dive after the arch. Car park entry, no boat needed.',
    type: 'cave',
    level: 'beginner',
    lat: 35.9897,
    lng: 14.3363,
    country: 'Malta',
    region: 'Marfa Peninsula',
    depth_min_m: 3,
    depth_max_m: 12,
    viz_score: 3.5,
    current_level: 'none',
    avg_temp_c: 21,
    rating: 4.4,
  },
]

// ─── OVERPASS FETCH ──────────────────────────────────────────────────────────

// How many OSM sites to import (post-filter). Override: OSM_LIMIT=2000 pnpm seed
const OSM_LIMIT = Math.max(0, parseInt(process.env['OSM_LIMIT'] ?? '1000', 10) || 0)
// OSM usage policy requires an identifying UA; without it Overpass answers 406.
const OSM_USER_AGENT = 'DiveMap-seed/1.0 (github.com/AndresProskurin/divemap)'
// Public Overpass instances 504/429 under load; try each in order.
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
]

interface OverpassElement {
  id: number
  lat?: number
  lon?: number
  type: string
  tags?: Record<string, string>
  center?: { lat: number; lon: number }
}

async function fetchOverpassSites(): Promise<SiteInsert[]> {
  // nwr covers nodes, ways and relations (reef polygons resolve via `center`).
  // Only `sport=scuba_diving` — that is the documented OSM tag for dive sites.
  // The previous query also matched `sport=diving`, which in OSM is *platform
  // diving* (springboards, "Sprunghalle"), and `leisure=scuba_diving`, which
  // is not a real tag at all. Named elements only: an unnamed "Dive Site
  // 4711238" row is noise in search and on cards.
  // Nodes only, unsorted (`qt`): a global nwr query with `out center` makes
  // the public instances compute polygon centres for the whole planet and they
  // shed the load with 504s. Nodes are 4.1k of the 4.7k matches anyway.
  const query = `
    [out:json][timeout:150];
    node["sport"="scuba_diving"]["name"];
    out qt ${OSM_LIMIT * 3};
  `

  console.log('Fetching dive sites from Overpass API…')
  try {
    let json: { elements: OverpassElement[] } | null = null
    let lastErr = ''
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          body: `data=${encodeURIComponent(query)}`,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            // Overpass answers 406 to requests without an identifying
            // User-Agent (OSM usage policy). Node fetch sends none — this
            // header IS the fix for the original "Fetched 0 sites" failure.
            'User-Agent': OSM_USER_AGENT,
          },
          signal: AbortSignal.timeout(170_000),
        })
        if (!res.ok) {
          lastErr = `HTTP ${res.status}`
          console.warn(`  ${endpoint} → ${lastErr}, trying next mirror…`)
          continue
        }
        json = (await res.json()) as { elements: OverpassElement[] }
        break
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e)
        console.warn(`  ${endpoint} → ${lastErr}, trying next mirror…`)
      }
    }
    if (!json) throw new Error(`all Overpass mirrors failed (last: ${lastErr})`)
    console.log(`  ${json.elements.length} raw elements`)

    const slugsSeen = new Set(FLAGSHIP_SITES.map((s) => s.slug))
    const out: SiteInsert[] = []

    for (const el of json.elements) {
      if (out.length >= OSM_LIMIT) break
      const lat = el.lat ?? el.center?.lat
      const lon = el.lon ?? el.center?.lon
      if (!lat || !lon) continue

      const tags = el.tags ?? {}
      // `sport=scuba_diving` also marks dive shops, schools and pool centres.
      // Drop anything that self-identifies as a business or building — what
      // remains is overwhelmingly actual in-water sites.
      if (tags['shop'] || tags['office'] || tags['building']) continue
      if (tags['amenity'] === 'dive_centre') continue
      if (tags['leisure'] === 'sports_centre' || tags['leisure'] === 'swimming_pool' || tags['leisure'] === 'fitness_centre') continue

      const name = tags['name:en'] ?? tags['name']
      if (!name) continue

      const slug =
        name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + `-osm-${el.id}`
      if (slugsSeen.has(slug)) continue
      slugsSeen.add(slug)

      out.push({
        slug,
        name,
        type: classifySite(name, tags),
        lat,
        lng: lon,
        country: tags['addr:country'] ?? 'Unknown', // enriched below via Mapbox
        region: tags['addr:city'] ?? tags['addr:state'] ?? undefined,
        depth_min_m: 0,
        depth_max_m: parseDepth(tags['maxdepth'] ?? tags['depth']),
        description: tags['description'] ?? undefined,
      })
    }

    return out
  } catch (err) {
    console.warn('Overpass fetch failed, skipping:', err instanceof Error ? err.message : err)
    return []
  }
}

/** Cheap classification from tags + name; defaults to reef. */
function classifySite(name: string, tags: Record<string, string>): SiteInsert['type'] {
  const n = name.toLowerCase()
  if (tags['historic'] === 'wreck' || /wreck|wrak|épave|ss |uss |hms /.test(n)) return 'wreck'
  if (tags['natural'] === 'cave_entrance' || /\bcave|grotto|grotte|höhle/.test(n)) return 'cave'
  if (/cenote/.test(n)) return 'cenote'
  if (/\bwall|drop.?off/.test(n)) return 'wall'
  if (/pinnacle|seamount|sea mount/.test(n)) return 'pinnacle'
  if (/kelp/.test(n)) return 'kelp'
  if (/drift/.test(n)) return 'drift'
  return 'reef'
}

/** OSM depth tags arrive as "40", "40 m", "130ft" or garbage. */
function parseDepth(raw: string | undefined): number {
  if (!raw) return 20
  const v = parseFloat(raw)
  if (!Number.isFinite(v) || v <= 0) return 20
  const metres = /ft|feet|'/.test(raw) ? v * 0.3048 : v
  return Math.min(300, Math.round(metres * 10) / 10)
}

// ─── COUNTRY ENRICHMENT (Mapbox reverse geocoding) ───────────────────────────
// addr:country is almost never set on dive sites, and `country` is NOT NULL in
// the schema. One reverse-geocode per 1° grid cell keeps the request count far
// below the site count — sites cluster heavily.

async function enrichCountries(sites: SiteInsert[]): Promise<void> {
  const token = process.env['NEXT_PUBLIC_MAPBOX_TOKEN']
  if (!token) {
    console.warn('No NEXT_PUBLIC_MAPBOX_TOKEN — leaving countries as "Unknown".')
    return
  }

  const cellCache = new Map<string, string>()
  const need = sites.filter((s) => s.country === 'Unknown')
  console.log(`Resolving countries for ${need.length} sites…`)

  let resolved = 0
  for (const site of need) {
    const cell = `${Math.floor(site.lat)},${Math.floor(site.lng)}`
    let country = cellCache.get(cell)
    if (country === undefined) {
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${site.lng},${site.lat}.json` +
            `?types=country&language=en&access_token=${token}`,
          { signal: AbortSignal.timeout(10_000) },
        )
        if (res.ok) {
          const geo = (await res.json()) as { features: Array<{ text_en?: string; text?: string }> }
          country = geo.features[0]?.text_en ?? geo.features[0]?.text ?? ''
        } else {
          country = ''
        }
      } catch {
        country = ''
      }
      cellCache.set(cell, country)
      // ~8 req/s — well under Mapbox limits, polite for a seed script.
      await new Promise((r) => setTimeout(r, 120))
    }
    if (country) {
      site.country = country
      resolved++
    }
  }
  console.log(`  ✓ ${resolved} resolved via ${cellCache.size} geocoding calls (open sea stays "Unknown")`)
}

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

  // Seed flagship sites first.
  console.log(`Upserting ${FLAGSHIP_SITES.length} flagship sites…`)
  const { error: flagErr } = await supabase
    .from('dive_sites')
    .upsert(FLAGSHIP_SITES, { onConflict: 'slug', ignoreDuplicates: false })

  if (flagErr) { console.error('Flagship upsert error:', flagErr.message); process.exit(1) }
  console.log('✓ Flagship sites done.')

  // Fetch and seed Overpass sites.
  const overpassSites = await fetchOverpassSites()
  console.log(`Fetched ${overpassSites.length} sites from Overpass.`)

  await enrichCountries(overpassSites)

  if (overpassSites.length > 0) {
    // Batch in groups of 100.
    const BATCH = 100
    for (let i = 0; i < overpassSites.length; i += BATCH) {
      const batch = overpassSites.slice(i, i + BATCH)
      const { error } = await supabase
        .from('dive_sites')
        .upsert(batch, { onConflict: 'slug', ignoreDuplicates: true })
      if (error) console.warn(`Batch ${i}–${i + BATCH} error:`, error.message)
      else console.log(`  ✓ batch ${i}–${Math.min(i + BATCH, overpassSites.length)}`)
    }
  }

  console.log('\n✅ Seed complete.')
}

main()

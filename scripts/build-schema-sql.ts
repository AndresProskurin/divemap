/**
 * Regenerate packages/db/src/schema.sql from supabase/migrations/.
 *
 * Usage:
 *   pnpm db:schema
 *
 * schema.sql exists as a single readable view of the database for people (and
 * tools) that want the whole shape without opening five migration files. It is
 * a derived artifact: `supabase/migrations/` stays the source of truth, and
 * this script is the only thing that writes schema.sql.
 *
 * It previously drifted badly — by 2026-07-21 it was missing the dive_reviews
 * table entirely, the storage bucket and its policies, and six indexes — because
 * it was hand-maintained alongside the migrations and nothing kept the two in
 * step. Hence the generator: run it after adding a migration and the copy cannot
 * silently rot.
 *
 * Note this concatenates migrations rather than dumping the live database, so
 * it reflects what the migrations declare, not what a drifted environment
 * actually contains. To capture a live database instead, use
 * `supabase db dump --schema public -f packages/db/src/schema.sql`, which needs
 * database credentials this script deliberately does not require.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(here, '..')
const migrationsDir = join(repoRoot, 'supabase', 'migrations')
const outFile = join(repoRoot, 'packages', 'db', 'src', 'schema.sql')

const migrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort() // timestamp-prefixed, so lexical order is apply order

if (migrations.length === 0) {
  console.error(`No migrations found in ${migrationsDir}`)
  process.exit(1)
}

const rule = '─'.repeat(76)

const header = `-- ${rule}
-- DiveMap — full database schema.
--
-- GENERATED FILE — DO NOT EDIT BY HAND.
-- Source of truth: supabase/migrations/
-- Regenerate:     pnpm db:schema
--
-- Concatenation of every migration in apply order:
${migrations.map((m) => `--   ${m}`).join('\n')}
-- ${rule}

`

const body = migrations
  .map((name) => {
    const sql = readFileSync(join(migrationsDir, name), 'utf8').trimEnd()
    return `-- ${rule}\n-- ${name}\n-- ${rule}\n\n${sql}\n`
  })
  .join('\n')

writeFileSync(outFile, header + body, 'utf8')

const lines = (header + body).split('\n').length
console.log(`✓ ${outFile}`)
console.log(`  ${migrations.length} migrations, ${lines} lines`)
for (const m of migrations) console.log(`    ${m}`)

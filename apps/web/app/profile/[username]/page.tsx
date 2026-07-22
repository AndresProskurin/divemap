import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import type { Database, Certification } from '@divemap/db'
import { getUserByUsername, getUserPublicDives, getUserPhotos } from '@divemap/db'

export const dynamic = 'force-dynamic'

interface Props {
  params: { username: string }
}

function makeSupabase() {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  if (!url || !key) return null
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => {
        try {
          return (cookies() as unknown as { getAll(): Array<{ name: string; value: string }> }).getAll()
        } catch {
          return []
        }
      },
      setAll: () => {},
    },
  })
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = makeSupabase()
  if (!supabase) return { title: 'Diver — DiveMap' }
  const user = await getUserByUsername(params.username, supabase)
  if (!user) return { title: 'Diver — DiveMap' }
  const name = user.display_name ?? user.username
  return {
    title: `${name} — DiveMap`,
    description: user.bio ?? `${name}'s public dive profile on DiveMap.`,
  }
}

function gasName(o2: number | null, he: number | null): string {
  if (!o2) return 'Air'
  const heVal = he ?? 0
  if (heVal > 0) return `TMX ${o2}/${heVal}`
  if (o2 > 21) return `EAN${o2}`
  return 'Air'
}

function depthColor(m: number): string {
  if (m < 20) return '#33d6c3'
  if (m < 40) return '#ffb703'
  if (m < 60) return '#ef476f'
  return '#0077b6'
}

function StatCell({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div style={{ flex: 1, padding: '13px 8px', display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
        <span className="font-mono font-bold" style={{ fontSize: '20px', color: 'var(--tx)', lineHeight: 1 }}>{value}</span>
        {unit && <span className="font-mono" style={{ fontSize: '10px', color: 'var(--tx3)' }}>{unit}</span>}
      </div>
      <span className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>{label}</span>
    </div>
  )
}

export default async function PublicProfilePage({ params }: Props) {
  const supabase = makeSupabase()
  if (!supabase) notFound()

  const user = await getUserByUsername(params.username, supabase)
  if (!user) notFound()

  // Everything below RLS-filters to publicly readable rows: dives require
  // is_public, photos are world-readable by policy.
  const [dives, photos] = await Promise.all([
    getUserPublicDives(user.id, supabase, 20),
    getUserPhotos(user.id, supabase, 24),
  ])

  const displayName = user.display_name ?? user.username ?? 'Diver'
  const certs = (user.certifications as unknown as Certification[] | null) ?? []

  const maxDepth = dives.reduce((m, d) => Math.max(m, d.max_depth_m), 0)
  const totalMinutes = dives.reduce((s, d) => s + d.bottom_time_min, 0)
  const countries = new Set(dives.map((d) => d.site?.country).filter(Boolean)).size

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingTop: '64px', paddingBottom: '48px' }}>
      {/* ── Header ── */}
      <div style={{ padding: '8px 16px 0', display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div
          style={{
            width: '64px', height: '64px', flexShrink: 0, borderRadius: '50%',
            background: 'linear-gradient(160deg, #0077b6 0%, #023e8a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
          }}
        >
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span className="font-bold" style={{ fontSize: '22px', color: '#caf0f8' }}>
              {displayName[0]?.toUpperCase() ?? '?'}
            </span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span className="font-extrabold" style={{ fontSize: '19px', color: 'var(--tx)' }}>{displayName}</span>
          <span className="font-mono font-semibold" style={{ fontSize: '10.5px', color: 'var(--acc)', letterSpacing: '0.04em' }}>
            @{user.username}
          </span>
          {user.home_country && (
            <span className="font-medium" style={{ fontSize: '11.5px', color: 'var(--tx3)' }}>{user.home_country}</span>
          )}
        </div>
      </div>

      {user.bio && (
        <p style={{ margin: '12px 16px 0', fontSize: '13px', color: 'var(--tx2)', lineHeight: 1.6 }}>{user.bio}</p>
      )}

      {/* ── Certification badges ── */}
      {certs.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', padding: '12px 16px 0' }}>
          {certs.map((c, i) => (
            <span
              key={i}
              className="font-mono font-bold"
              style={{
                fontSize: '8.5px', color: 'var(--acc)', border: '1px solid var(--acc)',
                borderRadius: '5px', padding: '3px 6px', letterSpacing: '0.08em',
              }}
            >
              {c.abbr ?? c.name}
            </span>
          ))}
        </div>
      )}

      {/* ── Public stats ── */}
      <div
        style={{
          margin: '14px 16px 0', display: 'flex',
          background: 'var(--card)', border: '1px solid var(--line)',
          borderRadius: '16px', overflow: 'hidden',
        }}
      >
        <StatCell value={String(dives.length)} label="PUBLIC DIVES" />
        <div style={{ width: '1px', background: 'var(--line)' }} />
        <StatCell value={String(maxDepth)} unit="m" label="MAX DEPTH" />
        <div style={{ width: '1px', background: 'var(--line)' }} />
        <StatCell value={(totalMinutes / 60).toFixed(totalMinutes >= 600 ? 0 : 1)} unit="h" label="UNDERWATER" />
        <div style={{ width: '1px', background: 'var(--line)' }} />
        <StatCell value={String(countries)} label="COUNTRIES" />
      </div>

      {/* ── Recent public dives ── */}
      <div style={{ padding: '18px 16px 0', display: 'flex', flexDirection: 'column', gap: '9px' }}>
        <span className="font-mono font-semibold" style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>
          RECENT DIVES
        </span>
        {dives.length === 0 ? (
          <p style={{ fontSize: '12.5px', color: 'var(--tx3)', fontStyle: 'italic' }}>
            No public dives yet.
          </p>
        ) : (
          dives.map((dive) => {
            const dColor = depthColor(dive.max_depth_m)
            const date = new Date(dive.dived_at)
            const card = (
              <div
                style={{
                  background: 'var(--card)', border: '1px solid var(--line)',
                  borderRadius: '14px', padding: '11px 13px',
                  display: 'flex', alignItems: 'center', gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '42px', height: '42px', borderRadius: '11px', flexShrink: 0,
                    background: `${dColor}16`, border: `1px solid ${dColor}45`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <span className="font-mono font-bold" style={{ fontSize: '12.5px', color: dColor, lineHeight: 1.1 }}>
                    {dive.max_depth_m}
                  </span>
                  <span className="font-mono" style={{ fontSize: '7px', color: dColor, opacity: 0.75 }}>M</span>
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                    <span className="font-bold truncate" style={{ fontSize: '13px', color: 'var(--tx)' }}>
                      {dive.site?.name ?? 'Unknown site'}
                    </span>
                    <span className="font-mono flex-shrink-0" style={{ fontSize: '9.5px', color: 'var(--tx3)' }}>
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <span className="font-mono font-semibold" style={{ fontSize: '10.5px', color: 'var(--tx2)' }}>
                    {dive.bottom_time_min} min · <span style={{ color: 'var(--acc)' }}>{gasName(dive.gas_o2, dive.gas_he)}</span>
                  </span>
                </div>
              </div>
            )
            return dive.site ? (
              <Link key={dive.id} href={`/sites/${dive.site.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
                {card}
              </Link>
            ) : (
              <div key={dive.id}>{card}</div>
            )
          })
        )}
      </div>

      {/* ── Photos grid ── */}
      {photos.length > 0 && (
        <div style={{ padding: '18px 16px 0', display: 'flex', flexDirection: 'column', gap: '9px' }}>
          <span className="font-mono font-semibold" style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>
            PHOTOS
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {photos.map((ph) => {
              const img = (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ph.url}
                  alt={ph.caption ?? 'Dive photo'}
                  loading="lazy"
                  style={{ width: '100%', height: '108px', objectFit: 'cover', borderRadius: '12px', display: 'block' }}
                />
              )
              return ph.site ? (
                <Link key={ph.id} href={`/sites/${ph.site.slug}`}>{img}</Link>
              ) : (
                <div key={ph.id}>{img}</div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

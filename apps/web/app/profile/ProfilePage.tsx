'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User, Certification, DiveWithSite, WishlistSite, DivePlanWithSite } from '@divemap/db'
import { createClient, deletePlan, useSignIn } from '@divemap/db'

type ProfileTab = 'Logbook' | 'Dive Plans' | 'Certifications' | 'Wishlist'

// ── Helpers ───────────────────────────────────────────────────────────────────

function gasLabel(o2: number | null, he: number | null): string {
  // gas_o2/gas_he are stored as fractions 0-1 (deco-engine GasMix convention).
  if (o2 === null) return '—'
  const pO2 = Math.round(o2 * 100)
  const pHe = Math.round((he ?? 0) * 100)
  if (pHe > 0) return `TX ${pO2}/${pHe}`
  if (pO2 === 21) return 'Air'
  return `EAN${pO2}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
}

function depthRange(minM: number | null, maxM: number | null): string {
  if (maxM == null) return '—'
  if (minM == null || minM === 0) return `${maxM} m`
  return `${minM}–${maxM} m`
}

function computeStats(dives: DiveWithSite[]) {
  if (dives.length === 0) return { maxDepth: null, totalHours: 0, countries: 0 }
  const maxDepth = Math.max(...dives.map(d => d.max_depth_m))
  const totalMin = dives.reduce((s, d) => s + d.bottom_time_min, 0)
  const countries = new Set(dives.map(d => d.site?.country).filter(Boolean)).size
  return { maxDepth, totalHours: Math.round(totalMin / 60), countries }
}

// ── Top stat cell ─────────────────────────────────────────────────────────────

function StatCell({ value, label, border }: { value: string; label: string; border?: boolean }) {
  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
        borderLeft: border ? '1px solid var(--line)' : undefined,
      }}
    >
      <div className="font-mono font-bold" style={{ fontSize: '18px', color: 'var(--tx)' }}>{value}</div>
      <div className="font-mono font-semibold" style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.08em' }}>{label}</div>
    </div>
  )
}

// ── Logbook card ──────────────────────────────────────────────────────────────

function LogCard({ dive, badge }: { dive: DiveWithSite; badge?: string }) {
  return (
    <Link
      href={`/dives/${dive.id}`}
      style={{ textDecoration: 'none', display: 'flex', gap: '11px', alignItems: 'center', border: '1px solid var(--line)', background: 'var(--card)', borderRadius: '14px', padding: '10px' }}
    >
      {/* Photo placeholder — gradient based on depth */}
      <div
        style={{
          width: '56px', height: '56px', flexShrink: 0, borderRadius: '10px',
          background: 'linear-gradient(160deg, #023e8a 0%, #0096c7 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span className="font-mono font-bold" style={{ fontSize: '11px', color: '#caf0f8' }}>
          {dive.max_depth_m}m
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <div className="font-bold truncate" style={{ fontSize: '13.5px', color: 'var(--tx)' }}>
              {dive.site?.name ?? 'Unknown site'}
            </div>
            {badge && (
              <div
                className="font-mono font-bold flex-shrink-0"
                style={{ fontSize: '7.5px', color: 'var(--warn)', border: '1px solid var(--warn)', borderRadius: '4px', padding: '2px 5px', letterSpacing: '0.08em' }}
              >
                {badge}
              </div>
            )}
          </div>
          <div className="font-mono flex-shrink-0" style={{ fontSize: '10px', color: 'var(--tx3)', marginLeft: '8px' }}>
            {formatDate(dive.dived_at)}
          </div>
        </div>
        <div className="font-medium truncate" style={{ fontSize: '10.5px', color: 'var(--tx3)' }}>
          {dive.site?.country ?? ''}
          {dive.buddy ? ` · w/ ${dive.buddy}` : ''}
        </div>
        <div className="font-mono font-semibold" style={{ fontSize: '11px', color: 'var(--tx2)' }}>
          {dive.max_depth_m} m · {dive.bottom_time_min} min ·{' '}
          <span style={{ color: 'var(--acc)' }}>{gasLabel(dive.gas_o2, dive.gas_he)}</span>
        </div>
      </div>
    </Link>
  )
}

// ── Cert card ─────────────────────────────────────────────────────────────────

function CertCard({ cert }: { cert: Certification }) {
  return (
    <div
      style={{
        display: 'flex', gap: '12px', alignItems: 'center',
        border: '1px solid var(--line)', background: 'var(--card)',
        borderRadius: '14px', padding: '12px',
      }}
    >
      <div
        style={{
          width: '46px', height: '46px', flexShrink: 0, borderRadius: '11px',
          background: 'linear-gradient(160deg, #023e8a, #0077b6)',
          border: '1px solid rgba(0,180,216,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <span className="font-mono font-bold" style={{ fontSize: '12px', color: '#caf0f8' }}>{cert.abbr}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div className="font-bold" style={{ fontSize: '13.5px', color: 'var(--tx)' }}>{cert.name}</div>
        <div className="font-medium" style={{ fontSize: '10.5px', color: 'var(--tx3)' }}>
          {cert.org} · {cert.year}
        </div>
      </div>
      <div className="font-mono font-semibold flex-shrink-0" style={{ fontSize: '8.5px', color: 'var(--ok)', letterSpacing: '0.1em' }}>
        VERIFIED ✓
      </div>
    </div>
  )
}

// ── Wishlist card ─────────────────────────────────────────────────────────────

function WishCard({ item }: { item: WishlistSite }) {
  const { site } = item
  return (
    <Link
      href={`/sites/${site.slug}`}
      style={{
        display: 'flex', gap: '11px', alignItems: 'center',
        border: '1px solid var(--line)', background: 'var(--card)',
        borderRadius: '14px', padding: '10px', textDecoration: 'none',
      }}
    >
      <div
        style={{
          width: '48px', height: '48px', flexShrink: 0, borderRadius: '10px',
          background: 'linear-gradient(160deg, #0077b6 0%, #023e8a 100%)',
        }}
      />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div className="font-bold truncate" style={{ fontSize: '13px', color: 'var(--tx)' }}>{site.name}</div>
        <div className="font-medium" style={{ fontSize: '10.5px', color: 'var(--tx3)' }}>
          {[site.country].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div className="font-mono font-semibold flex-shrink-0" style={{ fontSize: '11px', color: 'var(--tx2)', marginRight: '6px' }}>
        {depthRange(site.depth_min_m, site.depth_max_m)}
      </div>
      <svg width="14" height="17" viewBox="0 0 14 17" style={{ flexShrink: 0 }}>
        <path d="M2 2h10v13l-5-3.4L2 15V2z" fill="var(--acc)" />
      </svg>
    </Link>
  )
}



// ── Depth spark chart (design screen 05) ─────────────────────────────────────
// Last 24 dives by max depth, oldest → newest. Deep dives (40 m+) get the full
// accent; the rest sit at 28% so personal bests pop.

function DepthSparkChart({ dives }: { dives: DiveWithSite[] }) {
  if (dives.length < 3) return null

  const recent = dives.slice(0, 24).reverse()
  const maxD = Math.max(...recent.map((d) => d.max_depth_m), 1)
  const year = new Date().getFullYear()
  const yearDives = dives.filter((d) => new Date(d.dived_at).getFullYear() === year)
  const yearHours = Math.round(yearDives.reduce((s, d) => s + d.bottom_time_min, 0) / 60)
  const pb = yearDives.reduce((m, d) => Math.max(m, d.max_depth_m), 0)

  const first = recent[0]
  const last = recent[recent.length - 1]
  const monthLabel = (d: DiveWithSite) =>
    new Date(d.dived_at).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()

  return (
    <div
      style={{
        background: 'var(--card)', border: '1px solid var(--line)',
        borderRadius: '16px', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="font-mono font-semibold" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>
          {year} · LAST {recent.length} DIVES BY DEPTH
        </span>
        <span className="font-mono font-semibold" style={{ fontSize: '10px', color: 'var(--acc)' }}>
          {yearDives.length} DIVES · {yearHours} H{pb > 0 ? ` · PB ${pb}m` : ''}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '52px' }}>
        {recent.map((d) => (
          <div
            key={d.id}
            title={`${d.max_depth_m} m`}
            style={{
              flex: 1,
              height: `${Math.max(6, Math.round((d.max_depth_m / maxD) * 100))}%`,
              background: d.max_depth_m >= 40 ? 'var(--acc)' : 'rgba(0,180,216,0.28)',
              borderRadius: '2px 2px 0 0',
            }}
          />
        ))}
      </div>
      {first && last && (
        <div className="font-mono" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--tx3)' }}>
          <span>{monthLabel(first)}</span>
          <span>{monthLabel(last)}</span>
        </div>
      )}
    </div>
  )
}

// ── Plan card ─────────────────────────────────────────────────────────────────

function planGasLabel(o2: number, he: number): string {
  const pO2 = Math.round(o2 * 100)
  const pHe = Math.round(he * 100)
  if (pHe > 0) return `TMX ${pO2}/${pHe}`
  if (pO2 === 21) return 'Air'
  return `EAN${pO2}`
}

function PlanCard({ plan, onDelete }: { plan: DivePlanWithSite; onDelete: () => void }) {
  const href =
    `/planner?depth=${plan.depth_m}&time=${plan.bottom_time_min}` +
    `&o2=${Math.round(plan.gas_o2 * 100)}&he=${Math.round(plan.gas_he * 100)}` +
    `&gflo=${plan.gf_lo}&gfhi=${plan.gf_hi}` +
    (plan.site ? `&site=${plan.site.slug}` : '')
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '11px',
        border: '1px solid var(--line)', borderRadius: '14px',
        background: 'var(--card)', padding: '11px 13px',
      }}
    >
      <Link href={href} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px', textDecoration: 'none' }}>
        <span className="font-bold" style={{ fontSize: '13.5px', color: 'var(--tx)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {plan.name}
        </span>
        <span className="font-mono font-semibold" style={{ fontSize: '10.5px', color: 'var(--tx2)' }}>
          {plan.depth_m}m · {plan.bottom_time_min}min · {planGasLabel(plan.gas_o2, plan.gas_he)} · GF {plan.gf_lo}/{plan.gf_hi}
        </span>
        <span className="font-mono" style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.06em' }}>
          {plan.runtime_min != null ? `RUNTIME ${plan.runtime_min} MIN` : ''}
          {plan.stop_count != null ? ` · ${plan.stop_count} STOPS` : ''}
          {' · '}{formatDate(plan.created_at)}
        </span>
      </Link>
      <button
        onClick={onDelete}
        aria-label="Delete plan"
        style={{
          flexShrink: 0, width: '28px', height: '28px', borderRadius: '50%',
          border: '1px solid var(--line)', background: 'transparent',
          color: 'var(--tx3)', fontSize: '14px', lineHeight: 1, cursor: 'pointer',
        }}
      >
        ×
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  user: User | null
  dives: DiveWithSite[]
  wishlist: WishlistSite[]
  plans: DivePlanWithSite[]
}

export function ProfilePage({ user, dives, wishlist, plans: initialPlans }: Props) {
  const router = useRouter()
  const { signOut } = useSignIn()
  const [tab, setTab] = useState<ProfileTab>('Logbook')
  const [plans, setPlans] = useState(initialPlans)

  async function handleDeletePlan(id: string) {
    setPlans((prev) => prev.filter((p) => p.id !== id))
    await deletePlan(id, createClient())
  }

  async function handleSignOut() {
    await signOut()
    router.push('/')
  }

  const displayName = user?.display_name ?? 'Diver'
  const certs = (user?.certifications as unknown as Certification[] | null) ?? []
  const topCert = certs[0]?.name ?? null
  const subtitle = [topCert, user?.home_country].filter(Boolean).join(' · ')

  const { maxDepth, totalHours, countries } = computeStats(dives)
  const totalDives = user?.total_dives ?? dives.length

  // "DEEPEST {year}" badge (design screen 05) — deepest dive of the current year.
  const thisYear = new Date().getFullYear()
  const deepestThisYear = dives
    .filter(d => new Date(d.dived_at).getFullYear() === thisYear)
    .reduce<DiveWithSite | null>((best, d) => (!best || d.max_depth_m > best.max_depth_m ? d : best), null)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingTop: '64px', paddingBottom: '40px' }}>
      {/* ── Profile header ── */}
      <div style={{ padding: '8px 16px 0', display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Avatar */}
        <div
          style={{
            width: '64px', height: '64px', flexShrink: 0, borderRadius: '50%',
            background: 'linear-gradient(160deg, #0077b6 0%, #023e8a 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span className="font-bold" style={{ fontSize: '22px', color: '#caf0f8' }}>
              {displayName[0]?.toUpperCase() ?? '?'}
            </span>
          )}
        </div>
        {/* Name + subtitle + sync */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div className="font-extrabold" style={{ fontSize: '19px', color: 'var(--tx)' }}>{displayName}</div>
          {user?.username && (
            <Link
              href={`/profile/${user.username}`}
              className="font-mono font-semibold"
              style={{ fontSize: '10px', color: 'var(--acc)', letterSpacing: '0.04em', textDecoration: 'none' }}
            >
              @{user.username} · view public profile →
            </Link>
          )}
          {subtitle && (
            <div className="font-medium" style={{ fontSize: '11.5px', color: 'var(--tx3)' }}>{subtitle}</div>
          )}
          {dives.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--ok)', flexShrink: 0 }} />
              <div className="font-mono font-semibold" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.08em' }}>
                DIVE COMPUTER SYNCED
              </div>
            </div>
          )}
        </div>
        {/* Edit button */}
        <Link
          href="/profile/edit"
          className="font-mono font-bold"
          style={{ fontSize: '9.5px', color: 'var(--tx2)', border: '1px solid var(--line)', borderRadius: '999px', padding: '6px 11px', letterSpacing: '0.1em', cursor: 'pointer', flexShrink: 0, textDecoration: 'none' }}
        >
          EDIT
        </Link>
      </div>

      {/* ── Stats bar ── */}
      <div
        style={{
          margin: '16px 16px 0', background: 'var(--card)', border: '1px solid var(--line)',
          borderRadius: '16px', padding: '14px 6px',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        }}
      >
        <StatCell value={String(totalDives)} label="DIVES" />
        <StatCell value={maxDepth != null ? `${maxDepth} m` : '—'} label="MAX DEPTH" border />
        <StatCell value={totalHours > 0 ? `${totalHours}h` : '—'} label="UNDERWATER" border />
        <StatCell value={countries > 0 ? String(countries) : '—'} label="COUNTRIES" border />
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginTop: '14px', padding: '0 8px' }}>
        {(['Logbook', 'Dive Plans', 'Certifications', 'Wishlist'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '11px 13px', fontWeight: 600, fontSize: '12.5px',
              color: tab === t ? 'var(--acc)' : 'var(--tx3)',
              borderBottom: `2px solid ${tab === t ? 'var(--acc)' : 'rgba(0,0,0,0)'}`,
              background: 'transparent', border: 'none',
              borderBottomStyle: 'solid',
              borderBottomWidth: '2px',
              borderBottomColor: tab === t ? 'var(--acc)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}

      {/* Logbook */}
      {tab === 'Logbook' && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '9px', animation: 'dmFade 0.25s ease' }}>
          {dives.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--tx3)', fontStyle: 'italic' }}>No dives logged yet.</p>
          ) : (
            <>
              <DepthSparkChart dives={dives} />
              {dives.map(d => (
                <LogCard
                  key={d.id}
                  dive={d}
                  badge={deepestThisYear?.id === d.id ? `DEEPEST ${thisYear}` : undefined}
                />
              ))}
              <Link
                href="/logbook"
                className="text-center font-semibold"
                style={{ fontSize: '12px', color: 'var(--acc)', padding: '6px 0', textDecoration: 'none' }}
              >
                View full logbook →
              </Link>
            </>
          )}
        </div>
      )}

      {/* Dive Plans */}
      {tab === 'Dive Plans' && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '9px', animation: 'dmFade 0.25s ease' }}>
          {plans.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--tx3)', fontStyle: 'italic' }}>
              No saved plans yet — build one in the <Link href="/planner" style={{ color: 'var(--acc)' }}>Tech Planner</Link>.
            </p>
          ) : (
            plans.map(pl => <PlanCard key={pl.id} plan={pl} onDelete={() => handleDeletePlan(pl.id)} />)
          )}
        </div>
      )}

      {/* Certifications */}
      {tab === 'Certifications' && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '9px', animation: 'dmFade 0.25s ease' }}>
          {certs.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--tx3)', fontStyle: 'italic' }}>No certifications added yet.</p>
          ) : (
            certs.map((c, i) => <CertCard key={i} cert={c} />)
          )}
        </div>
      )}

      {/* Wishlist */}
      {tab === 'Wishlist' && (
        <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '9px', animation: 'dmFade 0.25s ease' }}>
          {wishlist.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--tx3)', fontStyle: 'italic' }}>No sites saved yet.</p>
          ) : (
            <>
              <p className="font-medium" style={{ fontSize: '11px', color: 'var(--tx3)' }}>Sites you&apos;ve saved — want to dive.</p>
              {wishlist.map(w => <WishCard key={w.id} item={w} />)}
            </>
          )}
        </div>
      )}

      {/* ── Footer actions ── */}
      <div style={{ margin: '24px 16px 0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <Link
          href="/log-dive"
          style={{
            display: 'block', padding: '14px', borderRadius: '14px',
            background: 'var(--acc)', fontWeight: 700, fontSize: '14.5px',
            color: '#02222e', textAlign: 'center', textDecoration: 'none',
            boxShadow: '0 6px 16px rgba(0,180,216,0.3)',
          }}
        >
          + Log a dive
        </Link>
        <button
          onClick={handleSignOut}
          style={{
            padding: '13px', borderRadius: '14px', border: '1px solid var(--line)',
            background: 'transparent', fontWeight: 600, fontSize: '13.5px',
            color: 'var(--tx3)', cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}

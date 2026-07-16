'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { User, Certification, DiveWithSite, WishlistSite } from '@divemap/db'

type ProfileTab = 'Logbook' | 'Certifications' | 'Wishlist'

// ── Helpers ───────────────────────────────────────────────────────────────────

function gasLabel(o2: number | null, he: number | null): string {
  if (o2 === null) return '—'
  const pO2 = Math.round(o2)
  const pHe = Math.round(he ?? 0)
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

function LogCard({ dive }: { dive: DiveWithSite }) {
  return (
    <div
      style={{
        display: 'flex', gap: '11px', alignItems: 'center',
        border: '1px solid var(--line)', background: 'var(--card)',
        borderRadius: '14px', padding: '10px',
      }}
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
          <div className="font-bold truncate" style={{ fontSize: '13.5px', color: 'var(--tx)' }}>
            {dive.site?.name ?? 'Unknown site'}
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
    </div>
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

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  user: User | null
  dives: DiveWithSite[]
  wishlist: WishlistSite[]
}

export function ProfilePage({ user, dives, wishlist }: Props) {
  const [tab, setTab] = useState<ProfileTab>('Logbook')

  const displayName = user?.display_name ?? 'Diver'
  const certs = (user?.certifications as unknown as Certification[] | null) ?? []
  const topCert = certs[0]?.name ?? null
  const subtitle = [topCert, user?.home_country].filter(Boolean).join(' · ')

  const { maxDepth, totalHours, countries } = computeStats(dives)
  const totalDives = user?.total_dives ?? dives.length

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
        <div className="font-mono font-bold" style={{ fontSize: '9.5px', color: 'var(--tx2)', border: '1px solid var(--line)', borderRadius: '999px', padding: '6px 11px', letterSpacing: '0.1em', cursor: 'pointer', flexShrink: 0 }}>
          EDIT
        </div>
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
        {(['Logbook', 'Certifications', 'Wishlist'] as const).map(t => (
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
              {dives.map(d => <LogCard key={d.id} dive={d} />)}
              {totalDives > dives.length && (
                <div className="text-center font-semibold" style={{ fontSize: '12px', color: 'var(--acc)', padding: '6px 0' }}>
                  View all {totalDives} dives →
                </div>
              )}
            </>
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
    </div>
  )
}

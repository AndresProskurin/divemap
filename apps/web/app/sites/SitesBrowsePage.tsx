'use client'

import { useRouter } from 'next/navigation'
import { Suspense, useTransition } from 'react'
import Link from 'next/link'
import type { SiteListItem } from '@divemap/db'

const SITE_TYPES = ['reef', 'wreck', 'wall', 'cave', 'cenote', 'drift', 'muck', 'pinnacle', 'kelp', 'fissure'] as const
const LEVELS = ['beginner', 'intermediate', 'advanced', 'technical'] as const
const PAGE_SIZE = 24

function depthColor(maxDepth: number | null): string {
  if (!maxDepth) return 'var(--tx3)'
  if (maxDepth < 20) return '#33d6c3'
  if (maxDepth < 40) return '#ffb703'
  if (maxDepth < 60) return '#ef476f'
  return '#0077b6'
}

function VizDots({ score }: { score: number }) {
  const filled = Math.min(5, Math.max(0, Math.round(score)))
  return (
    <span style={{ letterSpacing: '2px', fontSize: '8px' }}>
      <span style={{ color: 'var(--acc)' }}>{'●'.repeat(filled)}</span>
      <span style={{ color: 'var(--line)' }}>{'●'.repeat(5 - filled)}</span>
    </span>
  )
}

function SiteCard({ site }: { site: SiteListItem }) {
  const dColor = depthColor(site.depth_max_m)
  return (
    <Link
      href={`/sites/${site.slug}`}
      style={{ display: 'block', textDecoration: 'none' }}
    >
      <div
        style={{
          background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '16px',
          padding: '14px', display: 'flex', flexDirection: 'column', gap: '9px',
          transition: 'border-color 0.15s',
        }}
      >
        {/* Type badge + rating */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span
            className="font-mono font-bold uppercase"
            style={{ fontSize: '8px', color: '#04121f', background: 'var(--acc)', borderRadius: '4px', padding: '2px 6px', letterSpacing: '0.1em' }}
          >
            {site.type}
          </span>
          {site.rating != null && (
            <span className="font-mono font-semibold" style={{ fontSize: '10px', color: 'var(--tx2)' }}>
              ★ {site.rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Name */}
        <div className="font-bold" style={{ fontSize: '14px', color: 'var(--tx)', lineHeight: 1.2 }}>
          {site.name}
        </div>

        {/* Country */}
        {site.country && (
          <div className="font-medium" style={{ fontSize: '10.5px', color: 'var(--tx3)' }}>
            {site.country}
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '2px' }}>
          {site.depth_max_m != null && (
            <span className="font-mono font-bold" style={{ fontSize: '11px', color: dColor }}>
              ↓{site.depth_max_m}m
            </span>
          )}
          {site.viz_score != null && (
            <VizDots score={site.viz_score} />
          )}
          {site.level && (
            <span className="font-mono" style={{ fontSize: '9px', color: 'var(--tx3)', textTransform: 'capitalize' }}>
              {site.level}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function FilterChip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="font-semibold flex-none"
      style={{
        padding: '7px 13px', borderRadius: '999px', fontSize: '11.5px', cursor: 'pointer',
        color: active ? 'var(--acc)' : 'var(--tx3)',
        background: active ? 'var(--chip)' : 'transparent',
        border: `1px solid ${active ? 'var(--acc)' : 'var(--line)'}`,
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

interface Props {
  sites: SiteListItem[]
  total: number
  page: number
  filters: { q?: string; type?: string; level?: string; country?: string }
}

function SitesBrowseInner({ sites, total, page, filters }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function navigate(overrides: Record<string, string | undefined>) {
    const params = new URLSearchParams()
    const merged = { ...filters, page: undefined, ...overrides }
    if (merged.q) params.set('q', merged.q)
    if (merged.type) params.set('type', merged.type)
    if (merged.level) params.set('level', merged.level)
    if (merged.country) params.set('country', merged.country)
    if (merged.page && merged.page !== '1') params.set('page', merged.page)
    startTransition(() => {
      router.push(`/sites${params.size ? `?${params}` : ''}`)
    })
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const hasActive = filters.q || filters.type || filters.level || filters.country

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, background: 'var(--bg2)', borderBottom: '1px solid var(--line)' }}>
        <div style={{ padding: '52px 16px 10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link
            href="/"
            style={{ width: '34px', height: '34px', borderRadius: '50%', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}
          >
            <svg width="10" height="16" viewBox="0 0 10 16">
              <path d="M8 2L2.5 8L8 14" stroke="var(--tx2)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div className="font-extrabold" style={{ fontSize: '20px', color: 'var(--tx)', flex: 1 }}>Dive Sites</div>
          <div className="font-mono font-semibold" style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.06em' }}>
            {total.toLocaleString()} SITES
          </div>
        </div>

        {/* Search bar */}
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{ position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <circle cx="5.5" cy="5.5" r="4" stroke="var(--tx3)" strokeWidth="1.4" fill="none" />
              <path d="M9 9l3 3" stroke="var(--tx3)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search dive sites…"
              defaultValue={filters.q ?? ''}
              onKeyDown={e => { if (e.key === 'Enter') navigate({ q: (e.target as HTMLInputElement).value || undefined }) }}
              style={{
                width: '100%', padding: '10px 36px 10px 34px', borderRadius: '12px',
                border: '1px solid var(--line)', background: 'var(--card)',
                fontSize: '13.5px', color: 'var(--tx)', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {filters.q && (
              <button
                onClick={() => navigate({ q: undefined })}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx3)', fontSize: '16px', lineHeight: 1 }}
              >×</button>
            )}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto" style={{ padding: '0 16px 12px', scrollbarWidth: 'none' }}>
          {/* Type filters */}
          {SITE_TYPES.map(t => (
            <FilterChip
              key={t}
              label={t.charAt(0).toUpperCase() + t.slice(1)}
              active={filters.type === t}
              onClick={() => navigate({ type: filters.type === t ? undefined : t })}
            />
          ))}
          <div style={{ width: '1px', flexShrink: 0, background: 'var(--line)', margin: '0 2px' }} />
          {/* Level filters */}
          {LEVELS.map(l => (
            <FilterChip
              key={l}
              label={l.charAt(0).toUpperCase() + l.slice(1)}
              active={filters.level === l}
              onClick={() => navigate({ level: filters.level === l ? undefined : l })}
            />
          ))}
        </div>
      </div>

      {/* Active filter summary + clear */}
      {hasActive && (
        <div style={{ padding: '10px 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="font-medium" style={{ fontSize: '11.5px', color: 'var(--tx3)' }}>
            Showing {total} result{total !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => navigate({ q: undefined, type: undefined, level: undefined, country: undefined })}
            className="font-semibold"
            style={{ fontSize: '11px', color: 'var(--acc)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Loading overlay */}
      {pending && (
        <div style={{ padding: '10px 16px 0' }}>
          <div style={{ height: '2px', background: 'var(--line)', borderRadius: '1px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '40%', background: 'var(--acc)', borderRadius: '1px', animation: 'slideRight 0.8s ease infinite' }} />
          </div>
        </div>
      )}

      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '10px',
          padding: '14px 16px 32px',
        }}
      >
        {sites.length === 0 ? (
          <div style={{ gridColumn: '1/-1', padding: '48px 0', textAlign: 'center' }}>
            <p className="font-medium" style={{ fontSize: '14px', color: 'var(--tx3)' }}>No dive sites found.</p>
            <p className="font-medium" style={{ fontSize: '12px', color: 'var(--tx3)', marginTop: '6px' }}>Try a different search or filter.</p>
          </div>
        ) : (
          sites.map(site => <SiteCard key={site.id} site={site} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', padding: '0 16px 48px', flexWrap: 'wrap' }}>
          {page > 1 && (
            <button
              onClick={() => navigate({ page: String(page - 1) })}
              className="font-semibold"
              style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--card)', fontSize: '13px', color: 'var(--tx2)', cursor: 'pointer' }}
            >
              ← Prev
            </button>
          )}
          <div className="font-mono font-semibold" style={{ padding: '8px 12px', fontSize: '12px', color: 'var(--tx3)', alignSelf: 'center' }}>
            {page} / {totalPages}
          </div>
          {page < totalPages && (
            <button
              onClick={() => navigate({ page: String(page + 1) })}
              className="font-semibold"
              style={{ padding: '8px 16px', borderRadius: '10px', border: '1px solid var(--line)', background: 'var(--card)', fontSize: '13px', color: 'var(--tx2)', cursor: 'pointer' }}
            >
              Next →
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export function SitesBrowsePage(props: Props) {
  return (
    <Suspense>
      <SitesBrowseInner {...props} />
    </Suspense>
  )
}

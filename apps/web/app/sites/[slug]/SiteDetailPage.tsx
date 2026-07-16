'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DiveSite, ConditionsReport, SitePhoto, Operator } from '@divemap/db'
import type { MarineSpecies } from '@divemap/db'
import { OverviewTab } from './tabs/OverviewTab'
import { ConditionsTab } from './tabs/ConditionsTab'
import { PhotosTab } from './tabs/PhotosTab'
import { OperatorsTab } from './tabs/OperatorsTab'
import { TechPlanTab } from './tabs/TechPlanTab'

type Tab = 'Overview' | 'Conditions' | 'Photos' | 'Operators' | 'Tech'
const TABS: Tab[] = ['Overview', 'Conditions', 'Photos', 'Operators', 'Tech']

function depthColor(maxDepth: number): string {
  if (maxDepth < 20) return '#33d6c3'
  if (maxDepth < 40) return '#ffb703'
  if (maxDepth < 60) return '#ef476f'
  return '#0077b6'
}

function VizDots({ score }: { score: number }) {
  const filled = Math.min(5, Math.max(0, Math.round(score)))
  return (
    <span style={{ letterSpacing: '2px', fontSize: '9px' }}>
      <span style={{ color: 'var(--acc)' }}>{'●'.repeat(filled)}</span>
      <span style={{ color: 'var(--line)' }}>{'●'.repeat(5 - filled)}</span>
    </span>
  )
}

interface Props {
  site: DiveSite
  conditions: ConditionsReport[]
  photos: SitePhoto[]
  operators: Operator[]
  marineLife: MarineSpecies[]
}

export function SiteDetailPage({ site, conditions, photos, operators, marineLife }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('Overview')

  const latestConditions = conditions[0]
  const dColor = depthColor(site.depth_max_m)

  return (
    <div className="relative min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="pb-[130px]">
        {/* ── Hero ── */}
        <div className="relative" style={{ height: '302px', background: '#062038' }}>
          {site.hero_photo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={site.hero_photo_url}
              alt={site.name}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(3,10,18,0.6) 0%, rgba(3,10,18,0) 32%, rgba(3,10,18,0) 52%, rgba(4,18,31,0.92) 100%)',
              pointerEvents: 'none',
            }}
          />
          {/* Back + Bookmark */}
          <div
            style={{
              position: 'absolute',
              top: '58px',
              left: '14px',
              right: '14px',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Link
              href="/"
              className="flex items-center justify-center"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(4,18,31,0.7)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <svg width="11" height="18" viewBox="0 0 11 18">
                <path d="M9 2L2.5 9L9 16" stroke="#eaf6fd" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <button
              className="flex items-center justify-center"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: 'rgba(4,18,31,0.7)',
                backdropFilter: 'blur(8px)',
                border: 'none',
                cursor: 'pointer',
              }}
              aria-label="Bookmark"
            >
              <svg width="14" height="17" viewBox="0 0 14 17">
                <path d="M2 2h10v13l-5-3.4L2 15V2z" stroke="#eaf6fd" strokeWidth="1.8" fill="none" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          {/* Title block */}
          <div
            style={{
              position: 'absolute',
              left: '16px',
              right: '16px',
              bottom: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px',
              pointerEvents: 'none',
            }}
          >
            <div className="flex items-center gap-2">
              <span
                className="font-mono font-bold uppercase"
                style={{
                  fontSize: '8.5px',
                  color: '#04121f',
                  background: 'var(--acc)',
                  borderRadius: '5px',
                  padding: '3px 6px',
                  letterSpacing: '0.1em',
                }}
              >
                {site.type}
              </span>
              {site.rating && (
                <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#cde7f5' }}>
                  ★ {site.rating.toFixed(1)}
                </span>
              )}
            </div>
            <h1
              className="font-sans font-extrabold"
              style={{ fontSize: '27px', color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1.1 }}
            >
              {site.name}
            </h1>
            <p style={{ fontSize: '12px', fontWeight: 500, color: 'var(--tx2)' }}>
              {site.region ? `${site.region} · ` : ''}{site.country}
            </p>
          </div>
        </div>

        {/* ── Spec chips row ── */}
        <div
          className="flex gap-2 overflow-x-auto"
          style={{ padding: '13px 14px 5px', scrollbarWidth: 'none' }}
        >
          <SpecCard icon="⬇" value={`${site.depth_min_m}–${site.depth_max_m}m`} label="DEPTH" color={dColor} />
          {site.viz_score != null && (
            <SpecCard
              icon={<VizDots score={site.viz_score} />}
              value={`${site.viz_score}/5`}
              label="VISIBILITY"
            />
          )}
          {site.current_level && (
            <SpecCard icon="⇌" value={site.current_level} label="CURRENT" />
          )}
          {site.avg_temp_c != null && (
            <SpecCard icon="🌡" value={`${site.avg_temp_c}°C`} label="AVG TEMP" />
          )}
          {site.level && (
            <SpecCard icon="◈" value={site.level} label="LEVEL" />
          )}
        </div>

        {latestConditions && (
          <p
            className="font-mono px-4"
            style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.05em' }}
          >
            CONDITIONS UPDATED{' '}
            {Math.floor(
              (Date.now() - new Date(latestConditions.reported_at).getTime()) / 3_600_000,
            )}{' '}
            H AGO · {conditions.length} REPORTS
          </p>
        )}

        {/* ── Tab bar ── */}
        <div
          className="flex overflow-x-auto mt-2"
          style={{ borderBottom: '1px solid var(--line)', padding: '0 8px', scrollbarWidth: 'none' }}
        >
          {TABS.map((tab) => {
            const active = tab === activeTab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-none font-semibold"
                style={{
                  padding: '11px 12px',
                  fontSize: '12.5px',
                  color: active ? 'var(--acc)' : 'var(--tx3)',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  borderBottom: active ? '2px solid var(--acc)' : '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab}
              </button>
            )
          })}
        </div>

        {/* ── Tab content ── */}
        {activeTab === 'Overview' && (
          <OverviewTab site={site} marineLife={marineLife} />
        )}
        {activeTab === 'Conditions' && (
          <ConditionsTab siteSlug={site.slug} reports={conditions} />
        )}
        {activeTab === 'Photos' && (
          <PhotosTab siteId={site.id} initialPhotos={photos} />
        )}
        {activeTab === 'Operators' && (
          <OperatorsTab operators={operators} />
        )}
        {activeTab === 'Tech' && (
          <TechPlanTab site={site} />
        )}
      </div>

      {/* ── Plan This Dive CTA ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-30 px-4 pb-8 pt-0"
        style={{ background: 'linear-gradient(180deg, transparent 0%, var(--bg) 42%)' }}
      >
        <a
          href={`/planner?site=${site.slug}&depth=${site.depth_max_m}`}
          className="block w-full text-center font-bold rounded-14 py-4"
          style={{
            background: 'var(--acc)',
            color: '#02222e',
            fontSize: '15px',
            textDecoration: 'none',
            boxShadow: '0 6px 18px rgba(0,180,216,0.35)',
          }}
        >
          Plan This Dive
        </a>
      </div>
    </div>
  )
}

function SpecCard({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode
  value: string
  label: string
  color?: string
}) {
  return (
    <div
      className="flex-none flex flex-col gap-[3px] rounded-12 px-[12px] py-[10px]"
      style={{ minWidth: '88px', background: 'var(--card)', border: '1px solid var(--line)' }}
    >
      <div className="font-mono font-semibold" style={{ fontSize: '12px', color: color ?? 'var(--acc)' }}>
        {icon}
      </div>
      <div className="font-mono font-bold" style={{ fontSize: '15px', color: 'var(--tx)', whiteSpace: 'nowrap' }}>
        {value}
      </div>
      <div
        className="font-sans font-semibold uppercase"
        style={{ fontSize: '8.5px', color: 'var(--tx3)', letterSpacing: '0.09em' }}
      >
        {label}
      </div>
    </div>
  )
}

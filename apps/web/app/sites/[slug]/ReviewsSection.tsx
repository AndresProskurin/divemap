'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  createClient,
  getSiteReviews,
  getUserReviewForSite,
  upsertSiteReview,
  computeReviewStats,
} from '@divemap/db'
import type { SiteReview } from '@divemap/db'

const SUB_LABELS = [
  { key: 'avgViz', label: 'VISIBILITY' },
  { key: 'avgCurrent', label: 'CURRENT' },
  { key: 'avgMarineLife', label: 'MARINE LIFE' },
] as const

function Stars({ value, size = 13 }: { value: number; size?: number }) {
  return (
    <div className="flex gap-[1px]" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          style={{
            fontSize: `${size}px`,
            color: n <= Math.round(value) ? '#ffb703' : 'var(--line)',
            lineHeight: 1,
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}

function StarInput({ value, onChange, size = 26 }: { value: number; onChange: (n: number) => void; size?: number }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{
            fontSize: `${size}px`,
            color: n <= value ? '#ffb703' : 'var(--line)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '2px',
            lineHeight: 1,
          }}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

function SubRatingInput({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono font-semibold" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.1em' }}>
        {label}
      </span>
      <StarInput value={value} onChange={onChange} size={17} />
    </div>
  )
}

function timeAgo(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d < 1) return 'today'
  if (d < 30) return `${d}d ago`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}mo ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

interface WriteModalProps {
  siteId: string
  userId: string
  existing: SiteReview | null
  onClose: () => void
  onSaved: () => void
}

function WriteReviewModal({ siteId, userId, existing, onClose, onSaved }: WriteModalProps) {
  const [rating, setRating] = useState(existing?.rating ?? 0)
  const [viz, setViz] = useState(existing?.viz_rating ?? 0)
  const [current, setCurrent] = useState(existing?.current_rating ?? 0)
  const [marineLife, setMarineLife] = useState(existing?.marine_life_rating ?? 0)
  const [body, setBody] = useState(existing?.body ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    if (rating < 1) { setError('Pick an overall star rating first.'); return }
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await upsertSiteReview(
      {
        siteId,
        userId,
        rating,
        vizRating: viz || null,
        currentRating: current || null,
        marineLifeRating: marineLife || null,
        body: body.trim() || null,
      },
      supabase,
    )
    setSaving(false)
    if (err) { setError(err); return }
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(2,10,18,0.72)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[420px] flex flex-col gap-4 p-5"
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--line)',
          borderRadius: '20px 20px 0 0',
          maxHeight: '88dvh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="font-extrabold" style={{ fontSize: '17px', color: 'var(--tx)' }}>
            {existing ? 'Edit your review' : 'Write a review'}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '18px', color: 'var(--tx3)', cursor: 'pointer' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Overall */}
        <div className="flex flex-col items-center gap-2 py-2">
          <StarInput value={rating} onChange={setRating} />
          <span className="font-mono" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.1em' }}>
            OVERALL RATING
          </span>
        </div>

        {/* Sub-ratings */}
        <div
          className="flex flex-col gap-3 p-3"
          style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '14px' }}
        >
          <SubRatingInput label="VISIBILITY" value={viz} onChange={setViz} />
          <SubRatingInput label="CURRENT" value={current} onChange={setCurrent} />
          <SubRatingInput label="MARINE LIFE" value={marineLife} onChange={setMarineLife} />
        </div>

        {/* Body */}
        <div className="flex flex-col gap-1.5">
          <textarea
            value={body}
            onChange={e => setBody(e.target.value.slice(0, 2000))}
            placeholder="How was the dive? Conditions, highlights, tips for other divers…"
            rows={4}
            className="w-full resize-none"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: '12px',
              padding: '12px',
              fontSize: '13px',
              color: 'var(--tx)',
              outline: 'none',
            }}
          />
          <span className="font-mono self-end" style={{ fontSize: '8.5px', color: 'var(--tx3)' }}>
            {body.length}/2000
          </span>
        </div>

        {error && (
          <div
            className="font-medium p-2.5"
            style={{
              fontSize: '12px', color: 'var(--dang)',
              background: 'rgba(255,93,125,0.08)', border: '1px solid rgba(255,93,125,0.3)',
              borderRadius: '10px',
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="font-bold"
          style={{
            padding: '13px',
            borderRadius: '14px',
            background: 'var(--acc)',
            fontSize: '14px',
            color: '#02222e',
            border: 'none',
            cursor: saving ? 'default' : 'pointer',
            opacity: saving ? 0.6 : 1,
            boxShadow: '0 6px 16px rgba(0,180,216,0.3)',
          }}
        >
          {saving ? 'Saving…' : existing ? 'Update review' : 'Post review'}
        </button>
      </div>
    </div>
  )
}

export function ReviewsSection({ siteId }: { siteId: string }) {
  const [reviews, setReviews] = useState<SiteReview[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [myReview, setMyReview] = useState<SiteReview | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const [list, { data: { user } }] = await Promise.all([
      getSiteReviews(siteId, supabase),
      supabase.auth.getUser(),
    ])
    setReviews(list)
    setUserId(user?.id ?? null)
    if (user) {
      setMyReview(await getUserReviewForSite(user.id, siteId, supabase))
    }
    setLoading(false)
  }, [siteId])

  useEffect(() => { void load() }, [load])

  const stats = computeReviewStats(reviews)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span
          className="font-mono font-semibold uppercase"
          style={{ fontSize: '10px', color: 'var(--tx3)', letterSpacing: '0.12em' }}
        >
          REVIEWS{stats.count > 0 ? ` · ${stats.count}` : ''}
        </span>
        {userId ? (
          <button
            onClick={() => setModalOpen(true)}
            className="font-semibold"
            style={{
              fontSize: '11px', color: 'var(--acc)',
              background: 'var(--chip)', border: '1px solid rgba(0,180,216,0.35)',
              borderRadius: '10px', padding: '6px 12px', cursor: 'pointer',
            }}
          >
            {myReview ? 'Edit review' : '+ Write review'}
          </button>
        ) : (
          <Link
            href="/auth/sign-in"
            className="font-semibold"
            style={{
              fontSize: '11px', color: 'var(--tx3)',
              border: '1px solid var(--line)', borderRadius: '10px',
              padding: '6px 12px', textDecoration: 'none',
            }}
          >
            Sign in to review
          </Link>
        )}
      </div>

      {/* Aggregate */}
      {stats.count > 0 && (
        <div
          className="flex gap-4 p-3.5 items-center"
          style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '14px' }}
        >
          <div className="flex flex-col items-center gap-1 flex-none px-2">
            <span className="font-mono font-bold" style={{ fontSize: '28px', color: 'var(--tx)', lineHeight: 1 }}>
              {stats.avgRating.toFixed(1)}
            </span>
            <Stars value={stats.avgRating} size={11} />
          </div>
          <div className="flex flex-col gap-2 flex-1 min-w-0">
            {SUB_LABELS.map(({ key, label }) => {
              const v = stats[key]
              if (v == null) return null
              return (
                <div key={key} className="flex items-center gap-2">
                  <span
                    className="font-mono flex-none"
                    style={{ fontSize: '8px', color: 'var(--tx3)', letterSpacing: '0.08em', width: '68px' }}
                  >
                    {label}
                  </span>
                  <div
                    className="flex-1 overflow-hidden"
                    style={{ height: '4px', borderRadius: '2px', background: 'var(--line)' }}
                  >
                    <div
                      style={{
                        height: '100%', width: `${(v / 5) * 100}%`,
                        background: 'var(--acc)', borderRadius: '2px',
                      }}
                    />
                  </div>
                  <span className="font-mono flex-none" style={{ fontSize: '9px', color: 'var(--tx2)' }}>
                    {v.toFixed(1)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="font-medium py-4 text-center" style={{ fontSize: '12px', color: 'var(--tx3)' }}>
          Loading reviews…
        </div>
      ) : reviews.length === 0 ? (
        <div
          className="font-medium py-5 text-center"
          style={{
            fontSize: '12.5px', color: 'var(--tx3)',
            background: 'var(--card)', border: '1px dashed var(--line)', borderRadius: '14px',
          }}
        >
          No reviews yet — be the first to rate this site.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {reviews.map(r => (
            <div
              key={r.id}
              className="flex flex-col gap-2 p-3.5"
              style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '14px' }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="flex-none flex items-center justify-center font-bold"
                  style={{
                    width: '30px', height: '30px', borderRadius: '50%',
                    background: r.reviewer?.avatar_url
                      ? `url(${r.reviewer.avatar_url}) center/cover`
                      : 'var(--card2)',
                    fontSize: '12px', color: 'var(--tx2)',
                    border: '1px solid var(--line)',
                  }}
                >
                  {!r.reviewer?.avatar_url && (r.reviewer?.display_name?.[0]?.toUpperCase() ?? '?')}
                </div>
                <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                  <span className="font-bold truncate" style={{ fontSize: '12.5px', color: 'var(--tx)' }}>
                    {r.reviewer?.display_name ?? 'Diver'}
                  </span>
                  <Stars value={r.rating} size={10} />
                </div>
                <span className="font-mono flex-none" style={{ fontSize: '9px', color: 'var(--tx3)' }}>
                  {timeAgo(r.created_at)}
                </span>
              </div>
              {r.body && (
                <p className="leading-relaxed" style={{ fontSize: '12.5px', color: 'var(--tx2)', margin: 0 }}>
                  {r.body}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && userId && (
        <WriteReviewModal
          siteId={siteId}
          userId={userId}
          existing={myReview}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); void load() }}
        />
      )}
    </div>
  )
}

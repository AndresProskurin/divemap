'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, insertDive } from '@divemap/db'

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

function mixLabel(o2: number, he: number): string {
  const pHe = Math.round(he)
  const pO2 = Math.round(o2)
  if (pHe > 0) return `TX ${pO2}/${pHe}`
  if (pO2 === 21) return 'Air'
  return `EAN${pO2}`
}

// ── Star rating ───────────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {[1, 2, 3, 4, 5].map(s => {
        const filled = s <= (hover || value)
        return (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s === value ? 0 : s)}
            onMouseEnter={() => setHover(s)}
            onMouseLeave={() => setHover(0)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
          >
            <svg width="22" height="22" viewBox="0 0 22 22">
              <path
                d="M11 2l2.47 5 5.53.8-4 3.9.94 5.5L11 14.77 6.06 17.2l.94-5.5L3 7.8l5.53-.8z"
                fill={filled ? 'var(--warn)' : 'none'}
                stroke={filled ? 'var(--warn)' : 'var(--tx3)'}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )
      })}
    </div>
  )
}

// ── Form field wrapper ────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label className="font-mono font-semibold" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const INPUT_STYLE: React.CSSProperties = {
  padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--line)',
  background: 'var(--card)', fontSize: '14px', color: 'var(--tx)', fontWeight: 500,
  outline: 'none', width: '100%',
}

const MONO_INPUT_STYLE: React.CSSProperties = {
  ...INPUT_STYLE,
  fontFamily: "'IBM Plex Mono', monospace",
  fontWeight: 700,
  fontSize: '20px',
  textAlign: 'center',
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  prelinkedSite: { id: string; name: string; slug: string } | null
}

export function LogDivePage({ prelinkedSite }: Props) {
  const router = useRouter()

  const [date, setDate] = useState(todayISO())
  const [depth, setDepth] = useState('')
  const [time, setTime] = useState('')
  const [o2, setO2] = useState('21')
  const [he, setHe] = useState('0')
  const [viz, setViz] = useState('')
  const [buddy, setBuddy] = useState('')
  const [notes, setNotes] = useState('')
  const [rating, setRating] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const depthNum = parseFloat(depth)
  const timeNum = parseFloat(time)
  const o2Num = Math.min(100, Math.max(5, parseFloat(o2) || 21))
  const heNum = Math.min(95 - o2Num, Math.max(0, parseFloat(he) || 0))
  const gasName = mixLabel(o2Num, heNum)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (isNaN(depthNum) || depthNum <= 0) { setError('Enter a valid depth.'); return }
    if (isNaN(timeNum) || timeNum <= 0) { setError('Enter a valid bottom time.'); return }

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Session expired. Please sign in again.'); return }

      const vizNum = parseFloat(viz)
      const { error: dbError } = await insertDive(
        {
          userId: user.id,
          siteId: prelinkedSite?.id ?? null,
          divedAt: date,
          maxDepthM: depthNum,
          bottomTimeMin: timeNum,
          gasO2: o2Num,
          gasHe: heNum > 0 ? heNum : null,
          vizM: isNaN(vizNum) ? null : vizNum,
          buddy: buddy.trim() || null,
          notes: notes.trim() || null,
          rating: rating > 0 ? rating : null,
        },
        supabase,
      )
      if (dbError) { setError(dbError); return }
      router.push('/profile')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingTop: '60px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 16px 0', gap: '12px' }}>
        <Link
          href="/profile"
          style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--card)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, textDecoration: 'none' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="var(--tx2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <div className="font-bold" style={{ fontSize: '17px', color: 'var(--tx)' }}>Log a dive</div>
          {prelinkedSite && (
            <div className="font-medium" style={{ fontSize: '11px', color: 'var(--tx3)' }}>{prelinkedSite.name}</div>
          )}
        </div>
      </div>

      {/* ── Form ── */}
      <form onSubmit={handleSubmit} style={{ padding: '20px 16px 48px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Pre-linked site chip */}
        {prelinkedSite && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--chip)', border: '1px solid rgba(0,180,216,0.35)', borderRadius: '10px', padding: '8px 12px' }}>
            <svg width="12" height="12" viewBox="0 0 12 12">
              <circle cx="6" cy="5" r="2.5" stroke="var(--acc)" strokeWidth="1.4" fill="none" />
              <path d="M6 12 C6 12 1 7.5 1 5a5 5 0 0 1 10 0c0 2.5-5 7-5 7z" stroke="var(--acc)" strokeWidth="1.4" fill="none" />
            </svg>
            <span className="font-semibold" style={{ fontSize: '12px', color: 'var(--acc)' }}>{prelinkedSite.name}</span>
            <Link href={`/sites/${prelinkedSite.slug}`} style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--tx3)', textDecoration: 'none' }}>view →</Link>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(255,93,125,0.1)', border: '1px solid rgba(255,93,125,0.4)', borderRadius: '12px', padding: '12px 14px', fontSize: '12.5px', color: 'var(--dang)', fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* Section: When */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="font-mono font-semibold" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>WHEN</div>
          <Field label="DATE">
            <input
              type="date"
              required
              value={date}
              max={todayISO()}
              onChange={e => setDate(e.target.value)}
              style={INPUT_STYLE}
            />
          </Field>
        </div>

        {/* Section: Dive data */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="font-mono font-semibold" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>DIVE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="MAX DEPTH (M)">
              <input
                type="number"
                placeholder="42"
                required
                min={1} max={500} step={0.1}
                value={depth}
                onChange={e => setDepth(e.target.value)}
                style={MONO_INPUT_STYLE}
              />
            </Field>
            <Field label="BOTTOM TIME (MIN)">
              <input
                type="number"
                placeholder="45"
                required
                min={1} max={600} step={1}
                value={time}
                onChange={e => setTime(e.target.value)}
                style={MONO_INPUT_STYLE}
              />
            </Field>
          </div>
          <Field label="VIZ (M) — OPTIONAL">
            <input
              type="number"
              placeholder="20"
              min={0} max={60} step={1}
              value={viz}
              onChange={e => setViz(e.target.value)}
              style={MONO_INPUT_STYLE}
            />
          </Field>
        </div>

        {/* Section: Gas */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="font-mono font-semibold" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>GAS MIX</div>
            <div className="font-mono font-bold" style={{ fontSize: '13px', color: 'var(--acc)' }}>{gasName}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <Field label="O₂ %">
              <input
                type="number"
                min={5} max={100} step={1}
                value={o2}
                onChange={e => setO2(e.target.value)}
                style={MONO_INPUT_STYLE}
              />
            </Field>
            <Field label="HE %">
              <input
                type="number"
                min={0} max={95} step={1}
                value={he}
                onChange={e => setHe(e.target.value)}
                style={MONO_INPUT_STYLE}
              />
            </Field>
          </div>
        </div>

        {/* Section: People & notes */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="font-mono font-semibold" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>DETAILS</div>
          <Field label="BUDDY">
            <input
              type="text"
              placeholder="Dive buddy name"
              value={buddy}
              onChange={e => setBuddy(e.target.value)}
              style={INPUT_STYLE}
            />
          </Field>
          <Field label="NOTES">
            <textarea
              placeholder="Highlights, conditions, critters spotted…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ ...INPUT_STYLE, height: '90px', resize: 'none' }}
            />
          </Field>
          <Field label="RATING">
            <StarRating value={rating} onChange={setRating} />
          </Field>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '15px', borderRadius: '14px', border: 'none',
            background: 'var(--acc)', fontWeight: 700, fontSize: '15px', color: '#02222e',
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 6px 16px rgba(0,180,216,0.3)',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Saving…' : 'Save dive'}
        </button>
      </form>
    </div>
  )
}

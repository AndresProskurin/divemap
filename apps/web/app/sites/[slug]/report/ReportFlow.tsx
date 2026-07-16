'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, insertConditionsReport } from '@divemap/db'

type CurrentLevel = 'none' | 'mild' | 'moderate' | 'strong' | 'ripping'
type Step = 1 | 2 | 3 | 4 | 'done'

// U+203A SINGLE RIGHT-POINTING ANGLE QUOTATION MARK (›)
// U+2023 TRIANGULAR BULLET (‣)
// U+25CB WHITE CIRCLE (○)
const CURRENT_OPTIONS: Array<{ value: CurrentLevel; glyph: string; name: string; desc: string }> = [
  { value: 'none',     glyph: '○',             name: 'None',     desc: 'No noticeable current' },
  { value: 'mild',     glyph: '›',             name: 'Mild',     desc: 'Slight movement, easy swimming' },
  { value: 'moderate', glyph: '››',       name: 'Moderate', desc: 'Noticeable, requires effort' },
  { value: 'strong',   glyph: '›››', name: 'Strong',   desc: 'Very strong, tiring' },
  { value: 'ripping',  glyph: '›‣›', name: 'Ripping',  desc: 'Dangerous, entry not advised' },
]

function vizWord(m: number): string {
  if (m === 0)  return 'Zero viz'
  if (m <= 3)   return 'Very poor'
  if (m <= 7)   return 'Poor'
  if (m <= 12)  return 'Fair'
  if (m <= 20)  return 'Good'
  if (m <= 25)  return 'Excellent'
  return 'Exceptional'
}

interface Props {
  siteId: string
  siteName: string
  siteSlug: string
  siteLocation?: string
}

export function ReportFlow({ siteId, siteName, siteSlug, siteLocation }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [viz, setViz] = useState(18)
  const [current, setCurrent] = useState<CurrentLevel>('mild')
  const [tempSurface, setTempSurface] = useState('26')
  const [tempBottom, setTempBottom] = useState('22')
  const [notes, setNotes] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isDone = step === 'done'

  const ts = parseFloat(tempSurface)
  const tb = parseFloat(tempBottom)
  const thermoclineDelta = !isNaN(ts) && !isNaN(tb) ? Math.abs(ts - tb) : 0
  const thermocline = thermoclineDelta >= 5

  function goBack() {
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
    else if (step === 4) setStep(3)
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Sign in to submit a conditions report.')
        return
      }
      const { error: dbError } = await insertConditionsReport(
        {
          siteId,
          reporterId: user.id,
          vizM: viz,
          currentLevel: current,
          tempSurfaceC: isNaN(ts) ? undefined : ts,
          tempBottomC:  isNaN(tb) ? undefined : tb,
          notes: notes.trim() || undefined,
        },
        supabase,
      )
      if (dbError) {
        setError(dbError)
        return
      }
      setStep('done')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleNext() {
    if (step === 1) setStep(2)
    else if (step === 2) setStep(3)
    else if (step === 3) setStep(4)
    else if (step === 4) void handleSubmit()
  }

  const ctaLabel = step === 4 ? (submitting ? 'Submitting…' : 'Submit') : 'Next'

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', display: 'flex', flexDirection: 'column', paddingTop: '60px' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 16px 4px' }}>
        <button
          onClick={() => router.push(`/sites/${siteSlug}`)}
          aria-label="Close"
          style={{
            width: '38px', height: '38px', borderRadius: '50%',
            background: 'var(--card)', border: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13">
            <line x1="2" y1="2" x2="11" y2="11" stroke="var(--tx2)" strokeWidth="2" strokeLinecap="round" />
            <line x1="11" y1="2" x2="2" y2="11" stroke="var(--tx2)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="font-bold" style={{ fontSize: '15px', color: 'var(--tx)' }}>Report conditions</div>
          <div className="font-medium" style={{ fontSize: '10.5px', color: 'var(--tx3)' }}>
            {siteName}{siteLocation ? ` · ${siteLocation}` : ''}
          </div>
        </div>
        <div style={{ width: '38px' }} />
      </div>

      {/* ── Progress dots ── */}
      {!isDone && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '7px', padding: '14px 0 6px' }}>
          {([1, 2, 3, 4] as const).map(s => {
            const active = step === s
            const past = typeof step === 'number' && (step as number) > s
            return (
              <div
                key={s}
                style={{
                  width: active ? '28px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  background: active ? 'var(--acc)' : past ? 'var(--accD)' : 'var(--card2)',
                  transition: 'all 0.25s ease',
                }}
              />
            )
          })}
        </div>
      )}

      {/* ── Step content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Step 1 — Viz */}
        {step === 1 && (
          <div style={{ flex: 1, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: '18px', animation: 'dmFade 0.25s ease' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="font-extrabold" style={{ fontSize: '23px', color: 'var(--tx)' }}>How was the viz?</div>
              <div className="font-medium" style={{ fontSize: '12.5px', color: 'var(--tx2)' }}>Horizontal distance you could see at depth.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <div className="font-mono font-bold" style={{ fontSize: '56px', color: 'var(--acc)', lineHeight: 1 }}>{viz} m</div>
              <div className="font-semibold" style={{ fontSize: '12px', color: 'var(--tx2)' }}>{vizWord(viz)}</div>
            </div>
            <div style={{ position: 'relative', height: '46px', borderRadius: '12px', background: 'linear-gradient(90deg, #0b1d2a 0%, #0e3a54 32%, #1780ab 65%, #7fd8ef 100%)', border: '1px solid var(--line)', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(viz / 30) * 100}%`, width: '3px', background: '#ffffff', boxShadow: '0 0 10px rgba(255,255,255,0.8)', transform: 'translateX(-50%)' }} />
            </div>
            <input
              type="range"
              min={0} max={30} step={1}
              value={viz}
              onChange={e => setViz(Number(e.target.value))}
              style={{ width: '100%' }}
            />
            <div className="flex justify-between font-mono font-semibold" style={{ fontSize: '9.5px', color: 'var(--tx3)' }}>
              <span>0 m</span>
              <span>15 m</span>
              <span>30 m+</span>
            </div>
          </div>
        )}

        {/* Step 2 — Current */}
        {step === 2 && (
          <div style={{ flex: 1, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: '16px', animation: 'dmFade 0.25s ease' }}>
            <div className="font-extrabold" style={{ fontSize: '23px', color: 'var(--tx)' }}>Current?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
              {CURRENT_OPTIONS.map(opt => {
                const selected = current === opt.value
                return (
                  <button
                    key={opt.value}
                    onClick={() => setCurrent(opt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '15px 14px', borderRadius: '14px',
                      border: `1.5px solid ${selected ? 'var(--acc)' : 'var(--line)'}`,
                      background: selected ? 'var(--chip)' : 'transparent',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div className="font-mono font-bold flex-shrink-0" style={{ width: '44px', fontSize: '15px', color: 'var(--acc)', letterSpacing: '1px' }}>
                      {opt.glyph}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                      <div className="font-bold" style={{ fontSize: '15px', color: 'var(--tx)' }}>{opt.name}</div>
                      <div className="font-medium" style={{ fontSize: '11px', color: 'var(--tx3)' }}>{opt.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 3 — Water temp */}
        {step === 3 && (
          <div style={{ flex: 1, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: '18px', animation: 'dmFade 0.25s ease' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="font-extrabold" style={{ fontSize: '23px', color: 'var(--tx)' }}>Water temp?</div>
              <div className="font-medium" style={{ fontSize: '12.5px', color: 'var(--tx2)' }}>In °C, at the surface and at depth.</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '16px', padding: '16px' }}>
                <div className="flex-1 font-mono font-semibold" style={{ fontSize: '10px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>SURFACE</div>
                <input
                  type="number"
                  value={tempSurface}
                  onChange={e => setTempSurface(e.target.value)}
                  style={{ width: '96px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '12px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '24px', color: 'var(--tx)', textAlign: 'center' }}
                />
                <div className="font-mono font-semibold" style={{ fontSize: '14px', color: 'var(--tx3)' }}>°C</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '16px', padding: '16px' }}>
                <div className="flex-1 font-mono font-semibold" style={{ fontSize: '10px', color: 'var(--tx3)', letterSpacing: '0.12em' }}>AT DEPTH</div>
                <input
                  type="number"
                  value={tempBottom}
                  onChange={e => setTempBottom(e.target.value)}
                  style={{ width: '96px', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: '12px', padding: '12px', fontFamily: "'IBM Plex Mono', monospace", fontWeight: 700, fontSize: '24px', color: 'var(--tx)', textAlign: 'center' }}
                />
                <div className="font-mono font-semibold" style={{ fontSize: '14px', color: 'var(--tx3)' }}>°C</div>
              </div>
            </div>
            {thermocline && (
              <div className="font-mono font-semibold" style={{ fontSize: '11px', color: 'var(--warn)' }}>
                Δ {thermoclineDelta.toFixed(0)}°C — thermocline likely, we&apos;ll flag it on the site.
              </div>
            )}
          </div>
        )}

        {/* Step 4 — Notes + photo */}
        {step === 4 && (
          <div style={{ flex: 1, padding: '22px 20px', display: 'flex', flexDirection: 'column', gap: '16px', animation: 'dmFade 0.25s ease' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="font-extrabold" style={{ fontSize: '23px', color: 'var(--tx)' }}>Anything else?</div>
              <div className="font-medium" style={{ fontSize: '12.5px', color: 'var(--tx2)' }}>Optional — surge, entry conditions, what you saw.</div>
            </div>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Current direction, surge at entry, what you saw…"
              style={{
                height: '128px', background: 'var(--card)', border: '1px solid var(--line)',
                borderRadius: '14px', padding: '13px', fontSize: '13.5px', fontWeight: 500,
                color: 'var(--tx)', resize: 'none', width: '100%',
              }}
            />
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add photo"
                style={{
                  width: '84px', height: '84px', flexShrink: 0, borderRadius: '14px',
                  border: '1.5px dashed var(--line)', background: 'var(--card)',
                  cursor: 'pointer', overflow: 'hidden', padding: 0,
                }}
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '4px' }}>
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M10 4v12M4 10h12" stroke="var(--tx3)" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span className="font-mono" style={{ fontSize: '8px', color: 'var(--tx3)' }}>add photo</span>
                  </div>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) setPhotoPreview(URL.createObjectURL(file))
                }}
              />
              <div className="font-medium" style={{ fontSize: '11.5px', color: 'var(--tx3)', lineHeight: 1.5 }}>
                Optional photo — surface shots help other divers plan entries.
              </div>
            </div>
            {error && (
              <div className="font-medium" style={{ fontSize: '12px', color: 'var(--dang)' }}>{error}</div>
            )}
          </div>
        )}

        {/* Done */}
        {isDone && (
          <div style={{ flex: 1, padding: '40px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', animation: 'dmFade 0.3s ease' }}>
            <div style={{ width: '86px', height: '86px', borderRadius: '50%', border: '3px solid var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="34" height="26" viewBox="0 0 34 26">
                <path d="M3 13.5L12.5 23L31 3" stroke="var(--ok)" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="font-extrabold text-center" style={{ fontSize: '23px', color: 'var(--tx)' }}>Report submitted</div>
            <div className="font-medium text-center" style={{ fontSize: '13px', color: 'var(--tx2)', lineHeight: 1.6, maxWidth: '270px' }}>
              Help other divers 🤿 — your viz, current and temp go live on {siteName} in about 2 minutes.
            </div>
            <button
              onClick={() => router.push(`/sites/${siteSlug}`)}
              style={{
                marginTop: '8px', border: '1.5px solid var(--line)', borderRadius: '13px',
                padding: '13px 34px', fontWeight: 700, fontSize: '13.5px', color: 'var(--tx2)',
                cursor: 'pointer', background: 'transparent',
              }}
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* ── Bottom nav ── */}
      {!isDone && (
        <div style={{ display: 'flex', gap: '10px', padding: '14px 20px 46px' }}>
          {typeof step === 'number' && step > 1 && (
            <button
              onClick={goBack}
              style={{
                width: '92px', border: '1.5px solid var(--line)', borderRadius: '14px',
                padding: '15px 0', textAlign: 'center', fontWeight: 700, fontSize: '14px',
                color: 'var(--tx2)', cursor: 'pointer', background: 'transparent',
              }}
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={submitting}
            style={{
              flex: 1, background: 'var(--acc)', border: 'none', borderRadius: '14px',
              padding: '15px 0', textAlign: 'center', fontWeight: 700, fontSize: '14.5px',
              color: '#02222e', cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 16px rgba(0,180,216,0.3)', opacity: submitting ? 0.7 : 1,
            }}
          >
            {ctaLabel}
          </button>
        </div>
      )}
    </div>
  )
}

'use client'

/**
 * UGC insider notes (task 5.4). Approved notes render for everyone; the
 * author additionally sees their own submissions with a PENDING REVIEW tag
 * (RLS serves both in one query). No self-approval path exists — there is no
 * UPDATE policy on the table at all.
 */

import { useCallback, useEffect, useState } from 'react'
import type { InsiderNote, Certification } from '@divemap/db'
import { createClient, getSiteInsiderNotes, submitInsiderNote, useAuth } from '@divemap/db'

interface Props {
  siteId: string
}

function noteAuthor(note: InsiderNote): string {
  const name = note.user?.username ? `@${note.user.username}` : note.user?.display_name ?? 'diver'
  const certs = (note.user?.certifications as Certification[] | null) ?? []
  const topCert = certs[0]?.abbr
  return topCert ? `${name} · ${topCert}` : name
}

export function InsiderNotesSection({ siteId }: Props) {
  const { user } = useAuth()
  const [notes, setNotes] = useState<InsiderNote[]>([])
  const [draft, setDraft] = useState('')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(() => {
    getSiteInsiderNotes(siteId, createClient()).then(setNotes).catch(() => {})
  }, [siteId])

  useEffect(reload, [reload])

  async function submit() {
    if (!user || busy) return
    const body = draft.trim()
    if (body.length < 20) { setError('At least 20 characters — make it useful.'); return }
    setBusy(true)
    setError(null)
    const { error: err } = await submitInsiderNote(siteId, user.id, body, createClient())
    setBusy(false)
    if (err) { setError(err); return }
    setDraft('')
    setOpen(false)
    reload()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
      {notes.map((n) => (
        <div
          key={n.id}
          style={{
            background: 'var(--chip)',
            border: `1px solid ${n.status === 'approved' ? 'rgba(0,180,216,0.4)' : 'var(--line)'}`,
            borderRadius: '14px', padding: '13px 14px',
            display: 'flex', flexDirection: 'column', gap: '7px',
            opacity: n.status === 'approved' ? 1 : 0.75,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <span className="font-mono font-bold" style={{ fontSize: '10px', color: 'var(--acc)', letterSpacing: '0.14em' }}>
              ◆ INSIDER NOTE
            </span>
            {n.status !== 'approved' && (
              <span className="font-mono font-bold" style={{ fontSize: '8px', color: 'var(--warn)', border: '1px solid var(--warn)', borderRadius: '4px', padding: '2px 6px', letterSpacing: '0.1em' }}>
                {n.status === 'pending' ? 'PENDING REVIEW' : 'NOT APPROVED'}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--tx)', lineHeight: 1.6, fontWeight: 500 }}>{n.body}</p>
          <span className="font-mono" style={{ fontSize: '10px', color: 'var(--tx3)' }}>
            — {noteAuthor(n)} · {new Date(n.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()}
          </span>
        </div>
      ))}

      {user && !open && (
        <button
          onClick={() => setOpen(true)}
          className="font-bold"
          style={{
            alignSelf: 'flex-start', fontSize: '12px', color: 'var(--acc)', cursor: 'pointer',
            border: '1.5px dashed var(--acc)', background: 'transparent',
            borderRadius: '12px', padding: '9px 14px',
          }}
        >
          + Share an insider note
        </button>
      )}

      {user && open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="The tip only locals know — entries, currents, what the guides skip…"
            maxLength={1000}
            rows={3}
            style={{
              background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '12px',
              padding: '12px', fontSize: '13px', color: 'var(--tx)', resize: 'vertical',
              fontFamily: 'inherit', outline: 'none',
            }}
          />
          {error && <span style={{ fontSize: '11.5px', color: 'var(--dang)', fontWeight: 500 }}>{error}</span>}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={submit}
              disabled={busy}
              className="font-bold"
              style={{
                fontSize: '12.5px', color: '#02222e', background: 'var(--acc)', cursor: 'pointer',
                border: 'none', borderRadius: '12px', padding: '10px 16px', opacity: busy ? 0.6 : 1,
              }}
            >
              {busy ? 'Submitting…' : 'Submit for review'}
            </button>
            <button
              onClick={() => { setOpen(false); setError(null) }}
              style={{ fontSize: '12px', color: 'var(--tx3)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <span className="font-mono" style={{ fontSize: '9px', color: 'var(--tx3)', marginLeft: 'auto', letterSpacing: '0.06em' }}>
              REVIEWED BEFORE PUBLISHING
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

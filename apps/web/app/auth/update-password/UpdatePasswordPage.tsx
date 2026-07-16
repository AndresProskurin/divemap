'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useSignIn } from '@divemap/db'

export function UpdatePasswordPage() {
  const router = useRouter()
  const { updatePassword } = useSignIn()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await updatePassword(password)
    if (err) {
      setError(err.message)
      setLoading(false)
    } else {
      setDone(true)
      setTimeout(() => router.push('/profile'), 1800)
    }
  }

  if (done) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center' }}>
          <div
            style={{
              width: '72px', height: '72px', borderRadius: '50%',
              background: 'rgba(51,214,195,0.12)', border: '1.5px solid var(--ok)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M6 14l6 6 10-10" stroke="var(--ok)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="font-extrabold" style={{ fontSize: '22px', color: 'var(--tx)' }}>Password updated</div>
            <div className="font-medium" style={{ fontSize: '13px', color: 'var(--tx3)' }}>
              You&apos;re all set. Taking you to your profile…
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
      <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <circle cx="20" cy="20" r="18" stroke="var(--acc)" strokeWidth="2" fill="none" />
            <circle cx="20" cy="20" r="3" fill="var(--acc)" />
            <line x1="20" y1="2" x2="20" y2="10" stroke="var(--acc)" strokeWidth="2" strokeLinecap="round" />
            <line x1="20" y1="30" x2="20" y2="38" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="2" y1="20" x2="10" y2="20" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="30" y1="20" x2="38" y2="20" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <div className="font-mono font-bold" style={{ fontSize: '18px', color: 'var(--tx)', letterSpacing: '0.12em' }}>DIVEMAP</div>
        </div>

        {/* Heading */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div className="font-extrabold" style={{ fontSize: '24px', color: 'var(--tx)' }}>New password</div>
          <div className="font-medium" style={{ fontSize: '13px', color: 'var(--tx3)' }}>Choose a strong password of at least 8 characters.</div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(255,93,125,0.1)', border: '1px solid rgba(255,93,125,0.4)', borderRadius: '12px', padding: '12px 14px', fontSize: '12.5px', color: 'var(--dang)', fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="password"
            placeholder="New password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              padding: '13px 14px', borderRadius: '12px', border: '1px solid var(--line)',
              background: 'var(--card)', fontSize: '14px', color: 'var(--tx)', fontWeight: 500,
              outline: 'none',
            }}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            required
            minLength={8}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            style={{
              padding: '13px 14px', borderRadius: '12px', border: '1px solid var(--line)',
              background: 'var(--card)', fontSize: '14px', color: 'var(--tx)', fontWeight: 500,
              outline: 'none',
            }}
          />
          {password.length > 0 && confirm.length > 0 && (
            <div
              className="font-mono font-semibold"
              style={{
                fontSize: '10.5px',
                color: password === confirm ? 'var(--ok)' : 'var(--dang)',
                letterSpacing: '0.05em',
              }}
            >
              {password === confirm ? '✓ Passwords match' : '✗ Passwords do not match'}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '14px', borderRadius: '14px', border: 'none',
              background: 'var(--acc)', fontWeight: 700, fontSize: '14.5px', color: '#02222e',
              cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 6px 16px rgba(0,180,216,0.3)',
              opacity: loading ? 0.7 : 1, marginTop: '2px',
            }}
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}

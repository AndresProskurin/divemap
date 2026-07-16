'use client'

import { useState, FormEvent } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useSignIn } from '@divemap/db'
import { createClient } from '@divemap/db'

export function SignUpPage() {
  const params = useSearchParams()
  const next = params.get('next') ?? '/profile'

  const { signUpWithEmail, signInWithGoogle } = useSignIn()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError(null)

    const { error: err, data } = await signUpWithEmail(email, password)
    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    // If session exists immediately (no email verification required), update display_name
    if (data.session && name.trim()) {
      const supabase = createClient()
      await supabase.from('users').upsert({
        id: data.session.user.id,
        email,
        display_name: name.trim(),
      })
    }

    setDone(true)
    setLoading(false)
  }

  async function handleGoogle() {
    setLoading(true)
    await signInWithGoogle()
  }

  if (done) {
    return (
      <div style={{ background: 'var(--bg)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', animation: 'dmFade 0.3s ease' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', border: '3px solid var(--ok)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="28" height="22" viewBox="0 0 28 22">
              <path d="M2 11L10 19L26 3" stroke="var(--ok)" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="font-extrabold text-center" style={{ fontSize: '22px', color: 'var(--tx)' }}>Check your email</div>
          <div className="font-medium text-center" style={{ fontSize: '13px', color: 'var(--tx2)', lineHeight: 1.6, maxWidth: '280px' }}>
            We sent a confirmation link to <strong style={{ color: 'var(--tx)' }}>{email}</strong>. Click it to activate your account.
          </div>
          <Link
            href="/auth/sign-in"
            style={{ marginTop: '8px', border: '1.5px solid var(--line)', borderRadius: '13px', padding: '12px 32px', fontWeight: 700, fontSize: '13.5px', color: 'var(--tx2)', textDecoration: 'none' }}
          >
            Back to sign in
          </Link>
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
          <div className="font-extrabold" style={{ fontSize: '24px', color: 'var(--tx)' }}>Create account</div>
          <div className="font-medium" style={{ fontSize: '13px', color: 'var(--tx3)' }}>Free forever. No spam.</div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(255,93,125,0.1)', border: '1px solid rgba(255,93,125,0.4)', borderRadius: '12px', padding: '12px 14px', fontSize: '12.5px', color: 'var(--dang)', fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '13px', borderRadius: '14px', border: '1.5px solid var(--line)',
            background: 'var(--card)', cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600, fontSize: '14px', color: 'var(--tx)', opacity: loading ? 0.6 : 1,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908C16.658 14.258 17.64 11.946 17.64 9.2Z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
          <span className="font-medium" style={{ fontSize: '11px', color: 'var(--tx3)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            type="text"
            placeholder="Display name (optional)"
            value={name}
            onChange={e => setName(e.target.value)}
            style={{
              padding: '13px 14px', borderRadius: '12px', border: '1px solid var(--line)',
              background: 'var(--card)', fontSize: '14px', color: 'var(--tx)', fontWeight: 500,
              outline: 'none',
            }}
          />
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              padding: '13px 14px', borderRadius: '12px', border: '1px solid var(--line)',
              background: 'var(--card)', fontSize: '14px', color: 'var(--tx)', fontWeight: 500,
              outline: 'none',
            }}
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
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
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        {/* Sign-in link */}
        <div style={{ textAlign: 'center' }}>
          <Link href={`/auth/sign-in${next !== '/profile' ? `?next=${encodeURIComponent(next)}` : ''}`} style={{ fontSize: '13px', fontWeight: 500, color: 'var(--acc)', textDecoration: 'none' }}>
            Already have an account? Sign in →
          </Link>
        </div>
      </div>
    </div>
  )
}

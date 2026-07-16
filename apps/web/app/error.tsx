'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div
      style={{
        background: 'var(--bg)',
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        textAlign: 'center',
        gap: '20px',
      }}
    >
      {/* Gauge icon */}
      <div style={{ position: 'relative', width: '72px', height: '72px' }}>
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="36" cy="36" r="32" stroke="var(--line)" strokeWidth="1.5" />
          <circle cx="36" cy="36" r="20" stroke="var(--line)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="36" cy="36" r="5" fill="var(--dang)" />
          <line x1="36" y1="4" x2="36" y2="18" stroke="var(--dang)" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 48 Q36 20 54 48" stroke="rgba(255,93,125,0.25)" strokeWidth="1.5" fill="none" />
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          className="font-mono font-bold"
          style={{ fontSize: '10px', color: 'var(--dang)', letterSpacing: '0.2em' }}
        >
          SURFACE ABORT
        </div>
        <div
          className="font-extrabold"
          style={{ fontSize: '24px', color: 'var(--tx)', letterSpacing: '-0.01em' }}
        >
          Something went wrong
        </div>
        <div
          className="font-medium"
          style={{ fontSize: '13px', color: 'var(--tx3)', maxWidth: '280px' }}
        >
          An unexpected error occurred. Try again or head back to surface.
        </div>
        {error.digest && (
          <div
            className="font-mono"
            style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.08em', marginTop: '2px' }}
          >
            {error.digest}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '260px' }}>
        <button
          onClick={reset}
          style={{
            padding: '13px',
            borderRadius: '14px',
            background: 'var(--acc)',
            fontWeight: 700,
            fontSize: '14px',
            color: '#02222e',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 6px 16px rgba(0,180,216,0.3)',
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            display: 'block',
            padding: '12px',
            borderRadius: '14px',
            border: '1px solid var(--line)',
            background: 'var(--card)',
            fontWeight: 600,
            fontSize: '13.5px',
            color: 'var(--tx2)',
            textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          Back to the map
        </Link>
      </div>
    </div>
  )
}

import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404 — Page Not Found · DiveMap',
}

export default function NotFound() {
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
      {/* Depth marker illustration */}
      <div style={{ position: 'relative', width: '80px', height: '80px' }}>
        <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
          <circle cx="40" cy="40" r="36" stroke="var(--line)" strokeWidth="1.5" />
          <circle cx="40" cy="40" r="24" stroke="var(--line)" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="40" cy="40" r="6" fill="var(--acc)" />
          {/* Depth line */}
          <line x1="40" y1="4" x2="40" y2="22" stroke="var(--acc)" strokeWidth="2" strokeLinecap="round" />
          {/* Crossed out */}
          <line x1="18" y1="18" x2="62" y2="62" stroke="rgba(255,93,125,0.5)" strokeWidth="2" strokeLinecap="round" />
          <line x1="62" y1="18" x2="18" y2="62" stroke="rgba(255,93,125,0.5)" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          className="font-mono font-bold"
          style={{ fontSize: '11px', color: 'var(--dang)', letterSpacing: '0.2em' }}
        >
          404
        </div>
        <div
          className="font-extrabold"
          style={{ fontSize: '26px', color: 'var(--tx)', letterSpacing: '-0.01em' }}
        >
          Dive site not found
        </div>
        <div
          className="font-medium"
          style={{ fontSize: '13px', color: 'var(--tx3)', maxWidth: '300px' }}
        >
          The page you&apos;re looking for is somewhere below the thermocline.
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px' }}>
        <Link
          href="/"
          style={{
            display: 'block',
            padding: '13px',
            borderRadius: '14px',
            background: 'var(--acc)',
            fontWeight: 700,
            fontSize: '14px',
            color: '#02222e',
            textDecoration: 'none',
            textAlign: 'center',
            boxShadow: '0 6px 16px rgba(0,180,216,0.3)',
          }}
        >
          Back to the map
        </Link>
        <Link
          href="/sites"
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
          Browse dive sites
        </Link>
      </div>
    </div>
  )
}

export default function RootLoading() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ animation: 'spin 1.2s linear infinite' }}>
          <circle cx="16" cy="16" r="13" stroke="var(--line)" strokeWidth="2" />
          <path d="M16 3 A13 13 0 0 1 29 16" stroke="var(--acc)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div className="font-mono" style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.15em' }}>LOADING</div>
      </div>
    </div>
  )
}

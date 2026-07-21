function SkeletonCard() {
  return (
    <div
      style={{
        background: 'var(--card)', border: '1px solid var(--line)',
        borderRadius: '16px', padding: '14px',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}
    >
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--card2)', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ height: '14px', borderRadius: '6px', background: 'var(--card2)', width: '60%' }} />
          <div style={{ height: '10px', borderRadius: '6px', background: 'var(--card2)', width: '35%' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[48, 56, 44].map((w, i) => (
          <div key={i} style={{ height: '22px', borderRadius: '10px', background: 'var(--card2)', width: `${w}px` }} />
        ))}
      </div>
    </div>
  )
}

export default function SitesLoading() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      {/* Header skeleton */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)', padding: '52px 16px 14px' }}>
        <div style={{ height: '22px', borderRadius: '8px', background: 'var(--card2)', width: '120px', marginBottom: '8px' }} />
        {/* Filter chips */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', overflowX: 'hidden' }}>
          {[60, 48, 52, 44, 60].map((w, i) => (
            <div key={i} style={{ height: '28px', borderRadius: '20px', background: 'var(--card2)', width: `${w}px`, flexShrink: 0 }} />
          ))}
        </div>
      </div>
      {/* Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px' }}>
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    </div>
  )
}

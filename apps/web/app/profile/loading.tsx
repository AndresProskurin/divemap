export default function ProfileLoading() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      {/* Hero */}
      <div style={{ background: 'var(--bg2)', padding: '52px 16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', borderBottom: '1px solid var(--line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--card2)', flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
            <div style={{ height: '18px', borderRadius: '8px', background: 'var(--card2)', width: '45%' }} />
            <div style={{ height: '11px', borderRadius: '6px', background: 'var(--card2)', width: '30%' }} />
          </div>
        </div>
        {/* Stats bar */}
        <div style={{ display: 'flex', gap: '0', background: 'var(--card)', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--line)' }}>
          {[1, 2, 3].map((_, i) => (
            <div key={i} style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', borderRight: i < 2 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ height: '20px', borderRadius: '6px', background: 'var(--card2)', width: '32px' }} />
              <div style={{ height: '8px', borderRadius: '4px', background: 'var(--card2)', width: '40px' }} />
            </div>
          ))}
        </div>
      </div>
      {/* Dive list skeleton */}
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '14px', padding: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--card2)', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <div style={{ height: '12px', borderRadius: '6px', background: 'var(--card2)', width: '60%' }} />
              <div style={{ height: '9px', borderRadius: '6px', background: 'var(--card2)', width: '38%' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

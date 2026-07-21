export default function SiteDetailLoading() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      {/* Hero */}
      <div style={{ background: 'var(--bg2)', height: '260px', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '20px 16px' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(5,20,34,0.92))' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ height: '12px', borderRadius: '6px', background: 'var(--card2)', width: '60px' }} />
          <div style={{ height: '28px', borderRadius: '8px', background: 'var(--card2)', width: '70%' }} />
          <div style={{ height: '12px', borderRadius: '6px', background: 'var(--card2)', width: '40%' }} />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)', padding: '0 16px', display: 'flex', gap: '4px' }}>
        {[80, 88, 64, 80, 88].map((w, i) => (
          <div key={i} style={{ height: '38px', display: 'flex', alignItems: 'center', paddingRight: '8px' }}>
            <div style={{ height: '10px', borderRadius: '6px', background: i === 0 ? 'var(--acc)' : 'var(--card2)', width: `${w}px`, opacity: i === 0 ? 1 : 0.4 }} />
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Chips */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[80, 70, 88, 76].map((w, i) => (
            <div key={i} style={{ height: '52px', borderRadius: '14px', background: 'var(--card)', border: '1px solid var(--line)', width: `${w}px`, flexShrink: 0 }} />
          ))}
        </div>
        {/* Text blocks */}
        {[100, 90, 75, 85, 60].map((w, i) => (
          <div key={i} style={{ height: '13px', borderRadius: '6px', background: 'var(--card2)', width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}

function SkeletonReport() {
  return (
    <div
      style={{
        background: 'var(--card)', border: '1px solid var(--line)',
        borderRadius: '16px', padding: '14px',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
          <div style={{ height: '13px', borderRadius: '6px', background: 'var(--card2)', width: '55%' }} />
          <div style={{ height: '9px', borderRadius: '6px', background: 'var(--card2)', width: '28%' }} />
        </div>
        <div style={{ height: '9px', borderRadius: '6px', background: 'var(--card2)', width: '40px' }} />
      </div>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ height: '18px', borderRadius: '6px', background: 'var(--card2)', width: '48px' }} />
          <div style={{ height: '3px', borderRadius: '2px', background: 'var(--card2)', width: '60px' }} />
        </div>
        <div style={{ height: '18px', borderRadius: '6px', background: 'var(--card2)', width: '24px' }} />
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ height: '30px', borderRadius: '6px', background: 'var(--card2)', width: '32px' }} />
          <div style={{ height: '30px', borderRadius: '6px', background: 'var(--card2)', width: '32px' }} />
        </div>
      </div>
    </div>
  )
}

export default function ConditionsLoading() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--line)', padding: '52px 16px 14px' }}>
        <div style={{ height: '22px', borderRadius: '8px', background: 'var(--card2)', width: '160px', marginBottom: '4px' }} />
        <div style={{ height: '10px', borderRadius: '6px', background: 'var(--card2)', width: '200px' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '14px 16px' }}>
        {Array.from({ length: 8 }).map((_, i) => <SkeletonReport key={i} />)}
      </div>
    </div>
  )
}

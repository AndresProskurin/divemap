'use client'

import Link from 'next/link'
import type { Operator } from '@divemap/db'

interface Props {
  operators: Operator[]
}

export function OperatorsTab({ operators }: Props) {
  return (
    <div className="flex flex-col gap-[10px] p-4" style={{ animation: 'dmFade 0.25s ease' }}>
      <p style={{ fontSize: '10.5px', color: 'var(--tx3)', fontWeight: 500 }}>
        Vetted in person by DiveMap technical advisors.
      </p>

      {operators.length === 0 ? (
        <p style={{ fontSize: '13px', color: 'var(--tx3)', fontStyle: 'italic' }}>
          No operators listed for this site yet.
        </p>
      ) : (
        operators.map((op) => (
          <div
            key={op.id}
            className="flex flex-col gap-[6px] rounded-14 px-[14px] py-[13px]"
            style={{ border: '1px solid var(--line)', background: 'var(--card)' }}
          >
            <div className="flex justify-between items-center gap-2">
              <Link
                href={`/operators/${op.slug}`}
                style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--tx)', textDecoration: 'none' }}
              >
                {op.name}
              </Link>
              {op.tech_certified && (
                <span
                  className="font-mono font-bold flex-none"
                  style={{
                    fontSize: '8.5px',
                    color: 'var(--acc)',
                    border: '1px solid var(--acc)',
                    borderRadius: '5px',
                    padding: '3px 6px',
                    letterSpacing: '0.1em',
                  }}
                >
                  TECH VETTED ✓
                </span>
              )}
            </div>

            {op.base && (
              <span style={{ fontSize: '11px', color: 'var(--tx3)', fontWeight: 500 }}>
                {op.base} · {op.country}
              </span>
            )}

            {op.certs_offered.length > 0 && (
              <span
                className="font-mono"
                style={{ fontSize: '10.5px', color: 'var(--tx2)' }}
              >
                {op.certs_offered.join(' · ')}
              </span>
            )}

            <div className="flex items-center justify-between">
              {op.rating != null && (
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--tx2)' }}>
                  ★ {op.rating.toFixed(1)}
                  {op.tech_dives_guided > 0 && (
                    <span style={{ color: 'var(--tx3)' }}>
                      {' '}· {op.tech_dives_guided} tech dives guided
                    </span>
                  )}
                </span>
              )}
              <span style={{ display: 'inline-flex', gap: '7px', flexWrap: 'wrap' }}>
                {op.phone && (
                  <a
                    href={`tel:${op.phone.replace(/\s+/g, '')}`}
                    className="font-semibold rounded-full px-[12px] py-[6px]"
                    style={{ fontSize: '11px', border: '1px solid var(--line)', color: 'var(--tx2)', textDecoration: 'none' }}
                  >
                    📞 Call
                  </a>
                )}
                {op.email && (
                  <a
                    href={`mailto:${op.email}`}
                    className="font-semibold rounded-full px-[12px] py-[6px]"
                    style={{ fontSize: '11px', border: '1px solid var(--line)', color: 'var(--tx2)', textDecoration: 'none' }}
                  >
                    ✉️ Email
                  </a>
                )}
                {op.website && (
                  <a
                    href={op.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold rounded-full px-[13px] py-[6px]"
                    style={{ fontSize: '11.5px', background: 'var(--acc)', color: '#02222e', textDecoration: 'none' }}
                  >
                    🌐 Website
                  </a>
                )}
              </span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}

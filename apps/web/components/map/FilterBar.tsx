'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { colors } from '@divemap/ui'

export type FilterKey = 'depth' | 'current' | 'type' | 'tech'

interface Chip {
  key: FilterKey
  label: string
  value?: string
}

const CHIPS: Chip[] = [
  { key: 'depth',   label: 'Depth ▾' },
  { key: 'current', label: 'Current ▾' },
  { key: 'type',    label: 'Reef',  value: 'reef'  },
  { key: 'type',    label: 'Wreck', value: 'wreck' },
  { key: 'type',    label: 'Wall',  value: 'wall'  },
  { key: 'type',    label: 'Cave',  value: 'cave'  },
  { key: 'tech',    label: 'Tech-friendly' },
]

function chipId(c: Chip) { return c.value ? `${c.key}:${c.value}` : c.key }

interface FilterBarProps {
  className?: string
}

export function FilterBar({ className = '' }: FilterBarProps) {
  const router     = useRouter()
  const pathname   = usePathname()
  const params     = useSearchParams()

  const isActive = useCallback(
    (chip: Chip): boolean => {
      if (chip.key === 'type' && chip.value) return params.get('type') === chip.value
      if (chip.key === 'tech') return params.get('tech') === '1'
      // depth / current: active when any value set
      return params.has(chip.key)
    },
    [params]
  )

  const toggle = useCallback(
    (chip: Chip) => {
      const next = new URLSearchParams(params.toString())
      if (chip.key === 'type' && chip.value) {
        if (params.get('type') === chip.value) next.delete('type')
        else next.set('type', chip.value)
      } else if (chip.key === 'tech') {
        if (params.get('tech') === '1') next.delete('tech')
        else next.set('tech', '1')
      } else {
        // depth / current chips open a future picker; for now toggle presence
        if (params.has(chip.key)) next.delete(chip.key)
        else next.set(chip.key, '1')
      }
      router.replace(`${pathname}?${next.toString()}`, { scroll: false })
    },
    [params, pathname, router]
  )

  return (
    <div
      className={`flex gap-[7px] overflow-x-auto py-0 ${className}`}
      style={{ scrollbarWidth: 'none' }}
    >
      {CHIPS.map((chip) => {
        const active = isActive(chip)
        return (
          <button
            key={chipId(chip)}
            onClick={() => toggle(chip)}
            className="flex-none whitespace-nowrap rounded-full text-[11.5px] font-semibold border transition-colors"
            style={{
              fontFamily: "'Archivo', sans-serif",
              padding: '8px 13px',
              color:      active ? colors.acc  : colors.tx3,
              background: active ? colors.chip : 'transparent',
              borderColor: active ? colors.acc : colors.line,
            }}
          >
            {chip.label}
          </button>
        )
      })}
    </div>
  )
}

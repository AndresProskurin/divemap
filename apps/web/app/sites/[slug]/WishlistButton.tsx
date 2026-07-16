'use client'

import { useState, useEffect } from 'react'
import { createClient, getWishlistItem, addToWishlist, removeFromWishlist } from '@divemap/db'

interface Props {
  siteId: string
  siteSlug: string
}

export function WishlistButton({ siteId, siteSlug }: Props) {
  const [wishlistItemId, setWishlistItemId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return
      const item = await getWishlistItem(user.id, siteId, supabase)
      if (!cancelled) {
        setWishlistItemId(item?.id ?? null)
      }
    }
    void check()
    return () => { cancelled = true }
  }, [siteId])

  async function toggle() {
    if (loading) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = `/auth/sign-in?next=/sites/${siteSlug}`
        return
      }
      if (wishlistItemId) {
        await removeFromWishlist(wishlistItemId, supabase)
        setWishlistItemId(null)
      } else {
        const { id } = await addToWishlist(user.id, siteId, supabase)
        setWishlistItemId(id)
      }
    } finally {
      setLoading(false)
    }
  }

  const saved = wishlistItemId !== null

  return (
    <button
      onClick={toggle}
      aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
      style={{
        width: '38px', height: '38px', borderRadius: '50%',
        background: 'rgba(4,18,31,0.7)', backdropFilter: 'blur(8px)',
        border: 'none', cursor: loading ? 'default' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'opacity 0.15s',
        opacity: loading ? 0.6 : 1,
      }}
    >
      <svg width="14" height="17" viewBox="0 0 14 17">
        <path
          d="M2 2h10v13l-5-3.4L2 15V2z"
          fill={saved ? 'var(--acc)' : 'none'}
          stroke={saved ? 'var(--acc)' : '#eaf6fd'}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  )
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, followUser, unfollowUser, isFollowing, useAuth } from '@divemap/db'

interface Props {
  profileUserId: string
  /** Server-rendered follower count; adjusted optimistically on toggle. */
  initialFollowers: number
}

export function FollowButton({ profileUserId, initialFollowers }: Props) {
  const { user, loading } = useAuth()
  const [following, setFollowing] = useState<boolean | null>(null)
  const [followers, setFollowers] = useState(initialFollowers)
  const [busy, setBusy] = useState(false)

  const isSelf = user?.id === profileUserId

  useEffect(() => {
    if (!user || isSelf) return
    let cancelled = false
    isFollowing(user.id, profileUserId, createClient()).then((v) => {
      if (!cancelled) setFollowing(v)
    })
    return () => { cancelled = true }
  }, [user, profileUserId, isSelf])

  async function toggle() {
    if (!user || following === null || busy) return
    setBusy(true)
    const supabase = createClient()
    // Optimistic: flip immediately, roll back on error.
    setFollowing(!following)
    setFollowers((n) => n + (following ? -1 : 1))
    const { error } = following
      ? await unfollowUser(user.id, profileUserId, supabase)
      : await followUser(user.id, profileUserId, supabase)
    if (error) {
      setFollowing(following)
      setFollowers((n) => n + (following ? 1 : -1))
    }
    setBusy(false)
  }

  const counter = (
    <span className="font-mono font-semibold" style={{ fontSize: '10px', color: 'var(--tx3)', letterSpacing: '0.06em' }}>
      {followers} {followers === 1 ? 'FOLLOWER' : 'FOLLOWERS'}
    </span>
  )

  if (loading) return counter
  if (isSelf) return counter

  if (!user) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
        {counter}
        <Link
          href="/auth/sign-in"
          className="font-bold"
          style={{
            fontSize: '12px', color: 'var(--acc)', border: '1.5px solid var(--acc)',
            borderRadius: '999px', padding: '6px 14px', textDecoration: 'none',
          }}
        >
          Follow
        </Link>
      </span>
    )
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
      {counter}
      <button
        onClick={toggle}
        disabled={busy || following === null}
        className="font-bold"
        style={{
          fontSize: '12px', cursor: 'pointer', borderRadius: '999px', padding: '6px 14px',
          color: following ? 'var(--tx2)' : '#02222e',
          background: following ? 'transparent' : 'var(--acc)',
          border: following ? '1.5px solid var(--line)' : '1.5px solid var(--acc)',
          opacity: following === null ? 0.5 : 1,
        }}
      >
        {following === null ? '…' : following ? 'Following ✓' : 'Follow'}
      </button>
    </span>
  )
}

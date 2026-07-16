'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User } from '@divemap/db'
import { createClient, updateUserProfile } from '@divemap/db'

interface Props {
  user: User
}

const INPUT_STYLE = {
  padding: '13px 14px',
  borderRadius: '12px',
  border: '1px solid var(--line)',
  background: 'var(--card)',
  fontSize: '14px',
  color: 'var(--tx)',
  fontWeight: 500,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box' as const,
}

const LABEL_STYLE = {
  fontSize: '10px',
  fontWeight: 600,
  color: 'var(--tx3)',
  letterSpacing: '0.09em',
  textTransform: 'uppercase' as const,
  marginBottom: '6px',
}

export function EditProfilePage({ user }: Props) {
  const router = useRouter()

  const [displayName, setDisplayName] = useState(user.display_name ?? '')
  const [bio, setBio] = useState(user.bio ?? '')
  const [homeCountry, setHomeCountry] = useState(user.home_country ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaved(false)

    const supabase = createClient()
    const { error: err } = await updateUserProfile(
      user.id,
      {
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        home_country: homeCountry.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      },
      supabase,
    )

    if (err) {
      setError(err)
      setLoading(false)
    } else {
      setSaved(true)
      setLoading(false)
      setTimeout(() => router.push('/profile'), 1200)
    }
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh', paddingTop: '0' }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'var(--bg2)', borderBottom: '1px solid var(--line)',
          padding: '16px 16px',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}
      >
        <Link
          href="/profile"
          style={{
            width: '34px', height: '34px', borderRadius: '50%',
            border: '1px solid var(--line)', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            textDecoration: 'none', flexShrink: 0,
          }}
        >
          <svg width="10" height="16" viewBox="0 0 10 16">
            <path d="M8 2L2.5 8L8 14" stroke="var(--tx2)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="font-bold" style={{ fontSize: '17px', color: 'var(--tx)', flex: 1 }}>Edit Profile</div>
        <button
          form="edit-profile-form"
          type="submit"
          disabled={loading || saved}
          className="font-mono font-bold"
          style={{
            fontSize: '10px', letterSpacing: '0.1em', padding: '7px 13px',
            borderRadius: '999px', border: 'none',
            background: saved ? 'rgba(51,214,195,0.15)' : 'var(--acc)',
            color: saved ? 'var(--ok)' : '#02222e',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all 0.2s',
          }}
        >
          {saved ? 'SAVED ✓' : loading ? 'SAVING…' : 'SAVE'}
        </button>
      </div>

      {/* Form */}
      <form
        id="edit-profile-form"
        onSubmit={handleSubmit}
        style={{ padding: '24px 16px', display: 'flex', flexDirection: 'column', gap: '20px' }}
      >
        {/* Avatar preview */}
        <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: '4px' }}>
          <div
            style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(160deg, #0077b6 0%, #023e8a 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', border: '2px solid var(--line)',
            }}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="Avatar preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span className="font-bold" style={{ fontSize: '26px', color: '#caf0f8' }}>
                {(displayName || user.email)[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(255,93,125,0.1)', border: '1px solid rgba(255,93,125,0.4)', borderRadius: '12px', padding: '12px 14px', fontSize: '12.5px', color: 'var(--dang)', fontWeight: 500 }}>
            {error}
          </div>
        )}

        {/* Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={LABEL_STYLE}>Display name</div>
          <input
            type="text"
            placeholder="Your name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            maxLength={80}
            style={INPUT_STYLE}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={LABEL_STYLE}>Bio</div>
          <textarea
            placeholder="A few words about you…"
            value={bio}
            onChange={e => setBio(e.target.value)}
            maxLength={280}
            rows={3}
            style={{
              ...INPUT_STYLE,
              resize: 'none',
              lineHeight: 1.5,
              fontFamily: 'inherit',
            }}
          />
          <div className="font-mono" style={{ fontSize: '10px', color: 'var(--tx3)', textAlign: 'right' }}>
            {bio.length}/280
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={LABEL_STYLE}>Home country</div>
          <input
            type="text"
            placeholder="e.g. Iceland"
            value={homeCountry}
            onChange={e => setHomeCountry(e.target.value)}
            maxLength={60}
            style={INPUT_STYLE}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={LABEL_STYLE}>Avatar URL</div>
          <input
            type="url"
            placeholder="https://…"
            value={avatarUrl}
            onChange={e => setAvatarUrl(e.target.value)}
            style={INPUT_STYLE}
          />
          <div className="font-medium" style={{ fontSize: '10.5px', color: 'var(--tx3)' }}>
            Paste a public image URL. Photo upload coming soon.
          </div>
        </div>

        {/* Email (read-only) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={LABEL_STYLE}>Email</div>
          <div
            style={{
              ...INPUT_STYLE,
              color: 'var(--tx3)',
              background: 'rgba(8,28,48,0.5)',
              border: '1px solid rgba(148,196,230,0.08)',
            }}
          >
            {user.email}
          </div>
        </div>
      </form>
    </div>
  )
}

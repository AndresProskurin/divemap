'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { User, Certification, GearItem } from '@divemap/db'
import { createClient, updateUserProfile, CERT_CATALOG, GEAR_CATEGORIES } from '@divemap/db'

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
  const [username, setUsername] = useState(user.username ?? '')
  const [bio, setBio] = useState(user.bio ?? '')
  const [homeCountry, setHomeCountry] = useState(user.home_country ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url ?? '')
  const [certs, setCerts] = useState<Certification[]>(
    (user.certifications as unknown as Certification[] | null) ?? [],
  )
  const [gear, setGear] = useState<GearItem[]>((user.gear as unknown as GearItem[] | null) ?? [])
  // Cert picker state
  const [agencyIdx, setAgencyIdx] = useState(0)
  const [certIdx, setCertIdx] = useState(0)
  const [certYear, setCertYear] = useState(String(new Date().getFullYear()))
  // Gear picker state
  const [gearCat, setGearCat] = useState<string>(GEAR_CATEGORIES[0])
  const [gearName, setGearName] = useState('')

  function addCert() {
    const cat = CERT_CATALOG[agencyIdx]?.certs[certIdx]
    if (!cat) return
    const year = parseInt(certYear, 10)
    if (certs.some(c => c.abbr === cat.abbr && c.org === cat.org)) return
    setCerts(prev => [...prev, { ...cat, year: Number.isNaN(year) ? new Date().getFullYear() : year }])
  }

  function addGear() {
    const name = gearName.trim()
    if (!name) return
    setGear(prev => [...prev, { category: gearCat, name }])
    setGearName('')
  }
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSaved(false)

    const uname = username.trim().toLowerCase()
    if (uname && !/^[a-z0-9_]{3,24}$/.test(uname)) {
      setError('Username must be 3–24 characters: a–z, 0–9, underscore.')
      setLoading(false)
      return
    }

    const supabase = createClient()
    const { error: err } = await updateUserProfile(
      user.id,
      {
        ...(uname && uname !== user.username ? { username: uname } : {}),
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        home_country: homeCountry.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        certifications: certs,
        gear,
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
          <div style={LABEL_STYLE}>Username</div>
          <input
            type="text"
            placeholder="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            maxLength={24}
            style={{ ...INPUT_STYLE, fontFamily: "'IBM Plex Mono', monospace" }}
          />
          <div className="font-mono" style={{ fontSize: '10px', color: 'var(--tx3)' }}>
            Public profile: /profile/{username.trim().toLowerCase() || '…'}
          </div>
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


        {/* Certifications */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={LABEL_STYLE}>Certifications</div>
          {certs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {certs.map((c, i) => (
                <span
                  key={`${c.org}-${c.abbr}`}
                  className="font-mono font-bold"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    fontSize: '10px', color: 'var(--acc)', border: '1px solid var(--acc)',
                    borderRadius: '6px', padding: '5px 8px', letterSpacing: '0.06em',
                  }}
                >
                  {c.abbr} · {c.name} · {c.year}
                  <button
                    type="button"
                    onClick={() => setCerts(prev => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove ${c.name}`}
                    style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: '13px', lineHeight: 1, padding: 0 }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={agencyIdx}
              onChange={e => { setAgencyIdx(Number(e.target.value)); setCertIdx(0) }}
              style={{ ...INPUT_STYLE, width: 'auto', flex: '1 1 120px' }}
            >
              {CERT_CATALOG.map((a, i) => <option key={a.agency} value={i}>{a.agency}</option>)}
            </select>
            <select
              value={certIdx}
              onChange={e => setCertIdx(Number(e.target.value))}
              style={{ ...INPUT_STYLE, width: 'auto', flex: '2 1 180px' }}
            >
              {(CERT_CATALOG[agencyIdx]?.certs ?? []).map((c, i) => (
                <option key={c.abbr} value={i}>{c.name}</option>
              ))}
            </select>
            <input
              type="number"
              value={certYear}
              onChange={e => setCertYear(e.target.value)}
              min={1960}
              max={new Date().getFullYear()}
              style={{ ...INPUT_STYLE, width: '92px' }}
            />
            <button
              type="button"
              onClick={addCert}
              className="font-bold"
              style={{
                padding: '0 18px', borderRadius: '12px', border: '1px solid var(--acc)',
                background: 'var(--chip)', color: 'var(--acc)', fontSize: '13px', cursor: 'pointer',
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Gear */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={LABEL_STYLE}>Gear</div>
          {gear.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {gear.map((g, i) => (
                <div
                  key={`${g.category}-${g.name}-${i}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    border: '1px solid var(--line)', background: 'var(--card)',
                    borderRadius: '10px', padding: '8px 12px',
                  }}
                >
                  <span className="font-mono font-semibold" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.08em', width: '86px', flexShrink: 0, textTransform: 'uppercase' }}>
                    {g.category}
                  </span>
                  <span className="font-semibold" style={{ flex: 1, fontSize: '13px', color: 'var(--tx)' }}>{g.name}</span>
                  <button
                    type="button"
                    onClick={() => setGear(prev => prev.filter((_, j) => j !== i))}
                    aria-label={`Remove ${g.name}`}
                    style={{ background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: '15px', lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={gearCat}
              onChange={e => setGearCat(e.target.value)}
              style={{ ...INPUT_STYLE, width: 'auto', flex: '1 1 130px' }}
            >
              {GEAR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input
              type="text"
              placeholder="e.g. Shearwater Perdix 2"
              value={gearName}
              onChange={e => setGearName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGear() } }}
              maxLength={80}
              style={{ ...INPUT_STYLE, width: 'auto', flex: '2 1 200px' }}
            />
            <button
              type="button"
              onClick={addGear}
              className="font-bold"
              style={{
                padding: '0 18px', borderRadius: '12px', border: '1px solid var(--acc)',
                background: 'var(--chip)', color: 'var(--acc)', fontSize: '13px', cursor: 'pointer',
              }}
            >
              Add
            </button>
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

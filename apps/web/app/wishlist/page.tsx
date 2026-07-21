import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import type { Database } from '@divemap/db'
import { getUserWishlist } from '@divemap/db'
import type { WishlistSite } from '@divemap/db'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'My Wishlist — DiveMap',
  description: 'Your saved dive sites.',
}

async function getWishlist(): Promise<{ userId: string; items: WishlistSite[] } | null> {
  const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  if (!url || !key) return null
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(url, key, {
      cookies: {
        getAll: () => {
          try {
            return (cookieStore as unknown as { getAll(): Array<{ name: string; value: string }> }).getAll()
          } catch { return [] }
        },
        setAll: () => {},
      },
    })
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    const items = await getUserWishlist(session.user.id, supabase)
    return { userId: session.user.id, items }
  } catch {
    return null
  }
}

function depthColor(m: number | null | undefined): string {
  if (!m) return 'var(--tx3)'
  if (m < 20) return '#33d6c3'
  if (m < 40) return '#ffb703'
  if (m < 60) return '#ef476f'
  return '#0077b6'
}

function SiteCard({ item }: { item: WishlistSite }) {
  const site = item.site
  const dColor = depthColor(site.depth_max_m)

  return (
    <Link
      href={`/sites/${site.slug}`}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div
        style={{
          background: 'var(--card)',
          border: '1px solid var(--line)',
          borderRadius: '16px',
          borderLeft: `3px solid ${dColor}`,
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
        }}
      >
        {/* Depth badge */}
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: `${dColor}18`,
            border: `1px solid ${dColor}40`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1px',
            flexShrink: 0,
          }}
        >
          <span className="font-mono font-bold" style={{ fontSize: '13px', color: dColor, lineHeight: 1 }}>
            {site.depth_max_m ?? '?'}
          </span>
          <span className="font-mono" style={{ fontSize: '7px', color: dColor, opacity: 0.8, letterSpacing: '0.05em' }}>
            M
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div className="font-bold truncate" style={{ fontSize: '14px', color: 'var(--tx)' }}>
            {site.name}
          </div>
          <div className="font-medium" style={{ fontSize: '11px', color: 'var(--tx3)' }}>
            {site.country ?? 'Unknown location'}
            {site.depth_min_m != null && site.depth_max_m != null && (
              <span className="font-mono" style={{ marginLeft: '8px', color: dColor }}>
                {site.depth_min_m}–{site.depth_max_m}m
              </span>
            )}
          </div>
        </div>

        <svg width="7" height="12" viewBox="0 0 7 12" fill="none" style={{ flexShrink: 0 }}>
          <path d="M1 1l5 5-5 5" stroke="var(--tx3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  )
}

export default async function WishlistPage() {
  const result = await getWishlist()

  if (!result) {
    redirect('/auth/sign-in?next=/wishlist')
  }

  const { items } = result

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      {/* Header */}
      <div
        style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: 'var(--bg2)', borderBottom: '1px solid var(--line)',
          padding: '52px 16px 14px',
          display: 'flex', alignItems: 'center', gap: '12px',
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
        <div style={{ flex: 1 }}>
          <div className="font-extrabold" style={{ fontSize: '20px', color: 'var(--tx)' }}>Wishlist</div>
          <div className="font-medium" style={{ fontSize: '11px', color: 'var(--tx3)' }}>Sites you want to dive</div>
        </div>
        <div className="font-mono font-semibold" style={{ fontSize: '9.5px', color: 'var(--tx3)', letterSpacing: '0.06em' }}>
          {items.length} SITES
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px 16px 48px' }}>
        {items.length === 0 ? (
          <div style={{ padding: '56px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="21" stroke="var(--line)" strokeWidth="1.5" />
              <path
                d="M24 34 C24 34 12 26 12 18 C12 14.134 15.134 11 19 11 C21.239 11 23.21 12.064 24 13.75 C24.79 12.064 26.761 11 29 11 C32.866 11 36 14.134 36 18 C36 26 24 34 24 34Z"
                stroke="var(--line)" strokeWidth="1.5" fill="none"
              />
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div className="font-bold" style={{ fontSize: '15px', color: 'var(--tx)' }}>No sites saved yet</div>
              <div className="font-medium" style={{ fontSize: '12px', color: 'var(--tx3)', maxWidth: '240px' }}>
                Tap the heart on any dive site to add it to your wishlist.
              </div>
            </div>
            <Link
              href="/sites"
              style={{
                padding: '11px 22px',
                borderRadius: '12px',
                background: 'var(--acc)',
                fontWeight: 700,
                fontSize: '13px',
                color: '#02222e',
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(0,180,216,0.3)',
              }}
            >
              Browse dive sites
            </Link>
          </div>
        ) : (
          items.map(item => <SiteCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Prefix-matched. /profile is deliberately NOT here as a bare prefix: public
// diver profiles live at /profile/[username], so only the exact own-profile
// page and /profile/edit are guarded. Usernames can never collide with 'edit'
// (reserved in the users_username_check constraint).
const PROTECTED = ['/log-dive', '/planner', '/profile/edit']
const PROTECTED_EXACT = ['/profile']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: do not add logic between createServerClient and getUser()
  // or auth state may not refresh correctly.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && (PROTECTED.some((p) => pathname.startsWith(p)) || PROTECTED_EXACT.includes(pathname))) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/sign-in'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

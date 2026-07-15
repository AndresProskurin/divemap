import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from './types'

export interface CookieStore {
  getAll(): Array<{ name: string; value: string }>
  set(name: string, value: string, options?: CookieOptions): void
}

export function createServerSupabaseClient(cookieStore: CookieStore) {
  return createServerClient<Database>(
    process.env['NEXT_PUBLIC_SUPABASE_URL']!,
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Components have a read-only cookie store; middleware handles refresh.
          }
        },
      },
    }
  )
}

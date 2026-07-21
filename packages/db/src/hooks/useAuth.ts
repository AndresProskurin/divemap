'use client'

import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { createClient } from '../client'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({ user: session?.user ?? null, session, loading: false })
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({ user: session?.user ?? null, session, loading: false })
    })

    return () => subscription.unsubscribe()
  }, [])

  return state
}

export function useSignIn() {
  const signInWithGoogle = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // Always show the account chooser. Without this Google resolves the
        // session implicitly and pins an `authuser` index into the consent URL;
        // for anyone signed into several Google accounts that index can point at
        // a stale session, and the flow dies with a bare HTTP 400 *after* the
        // password has been accepted. Costs single-account users one extra
        // click, which is cheaper than an unrecoverable dead end.
        queryParams: { prompt: 'select_account' },
      },
    })
  }

  const signInWithEmail = async (email: string, password: string) => {
    const supabase = createClient()
    return supabase.auth.signInWithPassword({ email, password })
  }

  const signUpWithEmail = async (email: string, password: string) => {
    const supabase = createClient()
    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
  }

  const resetPassword = async (email: string) => {
    const supabase = createClient()
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
    })
  }

  const updatePassword = async (newPassword: string) => {
    const supabase = createClient()
    return supabase.auth.updateUser({ password: newPassword })
  }

  return { signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, resetPassword, updatePassword }
}

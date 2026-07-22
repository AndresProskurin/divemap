/**
 * Google sign-in for the native app (Supabase's documented Expo pattern).
 *
 * Email+password can't cover accounts created via Google on the web — they
 * have no password. Flow: signInWithOAuth with skipBrowserRedirect gives us
 * Google's URL; we open it in the system auth browser; Supabase redirects
 * back to this app's deep link, and we build the session from that URL.
 *
 * The redirect URI must be in Supabase → Auth → URL Configuration →
 * Redirect URLs. In Expo Go development that is exp://127.0.0.1:8081;
 * a standalone build will use divemap://** (the app.json scheme).
 */

import * as WebBrowser from 'expo-web-browser'
import * as QueryParams from 'expo-auth-session/build/QueryParams'
import { makeRedirectUri } from 'expo-auth-session'
import { createClient } from './supabase'

WebBrowser.maybeCompleteAuthSession()

async function createSessionFromUrl(url: string): Promise<void> {
  const supabase = createClient()
  const { params, errorCode } = QueryParams.getQueryParams(url)
  if (errorCode) throw new Error(errorCode)

  // PKCE flow returns ?code=…; implicit returns tokens in the fragment.
  // Handle both so a flowType change in the client can't silently break this.
  const code = params['code']
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw new Error(error.message)
    return
  }
  const accessToken = params['access_token']
  const refreshToken = params['refresh_token']
  if (!accessToken || !refreshToken) throw new Error('No session in redirect URL')
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  if (error) throw new Error(error.message)
}

/** Resolves true on success, false if the user cancelled. Throws on errors. */
export async function signInWithGoogle(): Promise<boolean> {
  const supabase = createClient()
  const redirectTo = makeRedirectUri()
  console.log('[googleAuth] redirect URI:', redirectTo)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  })
  if (error || !data?.url) throw new Error(error?.message ?? 'Could not start Google sign-in')

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (result.type !== 'success') return false
  await createSessionFromUrl(result.url)
  return true
}

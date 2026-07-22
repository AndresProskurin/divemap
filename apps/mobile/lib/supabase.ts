/**
 * React Native Supabase client (task 0.4).
 *
 * The shared @divemap/db createClient is a browser client from @supabase/ssr —
 * it persists the session in document.cookie, which does not exist in React
 * Native, and reads NEXT_PUBLIC_* env vars, which Metro never inlines. Every
 * mobile screen imports createClient from here instead; the query helpers in
 * @divemap/db are client-agnostic and keep working unchanged.
 *
 * Session storage is the Supabase-documented "LargeSecureStore" pattern:
 * AES-256-CTR ciphertext in AsyncStorage, per-value random key in
 * expo-secure-store. Sessions routinely exceed SecureStore's 2048-byte value
 * limit, so storing them there directly is unreliable — this keeps the
 * hardware-backed protection without the size ceiling.
 */

import 'react-native-get-random-values'
import * as aesjs from 'aes-js'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@divemap/db'

class LargeSecureStore {
  private async encrypt(key: string, value: string): Promise<string> {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8))
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1))
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value))
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey))
    return aesjs.utils.hex.fromBytes(encrypted)
  }

  private async decrypt(key: string, value: string): Promise<string | null> {
    const encryptionKeyHex = await SecureStore.getItemAsync(key)
    if (!encryptionKeyHex) return null
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1),
    )
    const decrypted = cipher.decrypt(aesjs.utils.hex.toBytes(value))
    return aesjs.utils.utf8.fromBytes(decrypted)
  }

  async getItem(key: string): Promise<string | null> {
    const encrypted = await AsyncStorage.getItem(key)
    if (!encrypted) return null
    return this.decrypt(key, encrypted)
  }

  async setItem(key: string, value: string): Promise<void> {
    const encrypted = await this.encrypt(key, value)
    await AsyncStorage.setItem(key, encrypted)
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key)
    await SecureStore.deleteItemAsync(key)
  }
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

let client: SupabaseClient<Database> | null = null

/** Same call-signature as the web helper so screens swap only the import. */
export function createClient(): SupabaseClient<Database> {
  if (client) return client
  if (!url || !anonKey) {
    throw new Error(
      'EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY are not set — ' +
        'copy apps/mobile/.env.example to apps/mobile/.env and restart expo.',
    )
  }
  client = createSupabaseClient<Database>(url, anonKey, {
    auth: {
      storage: new LargeSecureStore(),
      autoRefreshToken: true,
      persistSession: true,
      // No OAuth redirect URLs land in a native app's location bar.
      detectSessionInUrl: false,
    },
  })
  return client
}

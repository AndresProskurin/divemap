/**
 * Mobile photo pipeline: pick from the library, downscale to the same 1920 px
 * long edge the web uploader produces, upload JPEG to the site-photos bucket,
 * insert the site_photos metadata row.
 *
 * Storage keys mirror the web: site-photos/{siteId}/{timestamp}.jpg. The
 * bucket accepts image/jpeg only (5 MB cap) — see the storage migration.
 */

import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { createClient } from './supabase'

const MAX_EDGE = 1920

export interface PickedPhoto {
  uri: string
  width: number
  height: number
}

/** Opens the system library. Resolves null if the user cancels. */
export async function pickPhoto(): Promise<PickedPhoto | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return null
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: false,
  })
  const asset = result.assets?.[0]
  if (result.canceled || !asset) return null
  return { uri: asset.uri, width: asset.width, height: asset.height }
}

/**
 * Uploads to storage and writes the metadata row.
 * Returns the public URL, or throws with a user-presentable message.
 */
export async function uploadSitePhoto(
  photo: PickedPhoto,
  siteId: string,
  caption?: string,
): Promise<string> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to upload photos.')

  // Downscale + strip EXIF (manipulate re-encodes, dropping metadata).
  const scale = Math.min(1, MAX_EDGE / Math.max(photo.width, photo.height))
  const manipulated = await ImageManipulator.manipulateAsync(
    photo.uri,
    scale < 1 ? [{ resize: { width: Math.round(photo.width * scale) } }] : [],
    { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
  )

  // Supabase's documented Expo upload path: fetch the file:// URI into an
  // ArrayBuffer. Blobs from RN's fetch are not reliably accepted by storage-js.
  const buffer = await fetch(manipulated.uri).then((r) => r.arrayBuffer())

  const path = `${siteId}/${Date.now()}.jpg`
  const { error: storageErr } = await supabase.storage
    .from('site-photos')
    .upload(path, buffer, { upsert: false, contentType: 'image/jpeg' })
  if (storageErr) throw new Error(storageErr.message)

  const { data: { publicUrl } } = supabase.storage.from('site-photos').getPublicUrl(path)

  // Auto-link the uploader's most recent dive at this site: the photo post
  // then carries real dive conditions without any extra input.
  const { data: lastDive } = await supabase
    .from('dives')
    .select('id')
    .eq('user_id', user.id)
    .eq('site_id', siteId)
    .order('dived_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error: rowErr } = await supabase.from('site_photos').insert({
    site_id: siteId,
    user_id: user.id,
    url: publicUrl,
    caption: caption?.trim() || null,
    dive_id: lastDive?.id ?? null,
  })
  if (rowErr) throw new Error(rowErr.message)

  return publicUrl
}

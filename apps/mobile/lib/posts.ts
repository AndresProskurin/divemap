/**
 * Mobile posting pipeline: pick photos/videos from the library, process each
 * (photos: downscale to the web uploader's 1920 px long edge, which also
 * strips EXIF; videos: extract a poster frame), upload everything to the
 * site-photos bucket, then write the posts + post_media rows.
 *
 * Storage keys stay under {siteId}/: {timestamp}-{index}.jpg|.mp4 plus
 * {timestamp}-{index}-thumb.jpg for video posters. The bucket accepts
 * image/jpeg + video/mp4 + video/quicktime, 50 MB cap — see the posts
 * migration.
 */

import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import * as VideoThumbnails from 'expo-video-thumbnails'
import { createMediaPost, addPostMedia } from '@divemap/db'
import type { TablesInsert } from '@divemap/db'
import { createClient } from './supabase'

const MAX_EDGE = 1920
const MAX_ITEMS = 10
const MAX_VIDEO_S = 90

export interface PickedMedia {
  uri: string
  type: 'photo' | 'video'
  width: number
  height: number
  /** Seconds — videos only. */
  duration: number | null
}

/**
 * Opens the system library allowing up to 10 photos/videos.
 * Resolves [] if the user cancels or denies access.
 */
export async function pickMedia(): Promise<PickedMedia[]> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) return []
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images', 'videos'],
    quality: 1,
    allowsMultipleSelection: true,
    selectionLimit: MAX_ITEMS,
    videoMaxDuration: MAX_VIDEO_S,
  })
  if (result.canceled) return []
  return (result.assets ?? []).slice(0, MAX_ITEMS).map((a) => ({
    uri: a.uri,
    type: a.type === 'video' ? 'video' : 'photo',
    width: a.width,
    height: a.height,
    duration: a.duration != null ? Math.round(a.duration / 100) / 10 : null,
  }))
}

async function uploadBuffer(path: string, uri: string, contentType: string) {
  const supabase = createClient()
  const buffer = await fetch(uri).then((r) => r.arrayBuffer())
  const { error } = await supabase.storage
    .from('site-photos')
    .upload(path, buffer, { upsert: false, contentType })
  if (error) throw new Error(error.message)
  return supabase.storage.from('site-photos').getPublicUrl(path).data.publicUrl
}

/**
 * Uploads every attachment and creates the post. Returns the post id, or
 * throws with a user-presentable message.
 */
export async function createPost(
  media: PickedMedia[],
  siteId: string,
  caption?: string,
): Promise<string> {
  if (media.length === 0) throw new Error('Pick at least one photo or video.')
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Sign in to post.')

  const overlong = media.find((m) => m.type === 'video' && (m.duration ?? 0) > MAX_VIDEO_S)
  if (overlong) throw new Error(`Videos are limited to ${MAX_VIDEO_S} seconds.`)

  const stamp = Date.now()
  const rows: Omit<TablesInsert<'post_media'>, 'post_id'>[] = []

  for (const [i, item] of media.entries()) {
    if (item.type === 'photo') {
      // Downscale + strip EXIF (manipulate re-encodes, dropping metadata).
      const scale = Math.min(1, MAX_EDGE / Math.max(item.width, item.height))
      const out = await ImageManipulator.manipulateAsync(
        item.uri,
        scale < 1 ? [{ resize: { width: Math.round(item.width * scale) } }] : [],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
      )
      const url = await uploadBuffer(`${siteId}/${stamp}-${i}.jpg`, out.uri, 'image/jpeg')
      rows.push({
        position: i, media_type: 'photo', url,
        width: out.width, height: out.height,
      })
    } else {
      // No client-side transcode exists in Expo — the mp4/mov goes up as-is
      // (bucket caps at 50 MB); grids and feed cards render the poster frame.
      const isMov = /\.mov$/i.test(item.uri)
      const url = await uploadBuffer(
        `${siteId}/${stamp}-${i}.${isMov ? 'mov' : 'mp4'}`,
        item.uri,
        isMov ? 'video/quicktime' : 'video/mp4',
      )
      const poster = await VideoThumbnails.getThumbnailAsync(item.uri, { time: 0 })
      const posterOut = await ImageManipulator.manipulateAsync(
        poster.uri,
        poster.width > MAX_EDGE ? [{ resize: { width: MAX_EDGE } }] : [],
        { compress: 0.82, format: ImageManipulator.SaveFormat.JPEG },
      )
      const thumbUrl = await uploadBuffer(`${siteId}/${stamp}-${i}-thumb.jpg`, posterOut.uri, 'image/jpeg')
      rows.push({
        position: i, media_type: 'video', url, thumbnail_url: thumbUrl,
        width: item.width, height: item.height, duration_s: item.duration,
      })
    }
  }

  // Auto-link the poster's most recent dive at this site: the post then
  // carries real dive conditions without any extra input.
  const { data: lastDive } = await supabase
    .from('dives')
    .select('id')
    .eq('user_id', user.id)
    .eq('site_id', siteId)
    .order('dived_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { id: postId, error: postErr } = await createMediaPost(
    { siteId, userId: user.id, diveId: lastDive?.id ?? null, body: caption },
    supabase,
  )
  if (postErr || !postId) throw new Error(postErr ?? 'Could not create the post.')

  const { error: mediaErr } = await addPostMedia(
    rows.map((r) => ({ ...r, post_id: postId })),
    supabase,
  )
  if (mediaErr) throw new Error(mediaErr)

  return postId
}

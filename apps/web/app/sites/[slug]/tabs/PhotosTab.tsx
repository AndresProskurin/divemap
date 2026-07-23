'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createClient, createMediaPost, addPostMedia } from '@divemap/db'
import type { SiteMediaPost } from '@divemap/db'

interface Props {
  siteId: string
  initialPosts: SiteMediaPost[]
}

/** One gallery cell — a single attachment of some post. */
interface GalleryItem {
  key: string
  /** What the grid shows: the photo, or the video's poster. */
  thumbUrl: string
  videoUrl: string | null
  caption: string | null
  depth_m: number | null
}

function flatten(posts: SiteMediaPost[]): GalleryItem[] {
  return posts.flatMap((p) =>
    p.media.map((m) => ({
      key: m.id,
      thumbUrl: m.media_type === 'video' ? m.thumbnail_url ?? '' : m.url,
      videoUrl: m.media_type === 'video' ? m.url : null,
      caption: p.body,
      depth_m: m.depth_m,
    })),
  )
}

interface Lightbox {
  url: string
  videoUrl: string | null
  caption: string | null
}

/** Longest edge after client-side downscale. */
const MAX_EDGE = 1920
const JPEG_QUALITY = 0.82

/**
 * Downscale + re-encode to JPEG on a canvas before upload. Re-encoding also
 * strips all EXIF metadata (including GPS position) as a side effect.
 */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.drawImage(bitmap, 0, 0, w, h)
    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY),
    )
    if (!blob) throw new Error('Image encode failed')
    return blob
  } finally {
    bitmap.close()
  }
}

function formatKb(bytes: number): string {
  return bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`
}

interface UploadModalProps {
  file: File
  siteId: string
  onClose: () => void
  onUploaded: (post: SiteMediaPost) => void
}

function UploadModal({ file, siteId, onClose, onUploaded }: UploadModalProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [compressed, setCompressed] = useState<Blob | null>(null)
  const [caption, setCaption] = useState('')
  const [depth, setDepth] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    let cancelled = false
    compressImage(file)
      .then(blob => { if (!cancelled) setCompressed(blob) })
      .catch(() => { if (!cancelled) setError('Could not process this image.') })
    return () => {
      cancelled = true
      URL.revokeObjectURL(url)
    }
  }, [file])

  async function upload() {
    if (!compressed) return
    setUploading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Sign in to upload photos.')
        return
      }
      const path = `${siteId}/${Date.now()}.jpg`
      const { error: storageErr } = await supabase.storage
        .from('site-photos')
        .upload(path, compressed, { upsert: false, contentType: 'image/jpeg' })
      if (storageErr) throw new Error(storageErr.message)

      const { data: { publicUrl } } = supabase.storage
        .from('site-photos')
        .getPublicUrl(path)

      const depthVal = parseFloat(depth)
      const { id: postId, error: postErr } = await createMediaPost(
        { siteId, userId: user.id, body: caption },
        supabase,
      )
      if (postErr || !postId) throw new Error(postErr ?? 'Could not create the post.')
      const media = {
        post_id: postId,
        position: 0,
        media_type: 'photo' as const,
        url: publicUrl,
        depth_m: isNaN(depthVal) ? null : depthVal,
      }
      const { error: mediaErr } = await addPostMedia([media], supabase)
      if (mediaErr) throw new Error(mediaErr)
      onUploaded({
        id: postId,
        user_id: user.id,
        body: caption.trim() || null,
        created_at: new Date().toISOString(),
        media: [{ id: `${postId}-0`, position: 0, media_type: 'photo', url: publicUrl, thumbnail_url: null, depth_m: media.depth_m }],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(2,10,18,0.72)', backdropFilter: 'blur(3px)' }}
      onClick={uploading ? undefined : onClose}
    >
      <div
        className="w-full max-w-[420px] flex flex-col gap-3.5 p-5"
        style={{
          background: 'var(--bg2)',
          border: '1px solid var(--line)',
          borderRadius: '20px 20px 0 0',
          maxHeight: '88dvh',
          overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="font-extrabold" style={{ fontSize: '17px', color: 'var(--tx)' }}>Add photo</div>
          <button
            onClick={onClose}
            disabled={uploading}
            style={{ background: 'none', border: 'none', fontSize: '18px', color: 'var(--tx3)', cursor: 'pointer' }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Preview */}
        {previewUrl && (
          <div className="overflow-hidden" style={{ borderRadius: '14px', border: '1px solid var(--line)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Upload preview" style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', display: 'block' }} />
          </div>
        )}

        {/* Compression status */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '10px' }}
        >
          <span style={{ fontSize: '12px' }}>{compressed ? '✓' : '⏳'}</span>
          <span className="font-mono" style={{ fontSize: '9.5px', color: compressed ? 'var(--ok)' : 'var(--tx3)', letterSpacing: '0.04em' }}>
            {compressed
              ? `COMPRESSED ${formatKb(file.size)} → ${formatKb(compressed.size)} · EXIF STRIPPED`
              : 'COMPRESSING…'}
          </span>
        </div>

        {/* Caption + depth */}
        <input
          value={caption}
          onChange={e => setCaption(e.target.value.slice(0, 200))}
          placeholder="Caption (optional)"
          style={{
            background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '12px',
            padding: '11px 12px', fontSize: '13px', color: 'var(--tx)', outline: 'none',
          }}
        />
        <div className="flex items-center gap-2">
          <input
            value={depth}
            onChange={e => setDepth(e.target.value.replace(/[^0-9.]/g, ''))}
            placeholder="—"
            inputMode="decimal"
            className="font-mono"
            style={{
              background: 'var(--card)', border: '1px solid var(--line)', borderRadius: '12px',
              padding: '11px 12px', fontSize: '14px', color: 'var(--tx)', outline: 'none',
              width: '90px', textAlign: 'center',
            }}
          />
          <span className="font-mono" style={{ fontSize: '9px', color: 'var(--tx3)', letterSpacing: '0.1em' }}>
            DEPTH TAKEN (M) · OPTIONAL
          </span>
        </div>

        {error && (
          <div
            className="font-medium p-2.5"
            style={{
              fontSize: '12px', color: 'var(--dang)',
              background: 'rgba(255,93,125,0.08)', border: '1px solid rgba(255,93,125,0.3)',
              borderRadius: '10px',
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={upload}
          disabled={uploading || !compressed}
          className="font-bold"
          style={{
            padding: '13px', borderRadius: '14px', background: 'var(--acc)',
            fontSize: '14px', color: '#02222e', border: 'none',
            cursor: uploading || !compressed ? 'default' : 'pointer',
            opacity: uploading || !compressed ? 0.6 : 1,
            boxShadow: '0 6px 16px rgba(0,180,216,0.3)',
          }}
        >
          {uploading ? 'Uploading…' : 'Upload photo'}
        </button>
      </div>
    </div>
  )
}

export function PhotosTab({ siteId, initialPosts }: Props) {
  const [posts, setPosts] = useState<SiteMediaPost[]>(initialPosts)
  const [lightbox, setLightbox] = useState<Lightbox | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const photos = flatten(posts)

  const handleUploaded = useCallback((post: SiteMediaPost) => {
    setPosts(prev => [post, ...prev])
    setPendingFile(null)
  }, [])

  return (
    <>
      <div className="p-4 flex flex-col gap-3" style={{ animation: 'dmFade 0.25s ease' }}>
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-[13px] p-3 text-center font-bold transition-opacity"
          style={{
            border: '1.5px solid var(--acc)',
            color: 'var(--acc)',
            fontSize: '13px',
            background: 'transparent',
            cursor: 'pointer',
          }}
        >
          + Add Photo
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setPendingFile(file)
            e.target.value = ''
          }}
        />

        {photos.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--tx3)', fontStyle: 'italic' }}>
            No photos yet. Be the first to add one!
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
              gap: '8px',
            }}
          >
            {photos.map((item, i) => (
              <button
                key={item.key}
                onClick={() => setLightbox({ url: item.thumbUrl, videoUrl: item.videoUrl, caption: item.caption })}
                className="overflow-hidden rounded-12 relative"
                style={{
                  height: i % 5 === 0 ? '180px' : '132px',
                  background: 'var(--card)',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  gridColumn: i % 5 === 0 ? 'span 2' : 'span 1',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.thumbUrl}
                  alt={item.caption ?? `Site photo ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {item.videoUrl && (
                  <span
                    className="absolute top-[6px] right-[8px] rounded-full px-[8px] py-[3px]"
                    style={{ fontSize: '10px', background: 'rgba(4,18,31,0.8)', color: '#eaf6fd' }}
                  >
                    ▶
                  </span>
                )}
                {item.depth_m != null && (
                  <span
                    className="absolute bottom-[6px] left-[8px] font-mono font-semibold rounded-full px-[7px] py-[3px]"
                    style={{
                      fontSize: '9px',
                      background: 'rgba(4,18,31,0.8)',
                      color: 'var(--acc)',
                    }}
                  >
                    {item.depth_m}m
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {pendingFile && (
        <UploadModal
          file={pendingFile}
          siteId={siteId}
          onClose={() => setPendingFile(null)}
          onUploaded={handleUploaded}
        />
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(3,4,9,0.92)' }}
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-4xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {lightbox.videoUrl ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={lightbox.videoUrl}
                poster={lightbox.url}
                controls
                autoPlay
                style={{
                  width: '100%',
                  maxHeight: '80vh',
                  borderRadius: '12px',
                  background: '#000',
                }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.url}
                alt={lightbox.caption ?? 'Site photo'}
                style={{
                  width: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: '12px',
                }}
              />
            )}
            {lightbox.caption && (
              <p
                className="mt-3 text-center"
                style={{ fontSize: '13px', color: 'var(--tx2)' }}
              >
                {lightbox.caption}
              </p>
            )}
            <button
              onClick={() => setLightbox(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(4,18,31,0.8)', border: 'none', cursor: 'pointer' }}
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <line x1="1" y1="1" x2="11" y2="11" stroke="#eaf6fd" strokeWidth="2" strokeLinecap="round" />
                <line x1="11" y1="1" x2="1" y2="11" stroke="#eaf6fd" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}

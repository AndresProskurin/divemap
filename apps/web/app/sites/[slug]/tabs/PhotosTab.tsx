'use client'

import { useState, useRef, useCallback } from 'react'
import { createClient } from '@divemap/db'
import type { SitePhoto } from '@divemap/db'

interface Props {
  siteId: string
  initialPhotos: SitePhoto[]
}

interface Lightbox {
  url: string
  caption: string | null
}

export function PhotosTab({ siteId, initialPhotos }: Props) {
  const [photos, setPhotos] = useState<SitePhoto[]>(initialPhotos)
  const [lightbox, setLightbox] = useState<Lightbox | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true)
    setUploadError(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setUploadError('Sign in to upload photos.')
        return
      }
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${siteId}/${Date.now()}.${ext}`
      const { error: storageErr } = await supabase.storage
        .from('site-photos')
        .upload(path, file, { upsert: false })
      if (storageErr) throw new Error(storageErr.message)

      const { data: { publicUrl } } = supabase.storage
        .from('site-photos')
        .getPublicUrl(path)

      const { data: newPhoto, error: dbErr } = await supabase
        .from('site_photos')
        .insert({ site_id: siteId, user_id: user.id, url: publicUrl })
        .select()
        .single()
      if (dbErr) throw new Error(dbErr.message)
      if (newPhoto) setPhotos((prev) => [newPhoto as SitePhoto, ...prev])
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }, [siteId])

  return (
    <>
      <div className="p-4 flex flex-col gap-3" style={{ animation: 'dmFade 0.25s ease' }}>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-[13px] p-3 text-center font-bold transition-opacity"
          style={{
            border: '1.5px solid var(--acc)',
            color: uploading ? 'var(--tx3)' : 'var(--acc)',
            fontSize: '13px',
            background: 'transparent',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.6 : 1,
          }}
        >
          {uploading ? 'Uploading…' : '+ Add Photo'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleUpload(file)
          }}
        />
        {uploadError && (
          <p style={{ fontSize: '12px', color: 'var(--dang)' }}>{uploadError}</p>
        )}

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
            {photos.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setLightbox({ url: photo.url, caption: photo.caption })}
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
                  src={photo.url}
                  alt={photo.caption ?? `Site photo ${i + 1}`}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {photo.depth_taken_m != null && (
                  <span
                    className="absolute bottom-[6px] left-[8px] font-mono font-semibold rounded-full px-[7px] py-[3px]"
                    style={{
                      fontSize: '9px',
                      background: 'rgba(4,18,31,0.8)',
                      color: 'var(--acc)',
                    }}
                  >
                    {photo.depth_taken_m}m
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

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
            {/* eslint-disable-next-line @next/next/no-img-element */}
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

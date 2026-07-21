'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env['NEXT_PUBLIC_POSTHOG_KEY']
    if (!key) return
    posthog.init(key, {
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      capture_pageview: false,
      capture_pageleave: true,
    })
  }, [])

  const key = process.env['NEXT_PUBLIC_POSTHOG_KEY']
  if (!key) return <>{children}</>

  return <PHProvider client={posthog}>{children}</PHProvider>
}

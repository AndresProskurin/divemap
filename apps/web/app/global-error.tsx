'use client'

import { useEffect } from 'react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Error — DiveMap</title>
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #051422;
            color: #eaf6fd;
            font-family: Archivo, system-ui, sans-serif;
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 24px;
          }
          .wrap { display: flex; flex-direction: column; align-items: center; gap: 20px; text-align: center; }
          .label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #ff5d7d; letter-spacing: 0.2em; font-weight: 600; }
          h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.01em; }
          p { font-size: 13px; color: #9fc3da; font-weight: 500; max-width: 280px; line-height: 1.5; }
          button {
            padding: 13px 28px;
            border-radius: 14px;
            background: #00b4d8;
            font-weight: 700;
            font-size: 14px;
            color: #02222e;
            border: none;
            cursor: pointer;
            box-shadow: 0 6px 16px rgba(0,180,216,0.3);
          }
          button:hover { background: #0096b7; }
        `}</style>
      </head>
      <body>
        <div className="wrap">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="rgba(148,196,230,0.14)" strokeWidth="1.5" />
            <circle cx="32" cy="32" r="5" fill="#ff5d7d" />
            <line x1="32" y1="4" x2="32" y2="16" stroke="#ff5d7d" strokeWidth="2" strokeLinecap="round" />
            <line x1="16" y1="16" x2="48" y2="48" stroke="rgba(255,93,125,0.4)" strokeWidth="2" strokeLinecap="round" />
            <line x1="48" y1="16" x2="16" y2="48" stroke="rgba(255,93,125,0.4)" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <p className="label">CRITICAL ERROR</p>
          <h1>Application error</h1>
          <p>A fatal error occurred. Tap retry to surface — if the issue persists, please contact support.</p>
          {error.digest && (
            <p style={{ fontSize: '9px', color: '#638aa3', letterSpacing: '0.08em', fontFamily: "'IBM Plex Mono', monospace" }}>
              {error.digest}
            </p>
          )}
          <button onClick={reset}>Retry</button>
        </div>
      </body>
    </html>
  )
}

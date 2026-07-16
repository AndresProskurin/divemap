import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SignInPage } from './SignInPage'

export const metadata: Metadata = {
  title: 'Sign in — DiveMap',
}

export default function SignIn() {
  return (
    <Suspense>
      <SignInPage />
    </Suspense>
  )
}

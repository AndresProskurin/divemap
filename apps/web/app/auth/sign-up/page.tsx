import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SignUpPage } from './SignUpPage'

export const metadata: Metadata = {
  title: 'Create account — DiveMap',
}

export default function SignUp() {
  return (
    <Suspense>
      <SignUpPage />
    </Suspense>
  )
}

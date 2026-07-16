import { Suspense } from 'react'
import { ResetPasswordPage } from './ResetPasswordPage'

export const metadata = {
  title: 'Reset Password — DiveMap',
}

export default function Page() {
  return (
    <Suspense>
      <ResetPasswordPage />
    </Suspense>
  )
}

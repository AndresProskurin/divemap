import { Suspense } from 'react'
import { UpdatePasswordPage } from './UpdatePasswordPage'

export const metadata = {
  title: 'Update Password — DiveMap',
}

export default function Page() {
  return (
    <Suspense>
      <UpdatePasswordPage />
    </Suspense>
  )
}

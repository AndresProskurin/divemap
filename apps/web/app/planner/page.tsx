import { Suspense } from 'react'
import { TechPlannerPage } from './TechPlannerPage'

export const metadata = {
  title: 'Tech Planner — DiveMap',
  description: 'Bühlmann ZHL-16C decompression planner with gradient factors.',
}

export default function PlannerPage() {
  return (
    <Suspense>
      <TechPlannerPage />
    </Suspense>
  )
}

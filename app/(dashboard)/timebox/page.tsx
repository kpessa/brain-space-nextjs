import { Suspense } from 'react'
import { getUserFromHeaders } from '@/lib/server-auth'
import TimeboxClient from './timebox-client'
import { TimeboxSkeleton } from '@/components/timebox/TimeboxSkeleton'

export default async function TimeboxPage() {
  const user = await getUserFromHeaders()
  
  if (!user) {
    return null // This shouldn't happen as layout checks auth
  }

  return (
    <Suspense fallback={<TimeboxSkeleton />}>
      <TimeboxClient userId={user.uid} />
    </Suspense>
  )
}

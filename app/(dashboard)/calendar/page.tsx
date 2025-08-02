import { Suspense } from 'react'
import { getUserFromHeaders } from '@/lib/server-auth'
import CalendarClient from './calendar-client'
import { CalendarSkeleton } from '@/components/calendar/CalendarSkeleton'

export default async function CalendarPage() {
  const user = await getUserFromHeaders()
  
  if (!user) {
    return null // This shouldn't happen as layout checks auth
  }

  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarClient userId={user.uid} />
    </Suspense>
  )
}

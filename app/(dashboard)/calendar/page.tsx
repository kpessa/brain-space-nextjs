import { getUserFromHeaders } from '@/lib/server-auth'
import CalendarClient from './calendar-client'

export default async function CalendarPage() {
  const user = await getUserFromHeaders()
  
  if (!user) {
    return null // This shouldn't happen as layout checks auth
  }

  return <CalendarClient userId={user.uid} />
}

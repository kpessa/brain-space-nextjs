import { getUserFromHeaders } from '@/lib/server-auth'
import CalendarSettingsClient from './calendar-settings-client'

export default async function CalendarSettingsPage() {
  const user = await getUserFromHeaders()
  
  if (!user) {
    return null // This shouldn't happen as layout checks auth
  }

  return <CalendarSettingsClient userId={user.uid} />
}

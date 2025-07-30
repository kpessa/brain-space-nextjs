import { getUserFromHeaders } from '@/lib/server-auth'
import ProgressClient from './progress-client'

export default async function ProgressPage() {
  const user = await getUserFromHeaders()
  
  if (!user) {
    return null // This shouldn't happen as layout checks auth
  }

  return <ProgressClient userId={user.uid} />
}

import { getUserFromHeaders } from '@/lib/server-auth'
import RoutinesClient from './routines-client'

export default async function RoutinesPage() {
  const user = await getUserFromHeaders()
  
  if (!user) {
    return null // This shouldn't happen as layout checks auth
  }

  return <RoutinesClient userId={user.uid} />
}

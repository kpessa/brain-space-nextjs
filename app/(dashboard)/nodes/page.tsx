import { getUserFromHeaders } from '@/lib/server-auth'
import NodesClient from './nodes-client'

export default async function NodesPage() {
  const user = await getUserFromHeaders()
  
  if (!user) {
    return null // This shouldn't happen as layout checks auth
  }

  return <NodesClient userId={user.uid} />
}

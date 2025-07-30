import { getUserFromHeaders } from '@/lib/server-auth'
import JournalClient from './journal-client'

export default async function JournalPage() {
  const user = await getUserFromHeaders()
  
  if (!user) {
    return null // This shouldn't happen as layout checks auth
  }

  return <JournalClient userId={user.uid} />
}
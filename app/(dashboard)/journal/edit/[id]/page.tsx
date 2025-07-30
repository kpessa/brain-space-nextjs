import { getUserFromHeaders } from '@/lib/server-auth'
import EditJournalEntryClient from './edit-journal-client'

export default async function EditJournalEntryPage() {
  const user = await getUserFromHeaders()
  
  if (!user) {
    return null // This shouldn't happen as layout checks auth
  }

  return <EditJournalEntryClient userId={user.uid} />
}
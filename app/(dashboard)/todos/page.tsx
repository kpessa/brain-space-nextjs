import { getUserFromHeaders } from '@/lib/server-auth'
import TodosClient from './todos-client'

export default async function TodosPage() {
  const user = await getUserFromHeaders()
  
  if (!user) {
    return null // This shouldn't happen as layout checks auth
  }

  return <TodosClient userId={user.uid} />
}

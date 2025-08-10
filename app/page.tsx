import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyAuth } from '@/lib/auth-helpers'

export default async function Home() {
  // Check authentication server-side
  const cookieStore = await cookies()
  const token = cookieStore.get('firebase-auth-token')?.value
  
  if (token) {
    const { user } = await verifyAuth(`Bearer ${token}`)
    if (user) {
      // User is authenticated, redirect to journal
      redirect('/journal')
    }
  }
  
  // Not authenticated, redirect to login
  redirect('/login')
}
import { Metadata } from 'next'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyAuth } from '@/lib/auth-helpers'
import StatusUpdateClient from './status-update-client'

export const metadata: Metadata = {
  title: 'Status Update | Brain Space',
  description: 'Generate bi-weekly status updates',
}

export default async function StatusUpdatePage() {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get('firebase-auth-token')
  
  if (!authCookie) {
    redirect('/login')
  }

  const authResult = await verifyAuth()
  
  if (!authResult.user) {
    redirect('/login')
  }

  return <StatusUpdateClient userId={authResult.user.uid} />
}
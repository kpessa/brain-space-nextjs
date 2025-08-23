import { Suspense } from 'react'
import { getUserFromHeaders } from '@/lib/server-auth'
import TimeboxClient from './timebox-client'
import { TimeboxSkeleton } from '@/components/timebox/TimeboxSkeleton'

export default async function TimeboxPage() {
  console.log('🔄 TimeboxPage: Server component rendering', { timestamp: new Date().toISOString() })
  
  try {
    console.log('🔐 TimeboxPage: Getting user from headers')
    const user = await getUserFromHeaders()
    console.log('✅ TimeboxPage: User retrieved', { userId: user?.uid, timestamp: new Date().toISOString() })
    
    if (!user) {
      console.log('❌ TimeboxPage: No user found, returning null', { timestamp: new Date().toISOString() })
      return null // This shouldn't happen as layout checks auth
    }

    console.log('🎯 TimeboxPage: Rendering TimeboxClient', { userId: user.uid, timestamp: new Date().toISOString() })
    return (
      <Suspense fallback={<TimeboxSkeleton />}>
        <TimeboxClient userId={user.uid} />
      </Suspense>
    )
  } catch (error) {
    console.error('❌ TimeboxPage: Error in server component', { error, timestamp: new Date().toISOString() })
    throw error
  }
}

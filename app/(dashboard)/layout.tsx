import { redirect } from 'next/navigation'
import { getUserFromHeaders } from '@/lib/server-auth'
import DashboardShell from '@/components/DashboardShell'

// Force dynamic rendering for authenticated pages
export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check auth server-side
  const user = await getUserFromHeaders()
  
  if (!user) {
    redirect('/login')
  }

  // User is authenticated, render the dashboard shell
  return (
    <DashboardShell>
      {children}
    </DashboardShell>
  )
}
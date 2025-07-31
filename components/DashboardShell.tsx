import { getUserFromHeaders } from '@/lib/server-auth'
import { Brain } from 'lucide-react'
import { MobileNavigation } from './MobileNavigation'
import { BottomNavigation } from './BottomNavigation'
import { ClientProviders } from './ClientProviders'
import { ThemeToggle } from './ThemeToggle'
import { DesktopNavigation } from './DesktopNavigation'

export default async function DashboardShell({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getUserFromHeaders()

  return (
    <ClientProviders>
      <div className="min-h-screen bg-background flex flex-col">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-card px-6 pb-4 shadow-sm">
          <div className="flex h-16 shrink-0 items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">Brain Space</span>
            </div>
            <ThemeToggle />
          </div>
          <DesktopNavigation />
          <div className="mt-auto">
                <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-gray-900">
                  <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                    <span className="text-accent-foreground font-semibold text-sm">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="sr-only">Your profile</span>
                  <span aria-hidden="true" className="truncate">
                    {user?.email}
                  </span>
                </div>
                <a
                  href="/api/auth/logout"
                  className="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 hover:bg-gray-50 hover:text-primary"
                >
                  Sign Out
                </a>
          </div>
        </div>
      </div>

      {/* Mobile header with navigation */}
      <MobileNavigation 
        user={user}
      />

      {/* Main content */}
      <main className="flex-1 lg:pl-64 pb-16 sm:pb-0 overflow-y-auto">
        <div className="px-4 py-8 sm:px-6 lg:px-8 min-h-full">
          {children}
        </div>
      </main>
      
      {/* Bottom navigation for mobile */}
      <BottomNavigation />
    </div>
    </ClientProviders>
  )
}
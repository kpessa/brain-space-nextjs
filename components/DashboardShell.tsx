import Link from 'next/link'
import { getUserFromHeaders } from '@/lib/server-auth'
import { navigation } from '@/lib/navigation'
import { Brain } from 'lucide-react'
import { MobileNavigation } from './MobileNavigation'
import { BottomNavigation } from './BottomNavigation'

export default function DashboardShell({
  children,
  currentPath,
}: {
  children: React.ReactNode
  currentPath: string
}) {
  const user = getUserFromHeaders()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4 shadow-sm">
          <div className="flex h-16 shrink-0 items-center gap-2">
            <Brain className="h-8 w-8 text-brain-600" />
            <span className="text-xl font-bold">Brain Space</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul className="-mx-2 space-y-1">
                  {navigation.map((item) => (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={`
                          group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold
                          ${
                            currentPath === item.href
                              ? 'bg-brain-50 text-brain-600'
                              : 'text-gray-700 hover:text-brain-600 hover:bg-gray-50'
                          }
                        `}
                      >
                        <item.icon className="h-6 w-6 shrink-0" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="mt-auto">
                <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-gray-900">
                  <div className="h-8 w-8 rounded-full bg-brain-100 flex items-center justify-center">
                    <span className="text-brain-600 font-semibold text-sm">
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
                  className="group flex w-full gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold text-gray-700 hover:bg-gray-50 hover:text-brain-600"
                >
                  Sign Out
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Mobile header with navigation */}
      <MobileNavigation 
        currentPath={currentPath} 
        user={user}
      />

      {/* Main content */}
      <main className="lg:pl-64 pb-16 sm:pb-0">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
      
      {/* Bottom navigation for mobile */}
      <BottomNavigation />
    </div>
  )
}
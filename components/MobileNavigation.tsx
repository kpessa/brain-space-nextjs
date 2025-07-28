'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Brain } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navigation } from '@/lib/navigation'

interface MobileNavigationProps {
  currentPath: string
  user: any
}

export function MobileNavigation({ currentPath, user }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Listen for custom event from bottom navigation
  useEffect(() => {
    const handleOpenMenu = () => setIsOpen(true)
    window.addEventListener('open-mobile-menu', handleOpenMenu)
    
    return () => {
      window.removeEventListener('open-mobile-menu', handleOpenMenu)
    }
  }, [])

  return (
    <>
      {/* Mobile header */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-white px-4 py-4 shadow-sm sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          onClick={() => setIsOpen(true)}
        >
          <span className="sr-only">Open navigation menu</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        
        <div className="flex-1 flex items-center gap-2">
          <Brain className="h-8 w-8 text-brain-600" />
          <span className="text-lg font-semibold">Brain Space</span>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity z-50 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-white shadow-xl transition-transform duration-300 ease-in-out lg:hidden",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Brain className="h-8 w-8 text-brain-600" />
                <span className="text-lg font-semibold">Brain Space</span>
              </div>
              <button
                type="button"
                className="-m-2.5 p-2.5 text-gray-700"
                onClick={() => setIsOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            {/* Navigation items */}
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-1 px-2">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold transition-colors",
                        currentPath === item.href
                          ? "bg-brain-50 text-brain-600"
                          : "text-gray-700 hover:text-brain-600 hover:bg-gray-50"
                      )}
                    >
                      <item.icon className="h-6 w-6 shrink-0" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            {/* User section */}
            <div className="border-t border-gray-200 p-4">
              <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-gray-900">
                <div className="h-8 w-8 rounded-full bg-brain-100 flex items-center justify-center">
                  <span className="text-brain-600 font-semibold text-sm">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="truncate">{user?.email}</span>
              </div>
              <a
                href="/api/auth/logout"
                className="mt-2 flex w-full gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold text-gray-700 hover:bg-gray-50 hover:text-brain-600 transition-colors"
              >
                Sign Out
              </a>
            </div>
          </div>
        </div>
    </>
  )
}
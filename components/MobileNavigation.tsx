'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, Brain } from '@/lib/icons'
import { cn } from '@/lib/utils'
import { navigation } from '@/lib/navigation'
import { isNavItemActive } from '@/lib/navigation-utils'
import { ThemeToggle } from './ThemeToggle'

interface MobileNavigationProps {
  user: any
}

export function MobileNavigation({ user }: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

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
      <div className="sticky top-0 z-40 flex items-center gap-x-6 bg-card px-4 py-4 pt-safe shadow-sm sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-foreground/70 lg:hidden"
          onClick={() => setIsOpen(true)}
        >
          <span className="sr-only">Open navigation menu</span>
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
        
        <div className="flex-1 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            <span className="text-lg font-semibold">Brain Space</span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {/* Backdrop */}
      <div 
        className={cn(
          "fixed inset-0 bg-background/75 backdrop-blur-sm transition-opacity z-50 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-card shadow-xl transition-transform duration-300 ease-in-out lg:hidden pt-safe pb-safe",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b">
              <div className="flex items-center gap-2">
                <Brain className="h-8 w-8 text-primary" />
                <span className="text-lg font-semibold">Brain Space</span>
              </div>
              <button
                type="button"
                className="-m-2.5 p-2.5 text-foreground/70"
                onClick={() => setIsOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            {/* Navigation items */}
            <nav className="flex-1 overflow-y-auto py-4">
              <ul className="space-y-1 px-2">
                {navigation.map((item) => {
                  const isActive = isNavItemActive(pathname, item.href)
                  
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={cn(
                          "group flex gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold transition-colors",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground/70 hover:text-primary hover:bg-accent/10"
                        )}
                      >
                        <item.icon className="h-6 w-6 shrink-0" />
                        {item.name}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>

            {/* User section */}
            <div className="border-t p-4">
              <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-semibold leading-6 text-foreground">
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center">
                  <span className="text-accent-foreground font-semibold text-sm">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="truncate">{user?.email}</span>
              </div>
              <a
                href="/api/auth/logout"
                className="mt-2 flex w-full gap-x-3 rounded-md p-3 text-sm leading-6 font-semibold text-foreground/70 hover:bg-accent/10 hover:text-primary transition-colors"
              >
                Sign Out
              </a>
            </div>
          </div>
        </div>
    </>
  )
}
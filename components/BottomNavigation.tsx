'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ListTodo,
  BookOpen,
  Brain,
  Network,
  MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  path: string
  icon: React.ElementType
  label: string
  action?: () => void
}

export function BottomNavigation() {
  const pathname = usePathname()

  // Function to trigger mobile menu - will be called from More button
  const openMobileMenu = () => {
    // Dispatch a custom event that MobileNavigation can listen to
    window.dispatchEvent(new CustomEvent('open-mobile-menu'))
  }

  const navItems: NavItem[] = [
    { path: '/todos', icon: ListTodo, label: 'Todos' },
    { path: '/journal', icon: BookOpen, label: 'Journal' },
    { path: '/braindump', icon: Brain, label: 'Brain' },
    { path: '/nodes', icon: Network, label: 'Nodes' },
    { path: '#more', icon: MoreHorizontal, label: 'More', action: openMobileMenu },
  ]

  // Hide bottom nav on certain routes
  const hideOnRoutes = ['/journal/new', '/journal/edit', '/auth', '/login']
  const shouldHide = hideOnRoutes.some(route => pathname.startsWith(route))

  if (shouldHide) return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 md:hidden">
      <div className="grid grid-cols-5 h-16 px-2">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = pathname === item.path || (item.path !== '#more' && pathname.startsWith(item.path + '/'))

          if (item.action) {
            // Render button for "More" action
            return (
              <button
                key={item.path}
                onClick={item.action}
                className="flex flex-col items-center justify-center gap-1 text-xs transition-all text-gray-500 hover:text-gray-700"
              >
                <div className="p-1 rounded-lg transition-all">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-medium">{item.label}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-xs transition-all',
                isActive 
                  ? 'text-brain-600' 
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <div
                className={cn(
                  'p-1 rounded-lg transition-all',
                  isActive && 'bg-brain-100'
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="font-medium">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
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
import { isNavItemActive } from '@/lib/navigation-utils'
import { triggerHaptic } from '@/lib/haptic'

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
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/80 ios-blur border-t border-border/50 md:hidden pb-safe">
      <div className="grid grid-cols-5 h-16 px-2">
        {navItems.map(item => {
          const Icon = item.icon
          const isActive = isNavItemActive(pathname, item.path)

          if (item.action) {
            // Render button for "More" action
            return (
              <button
                key={item.path}
                onClick={() => {
                  triggerHaptic('light')
                  item.action!()
                }}
                className="flex flex-col items-center justify-center gap-1 text-xs transition-all text-muted-foreground hover:text-foreground"
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
              onClick={() => triggerHaptic('selection')}
              className={cn(
                'flex flex-col items-center justify-center gap-1 text-xs transition-all',
                isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div
                className={cn(
                  'p-1 rounded-lg transition-all',
                  isActive && 'bg-primary/10'
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
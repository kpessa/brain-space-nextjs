'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { navigation } from '@/lib/navigation'
import { isNavItemActive } from '@/lib/navigation-utils'

export function DesktopNavigation() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-1 flex-col">
      <ul className="flex flex-1 flex-col gap-y-7">
        <li>
          <ul className="-mx-2 space-y-1">
            {navigation.map((item) => {
              const isActive = isNavItemActive(pathname, item.href)
              
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      "group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-gray-700 hover:text-primary hover:bg-gray-50"
                    )}
                  >
                    <item.icon className="h-6 w-6 shrink-0" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </li>
      </ul>
    </nav>
  )
}
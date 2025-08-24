'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from './ThemeProvider'
import { IOSProvider } from '@/contexts/IOSContext'
import { useState } from 'react'

export function AppWrapper({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <IOSProvider 
        keyboardAvoidanceEnabled={true}
        hapticEnabled={true}
        keyboardOffset={20}
        scrollBehavior="smooth"
      >
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </IOSProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
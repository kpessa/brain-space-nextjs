import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ToastProvider'
import { AppWrapper } from '@/components/AppWrapper'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Brain Space',
  description: 'Capture, organize, and explore your thoughts',
  manifest: '/manifest.json',
}

export const viewport = {
  themeColor: '#7C3AED',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  userScalable: 'no',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Brain Space" />
        <meta name="format-detection" content="telephone=no" />
        <link rel="apple-touch-icon" href="/android-chrome-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/android-chrome-192x192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/android-chrome-192x192.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/android-chrome-192x192.png" />
      </head>
      <body>
        <AppWrapper>
          {children}
          <ToastProvider />
          <PWAInstallPrompt />
        </AppWrapper>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
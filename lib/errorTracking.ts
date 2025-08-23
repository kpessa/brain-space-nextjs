// Error tracking service integration
// Can be configured with Sentry, LogRocket, or custom error tracking

interface ErrorContext {
  userId?: string
  userEmail?: string
  route?: string
  action?: string
  metadata?: Record<string, unknown>
}

interface ErrorReport {
  message: string
  stack?: string
  level: 'error' | 'warning' | 'info'
  context: ErrorContext
  timestamp: string
  userAgent?: string
  url?: string
}

class ErrorTracker {
  private context: ErrorContext = {}
  private queue: ErrorReport[] = []
  private isInitialized = false
  private sendInterval: NodeJS.Timeout | null = null

  initialize(config?: { dsn?: string; environment?: string }) {
    if (this.isInitialized) return

    this.isInitialized = true

    // Set up global error handler
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleWindowError)
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection)

      // Send queued errors every 30 seconds
      this.sendInterval = setInterval(() => {
        this.flushQueue()
      }, 30000)
    }

    // Initialize Sentry or other service here
    // if (config?.dsn) {
    //   Sentry.init({
    //     dsn: config.dsn,
    //     environment: config.environment || 'production',
    //   })
    // }
  }

  private handleWindowError = (event: ErrorEvent) => {
    this.captureError(event.error || new Error(event.message), {
      ...this.context,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    })
  }

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    this.captureError(
      new Error(`Unhandled Promise Rejection: ${event.reason}`),
      this.context
    )
  }

  setContext(context: Partial<ErrorContext>) {
    this.context = { ...this.context, ...context }
  }

  captureError(error: Error, context?: ErrorContext) {
    const report: ErrorReport = {
      message: error.message,
      stack: error.stack,
      level: 'error',
      context: context || this.context,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    }

    this.queue.push(report)

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', report)
    }

    // Send immediately for critical errors
    if (this.queue.length >= 10) {
      this.flushQueue()
    }
  }

  captureWarning(message: string, context?: ErrorContext) {
    const report: ErrorReport = {
      message,
      level: 'warning',
      context: context || this.context,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    }

    this.queue.push(report)
  }

  captureInfo(message: string, context?: ErrorContext) {
    const report: ErrorReport = {
      message,
      level: 'info',
      context: context || this.context,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    }

    this.queue.push(report)
  }

  private async flushQueue() {
    if (this.queue.length === 0) return

    const reports = [...this.queue]
    this.queue = []

    try {
      // Send to your error tracking service
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/errors/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reports }),
        })
      }
    } catch (error) {
      // Failed to send, add back to queue
      this.queue.unshift(...reports)
    }
  }

  destroy() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleWindowError)
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
    }

    if (this.sendInterval) {
      clearInterval(this.sendInterval)
    }

    this.flushQueue()
  }
}

// Singleton instance
let errorTracker: ErrorTracker | null = null

export function getErrorTracker(): ErrorTracker {
  if (!errorTracker) {
    errorTracker = new ErrorTracker()
  }
  return errorTracker
}

// React hook for error tracking
import { useEffect, useCallback } from 'react'

export function useErrorTracking(componentName: string, userId?: string) {
  useEffect(() => {
    const tracker = getErrorTracker()
    
    tracker.setContext({
      route: componentName,
      userId,
    })

    return () => {
      // Clean up context when component unmounts
      tracker.setContext({
        route: undefined,
      })
    }
  }, [componentName, userId])

  const trackError = useCallback((error: Error, metadata?: Record<string, unknown>) => {
    const tracker = getErrorTracker()
    tracker.captureError(error, {
      route: componentName,
      userId,
      metadata,
    })
  }, [componentName, userId])

  const trackWarning = useCallback((message: string, metadata?: Record<string, unknown>) => {
    const tracker = getErrorTracker()
    tracker.captureWarning(message, {
      route: componentName,
      userId,
      metadata,
    })
  }, [componentName, userId])

  const trackInfo = useCallback((message: string, metadata?: Record<string, unknown>) => {
    const tracker = getErrorTracker()
    tracker.captureInfo(message, {
      route: componentName,
      userId,
      metadata,
    })
  }, [componentName, userId])

  return {
    trackError,
    trackWarning,
    trackInfo,
  }
}

// Error boundary integration
export function reportErrorBoundaryError(error: Error, errorInfo: { componentStack?: string }) {
  const tracker = getErrorTracker()
  tracker.captureError(error, {
    metadata: {
      componentStack: errorInfo?.componentStack,
      errorBoundary: true,
    },
  })
}
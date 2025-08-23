// Performance monitoring utilities

interface PerformanceMetrics {
  FCP?: number // First Contentful Paint
  LCP?: number // Largest Contentful Paint
  FID?: number // First Input Delay
  CLS?: number // Cumulative Layout Shift
  TTFB?: number // Time to First Byte
  INP?: number // Interaction to Next Paint
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {}
  private reportCallback?: (metrics: PerformanceMetrics) => void

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeObservers()
    }
  }

  private initializeObservers() {
    // Observe Largest Contentful Paint
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & {
            renderTime?: number
            loadTime?: number
          }
          this.metrics.LCP = lastEntry.renderTime || lastEntry.loadTime
          this.report()
        })
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
      } catch (e) {
        // LCP observer not supported
      }

      // Observe First Input Delay
      try {
        const fidObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          entries.forEach((entry: PerformanceEntry & {
            processingStart?: number
          }) => {
            if (entry.name === 'first-input') {
              this.metrics.FID = (entry.processingStart || 0) - entry.startTime
              this.report()
            }
          })
        })
        fidObserver.observe({ type: 'first-input', buffered: true })
      } catch (e) {
        // FID observer not supported
      }

      // Observe Cumulative Layout Shift
      try {
        let clsValue = 0
        const clsEntries: (PerformanceEntry & { value?: number; hadRecentInput?: boolean })[] = []

        const clsObserver = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const layoutShiftEntry = entry as PerformanceEntry & {
              value?: number
              hadRecentInput?: boolean
            }
            if (!layoutShiftEntry.hadRecentInput) {
              clsEntries.push(layoutShiftEntry)
              clsValue += layoutShiftEntry.value || 0
            }
          }
          this.metrics.CLS = clsValue
          this.report()
        })
        clsObserver.observe({ type: 'layout-shift', buffered: true })
      } catch (e) {
        // CLS observer not supported
      }

      // Observe Interaction to Next Paint
      try {
        const inpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          entries.forEach((entry: PerformanceEntry & {
            interactionId?: number
            processingStart?: number
            processingEnd?: number
            duration?: number
          }) => {
            if (entry.interactionId) {
              const inputDelay = (entry.processingStart || 0) - entry.startTime
              const processingTime = (entry.processingEnd || 0) - (entry.processingStart || 0)
              const presentationDelay = entry.startTime + (entry.duration || 0) - (entry.processingEnd || 0)
              const inp = inputDelay + processingTime + presentationDelay
              
              if (!this.metrics.INP || inp > this.metrics.INP) {
                this.metrics.INP = inp
                this.report()
              }
            }
          })
        })
        inpObserver.observe({ type: 'event', buffered: true })
      } catch (e) {
        // INP observer not supported
      }
    }

    // Measure First Contentful Paint
    if (window.performance && window.performance.getEntriesByType) {
      const paintEntries = performance.getEntriesByType('paint')
      paintEntries.forEach((entry) => {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.FCP = entry.startTime
          this.report()
        }
      })
    }

    // Measure Time to First Byte
    if (window.performance && window.performance.timing) {
      const timing = window.performance.timing
      if (timing.responseStart && timing.requestStart) {
        this.metrics.TTFB = timing.responseStart - timing.requestStart
        this.report()
      }
    }
  }

  public onReport(callback: (metrics: PerformanceMetrics) => void) {
    this.reportCallback = callback
  }

  private report() {
    if (this.reportCallback) {
      this.reportCallback(this.metrics)
    }
  }

  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  public markStart(name: string) {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`${name}-start`)
    }
  }

  public markEnd(name: string) {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(`${name}-end`)
      try {
        performance.measure(name, `${name}-start`, `${name}-end`)
        const measures = performance.getEntriesByName(name)
        if (measures.length > 0) {
          return measures[0].duration
        }
      } catch (e) {
        // Measurement failed
      }
    }
    return null
  }

  public clearMarks(name?: string) {
    if (typeof window !== 'undefined' && window.performance) {
      if (name) {
        performance.clearMarks(`${name}-start`)
        performance.clearMarks(`${name}-end`)
        performance.clearMeasures(name)
      } else {
        performance.clearMarks()
        performance.clearMeasures()
      }
    }
  }
}

// Singleton instance
let performanceMonitor: PerformanceMonitor | null = null

export function getPerformanceMonitor(): PerformanceMonitor {
  if (!performanceMonitor && typeof window !== 'undefined') {
    performanceMonitor = new PerformanceMonitor()
  }
  return performanceMonitor!
}

// React hook for performance monitoring
import { useEffect, useCallback } from 'react'

export function usePerformanceMonitor(
  componentName: string,
  onMetrics?: (metrics: PerformanceMetrics) => void
) {
  useEffect(() => {
    const monitor = getPerformanceMonitor()
    
    if (onMetrics) {
      monitor.onReport(onMetrics)
    }

    // Mark component mount
    monitor.markStart(`${componentName}-mount`)

    return () => {
      // Mark component unmount and measure lifecycle
      const duration = monitor.markEnd(`${componentName}-mount`)
      if (duration) {
        console.debug(`${componentName} lifecycle duration: ${duration.toFixed(2)}ms`)
      }
      monitor.clearMarks(`${componentName}-mount`)
    }
  }, [componentName, onMetrics])

  const measureOperation = useCallback((operationName: string, operation: () => any) => {
    const monitor = getPerformanceMonitor()
    const fullName = `${componentName}-${operationName}`
    
    monitor.markStart(fullName)
    const result = operation()
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = monitor.markEnd(fullName)
        if (duration) {
          console.debug(`${fullName} duration: ${duration.toFixed(2)}ms`)
        }
        monitor.clearMarks(fullName)
      })
    } else {
      const duration = monitor.markEnd(fullName)
      if (duration) {
        console.debug(`${fullName} duration: ${duration.toFixed(2)}ms`)
      }
      monitor.clearMarks(fullName)
      return result
    }
  }, [componentName])

  return {
    measureOperation,
    metrics: performanceMonitor?.getMetrics() || {}
  }
}

// Report performance metrics to analytics service
export function reportPerformanceMetrics(metrics: PerformanceMetrics) {
  // In production, send to analytics service
  if (process.env.NODE_ENV === 'production') {
    // Example: Send to Google Analytics
    if (typeof window !== 'undefined' && 'gtag' in window && typeof (window as any).gtag === 'function') {
      const gtag = (window as any).gtag as (command: string, action: string, params: Record<string, unknown>) => void
      gtag('event', 'web_vitals', {
        event_category: 'Performance',
        fcp: metrics.FCP,
        lcp: metrics.LCP,
        fid: metrics.FID,
        cls: metrics.CLS,
        ttfb: metrics.TTFB,
        inp: metrics.INP,
      })
    }

    // Or send to custom analytics endpoint
    // fetch('/api/analytics/performance', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(metrics),
    // })
  } else {
    // In development, log to console
  }
}
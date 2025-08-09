'use client'

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

// Loading component for lazy loaded components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
)

// Lazy load heavy components with code splitting
export const LazyNodeGraphView = dynamic(
  () => import('@/components/nodes/NodeGraphView').then(mod => mod.NodeGraphView),
  {
    loading: LoadingSpinner,
    ssr: false // Disable SSR for client-only features
  }
)

export const LazyReactFlow = dynamic(
  () => import('@xyflow/react').then(mod => mod.ReactFlow as ComponentType<any>),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)

export const LazyStandupSummaryDialog = dynamic(
  () => import('@/components/StandupSummaryDialog'),
  {
    loading: () => null,
    ssr: false
  }
)

export const LazyTimeboxRecommendationsDialog = dynamic(
  () => import('@/components/TimeboxRecommendationsDialog'),
  {
    loading: () => null,
    ssr: false
  }
)

export const LazyScheduleSettingsDialog = dynamic(
  () => import('@/components/ScheduleSettingsDialog'),
  {
    loading: () => null,
    ssr: false
  }
)

export const LazyNodeDetailModal = dynamic(
  () => import('@/components/nodes/NodeDetailModal').then(mod => mod.NodeDetailModal),
  {
    loading: () => null,
    ssr: false
  }
)

export const LazyNodeRelationshipModal = dynamic(
  () => import('@/components/nodes/NodeRelationshipModal').then(mod => mod.NodeRelationshipModal),
  {
    loading: () => null,
    ssr: false
  }
)

// Lazy load Firebase modules
export const lazyLoadFirebase = () => {
  return import('@/lib/firebase')
}

export const lazyLoadFirebaseAdmin = () => {
  return import('@/lib/firebase-admin')
}

// Lazy load chart libraries
export const LazyChartComponent = dynamic(
  () => import('recharts').then(mod => mod.LineChart as ComponentType<any>),
  {
    loading: LoadingSpinner,
    ssr: false
  }
)
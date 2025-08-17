import React from 'react'
import { Users, Settings, Coffee, User, Lock, Stethoscope, Car, Settings2, CalendarSync } from '@/lib/icons'

// Helper to get priority color
export function getPriorityColor(importance?: number, urgency?: number) {
  if (importance === undefined || urgency === undefined) {
    return 'bg-gray-100 border-gray-300'
  }
  
  const score = importance + urgency
  if (score >= 16) return 'bg-red-100 border-red-300'
  if (score >= 12) return 'bg-orange-100 border-orange-300'
  if (score >= 8) return 'bg-yellow-100 border-yellow-300'
  return 'bg-green-100 border-green-300'
}

export const timeBlockColors = {
  'morning': 'bg-blue-500',
  'afternoon': 'bg-green-500',
  'evening': 'bg-purple-500',
  'night': 'bg-indigo-500',
} as const

export const blockReasonIcons = {
  'meeting': <Users className="w-4 h-4" />,
  'patient-care': <Stethoscope className="w-4 h-4" />,
  'admin': <Settings className="w-4 h-4" />,
  'lunch': <Coffee className="w-4 h-4" />,
  'commute': <Car className="w-4 h-4" />,
  'break': <Coffee className="w-4 h-4" />,
  'personal': <User className="w-4 h-4" />,
  'custom': <Lock className="w-4 h-4" />,
} as const

export type TimeBlockPeriod = keyof typeof timeBlockColors
export type BlockReason = keyof typeof blockReasonIcons

'use client'

import { memo } from 'react'
import { Clock, CheckCircle, Target, Zap } from '@/lib/icons'
import { Card, CardContent } from '@/components/ui/Card'

interface TimeboxStatsProps {
  totalScheduledTasks: number
  completedTasks: number
  totalHours: number
  completionRate: number
}

export const TimeboxStats = memo(function TimeboxStats({
  totalScheduledTasks,
  completedTasks,
  totalHours,
  completionRate
}: TimeboxStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Scheduled</p>
              <p className="text-xl font-bold">{totalScheduledTasks}</p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Completed</p>
              <p className="text-xl font-bold">{completedTasks}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Hours</p>
              <p className="text-xl font-bold">{totalHours.toFixed(1)}</p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">Completion</p>
              <p className="text-xl font-bold">{completionRate.toFixed(0)}%</p>
            </div>
            <Zap className="w-8 h-8 text-orange-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  )
})
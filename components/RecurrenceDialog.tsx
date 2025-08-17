'use client'

import { useState } from 'react'
import { X } from '@/lib/icons'
import { RecurrenceSelector } from './RecurrenceSelector'
import { RecurrencePattern, TaskType } from '@/types/recurrence'

interface RecurrenceDialogProps {
  taskId: string
  taskLabel: string
  currentPattern?: RecurrencePattern
  currentTaskType?: TaskType
  onSave: (
    taskId: string,
    pattern: RecurrencePattern | undefined,
    taskType: 'recurring' | 'habit'
  ) => void
  onClose: () => void
}

export function RecurrenceDialog({
  taskId,
  taskLabel,
  currentPattern,
  currentTaskType = 'one-time',
  onSave,
  onClose,
}: RecurrenceDialogProps) {
  const [taskType, setTaskType] = useState<'recurring' | 'habit'>(
    currentTaskType === 'habit' ? 'habit' : 'recurring'
  )

  const handleSave = (pattern: RecurrencePattern | undefined) => {
    onSave(taskId, pattern, taskType)
  }

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-safe">
      <div className="bg-card rounded-lg shadow-xl max-w-md w-full mx-4 border">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Make Task Recurring</h2>
            <p className="text-sm text-muted-foreground">{taskLabel}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Task Type Selection */}
        <div className="p-4 border-b">
          <label className="block text-sm font-medium mb-2">Task Type</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                value="recurring"
                checked={taskType === 'recurring'}
                onChange={e => setTaskType(e.target.value as 'recurring' | 'habit')}
                className="mr-2"
              />
              <span className="text-sm">Recurring Task</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="habit"
                checked={taskType === 'habit'}
                onChange={e => setTaskType(e.target.value as 'recurring' | 'habit')}
                className="mr-2"
              />
              <span className="text-sm">Habit (with streak tracking)</span>
            </label>
          </div>
          {taskType === 'habit' && (
            <p className="text-xs text-muted-foreground mt-2">
              Habits track completion streaks to help build consistency
            </p>
          )}
        </div>

        {/* Recurrence Pattern Selector */}
        <RecurrenceSelector pattern={currentPattern} onChange={handleSave} onClose={onClose} />
      </div>
    </div>
  )
}
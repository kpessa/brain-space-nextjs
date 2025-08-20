'use client'

import { useState } from 'react'
import { calculateSnoozeUntil, type SnoozeUnit, type SpecialSnoozeOption } from '@/lib/snooze'
import { Clock } from 'lucide-react'

interface SnoozeInputProps {
  onSnooze: (until: Date) => void
  onCancel: () => void
}

export function SnoozeInput({ onSnooze, onCancel }: SnoozeInputProps) {
  const [value, setValue] = useState(1)
  const [unit, setUnit] = useState<SnoozeUnit>('hours')
  
  const handleSnooze = () => {
    const until = calculateSnoozeUntil(value, unit)
    onSnooze(until)
  }
  
  const handleQuickOption = (option: SpecialSnoozeOption) => {
    const until = calculateSnoozeUntil(1, option)
    onSnooze(until)
  }
  
  return (
    <div className="p-3 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[200px]">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Snooze for:</span>
      </div>
      
      <div className="flex items-center gap-2 mb-3">
        <input
          type="number"
          min="1"
          value={value}
          onChange={(e) => setValue(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brain-500"
        />
        <select
          value={unit}
          onChange={(e) => setUnit(e.target.value as SnoozeUnit)}
          className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brain-500"
        >
          <option value="minutes">minutes</option>
          <option value="hours">hours</option>
          <option value="days">days</option>
          <option value="weeks">weeks</option>
          <option value="months">months</option>
        </select>
        <button
          onClick={handleSnooze}
          className="px-3 py-1 text-sm font-medium text-white bg-brain-600 rounded hover:bg-brain-700 focus:outline-none focus:ring-2 focus:ring-brain-500"
        >
          Snooze
        </button>
      </div>
      
      <div className="border-t pt-2">
        <div className="text-xs text-gray-500 mb-2">Quick options:</div>
        <div className="flex flex-col gap-1">
          <button
            onClick={() => handleQuickOption('until-tomorrow')}
            className="text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            Until tomorrow (9am)
          </button>
          <button
            onClick={() => handleQuickOption('until-next-week')}
            className="text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            Until next week (Monday 9am)
          </button>
          <button
            onClick={() => handleQuickOption('until-tonight')}
            className="text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            Until tonight (6pm)
          </button>
          <button
            onClick={() => handleQuickOption('until-morning')}
            className="text-left px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
          >
            Until morning (6am)
          </button>
        </div>
      </div>
      
      <div className="flex justify-end mt-3 pt-2 border-t">
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
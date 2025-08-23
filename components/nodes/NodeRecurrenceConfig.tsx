'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import type { Recurrence } from '@/types/node'
import { Repeat, X } from '@/lib/icons'

interface NodeRecurrenceConfigProps {
  isOpen: boolean
  onClose: () => void
  recurrence: Recurrence | null
  onSave: (recurrence: Recurrence | null) => void
  saving: boolean
}

export function NodeRecurrenceConfig({
  isOpen,
  onClose,
  recurrence,
  onSave,
  saving
}: NodeRecurrenceConfigProps) {
  const [pattern, setPattern] = useState<Recurrence | null>(recurrence)
  const [isEnabled, setIsEnabled] = useState(!!recurrence)

  const handleSave = () => {
    onSave(isEnabled ? pattern : null)
  }

  const handlePatternChange = (field: keyof Recurrence, value: any) => {
    if (!pattern) {
      setPattern({
        frequency: 'daily',
        interval: 1,
        endDate: null,
        daysOfWeek: [],
        dayOfMonth: null,
        monthOfYear: null
      })
    }
    setPattern(prev => prev ? { ...prev, [field]: value } : null)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configure Recurrence"
      size="md"
    >
      <div className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="enableRecurrence"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="rounded border-gray-300 text-brain-600 focus:ring-brain-500"
          />
          <label htmlFor="enableRecurrence" className="text-sm font-medium text-gray-700">
            Make this task recurring
          </label>
        </div>

        {isEnabled && (
          <>
            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Frequency
              </label>
              <select
                value={pattern?.frequency || 'daily'}
                onChange={(e) => handlePatternChange('frequency', e.target.value)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brain-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            {/* Interval */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Repeat every
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={pattern?.interval || 1}
                  onChange={(e) => handlePatternChange('interval', parseInt(e.target.value) || 1)}
                  className="w-20 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brain-500"
                />
                <span className="text-sm text-gray-600">
                  {pattern?.frequency === 'daily' && 'day(s)'}
                  {pattern?.frequency === 'weekly' && 'week(s)'}
                  {pattern?.frequency === 'monthly' && 'month(s)'}
                  {pattern?.frequency === 'yearly' && 'year(s)'}
                </span>
              </div>
            </div>

            {/* Days of Week (for weekly recurrence) */}
            {pattern?.frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  On these days
                </label>
                <div className="flex gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        const days = pattern?.daysOfWeek || []
                        const newDays = days.includes(index)
                          ? days.filter(d => d !== index)
                          : [...days, index]
                        handlePatternChange('daysOfWeek', newDays)
                      }}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        pattern?.daysOfWeek?.includes(index)
                          ? 'bg-brain-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Day of Month (for monthly recurrence) */}
            {pattern?.frequency === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  On day
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={pattern?.dayOfMonth || 1}
                  onChange={(e) => handlePatternChange('dayOfMonth', parseInt(e.target.value) || 1)}
                  className="w-20 p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brain-500"
                />
              </div>
            )}

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End date (optional)
              </label>
              <input
                type="date"
                value={pattern?.endDate ? new Date(pattern.endDate).toISOString().split('T')[0] : ''}
                onChange={(e) => handlePatternChange('endDate', e.target.value || null)}
                className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-brain-500"
              />
            </div>

            {/* Preview */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-1">Preview</h4>
              <p className="text-sm text-gray-600">
                This task will repeat every {pattern?.interval || 1}{' '}
                {pattern?.frequency || 'day'}(s)
                {pattern?.frequency === 'weekly' && pattern?.daysOfWeek?.length > 0 && (
                  <> on {pattern.daysOfWeek.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')}</>
                )}
                {pattern?.frequency === 'monthly' && pattern?.dayOfMonth && (
                  <> on day {pattern.dayOfMonth}</>
                )}
                {pattern?.endDate && (
                  <> until {new Date(pattern.endDate).toLocaleDateString()}</>
                )}
              </p>
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
          >
            <Repeat className="w-4 h-4 mr-1" />
            {saving ? 'Saving...' : 'Save Recurrence'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
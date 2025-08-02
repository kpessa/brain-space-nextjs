'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Clock, Calendar, CalendarOff, Settings2, Info, Trash2, Plus } from 'lucide-react'
import { useScheduleStore, type WorkSchedule, type PTODay } from '@/store/scheduleStore'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

interface ScheduleSettingsDialogProps {
  trigger?: React.ReactNode
}

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
] as const

const PTO_TYPES = [
  { value: 'pto', label: 'PTO', color: 'bg-blue-100 text-blue-700' },
  { value: 'holiday', label: 'Holiday', color: 'bg-green-100 text-green-700' },
  { value: 'sick', label: 'Sick Day', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'personal', label: 'Personal', color: 'bg-purple-100 text-purple-700' },
] as const

export default function ScheduleSettingsDialog({ trigger }: ScheduleSettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'schedule' | 'pto' | 'preferences'>('schedule')
  const [newPTODate, setNewPTODate] = useState('')
  const [newPTOType, setNewPTOType] = useState<PTODay['type']>('pto')
  const [newPTODescription, setNewPTODescription] = useState('')
  
  const {
    workSchedule,
    ptoDays,
    preferences,
    updateWorkSchedule,
    addPTODay,
    removePTODay,
    updatePreferences,
  } = useScheduleStore()
  
  const handleTimeChange = (
    day: keyof WorkSchedule, 
    field: 'start' | 'end', 
    value: string
  ) => {
    updateWorkSchedule(day, { [field]: value })
  }
  
  const handleToggleDay = (day: keyof WorkSchedule) => {
    updateWorkSchedule(day, { enabled: !workSchedule[day].enabled })
  }
  
  const handleAddPTO = () => {
    if (newPTODate) {
      addPTODay({
        date: newPTODate,
        type: newPTOType,
        description: newPTODescription || undefined,
      })
      setNewPTODate('')
      setNewPTODescription('')
    }
  }
  
  const getPTOTypeColor = (type: PTODay['type']) => {
    return PTO_TYPES.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-700'
  }
  
  return (
    <>
      {trigger ? (
        <div onClick={() => setOpen(true)}>
          {trigger}
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setOpen(true)}
        >
          <Settings2 className="w-4 h-4" />
          Schedule Settings
        </Button>
      )}
      
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brain-600" />
            Work Schedule & Preferences
          </div>
        }
        size="lg"
      >
        <div className="flex flex-col max-h-[calc(80vh-8rem)]">
          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg mb-4">
            <button
              onClick={() => setActiveTab('schedule')}
              className={cn(
                "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === 'schedule'
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Work Hours
            </button>
            <button
              onClick={() => setActiveTab('pto')}
              className={cn(
                "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === 'pto'
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              PTO & Holidays
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={cn(
                "flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                activeTab === 'preferences'
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              Preferences
            </button>
          </div>
          
          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            {/* Work Hours Tab */}
            {activeTab === 'schedule' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Weekly Work Schedule</CardTitle>
                    <CardDescription>
                      Define your regular work hours for each day of the week
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {DAYS_OF_WEEK.map(({ key, label }) => (
                      <div key={key} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`enable-${key}`}
                          checked={workSchedule[key].enabled}
                          onChange={() => handleToggleDay(key)}
                          className="rounded border-gray-300 text-brain-600 focus:ring-brain-500"
                        />
                        <label
                          htmlFor={`enable-${key}`}
                          className={cn(
                            "w-24 text-sm font-medium",
                            !workSchedule[key].enabled && "text-gray-400"
                          )}
                        >
                          {label}
                        </label>
                        <input
                          type="time"
                          value={workSchedule[key].start}
                          onChange={(e) => handleTimeChange(key, 'start', e.target.value)}
                          disabled={!workSchedule[key].enabled}
                          className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brain-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <span className="text-sm text-gray-500">to</span>
                        <input
                          type="time"
                          value={workSchedule[key].end}
                          onChange={(e) => handleTimeChange(key, 'end', e.target.value)}
                          disabled={!workSchedule[key].enabled}
                          className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-brain-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
                
                <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">
                    Your work schedule helps Brain Space automatically switch between work and personal modes at the right times.
                  </p>
                </div>
              </div>
            )}
            
            {/* PTO Tab */}
            {activeTab === 'pto' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Add Time Off</CardTitle>
                    <CardDescription>
                      Mark days when you'll be out of office
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="date"
                          value={newPTODate}
                          onChange={(e) => setNewPTODate(e.target.value)}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brain-500"
                        />
                        <select
                          value={newPTOType}
                          onChange={(e) => setNewPTOType(e.target.value as PTODay['type'])}
                          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brain-500"
                        >
                          {PTO_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        type="text"
                        value={newPTODescription}
                        onChange={(e) => setNewPTODescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brain-500"
                      />
                      <Button
                        onClick={handleAddPTO}
                        disabled={!newPTODate}
                        size="sm"
                        className="w-full"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Time Off
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                {ptoDays.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Scheduled Time Off</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {ptoDays
                          .sort((a, b) => a.date.localeCompare(b.date))
                          .map((pto) => (
                            <div
                              key={pto.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <CalendarOff className="w-4 h-4 text-gray-500" />
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">
                                      {format(parseISO(pto.date), 'EEEE, MMMM d, yyyy')}
                                    </span>
                                    <span className={cn(
                                      "text-xs px-2 py-0.5 rounded-full",
                                      getPTOTypeColor(pto.type)
                                    )}>
                                      {pto.type}
                                    </span>
                                  </div>
                                  {pto.description && (
                                    <p className="text-xs text-gray-600 mt-0.5">
                                      {pto.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={() => removePTODay(pto.id)}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            
            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Mode Switching</CardTitle>
                    <CardDescription>
                      Configure how Brain Space switches between work and personal modes
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={preferences.autoSwitchMode}
                        onChange={(e) => updatePreferences({ autoSwitchMode: e.target.checked })}
                        className="rounded border-gray-300 text-brain-600 focus:ring-brain-500"
                      />
                      <div>
                        <div className="text-sm font-medium">Auto-switch based on schedule</div>
                        <div className="text-xs text-gray-600">
                          Automatically change mode when entering/leaving work hours
                        </div>
                      </div>
                    </label>
                    
                    <div className="space-y-3 pl-7">
                      <div>
                        <label className="text-sm font-medium">During work hours, use:</label>
                        <select
                          value={preferences.defaultWorkMode}
                          onChange={(e) => updatePreferences({ defaultWorkMode: e.target.value as 'work' | 'all' })}
                          disabled={!preferences.autoSwitchMode}
                          className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brain-500 disabled:opacity-50"
                        >
                          <option value="work">Work Mode</option>
                          <option value="all">All Mode</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium">During personal time, use:</label>
                        <select
                          value={preferences.defaultPersonalMode}
                          onChange={(e) => updatePreferences({ defaultPersonalMode: e.target.value as 'personal' | 'all' })}
                          disabled={!preferences.autoSwitchMode}
                          className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brain-500 disabled:opacity-50"
                        >
                          <option value="personal">Personal Mode</option>
                          <option value="all">All Mode</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Calendar Integration</CardTitle>
                    <CardDescription>
                      Configure how calendar events affect mode switching
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={preferences.respectCalendarEvents}
                        onChange={(e) => updatePreferences({ respectCalendarEvents: e.target.checked })}
                        className="rounded border-gray-300 text-brain-600 focus:ring-brain-500"
                      />
                      <div>
                        <div className="text-sm font-medium">Consider calendar events</div>
                        <div className="text-xs text-gray-600">
                          Stay in work mode during work calendar events outside normal hours
                        </div>
                      </div>
                    </label>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
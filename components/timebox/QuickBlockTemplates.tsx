import React from 'react'
import { Button } from '@/components/ui/Button'
import { Users, Coffee, Stethoscope, Settings } from '@/lib/icons'

interface QuickBlockTemplatesProps {
  currentMode: string
  timeSlots: any[]
  onBlockTimeSlot: (slotId: string, reason: string, label: string) => void
}

export function QuickBlockTemplates({ currentMode, timeSlots, onBlockTimeSlot }: QuickBlockTemplatesProps) {
  if (currentMode !== 'work') return null

  return (
    <div className="mt-2 p-2 bg-white/10 rounded-lg backdrop-blur-sm">
      <div className="flex flex-wrap gap-1">
        <Button
          variant="outline"
          size="sm"
          className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs h-8 px-2"
          onClick={() => {
            const slot = timeSlots.find(s => s.startTime === '09:00' || s.startTime === '09:30')
            if (slot) onBlockTimeSlot(slot.id, 'meeting', 'Morning Standup')
          }}
        >
          <Users className="w-3 h-3 mr-1" />
          9am
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs h-8 px-2"
          onClick={() => {
            const slot = timeSlots.find(s => s.startTime === '12:00' || s.startTime === '12:30')
            if (slot) onBlockTimeSlot(slot.id, 'lunch', 'Lunch Break')
          }}
        >
          <Coffee className="w-3 h-3 mr-1" />
          Lunch
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs h-8 px-2"
          onClick={() => {
            const slot = timeSlots.find(s => s.startTime === '14:00' || s.startTime === '14:30')
            if (slot) onBlockTimeSlot(slot.id, 'patient-care', 'Patient Appointments')
          }}
        >
          <Stethoscope className="w-3 h-3 mr-1" />
          Patient
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="bg-white/10 text-white hover:bg-white/20 border-white/20 text-xs h-8 px-2"
          onClick={() => {
            const slot = timeSlots.find(s => s.startTime === '16:00' || s.startTime === '16:30')
            if (slot) onBlockTimeSlot(slot.id, 'admin', 'Admin Work')
          }}
        >
          <Settings className="w-3 h-3 mr-1" />
          Admin
        </Button>
      </div>
    </div>
  )
}

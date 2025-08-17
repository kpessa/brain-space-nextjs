import { useState, useCallback } from 'react'
import { type TimeboxTask } from '@/store/timeboxStore'
import { useTimeboxActions } from '@/hooks/useTimeboxSelectors'

export function useTimeboxDragDrop(userId: string, selectedDate: string | null) {
  const [draggedTask, setDraggedTask] = useState<TimeboxTask | null>(null)
  const { 
    addTaskToSlot, 
    removeTaskFromSlot, 
    moveTaskBetweenSlots,
    setHoveredSlotId 
  } = useTimeboxActions()

  const handleDragStart = useCallback((e: React.DragEvent, task: TimeboxTask) => {
    // Store task data in both dataTransfer and state for reliability
    e.dataTransfer.setData('application/json', JSON.stringify(task))
    e.dataTransfer.effectAllowed = 'move'
    setDraggedTask(task)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedTask(null)
    setHoveredSlotId(null)
  }, [setHoveredSlotId])

  const handleDragOver = useCallback((e: React.DragEvent, slotId: string) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling
    
    // Extract the actual slot ID for hovering effect
    const actualSlotId = slotId.replace(/^(past-|current-)/, '')
    setHoveredSlotId(actualSlotId)
  }, [setHoveredSlotId])

  const handleDrop = useCallback(async (e: React.DragEvent, slotId: string, timeSlots: any[]) => {
    e.preventDefault()
    e.stopPropagation() // Prevent event bubbling
    
    // Extract the actual slot ID (remove 'past-' or 'current-' prefix if present)
    const actualSlotId = slotId.replace(/^(past-|current-)/, '')
    
    // Try to get task from dataTransfer first, fall back to state
    let taskToAdd: TimeboxTask | null = null
    
    try {
      const dataTransferData = e.dataTransfer.getData('application/json')
      if (dataTransferData) {
        taskToAdd = JSON.parse(dataTransferData)
      }
    } catch (error) {
      // Failed to parse dataTransfer, will use state fallback
    }
    
    // Fall back to state if dataTransfer failed
    if (!taskToAdd) {
      taskToAdd = draggedTask
    }
    
    if (!taskToAdd) {
      return
    }
    
    // Check if slot is blocked
    const targetSlot = timeSlots.find(slot => slot.id === actualSlotId)

    if (!targetSlot) {
      handleDragEnd()
      return
    }
    
    if (targetSlot?.isBlocked) {
      handleDragEnd()
      return
    }
    
    try {
      // Check if task is being moved from another slot
      const sourceSlot = timeSlots.find(slot => 
        slot.tasks.some((t: any) => t.id === taskToAdd!.id)
      )
      
      if (sourceSlot) {
        await moveTaskBetweenSlots(taskToAdd.id, sourceSlot.id, actualSlotId)
      } else {
        // Add new task to slot with unique ID
        const taskWithId = {
          ...taskToAdd,
          id: taskToAdd.id || `task-${taskToAdd.nodeId}-${Date.now()}`,
          userId: userId,
          timeboxDate: selectedDate,
          isPersonal: taskToAdd.isPersonal,
        }
        
        await addTaskToSlot(taskWithId, actualSlotId)
      }
    } catch (error) {
      // Failed to drop task
    } finally {
      handleDragEnd()
    }
  }, [draggedTask, userId, selectedDate, addTaskToSlot, moveTaskBetweenSlots, handleDragEnd])

  return {
    draggedTask,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDrop
  }
}

// Accessibility helpers for WCAG compliance

/**
 * Get priority color with WCAG AA compliant contrast ratios
 * Ensures at least 4.5:1 contrast for normal text
 */
export function getAccessiblePriorityColor(importance?: number, urgency?: number) {
  if (importance === undefined || urgency === undefined) {
    return {
      background: 'bg-gray-100',
      border: 'border-gray-400', // Darker border for better contrast
      text: 'text-gray-800'
    }
  }
  
  const score = importance + urgency
  
  if (score >= 16) {
    return {
      background: 'bg-red-50',
      border: 'border-red-600', // Darker red for better contrast
      text: 'text-red-900' // Darker text for better contrast
    }
  }
  
  if (score >= 12) {
    return {
      background: 'bg-orange-50',
      border: 'border-orange-600',
      text: 'text-orange-900'
    }
  }
  
  if (score >= 8) {
    return {
      background: 'bg-yellow-50',
      border: 'border-yellow-700', // Darker yellow for better contrast
      text: 'text-yellow-900'
    }
  }
  
  return {
    background: 'bg-green-50',
    border: 'border-green-600',
    text: 'text-green-900'
  }
}

/**
 * Ensure minimum touch target size (44x44px for WCAG 2.5.5)
 */
export const touchTargetClasses = 'min-h-[44px] min-w-[44px] p-2'

/**
 * Add live region announcements for screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div')
  announcement.setAttribute('role', 'status')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.textContent = message
  
  document.body.appendChild(announcement)
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Generate unique IDs for ARIA relationships
 */
export function generateAriaId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Keyboard navigation helpers
 */
export const keyboardShortcuts = {
  dragStart: ['Space', 'Enter'],
  dragCancel: ['Escape'],
  moveUp: ['ArrowUp'],
  moveDown: ['ArrowDown'],
  moveLeft: ['ArrowLeft'],
  moveRight: ['ArrowRight'],
  delete: ['Delete', 'Backspace'],
  complete: ['x', 'X']
}

/**
 * Get ARIA label for time slot
 */
export function getTimeSlotAriaLabel(slot: any): string {
  const taskCount = slot.tasks?.length || 0
  const blockedText = slot.isBlocked ? 'blocked' : 'available'
  const tasksText = taskCount === 0 ? 'empty' : `${taskCount} task${taskCount !== 1 ? 's' : ''}`
  
  return `Time slot ${slot.startTime} to ${slot.endTime}, ${blockedText}, ${tasksText}`
}

/**
 * Get ARIA label for task
 */
export function getTaskAriaLabel(task: any): string {
  const statusText = task.status === 'completed' ? 'completed' : 'pending'
  const priorityText = task.importance && task.urgency 
    ? `priority ${task.importance + task.urgency}` 
    : ''
  
  return `${task.label}, ${statusText} ${priorityText}`.trim()
}
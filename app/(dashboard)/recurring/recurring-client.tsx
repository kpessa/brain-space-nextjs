'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useNodesStore } from '@/store/nodes'
import { RecurrenceDialog } from '@/components/RecurrenceDialog'
import { NodeSelectorModal } from '@/components/nodes/NodeSelectorModal'
import { 
  shouldTaskOccurOnDate, 
  formatRecurrencePattern,
  calculateCurrentStreak,
  isRecurringTaskCompletedForDate,
} from '@/lib/recurringTasks'
import dayjs from 'dayjs'
import { 
  CheckCircle2, 
  Circle, 
  Calendar, 
  Repeat,
  Flame,
  Plus,
  Clock,
  Target,
} from 'lucide-react'
import type { Node } from '@/types/node'
import type { RecurrencePattern } from '@/types/recurrence'

export default function RecurringClient({ userId }: { userId: string }) {
  const { nodes, isLoading: loading, error, loadNodes, updateNode } = useNodesStore()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showRecurrenceDialog, setShowRecurrenceDialog] = useState(false)
  const [showNodeSelector, setShowNodeSelector] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

  useEffect(() => {

    loadNodes(userId)
  }, [userId, loadNodes])

  // Get all recurring tasks

  // Sample nodes data
  
  const recurringNodes = nodes.filter(
    node => node.taskType === 'recurring' || node.taskType === 'habit'
  )

  // Recurring nodes data

  // Get tasks for selected date
  const tasksForDate = recurringNodes.filter(node => {
    if (!node.recurrence) return false
    const pattern: RecurrencePattern = {
      type: node.recurrence.frequency,
      frequency: node.recurrence.interval,
      daysOfWeek: node.recurrence.daysOfWeek?.map(day => {
        const dayMap: Record<string, number> = {
          'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
          'Thursday': 4, 'Friday': 5, 'Saturday': 6
        }
        return dayMap[day]
      }),
      dayOfMonth: node.recurrence.frequency === 'monthly' ? 
        new Date(node.createdAt || '').getDate() : undefined,
      startDate: node.createdAt?.split('T')[0] || dayjs().format('YYYY-MM-DD'),
      endDate: node.recurrence.endDate,
    }
    return shouldTaskOccurOnDate(pattern, selectedDate)
  })

  const handleToggleTask = async (node: Node) => {
    const dateStr = dayjs(selectedDate).format('YYYY-MM-DD')
    const completions = node.recurringCompletions || []
    const isCompleted = isRecurringTaskCompletedForDate(completions, dateStr)

    if (!isCompleted) {
      // Mark as completed
      const newCompletions = [
        ...completions,
        {
          date: dateStr,
          completedAt: new Date().toISOString(),
          status: 'completed' as const,
        }
      ]
      await updateNode(node.id, {
        recurringCompletions: newCompletions,
        lastRecurringCompletionDate: dateStr,
      })
    } else {
      // Unmark
      const newCompletions = completions.filter(c => c.date !== dateStr)
      await updateNode(node.id, {
        recurringCompletions: newCompletions,
      })
    }
  }

  const handleSaveRecurrence = async (
    nodeId: string, 
    pattern: RecurrencePattern | undefined,
    taskType: 'recurring' | 'habit'
  ) => {
    if (!pattern) {
      // Remove recurrence
      await updateNode(nodeId, {
        taskType: 'one-time',
        recurrence: undefined,
      })
    } else {
      // Update recurrence
      const recurrence: any = {
        frequency: pattern.type as any,
        interval: pattern.frequency || 1,
      }
      
      // Only add optional fields if they have values
      if (pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        recurrence.daysOfWeek = pattern.daysOfWeek.map(d => {
          const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
          return days[d] as any
        })
      }
      
      if (pattern.endDate) {
        recurrence.endDate = pattern.endDate
      }
      await updateNode(nodeId, {
        taskType,
        recurrence,
      })
    }
    setShowRecurrenceDialog(false)
    setSelectedNode(null)
  }

  const navigateDate = (days: number) => {
    setSelectedDate(prevDate => days > 0 ? dayjs(prevDate).add(days, 'day').toDate() : dayjs(prevDate).subtract(Math.abs(days), 'day').toDate())
  }

  const handleNodeSelected = (node: Node) => {
    setSelectedNode(node)
    setShowNodeSelector(false)
    setShowRecurrenceDialog(true)
  }

  if (loading) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brain-600"></div>
        </div>
    )
  }

  if (error) {
    return (
        <div className="flex items-center justify-center h-64">
          <div className="text-red-600">Error: {error}</div>
        </div>
    )
  }

  return (
      <div className="bg-gradient-to-br from-brain-600 via-space-600 to-brain-700 -m-8 p-8 min-h-[calc(var(--vh,1vh)*100-4rem)]">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Recurring Tasks & Habits</h1>
            <p className="text-white/80 text-lg">
              Build consistency with recurring tasks and habit tracking
            </p>
          </header>

        {/* Date Navigation */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => navigateDate(-1)}>
                Previous Day
              </Button>
              <div className="text-center">
                <h2 className="text-xl font-semibold">{dayjs(selectedDate).format('dddd, MMMM D, YYYY')}</h2>
                {dayjs(selectedDate).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD') && (
                  <Badge variant="primary" className="mt-1">Today</Badge>
                )}
              </div>
              <Button variant="outline" onClick={() => navigateDate(1)}>
                Next Day
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tasks for Selected Date */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brain-600" />
                  <CardTitle>Tasks for {dayjs(selectedDate).format('MMM D')}</CardTitle>
                </div>
                <Badge variant="ghost">{tasksForDate.length} tasks</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {tasksForDate.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No tasks scheduled for this date</p>
              ) : (
                <div className="space-y-2">
                  {tasksForDate.map(node => {
                    const dateStr = dayjs(selectedDate).format('YYYY-MM-DD')
                    const isCompleted = isRecurringTaskCompletedForDate(
                      node.recurringCompletions, 
                      dateStr
                    )
                    const pattern: RecurrencePattern = {
                      type: node.recurrence!.frequency,
                      frequency: node.recurrence!.interval,
                      startDate: node.createdAt?.split('T')[0] || dayjs().format('YYYY-MM-DD'),
                    }
                    const streak = node.taskType === 'habit' ? 
                      calculateCurrentStreak(node.recurringCompletions, pattern) : 0

                    return (
                      <div
                        key={node.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                          isCompleted ? 'bg-green-50 border-green-200' : 'bg-white'
                        }`}
                      >
                        <button
                          onClick={() => handleToggleTask(node)}
                          className="mt-0.5 flex-shrink-0"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                        
                        <div className="flex-1">
                          <h4 className={`font-medium ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {node.title}
                          </h4>
                          {node.description && (
                            <p className="text-sm text-gray-600 mt-1">{node.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="ghost" className="text-xs">
                              {node.taskType === 'habit' ? 'Habit' : 'Recurring'}
                            </Badge>
                            {streak > 0 && (
                              <div className="flex items-center gap-1 text-orange-600">
                                <Flame className="w-3 h-3" />
                                <span className="text-xs font-medium">{streak} day streak</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Recurring Tasks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Repeat className="w-5 h-5 text-purple-600" />
                  <CardTitle>All Recurring Tasks</CardTitle>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowNodeSelector(true)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    From Existing
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      // Create a new task and open recurrence dialog
                      setSelectedNode({ id: 'new', title: 'New Task' } as Node)
                      setShowRecurrenceDialog(true)
                    }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Create New
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {recurringNodes.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No recurring tasks set up yet</p>
              ) : (
                <div className="space-y-2">
                  {recurringNodes.map(node => {
                    const pattern: RecurrencePattern = {
                      type: node.recurrence!.frequency,
                      frequency: node.recurrence!.interval,
                      daysOfWeek: node.recurrence!.daysOfWeek?.map(day => {
                        const dayMap: Record<string, number> = {
                          'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                          'Thursday': 4, 'Friday': 5, 'Saturday': 6
                        }
                        return dayMap[day]
                      }),
                      startDate: node.createdAt?.split('T')[0] || dayjs().format('YYYY-MM-DD'),
                    }
                    const patternStr = formatRecurrencePattern(pattern)

                    return (
                      <div
                        key={node.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-white hover:shadow-sm transition-all cursor-pointer"
                        onClick={() => {
                          setSelectedNode(node)
                          setShowRecurrenceDialog(true)
                        }}
                      >
                        <div>
                          <h4 className="font-medium text-gray-900">{node.title}</h4>
                          <p className="text-sm text-gray-600">{patternStr}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {node.taskType === 'habit' && (
                            <Badge variant="ghost" className="text-xs">
                              <Target className="w-3 h-3 mr-1" />
                              Habit
                            </Badge>
                          )}
                          <Clock className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Node Selector Modal */}
        <NodeSelectorModal
          isOpen={showNodeSelector}
          onClose={() => setShowNodeSelector(false)}
          onSelectNode={handleNodeSelected}
          userId={userId}
        />

        {/* Recurrence Dialog */}
        {showRecurrenceDialog && selectedNode && (
          <RecurrenceDialog
            taskId={selectedNode.id}
            taskLabel={selectedNode.title || 'Task'}
            currentPattern={selectedNode.recurrence ? {
              type: selectedNode.recurrence.frequency,
              frequency: selectedNode.recurrence.interval,
              daysOfWeek: selectedNode.recurrence.daysOfWeek?.map(day => {
                const dayMap: Record<string, number> = {
                  'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
                  'Thursday': 4, 'Friday': 5, 'Saturday': 6
                }
                return dayMap[day]
              }),
              startDate: selectedNode.createdAt?.split('T')[0] || dayjs().format('YYYY-MM-DD'),
              endDate: selectedNode.recurrence.endDate,
            } : undefined}
            currentTaskType={selectedNode.taskType}
            onSave={handleSaveRecurrence}
            onClose={() => {
              setShowRecurrenceDialog(false)
              setSelectedNode(null)
            }}
          />
        )}
        </div>
      </div>
  )
}
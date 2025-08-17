'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Sparkles, Brain, Loader2, ChevronRight, CheckCircle, Info } from '@/lib/icons'
import { useTimeboxStore } from '@/store/timeboxStore'
import { useNodesStore } from '@/store/nodeStore'
import { useUserPreferencesStore } from '@/store/userPreferencesStore'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
// Remove the AIProviderSelector import since we'll create our own dropdown

interface TimeboxRecommendation {
  slotId: string
  taskId: string
  taskTitle: string
  reasoning: string
  priority: 'high' | 'medium' | 'low'
  suggestedDate?: string
}

interface RecommendationsDialogProps {
  userId: string
  date: string
  trigger?: React.ReactNode
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string): string {
  return markdown
    .replace(/### (.*?)$/gm, '<h3 class="font-semibold mt-3 mb-1">$1</h3>')
    .replace(/## (.*?)$/gm, '<h2 class="font-bold mt-4 mb-2">$1</h2>')
    .replace(/# (.*?)$/gm, '<h1 class="font-bold text-lg mt-4 mb-2">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p class="mb-2">')
    .replace(/^/, '<p class="mb-2">')
    .replace(/$/, '</p>')
}

export default function TimeboxRecommendationsDialog({ 
  userId, 
  date,
  trigger 
}: RecommendationsDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recommendations, setRecommendations] = useState<TimeboxRecommendation[]>([])
  const [insights, setInsights] = useState<string[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [appliedRecommendations, setAppliedRecommendations] = useState<Set<string>>(new Set())
  const [aiProvider, setAiProvider] = useState<string>('gemini') // Default to gemini
  const [error, setError] = useState<string | null>(null)
  const [userContext, setUserContext] = useState<string>('')
  
  const { timeSlots, addTaskToSlot } = useTimeboxStore()
  const { nodes } = useNodesStore()
  const { currentMode } = useUserPreferencesStore()
  
  // Get unscheduled nodes
  const unscheduledNodes = nodes.filter(node => 
    !node.completed && 
    !timeSlots.some(slot => 
      slot.tasks.some(task => task.nodeId === node.id)
    )
  )
  
  const generateRecommendations = async () => {
    setLoading(true)
    setError(null)
    setRecommendations([])
    setInsights([])
    setSummary(null)
    
    // Get current time
    const now = new Date()
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
    
    try {
      const response = await fetch('/api/ai/timebox-recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: aiProvider === 'gemini' ? 'google' : aiProvider,
          userId,
          date,
          currentTime,
          userContext: userContext.trim() || undefined,
          unscheduledNodes: unscheduledNodes.map(node => ({
            id: node.id,
            title: node.title || 'Untitled',
            type: node.type,
            urgency: node.urgency,
            importance: node.importance,
            dueDate: node.dueDate,
            tags: node.tags,
            isPersonal: node.isPersonal,
            parent: node.parent,
            children: node.children,
            completed: node.completed
          })),
          timeSlots: timeSlots.map(slot => ({
            id: slot.id,
            startTime: slot.startTime,
            endTime: slot.endTime,
            displayTime: slot.displayTime,
            period: slot.period,
            isBlocked: slot.isBlocked,
            currentTasks: slot.tasks.length
          })),
          currentMode,
          allNodes: nodes.map(node => ({
            id: node.id,
            title: node.title || 'Untitled',
            parent: node.parent,
            children: node.children,
            completed: node.completed
          }))
        }),
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate recommendations')
      }

      setRecommendations(data.recommendations || [])
      setInsights(data.insights || [])
      setSummary(data.summary || null)
    } catch (error) {
      console.error('Error generating recommendations:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate recommendations')
    } finally {
      setLoading(false)
    }
  }
  
  const applyRecommendation = async (recommendation: TimeboxRecommendation) => {
    const node = unscheduledNodes.find(n => n.id === recommendation.taskId)
    if (!node) return
    
    await addTaskToSlot({
      id: node.id,
      label: node.title || 'Untitled',
      nodeId: node.id,
      importance: node.importance,
      urgency: node.urgency,
      category: node.type,
      userId,
      timeboxDate: date,
    }, recommendation.slotId)
    
    setAppliedRecommendations(prev => new Set(prev).add(recommendation.taskId))
  }
  
  const applyAllRecommendations = async () => {
    for (const recommendation of recommendations) {
      // Only apply recommendations for today (not future dates)
      const isLaterDate = recommendation.suggestedDate && recommendation.suggestedDate !== date
      if (!appliedRecommendations.has(recommendation.taskId) && !isLaterDate) {
        await applyRecommendation(recommendation)
      }
    }
  }
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      case 'low': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
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
          <Sparkles className="w-4 h-4" />
          AI Recommendations
        </Button>
      )}
      
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-brain-600" />
            AI Day Structure Recommendations
          </div>
        }
        size="lg"
      >
        <div className="flex flex-col max-h-[calc(80vh-8rem)]">
          <p className="text-sm text-gray-600 mb-4">
            Get personalized suggestions for organizing your day based on task priorities and optimal time slots
          </p>
          
          {/* AI Provider Selector and Context Input - Fixed at top */}
          <div className="space-y-3 mb-4 pb-4 border-b">
            {/* Context Input */}
            <div className="space-y-2">
              <label className="text-sm text-gray-600">Additional Context (optional):</label>
              <textarea
                value={userContext}
                onChange={(e) => setUserContext(e.target.value)}
                placeholder="E.g., I have a meeting at 2pm, prefer focus work in the morning, feeling low energy today..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none h-16 focus:outline-none focus:ring-2 focus:ring-brain-500 focus:border-transparent"
              />
            </div>
            
            {/* Provider selector and generate button */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">AI Provider:</label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-brain-500 focus:border-transparent"
                >
                  <option value="openai">OpenAI GPT-4</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>
              <Button 
                onClick={generateRecommendations}
                disabled={loading || unscheduledNodes.length === 0}
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Plan
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Scrollable content area */}
          <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
          
          {unscheduledNodes.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <p>No unscheduled tasks to organize</p>
                <p className="text-sm mt-1">Create some nodes first to get recommendations</p>
              </CardContent>
            </Card>
          )}
          
          {/* Error Display */}
          {error && (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-red-600 text-xs font-bold">!</span>
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-medium text-red-900">Failed to generate recommendations</h4>
                    <p className="text-sm text-red-800">{error}</p>
                    {error.includes('API key') && (
                      <p className="text-xs text-red-700 mt-2">
                        Make sure your AI provider API key is configured in the environment variables.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* AI Summary */}
          {summary && (
            <Card className="bg-gray-50 border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="w-4 h-4 text-gray-600" />
                  AI Scheduling Strategy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-gray-700">
                  <div dangerouslySetInnerHTML={{ __html: markdownToHtml(summary) }} />
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Insights */}
          {insights.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-900">Strategic Insights</h4>
                    <ul className="space-y-1">
                      {insights.map((insight, index) => (
                        <li key={index} className="text-sm text-blue-800">
                          • {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Recommendations */}
          {recommendations.length > 0 && (
            <>
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Recommended Schedule</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={applyAllRecommendations}
                  disabled={recommendations
                    .filter(r => !r.suggestedDate || r.suggestedDate === date)
                    .every(r => appliedRecommendations.has(r.taskId))}
                >
                  Apply All Today's Tasks
                </Button>
              </div>
              
              <div className="space-y-2">
                {recommendations.map((rec) => {
                  const slot = timeSlots.find(s => s.id === rec.slotId)
                  const isApplied = appliedRecommendations.has(rec.taskId)
                  const isLaterDate = rec.suggestedDate && rec.suggestedDate !== date
                  
                  return (
                    <Card 
                      key={`${rec.slotId || 'later'}-${rec.taskId}`}
                      className={cn(
                        "transition-all",
                        isApplied && "opacity-60",
                        isLaterDate && "bg-amber-50 border-amber-200"
                      )}
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{rec.taskTitle}</span>
                              <span className={cn(
                                "text-xs px-2 py-0.5 rounded-full",
                                getPriorityColor(rec.priority)
                              )}>
                                {rec.priority}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 mb-1">
                              <ChevronRight className="w-3 h-3 inline" />
                              {isLaterDate ? (
                                <span className="text-amber-700">
                                  Suggested for {format(new Date(rec.suggestedDate), 'MMM d, yyyy')}
                                </span>
                              ) : slot?.displayTime ? (
                                `${slot.displayTime} (${slot.period})`
                              ) : (
                                'No time slot assigned'
                              )}
                            </div>
                            <p className="text-sm text-gray-500">{rec.reasoning}</p>
                          </div>
                          <Button
                            size="sm"
                            variant={isApplied ? "ghost" : isLaterDate ? "secondary" : "outline"}
                            onClick={() => applyRecommendation(rec)}
                            disabled={isApplied || isLaterDate}
                            title={isLaterDate ? "Cannot apply tasks for other days" : undefined}
                          >
                            {isApplied ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : isLaterDate ? (
                              'Later'
                            ) : (
                              'Apply'
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
          </div>
        </div>
      </Modal>
    </>
  )
}
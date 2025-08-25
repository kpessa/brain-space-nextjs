'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Mic, Calendar, TrendingUp, AlertCircle, Award, Clock, ChevronRight, Sparkles, Copy, Download } from 'lucide-react'
import { useNodesStore } from '@/store/nodes'
import { useAuth } from '@/contexts/AuthContext'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'

interface StandupSummary {
  yesterday: string[]
  today: string[]
  blockers: string[]
  highlights: string[]
  metrics: {
    tasksCompleted: number
    nodesCreated: number
    updatesAdded: number
    hoursWorked?: number
  }
}

interface StandupSummaryDialogProps {
  trigger?: React.ReactNode
}

export default function StandupSummaryDialog({ trigger }: StandupSummaryDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [summary, setSummary] = useState<StandupSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedProvider, setSelectedProvider] = useState<'openai' | 'google'>('openai')
  
  const { nodes } = useNodesStore()
  const { user } = useAuth()
  
  const generateSummary = async () => {

    if (!user) {

      setError('Please sign in to generate standup summary')
      return
    }
    
    setIsGenerating(true)
    setError(null)
    
    try {
      // Get work nodes only
      const workNodes = nodes.filter(n => !n.isPersonal)

      // Get yesterday's nodes (simplified - in production would filter by date)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      
      const requestBody = {
        nodes: workNodes,
        yesterdayNodes: workNodes, // In production, would filter by date
        dateRange: {
          start: yesterday.toISOString(),
          end: new Date().toISOString()
        },
        provider: selectedProvider
      }

      const response = await fetch('/api/ai/standup-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (!response.ok) {

        throw new Error(data.error || 'Failed to generate summary')
      }
      
      setSummary(data.summary)

    } catch (err) {

      setError(err instanceof Error ? err.message : 'Failed to generate summary')
    } finally {
      setIsGenerating(false)
    }
  }
  
  const copyToClipboard = () => {
    if (!summary) return
    
    const text = `Daily Standup - ${dayjs().format('MMMM D, YYYY')}

Yesterday:
${summary.yesterday.map(item => `• ${item}`).join('\n')}

Today:
${summary.today.map(item => `• ${item}`).join('\n')}

${summary.blockers.length > 0 ? `Blockers:
${summary.blockers.map(item => `• ${item}`).join('\n')}` : ''}

${summary.highlights.length > 0 ? `Highlights:
${summary.highlights.map(item => `• ${item}`).join('\n')}` : ''}`
    
    navigator.clipboard.writeText(text)
  }
  
  const downloadAsText = () => {
    if (!summary) return
    
    const text = `Daily Standup - ${dayjs().format('MMMM D, YYYY')}

Yesterday:
${summary.yesterday.map(item => `• ${item}`).join('\n')}

Today:
${summary.today.map(item => `• ${item}`).join('\n')}

${summary.blockers.length > 0 ? `Blockers:
${summary.blockers.map(item => `• ${item}`).join('\n')}` : ''}

${summary.highlights.length > 0 ? `Highlights:
${summary.highlights.map(item => `• ${item}`).join('\n')}` : ''}

---
Tasks Completed: ${summary.metrics.tasksCompleted}
Nodes Created: ${summary.metrics.nodesCreated}
Updates Added: ${summary.metrics.updatesAdded}`
    
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `standup-${dayjs().format('YYYY-MM-DD')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
  
  return (
    <>
      {/* Trigger Button */}
      <div onClick={() => {

        setIsOpen(true)
      }}>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Mic className="w-4 h-4" />
            Daily Standup
          </Button>
        )}
      </div>
      
      {/* Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size="xl"
        title=""
      >
        <div className="max-h-[80vh] overflow-y-auto">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Daily Standup Summary
            </h2>
            <p className="text-muted-foreground mt-1">
              Generate an AI-powered summary of your work for daily standup meetings
            </p>
          </div>
        
        <div className="space-y-6">
          {/* Provider Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">AI Provider:</span>
            <div className="flex gap-2">
              <Button
                variant={selectedProvider === 'openai' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedProvider('openai')}
              >
                OpenAI
              </Button>
              <Button
                variant={selectedProvider === 'google' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setSelectedProvider('google')}
              >
                Google AI
              </Button>
            </div>
          </div>
          
          {/* Generate Button */}
          {!summary && (
            <div className="text-center py-8">
              <Button
                onClick={generateSummary}
                disabled={isGenerating}
                className="gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Generating Summary...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Standup Summary
                  </>
                )}
              </Button>
              
              {error && (
                <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>
          )}
          
          {/* Summary Display */}
          {summary && (
            <>
              {/* Action Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadAsText}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={generateSummary}
                  disabled={isGenerating}
                >
                  Regenerate
                </Button>
              </div>
              
              {/* Yesterday's Accomplishments */}
              {summary.yesterday.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Yesterday
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {summary.yesterday.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              
              {/* Today's Plans */}
              {summary.today.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Today
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {summary.today.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              
              {/* Blockers */}
              {summary.blockers.length > 0 && (
                <Card className="border-orange-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-orange-700">
                      <AlertCircle className="w-4 h-4" />
                      Blockers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {summary.blockers.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              
              {/* Highlights */}
              {summary.highlights.length > 0 && (
                <Card className="border-purple-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2 text-purple-700">
                      <Award className="w-4 h-4" />
                      Highlights
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {summary.highlights.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ChevronRight className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              
              {/* Metrics */}
              <Card className="bg-gray-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Activity Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {summary.metrics.tasksCompleted}
                      </div>
                      <div className="text-sm text-gray-600">Tasks Completed</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {summary.metrics.nodesCreated}
                      </div>
                      <div className="text-sm text-gray-600">Nodes Created</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {summary.metrics.updatesAdded}
                      </div>
                      <div className="text-sm text-gray-600">Updates Added</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
        </div>
      </Modal>
    </>
  )
}
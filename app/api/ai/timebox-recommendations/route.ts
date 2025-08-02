import { NextRequest, NextResponse } from 'next/server'

// Dynamic imports for optional dependencies
let OpenAI: any
let GoogleGenerativeAI: any

try {
  OpenAI = require('openai')
} catch (e) {
  console.log('OpenAI package not installed')
}

try {
  const googleAI = require('@google/generative-ai')
  GoogleGenerativeAI = googleAI.GoogleGenerativeAI
} catch (e) {
  console.log('Google AI package not installed')
}

// Types
interface TimeboxRecommendation {
  slotId: string
  taskId: string
  taskTitle: string
  reasoning: string
  priority: 'high' | 'medium' | 'low'
}

interface TimeboxRecommendationsRequest {
  provider?: string
  userId: string
  date: string
  currentTime?: string // Added current time
  userContext?: string // User-provided context
  unscheduledNodes: Array<{
    id: string
    title: string
    type: string
    urgency?: number
    importance?: number
    dueDate?: string
    tags?: string[]
    isPersonal?: boolean
  }>
  timeSlots: Array<{
    id: string
    startTime: string
    endTime: string
    displayTime: string
    period: 'morning' | 'afternoon' | 'evening' | 'night'
    isBlocked?: boolean
    currentTasks: number
  }>
  currentMode?: 'work' | 'personal'
  preferences?: {
    morningFocus?: string[]
    afternoonFocus?: string[]
    eveningFocus?: string[]
  }
}

// Mock AI Provider
class MockAIProvider {
  async generateRecommendations(request: TimeboxRecommendationsRequest): Promise<{
    recommendations: TimeboxRecommendation[]
    insights: string[]
    summary?: string
  }> {
    // Simple mock logic for demo
    const recommendations: TimeboxRecommendation[] = []
    const insights: string[] = []
    
    // Sort nodes by priority (urgency + importance)
    const prioritizedNodes = request.unscheduledNodes.sort((a, b) => {
      const scoreA = (a.urgency || 5) + (a.importance || 5)
      const scoreB = (b.urgency || 5) + (b.importance || 5)
      return scoreB - scoreA
    })
    
    // Find available morning slots for high-priority tasks
    const morningSlots = request.timeSlots.filter(
      slot => slot.period === 'morning' && !slot.isBlocked && slot.currentTasks === 0
    )
    
    // Assign high-priority tasks to morning
    prioritizedNodes.slice(0, Math.min(3, morningSlots.length)).forEach((node, index) => {
      if (morningSlots[index]) {
        recommendations.push({
          slotId: morningSlots[index].id,
          taskId: node.id,
          taskTitle: node.title,
          reasoning: 'High-priority task scheduled for peak focus hours',
          priority: 'high'
        })
      }
    })
    
    insights.push('Morning slots reserved for your highest priority tasks')
    insights.push('Consider taking breaks between intensive work sessions')
    
    if (request.currentMode === 'work') {
      insights.push('In work mode: Smaller time blocks help maintain focus')
    }
    
    return { 
      recommendations, 
      insights,
      summary: 'Mock AI: Prioritized tasks by urgency and importance scores.'
    }
  }
}

// OpenAI Provider
class OpenAIProvider {
  private client: any

  constructor() {
    if (!OpenAI) {
      throw new Error('OpenAI package not installed')
    }
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }
    this.client = new OpenAI({ apiKey })
  }

  async generateRecommendations(request: TimeboxRecommendationsRequest): Promise<{
    recommendations: TimeboxRecommendation[]
    insights: string[]
    summary?: string
  }> {
    const systemPrompt = `You are an expert productivity coach specializing in time management and task scheduling. 
    Generate personalized timebox recommendations based on task priorities, time of day, and user preferences.
    
    Consider:
    - Task urgency and importance scores
    - Natural energy levels throughout the day
    - Task type alignment with time periods (e.g., creative work in morning)
    - Balanced distribution of work
    - Buffer time for transitions
    - Current mode (work vs personal)
    - Work vs personal task categorization
    - User-provided context and constraints
    
    Return a JSON object with:
    - recommendations: Array of task-to-slot assignments with reasoning
    - insights: Array of 2-3 actionable insights about the day structure`

    const userPrompt = `Generate timebox recommendations for this data:
    
    Unscheduled Tasks: ${JSON.stringify(request.unscheduledNodes, null, 2)}
    Available Time Slots: ${JSON.stringify(request.timeSlots, null, 2)}
    Mode: ${request.currentMode || 'personal'}
    Date: ${request.date}
    ${request.userContext ? `\nUser Context: ${request.userContext}` : ''}
    
    ${request.currentMode === 'work' ? 'Prioritize work tasks but include relevant personal tasks if they fit.' : 
      request.currentMode === 'personal' ? 'Prioritize personal tasks but include urgent work tasks if needed.' : 
      'Balance both work and personal tasks based on priority.'}
    
    Provide specific slot assignments and strategic insights.`

    const response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    })

    const result = JSON.parse(response.choices[0].message.content || '{}')
    return {
      recommendations: result.recommendations || [],
      insights: result.insights || []
    }
  }
}

// Google AI Provider
class GoogleAIProvider {
  private client: any

  constructor() {
    if (!GoogleGenerativeAI) {
      throw new Error('Google AI package not installed')
    }
    const apiKey = process.env.GOOGLE_AI_API_KEY
    if (!apiKey) {
      throw new Error('Google AI API key not configured')
    }
    this.client = new GoogleGenerativeAI(apiKey)
  }

  async generateRecommendations(request: TimeboxRecommendationsRequest): Promise<{
    recommendations: TimeboxRecommendation[]
    insights: string[]
    summary?: string
  }> {
    const model = this.client.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    // Filter slots to only include current and future times
    const currentTimeMinutes = request.currentTime 
      ? parseInt(request.currentTime.split(':')[0]) * 60 + parseInt(request.currentTime.split(':')[1])
      : 0
    
    const availableSlots = request.timeSlots.filter(slot => {
      if (slot.isBlocked || slot.currentTasks > 0) return false
      
      // If current time is provided and we're looking at today, filter out past slots
      if (request.currentTime && request.date === new Date().toISOString().split('T')[0]) {
        const slotStartMinutes = parseInt(slot.startTime.split(':')[0]) * 60 + parseInt(slot.startTime.split(':')[1])
        return slotStartMinutes >= currentTimeMinutes
      }
      
      return true
    })
    
    const prompt = `As an expert productivity coach, generate timebox recommendations for the following scenario:

Current Time: ${request.currentTime || 'Not specified'}
Date: ${request.date}
Mode: ${request.currentMode || 'personal'}
${request.userContext ? `\nUser Context: "${request.userContext}"` : ''}

Unscheduled Tasks (with IDs):
${request.unscheduledNodes.map(node => 
  `- ID: ${node.id} | Title: "${node.title}" | Type: ${node.type} | ${node.isPersonal ? 'Personal' : 'Work'} | Urgency: ${node.urgency || 5} | Importance: ${node.importance || 5}${node.dueDate ? ` | Due: ${node.dueDate}` : ''}`
).join('\n')}

Available Time Slots TODAY (with IDs):
${availableSlots.map(slot => 
  `- ID: ${slot.id} | Time: ${slot.displayTime} | Period: ${slot.period}`
).join('\n')}

${request.currentMode === 'work' ? 
  'IMPORTANT: User is in WORK MODE. Prioritize work tasks (non-personal) but include high-priority personal tasks if they fit well.' : 
  request.currentMode === 'personal' ? 
  'IMPORTANT: User is in PERSONAL MODE. Prioritize personal tasks but include urgent work tasks if necessary.' : 
  'Balance both work and personal tasks based on priority and urgency.'}

Generate a JSON response with EXACTLY this structure:
{
  "summary": "A 2-3 paragraph markdown summary explaining your overall scheduling strategy, which tasks you prioritized for today vs later, and key reasoning behind the schedule",
  "recommendations": [
    {
      "slotId": "exact slot ID from above list or null if scheduling for another day",
      "taskId": "exact task ID from above list", 
      "taskTitle": "exact task title from above list",
      "reasoning": "brief explanation why this task fits this time slot or should be scheduled later",
      "priority": "high" or "medium" or "low",
      "suggestedDate": "YYYY-MM-DD if recommending for another day, null for today"
    }
  ],
  "insights": ["insight 1", "insight 2", "insight 3"]
}

IMPORTANT: 
- Use the EXACT IDs provided above for slotId and taskId
- Only assign tasks to today's available slots if they make sense for today
- For lower priority tasks or tasks that don't fit today, set slotId to null and provide a suggestedDate
- Consider the current time - don't overload the remaining day
- Match high-priority tasks (urgency + importance >= 14) to earlier available slots
- Consider natural energy patterns and the time remaining in the day
- Each slot should have only one task`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    
    console.log('Gemini raw response:', text)
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])
        
        // Validate the response structure
        if (!parsed.recommendations || !Array.isArray(parsed.recommendations)) {
          throw new Error('Invalid response structure: missing recommendations array')
        }
        
        // Validate each recommendation has required fields
        parsed.recommendations.forEach((rec: any, index: number) => {
          if (!rec.slotId || !rec.taskId) {
            console.warn(`Recommendation ${index} missing slotId or taskId:`, rec)
          }
        })
        
        return {
          recommendations: parsed.recommendations || [],
          insights: parsed.insights || [],
          summary: parsed.summary || undefined
        }
      } catch (parseError) {
        console.error('Failed to parse Gemini response:', parseError)
        console.error('Raw text:', text)
        throw new Error(`Failed to parse AI response: ${parseError}`)
      }
    }
    
    throw new Error('No JSON found in AI response')
  }
}

// Main handler
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as TimeboxRecommendationsRequest
    const { provider = 'gemini' } = body // Default to gemini as requested

    let aiProvider
    switch (provider) {
      case 'openai':
        aiProvider = new OpenAIProvider()
        break
      case 'google':
      case 'gemini':
        aiProvider = new GoogleAIProvider()
        break
      case 'mock':
        aiProvider = new MockAIProvider()
        break
      default:
        throw new Error(`Unknown AI provider: ${provider}`)
    }

    const result = await aiProvider.generateRecommendations(body)
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error generating timebox recommendations:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}